"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceSchema = exports.ActivationSchema = exports.PlanSchema = exports.ProductSchema = exports.CustomerSchema = exports.LicenseLocalStateSchema = exports.LicenseSchema = exports.ActivationResponseSchema = exports.ActivationRequestSchema = exports.HeartbeatResponseSchema = exports.HeartbeatRequestSchema = exports.RevocationListSchema = exports.OfflineRequestSchema = exports.LicenseArtifactSchema = exports.LicensePayloadSchema = exports.InstallationFingerprintSchema = exports.LicenseOfflineSettingsSchema = exports.LicenseLimitSchema = exports.LicenseFeatureSchema = exports.LicenseSigningAlgorithmSchema = exports.AiAssistantEntitlementSchema = exports.EntitlementModuleSchema = exports.HeartbeatStatusSchema = exports.ActivationStatusSchema = exports.LicenseStateSchema = exports.LicenseStatusSchema = exports.LicenseEnvironmentSchema = exports.LicenseTypeSchema = exports.LicenseAuditLogIdSchema = exports.UsageMetricIdSchema = exports.ApiKeyIdSchema = exports.WebhookIdSchema = exports.TrialIdSchema = exports.OfflineActivationCertificateIdSchema = exports.OfflineActivationRequestIdSchema = exports.DeploymentIdSchema = exports.SigningKeyIdSchema = exports.RevocationIdSchema = exports.HeartbeatIdSchema = exports.DeviceIdSchema = exports.ActivationIdSchema = exports.LicenseIdSchema = exports.PlanIdSchema = exports.ProductIdSchema = exports.ContactIdSchema = exports.CustomerIdSchema = exports.REVOCATION_LIST_VERSION = exports.OFFLINE_REQUEST_VERSION = exports.LICENSE_ARTIFACT_VERSION = exports.LICENSE_PAYLOAD_VERSION = void 0;
exports.RevocationSchema = exports.SigningKeySchema = exports.HeartbeatSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
// ---------------------------------------------------------------------------
// Artifact version constants (spec §12.5)
// ---------------------------------------------------------------------------
/**
 * License payload schema version (embedded in `LicensePayload.v`).
 * Bumped only on incompatible payload shape changes (spec §12.5).
 */
exports.LICENSE_PAYLOAD_VERSION = 1;
/**
 * License artifact schema version (embedded in `LicenseArtifact.v`).
 * Bumped only on incompatible artifact envelope changes (spec §12.5).
 */
exports.LICENSE_ARTIFACT_VERSION = 1;
/**
 * Offline request file schema version (embedded in `OfflineRequest.v`).
 * Per spec §12.6.
 */
exports.OFFLINE_REQUEST_VERSION = 1;
/**
 * Revocation list file schema version (embedded in `RevocationList.v`).
 * Per spec §12.4.
 */
