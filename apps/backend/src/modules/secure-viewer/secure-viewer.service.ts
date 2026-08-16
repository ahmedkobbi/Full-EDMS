/**
 * Secure viewer service (spec §9.9).
 *
 * Provides:
 *  - Short-lived preview tokens (5min TTL) for no-download viewing
 *  - Dynamic watermarking (user/session-based text overlay)
 *  - Redaction mode (mark regions for redaction, preview, export derivative)
 *  - Original document preservation (redactions produce new versions, never mutate)
 *  - Classification banners (rendered client-side via bannerText)
 *
 * Spec ref: §9.9 (Secure Viewing, Redaction, Watermarking, Ephemeral Enclaves).
 *
 * Security:
 *  - Preview tokens are cryptographically random, stored in Redis with short TTL
 *  - Tokens are bound to userId + documentId + versionId (cannot be reused for other docs)
 *  - Watermark text includes user email + timestamp (deterrent for screenshot sharing)
 *  - Redaction export produces a NEW DocumentVersion (original is immutable)
 *  - No-download mode sets response headers to prevent browser caching + download
 */
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { AuditService } from '../../common/audit.service';
import { StorageService } from '../../common/storage.service';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const createRedactionSchema = z.object({
  redactions: z.array(z.object({
    page: z.number().int().min(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0.01).max(1),
    height: z.number().min(0.01).max(1),
    reason: z.string().max(500).optional(),
  })).min(1).max(100),
});

export interface PreviewToken {
  token: string;
  documentId: string;
  versionId: string;
  userId: string;
  expiresAt: string;
  watermark: {
    text: string;
    userId: string;
    timestamp: string;
  };
  classification: {
    bannerText: string | null;
    color: string | null;
    sensitivityLevel: number;
  };
  noDownload: boolean;
}

