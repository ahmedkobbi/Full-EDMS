/**
 * @smart-edms/utils — string helpers.
 *
 *  - `sanitizeFilename(name)` — strip path separators / control chars /
 *    illegal storage characters while preserving Unicode (Arabic, Cyrillic,
 *    CJK). Extracted from `apps/backend/src/common/storage.service.ts` so
 *    the same rule is applied everywhere a user-supplied filename is
 *    accepted.
 *  - `truncate(s, max)` — append an ellipsis if the string exceeds `max`.
 *  - `slugify(s)` — lowercase ASCII slug for URL path segments.
 *  - `camelToKebab(s)` — convert `camelCase` to `kebab-case`.
 *  - `pluralize(n, singular, plural)` — pick the right form for `n`.
 */

/**
 * Sanitize a user-supplied filename for safe storage. Strips:
 *  - ASCII control characters (0x00-0x1F, 0x7F).
 *  - Path-traversal sequences (`..` collapses to `.`).
 *  - Characters illegal on common filesystems (`\ / : * ? " < > |`).
 *
 * Preserves Arabic, Cyrillic, CJK, and other Unicode characters — only
 * dangerous characters are blocked. Collapses runs of whitespace to a
 * single space and trims leading/trailing whitespace. The result is
 * truncated to 255 bytes (the classic filesystem limit). If the result is
 * empty, returns `'untitled'`.
 *
 * Spec ref: §9.3 (storage key is opaque; filename is metadata only).
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'untitled';
  }
  return (
    filename
      .replace(/[\x00-\x1f\x7f]/g, '') // control chars
      .replace(/\.\.+/g, '.') // path traversal
      .replace(/[\\/:*?"<>|]/g, '_') // illegal storage chars
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 255) || 'untitled'
  );
}

/**
 * Truncate `s` to at most `max` characters, appending a single ellipsis
 * character (`…`) if truncation occurred. The returned string is at most
 * `max` characters long (including the ellipsis).
 *
 * @param max — maximum length of the output (must be ≥ 1).
 */
export function truncate(s: string, max: number): string {
  if (typeof s !== 'string') return '';
  if (!Number.isInteger(max) || max < 1) {
    throw new RangeError(`truncate: max must be a positive integer, got ${max}`);
  }
  if (s.length <= max) return s;
  if (max === 1) return '…';
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Convert a free-form string into a URL-safe ASCII slug. Lowercases,
 * replaces runs of non-alphanumeric characters with a single hyphen, and
 * strips leading/trailing hyphens. Non-ASCII characters are transliterated
 * to their closest ASCII approximation via `String.prototype.normalize('NFKD')`.
 *
 * @example
 *   slugify('Hello, World!'); // 'hello-world'
 *   slugify('Café au Lait');  // 'cafe-au-lait'
 */
export function slugify(s: string): string {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert a `camelCase` or `PascalCase` string to `kebab-case`.
 *
 * @example
 *   camelToKebab('camelCase');   // 'camel-case'
 *   camelToKebab('PascalCase');  // 'pascal-case'
 *   camelToKebab('HTTPServer');  // 'http-server'
 *   camelToKebab('already-kebab'); // 'already-kebab'
 */
export function camelToKebab(s: string): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Pick the singular or plural form of a noun based on the count `n`.
 *
 * @example
 *   pluralize(1, 'document', 'documents');  // 'document'
 *   pluralize(0, 'document', 'documents');  // 'documents'
 *   pluralize(3, 'document', 'documents');  // 'documents'
 *
 * For ICU-aware pluralisation (with `one`/`few`/`many` categories for
 * Russian, Arabic, etc.), use `@smart-edms/i18n`'s `pickPlural` instead.
 */
export function pluralize(n: number, singular: string, plural: string): string {
  if (!Number.isFinite(n)) {
    throw new RangeError(`pluralize: n must be finite, got ${n}`);
  }
  return n === 1 ? singular : plural;
}
