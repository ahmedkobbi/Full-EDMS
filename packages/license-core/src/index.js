"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEDMS_MIME_EXT = exports.SEDMS_EXTENSIONS = exports.SEDMSCRL_MIME = exports.SEDMSREQ_MIME = exports.SEDMSLIC_MIME = exports.parseSedmscrl = exports.serializeSedmscrl = exports.parseSedmsreq = exports.serializeSedmsreq = exports.parseSedmslic = exports.serializeSedmslic = exports.verifyHeartbeatResponse = exports.buildHeartbeatResponse = exports.verifyHeartbeatRequest = exports.buildHeartbeatRequest = exports.DEFAULT_HEARTBEAT_FAILURE_THRESHOLD = exports.DEFAULT_EXPIRING_SOON_WINDOW_DAYS = exports.LICENSE_STATE_LABEL = exports.statePermitsAdminRemediation = exports.statePermitsRegularOps = exports.computeLicenseState = exports.DEFAULT_FINGERPRINT_SALT = exports.generateNonce = exports.buildInstallationFingerprint = exports.computeMachineFingerprintSync = exports.computeMachineFingerprint = exports.REVOCATION_LIST_VERSION = exports.isFingerprintRevoked = exports.isRevoked = exports.verifyRevocationList = exports.buildRevocationList = exports.OFFLINE_REQUEST_VERSION = exports.parseOfflineRequest = exports.buildOfflineRequest = exports.LICENSE_ARTIFACT_VERSION = exports.verifyLicenseArtifact = exports.buildLicenseArtifact = exports.verifySignature = exports.signPayload = exports.specAlgToAlg = exports.algToSpecAlg = exports.deriveKeyId = exports.generateSigningKeyPair = exports.CanonicalizationError = exports.canonicalizeBytes = exports.canonicalizeJson = void 0;
// Canonicalization
var canonicalize_js_1 = require("./canonicalize.js");
Object.defineProperty(exports, "canonicalizeJson", { enumerable: true, get: function () { return canonicalize_js_1.canonicalizeJson; } });
Object.defineProperty(exports, "canonicalizeBytes", { enumerable: true, get: function () { return canonicalize_js_1.canonicalizeBytes; } });
Object.defineProperty(exports, "CanonicalizationError", { enumerable: true, get: function () { return canonicalize_js_1.CanonicalizationError; } });
// Keys
var keys_js_1 = require("./keys.js");
Object.defineProperty(exports, "generateSigningKeyPair", { enumerable: true, get: function () { return keys_js_1.generateSigningKeyPair; } });
Object.defineProperty(exports, "deriveKeyId", { enumerable: true, get: function () { return keys_js_1.deriveKeyId; } });
Object.defineProperty(exports, "algToSpecAlg", { enumerable: true, get: function () { return keys_js_1.algToSpecAlg; } });
Object.defineProperty(exports, "specAlgToAlg", { enumerable: true, get: function () { return keys_js_1.specAlgToAlg; } });
// Sign / verify
var sign_js_1 = require("./sign.js");
Object.defineProperty(exports, "signPayload", { enumerable: true, get: function () { return sign_js_1.signPayload; } });
Object.defineProperty(exports, "verifySignature", { enumerable: true, get: function () { return sign_js_1.verifySignature; } });
// License artifact (.sedmslic)
var artifact_js_1 = require("./artifact.js");
Object.defineProperty(exports, "buildLicenseArtifact", { enumerable: true, get: function () { return artifact_js_1.buildLicenseArtifact; } });
Object.defineProperty(exports, "verifyLicenseArtifact", { enumerable: true, get: function () { return artifact_js_1.verifyLicenseArtifact; } });
Object.defineProperty(exports, "LICENSE_ARTIFACT_VERSION", { enumerable: true, get: function () { return artifact_js_1.LICENSE_ARTIFACT_VERSION; } });
// Offline activation request (.sedmsreq)
var offline_request_js_1 = require("./offline-request.js");
Object.defineProperty(exports, "buildOfflineRequest", { enumerable: true, get: function () { return offline_request_js_1.buildOfflineRequest; } });
Object.defineProperty(exports, "parseOfflineRequest", { enumerable: true, get: function () { return offline_request_js_1.parseOfflineRequest; } });
Object.defineProperty(exports, "OFFLINE_REQUEST_VERSION", { enumerable: true, get: function () { return offline_request_js_1.OFFLINE_REQUEST_VERSION; } });
// Revocation list (.sedmscrl)
var revocation_list_js_1 = require("./revocation-list.js");
Object.defineProperty(exports, "buildRevocationList", { enumerable: true, get: function () { return revocation_list_js_1.buildRevocationList; } });
Object.defineProperty(exports, "verifyRevocationList", { enumerable: true, get: function () { return revocation_list_js_1.verifyRevocationList; } });
Object.defineProperty(exports, "isRevoked", { enumerable: true, get: function () { return revocation_list_js_1.isRevoked; } });
Object.defineProperty(exports, "isFingerprintRevoked", { enumerable: true, get: function () { return revocation_list_js_1.isFingerprintRevoked; } });
Object.defineProperty(exports, "REVOCATION_LIST_VERSION", { enumerable: true, get: function () { return revocation_list_js_1.REVOCATION_LIST_VERSION; } });
// Machine fingerprint
var fingerprint_js_1 = require("./fingerprint.js");
Object.defineProperty(exports, "computeMachineFingerprint", { enumerable: true, get: function () { return fingerprint_js_1.computeMachineFingerprint; } });
Object.defineProperty(exports, "computeMachineFingerprintSync", { enumerable: true, get: function () { return fingerprint_js_1.computeMachineFingerprintSync; } });
Object.defineProperty(exports, "buildInstallationFingerprint", { enumerable: true, get: function () { return fingerprint_js_1.buildInstallationFingerprint; } });
Object.defineProperty(exports, "generateNonce", { enumerable: true, get: function () { return fingerprint_js_1.generateNonce; } });
Object.defineProperty(exports, "DEFAULT_FINGERPRINT_SALT", { enumerable: true, get: function () { return fingerprint_js_1.DEFAULT_FINGERPRINT_SALT; } });
// License state machine (spec §4.4)
var state_machine_js_1 = require("./state-machine.js");
Object.defineProperty(exports, "computeLicenseState", { enumerable: true, get: function () { return state_machine_js_1.computeLicenseState; } });
Object.defineProperty(exports, "statePermitsRegularOps", { enumerable: true, get: function () { return state_machine_js_1.statePermitsRegularOps; } });
Object.defineProperty(exports, "statePermitsAdminRemediation", { enumerable: true, get: function () { return state_machine_js_1.statePermitsAdminRemediation; } });
Object.defineProperty(exports, "LICENSE_STATE_LABEL", { enumerable: true, get: function () { return state_machine_js_1.LICENSE_STATE_LABEL; } });
Object.defineProperty(exports, "DEFAULT_EXPIRING_SOON_WINDOW_DAYS", { enumerable: true, get: function () { return state_machine_js_1.DEFAULT_EXPIRING_SOON_WINDOW_DAYS; } });
Object.defineProperty(exports, "DEFAULT_HEARTBEAT_FAILURE_THRESHOLD", { enumerable: true, get: function () { return state_machine_js_1.DEFAULT_HEARTBEAT_FAILURE_THRESHOLD; } });
// Heartbeat (spec §12.9)
var heartbeat_js_1 = require("./heartbeat.js");
Object.defineProperty(exports, "buildHeartbeatRequest", { enumerable: true, get: function () { return heartbeat_js_1.buildHeartbeatRequest; } });
Object.defineProperty(exports, "verifyHeartbeatRequest", { enumerable: true, get: function () { return heartbeat_js_1.verifyHeartbeatRequest; } });
Object.defineProperty(exports, "buildHeartbeatResponse", { enumerable: true, get: function () { return heartbeat_js_1.buildHeartbeatResponse; } });
Object.defineProperty(exports, "verifyHeartbeatResponse", { enumerable: true, get: function () { return heartbeat_js_1.verifyHeartbeatResponse; } });
// File serialization
var serialize_js_1 = require("./serialize.js");
Object.defineProperty(exports, "serializeSedmslic", { enumerable: true, get: function () { return serialize_js_1.serializeSedmslic; } });
Object.defineProperty(exports, "parseSedmslic", { enumerable: true, get: function () { return serialize_js_1.parseSedmslic; } });
Object.defineProperty(exports, "serializeSedmsreq", { enumerable: true, get: function () { return serialize_js_1.serializeSedmsreq; } });
Object.defineProperty(exports, "parseSedmsreq", { enumerable: true, get: function () { return serialize_js_1.parseSedmsreq; } });
Object.defineProperty(exports, "serializeSedmscrl", { enumerable: true, get: function () { return serialize_js_1.serializeSedmscrl; } });
Object.defineProperty(exports, "parseSedmscrl", { enumerable: true, get: function () { return serialize_js_1.parseSedmscrl; } });
// MIME constants
var mime_js_1 = require("./mime.js");
Object.defineProperty(exports, "SEDMSLIC_MIME", { enumerable: true, get: function () { return mime_js_1.SEDMSLIC_MIME; } });
Object.defineProperty(exports, "SEDMSREQ_MIME", { enumerable: true, get: function () { return mime_js_1.SEDMSREQ_MIME; } });
Object.defineProperty(exports, "SEDMSCRL_MIME", { enumerable: true, get: function () { return mime_js_1.SEDMSCRL_MIME; } });
Object.defineProperty(exports, "SEDMS_EXTENSIONS", { enumerable: true, get: function () { return mime_js_1.SEDMS_EXTENSIONS; } });
Object.defineProperty(exports, "SEDMS_MIME_EXT", { enumerable: true, get: function () { return mime_js_1.SEDMS_MIME_EXT; } });
//# sourceMappingURL=index.js.map