/**
 * @smart-edms/utils — date helpers.
 *
 * Small, dependency-free helpers for the most common date operations. For
 * locale-aware formatting (month names, relative time like "3 hours ago"
 * in Arabic, etc.), use `@smart-edms/i18n`'s `formatDate` /
 * `formatRelativeTime` instead — those wrap the platform `Intl` APIs and
 * pick up the user's locale.
 *
 *  - `toISODate(d)` — convert a `Date` to an ISO 8601 UTC string.
 *  - `fromISODate(s)` — parse an ISO 8601 string to a `Date`.
 *  - `formatRelative(d, locale)` — thin `Intl.RelativeTimeFormat` wrapper.
 *  - `isExpired(d)` — true if `d` is in the past.
 *  - `daysUntil(d)` — integer day count from now until `d` (negative if past).
 */

/**
 * Convert a `Date`, ISO 8601 string, or Unix epoch number to an ISO 8601
 * UTC string (`YYYY-MM-DDTHH:mm:ss.sssZ`). Returns `null` for invalid input.
 *
 * @example
 *   toISODate(new Date('2025-01-31T08:30:00Z')); // '2025-01-31T08:30:00.000Z'
 */
export function toISODate(d: Date | string | number): string | null {
  let date: Date;
  if (d instanceof Date) {
    date = d;
  } else if (typeof d === 'string') {
    date = new Date(d);
  } else if (typeof d === 'number') {
    date = new Date(d);
  } else {
    return null;
  }
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Parse an ISO 8601 string into a `Date`. Returns `null` for invalid input
 * rather than throwing — callers should treat `null` as "could not parse".
 *
 * Accepts both full datetime strings (`2025-01-31T08:30:00.000Z`) and
 * date-only strings (`2025-01-31`); the latter is interpreted as UTC midnight.
 */
export function fromISODate(s: string): Date | null {
  if (typeof s !== 'string' || s.length === 0) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Format a date as a relative time string ("3 hours ago", "in 2 days") in
 * the given locale. Thin wrapper around `Intl.RelativeTimeFormat`.
 *
 * @param d      — target date (Date, ISO string, or epoch ms).
 * @param locale — BCP 47 tag (e.g. `en`, `ar`, `zh-CN`). Default `'en'`.
 * @param now    — reference "now" timestamp (default: current time). Useful
 *                 for deterministic tests.
 */
export function formatRelative(
  d: Date | string | number,
  locale: string = 'en',
  now: Date = new Date(),
): string {
  const target = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(target.getTime())) return '';
  const diffMs = target.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);

  const units: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 1000],
    ['minute', 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['year', 365 * 24 * 60 * 60 * 1000],
  ];

  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let value = diffMs / 1000;
  for (const [u, ms] of units) {
    if (absDiff >= ms) {
      unit = u;
      value = diffMs / ms;
    } else {
      break;
    }
  }
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(value), unit);
}

/**
 * Return `true` if `d` is strictly in the past relative to `now` (default:
 * the current time). Returns `false` for invalid dates.
 */
export function isExpired(d: Date | string | number, now: Date = new Date()): boolean {
  const target = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() < now.getTime();
}

/**
 * Compute the number of whole days from `now` (default: current time) until
 * `d`. Returns a negative number if `d` is in the past. Returns `0` if the
 * target is less than 24 hours away. Returns `null` for invalid dates.
 *
 * @example
 *   daysUntil(new Date(Date.now() + 3 * 86400_000)); // 3
 *   daysUntil(new Date(Date.now() - 2 * 86400_000)); // -2
 */
export function daysUntil(d: Date | string | number, now: Date = new Date()): number | null {
  const target = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - now.getTime();
  // Truncate toward zero so partial days don't round up.
  return Math.trunc(ms / 86_400_000);
}
