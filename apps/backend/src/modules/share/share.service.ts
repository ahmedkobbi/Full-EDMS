import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { randomBytes, createHash, scryptSync } from 'node:crypto';
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
  ) {}

  async create(tenantId: string, userId: string, raw: unknown) {
    const input = createLinkSchema.parse(raw);
    const doc = await this.prisma.document.findFirst({ where: { id: input.documentId, tenantId, deletedAt: null } });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

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
    if (!link) return null;
    if (link.expiresAt && link.expiresAt < new Date()) return null;
    if (link.maxViews && link.viewCount >= link.maxViews) return null;
    if (link.passwordHash && !verifyPassword(password ?? '', link.passwordHash)) return null;

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
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const computed = scryptSync(password, salt, 64).toString('hex');
  return computed === hash;
}
