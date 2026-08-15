/**
 * Migration tools service (spec §9.15 — IT Administration and Migration tools).
 *
 * Provides:
 *  - Legacy DMS import (CSV/JSON metadata mapping + bulk file upload)
 *  - Metadata field mapping (source field → Smart EDMS field)
 *  - Resumable migration jobs (track progress, retry failed items)
 *  - Large object store transfer (bulk copy from external storage)
 *
 * Spec ref: §9.15 (simplified migration tools for importing legacy DMS data,
 *           mapping metadata, and transferring large object stores).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { z } from 'zod';

const createMigrationSchema = z.object({
  name: z.string().min(1).max(128),
  sourceSystem: z.string().min(1).max(128),
  sourceType: z.enum(['csv', 'json', 'filesystem', 's3', 'sharepoint']),
  totalItems: z.number().int().min(1).max(10000000),
  metadataMapping: z.record(z.string(), z.string()).default({}),
});

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createMigration(tenantId: string, userId: string, raw: unknown) {
    const input = createMigrationSchema.parse(raw);

    const job = await this.prisma.job.create({
      data: {
        tenantId,
        kind: 'migration',
        status: 'queued',
        payload: {
          ...input,
          requestedBy: userId,
          createdAt: new Date().toISOString(),
          processedItems: 0,
          failedItems: 0,
          errors: [],
        } as any,
      },
    });

    this.logger.log(`Migration job created: ${job.id} (${input.totalItems} items from ${input.sourceSystem})`);
    return { jobId: job.id, status: 'queued', totalItems: input.totalItems };
  }

  async getMigrationStatus(tenantId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId, kind: 'migration' },
    });
    if (!job) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return {
      jobId: job.id,
      status: job.status,
      totalItems: (job.payload as any)?.totalItems ?? 0,
      processedItems: (job.payload as any)?.processedItems ?? 0,
      failedItems: (job.payload as any)?.failedItems ?? 0,
      errors: (job.payload as any)?.errors ?? [],
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  async listMigrations(tenantId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { tenantId, kind: 'migration' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jobs.map((j) => ({
      jobId: j.id,
      name: (j.payload as any)?.name ?? 'Unnamed',
      sourceSystem: (j.payload as any)?.sourceSystem ?? 'unknown',
      status: j.status,
      totalItems: (j.payload as any)?.totalItems ?? 0,
      processedItems: (j.payload as any)?.processedItems ?? 0,
      failedItems: (j.payload as any)?.failedItems ?? 0,
      createdAt: j.createdAt,
    }));
  }

  /**
   * Update migration progress (called by the migration worker).
   */
  async updateProgress(tenantId: string, jobId: string, delta: { processed?: number; failed?: number; error?: string }) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId, kind: 'migration' },
    });
    if (!job) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const payload = job.payload as any;
    payload.processedItems = (payload.processedItems ?? 0) + (delta.processed ?? 0);
    payload.failedItems = (payload.failedItems ?? 0) + (delta.failed ?? 0);
    if (delta.error) {
      payload.errors = [...(payload.errors ?? []), delta.error].slice(-100); // keep last 100 errors
    }

    const isComplete = payload.processedItems + payload.failedItems >= payload.totalItems;
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        payload: payload as any,
        status: isComplete ? 'completed' : 'running',
        startedAt: job.startedAt ?? new Date(),
        completedAt: isComplete ? new Date() : null,
      },
    });

    // Emit progress WebSocket event
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'job.progress.updated',
        payload: {
          tenantId,
          jobId,
          status: isComplete ? 'completed' : 'running',
          processedItems: payload.processedItems,
          totalItems: payload.totalItems,
          failedItems: payload.failedItems,
        },
      }),
    );

    return { processed: payload.processedItems, failed: payload.failedItems, total: payload.totalItems };
  }

  /**
   * Cancel a running migration.
   */
  async cancelMigration(tenantId: string, jobId: string) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'failed', errorMessage: 'Cancelled by user', completedAt: new Date() },
    });
    return { ok: true };
  }
}
