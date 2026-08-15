import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';

/**
 * Licensing-server audit log service — append-only, hash-chained.
 *
 * Spec ref: §12.1 (license server audit log), §21.7 (logging and monitoring),
 * §27.3 (security rules — log security failures).
 *
 * Hash chain pattern (same as on-prem EDMS backend):
 *   eventHash = sha256(`${previousHash}|${canonicalEvent}`)
 *
 * Where `canonicalEvent` is a stable, sorted, pipe-delimited serialisation
 * of the audit-relevant fields. Any modification to a historical entry
 * breaks the chain and is detected by `verifyHashChain()`.
 *
 * The chain is GLOBAL (not per-tenant) because the licensing server is
 * a single-tenant control plane serving all customers. Per-customer
 * filtering is done via the `customerId` column on the log entry.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // In-memory cache of the last event hash + sequence number. Rehydrated
  // from the DB on startup (see `rehydrateChain()`).
  private lastHash: string | null = null;
  private lastSequence = 0;
  private rehydrated = false;

  constructor(private readonly prisma: PrismaService) {
    // Fire-and-forget rehydration; first few audit events will retry if
    // the rehydrate hasn't completed yet (handled in `record()`).
    void this.rehydrateChain();
  }

  /**
   * Rehydrate the chain tip from the DB. Called once at startup.
   */
  private async rehydrateChain(): Promise<void> {
    try {
      const last = await this.prisma.licenseAuditLog.findFirst({
        orderBy: { sequenceNumber: 'desc' },
        take: 1,
      });
      if (last) {
        this.lastHash = last.eventHash;
        this.lastSequence = last.sequenceNumber;
      }
      this.rehydrated = true;
    } catch (err) {
      this.logger.error(`Failed to rehydrate audit chain: ${(err as Error).message}`);
    }
  }

  /**
   * Record an audit event. NEVER throws — audit failure must not break
   * the calling request flow (spec §27.3).
   */
  async record(input: {
    adminId?: string;
    action: string;
    target?: string;
    targetId?: string;
    customerId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    result?: string;
    reason?: string;
  }): Promise<void> {
    try {
      // Wait for rehydration if it hasn't completed.
      if (!this.rehydrated) {
        for (let i = 0; i < 5 && !this.rehydrated; i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }

      const sequenceNumber = this.lastSequence + 1;
      const occurredAt = new Date().toISOString();
      const metadata: Record<string, unknown> = {
        ...(input.metadata ?? {}),
        ...(input.targetId ? { targetId: input.targetId } : {}),
        ...(input.result ? { result: input.result } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
      };
      const canonical = canonicalizeForAudit({
        adminId: input.adminId ?? null,
        action: input.action,
        target: input.target ?? null,
        customerId: input.customerId ?? null,
        metadata: JSON.stringify(metadata),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        occurredAt,
        sequenceNumber: sequenceNumber.toString(),
        previousHash: this.lastHash ?? 'null',
      });
      const eventHash = createHash('sha256').update(canonical).digest('hex');

      await this.prisma.licenseAuditLog.create({
        data: {
          id: randomUUID(),
          adminId: input.adminId ?? null,
          action: input.action,
          target: input.target ?? input.targetId ?? null,
          customerId: input.customerId ?? null,
          metadata: metadata as unknown as Prisma.InputJsonValue,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          occurredAt: new Date(occurredAt),
          sequenceNumber,
          previousHash: this.lastHash,
          eventHash,
        },
      });

      this.lastHash = eventHash;
      this.lastSequence = sequenceNumber;
    } catch (err) {
      this.logger.error(`Audit write failed: ${(err as Error).message}`);
      // Never rethrow — audit failure must not break the request flow.
    }
  }

  /**
   * Verify hash chain integrity. Returns the first broken sequence
   * number, or `null` if the chain is intact.
   *
   * Spec ref: §12.1, §24.2 (compliance — audit log integrity).
   */
  async verifyHashChain(limit = 50000): Promise<{ ok: boolean; brokenAt?: number }> {
    const events = await this.prisma.licenseAuditLog.findMany({
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
    });
    let previousHash: string | null = null;
    let expectedSeq = 1;
    for (const ev of events) {
      if (ev.sequenceNumber !== expectedSeq) {
        return { ok: false, brokenAt: ev.sequenceNumber };
      }
      if (ev.previousHash !== previousHash) {
        return { ok: false, brokenAt: ev.sequenceNumber };
      }
      const canonical = canonicalizeForAudit({
        adminId: ev.adminId ?? null,
        action: ev.action,
        target: ev.target ?? null,
        customerId: ev.customerId ?? null,
        metadata: ev.metadata ? JSON.stringify(ev.metadata) : null,
        ipAddress: ev.ipAddress ?? null,
        userAgent: ev.userAgent ?? null,
        occurredAt: ev.occurredAt.toISOString(),
        sequenceNumber: ev.sequenceNumber.toString(),
        previousHash: ev.previousHash ?? 'null',
      });
      const expected = createHash('sha256').update(canonical).digest('hex');
      if (expected !== ev.eventHash) {
        return { ok: false, brokenAt: ev.sequenceNumber };
      }
      previousHash = ev.eventHash;
      expectedSeq += 1;
    }
    return { ok: true };
  }

  /**
   * List audit log entries, paginated (cursor-based, newest first).
   * Filterable by action code and customerId.
   */
  async list(input: {
    limit: number;
    cursor?: number;
    action?: string;
    customerId?: string;
    adminId?: string;
  }): Promise<{ entries: unknown[]; nextCursor: number | null }> {
    const take = Math.min(input.limit, 500);
    const entries = await this.prisma.licenseAuditLog.findMany({
      where: {
        ...(input.action ? { action: input.action } : {}),
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.adminId ? { adminId: input.adminId } : {}),
        ...(input.cursor ? { sequenceNumber: { lt: input.cursor } } : {}),
      },
      orderBy: { sequenceNumber: 'desc' },
      take: take + 1,
    });
    const nextCursor = entries.length > take ? entries[entries.length - 1].sequenceNumber : null;
    return {
      entries: entries.slice(0, take),
      nextCursor,
    };
  }
}

function canonicalizeForAudit(input: Record<string, unknown>): string {
  const keys = Object.keys(input).sort();
  const parts = keys.map((k) => `${k}=${input[k] === null ? 'null' : String(input[k])}`);
  return parts.join('|');
}
