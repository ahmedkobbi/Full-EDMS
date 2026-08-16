/**
 * @smart-edms/license-core — privacy-aware machine fingerprint (spec §12.5, §12.7)
 *
 * Purpose: derive a stable, privacy-preserving fingerprint of the host
 * machine for license activation and verification.
 *
 * Privacy rules (spec §12.5):
 *  - Raw hardware identifiers (MAC address, hostname, serial numbers)
 *    are NEVER stored, transmitted, or signed in clear text.
 *  - Instead, we collect a small set of machine attributes, concatenate
 *    them with a per-deployment salt, and hash the result with SHA-256.
 *  - The salt is derived from the deployment ID at activation time, so
 *    two deployments on the same physical host produce different
 *    fingerprints (defeating cross-deployment correlation).
 *  - The raw attributes are returned to the caller as `components` only
 *    for debugging purposes; they MUST NOT be persisted or sent to the
 *    licensing server.
 *
 * Stability rules:
 *  - The fingerprint is stable across reboots, process restarts, and
 *    minor OS updates.
 *  - The fingerprint changes if the deployment ID changes (different
 *    salt), or if the host's primary network interface MAC address
 *    changes (e.g. NIC replacement, VM MAC reassignment).
 *  - The fingerprint is NOT a hardware serial number; it is a derived
 *    hash. Two hosts with identical attributes will produce identical
 *    fingerprints, which is acceptable for our use case (the licensing
 *    server treats fingerprints as soft-binding, not hard-binding).
 */

import { createHash, randomBytes } from 'node:crypto';
import { arch, hostname, networkInterfaces, platform } from 'node:os';

/**
 * Default salt used when the caller does not supply one. In production,
 * callers should always supply the deployment ID as the salt so that
 * different deployments on the same host produce different fingerprints.
 */
export const DEFAULT_FINGERPRINT_SALT = 'smart-edms:v1';

/**
 * Result of {@link computeMachineFingerprint}.
 */
export interface MachineFingerprint {
  /**
   * SHA-256 hex digest of `salt | hostname | platform | arch | mac`.
   * This is the value stored in `InstallationFingerprint.fingerprintHash`
   * and bound to a license activation.
   */
  readonly hash: string;
  /**
   * The raw attribute strings that went into the hash, in order. Provided
   * for debugging only — MUST NOT be persisted or transmitted.
   */
  readonly components: string[];
}

/**
 * Compute a privacy-aware machine fingerprint.
 *
 * @param salt - per-deployment salt (defaults to a constant; in
 *   production, callers should pass the deployment ID). The salt is
 *   prepended to the attribute concatenation before hashing.
 * @returns the fingerprint hash plus the list of raw components used.
 */
export async function computeMachineFingerprint(
  salt: string = DEFAULT_FINGERPRINT_SALT,
): Promise<MachineFingerprint> {
  if (typeof salt !== 'string' || salt.length === 0) {
    throw new Error('computeMachineFingerprint: salt must be a non-empty string');
  }
  const host = hostname();
  const plat = platform();
  const architecture = arch();
  const mac = getPrimaryMacAddress();

  // Components are concatenated with a separator that cannot appear in
  // any of them (the components are restricted to alphanumerics + a
  // small set of punctuation by the underlying OS APIs, so the `\x1f`
  // unit separator is safe).
  const components = [host, plat, architecture, mac];
  const material = [salt, ...components].join('\x1f');
  const hash = createHash('sha256').update(material, 'utf8').digest('hex');
  return { hash, components };
}

/**
 * Compute a machine fingerprint synchronously. Use this in hot paths
 * where the async overhead of `computeMachineFingerprint` is unwanted
 * (the underlying calls are all synchronous anyway — the async form
 * exists for forward compatibility with possible future TPM-attestation
 * flows that may need to be async).
 */
export function computeMachineFingerprintSync(
  salt: string = DEFAULT_FINGERPRINT_SALT,
): MachineFingerprint {
  if (typeof salt !== 'string' || salt.length === 0) {
    throw new Error('computeMachineFingerprintSync: salt must be a non-empty string');
  }
  const host = hostname();
  const plat = platform();
  const architecture = arch();
  const mac = getPrimaryMacAddress();
  const components = [host, plat, architecture, mac];
  const material = [salt, ...components].join('\x1f');
  const hash = createHash('sha256').update(material, 'utf8').digest('hex');
  return { hash, components };
}

/**
 * Build an `InstallationFingerprint` object suitable for embedding in
 * a license payload or offline activation request.
 *
 * @param salt - per-deployment salt.
 * @param attestation - optional hardware-attestation blob (TPM / Secure
 *   Enclave). Pass `null` if not available.
 */
export function buildInstallationFingerprint(
  salt: string = DEFAULT_FINGERPRINT_SALT,
  attestation: string | null = null,
): {
  fingerprintHash: string;
  machineId: string | null;
  os: string;
  arch: string;
  attestation: string | null;
} {
  const { hash } = computeMachineFingerprintSync(salt);
  return {
    fingerprintHash: hash,
    // We deliberately do NOT expose the raw hostname as `machineId`
    // (it would defeat the privacy goal). Instead, we expose a stable
    // hash-derived ID that lets the licensing server correlate
    // activations without learning the host's actual name.
    machineId: createHash('sha256').update(`${salt}\x1f${hostname()}`, 'utf8').digest('hex').slice(0, 32),
    os: platform(),
    arch: arch(),
    attestation,
  };
}

/**
 * Generate a single-use nonce suitable for inclusion in an offline
 * activation request. Returns 32 random bytes as a 64-character hex
 * string.
 */
export function generateNonce(): string {
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Internal: find the primary MAC address
// ---------------------------------------------------------------------------

/**
 * Return the MAC address of the first non-internal, non-zero IPv4
 * interface. If no such interface exists (e.g. in a container with
 * only `lo`), returns the string `'00:00:00:00:00:00'` so that the
 * fingerprint is still computable (just less unique).
 *
 * The MAC is normalised to lower-case, colon-separated form.
 */
function getPrimaryMacAddress(): string {
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    const list = ifaces[name];
    if (!list) {continue;}
    for (const iface of list) {
      if (iface.internal) {continue;}
      if (iface.family !== 'IPv4') {continue;}
      if (!iface.mac || iface.mac === '00:00:00:00:00:00') {continue;}
      return iface.mac.toLowerCase();
    }
  }
  // Fallback: hash the interface names so that two hosts with the same
  // empty-MAC situation but different interface configurations still
  // produce different fingerprints.
  const names = Object.keys(ifaces).sort().join(',');
  return createHash('sha256').update(`nomac:${names}`, 'utf8').digest('hex').slice(0, 17);
}
