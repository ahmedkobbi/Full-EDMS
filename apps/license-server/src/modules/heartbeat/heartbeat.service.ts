import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LicenseSigner } from '../license/license-signer.js';
import { WebhookService } from '../webhook/webhook.service.js';
import {
  buildHeartbeatResponse,
  serializeSedmslic,
} from '@smart-edms/license-core';
import type { HeartbeatRequest } from '@smart-edms/license-core';
import type { LicensePayload, LicenseState } from '@smart-edms/types';
import { randomUUID } from 'node:crypto';

/**
 * Heartbeat receiver — handles `POST /v1/heartbeat` from on-prem deployments.
 *
 * Spec ref: §12.9 (heartbeat request/response signing).
 *
 * Flow:
 *   1. On-prem backend POSTs heartbeat every HEARTBEAT_INTERVAL_SECONDS.
 *   2. Server validates the deployment matches an existing Activation.
 *   3. Server updates Heartbeat table + increments counters.
 *   4. Server returns signed HeartbeatResponse (status, state, grace info).
 *   5. If the license's entitlements have changed since the last heartbeat,
 *      the response includes an updated `.sedmslic` artifact (the on-prem
 *      backend replaces its cached artifact).
 *
 * Repeated heartbeat failures (deployments not heartbeating) flag the
 * license for review via a scheduled cron job (spec §12.9).
 */
