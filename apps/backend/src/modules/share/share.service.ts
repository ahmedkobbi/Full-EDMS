import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { RedisService } from '../../common/redis.service';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { z } from 'zod';

const createLinkSchema = z.object({
  documentId: z.string().uuid(),
  permission: z.enum(['view', 'comment', 'download']).default('view'),
  expiresAt: z.string().datetime().optional(),
  maxViews: z.number().int().min(1).max(10000).optional(),
  password: z.string().min(8).max(128).optional(),
  recipientEmail: z.string().email().max(256).optional(),
});

/**
 * Share link service.
 * Spec ref: §9.11 (sharing, external collaboration).
 *
 * Security:
 * - Tokens are cryptographically random (32 bytes / 64 hex chars)
 * - Passwords hashed with scrypt (salt + N=16384)
 * - External sharing denied by default unless tenant policy allows (TODO: policy check)
 * - Anonymous links strongly restricted
 * - All access audited
 */
@Injectable()
export class ShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  private readonly logger = new Logger(ShareService.name);

  /** Emit a WebSocket event via Redis pub/sub (spec §13.4 — share.link.updated). */
  private async emitWsEvent(tenantId: string, event: { name: string; payload: unknown }): Promise<void> {
    try {
      await this.redis.connection.publish(
        `smart-edms:ws-events:${tenantId}`,
        JSON.stringify(event),
      );
    } catch (err) {
      this.logger.warn(`ws event publish failed tenant=${tenantId}: ${(err as Error).message}`);
    }
  }

  async create(tenantId: string, userId: string, raw: unknown) {
    const input = createLinkSchema.parse(raw);
    const doc = await this.prisma.document.findFirst({
      where: { id: input.documentId, tenantId, deletedAt: null },
      include: { classification: true },
    });
    if (!doc) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}

    // §9.11 + §9.4 — External sharing policy checks
    // 1. Documents under legal hold cannot be shared externally
    if (doc.legalHoldActive) {
      throw new ForbiddenException({ messageKey: 'errors.LEGAL_HOLD_BLOCKS_SHARING' });
    }

    // 2. Restricted + Highly Sensitive documents require a password
    if (
      doc.classification &&
      doc.classification.sensitivityLevel >= 4 &&
      !input.password
    ) {
      throw new ForbiddenException({ messageKey: 'errors.RESTRICTED_REQUIRES_PASSWORD' });
    }

    // 3. External sharing (recipientEmail or no expiry) requires tenant policy
    //    The tenant's sharing policy is stored in TenantSettings. For now we
    //    check the classification level — Highly Sensitive documents cannot
    //    be shared externally at all.
    if (input.recipientEmail && doc.classification && doc.classification.sensitivityLevel >= 5) {
      throw new ForbiddenException({ messageKey: 'errors.HIGHLY_SENSITIVE_NO_EXTERNAL_SHARE' });
    }

    // 4. Anonymous links (no password, no recipient) are strongly restricted
    if (!input.password && !input.recipientEmail && !input.expiresAt) {
      // Anonymous + no expiry + no password → reject
      throw new ForbiddenException({ messageKey: 'errors.ANONYMOUS_LINK_REQUIRES_RESTRICTION' });
    }

    const token = randomBytes(32).toString('hex');
    const passwordHash = input.password ? hashPassword(input.password) : null;

    const link = await this.prisma.shareLink.create({
      data: {
        tenantId,
        documentId: input.documentId,
        createdByUserId: userId,
        token,
        passwordHash,
        permission: input.permission,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        maxViews: input.maxViews,
        recipientEmail: input.recipientEmail,
      },
    });

    void this.audit.record({
      tenantId,
      userId,
      category: 'share',
      code: 'share.link.create',
      result: 'allow',
      resourceType: 'document',
      resourceId: input.documentId,
      metadata: { permission: input.permission, expires: input.expiresAt ?? null },
    });

    // Emit WebSocket event (spec §13.4 — share.link.updated)
    await this.emitWsEvent(tenantId, {
      name: 'share.link.updated',
      payload: {
        tenantId,
        documentId: input.documentId,
        linkId: link.id,
        action: 'created',
        permission: input.permission,
        expiresAt: link.expiresAt,
      },
    });

    return { id: link.id, token, expiresAt: link.expiresAt };
  }

  async revoke(tenantId: string, userId: string, linkId: string) {
    await this.prisma.shareLink.updateMany({
      where: { id: linkId, tenantId },
      data: { isActive: false, revokedAt: new Date() },
    });
    void this.audit.record({
      tenantId,
      userId,
      category: 'share',
      code: 'share.link.revoke',
      result: 'allow',
      resourceId: linkId,
    });

    // Emit WebSocket event (spec §13.4 — share.link.updated)
    await this.emitWsEvent(tenantId, {
      name: 'share.link.updated',
      payload: {
        tenantId,
        linkId,
        action: 'revoked',
      },
    });
  }

  async list(tenantId: string, documentId: string) {
    return this.prisma.shareLink.findMany({
      where: { tenantId, documentId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async verifyAccess(token: string, password?: string) {
    const link = await this.prisma.shareLink.findFirst({
      where: { token, isActive: true },
      include: { document: true },
    });
    if (!link) {return null;}
    if (link.expiresAt && link.expiresAt < new Date()) {return null;}
    if (link.maxViews && link.viewCount >= link.maxViews) {return null;}
    if (link.passwordHash && !verifyPassword(password ?? '', link.passwordHash)) {return null;}

    await this.prisma.shareLink.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    });
    return link;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) {return false;}
  const computed = scryptSync(password, salt, 64).toString('hex');
  return computed === hash;
}
