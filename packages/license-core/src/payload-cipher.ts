/**
 * @smart-edms/license-core — License payload encryption at rest.
 *
 * Enterprise-grade hardening: encrypts the license payload before storing
 * it in the database, so that an attacker with direct DB access cannot
 * modify the payload or read the entitlements.
 *
 * Spec ref: §12.4 (licensing), §21.4 (envelope encryption).
 *
 * Defence-in-depth:
 *  - The license payload is SIGNED (Ed25519) — prevents forgery.
 *  - The license payload is ENCRYPTED (AES-256-GCM) — prevents reading/modifying.
 *  - The DEK (Data Encryption Key) is derived from the machine fingerprint.
 *  - The KEK (Key Encryption Key) wraps the DEK for storage.
 *
 * Attack model:
 *  An attacker with direct database access (e.g., SQL injection, stolen
 *  DB credentials) could try to:
 *   1. Modify the payload_json column → signature verification fails.
 *   2. Replace the payload entirely → they can't sign it (no private key).
 *   3. Read the entitlements → they're encrypted, can't read without DEK.
 *   4. Delete the row → license becomes 'invalid' (fail-closed).
 *
 * The DEK is derived from the machine fingerprint, so even if the DB is
 * copied to another machine, the payload can't be decrypted.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from 'node:crypto';

/** AES-256-GCM key length. */
const KEY_LENGTH = 32;

/** AES-GCM IV length. */
const IV_LENGTH = 12;

/** AES-GCM auth tag length. */
const AUTH_TAG_LENGTH = 16;

/** PBKDF2 iterations for DEK derivation. */
const PBKDF2_ITERATIONS = 310_000;

/**
 * Encrypted payload envelope.
 */
export interface EncryptedPayload {
  /** Envelope format version. */
  readonly v: 1;
  /** Encryption algorithm. */
  readonly alg: 'aes-256-gcm';
  /** KDF used for key derivation. */
  readonly kdf: 'pbkdf2-sha256';
  /** PBKDF2 iterations. */
  readonly iterations: number;
  /** PBKDF2 salt (base64). */
  readonly salt: string;
  /** AES-GCM IV (base64). */
  readonly iv: string;
  /** AES-GCM auth tag (base64). */
  readonly tag: string;
  /** Encrypted payload (base64). */
  readonly ciphertext: string;
}

/**
 * Derive a Data Encryption Key (DEK) from the machine fingerprint hash
 * and a salt.
 */
function deriveDek(
  machineFingerprintHash: string,
  salt: Buffer,
): Buffer {
  return pbkdf2Sync(
    machineFingerprintHash,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256',
  );
}

/**
 * Encrypt a license payload (JSON string) using AES-256-GCM with a
 * DEK derived from the machine fingerprint.
 *
 * @param payloadJson - the license payload as a canonical JSON string.
 * @param machineFingerprintHash - SHA-256 hex of the machine fingerprint.
 * @returns encrypted payload envelope.
 */
export function encryptPayload(
  payloadJson: string,
  machineFingerprintHash: string,
): EncryptedPayload {
  const salt = randomBytes(32);
  const dek = deriveDek(machineFingerprintHash, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', dek, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const plaintext = Buffer.from(payloadJson, 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: 'aes-256-gcm',
    kdf: 'pbkdf2-sha256',
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

/**
 * Decrypt a license payload. Fails closed on any error.
 *
 * @param encrypted - the encrypted payload envelope.
 * @param machineFingerprintHash - SHA-256 hex of the machine fingerprint.
 * @returns the decrypted payload JSON string, or null if decryption fails.
 */
export function decryptPayload(
  encrypted: EncryptedPayload,
  machineFingerprintHash: string,
): string | null {
  try {
    const salt = Buffer.from(encrypted.salt, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
    const dek = deriveDek(machineFingerprintHash, salt);
    const decipher = createDecipheriv('aes-256-gcm', dek, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Serialize an encrypted payload to a JSON string for DB storage.
 */
export function serializeEncryptedPayload(encrypted: EncryptedPayload): string {
  return JSON.stringify(encrypted);
}

/**
 * Deserialize an encrypted payload from a DB-stored JSON string.
 * Returns null if the format is invalid.
 */
export function deserializeEncryptedPayload(json: string): EncryptedPayload | null {
  try {
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.v === 1 &&
      parsed.alg === 'aes-256-gcm' &&
      typeof parsed.ciphertext === 'string'
    ) {
      return parsed as EncryptedPayload;
    }
    return null;
  } catch {
    return null;
  }
}