@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly signer: LicenseSigner,
    private readonly webhook: WebhookService,
  ) {}

  async receiveHeartbeat(
    req: HeartbeatRequest,
    options: { apiKeyCustomerId?: string; ipAddress?: string },
  ): Promise<{
    status: 'healthy' | 'degraded' | 'offline_grace' | 'revoked' | 'unknown';
    state: LicenseState;
    serverTime: string;
    updatedArtifact: string | null;
    entitlements: string[];
    grace: { inGrace: boolean; graceEndsAt: string | null };
    sig: string;
    heartbeatId: string;
    nextHeartbeatAt: string;
  }> {
    // 1. Validate the deployment matches an existing Activation.
    const activation = await this.prisma.activation.findUnique({
      where: {
        licenseId_deploymentId: {
          licenseId: req.licenseId,
          deploymentId: req.deploymentId,
        },
      },
      include: { license: { include: { customer: true, signingKey: true, revocations: true } } },
    });
    if (!activation) {
      throw new NotFoundException({ messageKey: 'errors.ACTIVATION_NOT_FOUND' });
    }

    // If an API key was presented, ensure it belongs to the same customer.
    if (options.apiKeyCustomerId && options.apiKeyCustomerId !== activation.license.customerId) {
      throw new BadRequestException({ messageKey: 'errors.HEARTBEAT_CUSTOMER_MISMATCH' });
    }

    // 2. Fingerprint match check (informational — we accept the heartbeat
    // but flag it as 'degraded' if the fingerprint differs from the
    // activation record).
    const fingerprintMatch = activation.fingerprintHash === req.fingerprintHash;

    // 3. License state checks.
    const license = activation.license;
    const now = new Date();
    const isRevoked = license.status === 'revoked' || license.revocations.length > 0;
    const isExpired = license.endDate !== null && license.endDate < now;
    const graceEndsAt = license.endDate
      ? new Date(license.endDate.getTime() + license.gracePeriodDays * 86_400_000)
      : null;
    const inGrace = isExpired && graceEndsAt !== null && graceEndsAt > now;

    let state: LicenseState;
    let status: 'healthy' | 'degraded' | 'offline_grace' | 'revoked' | 'unknown';

    if (isRevoked) {
      state = 'invalid';
      status = 'revoked';
    } else if (license.status === 'suspended' || license.status === 'cancelled') {
      state = 'invalid';
      status = 'revoked';
    } else if (!fingerprintMatch) {
      state = 'invalid';
      status = 'degraded';
    } else if (isExpired && !inGrace) {
      state = 'grace_exhausted';
      status = 'offline_grace';
    } else if (isExpired && inGrace) {
      state = 'expired_grace';
      status = 'offline_grace';
    } else if (
      license.endDate &&
      license.endDate.getTime() - now.getTime() < 30 * 86_400_000
    ) {
      state = 'expiring_soon';
      status = 'healthy';
    } else {
      state = 'valid';
      status = 'healthy';
    }

    // 4. Compute the next heartbeat time + heartbeat interval hint.
    const heartbeatIntervalSeconds = this.config.get<number>('HEARTBEAT_INTERVAL_SECONDS') ?? 3600;
    const nextHeartbeatAt = new Date(now.getTime() + heartbeatIntervalSeconds * 1000);

    // 5. Update the Activation record's lastHeartbeatAt.
    await this.prisma.activation.update({
      where: { id: activation.id },
      data: {
        lastHeartbeatAt: now,
        appVersion: req.appVersion,
      },
    });

    // 6. Record the heartbeat.
    const heartbeat = await this.prisma.heartbeat.create({
      data: {
        id: randomUUID(),
        activationId: activation.id,
        licenseId: license.id,
        status,
        appVersion: req.appVersion,
        fingerprintHash: req.fingerprintHash,
        usageSummary: req.usageSummary as object,
      },
    });

    // 7. Record usage metrics (one row per metric key).
    await this.prisma.usageMetric.createMany({
      data: [
        {
          id: randomUUID(),
          licenseId: license.id,
          activationId: activation.id,
          metric: 'users',
          value: BigInt(req.usageSummary.activeUsers),
          recordedAt: now,
        },
        {
          id: randomUUID(),
          licenseId: license.id,
          activationId: activation.id,
          metric: 'storage',
          value: BigInt(req.usageSummary.storageUsedBytes),
          recordedAt: now,
        },
        {
          id: randomUUID(),
          licenseId: license.id,
          activationId: activation.id,
          metric: 'documents',
          value: BigInt(req.usageSummary.documentCount),
          recordedAt: now,
        },
        {
          id: randomUUID(),
          licenseId: license.id,
          activationId: activation.id,
          metric: 'ai_calls',
          value: BigInt(req.usageSummary.aiCallsToday),
          recordedAt: now,
        },
      ],
    });

    // 8. Build the updated artifact IF the license's renewalCounter has
    // increased since the last heartbeat (meaning the license was renewed
    // or its limits changed). The on-prem backend replaces its cached
    // artifact when it sees a new one.
    let updatedArtifactContent: string | null = null;
    // The on-prem backend should send its current `renewalCounter` (we'd
    // need to extend the heartbeat schema for that — for now we always
    // include the artifact if the license is within 30 days of expiry as
    // a refresh hint).
    if (
      license.renewalCounter > 0 &&
      license.endDate &&
      license.endDate.getTime() - now.getTime() < 30 * 86_400_000
    ) {
      // Re-sign the artifact with the current payload + deployment fingerprint.
      const payload = this.signer.buildPayload({
        licenseId: license.id,
        customerId: license.customerId,
        productId: license.productId,
        planId: license.planId,
        deploymentId: req.deploymentId,
        tenantId: null,
        environment: license.environment as 'production' | 'staging' | 'trial',
        issuedAt: now.toISOString(),
        expiresAt: license.endDate?.toISOString() ?? null,
        gracePeriodDays: license.gracePeriodDays,
        offlineAllowed: license.offlineMode,
        maxOfflineDays: license.gracePeriodDays,
        hybridSyncAllowed: license.hybridSync,
        fingerprintHash: req.fingerprintHash,
        machineId: null,
        os: 'unknown',
        arch: 'unknown',
        attestation: null,
        entitlements: license.enabledModules,
        aiEntitlements: [],
        limits: {
          maxUsers: license.maxUsers,
          maxDevices: license.maxDevices,
          maxStorageBytes: license.maxStorageBytes ? Number(license.maxStorageBytes) : null,
          maxDocuments: license.maxDocuments,
          aiMonthlyQuota: license.aiUsageAllowance,
          aiDailyQuotaPerUser: null,
        },
        features: (license.featuresJson as LicensePayload['features']) ?? [],
        renewalCounter: license.renewalCounter,
      });
      const signed = this.signer.signLicense(payload);
      updatedArtifactContent = signed.content;
    }

    // 9. Build + sign the heartbeat response.
    const responsePayload = {
      status,
      state,
      serverTime: now.toISOString(),
      updatedArtifact: null, // populated below if we have an updated artifact
      entitlements: license.enabledModules,
      grace: {
        inGrace,
        graceEndsAt: graceEndsAt?.toISOString() ?? null,
      },
    };
    const signer = this.signer.getActiveSigner();
    const signedResponse = buildHeartbeatResponse(responsePayload as never, signer.privateKeyPem, signer.alg);

    // Update the heartbeat record with the response signature.
    await this.prisma.heartbeat.update({
      where: { id: heartbeat.id },
      data: { responseSignature: signedResponse.sig },
    });

    // 10. Emit webhook on heartbeat failure (spec §12.9).
    if (status === 'revoked' || status === 'offline_grace') {
      await this.webhook.emit({
        customerId: license.customerId,
        event: 'heartbeat.failed',
        payload: {
          licenseId: license.id,
          activationId: activation.id,
          deploymentId: req.deploymentId,
          status,
          state,
          lastHeartbeatAt: now.toISOString(),
        },
      });
    }

    return {
      status,
      state,
      serverTime: responsePayload.serverTime,
      updatedArtifact: updatedArtifactContent,
      entitlements: responsePayload.entitlements,
      grace: responsePayload.grace,
      sig: signedResponse.sig,
      heartbeatId: heartbeat.id,
      nextHeartbeatAt: nextHeartbeatAt.toISOString(),
    };
  }

  /**
   * Scheduled cron: flag deployments that have missed heartbeats for
   * more than `HEARTBEAT_FAILURE_THRESHOLD` intervals. Emits a
   * `heartbeat.failed` webhook for each.
   *
   * Spec ref: §12.9 — "Repeated heartbeat failures flag the license
   * for review."
   */
  async flagStaleDeployments(): Promise<{ flagged: number }> {
    const threshold = this.config.get<number>('HEARTBEAT_FAILURE_THRESHOLD') ?? 3;
    const intervalSeconds = this.config.get<number>('HEARTBEAT_INTERVAL_SECONDS') ?? 3600;
    const cutoff = new Date(Date.now() - threshold * intervalSeconds * 1000);

    const stale = await this.prisma.activation.findMany({
      where: {
        status: 'active',
        OR: [{ lastHeartbeatAt: { lt: cutoff } }, { lastHeartbeatAt: null }],
      },
      include: { license: { select: { id: true, customerId: true } } },
      take: 100,
    });

    for (const activation of stale) {
      await this.webhook.emit({
        customerId: activation.license.customerId,
        event: 'heartbeat.failed',
        payload: {
          licenseId: activation.licenseId,
          activationId: activation.id,
          deploymentId: activation.deploymentId,
          status: 'unknown',
          state: 'invalid',
          lastHeartbeatAt: activation.lastHeartbeatAt?.toISOString() ?? null,
          reason: 'missed_heartbeats',
        },
      });
    }

    if (stale.length > 0) {
      this.logger.warn(`Flagged ${stale.length} stale deployments for review`);
    }
    return { flagged: stale.length };
  }
}
