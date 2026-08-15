import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  userId: z.string().uuid().optional(),
  category: z.string().max(64).optional(),
  code: z.string().max(64).optional(),
  result: z.enum(['allow', 'deny']).optional(),
  resourceType: z.string().max(64).optional(),
  resourceId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

/**
 * Audit query API service (read-only — audit events are append-only).
 * Spec ref: §9.12 (audit, evidence, provenance).
 */
@Injectable()
export class AuditApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async query(tenantId: string, rawQuery: unknown) {
    const q = querySchema.parse(rawQuery);
    const where = {
      tenantId,
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.code ? { code: q.code } : {}),
      ...(q.result ? { result: q.result } : {}),
      ...(q.resourceType ? { resourceType: q.resourceType } : {}),
      ...(q.resourceId ? { resourceId: q.resourceId } : {}),
      ...(q.documentId ? { documentId: q.documentId } : {}),
      ...(q.from || q.to
        ? {
            occurredAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: q.limit,
        ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return {
      items,
      total,
      cursor: items.length === q.limit ? items[items.length - 1]?.id : null,
      limit: q.limit,
    };
  }

  async verifyChain(tenantId: string) {
    return this.auditService.verifyHashChain(tenantId);
  }

  async requestExport(tenantId: string, userId: string, query: unknown) {
    // Creates a Job record that a background worker will process to generate the evidence package
    const job = await this.prisma.job.create({
      data: {
        tenantId,
        kind: 'audit_export',
        status: 'queued',
        payload: { query, requestedBy: userId } as any,
      },
    });
    return { jobId: job.id, status: 'queued' };
  }
}
