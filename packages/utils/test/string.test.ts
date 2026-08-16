/**
 * @smart-edms/utils — string tests.
 */
import { describe, expect, it } from 'vitest';
import {
  camelToKebab,
  pluralize,
  sanitizeFilename,
  slugify,
  truncate,
} from '../src/index.js';

describe('string.sanitizeFilename', () => {
  it('passes through a normal filename', () => {
    expect(sanitizeFilename('quarterly-report.pdf')).toBe('quarterly-report.pdf');
  });

  it('strips path separators and traversal sequences', () => {
    // `..` collapses to `.`, then `/` is replaced with `_` → `._._etc_passwd`.
    // The pattern makes path-traversal attempts visible (and still safe).
    expect(sanitizeFilename('../../etc/passwd')).toBe('._._etc_passwd');
    expect(sanitizeFilename('a/b/c.txt')).toBe('a_b_c.txt');
    // A single `..` without separators collapses to a single `.`.
    expect(sanitizeFilename('foo..bar')).toBe('foo.bar');
    expect(sanitizeFilename('foo...bar')).toBe('foo.bar');
  });

  it('strips control characters', () => {
    expect(sanitizeFilename('hello\x00world\x07')).toBe('helloworld');
  });

  it('replaces illegal storage characters with underscore', () => {
    expect(sanitizeFilename('file:name?.txt')).toBe('file_name_.txt');
    expect(sanitizeFilename('a*b<c>d|e')).toBe('a_b_c_d_e');
  });

  it('collapses whitespace', () => {
    expect(sanitizeFilename('  hello   world  ')).toBe('hello world');
  });

  it('preserves Unicode (Arabic, CJK, Cyrillic)', () => {
    expect(sanitizeFilename('تقرير.pdf')).toBe('تقرير.pdf');
    expect(sanitizeFilename('报告.pdf')).toBe('报告.pdf');
    expect(sanitizeFilename('Отчёт.pdf')).toBe('Отчёт.pdf');
  });

  it('returns untitled for empty input', () => {
    expect(sanitizeFilename('')).toBe('untitled');
    expect(sanitizeFilename('   ')).toBe('untitled');
  });

  it('returns untitled for non-string input', () => {
    expect(sanitizeFilename(null as unknown as string)).toBe('untitled');
    expect(sanitizeFilename(undefined as unknown as string)).toBe('untitled');
  });
});

describe('string.truncate', () => {
  it('returns the input when shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('appends ellipsis when truncating', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });

  it('returns just the ellipsis for max=1', () => {
    expect(truncate('hello world', 1)).toBe('…');
  });

  it('never exceeds max length', () => {
    const out = truncate('a'.repeat(100), 20);
    expect(out.length).toBe(20);
    expect(out.endsWith('…')).toBe(true);
  });

  it('rejects invalid max', () => {
    expect(() => truncate('x', 0)).toThrow(RangeError);
    expect(() => truncate('x', -1)).toThrow(RangeError);
  });
});

describe('string.slugify', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('Foo & Bar 2.0')).toBe('foo-bar-2-0');
  });

  it('strips diacritics', () => {
    expect(slugify('Café au Lait')).toBe('cafe-au-lait');
    expect(slugify('Mötley Crüe')).toBe('motley-crue');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('returns empty string for non-string input', () => {
    expect(slugify(null as unknown as string)).toBe('');
  });
});

describe('string.camelToKebab', () => {
  it('converts camelCase', () => {
    expect(camelToKebab('camelCase')).toBe('camel-case');
    expect(camelToKebab('getUserById')).toBe('get-user-by-id');
  });

  it('converts PascalCase', () => {
    expect(camelToKebab('PascalCase')).toBe('pascal-case');
  });

  it('handles consecutive capitals (acronyms)', () => {
    expect(camelToKebab('HTTPServer')).toBe('http-server');
    expect(camelToKebab('parseURL')).toBe('parse-url');
  });

  it('passes through already-kebab input', () => {
    expect(camelToKebab('already-kebab')).toBe('already-kebab');
  });
});

describe('string.pluralize', () => {
  it('returns singular for n=1', () => {
    expect(pluralize(1, 'document', 'documents')).toBe('document');
  });

  it('returns plural for n=0', () => {
    expect(pluralize(0, 'document', 'documents')).toBe('documents');
  });

  it('returns plural for n>1', () => {
    expect(pluralize(2, 'document', 'documents')).toBe('documents');
    expect(pluralize(100, 'document', 'documents')).toBe('documents');
  });

  it('handles negative counts', () => {
    expect(pluralize(-3, 'document', 'documents')).toBe('documents');
  });

  it('rejects non-finite n', () => {
    expect(() => pluralize(NaN, 'a', 'b')).toThrow(RangeError);
    expect(() => pluralize(Infinity, 'a', 'b')).toThrow(RangeError);
  });
});
