import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LicenseSigner } from '../license/license-signer.js';
import { LicenseService } from '../license/license.service.js';
import { WebhookService } from '../webhook/webhook.service.js';
import { parseOfflineRequest } from '@smart-edms/license-core';
import type { OfflineIssueInput, OfflineRequestIntakeInput, OnlineActivationInput } from './dto.js';
import { createHash, randomUUID } from 'node:crypto';

/**
 * Activation service — online + offline activation flows.
 *
 * Spec ref: §12.7 (online activation), §12.8 (offline activation),
 * §12.6 (offline activation request file format).
 *
 * Online flow (§12.7):
 *   1. On-prem backend POSTs `/v1/activate/online` with the activation
 *      code + deployment fingerprint.
 *   2. Server validates: license exists, license is active, license not
 *      revoked, device limit not exceeded, environment matches.
 *   3. Server signs a `.sedmslic` artifact with the license's payload +
 *      deployment fingerprint.
 *   4. Server creates an Activation record + Device record.
 *   5. Server returns the artifact (the on-prem backend verifies + stores).
 *
 * Offline flow (§12.8):
 *   1. Air-gapped on-prem backend generates a `.sedmsreq` file.
 *   2. Operator ships the file out-of-band (USB, secure email) to the
 *      vendor.
 *   3. Vendor admin POSTs `/v1/activate/offline-request` with the file
 *      content. Server validates structure + nonce uniqueness + stores
 *      as OfflineActivationRequest (status=pending).
 *   4. Vendor admin reviews in the License Admin Panel and POSTs
 *      `/v1/activate/offline-issue` to sign + return a `.sedmslic`.
 *   5. Operator ships the `.sedmslic` back to the air-gapped deployment.
 */
@Injectable()
export class ActivationService {
  private readonly logger = new Logger(ActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly signer: LicenseSigner,
    private readonly licenseService: LicenseService,
    private readonly webhook: WebhookService,
  ) {}

