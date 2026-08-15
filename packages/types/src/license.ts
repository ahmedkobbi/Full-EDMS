/**
 * @smart-edms/types — licensing system (spec §12, §15.2)
 *
 * Purpose: model the full licensing server entity graph (Customer, Contact,
 * Product, Plan, License, Activation, Device, Heartbeat, etc.) plus the
 * signed license artifact formats (`.sedmslic`, `.sedmsreq`, `.sedmscrl`),
 * signing keys, license environments, and the full entitlement-module list.
 *
 * Critical rules (spec §12.4):
 *  - License artifacts are digitally signed with asymmetric cryptography.
 *  - The private key never leaves the KMS/HSM.
 *  - Signature verification fails closed.
 *  - The public key is embedded in on-premise backend and Electron client.
 */

import type { ByteSize, ISODateString, UUID } from './common';
import type { TenantId } from './tenant';

// ---------------------------------------------------------------------------
// Identifiers (branded)
// ---------------------------------------------------------------------------

/** Branded customer identifier. */
export type CustomerId = UUID

/** Branded contact identifier. */
export type ContactId = UUID

/** Branded product identifier. */
export type ProductId = UUID

/** Branded plan identifier. */
export type PlanId = UUID

/** Branded license identifier. */
export type LicenseId = UUID

/** Branded activation identifier. */
export type ActivationId = UUID

/** Branded device identifier. */
export type DeviceId = UUID

/** Branded heartbeat identifier. */
export type HeartbeatId = UUID

/** Branded revocation identifier. */
export type RevocationId = UUID

/** Branded signing-key identifier. */
export type SigningKeyId = UUID

/** Branded deployment identifier. */
export type DeploymentId = UUID

/** Branded offline-activation-request identifier. */
export type OfflineActivationRequestId = UUID;

/** Branded offline-activation-certificate identifier. */
export type OfflineActivationCertificateId = UUID;

/** Branded trial identifier. */
export type TrialId = UUID

/** Branded webhook identifier. */
export type WebhookId = UUID

/** Branded API-key identifier. */
export type ApiKeyId = UUID

/** Branded usage-metric identifier. */
export type UsageMetricId = UUID

/** Branded license-audit-log identifier. */
export type LicenseAuditLogId = UUID

// ---------------------------------------------------------------------------
// License types and statuses (spec §12.2)
// ---------------------------------------------------------------------------

/** License types supported by the licensing server (spec §12.2). */
export type LicenseType =
  | 'trial'
  | 'subscription'
  | 'perpetual_with_maintenance'
  | 'enterprise_on_premise'
  | 'offline_air_gapped'
  | 'evaluation'
  | 'partner_reseller';

/**
 * License environment (spec §12.3). Embedded in the signed license payload;
 * verification checks this against the deployment.
 */
export type LicenseEnvironment = 'production' | 'staging' | 'trial';

/**
 * Lifecycle status of a license. Distinct from `LicenseState`, which is the
 * *derived* runtime state computed from expiry, grace, and revocation.
 */
export type LicenseStatus =
  | 'draft'
  | 'pending_activation'
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'expired'
  | 'cancelled';

/**
 * Derived runtime state of a license, computed by the on-premise backend
 * from the signed payload, grace period, revocation list, and heartbeat
 * status. This is the canonical state used by every license-aware code path.
 *
 *  - `valid`: license is signed, not expired, not revoked, heartbeat healthy.
 *  - `expiring_soon`: within the configured warning window before expiry.
 *  - `expired_grace`: past expiry but within the grace period.
 *  - `grace_exhausted`: past expiry and grace period exhausted.
 *  - `extended_remediation`: degraded mode allowing admin remediation.
 *  - `invalid`: signature failed, revoked, or otherwise not usable.
 */
export type LicenseState =
  | 'valid'
  | 'expiring_soon'
  | 'expired_grace'
  | 'grace_exhausted'
  | 'extended_remediation'
  | 'invalid';

/**
 * Activation status of a deployment against a license.
 */
export type ActivationStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'expired';

/**
 * Heartbeat status returned by the licensing server (spec §12.9).
 */
