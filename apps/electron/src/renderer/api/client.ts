/**
 * Smart EDMS API client (spec §14, §7.1).
 *
 * Axios instance with:
 *  - Base URL from `VITE_BACKEND_URL` (default http://localhost:4000)
 *  - JWT Authorization header injected on every request
 *  - 401 handler that refreshes the token (once per failure) and retries
 *  - Tenant header derived from the auth store
 *  - Locale header so the backend can format dates/numbers server-side
 *  - Request-id header for distributed tracing
 *
 * The JWT access token lives in memory (the Zustand auth store); the
 * refresh token lives in OS-encrypted safeStorage via the preload bridge
 * (spec §7.1 — no tokens in localStorage).
 */
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError, ApiEnvelope } from '@smart-edms/types';

const BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:4000';

/** Request-id generator — uses crypto.randomUUID when available. */
function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The Axios instance. Components should never call this directly; they
 * should use the typed hooks in `hooks.ts`.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/v1`,
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/** Shape of the token provider — abstracted so tests can stub it. */
export interface TokenProvider {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  getTenantId(): string | null;
  getLocale(): string;
  setTokens(tokens: { accessToken: string; refreshToken: string; expiresAt: string }): void;
  clearTokens(): void;
}

/** Default token provider — uses the Zustand auth store. Set in `main.tsx`. */
let tokenProvider: TokenProvider | null = null;

/**
 * Set the token provider used by the API client. Called once at app boot.
 */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/**
 * Request interceptor: inject Authorization, X-Tenant-Id, X-Request-Id,
 * Accept-Language.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const provider = tokenProvider;
  if (!provider) return config;

  const token = provider.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const tenantId = provider.getTenantId();
  if (tenantId) {
    config.headers.set('X-Tenant-Id', tenantId);
  }
  config.headers.set('Accept-Language', provider.getLocale());
  config.headers.set('X-Request-Id', newRequestId());
  return config;
});

/** Tracks whether a refresh is in-flight so concurrent 401s wait on it. */
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh the access token using the stored refresh token. Returns the new
 * access token or null if the refresh failed.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const provider = tokenProvider;
  if (!provider) return null;
  const refreshToken = provider.getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await axios.post<{ accessToken: string; refreshToken?: string; expiresAt: string }>(
        `${BASE_URL}/v1/auth/token/refresh`,
        { refreshToken },
        { headers: { 'X-Request-Id': newRequestId() } },
      );
      provider.setTokens({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken ?? refreshToken,
        expiresAt: res.data.expiresAt,
      });
      return res.data.accessToken;
    } catch {
      provider.clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Response interceptor: on 401, attempt a single refresh and retry.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status === 401 && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Typed wrapper for GET requests. Returns the unwrapped `data` field of the
 * API envelope, or throws an `ApiError`.
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<ApiEnvelope<T>>(url, config);
  return res.data.data;
}

/**
 * Typed wrapper for POST requests.
 */
export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.post<ApiEnvelope<T>>(url, body, config);
  return res.data.data;
}

/**
 * Typed wrapper for PATCH requests.
 */
export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.patch<ApiEnvelope<T>>(url, body, config);
  return res.data.data;
}

/**
 * Typed wrapper for DELETE requests.
 */
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete<ApiEnvelope<T>>(url, config);
  return res.data.data;
}

/**
 * Extract an `ApiError` from an unknown axios error. Used by hooks so the
 * UI can render `t(error.messageKey)` instead of a generic message.
 */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: ApiError } | undefined;
    if (body?.error) {
      return body.error;
    }
    return {
      code: 'INTERNAL_ERROR',
      messageKey: 'errors:network.unexpected' as unknown as ApiError['messageKey'],
      traceId: newRequestId() as unknown as ApiError['traceId'],
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    messageKey: 'errors:unknown' as unknown as ApiError['messageKey'],
    traceId: newRequestId() as unknown as ApiError['traceId'],
  };
}

/** Base URL (without `/v1`) — used by the WebSocket client. */
export const BACKEND_BASE_URL = BASE_URL;
