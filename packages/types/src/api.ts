/**
 * @smart-edms/types — REST API envelope, pagination, health (spec §14)
 *
 * Purpose: model the canonical API response envelope, cursor pagination
 * params, sort order, health-check response, and the shared `ApiErrorCode`
 * vocabulary. Re-exports the common pagination primitives so consumers
 * can import the full API surface from one module.
 */

import type { ApiError } from './common';

// Re-export for convenience so consumers can import everything from this module.
export type { ApiError, ApiErrorCode, CursorPaginationParams, SortOrder } from './common';

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

/**
 * Canonical success envelope returned by every JSON endpoint on success.
 * Failures return `ApiError` directly with the appropriate HTTP status.
 *
 * @example
 *   const res: ApiEnvelope<Document> = { ok: true, data: doc };
 */
export interface ApiEnvelope<T> {
  readonly ok: true;
  readonly data: T;
  /** Optional trace id echoed back to the client. */
  readonly traceId?: string;
}

/**
 * Canonical failure envelope. Returned alongside a non-2xx HTTP status.
 * The client renders user-facing messages via `t(error.messageKey, error.messageVars)`.
 */
export interface ApiErrorEnvelope {
  readonly ok: false;
  readonly error: ApiError;
}

/**
 * Union of success and failure envelopes. Used by client-side fetchers
 * that need to discriminate at runtime.
 */
export type ApiResponse<T> = ApiEnvelope<T> | ApiErrorEnvelope;

// ---------------------------------------------------------------------------
// Pagination (spec §14.3)
// ---------------------------------------------------------------------------

/**
 * Cursor pagination params accepted by list endpoints. `limit` is bounded
 * server-side; `cursor` is opaque to the client. Unbounded queries are
 * forbidden (spec §14.3). Re-exported from `./common`; the alias lives here
 * for API-module convenience.
 */
// `CursorPaginationParams` and `SortOrder` are re-exported above from `./common`.

/**
 * Generic paginated response (spec §14.3). `nextCursor` is `null` when
 * the end of the result set is reached; `hasMore` is the convenient
 * boolean form for clients that don't propagate cursors.
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  /** Total count, when computable cheaply; otherwise `null`. */
  readonly total: number | null;
}

// ---------------------------------------------------------------------------
// Error envelopes
// ---------------------------------------------------------------------------

// `ApiError` and `ApiErrorCode` are re-exported above from `./common`.

// ---------------------------------------------------------------------------
// Health check (spec §14.4 — `health` module)
// ---------------------------------------------------------------------------

/** Health status of a single dependency. */
export type DependencyStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

/**
 * Health-check response returned by `GET /v1/health`. Aggregates the status
 * of upstream dependencies (database, Redis, BullMQ, OpenSearch, AI gateway,
 * license server).
 */
export interface HealthCheck {
  readonly status: 'healthy' | 'degraded' | 'down';
  readonly version: string;
  readonly uptimeSeconds: number;
  readonly timestamp: string;
  readonly dependencies: ReadonlyArray<{
    readonly name: string;
    readonly status: DependencyStatus;
    readonly latencyMs: number | null;
    readonly details: Readonly<Record<string, unknown>> | null;
  }>;
  /** Current license state, surfaced for ops dashboards. */
  readonly licenseState: string;
  readonly tenantId: string | null;
}

// ---------------------------------------------------------------------------
// Rate-limit headers
// ---------------------------------------------------------------------------

/**
 * Standard rate-limit metadata returned by sensitive endpoints. Mirrors
 * the IETF draft-ietf-httpapi-ratelimit-headers format.
 */
export interface RateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  /** Reset time in seconds from now. */
  readonly reset: number;
  readonly policy: string;
}