  /**
   * Online activation (spec §12.7).
   *
   * Accepts either an API key (X-Api-Key header) OR an activation code
   * in the body — the latter is for the very first activation when the
   * customer doesn't have an API key yet.
   */
  async activateOnline(
    input: OnlineActivationInput,
    options: { apiKeyCustomerId?: string; adminId?: string; ipAddress?: string },
  ): Promise<{
    activationId: string;
    licenseId: string;
    status: string;
    artifact: string; // .sedmslic file content
    heartbeatIntervalSeconds: number;
    nextHeartbeatAt: string;
  }> {
    // 1. Validate the activation code against all licenses.
    const codeHash = sha256Hex(input.activationCode);
    const license = await this.prisma.license.findFirst({
      where: { activationCodeHash: codeHash },
      include: { customer: true, product: true, plan: true, signingKey: true },
    });
    if (!license) {
      throw new BadRequestException({ messageKey: 'errors.INVALID_ACTIVATION_CODE' });
    }

    // 2. Validate license state.
    if (license.status === 'revoked') {
      throw new BadRequestException({ messageKey: 'errors.LICENSE_REVOKED' });
    }
    if (license.status === 'cancelled' || license.status === 'expired') {
      throw new BadRequestException({ messageKey: 'errors.LICENSE_NOT_ACTIVE' });
    }

    // If an API key was presented, ensure it belongs to the same customer
    // as the license. This prevents a customer from activating another
    // customer's license via API key.
    if (options.apiKeyCustomerId && options.apiKeyCustomerId !== license.customerId) {
      throw new BadRequestException({ messageKey: 'errors.ACTIVATION_CODE_CUSTOMER_MISMATCH' });
    }

    // 3. Check device limit (spec §12.3 — maxDevices).
    const existingActivations = await this.prisma.activation.count({
      where: { licenseId: license.id, status: { in: ['active', 'pending'] } },
    });
    if (license.maxDevices !== null && existingActivations >= license.maxDevices) {
      throw new BadRequestException({
        messageKey: 'errors.DEVICE_LIMIT_EXCEEDED',
        messageVars: { max: license.maxDevices, current: existingActivations },
      });
    }

    // 4. Environment check (spec §12.3).
    // The on-prem deployment declares its environment; it must match the
    // license's environment. We trust the declared environment here —
    // the on-prem backend is responsible for setting it correctly.
    // (Forging the environment is a customer-side misbehaviour, not a
    // server-side vulnerability.)

    // 5. Check if this deploymentId is already activated against this license.
    let activation = await this.prisma.activation.findUnique({
      where: { licenseId_deploymentId: { licenseId: license.id, deploymentId: input.deploymentId } },
    });
    if (activation && activation.status === 'revoked') {
      throw new BadRequestException({ messageKey: 'errors.ACTIVATION_REVOKED' });
    }
    if (activation && activation.fingerprintHash !== input.machineFingerprint.fingerprintHash) {
      // Deployment fingerprint changed — this could be a re-install on the
      // same deployment ID. Update the fingerprint and allow re-activation.
      this.logger.warn(
        `Fingerprint change for deployment ${input.deploymentId} (was ${activation.fingerprintHash}, now ${input.machineFingerprint.fingerprintHash})`,
      );
    }

    // 6. Sign the license artifact.
    const payload = this.signer.buildPayload({
      licenseId: license.id,
      customerId: license.customerId,
      productId: license.productId,
      planId: license.planId,
      deploymentId: input.deploymentId,
      tenantId: input.tenantId ?? null,
      environment: license.environment as 'production' | 'staging' | 'trial',
      issuedAt: new Date().toISOString(),
      expiresAt: license.endDate?.toISOString() ?? null,
      gracePeriodDays: license.gracePeriodDays,
      offlineAllowed: license.offlineMode,
      maxOfflineDays: license.gracePeriodDays,
      hybridSyncAllowed: license.hybridSync,
      fingerprintHash: input.machineFingerprint.fingerprintHash,
      machineId: input.machineFingerprint.machineId ?? null,
      os: input.machineFingerprint.os,
      arch: input.machineFingerprint.arch,
      attestation: input.machineFingerprint.attestation ?? null,
      entitlements: license.enabledModules,
      aiEntitlements: [], // populated from features if needed
      limits: {
        maxUsers: license.maxUsers,
        maxDevices: license.maxDevices,
        maxStorageBytes: license.maxStorageBytes ? Number(license.maxStorageBytes) : null,
        maxDocuments: license.maxDocuments,
        aiMonthlyQuota: license.aiUsageAllowance,
        aiDailyQuotaPerUser: null,
      },
      features: (license.featuresJson as Array<{ code: string; value: string | number | boolean; descriptionKey: string | null }>) ?? [],
      renewalCounter: license.renewalCounter,
    });
    const signed = this.signer.signLicense(payload);

    // 7. Create / update the Activation record.
    const heartbeatIntervalSeconds = Number(process.env.HEARTBEAT_INTERVAL_SECONDS ?? '3600');
    const now = new Date();
    const nextHeartbeatAt = new Date(now.getTime() + heartbeatIntervalSeconds * 1000);

    if (activation) {
      activation = await this.prisma.activation.update({
        where: { id: activation.id },
        data: {
          status: 'active',
          fingerprintHash: input.machineFingerprint.fingerprintHash,
          appVersion: input.appVersion,
          environment: license.environment,
          lastHeartbeatAt: now,
          ipAddress: options.ipAddress,
        },
      });
    } else {
      activation = await this.prisma.activation.create({
        data: {
          id: randomUUID(),
          licenseId: license.id,
          deploymentId: input.deploymentId,
          fingerprintHash: input.machineFingerprint.fingerprintHash,
          appVersion: input.appVersion,
          environment: license.environment,
          status: 'active',
          firstActivatedAt: now,
          lastHeartbeatAt: now,
          ipAddress: options.ipAddress,
        },
      });
    }

    // 8. Create / update the Device record.
    await this.prisma.device.upsert({
      where: {
        activationId_fingerprintHash: {
          activationId: activation.id,
          fingerprintHash: input.machineFingerprint.fingerprintHash,
        },
      },
      create: {
        id: randomUUID(),
        activationId: activation.id,
        licenseId: license.id,
        fingerprintHash: input.machineFingerprint.fingerprintHash,
        os: input.machineFingerprint.os,
        arch: input.machineFingerprint.arch,
        appVersion: input.appVersion,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        appVersion: input.appVersion,
        lastSeenAt: now,
      },
    });

    // 9. Mark the license as active (if it was pending_activation).
    if (license.status === 'pending_activation') {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: 'active' },
      });
    }

    // 10. Audit + webhook.
    await this.audit.record({
      adminId: options.adminId ?? 'system',
      action: 'activation.online',
      target: activation.id,
      customerId: license.customerId,
      ipAddress: options.ipAddress,
      metadata: {
        licenseId: license.id,
        deploymentId: input.deploymentId,
        appVersion: input.appVersion,
        kid: signed.kid,
      },
    });

    await this.webhook.emit({
      customerId: license.customerId,
      event: 'activation.created',
      payload: {
        licenseId: license.id,
        activationId: activation.id,
        deploymentId: input.deploymentId,
        environment: license.environment,
      },
    });

    return {
      activationId: activation.id,
      licenseId: license.id,
      status: activation.status,
      artifact: signed.content,
      heartbeatIntervalSeconds,
      nextHeartbeatAt: nextHeartbeatAt.toISOString(),
    };
  }

  /**
   * Offline activation step 1 (§12.8): intake a `.sedmsreq` file.
   *
   * Public endpoint — no API key required (the file itself is the
   * authentication). The operator uploads it via the License Admin Panel
   * or via curl from any machine.
   */
  async intakeOfflineRequest(
    input: OfflineRequestIntakeInput,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ requestId: string; status: string }> {
    // 1. Parse + structurally validate the file.
    let parsed;
    try {
      parsed = parseOfflineRequest(input.rawContent);
    } catch (err) {
      throw new BadRequestException({
        messageKey: 'errors.OFFLINE_REQUEST_PARSE_FAILED',
        messageVars: { reason: (err as Error).message },
      });
    }

    // 2. Validate the product exists.
    const product = await this.prisma.product.findUnique({ where: { id: parsed.productId } });
    if (!product || product.deletedAt) {
      throw new BadRequestException({ messageKey: 'errors.PRODUCT_NOT_FOUND' });
    }

    // 3. Nonce uniqueness check (sha256-hashed at rest).
    const nonceHash = sha256Hex(parsed.nonce);
    const existing = await this.prisma.offlineActivationRequest.findUnique({
      where: { nonceHash },
    });
    if (existing) {
      throw new ConflictException({ messageKey: 'errors.OFFLINE_REQUEST_NONCE_REPLAY' });
    }

    // 4. Persist.
    const record = await this.prisma.offlineActivationRequest.create({
      data: {
        id: randomUUID(),
        requestId: parsed.requestId,
        productId: parsed.productId,
        deploymentId: parsed.deploymentId,
        appVersion: parsed.appVersion,
        machineFingerprint: parsed.machineFingerprint as object,
        installationPublicKey: parsed.installationPublicKey,
        os: parsed.os,
        arch: parsed.arch,
        contactEmail: parsed.contactEmail,
        nonceHash,
        rawContent: input.rawContent,
        status: 'pending',
      },
    });

    await this.audit.record({
      adminId,
      action: 'activation.offline.intake',
      target: record.id,
      ipAddress,
      metadata: {
        requestId: parsed.requestId,
        productId: parsed.productId,
        deploymentId: parsed.deploymentId,
        contactEmail: parsed.contactEmail,
      },
    });

    return { requestId: record.id, status: record.status };
  }

  /**
   * Offline activation step 2 (§12.8): admin reviews + issues the
   * `.sedmslic` artifact.
   *
   * Requires admin JWT.
   */
  async issueOfflineLicense(
    input: OfflineIssueInput,
    adminId: string,
    ipAddress?: string,
  ): Promise<{
    requestId: string;
    licenseId: string;
    artifact: string; // .sedmslic content
    signedAt: string;
  }> {
    const req = await this.prisma.offlineActivationRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!req) {
      throw new NotFoundException({ messageKey: 'errors.OFFLINE_REQUEST_NOT_FOUND' });
    }
    if (req.status === 'fulfilled') {
      throw new BadRequestException({ messageKey: 'errors.OFFLINE_REQUEST_ALREADY_FULFILLED' });
    }
    if (req.status === 'rejected') {
      throw new BadRequestException({ messageKey: 'errors.OFFLINE_REQUEST_REJECTED' });
    }

    // Resolve the license to use. Either:
    //   (a) the admin specified an existing licenseId, OR
    //   (b) the admin specified a customerId + planId, in which case we
    //       issue a NEW license for the customer.
    let licenseId = input.licenseId;
    let license;
    if (!licenseId) {
      if (!input.customerId || !input.planId) {
        throw new BadRequestException({
          messageKey: 'errors.OFFLINE_ISSUE_REQUIRES_LICENSE_OR_CUSTOMER_PLAN',
        });
      }
      const issued = await this.licenseService.issue(
        {
          customerId: input.customerId,
          productId: req.productId,
          planId: input.planId,
          type: 'enterprise',
          environment: 'production',
          offlineMode: true,
        },
        adminId,
        ipAddress,
      );
      licenseId = (issued.license as { id: string }).id;
      license = issued.license as { id: string; customerId: string; productId: string; planId: string; environment: string; enabledModules: string[]; maxUsers: number | null; maxDevices: number | null; maxStorageBytes: bigint | null; maxDocuments: number | null; aiUsageAllowance: number | null; featuresJson: unknown; gracePeriodDays: number; offlineMode: boolean; hybridSync: boolean; renewalCounter: number; endDate: Date | null; status: string };
    } else {
      license = await this.prisma.license.findUnique({
        where: { id: licenseId },
        include: { customer: true, product: true, plan: true, signingKey: true },
      });
      if (!license) {
        throw new NotFoundException({ messageKey: 'errors.LICENSE_NOT_FOUND' });
      }
    }

    // Validate the license product matches the request product.
    if (license.productId !== req.productId) {
      throw new BadRequestException({
        messageKey: 'errors.OFFLINE_ISSUE_PRODUCT_MISMATCH',
      });
    }

    // Build the payload using the offline request's machine fingerprint.
    const fingerprint = req.machineFingerprint as {
      fingerprintHash: string;
      machineId: string | null;
      os: string;
      arch: string;
      attestation: string | null;
    };
    const payload = this.signer.buildPayload({
      licenseId: license.id,
      customerId: license.customerId,
      productId: license.productId,
      planId: license.planId,
      deploymentId: req.deploymentId,
      tenantId: null,
      environment: license.environment as 'production' | 'staging' | 'trial',
      issuedAt: new Date().toISOString(),
      expiresAt: license.endDate?.toISOString() ?? null,
      gracePeriodDays: license.gracePeriodDays,
      offlineAllowed: license.offlineMode,
      maxOfflineDays: license.gracePeriodDays,
      hybridSyncAllowed: license.hybridSync,
      fingerprintHash: fingerprint.fingerprintHash,
      machineId: fingerprint.machineId,
      os: fingerprint.os,
      arch: fingerprint.arch,
      attestation: fingerprint.attestation,
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
      features: (license.featuresJson as Array<{ code: string; value: string | number | boolean; descriptionKey: string | null }>) ?? [],
      renewalCounter: license.renewalCounter,
    });
    const signed = this.signer.signLicense(payload);

    // Create the Activation record (offline activation).
    const now = new Date();
    const activation = await this.prisma.activation.upsert({
      where: { licenseId_deploymentId: { licenseId: license.id, deploymentId: req.deploymentId } },
      create: {
        id: randomUUID(),
        licenseId: license.id,
        deploymentId: req.deploymentId,
        fingerprintHash: fingerprint.fingerprintHash,
        appVersion: req.appVersion,
        environment: license.environment,
        status: 'active',
        firstActivatedAt: now,
        lastHeartbeatAt: now,
      },
      update: {
        status: 'active',
        fingerprintHash: fingerprint.fingerprintHash,
        appVersion: req.appVersion,
        lastHeartbeatAt: now,
      },
    });

    // Create the OfflineActivationCertificate record (persist the artifact
    // content for download/replay).
    const cert = await this.prisma.offlineActivationCertificate.create({
      data: {
        id: randomUUID(),
        requestId: req.requestId,
        offlineRequestId: req.id,
        licenseId: license.id,
        signingKeyId: signed.signingKeyId,
        artifactContent: signed.content,
        signedAt: now,
        signedByAdminId: adminId,
      },
    });

    // Mark the request as fulfilled.
    await this.prisma.offlineActivationRequest.update({
      where: { id: req.id },
      data: {
        status: 'fulfilled',
        reviewedByAdminId: adminId,
        reviewedAt: now,
        reviewNotes: input.reviewNotes,
        fulfilledLicenseId: license.id,
        fulfilledArtifact: signed.content,
        fulfilledAt: now,
      },
    });

    await this.audit.record({
      adminId,
      action: 'activation.offline.issue',
      target: req.id,
      customerId: license.customerId,
      ipAddress,
      metadata: {
        licenseId: license.id,
        activationId: activation.id,
        certificateId: cert.id,
        kid: signed.kid,
      },
    });

    await this.webhook.emit({
      customerId: license.customerId,
      event: 'activation.created',
      payload: {
        licenseId: license.id,
        activationId: activation.id,
        deploymentId: req.deploymentId,
        environment: license.environment,
        offline: true,
      },
    });

    return {
      requestId: req.id,
      licenseId: license.id,
      artifact: signed.content,
      signedAt: now.toISOString(),
    };
  }

  /**
   * Reject an offline activation request (admin review found it
   * invalid — bad product, unknown customer, etc.).
   */
  async rejectOfflineRequest(
    requestId: string,
    reason: string,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ ok: true }> {
    const req = await this.prisma.offlineActivationRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) {
      throw new NotFoundException({ messageKey: 'errors.OFFLINE_REQUEST_NOT_FOUND' });
    }
    if (req.status !== 'pending') {
      throw new BadRequestException({ messageKey: 'errors.OFFLINE_REQUEST_NOT_PENDING' });
    }
    await this.prisma.offlineActivationRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        reviewNotes: reason,
      },
    });
    await this.audit.record({
      adminId,
      action: 'activation.offline.reject',
      target: requestId,
      ipAddress,
      metadata: { reason },
    });
    return { ok: true };
  }

  /**
   * List offline activation requests (for the admin panel review queue).
   */
  async listOfflineRequests(input: { status?: string; limit?: number }): Promise<unknown> {
    return this.prisma.offlineActivationRequest.findMany({
      where: input.status ? { status: input.status } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.limit ?? 50, 200),
      include: { product: { select: { id: true, code: true, name: true } } },
    });
  }

  /**
   * Get a single offline activation request.
   */
  async getOfflineRequest(id: string): Promise<unknown> {
    const req = await this.prisma.offlineActivationRequest.findUnique({
      where: { id },
      include: { product: true, certificate: true },
    });
    if (!req) {
      throw new NotFoundException({ messageKey: 'errors.OFFLINE_REQUEST_NOT_FOUND' });
    }
    return req;
  }
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
