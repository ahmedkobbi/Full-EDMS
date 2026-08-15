/**
 * Smart EDMS License Admin API client (spec §7.4, §12, §21.2, §27.3).
 *
 * Axios instance with:
 *  - Base URL from `VITE_LICENSE_SERVER_URL` (default http://localhost:4100)
 *  - Admin JWT Authorization header injected on every request
 *  - Step-up JWT injected when available (for revoke / rotate / delete flows)
 *  - Optional `X-Api-Key` header for routes that accept API-key auth (used
 *    for the "send test event" webhook flow when an admin wishes to test
 *    a webhook without leaving the admin context)
 *  - 401 handler that refreshes the admin JWT (once per failure) and retries
 *  - Accept-Language header so the licensing server localises its emails /
 *    audit messages
 *  - X-Request-Id header for distributed tracing
 *
 * The admin JWT and step-up JWT live in sessionStorage (NOT localStorage) so
 * they are scoped to the admin's tab. The refresh token lives in
 * sessionStorage too — admins close the tab when done.
 *
 * Spec ref: §27.3 — admin tokens carry `mfaVerifiedAt`; step-up tokens
 * additionally carry `stepUp: true` and a 5-minute TTL.
 */
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const BASE_URL =
  (import.meta.env.VITE_LICENSE_SERVER_URL as string | undefined) ??
  'http://localhost:4100';

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
  getStepUpToken(): string | null;
  getApiKey(): string | null;
  getLocale(): string;
  setTokens(tokens: { accessToken: string; refreshToken: string; expiresAt: string }): void;
  clearTokens(): void;
}

/** Default token provider — uses the Zustand auth store. Set in `main.tsx`. */
let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/**
 * Request interceptor: inject Authorization, Accept-Language, X-Request-Id.
 * The step-up token (when set) is sent in a separate `X-Step-Up-Token` header
 * so the StepUpGuard on the server can verify it without affecting the
 * primary admin JWT.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const provider = tokenProvider;
  if (!provider) return config;

  const token = provider.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const stepUp = provider.getStepUpToken();
  if (stepUp) {
    config.headers.set('X-Step-Up-Token', stepUp);
  }
  const apiKey = provider.getApiKey();
  if (apiKey) {
    config.headers.set('X-Api-Key', apiKey);
  }
  config.headers.set('Accept-Language', provider.getLocale());
  config.headers.set('X-Request-Id', newRequestId());
  return config;
});

/** Tracks whether a refresh is in-flight so concurrent 401s wait on it. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const provider = tokenProvider;
  if (!provider) return null;
  const refreshToken = provider.getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const res = await axios.post<{
        accessToken: string;
        refreshToken?: string;
        expiresAt: string;
      }>(
        `${BASE_URL}/v1/auth/admin/refresh`,
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (
      error.response?.status === 401 &&
      !original._retried &&
      !original.url?.includes('/auth/admin/')
    ) {
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
 * Typed wrappers. The licensing server returns raw JSON (no envelope) for
 * most admin endpoints, so we return `res.data` directly. Endpoints that
 * DO wrap in `{ data, error }` (the on-prem backend convention) are handled
 * by the caller — kept simple here because the licensing server was
 * authored without an envelope wrapper.
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<T>(url, config);
  return res.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.post<T>(url, body, config);
  return res.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.patch<T>(url, body, config);
  return res.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete<T>(url, config);
  return res.data;
}

/**
 * Make a raw GET request with `responseType: 'blob'`. Used for downloading
 * `.sedmslic` files generated by the offline activation flow.
 */
export async function apiGetBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
  const res = await apiClient.get<Blob>(url, { ...config, responseType: 'blob' });
  return res.data;
}

/**
 * Upload a `.sedmsreq` file. The file content is sent as a JSON body
 * (parsed by the server from the `.sedmsreq` text). The admin panel reads
 * the file via `FileReader` then POSTs the parsed JSON object.
 */
export async function apiPostJson<T>(
  url: string,
  body: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return apiPost<T>(url, body, config);
}

/**
 * Extract an error message key from an unknown axios error. The licensing
 * server returns `{ messageKey, messageVars }` in the body for known
 * errors (validation, auth, etc.); we surface that so the UI can render
 * `t(error.messageKey)` instead of a generic message.
 */
export interface ServerError {
  readonly messageKey?: string;
  readonly messageVars?: Record<string, string | number>;
  readonly message?: string;
  readonly statusCode?: number;
}

export function toServerError(error: unknown): ServerError {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ServerError | undefined;
    if (body && (body.messageKey || body.message)) {
      return {
        ...body,
        statusCode: error.response?.status,
      };
    }
    return {
      messageKey: error.response?.status === 403 ? 'errors.STEP_UP_REQUIRED' : 'errors.network.unexpected',
      statusCode: error.response?.status,
    };
  }
  return { messageKey: 'errors.unknown' };
}

/** Base URL (without `/v1`) — used for absolute URLs in notifications. */
export const LICENSE_SERVER_BASE_URL = BASE_URL;
