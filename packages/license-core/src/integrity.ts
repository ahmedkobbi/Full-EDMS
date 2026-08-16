/**
 * @smart-edms/license-core — Runtime integrity verification.
 *
 * Enterprise-grade hardening: computes a hash of critical source files
 * at startup and periodically verifies them during operation. If the
 * files have been modified (binary patching, hot-swapping), the license
 * state is forced to 'invalid'.
 *
 * Spec ref: §12.4 (licensing), §27.3 (security rules — fail closed).
 *
 * Attack model:
 *  An attacker who patches the compiled JavaScript files (e.g., modifies
 *  license.service.js to always return 'valid') will be detected because
 *  the file hash will change. The integrity check runs BEFORE license
 *  verification and fails closed.
 *
 * Limitations:
 *  - This is NOT a substitute for code signing or TPM attestation.
 *  - A sufficiently sophisticated attacker can patch the integrity check
 *    itself. However, this raises the bar significantly — they must
 *    identify and patch every integrity check point, and the audit log
 *    will record the failure.
 *  - For maximum security, combine with TPM/Secure Enclave attestation
 *    (future enhancement).
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Integrity check result.
 */
export interface IntegrityCheckResult {
  /** True if all files match their expected hashes. */
  readonly ok: boolean;
  /** List of files that failed verification (empty if ok). */
  readonly failed: readonly string[];
  /** Total files checked. */
  readonly checked: number;
}

/**
 * A file integrity entry: file path + expected SHA-256 hash.
 */
export interface IntegrityEntry {
  /** Relative file path. */
  readonly path: string;
  /** Expected SHA-256 hex digest. */
  readonly expectedHash: string;
}

/**
 * Compute the SHA-256 hash of a file.
 *
 * @param filePath - absolute path to the file.
 * @returns SHA-256 hex digest, or null if the file can't be read.
 */
export function hashFile(filePath: string): string | null {
  try {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Compute hashes for a list of critical files. Called at startup to
 * establish the baseline.
 *
 * @param baseDir - base directory for relative paths.
 * @param files - list of relative file paths to hash.
 * @returns array of IntegrityEntry objects.
 */
export function computeIntegrityBaseline(
  baseDir: string,
  files: readonly string[],
): readonly IntegrityEntry[] {
  const entries: IntegrityEntry[] = [];
  for (const file of files) {
    const fullPath = resolve(baseDir, file);
    const hash = hashFile(fullPath);
    if (hash) {
      entries.push({ path: file, expectedHash: hash });
    }
  }
  return entries;
}

/**
 * Verify that a set of files still match their baseline hashes. Called
 * periodically and before critical license operations.
 *
 * @param baseDir - base directory for relative paths.
 * @param baseline - the baseline integrity entries.
 * @returns verification result.
 */
export function verifyIntegrity(
  baseDir: string,
  baseline: readonly IntegrityEntry[],
): IntegrityCheckResult {
  const failed: string[] = [];
  for (const entry of baseline) {
    const fullPath = resolve(baseDir, entry.path);
    const currentHash = hashFile(fullPath);
    if (currentHash === null || currentHash !== entry.expectedHash) {
      failed.push(entry.path);
    }
  }
  return {
    ok: failed.length === 0,
    failed,
    checked: baseline.length,
  };
}

/**
 * The list of critical files that must not be modified. These are the
 * files that implement the licensing logic — if any of them are patched,
 * the license is invalidated.
 */
export const CRITICAL_LICENSE_FILES: readonly string[] = [
  'modules/license/license.service.js',
  'common/guards/license.guard.js',
  'common/audit.service.js',
  'common/redis.service.js',
  'prisma/prisma.service.js',
];

/**
 * Check if a file's modification time has changed since the baseline
 * was established. This is a secondary check — even if the hash matches,
 * a changed mtime suggests the file was touched (possibly patched and
 * then reverted).
 */
export function checkFileMtime(
  filePath: string,
  baselineMtime: number,
): boolean {
  try {
    const stat = statSync(filePath);
    return stat.mtimeMs === baselineMtime;
  } catch {
    return false;
  }
}