export type HeartbeatStatus =
  | 'healthy'
  | 'degraded'
  | 'offline_grace'
  | 'revoked'
  | 'unknown';

// ---------------------------------------------------------------------------
// Entitlement modules (spec §12.3 — full list)
// ---------------------------------------------------------------------------

/**
 * Entitlement modules (spec §12.3). Each module gates a feature surface.
 * The list is the canonical set used by `LicensePayload.entitlements` and
 * by tenant feature-flag derivation.
 */
export type EntitlementModule =
  | 'core-edms'
  | 'ocr'
  | 'omr'
  | 'icr'
  | 'bpmn'
  | 'cmmn'
  | 'dmn'
  | 'ai-assist'
  | 'ai-assistant'
  | 'c2pa-provenance'
  | 'dlp'
  | 'advanced-search'
  | 'hybrid-sync'
  | 'crisis-room'
  | 'physical-digital-twin'
  | '3d-knowledge-graph'
  | 'electron-desktop'
  | 'mobile-access'
  | 'audit-export'
  | 'compliance-export'
  | 'scanner-agent'
  | 'guided-tour-analytics';

/**
 * AI Assistant sub-entitlements (spec §11.16). Gated by the
 * `ai-assistant` parent module.
 */
export type AiAssistantEntitlement =
  | 'ai-assistant-read'
  | 'ai-assistant-actions'
  | 'ai-assistant-external-provider'
  | 'ai-assistant-local-model'
  | 'ai-assistant-analytics';

// ---------------------------------------------------------------------------
// License server entities (spec §15.2)
// ---------------------------------------------------------------------------

/** Customer organisation record on the licensing server. */
export interface Customer {
  readonly id: CustomerId;
  readonly legalName: string;
  readonly displayName: string;
  readonly industry: string | null;
  readonly website: string | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt: ISODateString | null;
}

