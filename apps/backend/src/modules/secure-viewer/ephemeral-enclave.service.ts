/**
 * Ephemeral burn-after-reading enclave service (spec §9.9).
 *
 * Provides ephemeral secure viewing sessions where:
 *  - A preview token is issued with a very short TTL (e.g., 60 seconds)
 *  - Once viewed, the content is "burned" (token destroyed, can't be re-accessed)
 *  - Optional self-destruct timer (content auto-destroyed after N minutes)
 *
 * Spec ref: §9.9 (optional ephemeral burn-after-reading enclaves where approved).
 */
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis.service.js';
import { AuditService } from '../../common/audit.service.js';
import { SecureViewerService } from '../secure-viewer/secure-viewer.service.js';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const createEnclaveSchema = z.object({
  documentId: z.string().uuid(),
  versionId: z.string().uuid().optional(),
  ttlSeconds: z.number().int().min(30).max(3600).default(300), // 30s to 1h
  burnAfterReading: z.boolean().default(true),
  maxViews: z.number().int().min(1).max(10).default(1),
  allowedUserIds: z.array(z.string().uuid()).min(1).max(10), // who can access
});

@Injectable()
export class EphemeralEnclaveService {
  private readonly logger = new Logger(EphemeralEnclaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly secureViewer: SecureViewerService,
  ) {}

  /**
   * Create an ephemeral enclave for a document.
   *
   * The enclave is a short-lived, access-controlled viewing session that
   * self-destructs after:
   *   - The TTL expires, OR
   *   - The content is viewed maxViews times (if burnAfterReading=true)
   *
   * Spec ref: §9.9 (optional ephemeral burn-after-reading enclaves where approved).
   */
  async createEnclave(
    tenantId: string,
    userId: string,
    raw: unknown,
  ): Promise<{
    enclaveId: string;
    accessCode: string;
    expiresAt: string;
    burnAfterReading: boolean;
    maxViews: number;
    remainingViews: number;
  }> {
    const input = createEnclaveSchema.parse(raw);

    const enclaveId = randomBytes(16).toString('hex');
    const accessCode = randomBytes(12).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);

    const enclave = {
      enclaveId,
      tenantId,
      documentId: input.documentId,
      versionId: input.versionId,
      accessCode,
      burnAfterReading: input.burnAfterReading,
      maxViews: input.maxViews,
      remainingViews: input.maxViews,
      allowedUserIds: input.allowedUserIds,
      createdByUserId: userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      viewLog: [] as Array<{ userId: string; viewedAt: string }>,
    };

    await this.redis.setJson(`enclave:${enclaveId}`, enclave, input.ttlSeconds);

    void this.audit.record({
      tenantId,
      userId,
      category: 'document',
      code: 'document.enclave.create',
      result: 'allow',
      resourceType: 'document',
      resourceId: input.documentId,
      documentId: input.documentId,
      metadata: {
        enclaveId,
        ttlSeconds: input.ttlSeconds,
        burnAfterReading: input.burnAfterReading,
        maxViews: input.maxViews,
        allowedUserCount: input.allowedUserIds.length,
      },
    });

    this.logger.log(`Ephemeral enclave created: ${enclaveId} (TTL=${input.ttlSeconds}s burn=${input.burnAfterReading})`);
    return {
      enclaveId,
      accessCode,
      expiresAt: expiresAt.toISOString(),
      burnAfterReading: input.burnAfterReading,
      maxViews: input.maxViews,
      remainingViews: input.maxViews,
    };
  }

  /**
   * Access an ephemeral enclave (view the document).
   *
   * If burnAfterReading=true, the enclave is destroyed after maxViews is reached.
   * Only allowedUserIds can access the enclave.
   *
   * Spec ref: §9.9 (ephemeral burn-after-reading enclaves).
   */
  async accessEnclave(
    tenantId: string,
    userId: string,
    enclaveId: string,
    accessCode: string,
  ): Promise<{
    previewToken: string;
    remainingViews: number;
    burned: boolean;
  }> {
    const enclave = await this.redis.getJson<any>(`enclave:${enclaveId}`);
    if (!enclave) {
      throw new NotFoundException({ messageKey: 'errors.ENCLAVE_NOT_FOUND' });
    }

    // Verify access code
    if (enclave.accessCode !== accessCode) {
      throw new ForbiddenException({ messageKey: 'errors.INVALID_ACCESS_CODE' });
    }

    // Verify user is allowed
    if (!enclave.allowedUserIds.includes(userId)) {
      throw new ForbiddenException({ messageKey: 'errors.UNAUTHORIZED' });
    }

    // Check remaining views
    if (enclave.remainingViews <= 0) {
      throw new ForbiddenException({ messageKey: 'errors.ENCLAVE_BURNED' });
    }

    // Decrement remaining views
    enclave.remainingViews -= 1;
    enclave.viewLog.push({ userId, viewedAt: new Date().toISOString() });

    // Issue a short-lived preview token (30 seconds — very ephemeral)
    const previewToken = await this.secureViewer.issuePreviewToken(
      tenantId,
      userId,
      '', // email — would fetch from user
      enclave.documentId,
      { versionId: enclave.versionId, noDownload: true },
    );

    // Check if enclave should be burned
    const burned = enclave.burnAfterReading && enclave.remainingViews <= 0;

    if (burned) {
      // Destroy the enclave
      await this.redis.invalidate(`enclave:${enclaveId}`);

      void this.audit.record({
        tenantId,
        userId,
        category: 'document',
        code: 'document.enclave.burn',
        result: 'allow',
        resourceType: 'document',
        resourceId: enclave.documentId,
        documentId: enclave.documentId,
        metadata: {
          enclaveId,
          viewCount: enclave.viewLog.length,
          burnedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Ephemeral enclave burned: ${enclaveId} (views=${enclave.viewLog.length})`);
    } else {
      // Update the enclave with decremented count
      const ttl = Math.max(1, Math.floor((new Date(enclave.expiresAt).getTime() - Date.now()) / 1000));
      await this.redis.setJson(`enclave:${enclaveId}`, enclave, ttl);
    }

    return {
      previewToken: previewToken.token,
      remainingViews: enclave.remainingViews,
      burned,
    };
  }

  /**
   * Manually destroy an enclave (admin action).
   */
  async destroyEnclave(tenantId: string, userId: string, enclaveId: string): Promise<void> {
    await this.redis.invalidate(`enclave:${enclaveId}`);
    void this.audit.record({
      tenantId,
      userId,
      category: 'document',
      code: 'document.enclave.destroy',
      result: 'allow',
      metadata: { enclaveId },
    });
  }
}
