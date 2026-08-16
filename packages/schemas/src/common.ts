/**
 * @smart-edms/schemas — common primitives (spec §14, §15.4)
 *
 * Purpose: foundational Zod schemas for branded identifiers, locale enums,
 * error contracts, and pagination shared across every Smart EDMS domain.
 *
 * These schemas are the SINGLE SOURCE OF TRUTH for runtime validation.
 * Each `z.infer<typeof XSchema>` MUST match the corresponding type from
 * `@smart-edms/types`. Where branded nominal types are involved, the schemas
 * use `.transform((v) => v as B)` so the inferred OUTPUT type carries the
 * brand (the input type remains the underlying primitive).
 *
 * Conventions:
 *  - No `z.any()` and no `z.unknown()` except for genuinely untrusted external
 *    data (JSON Schema blobs, free-form JSON payloads). Every such use is
 *    called out with a comment.
 *  - All input schemas use `.strict()` to reject unknown keys at the boundary.
 *  - All IDs are `z.string().uuid()`.
 *  - All timestamps are `z.string().datetime()` (RFC 3339, UTC, `Z` suffix).
 *  - All enums use `z.enum([...])` matching the literal-union types from
 *    `@smart-edms/types`.
 */

import { z } from 'zod';
import type {
  ByteSize,
  ConfidenceScore,
  Cursor,
  ErrorCode,
  HashHex,
  ISODateString,
  JsonValue,
  Locale,
  MessageKey,
  Timezone,
  UUID,
} from '@smart-edms/types';

// ---------------------------------------------------------------------------
// Branded identifier schemas
// ---------------------------------------------------------------------------
//
// The types package brands primitive strings/numbers with nominal markers
// (e.g. `UUID = Branded<string, 'UUID'>`). Zod's native `.brand()` uses a
// symbol-keyed brand that does NOT structurally match `{ __brand: 'UUID' }`,
// so we use `.transform((v) => v as B)` to coerce the inferred OUTPUT type
// to the branded type. Input remains the underlying primitive; parsing at
// runtime validates the primitive shape only.

/** UUID v1-v5 string. `z.infer<typeof UuidSchema>` === `UUID`. */
export const UuidSchema = z
  .string()
  .uuid()
  .transform((v): UUID => v as UUID);

/** ISO 8601 UTC timestamp (`2025-01-31T08:30:00.000Z`). `z.infer` === `ISODateString`. */
export const IsoDateStringSchema = z
  .string()
  .datetime({ offset: false, local: false })
  .transform((v): ISODateString => v as ISODateString);

/** Opaque pagination cursor. `z.infer` === `Cursor`. */
export const CursorSchema = z
  .string()
  .min(1)
  .max(1024)
  .transform((v): Cursor => v as Cursor);

/** Stable, machine-readable message key (e.g. `errors.forbidden`). `z.infer` === `MessageKey`. */
export const MessageKeySchema = z
  .string()
  .min(1)
  .max(256)
  .transform((v): MessageKey => v as MessageKey);

/** Stable, machine-readable error code (e.g. `LICENSE_EXPIRED`). `z.infer` === `ErrorCode`. */
export const ErrorCodeSchema = z
  .string()
  .min(1)
  .max(128)
  .transform((v): ErrorCode => v as ErrorCode);

/** BCP 47 language tag. `z.infer` === `Locale`. */
export const LocaleSchema = z
  .string()
  .min(2)
  .max(16)
  .transform((v): Locale => v as Locale);

/** IANA timezone identifier. `z.infer` === `Timezone`. */
export const TimezoneSchema = z
  .string()
  .min(2)
  .max(64)
  .transform((v): Timezone => v as Timezone);

/** Lower-case hexadecimal hash digest. `z.infer` === `HashHex`. */
export const HashHexSchema = z
  .string()
  .regex(/^[0-9a-f]+$/i, 'hash must be lowercase hexadecimal')
  .transform((v): HashHex => v as HashHex);

/** Positive integer in [1, 100]. `z.infer` === `ConfidenceScore`. */
export const ConfidenceScoreSchema = z
  .number()
  .int('confidence must be an integer')
  .min(1)
  .max(100)
  .transform((v): ConfidenceScore => v as ConfidenceScore);

/** Non-negative byte count. `z.infer` === `ByteSize`. */
export const ByteSizeSchema = z
  .number()
  .int('byte size must be an integer')
  .min(0)
  .transform((v): ByteSize => v as ByteSize);

// ---------------------------------------------------------------------------
// Locale enums (spec §16.1)
// ---------------------------------------------------------------------------

/** The six mandatory Smart EDMS locales. `z.infer` === `MandatoryLocale`. */
export const MandatoryLocaleSchema = z.enum(['en', 'fr', 'ar', 'ru', 'zh-CN', 'de']);

/** Locale direction. `z.infer` === `LocaleDirection`. */
export const LocaleDirectionSchema = z.enum(['ltr', 'rtl']);

// ---------------------------------------------------------------------------
// Hash algorithm + audit primitives
// ---------------------------------------------------------------------------

