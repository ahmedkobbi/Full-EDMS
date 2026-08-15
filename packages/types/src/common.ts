/**
 * @smart-edms/types — common primitives
 *
 * Purpose: foundational branded identifiers, locale enum, error contract,
 * pagination, and result types shared across every Smart EDMS domain.
 *
 * Conventions enforced here (and across the package):
 * - No `any`. Untrusted input uses `unknown` plus a type guard.
 * - All timestamps are ISO 8601 UTC strings (`ISODateString`).
 * - All IDs are branded nominal types so that a `UserId` cannot be
 *   accidentally passed where a `DocumentId` is expected.
 * - Enums are string literal unions (no runtime `enum` keyword).
 * - JSDoc describes the purpose and constraints of each exported symbol.
 */

// ---------------------------------------------------------------------------
// Branded nominal typing helpers
// ---------------------------------------------------------------------------

/**
 * Generic branded type. Used to give a structural type a unique nominal
 * identity at compile time without runtime overhead.
 *
 * @example
 *   type UserId = Branded<string, 'UserId'>;
 */
export type Branded<T, B extends string> = T & { readonly __brand: B };

/**
 * Alias for the brand marker, exported so consumers can construct their own
 * branded IDs without redeclaring the helper.
 */
export type Brand = { readonly __brand: string };

// ---------------------------------------------------------------------------
// Core identifier primitives
// ---------------------------------------------------------------------------

/**
 * Canonical Smart EDMS identifier. Per spec §15.4 we use UUIDv7, ULID, or
 * equivalent sortable globally unique identifiers. The string form is
 * canonical lower-case.
 */
export type UUID = Branded<string, 'UUID'>;

/** ISO 8601 UTC timestamp string, e.g. `2025-01-31T08:30:00.000Z`. */
export type ISODateString = Branded<string, 'ISODateString'>;

/** Opaque pagination cursor — clients must treat this as an opaque token. */
export type Cursor = Branded<string, 'Cursor'>;

/** Stable, machine-readable message key used with `t()` (e.g. `errors.forbidden`). */
export type MessageKey = Branded<string, 'MessageKey'>;

/** Stable, machine-readable error code, e.g. `LICENSE_EXPIRED`. */
export type ErrorCode = Branded<string, 'ErrorCode'>;

/** RFC 5646 / BCP 47 language tag, e.g. `en`, `ar`, `zh-CN`. */
export type Locale = Branded<string, 'Locale'>;

/** IANA timezone identifier, e.g. `Europe/Paris`, `Asia/Dubai`. */
export type Timezone = Branded<string, 'Timezone'>;

/** Cryptographic hash digest in hexadecimal lower-case form. */
export type HashHex = Branded<string, 'HashHex'>;

/** SHA-256, SHA-3-256, BLAKE3, etc. — the algorithm name. */
export type HashAlgorithm = 'sha256' | 'sha384' | 'sha512' | 'sha3-256' | 'sha3-512' | 'blake3';

/** BCP 47 language tag for content language (may differ from UI locale). */
export type ContentLanguage = Locale;

// ---------------------------------------------------------------------------
// Mandatory locales (spec §16.1)
// ---------------------------------------------------------------------------

/**
 * The six mandatory Smart EDMS locales shipped from day one.
 * Arabic (`ar`) is RTL; all others are LTR unless a future locale adds RTL.
 */
export type MandatoryLocale = 'en' | 'fr' | 'ar' | 'ru' | 'zh-CN' | 'de';

/** Locale direction used by Mantine RTL setup and CSS logical properties. */
export type LocaleDirection = 'ltr' | 'rtl';

// ---------------------------------------------------------------------------
// Result / Either
// ---------------------------------------------------------------------------

/**
 * Success variant of `Result<T>`. Use `ok(value)` constructors at the edge
 * of the application; do not construct this type by hand in business logic.
 */
export interface OkResult<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Failure variant of `Result<T>`. Carries a stable `ErrorCode` plus a
 * localized `MessageKey` and optional interpolation variables.
 */
export interface ErrResult {
  readonly ok: false;
  readonly error: ApiError;
}

/**
 * Discriminated union used by service-layer functions that can fail in
 * expected, recoverable ways. Unexpected errors should still throw.
 */
export type Result<T> = OkResult<T> | ErrResult;

// ---------------------------------------------------------------------------
// Pagination contracts (spec §14.3)
// ---------------------------------------------------------------------------

/**
 * Cursor-based pagination parameters accepted by every list endpoint.
 * `limit` is bounded server-side; `cursor` is opaque to the client.
 */
