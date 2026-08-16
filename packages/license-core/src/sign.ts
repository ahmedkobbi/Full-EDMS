/**
 * @smart-edms/license-core — sign & verify (spec §12.4, §12.5)
 *
 * Purpose: sign arbitrary JSON-compatible payloads with a private key,
 * and verify signatures against a public key. The signing flow is:
 *
 *   payload → canonicalizeJson(payload) → UTF-8 bytes → sign → base64 sig
 *
 * Verification re-canonicalises the payload (so the verifier is robust
 * against minor JSON re-serialisation) and checks the signature.
 *
 * Algorithms (mapped by `SigningAlg`):
 *  - `'EdDSA'`  → Ed25519 (one-shot sign/verify, no hashing required).
 *  - `'ES256'`  → ECDSA P-256 with SHA-256. Node.js `crypto.sign()` for
 *                 ECDSA is non-deterministic by default; this is fine
 *                 for our use because verification only checks the
 *                 signature against the message, not against any
 *                 pre-computed deterministic value. The signature
 *                 output is DER-encoded (ASN.1 SEQUENCE of two INTEGERs).
 *
 * Critical rules (spec §12.4):
 *  - Signature verification fails closed (any error → invalid).
 *  - The signing input is the canonicalised JSON, byte-for-byte.
 *  - Signatures are base64-encoded (no PEM wrapping) for compactness.
 *  - The private key is required only for signing; verification uses
 *    only the public key.
 */

import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { canonicalizeBytes } from './canonicalize.js';
import { type SigningAlg } from './keys.js';

/**
 * Sign a JSON-compatible payload and return a base64-encoded signature.
 *
 * @param payload - any JSON-compatible value (object, array, primitive).
 * @param privateKeyPem - PKCS#8 PEM-encoded private key.
 * @param alg - signing algorithm; must match the key type.
 * @returns base64-encoded signature string (no PEM wrapping).
 * @throws {Error} if the key does not match `alg` or if the payload
 *   contains values that cannot be canonicalised.
 */
export function signPayload(
  payload: unknown,
  privateKeyPem: string,
  alg: SigningAlg,
): string {
  const privKey = createPrivateKey({ key: Buffer.from(privateKeyPem, 'utf8'), format: 'pem' });
  assertKeyMatchesAlg(privKey, alg, 'private');
  const data = canonicalizeBytes(payload);
  const sig = sign(digestInputForAlg(alg), data, privKey);
  return sig.toString('base64');
}

/**
 * Verify a base64-encoded signature against a payload using a public key.
 *
 * Fail-closed: any internal error (malformed signature, wrong key type,
 * mismatched algorithm, malformed payload) returns `false`. The caller
 * is responsible for treating `false` as "license invalid".
 *
 * @param payload - the JSON-compatible value the signature is claimed to
 *   cover. It is re-canonicalised before verification, so callers may
 *   pass a freshly-parsed object without worrying about key order.
 * @param signature - base64-encoded signature.
 * @param publicKeyPem - SPKI PEM-encoded public key.
 * @param alg - signing algorithm; must match the key type.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifySignature(
  payload: unknown,
  signature: string,
  publicKeyPem: string,
  alg: SigningAlg,
): boolean {
  try {
    const pubKey = createPublicKey({ key: Buffer.from(publicKeyPem, 'utf8'), format: 'pem' });
    assertKeyMatchesAlg(pubKey, alg, 'public');
    const data = canonicalizeBytes(payload);
    const sigBuf = Buffer.from(signature, 'base64');
    return verify(digestInputForAlg(alg), data, pubKey, sigBuf);
  } catch {
    // Fail closed: any error during verification means "invalid".
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal: algorithm → digest input mapping
// ---------------------------------------------------------------------------

/**
 * Returns the value to pass as the first argument to `crypto.sign()` /
 * `crypto.verify()`.
 *
 * - For Ed25519 (`'EdDSA'`): Node's crypto API requires `null` (Ed25519
 *   does its own internal hashing; the data is the raw message).
 * - For ECDSA P-256 (`'ES256'`): pass the SHA-256 algorithm name; Node
 *   will hash the data with SHA-256 before signing.
 */
function digestInputForAlg(alg: SigningAlg): 'sha256' | null {
  if (alg === 'EdDSA') {return null;}
  if (alg === 'ES256') {return 'sha256';}
  const _exhaustive: never = alg;
  throw new Error(`Unsupported signing alg: ${String(_exhaustive)}`);
}

/**
 * Ensure a KeyObject's asymmetric type matches the requested algorithm.
 * Throws if mismatched — for example, calling `signPayload(..., 'EdDSA')`
 * with an EC P-256 private key.
 */
function assertKeyMatchesAlg(
  key: ReturnType<typeof createPublicKey>,
  alg: SigningAlg,
  side: 'public' | 'private',
): void {
  // `asymmetricKeyType` is `'ed25519'` for Ed25519 and `'ec'` for EC keys.
  const kty = key.asymmetricKeyType;
  if (alg === 'EdDSA') {
    if (kty !== 'ed25519') {
      throw new Error(
        `Algorithm 'EdDSA' requires an Ed25519 ${side} key, got '${kty ?? 'unknown'}'`,
      );
    }
    return;
  }
  if (alg === 'ES256') {
    if (kty !== 'ec') {
      throw new Error(
        `Algorithm 'ES256' requires an EC P-256 ${side} key, got '${kty ?? 'unknown'}'`,
      );
    }
    // Verify the named curve. `asymmetricKeyDetails` exists on EC keys.
    const details = key.asymmetricKeyDetails as { namedCurve?: string } | undefined;
    if (details?.namedCurve !== 'prime256v1' && details?.namedCurve !== 'secp256r1') {
      throw new Error(
        `Algorithm 'ES256' requires the P-256 curve, got '${details?.namedCurve ?? 'unknown'}'`,
      );
    }
    return;
  }
  const _exhaustive: never = alg;
  throw new Error(`Unsupported signing alg: ${String(_exhaustive)}`);
}
