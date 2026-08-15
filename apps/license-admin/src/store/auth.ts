/**
 * Smart EDMS License Admin auth store (Zustand, spec §7.4, §21.2, §27.3).
 *
 * Holds the admin JWT access token, the refresh token, and the step-up JWT
 * (used for sensitive operations: license revoke, signing-key rotation,
 * API-key revoke).
 *
 * Storage strategy (spec §27.3):
 *  - Access + refresh tokens live in `sessionStorage` so they are scoped to
 *    the admin's tab and discarded when the tab closes. Admins typically
 *    complete their work in a single tab.
 *  - Step-up tokens live in MEMORY ONLY (never persisted) because they are
 *    short-lived (5-minute TTL per spec §27.3) and should never survive a
 *    page reload — the admin must re-enter their MFA code after a reload.
 *
 * Step-up flow:
 *   1. The user clicks "Revoke license" (or "Rotate key", or "Delete API key").
 *   2. The UI opens a step-up modal asking for the current TOTP code.
 *   3. The auth store calls `/v1/auth/admin/mfa/step-up` with the code.
 *   4. On success the store holds the step-up token in memory + records its
 *      expiry timestamp.
 *   5. The API client reads `getStepUpToken()` and attaches it as the
 *      `X-Step-Up-Token` header on every subsequent request.
 *   6. The sensitive mutation fires; the server's `StepUpGuard` verifies
 *      the step-up token's `mfaVerifiedAt` is within the TTL.
 *   7. After the mutation completes (or after 5 minutes), the step-up token
 *      is cleared.
 */
import { create } from 'zustand';

const SESSION_KEY = 'smart-edms:admin:session';

interface AdminSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly admin: { readonly sub: string; readonly email: string; readonly role: string };
}

interface PersistedSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly admin: { readonly sub: string; readonly email: string; readonly role: string };
}

function loadSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    // Validate the access token has not expired. If it has, we still keep
    // the session (the API client will refresh on the next request), but
    // if the expiry is more than 24h past we treat the session as stale.
    const expiresAtMs = new Date(parsed.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) return null;
    if (Date.now() - expiresAtMs > 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: AdminSession | null): void {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Best-effort.
  }
}

interface AuthStoreState {
  /** Current admin session, or null if logged out. */
  session: AdminSession | null;
  /** True until the initial sessionStorage restore attempt completes. */
  initializing: boolean;
  /** Step-up token (in-memory only). */
  stepUpToken: string | null;
  /** Step-up token expiry (epoch ms). */
  stepUpExpiresAt: number | null;

  setSession: (session: AdminSession) => void;
  clearSession: () => void;
  initialize: () => void;

  setStepUpToken: (token: string, expiresAt: string) => void;
  clearStepUpToken: () => void;
  /** True when a valid (non-expired) step-up token is held. */
  hasStepUp: () => boolean;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  session: null,
  initializing: true,
  stepUpToken: null,
  stepUpExpiresAt: null,

  setSession: (session) => {
    set({ session });
    saveSession(session);
  },

  clearSession: () => {
    set({ session: null, stepUpToken: null, stepUpExpiresAt: null });
    saveSession(null);
  },

  initialize: () => {
    const session = loadSession();
    set({ session, initializing: false });
  },

  setStepUpToken: (token, expiresAt) => {
    const expiresAtMs = new Date(expiresAt).getTime();
    set({ stepUpToken: token, stepUpExpiresAt: expiresAtMs });
  },

  clearStepUpToken: () => {
    set({ stepUpToken: null, stepUpExpiresAt: null });
  },

  hasStepUp: () => {
    const expiresAt = get().stepUpExpiresAt;
    if (!expiresAt) return false;
    return Date.now() < expiresAt;
  },
}));

// ---------------------------------------------------------------------------
// Convenience selectors
// ---------------------------------------------------------------------------

export const selectIsAuthenticated = (s: AuthStoreState): boolean => s.session !== null;
export const selectAccessToken = (s: AuthStoreState): string | null =>
  s.session?.accessToken ?? null;
export const selectRefreshToken = (s: AuthStoreState): string | null =>
  s.session?.refreshToken ?? null;
export const selectAdminProfile = (s: AuthStoreState): AdminSession['admin'] | null =>
  s.session?.admin ?? null;
export const selectStepUpToken = (s: AuthStoreState): string | null => {
  if (!s.stepUpExpiresAt) return null;
  if (Date.now() >= s.stepUpExpiresAt) return null;
  return s.stepUpToken;
};
export const selectHasStepUp = (s: AuthStoreState): boolean => {
  if (!s.stepUpExpiresAt) return false;
  return Date.now() < s.stepUpExpiresAt;
};
export const selectStepUpExpiresAt = (s: AuthStoreState): number | null => s.stepUpExpiresAt;