/** Contact person at a customer. */
export interface Contact {
  readonly id: ContactId;
  readonly customerId: CustomerId;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly role: string | null;
  readonly primary: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/** Product offered by the licensing server. */
export interface Product {
  readonly id: ProductId;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  /** Current product version stamp embedded in license payloads. */
  readonly version: string;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/** Plan within a product; defines default entitlements and limits. */
export interface Plan {
  readonly id: PlanId;
  readonly productId: ProductId;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  /** Default entitlements included by this plan. */
  readonly defaultEntitlements: readonly EntitlementModule[];
  /** Default limits applied at license creation. */
  readonly defaultLimits: LicenseLimit;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * License feature flag. A boolean or limited-value toggle carried in the
 * signed license payload.
 */
export interface LicenseFeature {
  readonly code: string;
  readonly value: string | number | boolean;
  readonly descriptionKey: string | null;
}

/**
 * License quantitative limit. All numeric limits are non-negative integers;
 * `null` means unlimited.
 */
export interface LicenseLimit {
  readonly maxUsers: number | null;
  readonly maxDevices: number | null;
  readonly maxStorageBytes: ByteSize | null;
  readonly maxDocuments: number | null;
  readonly aiMonthlyQuota: number | null;
  readonly aiDailyQuotaPerUser: number | null;
}

/**
 * Offline-mode settings carried in the signed license payload.
 */
export interface LicenseOfflineSettings {
  readonly offlineAllowed: boolean;
  readonly maxOfflineDays: number;
  /** Whether hybrid sync (online + offline) is permitted. */
  readonly hybridSyncAllowed: boolean;
}

/**
 * Installation / device fingerprint bound to a license activation (spec §12.5).
 * Verification checks this against the deployment (spec §12.4).
 * Distinct from the user-typed `DeviceFingerprint` branded string.
 */
export interface InstallationFingerprint {
  readonly fingerprintHash: string;
  readonly machineId: string | null;
  readonly os: string;
  readonly arch: string;
  /** Optional hardware attestation blob (TPM / Secure Enclave). */
  readonly attestation: string | null;
}

/**
 * Top-level License entity on the licensing server. The signed payload
 * (`.sedmslic`) is derived from this record (see `LicensePayload`).
 */
export interface License {
  readonly id: LicenseId;
  readonly customerId: CustomerId;
  readonly productId: ProductId;
  readonly planId: PlanId;
  /** Optional tenant binding (null for licenses not yet activated). */
  readonly tenantId: TenantId | null;
  readonly type: LicenseType;
  readonly environment: LicenseEnvironment;
  readonly status: LicenseStatus;
  readonly signingKeyId: SigningKeyId;
  /** License payload version (spec §12.3). */
  readonly version: number;
  readonly issuedAt: ISODateString;
  readonly startsAt: ISODateString;
  readonly expiresAt: ISODateString | null;
  readonly gracePeriodDays: number;
  readonly entitlements: readonly EntitlementModule[];
  readonly aiEntitlements: readonly AiAssistantEntitlement[];
  readonly features: readonly LicenseFeature[];
  readonly limits: LicenseLimit;
  readonly offline: LicenseOfflineSettings;
  readonly supportLevel: string;
  /** Monotonic counter incremented on each renewal (spec §12.5). */
  readonly renewalCounter: number;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly revokedAt: ISODateString | null;
}

/**
 * Activation record. Tracks which deployment has activated a license.
 */
export interface Activation {
  readonly id: ActivationId;
  readonly licenseId: LicenseId;
  readonly deploymentId: DeploymentId;
  readonly status: ActivationStatus;
  readonly activationCode: string;
  readonly fingerprint: InstallationFingerprint;
  readonly activatedAt: ISODateString;
  readonly deactivatedAt: ISODateString | null;
  readonly lastHeartbeatAt: ISODateString | null;
}

/**
 * Device record on the licensing server. Subject to `maxDevices` limit
 * (spec §12.3).
 */
export interface Device {
  readonly id: DeviceId;
  readonly activationId: ActivationId;
  readonly licenseId: LicenseId;
  readonly displayName: string;
  readonly fingerprint: InstallationFingerprint;
  readonly appVersion: string;
  readonly firstSeenAt: ISODateString;
  readonly lastSeenAt: ISODateString;
  readonly revokedAt: ISODateString | null;
}

/**
 * Heartbeat record (spec §12.9). Online heartbeat is sent periodically;
 * repeated failures trigger offline grace rules.
 */
export interface Heartbeat {
  readonly id: HeartbeatId;
  readonly licenseId: LicenseId;
  readonly deploymentId: DeploymentId;
  readonly fingerprintHash: string;
  readonly appVersion: string;
  readonly timestamp: ISODateString;
  /** Usage summary sent in the heartbeat. */
  readonly usageSummary: {
    readonly activeUsers: number;
    readonly storageUsedBytes: ByteSize;
    readonly documentCount: number;
    readonly aiCallsToday: number;
  };
  /** Optional signature over the heartbeat payload. */
  readonly signature: string | null;
  readonly status: HeartbeatStatus;
}

/**
 * Usage metric recorded on the licensing server for billing / dashboards.
 */
export interface UsageMetric {
  readonly id: UsageMetricId;
  readonly licenseId: LicenseId;
  readonly deploymentId: DeploymentId;
  readonly metricKey: string;
  readonly value: number;
  readonly recordedAt: ISODateString;
}

/**
 * Revocation entry. Mirrors the `.sedmscrl` revocation list (spec §12.4).
 */
export interface Revocation {
  readonly id: RevocationId;
  readonly licenseId: LicenseId;
  readonly reason: string;
  readonly revokedBy: string;
  readonly revokedAt: ISODateString;
  /** Whether the revocation is globally propagated to all deployments. */
  readonly propagated: boolean;
}

/** Trial license record. */
export interface Trial {
  readonly id: TrialId;
  readonly licenseId: LicenseId;
  readonly customerId: CustomerId;
  readonly productId: ProductId;
  readonly startedAt: ISODateString;
  readonly endsAt: ISODateString;
  readonly convertedToLicenseId: LicenseId | null;
}

/**
 * Webhook configuration on the licensing server.
 */
export interface Webhook {
  readonly id: WebhookId;
  readonly customerId: CustomerId;
  readonly url: string;
  /** Event kinds the webhook subscribes to. */
  readonly events: readonly string[];
  /** HMAC secret (hashed at rest; never returned by the API). */
  readonly secretHash: string;
  readonly enabled: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * API key for licensing-server programmatic access.
 */
export interface ApiKey {
  readonly id: ApiKeyId;
  readonly customerId: CustomerId;
  readonly name: string;
  /** Hashed key; the raw key is shown only once at creation time. */
  readonly keyHash: string;
  readonly scopes: readonly string[];
  readonly lastUsedAt: ISODateString | null;
  readonly expiresAt: ISODateString | null;
  readonly revokedAt: ISODateString | null;
  readonly createdAt: ISODateString;
}

/**
 * License-server audit log entry. Distinct from EDMS `AuditEvent` because
 * the licensing server is a separate service (spec §12.1, §15.2).
 */
export interface LicenseAuditLog {
  readonly id: LicenseAuditLogId;
  readonly actor: string;
  readonly action: string;
  readonly licenseId: LicenseId | null;
  readonly customerId: CustomerId | null;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: ISODateString;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

// ---------------------------------------------------------------------------
// Signing keys (spec §12.4)
// ---------------------------------------------------------------------------

/** Signing algorithm used for license artifacts. */
export type LicenseSigningAlgorithm = 'ed25519' | 'rsa-pss-sha256' | 'ecdsa-p256-sha256';

/**
 * Signing-key metadata. The private key never leaves the KMS/HSM; only its
 * identifier is stored here.
 */
export interface SigningKey {
  readonly id: SigningKeyId;
  /** Key identifier embedded in the license payload (spec §12.4 / §12.5). */
  readonly kid: string;
  readonly algorithm: LicenseSigningAlgorithm;
  /** Public key in PEM or JWK form. */
  readonly publicKey: string;
  /** KMS/HSM key identifier; never the private key material. */
  readonly kmsKeyId: string;
  readonly status: 'active' | 'rotating' | 'retired' | 'revoked';
  readonly createdAt: ISODateString;
  readonly rotatedAt: ISODateString | null;
  readonly retiredAt: ISODateString | null;
}

// ---------------------------------------------------------------------------
// Signed license artifact: `.sedmslic` (spec §12.5)
// ---------------------------------------------------------------------------

/**
 * Canonical license payload embedded in a `.sedmslic` file (spec §12.5).
 * The payload is canonicalised before signing; the signature covers the
 * canonical bytes only.
 */
export interface LicensePayload {
  readonly v: number;
  readonly licenseId: LicenseId;
  readonly customerId: CustomerId;
  readonly productId: ProductId;
  readonly planId: PlanId;
  readonly deploymentId: DeploymentId;
  readonly tenantId: TenantId | null;
  readonly environment: LicenseEnvironment;
  readonly issuedAt: ISODateString;
  readonly expiresAt: ISODateString | null;
  readonly gracePeriodDays: number;
  readonly offline: LicenseOfflineSettings;
  readonly fingerprint: InstallationFingerprint;
  readonly entitlements: readonly EntitlementModule[];
  readonly aiEntitlements: readonly AiAssistantEntitlement[];
  readonly limits: LicenseLimit;
  readonly features: readonly LicenseFeature[];
  readonly renewalCounter: number;
}

/**
 * The `.sedmslic` signed artifact (spec §12.5). Structure:
 *   v, type: "sedms.license", alg, kid, payload, sig
 */
export interface LicenseArtifact {
  /** Artifact schema version. */
  readonly v: number;
  readonly type: 'sedms.license';
  readonly alg: LicenseSigningAlgorithm;
  readonly kid: string;
  readonly payload: LicensePayload;
  /** Base64-encoded signature over the canonicalised `payload`. */
  readonly sig: string;
}

// ---------------------------------------------------------------------------
// Offline activation request: `.sedmsreq` (spec §12.6)
// ---------------------------------------------------------------------------

/**
 * The `.sedmsreq` file generated by the on-premise backend for offline
 * activation (spec §12.6).
 */
export interface OfflineRequest {
  readonly v: number;
  readonly type: 'sedms.request';
  readonly requestId: OfflineActivationRequestId;
  readonly productId: ProductId;
  readonly deploymentId: DeploymentId;
  readonly appVersion: string;
  readonly generatedAt: ISODateString;
  readonly machineFingerprint: InstallationFingerprint;
  /** Installation public key or installation key fingerprint. */
  readonly installationPublicKey: string;
  readonly os: string;
  readonly arch: string;
  readonly contactEmail: string | null;
  /** Single-use nonce to prevent replay. */
  readonly nonce: string;
}

// ---------------------------------------------------------------------------
// Revocation list: `.sedmscrl` (spec §12.4)
// ---------------------------------------------------------------------------

/**
 * The `.sedmscrl` certificate revocation list (spec §12.4). The on-premise
 * backend fetches this list when online and checks revocation state during
 * signature verification.
 */
export interface RevocationList {
  readonly v: number;
  readonly type: 'sedms.crl';
  readonly kid: string;
  readonly generatedAt: ISODateString;
  /** List of revoked license ids. */
  readonly revokedLicenseIds: readonly LicenseId[];
  /** List of revoked device fingerprints. */
  readonly revokedFingerprints: readonly string[];
  /** Next-scheduled generation time, for cache TTL. */
  readonly nextExpectedAt: ISODateString;
  /** Signature over the canonical list payload. */
  readonly sig: string;
}

// ---------------------------------------------------------------------------
// Offline activation request and certificate entities (spec §15.2)
// ---------------------------------------------------------------------------

/**
 * Persisted offline-activation-request record on the licensing server.
 */
export interface OfflineActivationRequest {
  readonly id: OfflineActivationRequestId;
  readonly productId: ProductId;
  readonly deploymentId: DeploymentId;
  readonly machineFingerprint: InstallationFingerprint;
  readonly installationPublicKey: string;
  readonly appVersion: string;
  readonly os: string;
  readonly arch: string;
  readonly contactEmail: string | null;
  readonly nonce: string;
  readonly status: 'pending' | 'approved' | 'rejected' | 'expired';
  readonly receivedAt: ISODateString;
  readonly processedAt: ISODateString | null;
  readonly processedBy: string | null;
}

/**
 * Persisted offline-activation-certificate record on the licensing server.
 * The certificate is the issued `.sedmslic` plus metadata about its
 * generation. Returned to the operator for download.
 */
export interface OfflineActivationCertificate {
  readonly id: OfflineActivationCertificateId;
  readonly requestId: OfflineActivationRequestId;
  readonly licenseId: LicenseId;
  readonly artifact: LicenseArtifact;
  readonly issuedAt: ISODateString;
  readonly issuedBy: string;
  readonly downloadedAt: ISODateString | null;
}

// ---------------------------------------------------------------------------
// Local license state on the on-premise backend (spec §15.1)
// ---------------------------------------------------------------------------

/**
 * Local license state cached on the on-premise backend. Updated by
 * heartbeat responses (spec §12.9) and by offline `.sedmslic` import.
 */
export interface LicenseLocalState {
  readonly tenantId: TenantId;
  readonly deploymentId: DeploymentId;
  readonly artifact: LicenseArtifact;
  /** Derived runtime state (spec §12.3). */
  readonly state: LicenseState;
  readonly lastVerifiedAt: ISODateString;
  readonly lastHeartbeatAt: ISODateString | null;
  readonly lastHeartbeatStatus: HeartbeatStatus;
  /** Latest known revocation list version. */
  readonly crlVersion: ISODateString | null;
  /** Whether the system is currently operating in offline grace. */
  readonly offlineGraceActive: boolean;
  /** Monotonic counter used for clock-rollback mitigation (spec §12.9). */
  readonly monotonicCounter: number;
}

/**
 * Heartbeat response payload (spec §12.9). The server may push an updated
 * license certificate in the response.
 */
export interface HeartbeatResponse {
  readonly status: HeartbeatStatus;
  readonly state: LicenseState;
  readonly serverTime: ISODateString;
  /** Optional updated license certificate pushed by the server. */
  readonly updatedArtifact: LicenseArtifact | null;
  /** Refreshed entitlements (in case of mid-cycle plan change). */
  readonly entitlements: readonly EntitlementModule[];
  readonly grace: {
    readonly inGrace: boolean;
    readonly graceEndsAt: ISODateString | null;
  };
}
