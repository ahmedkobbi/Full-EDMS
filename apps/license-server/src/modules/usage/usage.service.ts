/**
 * Usage metrics service (spec §12.1 — UsageMetric entity).
 *
 * Records and queries usage data reported by on-premise backends via
 * heartbeats. Usage includes: active users, storage bytes, document count,
 * AI API calls.
 *
 * Spec ref: §12.1 (UsageMetric entity), §12.9 (heartbeat includes usageSummary),
 *           §12.10 (usage dashboards in admin panel).
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a usage metric (called by the heartbeat handler).
   */
  async record(input: {
    licenseId: string;
    activationId: string;
    metric: string;
    value: number;
  }): Promise<void> {
    await this.prisma.usageMetric.create({
      data: {
        licenseId: input.licenseId,
        activationId: input.activationId,
        metric: input.metric,
        value: BigInt(input.value),
        recordedAt: new Date(),
      },
    });
  }

  /**
   * Get latest usage for a license (most recent reading per metric).
   */
  async getLatest(licenseId: string): Promise<Array<{
    metric: string;
    value: string;
    recordedAt: Date;
  }>> {
    const metrics = await this.prisma.usageMetric.findMany({
      where: { licenseId },
      orderBy: { recordedAt: 'desc' },
      take: 100,
      distinct: ['metric'],
    });
    return metrics.map((m) => ({
      metric: m.metric,
      value: m.value.toString(),
      recordedAt: m.recordedAt,
    }));
  }

  /**
   * Get usage history for a license (time series).
   */
  async getHistory(
    licenseId: string,
    metric: string,
    limit = 100,
  ): Promise<Array<{
    value: string;
    recordedAt: Date;
  }>> {
    const records = await this.prisma.usageMetric.findMany({
      where: { licenseId, metric },
      orderBy: { recordedAt: 'desc' },
      take: Math.min(limit, 1000),
    });
    return records.map((r) => ({
      value: r.value.toString(),
      recordedAt: r.recordedAt,
    }));
  }

  /**
   * Get aggregate usage across all licenses (for admin dashboard).
   */
  async getAggregate(): Promise<{
    totalLicenses: number;
    totalActivations: number;
    totalUsers: number;
    totalStorageBytes: string;
    totalDocuments: number;
    totalAiCalls: number;
  }> {
    const [licenses, activations] = await Promise.all([
      this.prisma.license.count({ where: { status: 'active' } }),
      this.prisma.activation.count({ where: { status: 'active' } }),
    ]);

    // Get latest values per license per metric
    const latestMetrics = await this.prisma.usageMetric.findMany({
      where: { metric: { in: ['users', 'storageBytes', 'documents', 'aiCallsToday'] } },
      orderBy: { recordedAt: 'desc' },
      take: 1000,
      distinct: ['licenseId', 'metric'],
    });

    let totalUsers = 0;
    let totalStorageBytes = 0n;
    let totalDocuments = 0;
    let totalAiCalls = 0;

    for (const m of latestMetrics) {
      switch (m.metric) {
        case 'users': totalUsers += Number(m.value); break;
        case 'storageBytes': totalStorageBytes += m.value; break;
        case 'documents': totalDocuments += Number(m.value); break;
        case 'aiCallsToday': totalAiCalls += Number(m.value); break;
      }
    }

    return {
      totalLicenses: licenses,
      totalActivations: activations,
      totalUsers,
      totalStorageBytes: totalStorageBytes.toString(),
      totalDocuments,
      totalAiCalls,
    };
  }
}
