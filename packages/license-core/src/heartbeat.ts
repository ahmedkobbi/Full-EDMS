/**
 * @smart-edms/license-core — heartbeat request/response signing (spec §12.9)
 *
 * Purpose: build signed heartbeat requests on the on-premise side and
 * verify signed heartbeat responses received from the licensing server.
 *
 * Wire format (spec §12.9):
 *
 *   Request (on-premise → licensing server):
 *     {
 *       licenseId, deploymentId, fingerprintHash, appVersion, timestamp,
 *       usageSummary: { activeUsers, storageUsedBytes, documentCount, aiCallsToday },
 *       signature?: "<base64 sig over canonicalizeJson(rest) by installation key>"
 *     }
 *
 *   Response (licensing server → on-premise):
 *     HeartbeatResponse + { sig: "<base64 sig over canonicalizeJson(response) by server key>" }
 *
 * Note: the `HeartbeatResponse` type in `@smart-edms/types` does not
 * include a `sig` field. This package extends it locally as
 * {@link SignedHeartbeatResponse} to carry the server's signature. The
 * licensing server's API layer is responsible for adding `sig` to the
 * response body before transmission; the on-premise backend uses
 * `verifyHeartbeatResponse()` to check it.
 *
 * Critical rules (spec §12.9):
 *  - The request signature is OPTIONAL. If present, the licensing server
 *    verifies it against the `installationPublicKey` registered for the
 *    activation; mismatches are logged but do not reject the heartbeat
 *    (the server may treat the heartbeat as unauthenticated, with
 *    reduced trust).
 *  - The response signature is REQUIRED for production deployments. An
 *    unsigned response is acceptable only in development (the
 *    `NODE_ENV=development` check is the licensing server's
 *    responsibility, not this package's).
 *  - Fail-closed: `verifyHeartbeatResponse()` returns `false` on any
 *    verification error.
 */

import type {
  DeploymentId,
  EntitlementModule,
  HeartbeatResponse,
  ISODateString,
  LicenseId,
} from '@smart-edms/types';
import { signPayload, verifySignature } from './sign.js';
import { type SigningAlg } from './keys.js';

/**
 * Wire-format heartbeat request sent from the on-premise backend to the
 * licensing server (spec §12.9). The `signature` field is OPTIONAL —
 * if present, it is the base64-encoded signature of
 * `canonicalizeJson({ licenseId, deploymentId, fingerprintHash,
 * appVersion, timestamp, usageSummary })` made with the installation
 * private key.
 */
export interface HeartbeatRequest {
  readonly licenseId: LicenseId;
  readonly deploymentId: DeploymentId;
  readonly fingerprintHash: string;
  readonly appVersion: string;
  readonly timestamp: ISODateString;
  readonly usageSummary: {
    readonly activeUsers: number;
    readonly storageUsedBytes: number;
    readonly documentCount: number;
    readonly aiCallsToday: number;
  };
  readonly signature?: string;
}

/**
 * Input to {@link buildHeartbeatRequest}. The caller supplies the raw
 * fields (no signature); the function adds the signature if an
 * installation private key is provided.
 */
export interface HeartbeatRequestInput {
  readonly licenseId: LicenseId;
  readonly deploymentId: DeploymentId;
  readonly fingerprintHash: string;
  readonly appVersion: string;
  readonly timestamp: ISODateString;
  readonly usageSummary: {
    readonly activeUsers: number;
    readonly storageUsedBytes: number;
    readonly documentCount: number;
    readonly aiCallsToday: number;
  };
}

/**
 * A `HeartbeatResponse` augmented with the licensing server's signature.
 * The `sig` field is the base64-encoded signature of
 * `canonicalizeJson(response)` (excluding the `sig` field itself) made
 * with the licensing server's private key.
 */
export type SignedHeartbeatResponse = HeartbeatResponse & {
  readonly sig: string;
};

