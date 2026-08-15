/**
 * @smart-edms/i18n — package entry point
 *
 * Exports:
 * - Locale metadata and helpers (spec §16.1, §16.6, §4.5)
 * - Intl-based formatters (spec §16.7, §16.8)
 * - ICU plural helpers (spec §16.8)
 * - i18next factory with bundled resources (spec §16.3)
 * - Bundled resources themselves (for non-i18next consumers)
 *
 * React-independent — no `react-i18next` dependency here. Web apps compose
 * `createI18n()` with `react-i18next`'s `initReactI18next` plugin.
 */

export {
  LOCALES,
  INTL_LOCALE,
  getLocaleMeta,
  isRtl,
  defaultFlagIndicator,
  type LocaleMeta,
  type MandatoryLocaleCode,
} from './locales.js';

export {
  toIntlLocale,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatFileSize,
  formatList,
  pluralCategory,
  createCollator,
} from './format.js';

export {
  formatMessage,
  formatPlural,
  pickPlural,
  pluralCategoriesFor,
  buildCountMessage,
  type PluralMessage,
  type PluralCategory,
} from './plural.js';

export {
  createI18n,
  bundledResources,
  NAMESPACES,
  DEFAULT_I18N_OPTIONS,
  type I18n,
  type CreateI18nOptions,
} from './create-i18n.js';

// Bundled resources — re-exported so consumers can use them without i18next
// (e.g. backend email templating pulls a single key directly).
export { en } from '../resources/en/index.js';
export { fr } from '../resources/fr/index.js';
export { ar } from '../resources/ar/index.js';
export { ru } from '../resources/ru/index.js';
export { zhCN } from '../resources/zh-CN/index.js';
export { de } from '../resources/de/index.js';
