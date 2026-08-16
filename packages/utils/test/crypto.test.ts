/**
 * @smart-edms/utils — crypto tests.
 *
 * Verifies:
 *  - sha256 determinism + hex output.
 *  - randomToken length, charset, uniqueness.
 *  - base64url round-trip + rejection of invalid input.
 *  - constantTimeEqual truth table + length-mismatch safety.
 */
import { describe, expect, it } from 'vitest';
import {
  base64urlDecode,
  base64urlEncode,
  constantTimeEqual,
  randomToken,
  sha256,
} from '../src/index.js';

describe('crypto.sha256', () => {
  it('returns a 64-char lowercase hex digest for a string', () => {
    const out = sha256('hello');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
    // Known SHA-256 of "hello"
    expect(out).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('is deterministic for the same input', () => {
    expect(sha256('smart-edms')).toBe(sha256('smart-edms'));
  });

  it('accepts a Buffer input', () => {
    expect(sha256(Buffer.from('hello', 'utf8'))).toBe(sha256('hello'));
  });

  it('differs for different inputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});

describe('crypto.randomToken', () => {
  it('returns a base64url string of the expected length', () => {
    const t = randomToken(32);
    // 32 bytes → 256 bits → ~43 base64url chars (no padding)
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(42);
    expect(t.length).toBeLessThanOrEqual(44);
  });

  it('produces unique tokens', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {seen.add(randomToken(16));}
    expect(seen.size).toBe(1000);
  });

  it('rejects invalid byte counts', () => {
    expect(() => randomToken(0)).toThrow(RangeError);
    expect(() => randomToken(-1)).toThrow(RangeError);
    expect(() => randomToken(1.5)).toThrow(RangeError);
    expect(() => randomToken(2048)).toThrow(RangeError);
  });
});

describe('crypto.base64url', () => {
  it('round-trips arbitrary bytes', () => {
    const buf = Buffer.from([0, 1, 2, 255, 254, 253, 0, 127]);
    const encoded = base64urlEncode(buf);
    const decoded = base64urlDecode(encoded);
    expect(Buffer.compare(buf, decoded)).toBe(0);
  });

  it('does not include +, /, or =', () => {
    for (let i = 0; i < 50; i++) {
      const encoded = base64urlEncode(Buffer.from(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))));
      expect(encoded).not.toMatch(/[+/=]/);
    }
  });

  it('rejects invalid base64url characters on decode', () => {
    expect(() => base64urlDecode('!!!')).toThrow(TypeError);
    expect(() => base64urlDecode('')).toThrow(TypeError);
  });
});

describe('crypto.constantTimeEqual', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('abcd', 'abc')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(constantTimeEqual(null as unknown as string, 'abc')).toBe(false);
    expect(constantTimeEqual('abc', undefined as unknown as string)).toBe(false);
  });

  it('returns true for empty string equality', () => {
    expect(constantTimeEqual('', '')).toBe(true);
  });
});
