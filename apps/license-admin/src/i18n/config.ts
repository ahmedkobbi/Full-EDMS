/**
 * Smart EDMS License Admin i18n configuration (spec §16).
 *
 * Initialises `i18next` with the bundled resources from `@smart-edms/i18n`.
 * The panel reads from the `license`, `admin`, `audit`, `auth`, `common`,
 * `errors`, `settings`, and `tour.license` namespaces — these are all part
 * of the shared i18n package so every locale (en, fr, ar, ru, zh-CN, de) is
 * fully translated out of the box.
 *
 * Default locale resolution order (spec §16.5):
 *   1. User preference (localStorage)
 *   2. Browser language
 *   3. 'en' fallback
 *
 * RTL: when the locale is `ar`, the `<html dir="rtl">` attribute is set by
 * the ThemeProvider and Mantine's RTL support is engaged via `theme.dir`.
 */
import { useEffect } from 'react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  bundledResources,
  LOCALES,
  isRtl,
  type MandatoryLocaleCode,
} from '@smart-edms/i18n';

const STORAGE_KEY = 'smart-edms:admin:locale';

/**
 * Resolve the initial locale. The user's explicit choice (in localStorage)
 * wins; otherwise we fall back to the browser language, then 'en'.
 */
function resolveInitialLocale(): MandatoryLocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES.some((l) => l.code === stored)) {
      return stored as MandatoryLocaleCode;
    }
  } catch {
    // localStorage may be unavailable in private browsing mode.
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const match = LOCALES.find((l) => l.code === browser || browser.startsWith(l.code + '-'));
  if (match) return match.code;
  return 'en';
}

/**
 * Initialise i18next with the bundled resources. Must run before any
 * component reads a translation. Called once from `main.tsx` at module load.
 */
export function initI18n(): typeof i18next {
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
      resources: bundledResources as unknown as Parameters<typeof i18next.init>[0]['resources'],
      lng: resolveInitialLocale(),
      fallbackLng: 'en',
      supportedLngs: LOCALES.map((l) => l.code),
      defaultNS: 'common',
      fallbackNS: 'common',
      ns: ['common', 'auth', 'admin', 'license', 'audit', 'errors', 'settings', 'tour.common', 'tour.license'],
      interpolation: {
        escapeValue: false,
        formatSeparator: ',',
      },
      returnEmptyString: false,
      returnNull: false,
      react: { useSuspense: false },
      saveMissing: false,
    });
  }
  return i18next;
}

interface I18nStoreState {
  locale: MandatoryLocaleCode;
  setLocale: (locale: MandatoryLocaleCode) => void;
}

export const useI18nStore = create<I18nStoreState>()(
  persist(
    (set) => ({
      locale: resolveInitialLocale(),
      setLocale: (locale) => {
        try {
          localStorage.setItem(STORAGE_KEY, locale);
        } catch {
          // Best-effort.
        }
        void i18next.changeLanguage(locale);
        set({ locale });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ locale: state.locale }) as I18nStoreState,
    },
  ),
);

export function useSyncI18n(): void {
  const locale = useI18nStore((s) => s.locale);
  useEffect(() => {
    void i18next.changeLanguage(locale);
  }, [locale]);
}

export function useLocaleDirection(): 'ltr' | 'rtl' {
  const locale = useI18nStore((s) => s.locale);
  return isRtl(locale) ? 'rtl' : 'ltr';
}

export type { MandatoryLocaleCode };
