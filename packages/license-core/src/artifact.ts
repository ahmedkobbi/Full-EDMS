/**
 * @smart-edms/license-core — `.sedmslic` artifact build & verify (spec §4.3, §12.5)
 *
 * Purpose: assemble the signed license certificate (`LicenseArtifact`)
 * from a `LicensePayload` + private key, and verify an artifact against
 * a public key on the client side.
 *
 * Envelope structure (spec §12.5):
 *   {
 *     "v": 1,
 *     "type": "sedms.license",
 *     "alg": "ed25519" | "ecdsa-p256-sha256" | "rsa-pss-sha256",
 *     "kid": "<16 hex chars>",
 *     "payload": { ...LicensePayload... },
 *     "sig": "<base64 signature over canonicalizeJson(payload)>"
 *   }
 *
 * Critical rules (spec §12.4):
 *  - The signature is computed over `canonicalizeJson(payload)` only —
 *    NOT over the entire envelope. This means a verifier can re-canonicalise
 *    the payload object on its side and check the signature without
 *    worrying about envelope key ordering.
 *  - Verification fails closed on any error (bad signature, malformed
 *    envelope, unsupported algorithm, missing field).
 *  - The `kid` embedded in the artifact MUST match `deriveKeyId(publicKey)`
 *    for the verification to be meaningful. `verifyLicenseArtifact()`
 *    does NOT check this — it trusts that the caller has selected the
 *    correct public key for the artifact's `kid`. A higher-level helper
 *    that does the `kid` lookup is provided by the licensing server
 *    package (out of scope here).
 */

import type { LicenseArtifact, LicensePayload } from '@smart-edms/types';
import { signPayload, verifySignature } from './sign.js';
import { algToSpecAlg, type SigningAlg, specAlgToAlg } from './keys.js';

/** Artifact schema version (spec §12.5). */
export const LICENSE_ARTIFACT_VERSION = 1 as const;

/**
 * Build a signed `.sedmslic` artifact from a license payload.
 *
 * The private key is used only to compute the signature; it is not
 * embedded in the artifact. The `kid` parameter is the key ID derived
 * from the corresponding public key (use `deriveKeyId()`).
 *
 * @param payload - the canonical license payload to sign.
 * @param privateKeyPem - PKCS#8 PEM-encoded private key (server-only).
 * @param kid - key ID derived from the public key.
 * @param alg - signing algorithm; must match the key type.
 * @returns the signed `LicenseArtifact`.
 */
export function buildLicenseArtifact(
  payload: LicensePayload,
  privateKeyPem: string,
  kid: string,
  alg: SigningAlg,
): LicenseArtifact {
  if (typeof kid !== 'string' || kid.length === 0) {
    throw new Error('buildLicenseArtifact: kid must be a non-empty string');
  }
  const sig = signPayload(payload, privateKeyPem, alg);
  return {
    v: LICENSE_ARTIFACT_VERSION,
    type: 'sedms.license',
    alg: algToSpecAlg(alg),
    kid,
    payload,
    sig,
  };
}

/**
 * Verify a `.sedmslic` artifact against a public key.
 *
 * Re-canonicalises the embedded `payload` and checks the signature.
 * Returns a discriminated union — callers should check `ok` before
 * accessing `payload`.
 *
 * Fail-closed: any structural problem (unsupported algorithm, missing
 * field, malformed payload) returns `{ ok: false, reason }` rather
 * than throwing. The verification itself never throws.
 *
 * @param artifact - the parsed artifact envelope.
 * @param publicKeyPem - SPKI PEM-encoded public key.
 * @returns `{ ok: true, payload }` on success, or `{ ok: false, reason }`
 *   on any failure.
 */
export function verifyLicenseArtifact(
  artifact: LicenseArtifact,
  publicKeyPem: string,
): { ok: true; payload: LicensePayload } | { ok: false; reason: string } {
  // Structural sanity checks (fail closed).
  if (artifact === null || typeof artifact !== 'object') {
    return { ok: false, reason: 'artifact is not an object' };
  }
  if (artifact.v !== LICENSE_ARTIFACT_VERSION) {
    return { ok: false, reason: `unsupported artifact version ${artifact.v}` };
  }
  if (artifact.type !== 'sedms.license') {
    return {
      ok: false,
      reason: `unsupported artifact type '${String(artifact.type)}'`,
    };
  }
  if (typeof artifact.kid !== 'string' || artifact.kid.length === 0) {
    return { ok: false, reason: 'missing or empty kid' };
  }
  if (typeof artifact.sig !== 'string' || artifact.sig.length === 0) {
    return { ok: false, reason: 'missing or empty signature' };
  }
  if (artifact.payload === null || typeof artifact.payload !== 'object') {
    return { ok: false, reason: 'missing payload' };
  }

  // Map spec alg → JOSE alg. RSA-PSS is not supported by this package;
  // verify() returns false instead of throwing.
  let alg: SigningAlg;
  try {
    alg = specAlgToAlg(artifact.alg);
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'unsupported signing algorithm',
    };
  }

  const ok = verifySignature(artifact.payload, artifact.sig, publicKeyPem, alg);
  if (!ok) {
    return { ok: false, reason: 'signature verification failed' };
  }
  return { ok: true, payload: artifact.payload };
}