exports.REVOCATION_LIST_VERSION = 1;
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.CustomerIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ContactIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ProductIdSchema = common_1.UuidSchema.transform((v) => v);
exports.PlanIdSchema = common_1.UuidSchema.transform((v) => v);
exports.LicenseIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ActivationIdSchema = common_1.UuidSchema.transform((v) => v);
exports.DeviceIdSchema = common_1.UuidSchema.transform((v) => v);
exports.HeartbeatIdSchema = common_1.UuidSchema.transform((v) => v);
exports.RevocationIdSchema = common_1.UuidSchema.transform((v) => v);
exports.SigningKeyIdSchema = common_1.UuidSchema.transform((v) => v);
exports.DeploymentIdSchema = common_1.UuidSchema.transform((v) => v);
exports.OfflineActivationRequestIdSchema = common_1.UuidSchema.transform((v) => v);
exports.OfflineActivationCertificateIdSchema = common_1.UuidSchema.transform((v) => v);
exports.TrialIdSchema = common_1.UuidSchema.transform((v) => v);
exports.WebhookIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ApiKeyIdSchema = common_1.UuidSchema.transform((v) => v);
exports.UsageMetricIdSchema = common_1.UuidSchema.transform((v) => v);
exports.LicenseAuditLogIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// License type / status / environment (spec §12.2)
// ---------------------------------------------------------------------------
/** `z.infer` === `LicenseType`. */
exports.LicenseTypeSchema = zod_1.z.enum([
    'trial',
    'subscription',
    'perpetual_with_maintenance',
    'enterprise_on_premise',
    'offline_air_gapped',
    'evaluation',
    'partner_reseller',
]);
/** `z.infer` === `LicenseEnvironment`. */
exports.LicenseEnvironmentSchema = zod_1.z.enum(['production', 'staging', 'trial']);
/** `z.infer` === `LicenseStatus`. */
exports.LicenseStatusSchema = zod_1.z.enum([
    'draft',
    'pending_activation',
    'active',
    'suspended',
    'revoked',
    'expired',
    'cancelled',
]);
/** `z.infer` === `LicenseState` (derived runtime state). */
exports.LicenseStateSchema = zod_1.z.enum([
    'valid',
    'expiring_soon',
    'expired_grace',
    'grace_exhausted',
    'extended_remediation',
    'invalid',
]);
/** `z.infer` === `ActivationStatus`. */
exports.ActivationStatusSchema = zod_1.z.enum([
    'pending',
    'active',
    'suspended',
    'revoked',
    'expired',
]);
/** `z.infer` === `HeartbeatStatus`. */
exports.HeartbeatStatusSchema = zod_1.z.enum([
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
exports.EntitlementModuleSchema = zod_1.z.enum([
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
exports.AiAssistantEntitlementSchema = zod_1.z.enum([
    'ai-assistant-read',
    'ai-assistant-actions',
    'ai-assistant-external-provider',
    'ai-assistant-local-model',
    'ai-assistant-analytics',
]);
/** `z.infer` === `LicenseSigningAlgorithm`. */
exports.LicenseSigningAlgorithmSchema = zod_1.z.enum([
    'ed25519',
    'rsa-pss-sha256',
    'ecdsa-p256-sha256',
]);
// ---------------------------------------------------------------------------
// License sub-payloads
// ---------------------------------------------------------------------------
/** `z.infer` matches `LicenseFeature`. */
exports.LicenseFeatureSchema = zod_1.z
    .object({
    code: zod_1.z.string().min(1).max(64),
    value: zod_1.z.union([zod_1.z.string().min(1).max(512), zod_1.z.number(), zod_1.z.boolean()]),
    descriptionKey: zod_1.z.string().min(1).max(128).nullable(),
})
    .strict();
/** `z.infer` matches `LicenseLimit`. */
exports.LicenseLimitSchema = zod_1.z
    .object({
    maxUsers: zod_1.z.number().int().min(0).nullable(),
    maxDevices: zod_1.z.number().int().min(0).nullable(),
    maxStorageBytes: common_1.ByteSizeSchema.nullable(),
    maxDocuments: zod_1.z.number().int().min(0).nullable(),
    aiMonthlyQuota: zod_1.z.number().int().min(0).nullable(),
    aiDailyQuotaPerUser: zod_1.z.number().int().min(0).nullable(),
})
    .strict();
/** `z.infer` matches `LicenseOfflineSettings`. */
exports.LicenseOfflineSettingsSchema = zod_1.z
    .object({
    offlineAllowed: zod_1.z.boolean(),
    maxOfflineDays: zod_1.z.number().int().min(0).max(3650),
    hybridSyncAllowed: zod_1.z.boolean(),
})
    .strict();
/** `z.infer` matches `InstallationFingerprint`. */
exports.InstallationFingerprintSchema = zod_1.z
    .object({
    fingerprintHash: zod_1.z.string().min(1).max(256),
    machineId: zod_1.z.string().min(1).max(256).nullable(),
    os: zod_1.z.string().min(1).max(64),
    arch: zod_1.z.string().min(1).max(64),
    attestation: zod_1.z.string().min(1).max(8192).nullable(),
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
exports.LicensePayloadSchema = zod_1.z
    .object({
    v: zod_1.z.literal(exports.LICENSE_PAYLOAD_VERSION),
    licenseId: exports.LicenseIdSchema,
    customerId: exports.CustomerIdSchema,
    productId: exports.ProductIdSchema,
    planId: exports.PlanIdSchema,
    deploymentId: exports.DeploymentIdSchema,
    tenantId: tenant_1.TenantIdSchema.nullable(),
    environment: exports.LicenseEnvironmentSchema,
    issuedAt: common_1.IsoDateStringSchema,
    expiresAt: common_1.IsoDateStringSchema.nullable(),
    gracePeriodDays: zod_1.z.number().int().min(0).max(3650),
    offline: exports.LicenseOfflineSettingsSchema,
    fingerprint: exports.InstallationFingerprintSchema,
    entitlements: zod_1.z.array(exports.EntitlementModuleSchema),
    aiEntitlements: zod_1.z.array(exports.AiAssistantEntitlementSchema),
    limits: exports.LicenseLimitSchema,
    features: zod_1.z.array(exports.LicenseFeatureSchema),
    renewalCounter: zod_1.z.number().int().min(0),
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
exports.LicenseArtifactSchema = zod_1.z
    .object({
    v: zod_1.z.literal(exports.LICENSE_ARTIFACT_VERSION),
    type: zod_1.z.literal('sedms.license'),
    alg: exports.LicenseSigningAlgorithmSchema,
    kid: zod_1.z.string().min(1).max(256),
    payload: exports.LicensePayloadSchema,
    sig: zod_1.z.string().min(1).max(16384),
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
exports.OfflineRequestSchema = zod_1.z
    .object({
    v: zod_1.z.literal(exports.OFFLINE_REQUEST_VERSION),
    type: zod_1.z.literal('sedms.request'),
    requestId: exports.OfflineActivationRequestIdSchema,
    productId: exports.ProductIdSchema,
    deploymentId: exports.DeploymentIdSchema,
    appVersion: zod_1.z.string().min(1).max(64),
    generatedAt: common_1.IsoDateStringSchema,
    machineFingerprint: exports.InstallationFingerprintSchema,
    installationPublicKey: zod_1.z.string().min(1).max(8192),
    os: zod_1.z.string().min(1).max(64),
    arch: zod_1.z.string().min(1).max(64),
    contactEmail: zod_1.z.string().email().max(254).nullable(),
    nonce: zod_1.z.string().min(16).max(256),
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
exports.RevocationListSchema = zod_1.z
    .object({
    v: zod_1.z.literal(exports.REVOCATION_LIST_VERSION),
    type: zod_1.z.literal('sedms.crl'),
    kid: zod_1.z.string().min(1).max(256),
    generatedAt: common_1.IsoDateStringSchema,
    revokedLicenseIds: zod_1.z.array(exports.LicenseIdSchema),
    revokedFingerprints: zod_1.z.array(zod_1.z.string().min(1).max(256)),
    nextExpectedAt: common_1.IsoDateStringSchema,
    sig: zod_1.z.string().min(1).max(16384),
})
    .strict();
// ---------------------------------------------------------------------------
// CRITICAL: Heartbeat request / response (spec §12.9)
// ---------------------------------------------------------------------------
/**
 * Heartbeat request sent by the on-premise backend to the licensing server.
 * Per spec §12.9; carries usage summary and fingerprint for verification.
 */
exports.HeartbeatRequestSchema = zod_1.z
    .object({
    licenseId: exports.LicenseIdSchema,
    deploymentId: exports.DeploymentIdSchema,
    fingerprintHash: zod_1.z.string().min(1).max(256),
    appVersion: zod_1.z.string().min(1).max(64),
    timestamp: common_1.IsoDateStringSchema,
    usageSummary: zod_1.z
        .object({
        activeUsers: zod_1.z.number().int().min(0),
        storageUsedBytes: common_1.ByteSizeSchema,
        documentCount: zod_1.z.number().int().min(0),
        aiCallsToday: zod_1.z.number().int().min(0),
    })
        .strict(),
    // Optional signature over the heartbeat payload by the installation key.
    signature: zod_1.z.string().min(1).max(8192).optional(),
})
    .strict();
/**
 * `z.infer<typeof HeartbeatResponseSchema>` MUST match `HeartbeatResponse`
 * from `@smart-edms/types`. The server may push an updated license
 * certificate in the response.
 */
exports.HeartbeatResponseSchema = zod_1.z
    .object({
    status: exports.HeartbeatStatusSchema,
    state: exports.LicenseStateSchema,
    serverTime: common_1.IsoDateStringSchema,
    updatedArtifact: exports.LicenseArtifactSchema.nullable(),
    entitlements: zod_1.z.array(exports.EntitlementModuleSchema),
    grace: zod_1.z
        .object({
        inGrace: zod_1.z.boolean(),
        graceEndsAt: common_1.IsoDateStringSchema.nullable(),
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
exports.ActivationRequestSchema = zod_1.z
    .object({
    licenseKey: zod_1.z.string().min(1).max(512),
    deploymentId: exports.DeploymentIdSchema,
    tenantId: tenant_1.TenantIdSchema.nullable().optional(),
    appVersion: zod_1.z.string().min(1).max(64),
    machineFingerprint: exports.InstallationFingerprintSchema,
    installationPublicKey: zod_1.z.string().min(1).max(8192),
    os: zod_1.z.string().min(1).max(64),
    arch: zod_1.z.string().min(1).max(64),
    contactEmail: zod_1.z.string().email().max(254).nullable().optional(),
    // Replay-protection nonce.
    nonce: zod_1.z.string().min(16).max(256),
})
    .strict();
/** Response body for online activation. */
exports.ActivationResponseSchema = zod_1.z
    .object({
    activationId: exports.ActivationIdSchema,
    licenseId: exports.LicenseIdSchema,
    status: exports.ActivationStatusSchema,
    artifact: exports.LicenseArtifactSchema,
    // Initial heartbeat schedule hint, in seconds.
    heartbeatIntervalSeconds: zod_1.z.number().int().min(60).max(86400),
    nextHeartbeatAt: common_1.IsoDateStringSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// License entity + LicenseLocalState
// ---------------------------------------------------------------------------
/** `z.infer` matches `License`. */
exports.LicenseSchema = zod_1.z
    .object({
    id: exports.LicenseIdSchema,
    customerId: exports.CustomerIdSchema,
    productId: exports.ProductIdSchema,
    planId: exports.PlanIdSchema,
    tenantId: tenant_1.TenantIdSchema.nullable(),
    type: exports.LicenseTypeSchema,
    environment: exports.LicenseEnvironmentSchema,
    status: exports.LicenseStatusSchema,
    signingKeyId: exports.SigningKeyIdSchema,
    version: zod_1.z.number().int().min(1),
    issuedAt: common_1.IsoDateStringSchema,
    startsAt: common_1.IsoDateStringSchema,
    expiresAt: common_1.IsoDateStringSchema.nullable(),
    gracePeriodDays: zod_1.z.number().int().min(0).max(3650),
    entitlements: zod_1.z.array(exports.EntitlementModuleSchema),
    aiEntitlements: zod_1.z.array(exports.AiAssistantEntitlementSchema),
    features: zod_1.z.array(exports.LicenseFeatureSchema),
    limits: exports.LicenseLimitSchema,
    offline: exports.LicenseOfflineSettingsSchema,
    supportLevel: zod_1.z.string().min(1).max(64),
    renewalCounter: zod_1.z.number().int().min(0),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    revokedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `LicenseLocalState`. */
exports.LicenseLocalStateSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    deploymentId: exports.DeploymentIdSchema,
    artifact: exports.LicenseArtifactSchema,
    state: exports.LicenseStateSchema,
    lastVerifiedAt: common_1.IsoDateStringSchema,
    lastHeartbeatAt: common_1.IsoDateStringSchema.nullable(),
    lastHeartbeatStatus: exports.HeartbeatStatusSchema,
    crlVersion: common_1.IsoDateStringSchema.nullable(),
    offlineGraceActive: zod_1.z.boolean(),
    monotonicCounter: zod_1.z.number().int().min(0),
})
    .strict();
// ---------------------------------------------------------------------------
// Customer / Product / Plan / Activation / Device entities
// ---------------------------------------------------------------------------
/** `z.infer` matches `Customer`. */
exports.CustomerSchema = zod_1.z
    .object({
    id: exports.CustomerIdSchema,
    legalName: zod_1.z.string().min(1).max(200),
    displayName: zod_1.z.string().min(1).max(200),
    industry: zod_1.z.string().min(1).max(128).nullable(),
    website: zod_1.z.string().url().max(512).nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    deletedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `Product`. */
exports.ProductSchema = zod_1.z
    .object({
    id: exports.ProductIdSchema,
    code: zod_1.z.string().min(1).max(64),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(0).max(2000).nullable(),
    version: zod_1.z.string().min(1).max(64),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `Plan`. */
exports.PlanSchema = zod_1.z
    .object({
    id: exports.PlanIdSchema,
    productId: exports.ProductIdSchema,
    code: zod_1.z.string().min(1).max(64),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(0).max(2000).nullable(),
    defaultEntitlements: zod_1.z.array(exports.EntitlementModuleSchema),
    defaultLimits: exports.LicenseLimitSchema,
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `Activation`. */
exports.ActivationSchema = zod_1.z
    .object({
    id: exports.ActivationIdSchema,
    licenseId: exports.LicenseIdSchema,
    deploymentId: exports.DeploymentIdSchema,
    status: exports.ActivationStatusSchema,
    activationCode: zod_1.z.string().min(1).max(256),
    fingerprint: exports.InstallationFingerprintSchema,
    activatedAt: common_1.IsoDateStringSchema,
    deactivatedAt: common_1.IsoDateStringSchema.nullable(),
    lastHeartbeatAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `Device`. */
exports.DeviceSchema = zod_1.z
    .object({
    id: exports.DeviceIdSchema,
    activationId: exports.ActivationIdSchema,
    licenseId: exports.LicenseIdSchema,
    displayName: zod_1.z.string().min(1).max(200),
    fingerprint: exports.InstallationFingerprintSchema,
    appVersion: zod_1.z.string().min(1).max(64),
    firstSeenAt: common_1.IsoDateStringSchema,
    lastSeenAt: common_1.IsoDateStringSchema,
    revokedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `Heartbeat` (persisted record). */
exports.HeartbeatSchema = zod_1.z
    .object({
    id: exports.HeartbeatIdSchema,
    licenseId: exports.LicenseIdSchema,
    deploymentId: exports.DeploymentIdSchema,
    fingerprintHash: zod_1.z.string().min(1).max(256),
    appVersion: zod_1.z.string().min(1).max(64),
    timestamp: common_1.IsoDateStringSchema,
    usageSummary: zod_1.z
        .object({
        activeUsers: zod_1.z.number().int().min(0),
        storageUsedBytes: common_1.ByteSizeSchema,
        documentCount: zod_1.z.number().int().min(0),
        aiCallsToday: zod_1.z.number().int().min(0),
    })
        .strict(),
    signature: zod_1.z.string().min(1).max(8192).nullable(),
    status: exports.HeartbeatStatusSchema,
})
    .strict();
/** `z.infer` matches `SigningKey`. */
exports.SigningKeySchema = zod_1.z
    .object({
    id: exports.SigningKeyIdSchema,
    kid: zod_1.z.string().min(1).max(256),
    algorithm: exports.LicenseSigningAlgorithmSchema,
    publicKey: zod_1.z.string().min(1).max(8192),
    kmsKeyId: zod_1.z.string().min(1).max(512),
    status: zod_1.z.enum(['active', 'rotating', 'retired', 'revoked']),
    createdAt: common_1.IsoDateStringSchema,
    rotatedAt: common_1.IsoDateStringSchema.nullable(),
    retiredAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `Revocation`. */
exports.RevocationSchema = zod_1.z
    .object({
    id: exports.RevocationIdSchema,
    licenseId: exports.LicenseIdSchema,
    reason: zod_1.z.string().min(1).max(2000),
    revokedBy: zod_1.z.string().min(1).max(200),
    revokedAt: common_1.IsoDateStringSchema,
    propagated: zod_1.z.boolean(),
})
    .strict();
//# sourceMappingURL=license.js.map