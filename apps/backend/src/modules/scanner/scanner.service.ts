import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { z } from 'zod';

const createProfileSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  driverKind: z.enum(['upload', 'twain', 'wia', 'isis', 'network', 'local_agent']).default('upload'),
  deviceId: z.string().max(128).optional(),
  settings: z.record(z.string(), z.unknown()).default({}),
});

const createJobSchema = z.object({
  profileId: z.string().uuid().optional(),
  totalFiles: z.number().int().min(1).max(10000),
  ocrLanguage: z.string().max(32).optional(),
});

/**
 * Scanner / digitization service.
 * Spec ref: §4.6 (scanner integration roadmap — Phase 1: upload, Phase 2: TWAIN/WIA/ISIS/network),
 * §9.16 (document digitization and capture).
 *
 * Phase 1 (upload) is the default; Phase 2 driver integrations are gated by `scanner-agent` entitlement.
 */
@Injectable()
export class ScannerService {
  constructor(private readonly prisma: PrismaService) {}

  async listProfiles(tenantId: string) {
    return this.prisma.scannerProfile.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProfile(tenantId: string, raw: unknown) {
    const input = createProfileSchema.parse(raw);
    return this.prisma.scannerProfile.create({
      data: {
        tenantId,
        code: input.code,
        name: input.name,
        driverKind: input.driverKind,
        deviceId: input.deviceId ?? null,
        settings: input.settings as Prisma.InputJsonValue,
      },
    });
  }

  async listJobs(tenantId: string, userId: string, rawQuery: unknown) {
    const q = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().optional(),
      status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'QUARANTINED']).optional(),
    }).parse(rawQuery);
    const where = {
      tenantId,
      createdByUserId: userId,
      ...(q.status ? { status: q.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.scannerJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: q.limit,
        ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      }),
      this.prisma.scannerJob.count({ where }),
    ]);
    return {
      items,
      total,
      cursor: items.length === q.limit ? items[items.length - 1]?.id : null,
      limit: q.limit,
    };
  }

  async createJob(tenantId: string, userId: string, raw: unknown) {
    const input = createJobSchema.parse(raw);
    return this.prisma.scannerJob.create({
      data: {
        tenantId,
        createdByUserId: userId,
        profileId: input.profileId,
        totalFiles: input.totalFiles,
        ocrLanguage: input.ocrLanguage,
        status: 'PENDING',
      },
    });
  }

  async updateJobProgress(tenantId: string, jobId: string, delta: { processed?: number; failed?: number; confidenceScore?: number }) {
    const job = await this.prisma.scannerJob.findFirst({ where: { id: jobId, tenantId } });
    if (!job) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return this.prisma.scannerJob.update({
      where: { id: jobId },
      data: {
        processedFiles: { increment: delta.processed ?? 0 },
        failedFiles: { increment: delta.failed ?? 0 },
        confidenceScore: delta.confidenceScore,
        status: delta.processed ? 'RUNNING' : job.status,
      },
    });
  }
}
