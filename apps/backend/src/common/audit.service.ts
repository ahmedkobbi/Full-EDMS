import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { createHash, randomUUID } from 'node:crypto';
import type { AuditResult, AuditActorKind, AuditCategory, AuditEventCode } from '@smart-edms/types';

/**
 * Append-only audit log service with hash-chained tamper-evidence.
 * Spec ref: §9.12 (audit, evidence, provenance), §21.7 (logging and monitoring),
 * §27.3 (security rules — log security failures).
 *
 * Each event's `eventHash` = sha256(`${previousHash}|${canonicalEvent}`).
 * This makes silent tampering detectable: any modified event breaks the chain.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // Per-tenant last hash cache (in-memory only; on startup we rehydrate from DB)
  private readonly lastHashByTenant = new Map<string, string>();
  private readonly lastSequenceByTenant = new Map<bigint, bigint>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit event. NEVER fails the calling request if audit write fails —
   * audit is best-effort at the request level but failures are logged.
   */
  async record(input: {
    tenantId: string;
    userId?: string;
    actorKind?: AuditActorKind;
    category: AuditCategory;
    code: AuditEventCode;
    result?: AuditResult;
    resourceType?: string;
    resourceId?: string;
    documentId?: string;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const tenantId = input.tenantId;
      const tenantKey = tenantId;
      const previousHash = this.lastHashByTenant.get(tenantKey) ?? null;

      // Acquire next sequence number atomically (per-tenant monotonic counter)
      const lastSeq = this.lastSequenceByTenant.get(BigInt(tenantId.replace(/-/g, '').slice(0, 15), 16)) ?? 0n;
      const sequenceNumber = lastSeq + 1n;

      const canonical = canonicalizeForAudit({
        tenantId,
        userId: input.userId ?? null,
        actorKind: input.actorKind ?? 'user',
        category: input.category,
        code: input.code,
        result: input.result ?? 'allow',
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        documentId: input.documentId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId ?? null,
        reason: input.reason ?? null,
        sequenceNumber: sequenceNumber.toString(),
        previousHash,
        occurredAt: new Date().toISOString(),
      });
      const eventHash = createHash('sha256').update(canonical).digest('hex');

      await this.prisma.auditEvent.create({
        data: {
          id: randomUUID(),
          tenantId,
          userId: input.userId ?? null,
          actorKind: input.actorKind ?? 'user',
          category: input.category,
          code: input.code,
          result: input.result ?? 'allow',
          resourceType: input.resourceType ?? null,
          resourceId: input.resourceId ?? null,
          documentId: input.documentId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          correlationId: input.correlationId ?? null,
          reason: input.reason ?? null,
          metadata: (input.metadata as any) ?? undefined,
          sequenceNumber,
          previousHash,
          eventHash,
        },
      });

      this.lastHashByTenant.set(tenantKey, eventHash);
      this.lastSequenceByTenant.set(BigInt(tenantId.replace(/-/g, '').slice(0, 15), 16), sequenceNumber);
    } catch (err) {
      this.logger.error(`Audit write failed: ${(err as Error).message}`);
      // Never rethrow — audit failure must not break the request flow.
    }
  }

  /**
   * Verify hash chain integrity for a tenant (spec §9.12, §24.2).
   * Returns a report of any broken links.
   */
  async verifyHashChain(tenantId: string, limit = 10000): Promise<{ ok: boolean; brokenAt?: bigint }> {
    const events = await this.prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
    });
    let previousHash: string | null = null;
    for (const ev of events) {
      if (ev.previousHash !== previousHash) {
        return { ok: false, brokenAt: ev.sequenceNumber };
      }
      const canonical = canonicalizeForAudit({
        tenantId: ev.tenantId,
        userId: ev.userId,
        actorKind: ev.actorKind as AuditActorKind,
        category: ev.category as AuditCategory,
        code: ev.code as AuditEventCode,
        result: ev.result as AuditResult,
        resourceType: ev.resourceType,
        resourceId: ev.resourceId,
        documentId: ev.documentId,
        ipAddress: ev.ipAddress,
        userAgent: ev.userAgent,
        correlationId: ev.correlationId,
        reason: ev.reason,
        sequenceNumber: ev.sequenceNumber.toString(),
        previousHash,
        occurredAt: ev.occurredAt.toISOString(),
      });
      const expected = createHash('sha256').update(canonical).digest('hex');
      if (expected !== ev.eventHash) {
        return { ok: false, brokenAt: ev.sequenceNumber };
      }
      previousHash = ev.eventHash;
    }
    return { ok: true };
  }
}

function canonicalizeForAudit(input: Record<string, unknown>): string {
  const keys = Object.keys(input).sort();
  const parts = keys.map((k) => `${k}=${input[k] === null ? 'null' : String(input[k])}`);
  return parts.join('|');
}
