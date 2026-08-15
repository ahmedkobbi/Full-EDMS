/**
 * @smart-edms/utils — identifier generators.
 *
 * Provides three ID generators with different trade-offs:
 *  - `uuid()` — RFC 4122 v4 UUID (lowercase hex with dashes). Use when the
 *    consumer expects a canonical UUID string (database PKs, JWT `jti`,
 *    correlation IDs in logs).
 *  - `ulid()` — 26-character Crockford-base32 ULID (Universally Unique
 *    Lexicographically Sortable Identifier). Use when callers need IDs that
 *    sort naturally by creation time (event logs, queue messages).
 *  - `shortId(length)` — a short, human-friendly random ID from the
 *    unambiguous alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (no `I`, `L`,
 *    `O`, `U`). Use for share codes, invite tokens displayed to humans.
 *
 * All three are cryptographically random where randomness is required.
 */

import { randomBytes, randomUUID } from 'node:crypto';

/**
 * Generate an RFC 4122 v4 UUID string (lowercase, dashed). Wraps Node.js
 * `crypto.randomUUID()` so callers don't need to import `node:crypto` directly.
 *
 * @example
 *   uuid(); // '7c0d4f1a-3b2e-4d5f-8a1b-9c2e3f4d5a6b'
 */
export function uuid(): string {
  return randomUUID();
}

/**
 * Crockford-base32 alphabet. Excludes `I`, `L`, `O`, `U` to avoid confusion
 * with `1`, `1`, `0`, `V`. This is the canonical ULID alphabet.
 */
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encode a buffer as Crockford-base32 (no padding). Used internally by
 * `ulid()`; exposed for callers that need to base32-encode other buffers.
 */
export function crockfordBase32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]!;
    bits += 8;
    while (bits >= 5) {
      output += CROCKFORD_BASE32[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += CROCKFORD_BASE32[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

/**
 * Generate a ULID — a 26-character Crockford-base32 string that is
 * lexicographically sortable by creation time. ULIDs are sortable because
 * the first 10 characters encode the millisecond timestamp and the last 16
 * characters are random.
 *
 * Unlike UUIDv4 (which is purely random), a stream of ULIDs can be sorted
 * as strings to recover approximate creation order — useful for event logs
 * and time-series records.
 *
 * @param now — optional timestamp override (default: `Date.now()`). Useful
 *              for deterministic tests.
 *
 * @example
 *   ulid(); // '01ARZ3NDEKTSV4RRFFQ69G5FAV'
 */
export function ulid(now: number = Date.now()): string {
  if (!Number.isInteger(now) || now < 0) {
    throw new RangeError(`ulid: timestamp must be a non-negative integer, got ${now}`);
  }
  // ULID timestamp is 48 bits (millis since Unix epoch). 10 base32 chars = 50 bits.
  const timeBuf = Buffer.alloc(6);
  timeBuf.writeUIntBE(now, 0, 6);
  // Random portion is 80 bits = 16 base32 chars.
  const randBuf = randomBytes(10);
  return crockfordBase32Encode(timeBuf) + crockfordBase32Encode(randBuf);
}

/**
 * Generate a short, human-friendly random ID from the unambiguous
 * Crockford-base32 alphabet (no `I`, `L`, `O`, `U`). Default length is 8
 * characters (≈ 40 bits of entropy).
 *
 * Use this for share codes, invite tokens, or any ID a human will read or
 * type. For machine-only IDs prefer `uuid()` or `ulid()`.
 *
 * @param length — desired output length (1-64, default 8).
 *
 * @example
 *   shortId();     // 'K7M3R9PQ'
 *   shortId(12);   // 'K7M3R9PQX2T4'
 */
export function shortId(length: number = 8): string {
  if (!Number.isInteger(length) || length < 1 || length > 64) {
    throw new RangeError(`shortId: length must be an integer in [1, 64], got ${length}`);
  }
  // 5 bits per character; ceil(length * 5 / 8) bytes covers it.
  const byteCount = Math.ceil((length * 5) / 8);
  const buf = randomBytes(byteCount);
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length && output.length < length; i++) {
    value = (value << 8) | buf[i]!;
    bits += 8;
    while (bits >= 5 && output.length < length) {
      output += CROCKFORD_BASE32[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  return output;
}
