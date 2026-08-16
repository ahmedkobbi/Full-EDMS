/**
 * Quota enforcement service (spec §9.2 — tenant-level quotas).
 *
 * Enforces tenant-level quotas before creating users, uploading documents,
 * or storing data. Quotas are configured on the Tenant record:
 *   - quotaUsers (max active users)
 *   - quotaStorageBytes (max total storage)
 *   - quotaDocuments (max documents)
 *
 * Spec ref: §9.2 (tenant-level quotas should be supported),
 *           §22.2 (tenant-level and user-level quotas).
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);
  private static readonly CACHE_TTL = 60; // 1 minute cache

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Check if the tenant can create a new user.
   * Throws BadRequestException if quota exceeded.
   */
  async checkUserQuota(tenantId: string): Promise<void> {
    const cacheKey = `quota:${tenantId}:users`;
    const cached = await this.redis.getJson<{ count: number; limit: number }>(cacheKey);

    if (cached) {
      if (cached.limit > 0 && cached.count >= cached.limit) {
        throw new BadRequestException({
          messageKey: 'errors.QUOTA_USERS_EXCEEDED',
          messageVars: { limit: cached.limit, current: cached.count },
        });
      }
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { quotaUsers: true },
    });
    if (!tenant) {return;}

    const count = await this.prisma.user.count({
      where: { tenantId, deletedAt: null, status: { not: 'DELETED' } },
    });

    await this.redis.setJson(cacheKey, { count, limit: tenant.quotaUsers }, QuotaService.CACHE_TTL);

    if (tenant.quotaUsers > 0 && count >= tenant.quotaUsers) {
      this.logger.warn(`User quota exceeded: tenant=${tenantId} count=${count} limit=${tenant.quotaUsers}`);
      throw new BadRequestException({
        messageKey: 'errors.QUOTA_USERS_EXCEEDED',
        messageVars: { limit: tenant.quotaUsers, current: count },
      });
    }
  }

  /**
   * Check if the tenant can upload a new document.
   * Throws BadRequestException if quota exceeded.
   */
  async checkDocumentQuota(tenantId: string): Promise<void> {
    const cacheKey = `quota:${tenantId}:documents`;
    const cached = await this.redis.getJson<{ count: number; limit: number }>(cacheKey);

    if (cached) {
      if (cached.limit > 0 && cached.count >= cached.limit) {
        throw new BadRequestException({
          messageKey: 'errors.QUOTA_DOCUMENTS_EXCEEDED',
          messageVars: { limit: cached.limit, current: cached.count },
        });
      }
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { quotaDocuments: true },
    });
    if (!tenant) {return;}

    const count = await this.prisma.document.count({
      where: { tenantId, deletedAt: null },
    });

    await this.redis.setJson(cacheKey, { count, limit: tenant.quotaDocuments }, QuotaService.CACHE_TTL);

    if (tenant.quotaDocuments > 0 && count >= tenant.quotaDocuments) {
      this.logger.warn(`Document quota exceeded: tenant=${tenantId} count=${count} limit=${tenant.quotaDocuments}`);
      throw new BadRequestException({
        messageKey: 'errors.QUOTA_DOCUMENTS_EXCEEDED',
        messageVars: { limit: tenant.quotaDocuments, current: count },
      });
    }
  }

  /**
   * Check if the tenant can store additional bytes.
   * Throws BadRequestException if quota exceeded.
   */
  async checkStorageQuota(tenantId: string, additionalBytes: bigint): Promise<void> {
    const cacheKey = `quota:${tenantId}:storage`;
    const cached = await this.redis.getJson<{ used: string; limit: string }>(cacheKey);

    let usedBytes: bigint;
    let limitBytes: bigint;

    if (cached) {
      usedBytes = BigInt(cached.used);
      limitBytes = BigInt(cached.limit);
    } else {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { quotaStorageBytes: true },
      });
      if (!tenant) {return;}

      const agg = await this.prisma.documentVersion.aggregate({
        where: { tenantId },
        _sum: { sizeBytes: true },
      });
      usedBytes = agg._sum.sizeBytes ?? 0n;
      limitBytes = tenant.quotaStorageBytes;

      await this.redis.setJson(
        cacheKey,
        { used: usedBytes.toString(), limit: limitBytes.toString() },
        QuotaService.CACHE_TTL,
      );
    }

    if (limitBytes > 0n && usedBytes + additionalBytes > limitBytes) {
      this.logger.warn(`Storage quota exceeded: tenant=${tenantId} used=${usedBytes} +${additionalBytes} limit=${limitBytes}`);
      throw new BadRequestException({
        messageKey: 'errors.QUOTA_STORAGE_EXCEEDED',
        messageVars: {
          limit: Number(limitBytes / 1073741824n), // GB
          used: Number(usedBytes / 1073741824n),
        },
      });
    }
  }

  /**
   * Invalidate quota caches (called after user/document creation).
   */
  async invalidateQuotaCache(tenantId: string): Promise<void> {
    await this.redis.invalidate(`quota:${tenantId}:users`);
    await this.redis.invalidate(`quota:${tenantId}:documents`);
    await this.redis.invalidate(`quota:${tenantId}:storage`);
  }

  /**
   * Get current quota usage for the tenant (for admin dashboard display).
   */
  async getQuotaUsage(tenantId: string): Promise<{
    users: { used: number; limit: number; percent: number };
    documents: { used: number; limit: number; percent: number };
    storage: { used: string; limit: string; percent: number };
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { quotaUsers: true, quotaDocuments: true, quotaStorageBytes: true },
    });
    if (!tenant) {
      return {
        users: { used: 0, limit: 0, percent: 0 },
        documents: { used: 0, limit: 0, percent: 0 },
        storage: { used: '0', limit: '0', percent: 0 },
      };
    }

    const [userCount, docCount, storageAgg] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, deletedAt: null, status: { not: 'DELETED' } } }),
      this.prisma.document.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.documentVersion.aggregate({
        where: { tenantId },
        _sum: { sizeBytes: true },
      }),
    ]);

    const usedStorage = storageAgg._sum.sizeBytes ?? 0n;

    return {
      users: {
        used: userCount,
        limit: tenant.quotaUsers,
        percent: tenant.quotaUsers > 0 ? Math.round((userCount / tenant.quotaUsers) * 100) : 0,
      },
      documents: {
        used: docCount,
        limit: tenant.quotaDocuments,
        percent: tenant.quotaDocuments > 0 ? Math.round((docCount / tenant.quotaDocuments) * 100) : 0,
      },
      storage: {
        used: usedStorage.toString(),
        limit: tenant.quotaStorageBytes.toString(),
        percent: tenant.quotaStorageBytes > 0n
          ? Math.round(Number((usedStorage * 100n) / tenant.quotaStorageBytes))
          : 0,
      },
    };
  }
}