export interface CursorPaginationParams {
  readonly limit?: number;
  readonly cursor?: Cursor | null;
  readonly sort?: SortOrder;
}

/**
 * Sort direction. Sort field whitelisting is enforced server-side.
 */
export type SortOrder = 'asc' | 'desc' | { readonly field: string; readonly direction: 'asc' | 'desc' };

/**
 * Generic paginated response envelope for cursor-based pagination.
 * `nextCursor` is `null` when the end of the result set is reached.
 */
export interface Paginated<T> {
  readonly items: readonly T[];
  readonly nextCursor: Cursor | null;
  readonly hasMore: boolean;
}

/**
 * Offset-based pagination variant for small admin lists where cursor
 * pagination is unnecessary. Subject to the same `limit` cap as cursor mode.
 */
export interface OffsetPaginationParams {
  readonly limit: number;
  readonly offset: number;
  readonly sort?: SortOrder;
}

// ---------------------------------------------------------------------------
// Error contract (spec §14.2)
// ---------------------------------------------------------------------------

/**
 * Stable error code vocabulary. Codes are extensible but existing codes must
 * never change meaning across releases (spec §9.12 / §14.2).
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'TENANT_MISMATCH'
  | 'LICENSE_INVALID'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_GRACE_EXHAUSTED'
  | 'LICENSE_FEATURE_NOT_ENTITLED'
  | 'LEGAL_HOLD_BLOCKS_ACTION'
  | 'RETENTION_BLOCKS_ACTION'
  | 'CLASSIFICATION_DOWNGRADE_DENIED'
  | 'WORKFLOW_INVALID_STATE'
  | 'AI_UNAVAILABLE'
  | 'AI_NOT_LICENSED'
  | 'AI_ACTION_REQUIRES_CONFIRMATION'
  | 'AI_PROMPT_INJECTION_DETECTED'
  | 'EXTERNAL_AI_DISABLED'
  | 'TOUR_NOT_FOUND'
  | 'TOUR_NOT_LICENSED'
  | 'INTERNAL_ERROR';

/**
 * Canonical API error payload returned by every endpoint on failure.
 * `messageKey` and `messageVars` are consumed by the client via
 * `t(error.messageKey, error.messageVars)`.
 */
export interface ApiError {
  readonly code: ErrorCode | ApiErrorCode;
  readonly messageKey: MessageKey;
  readonly messageVars?: Readonly<Record<string, string | number | boolean>>;
  readonly traceId: UUID;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Convenience alias used by the `ErrResult` shape and by error mappers
 * throughout the backend.
 */
export type ApiErrorInput = Omit<ApiError, 'traceId'> & { readonly traceId?: UUID };

// ---------------------------------------------------------------------------
// Audit primitives reused across domains
// ---------------------------------------------------------------------------

/** Result of an audited action. */
export type AuditResult = 'allow' | 'deny';

/** Actor kind that initiated an audited action. */
export type AuditActorKind = 'user' | 'service_account' | 'system' | 'ai_assistant' | 'license_server';

// ---------------------------------------------------------------------------
// Misc shared primitives
// ---------------------------------------------------------------------------

/**
 * Opaque JWT or opaque session token. Never logged in plain text.
 */
export type AuthToken = Branded<string, 'AuthToken'>;

/**
 * Positive integer in the closed range [1, 100]. Useful for confidence
 * scores returned by OCR/OMR/ICR and AI suggestions.
 */
export type ConfidenceScore = Branded<number, 'ConfidenceScore'>;

/**
 * Byte count (non-negative integer). Used for storage quotas and file sizes.
 */
export type ByteSize = Branded<number, 'ByteSize'>;

/**
 * Generic JSON-serialisable value. Used only where a structured payload is
 * required but the schema is intentionally open (e.g. webhook delivery).
 * Prefer a concrete type whenever the schema is known.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * Type guard: narrows `unknown` to a `string` branded with the given brand.
 * The caller is responsible for validating the underlying value (UUID shape,
 * ISO date, etc.) before calling this.
 */
export function assertBranded<T extends string & { readonly __brand: string }>(
  value: unknown,
  brand: T extends string & { readonly __brand: infer B } ? B : never,
): asserts value is T {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected branded string "${brand}", got ${typeof value}`);
  }
}

/**
 * Type guard for `ISODateString`. Performs a structural check on the string
 * shape; full UTC validation must be performed at the parser boundary.
 */
export function isISODateString(value: unknown): value is ISODateString {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value);
}
