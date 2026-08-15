import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { LicenseService } from '../license/license.service';

/**
 * Tenant admin dashboard service — system usage, storage, health.
 * Spec ref: §9.15 (admin console and IT administration).
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly license: LicenseService,
  ) {}

  async getDashboard(tenantId: string) {
    const [userCount, documentCount, workflowCount, auditCount, storageBytes, lastAuditAt] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.document.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.workflowInstance.count({ where: { tenantId } }),
      this.prisma.auditEvent.count({ where: { tenantId } }),
      this.prisma.documentVersion.aggregate({
        where: { tenantId },
        _sum: { sizeBytes: true },
      }),
      this.prisma.auditEvent.findFirst({
        where: { tenantId },
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      }),
    ]);

    const licenseState = await this.license.getCurrentState();

    return {
      counts: { users: userCount, documents: documentCount, workflows: workflowCount, auditEvents: auditCount },
      storageBytes: storageBytes._sum.sizeBytes ?? 0n,
      lastAuditAt: lastAuditAt?.occurredAt ?? null,
      licenseState,
    };
  }

  async getSystemUsage(tenantId: string) {
    const info = await this.redis.connection.info('memory');
    return {
      redis: { memoryInfo: info },
      timestamp: new Date().toISOString(),
    };
  }

  async getHealth() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    let redisOk = false;
    try {
      await this.redis.connection.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
    return {
      db: dbOk ? 'ok' : 'down',
      redis: redisOk ? 'ok' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
