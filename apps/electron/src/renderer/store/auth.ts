/**
 * Smart EDMS auth store (Zustand, spec §9.1, §7.1).
 *
 * Holds the JWT access token in memory only. The refresh token (and a
 * backup of the access token) is persisted to OS-encrypted safeStorage via
 * the preload bridge (`window.smartEdms.saveCredentials`).
 *
 * The store exposes a TokenProvider-compatible interface so the API client
 * can read the access token for the Authorization header without coupling
 * to the store's internal shape.
 *
 * On boot, the store attempts to restore credentials from safeStorage. If
 * the restore succeeds and the access token is still valid, the user is
 * logged in automatically (silent restore, spec §9.1).
 */
import { create } from 'zustand';
import type {
  AuthToken,
  ISODateString,
  TenantId,
  UserId,
} from '@smart-edms/types';

interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly refreshExpiresAt: string;
  readonly tenantId: string;
  readonly userId: string;
}

interface AuthStoreState {
  /** Current session, or null if logged out. */
  session: AuthSession | null;
  /** True until the initial safeStorage restore attempt completes. */
  initializing: boolean;

  // Mutations
  setSession: (session: AuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
  initialize: () => Promise<void>;
}

/**
 * Persist the session to OS-encrypted safeStorage via the preload bridge.
 */
async function persistSession(session: AuthSession | null): Promise<void> {
  if (!window.smartEdms) {return;}
  if (session) {
    await window.smartEdms.saveCredentials({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      tenantId: session.tenantId,
      userId: session.userId,
    });
  } else {
    await window.smartEdms.clearCredentials();
  }
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  session: null,
  initializing: true,

  setSession: async (session) => {
    set({ session });
    await persistSession(session);
  },

  clearSession: async () => {
    set({ session: null });
    await persistSession(null);
  },

  initialize: async () => {
    try {
      if (window.smartEdms?.getCredentials) {
        const stored = await window.smartEdms.getCredentials();
        if (stored) {
          // Check token expiry — if the access token has expired, the API
          // client will attempt a refresh on the next request.
          const now = Date.now();
          const expiresAtMs = new Date(stored.expiresAt).getTime();
          if (expiresAtMs > now) {
            set({
              session: {
                accessToken: stored.accessToken,
                refreshToken: stored.refreshToken,
                expiresAt: stored.expiresAt,
                refreshExpiresAt: stored.expiresAt, // best-effort
                tenantId: stored.tenantId,
                userId: stored.userId,
              },
              initializing: false,
            });
            return;
          }
        }
      }
    } catch {
      // Best-effort — fall through to logged-out state.
    }
    set({ session: null, initializing: false });
  },
}));

/**
 * Convenience selectors.
 */
export const selectIsAuthenticated = (s: AuthStoreState): boolean => s.session !== null;
export const selectAccessToken = (s: AuthStoreState): string | null =>
  s.session?.accessToken ?? null;
export const selectRefreshToken = (s: AuthStoreState): string | null =>
  s.session?.refreshToken ?? null;
export const selectTenantId = (s: AuthStoreState): string | null =>
  s.session?.tenantId ?? null;
export const selectUserId = (s: AuthStoreState): string | null =>
  s.session?.userId ?? null;

// Branded aliases for consumers that want the typed form.
export type { AuthToken, TenantId, UserId, ISODateString };
