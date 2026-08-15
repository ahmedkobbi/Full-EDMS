/**
 * @smart-edms/i18n — ICU plural helpers (spec §16.8)
 *
 * Uses `intl-messageformat` to format ICU MessageFormat strings. Supports
 * the full ICU plural rule set: `zero`, `one`, `two`, `few`, `many`,
 * `other`. Arabic uses all six; Russian uses `one`, `few`, `many`, `other`;
 * English/French/German use `one`/`other`; Chinese uses only `other`.
 *
 * Callers should write messages using ICU MessageFormat syntax, e.g.
 *   `{count, plural, one {# document} other {# documents}}`
 * and pass the message string + the count variable to `formatPlural()`.
 */

import IntlMessageFormat from 'intl-messageformat';
import { toIntlLocale } from './format.js';

/**
 * Input shape for a plural-rule message. Either a plain ICU MessageFormat
 * string (with embedded `{count, plural, …}`) or a record mapping plural
 * categories to message strings (in which case `formatPlural` will pick
 * the right category using `Intl.PluralRules` and use that as the message).
 */
export type PluralMessage = string | Readonly<Partial<Record<PluralCategory, string>>>;

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Format an ICU MessageFormat string with the given variables. Used by the
 * create-i18n factory and exported for callers that want to format a single
 * message outside of i18next (e.g. email templating with a raw ICU string
 * pulled from the database).
 *
 * @example
 *   formatMessage('Hello, {name}', 'fr', { name: 'Alice' });
 *   formatMessage('{count, plural, one {# document} other {# documents}}', 'ar', { count: 3 });
 */
export function formatMessage(
  template: string,
  locale: string,
  variables: Readonly<Record<string, string | number | boolean | Date>> = {},
): string {
  const intlLocale = toIntlLocale(locale);
  const formatter = new IntlMessageFormat(template, intlLocale);
  return formatter.format(variables as Record<string, string | number | boolean | Date>) as string;
}

/**
 * Pick the appropriate plural message for a count, given a mapping of
 * plural categories to message strings. Falls back to `other`, then to the
 * first available category. Returns an empty string if the mapping is empty.
 */
export function pickPlural(
  message: Readonly<Partial<Record<PluralCategory, string>>>,
  locale: string,
  count: number,
): string {
  const intlLocale = toIntlLocale(locale);
  const pr = new Intl.PluralRules(intlLocale);
  const category = pr.select(count) as PluralCategory;
  if (category in message && message[category] !== undefined) {
    return message[category] as string;
  }
  if (message.other !== undefined) {
    return message.other;
  }
  // Last resort: first available entry
  for (const key of Object.keys(message) as PluralCategory[]) {
    const v = message[key];
    if (v !== undefined) return v;
  }
  return '';
}

/**
 * Format a plural message. If `message` is a string, treat it as an ICU
 * MessageFormat template and pass `count` (plus any extra variables) to
 * `intl-messageformat`. If `message` is a record, pick the appropriate
 * category and substitute `#` with `count`.
 *
 * @example
 *   formatPlural(
 *     '{count, plural, one {# document} other {# documents}}',
 *     'ar',
 *     { count: 3 },
 *   );
 *
 *   formatPlural(
 *     { one: 'مستند واحد', other: '# مستندات' },
 *     'ar',
 *     { count: 3 },
 *   );
 */
export function formatPlural(
  message: PluralMessage,
  locale: string,
  variables: { count: number } & Readonly<Record<string, string | number | boolean | Date>>,
): string {
  if (typeof message === 'string') {
    return formatMessage(message, locale, variables);
  }
  const picked = pickPlural(message, locale, variables.count);
  // Replace `#` with the count value.
  return picked.replace(/#/g, String(variables.count));
}

/**
 * Return the list of plural categories supported by a locale, ordered by
 * the ICU plural rule evaluation order: `zero, one, two, few, many, other`.
 * Useful for validation scripts and for rendering the correct number of
 * input fields in the translation admin console.
 */
export function pluralCategoriesFor(
  locale: string,
): readonly PluralCategory[] {
  const intlLocale = toIntlLocale(locale);
  const pr = new Intl.PluralRules(intlLocale);
  // `resolvedOptions().pluralCategories` returns the categories in the
  // locale's preferred order; we normalise to the canonical ICU order.
  const categories = pr.resolvedOptions().pluralCategories as PluralCategory[];
  const order: readonly PluralCategory[] = ['zero', 'one', 'two', 'few', 'many', 'other'];
  return order.filter((c) => categories.includes(c));
}

/**
 * ICU MessageFormat template for a simple count-of-items phrase. Useful when
 * building strings programmatically (e.g. UI badges).
 *
 * @example
 *   buildCountMessage('{count, plural, one {# document} other {# documents}}', 5);
 */
export function buildCountMessage(one: string, other: string): string {
  return `{count, plural, one {${one}} other {${other}}}`;
}
