/**
 * Smart EDMS renderer i18n configuration (spec §16).
 *
 * Initializes `i18next` with the bundled resources from `@smart-edms/i18n`
 * (no HTTP backend — every namespace is statically imported at build time).
 * The active locale is persisted to `localStorage` and exposed via a small
 * Zustand store so components can subscribe to locale changes.
 *
 * Default locale resolution order (spec §16.5):
 *   1. User preference (localStorage) — explicit user choice
 *   2. Browser language — automatic detection
 *   3. Tenant default — set by the backend on the login page
 *   4. 'en' — fallback (always supported)
 *
 * RTL: when the locale is `ar`, the `<html dir="rtl">` attribute is set
 * (handled in ThemeProvider) and Mantine's RTL support is engaged via the
 * `theme.dir = 'rtl'` field.
 */
import { useEffect } from 'react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  bundledResources,
  LOCALES,
  type MandatoryLocaleCode,
} from '@smart-edms/i18n';
import type { ThemePreference } from '@smart-edms/types';

const STORAGE_KEY = 'smart-edms:locale';

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

  // Browser language detection.
  const browser = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const match = LOCALES.find((l) => l.code === browser || browser.startsWith(l.code + '-'));
  if (match) {return match.code;}

  return 'en';
}

/**
 * Initialize i18next with the bundled resources. This must run before any
 * component reads a translation. The renderer's `main.tsx` calls this once
 * at module load.
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
      interpolation: {
        escapeValue: false,
        formatSeparator: ',',
      },
      returnEmptyString: false,
      returnNull: false,
      react: {
        useSuspense: false,
      },
      saveMissing: false,
    });
  }
  return i18next;
}

interface I18nStoreState {
  locale: MandatoryLocaleCode;
  setLocale: (locale: MandatoryLocaleCode) => void;
}

/**
 * Zustand store for the active locale. The store persists the locale to
 * localStorage so the next session resumes with the user's preferred
 * language.
 */
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
      // Only persist the locale string, not the setter.
      partialize: (state) => ({ locale: state.locale }) as I18nStoreState,
    },
  ),
);

/**
 * Hook that syncs the i18next instance with the Zustand store. Called once
 * at the top of the renderer tree so any locale change in the store is
 * immediately reflected in the i18next instance.
 */
export function useSyncI18n(): void {
  const locale = useI18nStore((s) => s.locale);
  useEffect(() => {
    void i18next.changeLanguage(locale);
  }, [locale]);
}

// Re-export for convenience.
export type { MandatoryLocaleCode, ThemePreference };
