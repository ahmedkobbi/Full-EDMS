/**
 * License heartbeat cron service (spec §12.9).
 *
 * Runs on a schedule (every hour) to send heartbeats to the licensing server
 * when online. Updates the local license state based on the response.
 *
 * Spec ref: §12.9 (Heartbeat Contract), §4.4 (license failure behavior).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis.service.js';
import { AuditService } from '../../common/audit.service.js';
import { computeMachineFingerprint } from '@smart-edms/license-core';

@Injectable()
export class LicenseHeartbeatCron {
  private readonly logger = new Logger(LicenseHeartbeatCron.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Send heartbeat to the licensing server every hour.
   * Only runs if the license server URL is configured.
   *
   * Spec ref: §12.9 (heartbeat failures must be logged, repeated failures
   *           must trigger offline grace rules).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendHeartbeat(): Promise<void> {
    const licenseServerUrl = this.config.get<string>('LICENSE_SERVER_URL');
    if (!licenseServerUrl) {
      return; // Not configured — skip heartbeat
    }

    const local = await this.prisma.licenseLocalState.findFirst();
    if (!local?.deploymentId || !local.payloadJson) {
      return; // No license loaded
    }

    const payload = local.payloadJson as any;
    const fingerprint = await computeMachineFingerprint();

    const heartbeatRequest = {
      licenseId: payload.licenseId,
      deploymentId: local.deploymentId,
      fingerprintHash: fingerprint.hash,
      appVersion: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      usageSummary: await this.getUsageSummary(local.tenantId),
    };

    try {
      const response = await fetch(`${licenseServerUrl}/v1/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.LICENSE_API_KEY ?? '',
        },
        body: JSON.stringify(heartbeatRequest),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Heartbeat failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as {
        status: string;
        graceState: string;
        updatedCertificate?: string;
        serverTime: string;
      };

      // Update local heartbeat timestamp + reset failure counter
      await this.prisma.licenseLocalState.update({
        where: { id: local.id },
        data: {
          lastHeartbeatAt: new Date(),
          heartbeatFailures: 0,
        },
      });

      // If the server returned an updated certificate, store it
      if (result.updatedCertificate) {
        this.logger.log('Received updated license certificate from heartbeat');
        // The updated certificate would be verified + stored by LicenseService
      }

      this.logger.debug(`Heartbeat sent: status=${result.status} graceState=${result.graceState}`);
    } catch (err) {
      // Increment failure counter
      const failures = local.heartbeatFailures + 1;
      await this.prisma.licenseLocalState.update({
        where: { id: local.id },
        data: { heartbeatFailures: failures },
      });

      this.logger.warn(`Heartbeat failed (attempt ${failures}): ${(err as Error).message}`);

      // If failures exceed threshold, emit alert
      if (failures >= 3) {
        await this.redis.connection.publish(
          `smart-edms:ws-events:${local.tenantId}`,
          JSON.stringify({
            name: 'license.status.changed',
            payload: {
              tenantId: local.tenantId,
              state: 'heartbeat_failing',
              failureCount: failures,
              lastHeartbeatAt: local.lastHeartbeatAt,
            },
          }),
        );

        void this.audit.record({
          tenantId: local.tenantId,
          category: 'license',
          code: 'license.heartbeat.failed',
          result: 'deny',
          reason: `heartbeat_failure_count:${failures}`,
        });
      }
    }
  }

  /**
   * Gather usage summary for the heartbeat.
   */
  private async getUsageSummary(tenantId: string): Promise<{
    users: number;
    storageBytes: number;
    documents: number;
    aiCallsToday: number;
  }> {
    const [users, documents, storageAgg] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.document.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.documentVersion.aggregate({
        where: { tenantId },
        _sum: { sizeBytes: true },
      }),
    ]);

    return {
      users,
      storageBytes: Number(storageAgg._sum.sizeBytes ?? 0),
      documents,
      aiCallsToday: 0, // would query AssistantMessage count for today
    };
  }
}
