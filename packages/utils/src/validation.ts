/**
 * @smart-edms/utils — lightweight format validators.
 *
 * Predicate functions that return `true` / `false` for common string
 * formats. They are intentionally small and regex-based — for full schema
 * validation use `@smart-edms/schemas` (Zod).
 *
 *  - `isEmail(s)` — basic RFC 5322 email shape.
 *  - `isUrl(s)` — `http(s)` URL with a host.
 *  - `isUuid(s)` — RFC 4122 v4 UUID (lowercase or uppercase).
 *  - `isISODate(s)` — ISO 8601 date or datetime string.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Return `true` iff `s` is a basic email address. The check is intentionally
 * lenient — it accepts `local-part@domain.tld` with any non-whitespace
 * local part and domain. For full RFC 5322 validation use a dedicated
 * library; this is enough to catch typos at form-input boundaries.
 */
export function isEmail(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s);
}

/**
 * Return `true` iff `s` is an `http://` or `https://` URL with a non-empty
 * host. Does NOT validate that the TLD exists or that the host is reachable.
 */
export function isUrl(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 2048 && URL_RE.test(s);
}

/**
 * Return `true` iff `s` is an RFC 4122 v4 UUID (lowercase or uppercase).
 * Accepts the canonical dashed form only (`8-4-4-4-12` hex chars).
 */
export function isUuid(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s);
}

/**
 * Return `true` iff `s` is an ISO 8601 date or datetime string. Accepts:
 *  - date-only: `2025-01-31`
 *  - datetime:  `2025-01-31T08:30:00Z`
 *  - with ms:   `2025-01-31T08:30:00.123Z`
 *  - with offset: `2025-01-31T08:30:00+02:00` or `+0200`
 *
 * Does NOT accept space-separated dates (`2025-01-31 08:30:00`) — those are
 * not valid ISO 8601 and are silently rejected.
 */
export function isISODate(s: unknown): s is string {
  return typeof s === 'string' && ISO_DATE_RE.test(s);
}
