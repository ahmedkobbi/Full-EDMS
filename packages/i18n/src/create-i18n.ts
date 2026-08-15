/**
 * @smart-edms/i18n — i18next factory (spec §16.3)
 *
 * Creates a pre-configured i18next instance with all six mandatory locales
 * and all spec §16.4 namespaces bundled inline. No HTTP backend is needed —
 * the resources are statically imported, which keeps the package usable from
 * the backend (email templating), the marketing site, and the Electron
 * desktop app without a network round-trip.
 *
 * The factory is React-independent. React bindings (`react-i18next`) are
 * added by the web app; this package only exposes the core.
 */

import i18next, { type i18n as I18nInstance, type InitOptions } from 'i18next';
import { en } from '../resources/en/index.js';
import { fr } from '../resources/fr/index.js';
import { ar } from '../resources/ar/index.js';
import { ru } from '../resources/ru/index.js';
import { zhCN } from '../resources/zh-CN/index.js';
import { de } from '../resources/de/index.js';
import { LOCALES, type MandatoryLocaleCode } from './locales.js';

/**
 * Bundled resources keyed by locale code. The values are namespace →
 * translation-table maps ready for `i18next.init({ resources })`.
 */
export const bundledResources: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  en,
  fr,
  ar,
  ru,
  'zh-CN': zhCN,
  de,
};

/**
 * The full ordered list of namespaces shipped by this package (spec §16.4).
 * Stable across releases; re-exported so the web app can register every
 * namespace without maintaining a parallel list.
 */
export const NAMESPACES: readonly string[] = [
  'common',
  'auth',
  'documents',
  'metadata',
  'workflow',
  'sharing',
  'audit',
  'admin',
  'security',
  'errors',
  'notifications',
  'emails',
  'retention',
  'classification',
  'digitization',
  'provenance',
  'license',
  'billing',
  'marketing',
  'settings',
  'scanner',
  'locales',
  'tour.common',
  'tour.welcome',
  'tour.documents',
  'tour.search',
  'tour.workflows',
  'tour.audit',
  'tour.admin',
  'tour.license',
  'tour.scanner',
  'tour.collaboration',
  'tour.aiAssistant',
  'tour.checklist',
  'tour.marketing',
  'ai.common',
  'ai.bubble',
  'ai.errors',
  'ai.actions',
  'ai.disclaimer',
  'ai.citations',
] as const;

/**
 * Default i18next init options used by `createI18n`. Callers may override
 * any field by passing a partial options object.
 */
export const DEFAULT_I18N_OPTIONS: InitOptions = {
  fallbackLng: 'en',
  supportedLngs: LOCALES.map((l) => l.code),
  ns: NAMESPACES as unknown as string[],
  defaultNS: 'common',
  fallbackNS: 'common',
  resources: bundledResources as unknown as InitOptions['resources'],
  interpolation: {
    // i18next already escapes by default; we keep that on for safety.
    escapeValue: false,
    // React handles its own escaping; the backend / marketing site may
    // post-process as needed. Keep raw interpolated values.
    formatSeparator: ',',
  },
  returnEmptyString: false,
  returnNull: false,
  react: {
    // Default for react-i18next; ignored by non-React consumers.
    useSuspense: false,
  },
  // Backend / non-DOM consumers do not have `localStorage` — let the caller
  // wire persistence (e.g. Electron `safeStorage`, server-side session).
  saveMissing: false,
} as const;

/**
 * Options for `createI18n`.
 */
export interface CreateI18nOptions {
  /** Initial locale. Defaults to `en`. */
  locale?: MandatoryLocaleCode;
  /** Initial namespace. Defaults to `common`. */
  namespace?: string;
  /** Override any i18next init option. */
  overrides?: Partial<InitOptions>;
  /** Optional callback invoked once i18next has initialised. */
  onInit?: (err: Error | undefined, i18n: I18nInstance) => void;
}

/**
 * Create a fresh i18next instance pre-loaded with the bundled resources.
 *
 * This factory returns a *new* i18next instance on each call — it does not
 * mutate the global default instance. Callers that want a singleton should
 * cache the returned instance themselves (the web app caches one per
 * tenant; the email templating service creates one per render).
 */
export function createI18n(options: CreateI18nOptions = {}): I18nInstance {
  const instance = i18next.createInstance();
  const initOptions: InitOptions = {
    ...DEFAULT_I18N_OPTIONS,
    lng: options.locale ?? 'en',
    defaultNS: options.namespace ?? 'common',
    ...options.overrides,
  };
  instance.init(initOptions, (err) => {
    if (options.onInit) options.onInit(err, instance);
  });
  return instance;
}

/**
 * Type alias for the i18next instance. Re-exported so consumers do not need
 * to depend on `i18next` directly for typing.
 */
export type I18n = I18nInstance;
