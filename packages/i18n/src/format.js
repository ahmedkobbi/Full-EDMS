"use strict";
/**
 * @smart-edms/i18n — Intl-based formatters (spec §16.7, §16.8)
 *
 * Thin wrappers around the platform `Intl` APIs that accept a Smart EDMS
 * locale code (`en | fr | ar | ru | zh-CN | de`) and produce locale-aware
 * strings. These are React-independent — they may be used from the backend
 * (email templating), the marketing site, and the Electron desktop app.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toIntlLocale = toIntlLocale;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.formatTime = formatTime;
exports.formatRelativeTime = formatRelativeTime;
exports.formatNumber = formatNumber;
exports.formatCurrency = formatCurrency;
exports.formatPercent = formatPercent;
exports.formatFileSize = formatFileSize;
exports.formatList = formatList;
exports.pluralCategory = pluralCategory;
exports.createCollator = createCollator;
const locales_js_1 = require("./locales.js");
/**
 * Resolve a Smart EDMS locale code to a BCP 47 tag suitable for `Intl`.
 * Falls back to `en` if the input is not one of the six mandatory locales
 * (the function is total — never throws).
 */
function toIntlLocale(locale) {
    if (locale in locales_js_1.INTL_LOCALE) {
        return locales_js_1.INTL_LOCALE[locale];
    }
    return 'en';
}
/**
 * Format a date. Accepts `Date`, an ISO 8601 string, or a Unix epoch number.
 * Uses `Intl.DateTimeFormat` under the hood.
 */
function formatDate(date, locale, options = {}) {
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
function formatDateTime(date, locale, options = {}) {
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
function formatTime(date, locale, options = {}) {
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
function formatRelativeTime(date, locale, now = new Date(), options = { numeric: 'auto' }) {
    const intlLocale = toIntlLocale(locale);
    const d = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date;
    const diffMs = d.getTime() - now.getTime();
    const absDiff = Math.abs(diffMs);
    const units = [
        ['second', 1000],
        ['minute', 60 * 1000],
        ['hour', 60 * 60 * 1000],
        ['day', 24 * 60 * 60 * 1000],
        ['week', 7 * 24 * 60 * 60 * 1000],
        ['month', 30 * 24 * 60 * 60 * 1000],
        ['year', 365 * 24 * 60 * 60 * 1000],
    ];
    let unit = 'second';
    let value = diffMs / 1000;
    for (const [u, ms] of units) {
        if (absDiff >= ms) {
            unit = u;
            value = diffMs / ms;
        }
        else {
            break;
        }
    }
    const rtf = new Intl.RelativeTimeFormat(intlLocale, options);
    return rtf.format(Math.round(value), unit);
}
/**
 * Format a number using `Intl.NumberFormat`.
 */
function formatNumber(value, locale, options = {}) {
    const intlLocale = toIntlLocale(locale);
    return new Intl.NumberFormat(intlLocale, options).format(value);
}
/**
 * Format a currency amount. Defaults to USD; callers should pass the tenant
 * billing currency.
 */
function formatCurrency(value, locale, currency = 'USD', options = {}) {
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
function formatPercent(value, locale, options = {}) {
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
function formatFileSize(bytes, locale, options = {}) {
    const intlLocale = toIntlLocale(locale);
    const units = [
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
function formatList(items, locale, options = { style: 'long', type: 'conjunction' }) {
    const intlLocale = toIntlLocale(locale);
    return new Intl.ListFormat(intlLocale, options).format(items);
}
/**
 * Pluralise a count using `Intl.PluralRules`. Returns one of `zero`, `one`,
 * `two`, `few`, `many`, `other` depending on the locale. The caller selects
 * the appropriate message string from a plural-rules table.
 */
function pluralCategory(count, locale) {
    const intlLocale = toIntlLocale(locale);
    const pr = new Intl.PluralRules(intlLocale);
    return pr.select(count);
}
/**
 * Collator factory. Useful for sorting locale-aware lists (folder names,
 * document titles, audit codes).
 */
function createCollator(locale, options = { sensitivity: 'base', numeric: true }) {
    const intlLocale = toIntlLocale(locale);
    return new Intl.Collator(intlLocale, options);
}
//# sourceMappingURL=format.js.map