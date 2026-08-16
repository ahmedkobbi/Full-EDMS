/**
 * @smart-edms/license-core — cryptographic licensing core for Smart EDMS.
 *
 * This package implements the digital-signing primitives required to
 * issue, verify, revoke, and validate Smart EDMS license artifacts.
 * It is consumed by:
 *  - the licensing server (uses private-key signing functions);
 *  - the on-premise backend (uses public-key verification + state
 *    machine + heartbeat);
 *  - the Electron desktop client (uses public-key verification only).
 *
 * Spec sections implemented:
 *  - §4.3   — `.sedmslic`, `.sedmsreq`, `.sedmscrl` file formats
 *  - §4.4   — license state machine (6 states)
 *  - §12.4  — asymmetric signing, key IDs, CRL semantics
 *  - §12.5  — license payload canonicalization & signing
 *  - §12.6  — offline activation request format
 *  - §12.9  — heartbeat request/response signing
 *
 * Critical security invariants (spec §12.4):
 *  - The private key NEVER leaves the licensing server process. Only
 *    the public key is embedded in the on-premise backend and Electron
 *    client.
 *  - Signature verification fails closed on any error.
 *  - All signing inputs are canonicalised (RFC 8785-like) before
 *    signing so that the signature is stable across JSON serializers.
 *  - No external crypto libraries — Node.js `crypto` only.
 *
 * Module layout:
 *  - `canonicalize.ts`     — JSON canonicalization
 *  - `keys.ts`             — key pair generation, kid derivation
 *  - `sign.ts`             — sign/verify arbitrary payloads
 *  - `artifact.ts`         — `.sedmslic` build & verify
 *  - `offline-request.ts`  — `.sedmsreq` build & parse
 *  - `revocation-list.ts`  — `.sedmscrl` build, verify & query
 *  - `fingerprint.ts`      — privacy-aware machine fingerprint
 *  - `state-machine.ts`    — 6-state license state machine
 *  - `heartbeat.ts`        — heartbeat req/resp signing
 *  - `serialize.ts`        — file serialization helpers
 *  - `mime.ts`             — MIME type constants
 */

// Canonicalization
export {
  canonicalizeJson,
  canonicalizeBytes,
  CanonicalizationError,
} from './canonicalize.js';

// Keys
export {
  generateSigningKeyPair,
  deriveKeyId,
  algToSpecAlg,
  specAlgToAlg,
  type SigningAlg,
  type SigningKeyPair,
} from './keys.js';

// Sign / verify
export { signPayload, verifySignature } from './sign.js';

// License artifact (.sedmslic)
export {
  buildLicenseArtifact,
  verifyLicenseArtifact,
  LICENSE_ARTIFACT_VERSION,
} from './artifact.js';

// Offline activation request (.sedmsreq)
export {
  buildOfflineRequest,
  parseOfflineRequest,
  OFFLINE_REQUEST_VERSION,
  type OfflineRequestInput,
} from './offline-request.js';

// Revocation list (.sedmscrl)
export {
  buildRevocationList,
  verifyRevocationList,
  isRevoked,
  isFingerprintRevoked,
  REVOCATION_LIST_VERSION,
  type RevocationListInput,
} from './revocation-list.js';

// Machine fingerprint
export {
  computeMachineFingerprint,
  computeMachineFingerprintSync,
  buildInstallationFingerprint,
  generateNonce,
  DEFAULT_FINGERPRINT_SALT,
  type MachineFingerprint,
} from './fingerprint.js';

// License state machine (spec §4.4)
export {
  computeLicenseState,
  statePermitsRegularOps,
  statePermitsAdminRemediation,
  LICENSE_STATE_LABEL,
  DEFAULT_EXPIRING_SOON_WINDOW_DAYS,
  DEFAULT_HEARTBEAT_FAILURE_THRESHOLD,
  type LicenseStateInput,
} from './state-machine.js';

// Heartbeat (spec §12.9)
export {
  buildHeartbeatRequest,
  verifyHeartbeatRequest,
  buildHeartbeatResponse,
  verifyHeartbeatResponse,
  type HeartbeatRequest,
  type HeartbeatRequestInput,
  type SignedHeartbeatResponse,
} from './heartbeat.js';

// File serialization
export {
  serializeSedmslic,
  parseSedmslic,
  serializeSedmsreq,
  parseSedmsreq,
  serializeSedmscrl,
  parseSedmscrl,
} from './serialize.js';

// MIME constants
export {
  SEDMSLIC_MIME,
  SEDMSREQ_MIME,
  SEDMSCRL_MIME,
  SEDMS_EXTENSIONS,
  SEDMS_MIME_EXT,
} from './mime.js';

// ── Enterprise-grade hardening modules ─────────────────────────────

// KEK-wrapped public key (key encryption at rest)
export {
  deriveKek,
  wrapPublicKey,
  unwrapPublicKey,
  verifyWrappedPublicKey,
  type WrappedPublicKey,
} from './kek.js';

// Runtime integrity verification (detect binary patching)
export {
  hashFile,
  computeIntegrityBaseline,
  verifyIntegrity,
  checkFileMtime,
  CRITICAL_LICENSE_FILES,
  type IntegrityEntry,
  type IntegrityCheckResult,
} from './integrity.js';

// Clock skew detection (prevent clock rollback)
export {
  checkClockSkew,
  updateMaxObservedTimestamp,
  MonotonicClockTracker,
  type ClockSkewResult,
} from './clock-skew.js';

// License payload encryption at rest (prevent DB tampering)
export {
  encryptPayload,
  decryptPayload,
  serializeEncryptedPayload,
  deserializeEncryptedPayload,
  type EncryptedPayload,
} from './payload-cipher.js';

// ── Anti-tamper & anti-reverse-engineering ─────────────────────────

// Anti-debugging, environment tampering detection, public key pinning,
// module integrity, self-defending functions, VM detection, and
// constant-time comparisons. Covers all cracking techniques 2010-2026.
export {
  detectDebugging,
  detectEnvTampering,
  verifyPublicKeyPin,
  hashDirectory,
  hashFunction,
  verifyFunctionIntegrity,
  snapshotRequireCache,
  checkRequireCache,
  detectVirtualization,
  safeEqual,
  verifyFunctionSource,
  runSecurityChecks,
  type AntiDebugResult,
  type SecurityCheckResult,
} from './anti-tamper.js';