@Injectable()
export class SecureViewerService {
  private readonly logger = new Logger(SecureViewerService.name);
  private static readonly TOKEN_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Issue a short-lived preview token for viewing a document version.
   *
   * The token is bound to (userId, documentId, versionId) and stored in Redis
   * with a 5-minute TTL. The watermark text includes the user's email + timestamp
   * to deter screenshot sharing.
   *
   * Spec ref: §9.9 (secure viewer tokens must be short-lived, preview URLs must expire).
   */
  async issuePreviewToken(
    tenantId: string,
    userId: string,
    userEmail: string,
    documentId: string,
    options: { versionId?: string; noDownload?: boolean } = {},
  ): Promise<PreviewToken> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
      include: {
        classification: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });
    if (!doc) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}

    const version = options.versionId
      ? doc.versions.find((v) => v.id === options.versionId)
      : doc.versions[0];
    if (!version) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SecureViewerService.TOKEN_TTL_SECONDS * 1000);

    const watermark = {
      text: `${userEmail} • ${now.toISOString()}`,
      userId,
      timestamp: now.toISOString(),
    };

    const previewToken: PreviewToken = {
      token,
      documentId,
      versionId: version.id,
      userId,
      expiresAt: expiresAt.toISOString(),
      watermark,
      classification: {
        bannerText: doc.classification?.bannerText ?? null,
        color: doc.classification?.color ?? null,
        sensitivityLevel: doc.sensitivityLevel,
      },
      noDownload: options.noDownload ?? doc.sensitivityLevel >= 4,
    };

    // Store in Redis with TTL
    await this.redis.setJson(`preview:token:${token}`, previewToken, SecureViewerService.TOKEN_TTL_SECONDS);

    void this.audit.record({
      tenantId,
      userId,
      category: 'document',
      code: 'document.preview',
      result: 'allow',
      resourceType: 'document',
      resourceId: documentId,
      documentId,
      metadata: {
        versionId: version.id,
        noDownload: previewToken.noDownload,
        classificationLevel: doc.sensitivityLevel,
      },
    });

    this.logger.log(`Preview token issued: doc=${documentId} user=${userId} noDownload=${previewToken.noDownload}`);
    return previewToken;
  }

  /**
   * Validate a preview token and return the associated document version.
   * Called by the preview download endpoint.
   */
  async validatePreviewToken(token: string): Promise<PreviewToken | null> {
    const data = await this.redis.getJson<PreviewToken>(`preview:token:${token}`);
    if (!data) {return null;}
    if (new Date(data.expiresAt) < new Date()) {
      await this.redis.invalidate(`preview:token:${token}`);
      return null;
    }
    return data;
  }

  /**
   * Revoke a preview token (e.g., when user navigates away from the viewer).
   */
  async revokePreviewToken(token: string): Promise<void> {
    await this.redis.invalidate(`preview:token:${token}`);
  }

  /**
   * Get a signed download URL for a preview token (short TTL, 60 seconds).
   * Sets response headers to prevent browser caching + download (no-download mode).
   */
  async getPreviewUrl(token: string): Promise<{ url: string; headers: Record<string, string>; watermark: PreviewToken['watermark']; classification: PreviewToken['classification'] }> {
    const previewToken = await this.validatePreviewToken(token);
    if (!previewToken) {
      throw new ForbiddenException({ messageKey: 'errors.PREVIEW_TOKEN_EXPIRED' });
    }

    const version = await this.prisma.documentVersion.findFirst({
      where: { id: previewToken.versionId },
    });
    if (!version) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}

    const url = await this.storage.signDownloadUrl(version.storageKey, 60); // 60 second URL

    const headers: Record<string, string> = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    };

    if (previewToken.noDownload) {
      headers['Content-Disposition'] = 'inline'; // forces inline viewing, not download
      headers['X-Smart-Edms-No-Download'] = 'true';
    }

    return {
      url,
      headers,
      watermark: previewToken.watermark,
      classification: previewToken.classification,
    };
  }

  /**
   * Create redaction regions on a document version.
   *
   * Redactions are stored as metadata on the version and do NOT modify the
   * original binary. When a redacted derivative is exported, a new version
   * is created with the redactions applied (irreversible in the derivative).
   *
   * Spec ref: §9.9 (redaction must be irreversible in exported derivative,
   *           original preservation, redaction actions must be audited).
   */
  async createRedactions(
    tenantId: string,
    userId: string,
    documentId: string,
    versionId: string,
    raw: unknown,
  ): Promise<{ redactionId: string; redactionCount: number }> {
    const input = createRedactionSchema.parse(raw);

    // Verify the version exists + belongs to the tenant
    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, tenantId, documentId },
    });
    if (!version) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}

    // Store redactions as a ProvenanceManifest entry (or a dedicated redaction table)
    // For now, store in Redis with a 24h TTL (must be exported within 24h)
    const redactionId = randomUUID();
    await this.redis.setJson(
      `redaction:${redactionId}`,
      {
        redactionId,
        documentId,
        versionId,
        tenantId,
        userId,
        redactions: input.redactions,
        createdAt: new Date().toISOString(),
      },
      86400, // 24h TTL
    );

    void this.audit.record({
      tenantId,
      userId,
      category: 'document',
      code: 'document.redaction.create',
      result: 'allow',
      resourceType: 'document',
      resourceId: documentId,
      documentId,
      metadata: {
        versionId,
        redactionCount: input.redactions.length,
        pages: [...new Set(input.redactions.map((r) => r.page))],
      },
    });

    this.logger.log(`Redactions created: doc=${documentId} ver=${versionId} count=${input.redactions.length}`);
    return { redactionId, redactionCount: input.redactions.length };
  }

  /**
   * Export a redacted derivative of a document.
   *
   * Creates a NEW DocumentVersion with the redactions applied. The original
   * version is preserved unchanged (immutable). The redacted derivative is
   * a separate file in object storage.
   *
   * Spec ref: §9.9 (export of redacted derivative, original preservation,
   *           redaction export jobs must be asynchronous and audited).
   */
  async exportRedactedDerivative(
    tenantId: string,
    userId: string,
    redactionId: string,
  ): Promise<{ jobId: string; status: string }> {
    const redactionData = await this.redis.getJson<{
      documentId: string;
      versionId: string;
      redactions: Array<{ page: number; x: number; y: number; width: number; height: number }>;
    }>(`redaction:${redactionId}`);

    if (!redactionData) {
      throw new NotFoundException({ messageKey: 'errors.REDACTION_EXPIRED' });
    }

    // Create a Job for async processing (the worker applies redactions + creates new version)
    const job = await this.prisma.job.create({
      data: {
        tenantId,
        kind: 'redaction_export',
        status: 'queued',
        payload: {
          redactionId,
          documentId: redactionData.documentId,
          versionId: redactionData.versionId,
          redactions: redactionData.redactions,
          requestedBy: userId,
        } as any,
      },
    });

    // Publish to worker queue
    await this.redis.connection.publish(
      'smart-edms:internal:redaction-export',
      JSON.stringify({ jobId: job.id, tenantId }),
    );

    void this.audit.record({
      tenantId,
      userId,
      category: 'document',
      code: 'document.redaction.export',
      result: 'allow',
      resourceType: 'document',
      resourceId: redactionData.documentId,
      documentId: redactionData.documentId,
      metadata: { jobId: job.id, redactionId },
    });

    // Burn the redaction ticket (can only be exported once)
    await this.redis.invalidate(`redaction:${redactionId}`);

    return { jobId: job.id, status: 'queued' };
  }
}

function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}
