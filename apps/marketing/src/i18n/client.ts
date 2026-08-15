'use client';

/**
 * Smart EDMS marketing site — client-side i18n init (spec §16, §7.5).
 *
 * Initialises the global i18next singleton with the `react-i18next` plugin so
 * that client components can call `useTranslation()`. This file is the ONLY
 * place in the marketing app that imports `react-i18next` — keeping it
 * isolated in a `'use client'` module prevents Next.js from bundling
 * `react-i18next`'s `createContext` call into server chunks (which would
 * break SSR — see `src/i18n/config.ts` for the full rationale).
 *
 * Called once by `I18nProvider` on mount. After init, `useTranslation()` in
 * any client component reads from the global i18next instance.
 */

import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  bundledResources,
  LOCALES,
  type MandatoryLocaleCode,
} from '@smart-edms/i18n';
import { MARKETING_NAMESPACES } from './config';

/**
 * Initialise the client-side i18next singleton. Must be called once before any
 * client component reads a translation. Called by `I18nProvider` on mount.
 *
 * Returns the i18next instance so the caller can chain additional configuration
 * if needed.
 */
export function initClientI18n(locale: MandatoryLocaleCode): I18nInstance {
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
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
  } else if (i18next.language !== locale) {
    void i18next.changeLanguage(locale);
  }
  return i18next;
}
