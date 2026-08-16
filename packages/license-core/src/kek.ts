/**
 * @smart-edms/license-core — Key Encryption Key (KEK) module.
 *
 * Enterprise-grade hardening: wraps the license public key with a
 * KEK derived from the machine fingerprint so that simply replacing
 * the public key file on disk is not sufficient to forge licenses.
 *
 * Spec ref: §12.4 (licensing), §21.4 (envelope encryption).
 *
 * Defence-in-depth layers:
 *  1. Ed25519 signature verification (already exists)
 *  2. KEK-wrapped public key (this module)
 *  3. Runtime integrity verification (integrity.ts)
 *  4. Clock skew detection (clock-skew.ts)
 *  5. License payload encryption at rest (payload-cipher.ts)
 *  6. CRL verification (revocation-list.ts, enhanced in guard)
 *
 * KEK derivation:
 *  - Input: machine fingerprint hash + deployment ID (salt)
 *  - Algorithm: PBKDF2-SHA256, 310,000 iterations (OWASP 2023 recommendation)
 *  - Output: 32-byte AES-256 key
 *  - The public key PEM is encrypted with AES-256-GCM using this KEK
 *
 * Attack model:
 *  An attacker who copies the wrapped public key file to another machine
 *  cannot use it because the KEK derivation will produce a different key
 *  on the different hardware. They would need to also steal the machine
 *  fingerprint computation logic AND replicate the exact hardware.
 */

import {
  createHash,
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

/** PBKDF2 iteration count (OWASP 2023: 310,000 for PBKDF2-SHA256). */
const PBKDF2_ITERATIONS = 310_000;

/** KEK key length in bytes (AES-256). */
const KEK_LENGTH = 32;

/** PBKDF2 salt length in bytes. */
const SALT_LENGTH = 32;

/** AES-GCM IV length in bytes. */
const IV_LENGTH = 12;

/** AES-GCM auth tag length in bytes. */
const AUTH_TAG_LENGTH = 16;

/**
 * Wrapped public key envelope. This is what gets stored on disk instead
 * of the raw PEM. The `v` field enables future format migrations.
 */
export interface WrappedPublicKey {
  /** Envelope format version. */
  readonly v: 1;
  /** Key derivation function used. */
  readonly kdf: 'pbkdf2-sha256';
  /** PBKDF2 iteration count. */
  readonly iterations: number;
  /** PBKDF2 salt (base64). */
  readonly salt: string;
  /** AES-GCM IV (base64). */
  readonly iv: string;
  /** AES-GCM auth tag (base64). */
  readonly tag: string;
  /** Encrypted public key PEM (base64). */
  readonly ciphertext: string;
}

/**
 * Derive a 32-byte AES-256 KEK from the machine fingerprint hash and
 * a deployment-specific salt.
 *
 * @param machineFingerprintHash - SHA-256 hex digest of the machine fingerprint.
 * @param deploymentSalt - per-deployment salt (e.g., deploymentId).
 * @returns 32-byte KEK as a Buffer.
 */
export function deriveKek(
  machineFingerprintHash: string,
  deploymentSalt: string,
): Buffer {
  if (!machineFingerprintHash || machineFingerprintHash.length === 0) {
    throw new Error('deriveKek: machineFingerprintHash must be a non-empty string');
  }
  if (!deploymentSalt || deploymentSalt.length === 0) {
    throw new Error('deriveKek: deploymentSalt must be a non-empty string');
  }
  // Combine the fingerprint hash with the deployment salt to form the
  // PBKDF2 password. This ensures that even if two machines have the
  // same hardware, different deployments will produce different KEKs.
  const password = `${deploymentSalt}:${machineFingerprintHash}`;
  const salt = createHash('sha256')
    .update(`smart-edms-kek-salt:${deploymentSalt}`)
    .digest();
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEK_LENGTH, 'sha256');
}

/**
 * Wrap (encrypt) a public key PEM with a KEK derived from the machine
 * fingerprint. The result is a JSON-serializable envelope that can be
 * stored on disk.
 *
 * @param publicKeyPem - SPKI PEM-encoded public key.
 * @param machineFingerprintHash - SHA-256 hex of the machine fingerprint.
 * @param deploymentSalt - per-deployment salt.
 * @returns the wrapped public key envelope.
 */
export function wrapPublicKey(
  publicKeyPem: string,
  machineFingerprintHash: string,
  deploymentSalt: string,
): WrappedPublicKey {
  const iv = randomBytes(IV_LENGTH);
  const plaintext = Buffer.from(publicKeyPem, 'utf8');
  const salt = randomBytes(SALT_LENGTH);
  // Derive KEK with the random salt so each wrapping is unique
  const finalKek = pbkdf2Sync(
    `${deploymentSalt}:${machineFingerprintHash}`,
    salt,
    PBKDF2_ITERATIONS,
    KEK_LENGTH,
    'sha256',
  );
  const finalCipher = createCipheriv('aes-256-gcm', finalKek, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const finalEncrypted = Buffer.concat([
    finalCipher.update(plaintext),
    finalCipher.final(),
  ]);
  return {
    v: 1,
    kdf: 'pbkdf2-sha256',
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: finalCipher.getAuthTag().toString('base64'),
    ciphertext: finalEncrypted.toString('base64'),
  };
}

/**
 * Unwrap (decrypt) a public key PEM using a KEK derived from the machine
 * fingerprint. Fails closed on any error (wrong key, tampered ciphertext,
 * etc.).
 *
 * @param wrapped - the wrapped public key envelope.
 * @param machineFingerprintHash - SHA-256 hex of the machine fingerprint.
 * @param deploymentSalt - per-deployment salt.
 * @returns the public key PEM string, or null if decryption fails.
 */
export function unwrapPublicKey(
  wrapped: WrappedPublicKey,
  machineFingerprintHash: string,
  deploymentSalt: string,
): string | null {
  try {
    const salt = Buffer.from(wrapped.salt, 'base64');
    const iv = Buffer.from(wrapped.iv, 'base64');
    const tag = Buffer.from(wrapped.tag, 'base64');
    const ciphertext = Buffer.from(wrapped.ciphertext, 'base64');
    const kek = pbkdf2Sync(
      `${deploymentSalt}:${machineFingerprintHash}`,
      salt,
      wrapped.iterations,
      KEK_LENGTH,
      'sha256',
    );
    const decipher = createDecipheriv('aes-256-gcm', kek, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    // Fail closed — any decryption error means the key can't be used.
    return null;
  }
}

/**
 * Verify that a wrapped public key can be unwrapped with the given
 * machine fingerprint. Does not return the key, just a boolean.
 */
export function verifyWrappedPublicKey(
  wrapped: WrappedPublicKey,
  machineFingerprintHash: string,
  deploymentSalt: string,
): boolean {
  const pem = unwrapPublicKey(wrapped, machineFingerprintHash, deploymentSalt);
  return pem !== null && pem.includes('BEGIN PUBLIC KEY');
}