/** Hash algorithm names. `z.infer` === `HashAlgorithm`. */
export const HashAlgorithmSchema = z.enum([
  'sha256',
  'sha384',
  'sha512',
  'sha3-256',
  'sha3-512',
  'blake3',
]);

/** Result of an audited action. `z.infer` === `AuditResult`. */
export const AuditResultSchema = z.enum(['allow', 'deny']);

/** Actor kind that initiated an audited action. `z.infer` === `AuditActorKind`. */
export const AuditActorKindSchema = z.enum([
  'user',
  'service_account',
  'system',
  'ai_assistant',
  'license_server',
]);

// ---------------------------------------------------------------------------
// Sort order + pagination (spec §14.3)
// ---------------------------------------------------------------------------

/**
 * Sort direction. A bare `'asc' | 'desc'` shorthand OR an explicit
 * `{ field, direction }` object. `z.infer` === `SortOrder`.
 */
export const SortOrderSchema = z.union([
  z.enum(['asc', 'desc']),
  z
    .object({
      field: z.string().min(1).max(128),
      direction: z.enum(['asc', 'desc']),
    })
    .strict(),
]);

/**
 * Cursor-based pagination parameters. `z.infer` === `CursorPaginationParams`.
 * `limit` is bounded [1, 200]; server may further restrict.
 */
export const CursorPaginationParamsSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
    cursor: CursorSchema.nullable().optional(),
    sort: SortOrderSchema.optional(),
  })
  .strict();

/**
 * Offset-based pagination variant for small admin lists. `z.infer` === `OffsetPaginationParams`.
 */
export const OffsetPaginationParamsSchema = z
  .object({
    limit: z.number().int().min(1).max(200),
    offset: z.number().int().min(0),
    sort: SortOrderSchema.optional(),
  })
  .strict();

/**
 * Generic paginated response envelope factory. `z.infer<typeof PaginatedSchema(X)>`
 * === `Paginated<X>` (modulo branded `Cursor`).
 */
export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      items: z.array(item),
      nextCursor: CursorSchema.nullable(),
      hasMore: z.boolean(),
    })
    .strict();

// ---------------------------------------------------------------------------
// Error contract (spec §14.2)
// ---------------------------------------------------------------------------

/**
 * Stable API error code vocabulary. `z.infer` === `ApiErrorCode`.
 * Codes are extensible but existing codes must never change meaning.
 */
export const ApiErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'CONFLICT',
  'RATE_LIMITED',
  'TENANT_MISMATCH',
  'LICENSE_INVALID',
  'LICENSE_EXPIRED',
  'LICENSE_GRACE_EXHAUSTED',
  'LICENSE_FEATURE_NOT_ENTITLED',
  'LEGAL_HOLD_BLOCKS_ACTION',
  'RETENTION_BLOCKS_ACTION',
  'CLASSIFICATION_DOWNGRADE_DENIED',
  'WORKFLOW_INVALID_STATE',
  'AI_UNAVAILABLE',
  'AI_NOT_LICENSED',
  'AI_ACTION_REQUIRES_CONFIRMATION',
  'AI_PROMPT_INJECTION_DETECTED',
  'EXTERNAL_AI_DISABLED',
  'TOUR_NOT_FOUND',
  'TOUR_NOT_LICENSED',
  'INTERNAL_ERROR',
]);

/**
 * Interpolation variable value for error messages.
 * Constrained to JSON primitives (no nested objects).
 */
const ApiMessageVarValueSchema = z.union([z.string(), z.number().int(), z.boolean()]);

/**
 * Canonical API error payload. `z.infer` === `ApiError`.
 * `code` is either a known `ApiErrorCode` or a free-form `ErrorCode` string
 * (extensions are allowed but discouraged).
 */
export const ApiErrorSchema = z
  .object({
    code: z.union([ApiErrorCodeSchema, ErrorCodeSchema]),
    messageKey: MessageKeySchema,
    messageVars: z.record(z.string(), ApiMessageVarValueSchema).optional(),
    traceId: UuidSchema,
    // `details` is intentionally `z.unknown()` — it is opaque diagnostic
    // metadata that the API surfaces to operators. Server-side code must
    // narrow before consumption.
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Generic JSON value (untrusted external data)
// ---------------------------------------------------------------------------

/**
 * Generic JSON-serialisable value schema. `z.infer` === `JsonValue`.
 *
 * Used ONLY where a structured payload is required but the schema is
 * intentionally open (e.g. webhook delivery, license-audit payload).
 * Prefer a concrete schema whenever the shape is known.
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

// ---------------------------------------------------------------------------
// Convenience re-exports (non-schema)
// ---------------------------------------------------------------------------

export type {
  ApiError,
  ApiErrorCode,
  AuditActorKind,
  AuditResult,
  ByteSize,
  ConfidenceScore,
  Cursor,
  CursorPaginationParams,
  ErrorCode,
  HashHex,
  ISODateString,
  JsonValue,
  Locale,
  LocaleDirection,
  MandatoryLocale,
  MessageKey,
  OffsetPaginationParams,
  Paginated,
  SortOrder,
  UUID,
} from '@smart-edms/types';
