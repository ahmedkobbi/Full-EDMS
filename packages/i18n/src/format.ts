/**
 * @smart-edms/i18n — Intl-based formatters (spec §16.7, §16.8)
 *
 * Thin wrappers around the platform `Intl` APIs that accept a Smart EDMS
 * locale code (`en | fr | ar | ru | zh-CN | de`) and produce locale-aware
 * strings. These are React-independent — they may be used from the backend
 * (email templating), the marketing site, and the Electron desktop app.
 */

import { INTL_LOCALE, type MandatoryLocaleCode } from './locales.js';

/**
 * Resolve a Smart EDMS locale code to a BCP 47 tag suitable for `Intl`.
 * Falls back to `en` if the input is not one of the six mandatory locales
 * (the function is total — never throws).
 */
export function toIntlLocale(locale: string): string {
  if (locale in INTL_LOCALE) {
    return INTL_LOCALE[locale as MandatoryLocaleCode];
  }
  return 'en';
}

/**
 * Format a date. Accepts `Date`, an ISO 8601 string, or a Unix epoch number.
 * Uses `Intl.DateTimeFormat` under the hood.
 */
export function formatDate(
  date: Date | string | number,
  locale: MandatoryLocaleCode | string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const intlLocale = toIntlLocale(locale);
  const d = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(d);
}

/**
 * Format a date and time (full timestamp).
 */
export function formatDateTime(
  date: Date | string | number,
  locale: MandatoryLocaleCode | string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Format a time-only value.
 */
export function formatTime(
  date: Date | string | number,
  locale: MandatoryLocaleCode | string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const intlLocale = toIntlLocale(locale);
  const d = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(d);
}

/**
 * Format a relative time using `Intl.RelativeTimeFormat`. Given a target
 * date, computes the difference to `now` (default: current time) and picks
 * the most appropriate unit (seconds, minutes, hours, days, weeks, months,
 * years).
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: MandatoryLocaleCode | string,
  now: Date = new Date(),
  options: Intl.RelativeTimeFormatOptions = { numeric: 'auto' },
): string {
  const intlLocale = toIntlLocale(locale);
  const d = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date;
  const diffMs = d.getTime() - now.getTime();
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

  const rtf = new Intl.RelativeTimeFormat(intlLocale, options);
  return rtf.format(Math.round(value), unit);
}

/**
 * Format a number using `Intl.NumberFormat`.
 */
export function formatNumber(
  value: number,
  locale: MandatoryLocaleCode | string,
  options: Intl.NumberFormatOptions = {},
): string {
  const intlLocale = toIntlLocale(locale);
  return new Intl.NumberFormat(intlLocale, options).format(value);
}

/**
 * Format a currency amount. Defaults to USD; callers should pass the tenant
 * billing currency.
 */
export function formatCurrency(
  value: number,
  locale: MandatoryLocaleCode | string,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions = {},
): string {
  const intlLocale = toIntlLocale(locale);
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
}

/**
 * Format a percentage value in the range 0–1 (e.g. `0.42` → `42%`).
 */
export function formatPercent(
  value: number,
  locale: MandatoryLocaleCode | string,
  options: Intl.NumberFormatOptions = {},
): string {
  const intlLocale = toIntlLocale(locale);
  return new Intl.NumberFormat(intlLocale, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
}

/**
 * Format a file size (bytes) using `Intl.NumberFormat` with `unit` style.
 * Picks the most appropriate unit (B, KB, MB, GB, TB) automatically.
 */
export function formatFileSize(
  bytes: number,
  locale: MandatoryLocaleCode | string,
  options: Intl.NumberFormatOptions = {},
): string {
  const intlLocale = toIntlLocale(locale);
  const units: Array<[number, string]> = [
    [1024 ** 4, 'terabyte'],
    [1024 ** 3, 'gigabyte'],
    [1024 ** 2, 'megabyte'],
    [1024, 'kilobyte'],
    [1, 'byte'],
  ];
  for (const [threshold, unit] of units) {
    if (bytes >= threshold) {
      return new Intl.NumberFormat(intlLocale, {
        style: 'unit',
        unit,
        maximumFractionDigits: 1,
        ...options,
      }).format(bytes / threshold);
    }
  }
  return new Intl.NumberFormat(intlLocale, {
    style: 'unit',
    unit: 'byte',
    ...options,
  }).format(bytes);
}

/**
 * Format a list of strings using `Intl.ListFormat`. Useful for enumerating
 * recipients, audit actor chains, etc.
 */
export function formatList(
  items: readonly string[],
  locale: MandatoryLocaleCode | string,
  options: Intl.ListFormatOptions = { style: 'long', type: 'conjunction' },
): string {
  const intlLocale = toIntlLocale(locale);
  return new Intl.ListFormat(intlLocale, options).format(items as string[]);
}

/**
 * Pluralise a count using `Intl.PluralRules`. Returns one of `zero`, `one`,
 * `two`, `few`, `many`, `other` depending on the locale. The caller selects
 * the appropriate message string from a plural-rules table.
 */
export function pluralCategory(
  count: number,
  locale: MandatoryLocaleCode | string,
): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' {
  const intlLocale = toIntlLocale(locale);
  const pr = new Intl.PluralRules(intlLocale);
  return pr.select(count) as 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

/**
 * Collator factory. Useful for sorting locale-aware lists (folder names,
 * document titles, audit codes).
 */
export function createCollator(
  locale: MandatoryLocaleCode | string,
  options: Intl.CollatorOptions = { sensitivity: 'base', numeric: true },
): Intl.Collator {
  const intlLocale = toIntlLocale(locale);
  return new Intl.Collator(intlLocale, options);
}
