"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonValueSchema = exports.ApiErrorSchema = exports.ApiErrorCodeSchema = exports.PaginatedSchema = exports.OffsetPaginationParamsSchema = exports.CursorPaginationParamsSchema = exports.SortOrderSchema = exports.AuditActorKindSchema = exports.AuditResultSchema = exports.HashAlgorithmSchema = exports.LocaleDirectionSchema = exports.MandatoryLocaleSchema = exports.ByteSizeSchema = exports.ConfidenceScoreSchema = exports.HashHexSchema = exports.TimezoneSchema = exports.LocaleSchema = exports.ErrorCodeSchema = exports.MessageKeySchema = exports.CursorSchema = exports.IsoDateStringSchema = exports.UuidSchema = void 0;
const zod_1 = require("zod");
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
exports.UuidSchema = zod_1.z
    .string()
    .uuid()
    .transform((v) => v);
/** ISO 8601 UTC timestamp (`2025-01-31T08:30:00.000Z`). `z.infer` === `ISODateString`. */
exports.IsoDateStringSchema = zod_1.z
    .string()
    .datetime({ offset: false, local: false })
    .transform((v) => v);
/** Opaque pagination cursor. `z.infer` === `Cursor`. */
exports.CursorSchema = zod_1.z
    .string()
    .min(1)
    .max(1024)
    .transform((v) => v);
/** Stable, machine-readable message key (e.g. `errors.forbidden`). `z.infer` === `MessageKey`. */
exports.MessageKeySchema = zod_1.z
    .string()
    .min(1)
    .max(256)
    .transform((v) => v);
/** Stable, machine-readable error code (e.g. `LICENSE_EXPIRED`). `z.infer` === `ErrorCode`. */
exports.ErrorCodeSchema = zod_1.z
    .string()
    .min(1)
    .max(128)
    .transform((v) => v);
/** BCP 47 language tag. `z.infer` === `Locale`. */
exports.LocaleSchema = zod_1.z
    .string()
    .min(2)
    .max(16)
    .transform((v) => v);
/** IANA timezone identifier. `z.infer` === `Timezone`. */
exports.TimezoneSchema = zod_1.z
    .string()
    .min(2)
    .max(64)
    .transform((v) => v);
/** Lower-case hexadecimal hash digest. `z.infer` === `HashHex`. */
exports.HashHexSchema = zod_1.z
    .string()
    .regex(/^[0-9a-f]+$/i, 'hash must be lowercase hexadecimal')
    .transform((v) => v);
/** Positive integer in [1, 100]. `z.infer` === `ConfidenceScore`. */
exports.ConfidenceScoreSchema = zod_1.z
    .number()
    .int('confidence must be an integer')
    .min(1)
    .max(100)
    .transform((v) => v);
/** Non-negative byte count. `z.infer` === `ByteSize`. */
exports.ByteSizeSchema = zod_1.z
    .number()
    .int('byte size must be an integer')
    .min(0)
    .transform((v) => v);
// ---------------------------------------------------------------------------
// Locale enums (spec §16.1)
// ---------------------------------------------------------------------------
/** The six mandatory Smart EDMS locales. `z.infer` === `MandatoryLocale`. */
exports.MandatoryLocaleSchema = zod_1.z.enum(['en', 'fr', 'ar', 'ru', 'zh-CN', 'de']);
/** Locale direction. `z.infer` === `LocaleDirection`. */
exports.LocaleDirectionSchema = zod_1.z.enum(['ltr', 'rtl']);
// ---------------------------------------------------------------------------
// Hash algorithm + audit primitives
// ---------------------------------------------------------------------------
/** Hash algorithm names. `z.infer` === `HashAlgorithm`. */
exports.HashAlgorithmSchema = zod_1.z.enum([
    'sha256',
    'sha384',
    'sha512',
    'sha3-256',
    'sha3-512',
    'blake3',
]);
/** Result of an audited action. `z.infer` === `AuditResult`. */
exports.AuditResultSchema = zod_1.z.enum(['allow', 'deny']);
/** Actor kind that initiated an audited action. `z.infer` === `AuditActorKind`. */
exports.AuditActorKindSchema = zod_1.z.enum([
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
exports.SortOrderSchema = zod_1.z.union([
    zod_1.z.enum(['asc', 'desc']),
    zod_1.z
        .object({
        field: zod_1.z.string().min(1).max(128),
        direction: zod_1.z.enum(['asc', 'desc']),
    })
        .strict(),
]);
/**
 * Cursor-based pagination parameters. `z.infer` === `CursorPaginationParams`.
 * `limit` is bounded [1, 200]; server may further restrict.
 */
exports.CursorPaginationParamsSchema = zod_1.z
    .object({
    limit: zod_1.z.number().int().min(1).max(200).optional(),
    cursor: exports.CursorSchema.nullable().optional(),
    sort: exports.SortOrderSchema.optional(),
})
    .strict();
/**
 * Offset-based pagination variant for small admin lists. `z.infer` === `OffsetPaginationParams`.
 */
exports.OffsetPaginationParamsSchema = zod_1.z
    .object({
    limit: zod_1.z.number().int().min(1).max(200),
    offset: zod_1.z.number().int().min(0),
    sort: exports.SortOrderSchema.optional(),
})
    .strict();
/**
 * Generic paginated response envelope factory. `z.infer<typeof PaginatedSchema(X)>`
 * === `Paginated<X>` (modulo branded `Cursor`).
 */
const PaginatedSchema = (item) => zod_1.z
    .object({
    items: zod_1.z.array(item),
    nextCursor: exports.CursorSchema.nullable(),
    hasMore: zod_1.z.boolean(),
})
    .strict();
exports.PaginatedSchema = PaginatedSchema;
// ---------------------------------------------------------------------------
// Error contract (spec §14.2)
// ---------------------------------------------------------------------------
/**
 * Stable API error code vocabulary. `z.infer` === `ApiErrorCode`.
 * Codes are extensible but existing codes must never change meaning.
 */
exports.ApiErrorCodeSchema = zod_1.z.enum([
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
const ApiMessageVarValueSchema = zod_1.z.union([zod_1.z.string(), zod_1.z.number().int(), zod_1.z.boolean()]);
/**
 * Canonical API error payload. `z.infer` === `ApiError`.
 * `code` is either a known `ApiErrorCode` or a free-form `ErrorCode` string
 * (extensions are allowed but discouraged).
 */
exports.ApiErrorSchema = zod_1.z
    .object({
    code: zod_1.z.union([exports.ApiErrorCodeSchema, exports.ErrorCodeSchema]),
    messageKey: exports.MessageKeySchema,
    messageVars: zod_1.z.record(zod_1.z.string(), ApiMessageVarValueSchema).optional(),
    traceId: exports.UuidSchema,
    // `details` is intentionally `z.unknown()` — it is opaque diagnostic
    // metadata that the API surfaces to operators. Server-side code must
    // narrow before consumption.
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
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
exports.JsonValueSchema = zod_1.z.lazy(() => zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.number(),
    zod_1.z.boolean(),
    zod_1.z.null(),
    zod_1.z.array(exports.JsonValueSchema),
    zod_1.z.record(zod_1.z.string(), exports.JsonValueSchema),
]));
//# sourceMappingURL=common.js.map