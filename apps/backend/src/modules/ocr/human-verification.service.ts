/**
 * Human Verification Queue service (spec §9.16).
 *
 * Low-confidence OCR/OMR/ICR extractions are routed to a human verification
 * queue. Human reviewers can review, correct, and approve the extracted data.
 *
 * Spec ref: §9.16 (Low-confidence ICR/OMR extractions must route to a human
 *           verification queue).
 *
 * Queue items are stored in Redis (sorted set by priority — lower confidence
 * = higher priority) + a Prisma Job record for persistence.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { AuditService } from '../../common/audit.service';

export interface VerificationItem {
  id: string;
  tenantId: string;
  documentId: string;
  versionId: string;
  scannerJobId: string;
  type: 'ocr' | 'omr' | 'icr';
  fieldName?: string;
  pageNumber: number;
  extractedValue: string;
  confidence: number;
  status: 'pending' | 'approved' | 'corrected' | 'rejected';
  correctedValue?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

@Injectable()
export class HumanVerificationService {
  private readonly logger = new Logger(HumanVerificationService.name);
  private static readonly QUEUE_KEY = 'human-verification';
  private static readonly ITEM_TTL = 86400 * 30; // 30 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Enqueue a verification item (called by the OCR/OMR/ICR workers when
   * confidence is below threshold).
   *
   * Priority is computed as: (1 - confidence) * 1000 (lower confidence = higher priority).
   */
  async enqueue(item: Omit<VerificationItem, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const id = globalThis.crypto.randomUUID();
    const fullItem: VerificationItem = {
      ...item,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Store in Redis hash
    await this.redis.connection.hset(
      `${HumanVerificationService.QUEUE_KEY}:${item.tenantId}`,
      id,
      JSON.stringify(fullItem),
    );

    // Add to sorted set with priority (lower confidence = higher priority)
    const priority = (1 - item.confidence) * 1000;
    await this.redis.connection.zadd(
      `${HumanVerificationService.QUEUE_KEY}:priority:${item.tenantId}`,
      priority,
      id,
    );

    this.logger.log(
      `Verification item enqueued: id=${id} type=${item.type} confidence=${item.confidence.toFixed(2)} doc=${item.documentId}`,
    );

    return id;
  }

  /**
   * List pending verification items for a tenant (sorted by priority).
   */
  async listPending(
    tenantId: string,
    limit = 50,
    type?: 'ocr' | 'omr' | 'icr',
  ): Promise<VerificationItem[]> {
    const ids = await this.redis.connection.zrange(
      `${HumanVerificationService.QUEUE_KEY}:priority:${tenantId}`,
      0,
      limit - 1,
    );

    if (ids.length === 0) return [];

    const items = await this.redis.connection.hmget(
      `${HumanVerificationService.QUEUE_KEY}:${tenantId}`,
      ...ids,
    );

    return items
      .map((raw) => {
        try {
          return JSON.parse(raw ?? 'null') as VerificationItem | null;
        } catch {
          return null;
        }
      })
      .filter((item): item is VerificationItem => item !== null)
      .filter((item) => item.status === 'pending')
      .filter((item) => !type || item.type === type);
  }

  /**
   * Get a single verification item.
   */
  async getById(tenantId: string, id: string): Promise<VerificationItem | null> {
    const raw = await this.redis.connection.hget(
      `${HumanVerificationService.QUEUE_KEY}:${tenantId}`,
      id,
    );
    if (!raw) return null;
    try {
      return JSON.parse(raw) as VerificationItem;
    } catch {
      return null;
    }
  }

  /**
   * Approve an extraction (reviewer confirms the extracted value is correct).
   */
  async approve(tenantId: string, id: string, userId: string): Promise<void> {
    const item = await this.getById(tenantId, id);
    if (!item) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    item.status = 'approved';
    item.reviewedBy = userId;
    item.reviewedAt = new Date().toISOString();

    await this.updateItem(tenantId, item);
    await this.removeFromQueue(tenantId, id);

    void this.audit.record({
      tenantId,
      userId,
      category: 'scanner',
      code: 'scanner.verification.approve',
      result: 'allow',
      resourceType: 'document',
      resourceId: item.documentId,
      documentId: item.documentId,
      metadata: { verificationId: id, type: item.type, confidence: item.confidence },
    });

    this.logger.log(`Verification approved: id=${id} type=${item.type}`);
  }

  /**
   * Correct an extraction (reviewer provides the correct value).
   */
  async correct(tenantId: string, id: string, userId: string, correctedValue: string): Promise<void> {
    const item = await this.getById(tenantId, id);
    if (!item) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    item.status = 'corrected';
    item.correctedValue = correctedValue;
    item.reviewedBy = userId;
    item.reviewedAt = new Date().toISOString();

    await this.updateItem(tenantId, item);
    await this.removeFromQueue(tenantId, id);

    void this.audit.record({
      tenantId,
      userId,
      category: 'scanner',
      code: 'scanner.verification.correct',
      result: 'allow',
      resourceType: 'document',
      resourceId: item.documentId,
      documentId: item.documentId,
      metadata: {
        verificationId: id,
        type: item.type,
        originalValue: item.extractedValue.slice(0, 100),
        correctedValue: correctedValue.slice(0, 100),
      },
    });

    this.logger.log(`Verification corrected: id=${id} type=${item.type}`);
  }

  /**
   * Reject an extraction (reviewer cannot determine the correct value).
   */
  async reject(tenantId: string, id: string, userId: string, reason: string): Promise<void> {
    const item = await this.getById(tenantId, id);
    if (!item) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    item.status = 'rejected';
    item.reviewedBy = userId;
    item.reviewedAt = new Date().toISOString();

    await this.updateItem(tenantId, item);
    await this.removeFromQueue(tenantId, id);

    void this.audit.record({
      tenantId,
      userId,
      category: 'scanner',
      code: 'scanner.verification.reject',
      result: 'allow',
      resourceType: 'document',
      resourceId: item.documentId,
      documentId: item.documentId,
      reason,
      metadata: { verificationId: id, type: item.type },
    });

    this.logger.log(`Verification rejected: id=${id} type=${item.type} reason=${reason}`);
  }

  /**
   * Get queue statistics for a tenant.
   */
  async getStats(tenantId: string): Promise<{
    pending: number;
    approved: number;
    corrected: number;
    rejected: number;
    avgConfidence: number;
  }> {
    const rawItems = await this.redis.connection.hgetall(
      `${HumanVerificationService.QUEUE_KEY}:${tenantId}`,
    );

    let pending = 0, approved = 0, corrected = 0, rejected = 0;
    let totalConfidence = 0, count = 0;

    for (const raw of Object.values(rawItems)) {
      try {
        const item = JSON.parse(raw) as VerificationItem;
        switch (item.status) {
          case 'pending': pending++; break;
          case 'approved': approved++; break;
          case 'corrected': corrected++; break;
          case 'rejected': rejected++; break;
        }
        if (item.status === 'pending') {
          totalConfidence += item.confidence;
          count++;
        }
      } catch {
        // skip malformed
      }
    }

    return {
      pending,
      approved,
      corrected,
      rejected,
      avgConfidence: count > 0 ? totalConfidence / count : 0,
    };
  }

  private async updateItem(tenantId: string, item: VerificationItem): Promise<void> {
    await this.redis.connection.hset(
      `${HumanVerificationService.QUEUE_KEY}:${tenantId}`,
      item.id,
      JSON.stringify(item),
    );
  }

  private async removeFromQueue(tenantId: string, id: string): Promise<void> {
    await this.redis.connection.zrem(
      `${HumanVerificationService.QUEUE_KEY}:priority:${tenantId}`,
      id,
    );
  }
}