/**
 * Build a heartbeat request, optionally signing it with the installation
 * private key.
 *
 * @param input - the raw heartbeat fields.
 * @param installationPrivateKeyPem - PKCS#8 PEM-encoded installation
 *   private key. If provided, the request is signed and `signature` is
 *   populated. If `null`/`undefined`, the request is sent unsigned.
 * @param alg - signing algorithm for the installation key. Required
 *   only if `installationPrivateKeyPem` is provided.
 * @returns the `HeartbeatRequest` (with `signature` if signed).
 */
export function buildHeartbeatRequest(
  input: HeartbeatRequestInput,
  installationPrivateKeyPem?: string | null,
  alg?: SigningAlg,
): HeartbeatRequest {
  if (!installationPrivateKeyPem) {
    return { ...input };
  }
  if (!alg) {
    throw new Error('buildHeartbeatRequest: alg is required when installationPrivateKeyPem is provided');
  }
  // The signature covers the canonicalised request body EXCLUDING the
  // `signature` field (which would be self-referential).
  const unsigned: HeartbeatRequestInput = { ...input };
  const signature = signPayload(unsigned, installationPrivateKeyPem, alg);
  return { ...input, signature };
}

/**
 * Verify the `signature` field on a heartbeat request.
 *
 * Used by the licensing server to confirm that the heartbeat came from
 * a deployment holding the installation private key registered for the
 * activation.
 *
 * @param req - the heartbeat request (must have `signature` populated).
 * @param installationPublicKeyPem - SPKI PEM-encoded installation public key.
 * @param alg - signing algorithm matching the installation key.
 * @returns `true` if the signature is valid, `false` otherwise (or if
 *   `req.signature` is absent).
 */
export function verifyHeartbeatRequest(
  req: HeartbeatRequest,
  installationPublicKeyPem: string,
  alg: SigningAlg,
): boolean {
  if (!req || typeof req.signature !== 'string' || req.signature.length === 0) {
    return false;
  }
  // Strip the signature field before re-canonicalising. We deliberately
  // copy to avoid mutating the input.
  const { signature: _sig, ...unsigned } = req;
  void _sig;
  return verifySignature(unsigned, req.signature, installationPublicKeyPem, alg);
}

/**
 * Build a signed heartbeat response. Used by the licensing server.
 *
 * The signature covers the canonicalised response body EXCLUDING the
 * `sig` field.
 *
 * @param response - the unsigned `HeartbeatResponse`.
 * @param serverPrivateKeyPem - PKCS#8 PEM-encoded licensing-server key.
 * @param alg - signing algorithm matching the server key.
 * @returns the signed response (with `sig` populated).
 */
export function buildHeartbeatResponse(
  response: HeartbeatResponse,
  serverPrivateKeyPem: string,
  alg: SigningAlg,
): SignedHeartbeatResponse {
  // Strip `sig` if present (defensive — `HeartbeatResponse` doesn't
  // have it, but a caller might have already attached one).
  const { sig: _existingSig, ...unsigned } = response as HeartbeatResponse & { sig?: string };
  void _existingSig;
  const sig = signPayload(unsigned, serverPrivateKeyPem, alg);
  return { ...(unsigned as HeartbeatResponse), sig };
}

/**
 * Verify a signed heartbeat response. Used by the on-premise backend.
 *
 * Fail-closed: any verification error returns `false`. Callers should
 * treat a `false` result as "the heartbeat response is untrusted;
 * ignore it and continue operating on the last known-good state".
 *
 * @param resp - the signed response (must have `sig` populated).
 * @param serverPublicKeyPem - SPKI PEM-encoded licensing-server public key.
 * @param alg - signing algorithm matching the server key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyHeartbeatResponse(
  resp: SignedHeartbeatResponse,
  serverPublicKeyPem: string,
  alg: SigningAlg,
): boolean {
  if (!resp || typeof resp.sig !== 'string' || resp.sig.length === 0) {
    return false;
  }
  const { sig: _sig, ...unsigned } = resp;
  void _sig;
  return verifySignature(unsigned, resp.sig, serverPublicKeyPem, alg);
}

// Re-export EntitlementModule so callers of buildHeartbeatResponse can
// construct a response without a separate import from @smart-edms/types.
export type { EntitlementModule };
