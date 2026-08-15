/**
 * @smart-edms/schemas — licensing system (spec §12, §15.2)
 *
 * CRITICAL FILE — Zod schemas for the digitally signed license artifacts:
 *  - `LicensePayloadSchema`     — the signed payload structure per §12.5
 *  - `LicenseArtifactSchema`    — the `.sedmslic` file structure
 *  - `OfflineRequestSchema`     — the `.sedmsreq` file per §12.6
 *  - `RevocationListSchema`     — the `.sedmscrl` file per §12.4
 *  - `HeartbeatRequestSchema`   — heartbeat request (§12.9)
 *  - `HeartbeatResponseSchema`  — heartbeat response (§12.9)
 *  - `ActivationRequestSchema`  — online activation flow per §12.7
 *
 * These schemas are the SINGLE SOURCE OF TRUTH for runtime validation of
 * license artifacts. Any mismatch between these schemas and the licensing
 * server's signing code is a CRITICAL security bug.
 *
 * Per spec §12.4:
 *  - License artifacts are digitally signed with asymmetric cryptography.
 *  - The private key never leaves the KMS/HSM.
 *  - Signature verification fails closed.
 *  - The public key is embedded in on-premise backend and Electron client.
 */

import { z } from 'zod';
import type {
  ActivationId,
  ApiKeyId,
  ContactId,
  CustomerId,
  DeploymentId,
  DeviceId,
  HeartbeatId,
  LicenseAuditLogId,
  LicenseId,
  OfflineActivationCertificateId,
  OfflineActivationRequestId,
  PlanId,
  ProductId,
  RevocationId,
  SigningKeyId,
  TrialId,
  UsageMetricId,
  WebhookId,
} from '@smart-edms/types';
import {
  ByteSizeSchema,
  IsoDateStringSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';

// ---------------------------------------------------------------------------
// Artifact version constants (spec §12.5)
// ---------------------------------------------------------------------------

/**
 * License payload schema version (embedded in `LicensePayload.v`).
 * Bumped only on incompatible payload shape changes (spec §12.5).
 */
export const LICENSE_PAYLOAD_VERSION = 1 as const;

/**
 * License artifact schema version (embedded in `LicenseArtifact.v`).
 * Bumped only on incompatible artifact envelope changes (spec §12.5).
 */
export const LICENSE_ARTIFACT_VERSION = 1 as const;

/**
 * Offline request file schema version (embedded in `OfflineRequest.v`).
 * Per spec §12.6.
 */
export const OFFLINE_REQUEST_VERSION = 1 as const;

/**
 * Revocation list file schema version (embedded in `RevocationList.v`).
 * Per spec §12.4.
 */
export const REVOCATION_LIST_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const CustomerIdSchema = UuidSchema.transform((v): CustomerId => v as CustomerId);
export const ContactIdSchema = UuidSchema.transform((v): ContactId => v as ContactId);
export const ProductIdSchema = UuidSchema.transform((v): ProductId => v as ProductId);
export const PlanIdSchema = UuidSchema.transform((v): PlanId => v as PlanId);
export const LicenseIdSchema = UuidSchema.transform((v): LicenseId => v as LicenseId);
export const ActivationIdSchema = UuidSchema.transform((v): ActivationId => v as ActivationId);
export const DeviceIdSchema = UuidSchema.transform((v): DeviceId => v as DeviceId);
export const HeartbeatIdSchema = UuidSchema.transform((v): HeartbeatId => v as HeartbeatId);
export const RevocationIdSchema = UuidSchema.transform((v): RevocationId => v as RevocationId);
export const SigningKeyIdSchema = UuidSchema.transform((v): SigningKeyId => v as SigningKeyId);
export const DeploymentIdSchema = UuidSchema.transform((v): DeploymentId => v as DeploymentId);
export const OfflineActivationRequestIdSchema = UuidSchema.transform(
  (v): OfflineActivationRequestId => v as OfflineActivationRequestId,
);
export const OfflineActivationCertificateIdSchema = UuidSchema.transform(
  (v): OfflineActivationCertificateId => v as OfflineActivationCertificateId,
);
export const TrialIdSchema = UuidSchema.transform((v): TrialId => v as TrialId);
export const WebhookIdSchema = UuidSchema.transform((v): WebhookId => v as WebhookId);
export const ApiKeyIdSchema = UuidSchema.transform((v): ApiKeyId => v as ApiKeyId);
export const UsageMetricIdSchema = UuidSchema.transform((v): UsageMetricId => v as UsageMetricId);
export const LicenseAuditLogIdSchema = UuidSchema.transform(
  (v): LicenseAuditLogId => v as LicenseAuditLogId,
);

// ---------------------------------------------------------------------------
// License type / status / environment (spec §12.2)
// ---------------------------------------------------------------------------

/** `z.infer` === `LicenseType`. */
export const LicenseTypeSchema = z.enum([
  'trial',
  'subscription',
  'perpetual_with_maintenance',
  'enterprise_on_premise',
  'offline_air_gapped',
  'evaluation',
  'partner_reseller',
]);

/** `z.infer` === `LicenseEnvironment`. */
export const LicenseEnvironmentSchema = z.enum(['production', 'staging', 'trial']);

/** `z.infer` === `LicenseStatus`. */
export const LicenseStatusSchema = z.enum([
  'draft',
  'pending_activation',
  'active',
  'suspended',
  'revoked',
  'expired',
  'cancelled',
]);

/** `z.infer` === `LicenseState` (derived runtime state). */
export const LicenseStateSchema = z.enum([
  'valid',
  'expiring_soon',
  'expired_grace',
  'grace_exhausted',
  'extended_remediation',
  'invalid',
]);

/** `z.infer` === `ActivationStatus`. */
export const ActivationStatusSchema = z.enum([
  'pending',
  'active',
  'suspended',
  'revoked',
  'expired',
]);

/** `z.infer` === `HeartbeatStatus`. */
export const HeartbeatStatusSchema = z.enum([
  'healthy',
  'degraded',
  'offline_grace',
  'revoked',
  'unknown',
]);

// ---------------------------------------------------------------------------
// Entitlement modules (spec §12.3 — full 22-module list)
// ---------------------------------------------------------------------------

/** `z.infer` === `EntitlementModule`. */
export const EntitlementModuleSchema = z.enum([
  'core-edms',
  'ocr',
  'omr',
  'icr',
  'bpmn',
  'cmmn',
  'dmn',
  'ai-assist',
  'ai-assistant',
  'c2pa-provenance',
  'dlp',
  'advanced-search',
  'hybrid-sync',
  'crisis-room',
  'physical-digital-twin',
  '3d-knowledge-graph',
  'electron-desktop',
  'mobile-access',
  'audit-export',
  'compliance-export',
  'scanner-agent',
  'guided-tour-analytics',
]);

/** `z.infer` === `AiAssistantEntitlement`. */
export const AiAssistantEntitlementSchema = z.enum([
  'ai-assistant-read',
  'ai-assistant-actions',
  'ai-assistant-external-provider',
  'ai-assistant-local-model',
  'ai-assistant-analytics',
]);

/** `z.infer` === `LicenseSigningAlgorithm`. */
export const LicenseSigningAlgorithmSchema = z.enum([
  'ed25519',
  'rsa-pss-sha256',
  'ecdsa-p256-sha256',
]);

// ---------------------------------------------------------------------------
// License sub-payloads
// ---------------------------------------------------------------------------

/** `z.infer` matches `LicenseFeature`. */
export const LicenseFeatureSchema = z
  .object({
    code: z.string().min(1).max(64),
    value: z.union([z.string().min(1).max(512), z.number(), z.boolean()]),
    descriptionKey: z.string().min(1).max(128).nullable(),
  })
  .strict();

/** `z.infer` matches `LicenseLimit`. */
export const LicenseLimitSchema = z
  .object({
    maxUsers: z.number().int().min(0).nullable(),
    maxDevices: z.number().int().min(0).nullable(),
    maxStorageBytes: ByteSizeSchema.nullable(),
    maxDocuments: z.number().int().min(0).nullable(),
    aiMonthlyQuota: z.number().int().min(0).nullable(),
    aiDailyQuotaPerUser: z.number().int().min(0).nullable(),
  })
  .strict();

/** `z.infer` matches `LicenseOfflineSettings`. */
export const LicenseOfflineSettingsSchema = z
  .object({
    offlineAllowed: z.boolean(),
    maxOfflineDays: z.number().int().min(0).max(3650),
    hybridSyncAllowed: z.boolean(),
  })
  .strict();

/** `z.infer` matches `InstallationFingerprint`. */
export const InstallationFingerprintSchema = z
  .object({
    fingerprintHash: z.string().min(1).max(256),
    machineId: z.string().min(1).max(256).nullable(),
    os: z.string().min(1).max(64),
    arch: z.string().min(1).max(64),
    attestation: z.string().min(1).max(8192).nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// CRITICAL: LicensePayload — the signed payload structure (spec §12.5)
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof LicensePayloadSchema>` MUST match `LicensePayload` from
 * `@smart-edms/types`. This is the structure that gets canonicalised and
 * signed. Any change here is a license-breaking change.
 */
export const LicensePayloadSchema = z
  .object({
    v: z.literal(LICENSE_PAYLOAD_VERSION),
    licenseId: LicenseIdSchema,
    customerId: CustomerIdSchema,
    productId: ProductIdSchema,
    planId: PlanIdSchema,
    deploymentId: DeploymentIdSchema,
    tenantId: TenantIdSchema.nullable(),
    environment: LicenseEnvironmentSchema,
    issuedAt: IsoDateStringSchema,
    expiresAt: IsoDateStringSchema.nullable(),
    gracePeriodDays: z.number().int().min(0).max(3650),
    offline: LicenseOfflineSettingsSchema,
    fingerprint: InstallationFingerprintSchema,
    entitlements: z.array(EntitlementModuleSchema),
    aiEntitlements: z.array(AiAssistantEntitlementSchema),
    limits: LicenseLimitSchema,
    features: z.array(LicenseFeatureSchema),
    renewalCounter: z.number().int().min(0),
  })
  .strict();

// ---------------------------------------------------------------------------
// CRITICAL: LicenseArtifact — the `.sedmslic` file (spec §12.5)
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof LicenseArtifactSchema>` MUST match `LicenseArtifact` from
 * `@smart-edms/types`. The `.sedmslic` file structure is:
 *   `{ v, type: 'sedms.license', alg, kid, payload, sig }`
 *
 * `sig` is the base64-encoded signature over the canonicalised `payload`.
 */
export const LicenseArtifactSchema = z
  .object({
    v: z.literal(LICENSE_ARTIFACT_VERSION),
    type: z.literal('sedms.license'),
    alg: LicenseSigningAlgorithmSchema,
    kid: z.string().min(1).max(256),
    payload: LicensePayloadSchema,
    sig: z.string().min(1).max(16384),
  })
  .strict();

// ---------------------------------------------------------------------------
// CRITICAL: OfflineRequest — the `.sedmsreq` file (spec §12.6)
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof OfflineRequestSchema>` MUST match `OfflineRequest` from
 * `@smart-edms/types`. Generated by the on-premise backend for offline
 * activation; shipped out-of-band to the licensing server.
 */
export const OfflineRequestSchema = z
  .object({
    v: z.literal(OFFLINE_REQUEST_VERSION),
    type: z.literal('sedms.request'),
    requestId: OfflineActivationRequestIdSchema,
    productId: ProductIdSchema,
    deploymentId: DeploymentIdSchema,
    appVersion: z.string().min(1).max(64),
    generatedAt: IsoDateStringSchema,
    machineFingerprint: InstallationFingerprintSchema,
    installationPublicKey: z.string().min(1).max(8192),
    os: z.string().min(1).max(64),
    arch: z.string().min(1).max(64),
    contactEmail: z.string().email().max(254).nullable(),
    nonce: z.string().min(16).max(256),
  })
  .strict();

// ---------------------------------------------------------------------------
// CRITICAL: RevocationList — the `.sedmscrl` file (spec §12.4)
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof RevocationListSchema>` MUST match `RevocationList` from
 * `@smart-edms/types`. The certificate revocation list; fetched by the
 * on-premise backend when online and checked during signature verification.
 */
export const RevocationListSchema = z
  .object({
    v: z.literal(REVOCATION_LIST_VERSION),
    type: z.literal('sedms.crl'),
    kid: z.string().min(1).max(256),
    generatedAt: IsoDateStringSchema,
    revokedLicenseIds: z.array(LicenseIdSchema),
    revokedFingerprints: z.array(z.string().min(1).max(256)),
    nextExpectedAt: IsoDateStringSchema,
    sig: z.string().min(1).max(16384),
  })
  .strict();

// ---------------------------------------------------------------------------
// CRITICAL: Heartbeat request / response (spec §12.9)
// ---------------------------------------------------------------------------

/**
 * Heartbeat request sent by the on-premise backend to the licensing server.
 * Per spec §12.9; carries usage summary and fingerprint for verification.
 */
export const HeartbeatRequestSchema = z
  .object({
    licenseId: LicenseIdSchema,
    deploymentId: DeploymentIdSchema,
    fingerprintHash: z.string().min(1).max(256),
    appVersion: z.string().min(1).max(64),
    timestamp: IsoDateStringSchema,
    usageSummary: z
      .object({
        activeUsers: z.number().int().min(0),
        storageUsedBytes: ByteSizeSchema,
        documentCount: z.number().int().min(0),
        aiCallsToday: z.number().int().min(0),
      })
      .strict(),
    // Optional signature over the heartbeat payload by the installation key.
    signature: z.string().min(1).max(8192).optional(),
  })
  .strict();

/**
 * `z.infer<typeof HeartbeatResponseSchema>` MUST match `HeartbeatResponse`
 * from `@smart-edms/types`. The server may push an updated license
 * certificate in the response.
 */
export const HeartbeatResponseSchema = z
  .object({
    status: HeartbeatStatusSchema,
    state: LicenseStateSchema,
    serverTime: IsoDateStringSchema,
    updatedArtifact: LicenseArtifactSchema.nullable(),
    entitlements: z.array(EntitlementModuleSchema),
    grace: z
      .object({
        inGrace: z.boolean(),
        graceEndsAt: IsoDateStringSchema.nullable(),
      })
      .strict(),
  })
  .strict();

// ---------------------------------------------------------------------------
// CRITICAL: ActivationRequest — online activation flow (spec §12.7)
// ---------------------------------------------------------------------------

/**
 * Online activation request sent by the on-premise backend to the licensing
 * server to activate a license against a deployment.
 */
export const ActivationRequestSchema = z
  .object({
    licenseKey: z.string().min(1).max(512),
    deploymentId: DeploymentIdSchema,
    tenantId: TenantIdSchema.nullable().optional(),
    appVersion: z.string().min(1).max(64),
    machineFingerprint: InstallationFingerprintSchema,
    installationPublicKey: z.string().min(1).max(8192),
    os: z.string().min(1).max(64),
    arch: z.string().min(1).max(64),
    contactEmail: z.string().email().max(254).nullable().optional(),
    // Replay-protection nonce.
    nonce: z.string().min(16).max(256),
  })
  .strict();

/** Response body for online activation. */
export const ActivationResponseSchema = z
  .object({
    activationId: ActivationIdSchema,
    licenseId: LicenseIdSchema,
    status: ActivationStatusSchema,
    artifact: LicenseArtifactSchema,
    // Initial heartbeat schedule hint, in seconds.
    heartbeatIntervalSeconds: z.number().int().min(60).max(86400),
    nextHeartbeatAt: IsoDateStringSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// License entity + LicenseLocalState
// ---------------------------------------------------------------------------

/** `z.infer` matches `License`. */
export const LicenseSchema = z
  .object({
    id: LicenseIdSchema,
    customerId: CustomerIdSchema,
    productId: ProductIdSchema,
    planId: PlanIdSchema,
    tenantId: TenantIdSchema.nullable(),
    type: LicenseTypeSchema,
    environment: LicenseEnvironmentSchema,
    status: LicenseStatusSchema,
    signingKeyId: SigningKeyIdSchema,
    version: z.number().int().min(1),
    issuedAt: IsoDateStringSchema,
    startsAt: IsoDateStringSchema,
    expiresAt: IsoDateStringSchema.nullable(),
    gracePeriodDays: z.number().int().min(0).max(3650),
    entitlements: z.array(EntitlementModuleSchema),
    aiEntitlements: z.array(AiAssistantEntitlementSchema),
    features: z.array(LicenseFeatureSchema),
    limits: LicenseLimitSchema,
    offline: LicenseOfflineSettingsSchema,
    supportLevel: z.string().min(1).max(64),
    renewalCounter: z.number().int().min(0),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    revokedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `LicenseLocalState`. */
export const LicenseLocalStateSchema = z
  .object({
    tenantId: TenantIdSchema,
    deploymentId: DeploymentIdSchema,
    artifact: LicenseArtifactSchema,
    state: LicenseStateSchema,
    lastVerifiedAt: IsoDateStringSchema,
    lastHeartbeatAt: IsoDateStringSchema.nullable(),
    lastHeartbeatStatus: HeartbeatStatusSchema,
    crlVersion: IsoDateStringSchema.nullable(),
    offlineGraceActive: z.boolean(),
    monotonicCounter: z.number().int().min(0),
  })
  .strict();

// ---------------------------------------------------------------------------
// Customer / Product / Plan / Activation / Device entities
// ---------------------------------------------------------------------------

/** `z.infer` matches `Customer`. */
export const CustomerSchema = z
  .object({
    id: CustomerIdSchema,
    legalName: z.string().min(1).max(200),
    displayName: z.string().min(1).max(200),
    industry: z.string().min(1).max(128).nullable(),
    website: z.string().url().max(512).nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    deletedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `Product`. */
export const ProductSchema = z
  .object({
    id: ProductIdSchema,
    code: z.string().min(1).max(64),
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).nullable(),
    version: z.string().min(1).max(64),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `Plan`. */
export const PlanSchema = z
  .object({
    id: PlanIdSchema,
    productId: ProductIdSchema,
    code: z.string().min(1).max(64),
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).nullable(),
    defaultEntitlements: z.array(EntitlementModuleSchema),
    defaultLimits: LicenseLimitSchema,
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `Activation`. */
export const ActivationSchema = z
  .object({
    id: ActivationIdSchema,
    licenseId: LicenseIdSchema,
    deploymentId: DeploymentIdSchema,
    status: ActivationStatusSchema,
    activationCode: z.string().min(1).max(256),
    fingerprint: InstallationFingerprintSchema,
    activatedAt: IsoDateStringSchema,
    deactivatedAt: IsoDateStringSchema.nullable(),
    lastHeartbeatAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `Device`. */
export const DeviceSchema = z
  .object({
    id: DeviceIdSchema,
    activationId: ActivationIdSchema,
    licenseId: LicenseIdSchema,
    displayName: z.string().min(1).max(200),
    fingerprint: InstallationFingerprintSchema,
    appVersion: z.string().min(1).max(64),
    firstSeenAt: IsoDateStringSchema,
    lastSeenAt: IsoDateStringSchema,
    revokedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `Heartbeat` (persisted record). */
export const HeartbeatSchema = z
  .object({
    id: HeartbeatIdSchema,
    licenseId: LicenseIdSchema,
    deploymentId: DeploymentIdSchema,
    fingerprintHash: z.string().min(1).max(256),
    appVersion: z.string().min(1).max(64),
    timestamp: IsoDateStringSchema,
    usageSummary: z
      .object({
        activeUsers: z.number().int().min(0),
        storageUsedBytes: ByteSizeSchema,
        documentCount: z.number().int().min(0),
        aiCallsToday: z.number().int().min(0),
      })
      .strict(),
    signature: z.string().min(1).max(8192).nullable(),
    status: HeartbeatStatusSchema,
  })
  .strict();

/** `z.infer` matches `SigningKey`. */
export const SigningKeySchema = z
  .object({
    id: SigningKeyIdSchema,
    kid: z.string().min(1).max(256),
    algorithm: LicenseSigningAlgorithmSchema,
    publicKey: z.string().min(1).max(8192),
    kmsKeyId: z.string().min(1).max(512),
    status: z.enum(['active', 'rotating', 'retired', 'revoked']),
    createdAt: IsoDateStringSchema,
    rotatedAt: IsoDateStringSchema.nullable(),
    retiredAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `Revocation`. */
export const RevocationSchema = z
  .object({
    id: RevocationIdSchema,
    licenseId: LicenseIdSchema,
    reason: z.string().min(1).max(2000),
    revokedBy: z.string().min(1).max(200),
    revokedAt: IsoDateStringSchema,
    propagated: z.boolean(),
  })
  .strict();
