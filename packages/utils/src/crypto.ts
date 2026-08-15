/**
 * @smart-edms/utils — cryptographic helpers.
 *
 * Thin wrappers around Node.js `crypto` used across the monorepo:
 *  - `sha256(input)` — hex digest of a string or buffer.
 *  - `randomToken(bytes)` — cryptographically strong URL-safe random token.
 *  - `base64urlEncode/Decode` — base64url without padding (RFC 4648 §5).
 *  - `constantTimeEqual(a, b)` — constant-time string comparison to prevent
 *    timing attacks when comparing tokens / HMACs.
 *
 * No external crypto library is used. The functions are isomorphic enough
 * to run on Node 20+; they are NOT browser-safe (they use `node:crypto`).
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Compute the SHA-256 hex digest of the input. Accepts a UTF-8 string or a
 * `Buffer`; strings are encoded as UTF-8 before hashing.
 *
 * @returns 64-character lowercase hex string.
 */
export function sha256(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Generate a cryptographically strong random token of the given byte length,
 * returned as a base64url string (no padding). Default 32 bytes (256 bits)
 * yields a 43-character token.
 *
 * Use this for opaque session tokens, nonce values, API keys, etc.
 */
export function randomToken(bytes: number = 32): string {
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > 1024) {
    throw new RangeError(`randomToken: bytes must be an integer in [1, 1024], got ${bytes}`);
  }
  return base64urlEncode(randomBytes(bytes));
}

/**
 * Base64url-encode a buffer or string (RFC 4648 §5, no padding).
 *
 * Base64url is URL-safe and filename-safe, unlike standard base64 which
 * contains `+`, `/`, and `=`.
 */
export function base64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

/**
 * Base64url-decode a string into a `Buffer`. Accepts both padded and
 * unpadded inputs (the `base64url` Node.js decoder handles both).
 *
 * @throws `TypeError` if the input is not valid base64url.
 */
export function base64urlDecode(input: string): Buffer {
  if (typeof input !== 'string' || input.length === 0) {
    throw new TypeError('base64urlDecode: input must be a non-empty string');
  }
  // Node's base64url decoder is lenient about padding; we still sanity-check
  // the character set so callers get a clean error rather than silent garbage.
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(input)) {
    throw new TypeError('base64urlDecode: input contains invalid base64url characters');
  }
  return Buffer.from(input, 'base64url');
}

/**
 * Constant-time string comparison. Returns `true` iff `a` and `b` are
 * byte-equal. The runtime depends only on the length of `a` (not on the
 * position of the first mismatch), preventing timing side-channels.
 *
 * Use this to compare tokens, HMACs, or password hashes. NEVER use `===`
 * or `String.equals` for security-sensitive comparisons.
 *
 * If the inputs have different lengths, the function still performs a
 * comparison against a same-length slice to keep the timing uniform —
 * however, the result is always `false` when lengths differ.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Compare bufA against itself to keep the timing uniform, then return
    // false. This avoids leaking the length delta via an early-exit.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
