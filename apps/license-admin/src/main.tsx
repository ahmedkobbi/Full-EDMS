/**
 * Smart EDMS License Admin entry (spec §7.4, §12.10).
 *
 * Boots the React app:
 *  1. Initialize i18next with the bundled resources (no HTTP backend).
 *  2. Restore credentials from sessionStorage (silent login if valid).
 *  3. Set up the TanStack Query client.
 *  4. Wire the auth store into the API client as the TokenProvider.
 *  5. Mount the MantineProvider (light/dark/system, no FOUC) + the router.
 *
 * Strict mode is enabled so we surface side-effect bugs early.
 *
 * Note: Mantine v7.13+ removed `ColorSchemeProvider`. The `MantineProvider`
 * directly accepts `forceColorScheme` (which takes 'light' | 'dark' — no
 * 'auto'). We resolve the user's `system` preference ourselves and pass
 * the resolved scheme to `forceColorScheme`.
 */
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/ar';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/de';

import { initI18n, useI18nStore, useSyncI18n } from './i18n/config';
import { useThemeStore } from './store/theme';
import { useAuthStore, selectAccessToken, selectRefreshToken, selectStepUpToken } from './store/auth';
import { setTokenProvider } from './api/client';
import { buildTheme } from './theme/theme';
import { isRtl } from '@smart-edms/i18n';
import { App } from './App';

// Initialize i18next before anything reads a translation.
initI18n();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Wire the auth store into the API client. The client reads the access
 * token from the store on every request and writes refresh tokens back to
 * the store when they're refreshed. The step-up token is attached as
 * `X-Step-Up-Token` for sensitive operations.
 */
setTokenProvider({
  getAccessToken: () => selectAccessToken(useAuthStore.getState()),
  getRefreshToken: () => selectRefreshToken(useAuthStore.getState()),
  getStepUpToken: () => selectStepUpToken(useAuthStore.getState()),
  getApiKey: () => null,
  getLocale: () => useI18nStore.getState().locale,
  setTokens: (tokens) => {
    const current = useAuthStore.getState().session;
    if (current) {
      useAuthStore.getState().setSession({
        ...current,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
    }
  },
  clearTokens: () => {
    useAuthStore.getState().clearSession();
  },
});

function Root() {
  const initialize = useAuthStore((s) => s.initialize);
  const preference = useThemeStore((s) => s.preference);
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const setResolvedScheme = useThemeStore((s) => s.setResolvedScheme);
  const locale = useI18nStore((s) => s.locale);
  useSyncI18n();

  // Restore credentials from sessionStorage on first render.
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Resolve the color scheme from the user preference + the OS preference.
  useEffect(() => {
    if (preference !== 'system') {
      setResolvedScheme(preference);
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setResolvedScheme(media.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setResolvedScheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [preference, setResolvedScheme]);

  // Apply the resolved scheme to the document element.
  useEffect(() => {
    document.documentElement.setAttribute('data-mantine-color-scheme', resolvedScheme);
    document.documentElement.style.colorScheme = resolvedScheme;
  }, [resolvedScheme]);

  // Apply direction + lang whenever the locale changes.
  useEffect(() => {
    const dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale]);

  const theme = buildTheme(resolvedScheme === 'dark' ? 'dark' : 'light');

  return (
    <StrictMode>
      <MantineProvider theme={theme} forceColorScheme={resolvedScheme === 'dark' ? 'dark' : 'light'}>
        <DatesProvider settings={{ locale, firstDayOfWeek: 1 }}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </QueryClientProvider>
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </StrictMode>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(<Root />);
