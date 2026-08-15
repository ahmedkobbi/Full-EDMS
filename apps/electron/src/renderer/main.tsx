/**
 * Smart EDMS renderer entry (spec §4.1, §27.5).
 *
 * Boots the React app:
 *  1. Initialize i18next with the bundled resources (no HTTP backend).
 *  2. Restore credentials from safeStorage (silent login if valid).
 *  3. Set up the TanStack Query client.
 *  4. Wire the auth store into the API client as the TokenProvider.
 *  5. Connect the realtime socket if a session exists.
 *  6. Mount the ThemeProvider (light/dark, no FOUC) + the router.
 *
 * Strict mode is enabled so we surface side-effect bugs early.
 */
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { initI18n, useSyncI18n } from './i18n/config';
import { ThemeProvider } from './theme/ThemeProvider';
import { App } from './App';
import { useAuthStore, selectAccessToken, selectRefreshToken, selectTenantId } from './store/auth';
import { setTokenProvider } from './api/client';
import { connectRealtime, disconnectRealtime } from './api/websocket';
import { useI18nStore as useLocaleStore } from './i18n/config';

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
 * the store when they're refreshed.
 */
setTokenProvider({
  getAccessToken: () => {
    const state = useAuthStore.getState();
    return selectAccessToken(state);
  },
  getRefreshToken: () => {
    const state = useAuthStore.getState();
    return selectRefreshToken(state);
  },
  getTenantId: () => {
    const state = useAuthStore.getState();
    return selectTenantId(state);
  },
  getLocale: () => useLocaleStore.getState().locale,
  setTokens: (tokens) => {
    useAuthStore.getState().setSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      refreshExpiresAt: tokens.expiresAt,
      tenantId: useAuthStore.getState().session?.tenantId ?? '',
      userId: useAuthStore.getState().session?.userId ?? '',
    });
  },
  clearTokens: () => {
    useAuthStore.getState().clearSession();
  },
});

function Root() {
  const initialize = useAuthStore((s) => s.initialize);
  const session = useAuthStore((s) => s.session);
  useSyncI18n();

  // Restore credentials from safeStorage on first render.
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Connect / disconnect the realtime socket based on the session.
  useEffect(() => {
    if (session) {
      connectRealtime(session.accessToken, session.tenantId);
    } else {
      disconnectRealtime();
    }
    return () => disconnectRealtime();
  }, [session]);

  return (
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(<Root />);
