import { Injectable, Logger } from '@nestjs/common';
import { SigningKeyService } from '../signing-key/signing-key.service.js';
import {
  buildLicenseArtifact,
  serializeSedmslic,
  type SigningAlg,
} from '@smart-edms/license-core';
import type {
  LicenseArtifact,
  LicensePayload,
} from '@smart-edms/types';
import { randomUUID } from 'node:crypto';

/**
 * License signing helper — assembles the `LicensePayload` and signs it
 * with the active private key to produce a `.sedmslic` artifact.
 *
 * Spec ref: §12.5 (license payload + signing).
 *
 * CRITICAL: this is the ONLY place in the licensing server that calls
 * `buildLicenseArtifact()`. The private key is obtained from
 * {@link SigningKeyService.getActiveSigner()} and is held in memory only —
 * it is NEVER written to logs, persisted to the DB, or returned in any
 * API response.
 */
@Injectable()
export class LicenseSigner {
  private readonly logger = new Logger(LicenseSigner.name);

  constructor(private readonly signingKey: SigningKeyService) {}

  /**
   * Get the active signing key material for direct signing operations
   * (e.g. heartbeat response signing). Delegates to SigningKeyService.
   *
   * Throws if the key is not loaded — callers should treat this as a
   * fatal "license signing disabled" condition.
   */
  getActiveSigner(): {
    privateKeyPem: string;
    kid: string;
    alg: SigningAlg;
    signingKeyId: string;
  } {
    return this.signingKey.getActiveSigner();
  }

  /**
   * Sign a license payload and return the serialized `.sedmslic` content
   * (pretty-printed JSON with trailing newline) plus the structured
   * `LicenseArtifact` for storage.
   */
  signLicense(payload: LicensePayload): {
    artifact: LicenseArtifact;
    content: string;
    kid: string;
    alg: SigningAlg;
    signingKeyId: string;
  } {
    const signer = this.signingKey.getActiveSigner();
    const artifact = buildLicenseArtifact(
      payload,
      signer.privateKeyPem,
      signer.kid,
      signer.alg,
    );
    const content = serializeSedmslic(artifact);
    this.logger.log(
      `Signed license artifact: licenseId=${payload.licenseId} kid=${signer.kid} ` +
        `alg=${signer.alg} renewalCounter=${payload.renewalCounter}`,
    );
    return {
      artifact,
      content,
      kid: signer.kid,
      alg: signer.alg,
      signingKeyId: signer.signingKeyId,
    };
  }

  /**
   * Build the canonical `LicensePayload` from a License DB row + the
   * activation context (deployment ID + fingerprint).
   *
   * The payload is the structure that gets canonicalised and signed; it
   * MUST match `LicensePayloadSchema` in `@smart-edms/schemas`.
   */
  buildPayload(input: {
    licenseId: string;
    customerId: string;
    productId: string;
    planId: string;
    deploymentId: string;
    tenantId: string | null;
    environment: 'production' | 'staging' | 'trial';
    issuedAt: string;
    expiresAt: string | null;
    gracePeriodDays: number;
    offlineAllowed: boolean;
    maxOfflineDays: number;
    hybridSyncAllowed: boolean;
    fingerprintHash: string;
    machineId: string | null;
    os: string;
    arch: string;
    attestation: string | null;
    entitlements: readonly string[];
    aiEntitlements: readonly string[];
    limits: {
      maxUsers: number | null;
      maxDevices: number | null;
      maxStorageBytes: number | null;
      maxDocuments: number | null;
      aiMonthlyQuota: number | null;
      aiDailyQuotaPerUser: number | null;
    };
    features: readonly { code: string; value: string | number | boolean; descriptionKey: string | null }[];
    renewalCounter: number;
  }): LicensePayload {
    return {
      v: 1,
      licenseId: input.licenseId as never,
      customerId: input.customerId as never,
      productId: input.productId as never,
      planId: input.planId as never,
      deploymentId: input.deploymentId as never,
      tenantId: input.tenantId as never,
      environment: input.environment,
      issuedAt: input.issuedAt as never,
      expiresAt: input.expiresAt as never,
      gracePeriodDays: input.gracePeriodDays,
      offline: {
        offlineAllowed: input.offlineAllowed,
        maxOfflineDays: input.maxOfflineDays,
        hybridSyncAllowed: input.hybridSyncAllowed,
      },
      fingerprint: {
        fingerprintHash: input.fingerprintHash,
        machineId: input.machineId,
        os: input.os,
        arch: input.arch,
        attestation: input.attestation,
      },
      entitlements: input.entitlements as never,
      aiEntitlements: input.aiEntitlements as never,
      limits: {
        maxUsers: input.limits.maxUsers,
        maxDevices: input.limits.maxDevices,
        maxStorageBytes: input.limits.maxStorageBytes as never,
        maxDocuments: input.limits.maxDocuments,
        aiMonthlyQuota: input.limits.aiMonthlyQuota,
        aiDailyQuotaPerUser: input.limits.aiDailyQuotaPerUser,
      },
      features: input.features,
      renewalCounter: input.renewalCounter,
    };
  }

  /**
   * Generate a new random license code (e.g. `SEDMS-PRO-2024-AB12CD34`).
   * Used at license issuance time.
   */
  generateLicenseCode(prefix: string = 'SEDMS'): string {
    const year = new Date().getFullYear();
    const random = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  }
}
