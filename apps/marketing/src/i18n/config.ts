/**
 * Smart EDMS marketing site — i18next configuration (spec §16, §7.5).
 *
 * Initializes i18next with the bundled resources from `@smart-edms/i18n`.
 * The marketing site reads from the `marketing` namespace (default), with
 * `common` as the fallback for shared strings.
 *
 * Initialisation model:
 *   - The server creates ONE i18next instance per request, set to the locale
 *     extracted from the `[locale]` param. Server components call
 *     `getServerI18n(locale)` and read keys with `instance.t(...)`.
 *   - The client gets a single i18next instance via the I18nProvider, set to
 *     the locale of the current page. Client components call `useTranslation()`
 *     from `react-i18next`.
 *
 * IMPORTANT: This file MUST NOT import `react-i18next`. Doing so pulls in
 * React's `createContext` at module-load time, which breaks Next.js's
 * server-side rendering because React's `createContext` is undefined when
 * called outside a client component boundary. The client-side `react-i18next`
 * binding lives in `I18nProvider.tsx`, which is marked `'use client'`.
 *
 * No HTTP backend — every namespace is statically imported, which keeps the
 * marketing site fast (no extra round-trips) and lets the site work on
 * air-gapped static hosting if needed.
 */

import i18next, { type i18n as I18nInstance } from 'i18next';
import {
  bundledResources,
  LOCALES,
  type MandatoryLocaleCode,
} from '@smart-edms/i18n';

/**
 * The namespaces the marketing site reads from. The marketing namespace holds
 * every public-facing string; common is the fallback for any shared utility
 * strings.
 */
export const MARKETING_NAMESPACES = ['marketing', 'common'] as const;

/**
 * Cache of initialised i18next instances, one per locale. Server components
 * reuse these across requests within the same Node process — i18next instances
 * are pure data holders (no per-request state) so this is safe.
 */
const serverInstances = new Map<MandatoryLocaleCode, I18nInstance>();

/**
 * Returns a server-side i18next instance configured for `locale`. Safe to call
 * from React server components and route handlers.
 *
 * Does NOT call `initReactI18next` — that would require importing
 * `react-i18next`, which is a client-only module.
 */
export function getServerI18n(locale: MandatoryLocaleCode): I18nInstance {
  let instance = serverInstances.get(locale);
  if (instance) {return instance;}
  instance = i18next.createInstance();
  instance.init({
    resources: bundledResources as unknown as Parameters<typeof i18next.init>[0]['resources'],
    lng: locale,
    fallbackLng: 'en',
    supportedLngs: LOCALES.map((l) => l.code),
    defaultNS: 'marketing',
    fallbackNS: 'common',
    ns: [...MARKETING_NAMESPACES],
    interpolation: {
      escapeValue: false,
      formatSeparator: ',',
    },
    returnEmptyString: false,
    returnNull: false,
    react: { useSuspense: false },
    saveMissing: false,
  });
  serverInstances.set(locale, instance);
  return instance;
}

/**
 * Server-side translation helper. Resolves a key in the marketing namespace
 * (falls back to common if the key is not found in marketing).
 *
 * Example:
 *   const t = serverT('fr');
 *   t('hero.title'); // -> "Documents qui respectent la conformité..."
 */
export function serverT(locale: MandatoryLocaleCode) {
  const instance = getServerI18n(locale);
  return instance.t.bind(instance);
}

export type { MandatoryLocaleCode } from '@smart-edms/i18n';
