"use strict";
/**
 * @smart-edms/schemas — classification & sensitivity labels (spec §9.4)
 *
 * Zod schemas for: label create/update, assign label, history query.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationPolicyResultSchema = exports.ClassificationHistoryQuerySchema = exports.ClassificationHistorySchema = exports.AssignClassificationResponseSchema = exports.AssignClassificationRequestSchema = exports.UpdateClassificationLabelRequestSchema = exports.CreateClassificationLabelRequestSchema = exports.ClassificationLabelSchema = exports.ClassificationChangeDirectionSchema = exports.ClassificationBannerColorSchema = exports.DefaultSensitivityNameSchema = exports.SensitivityLevelSchema = exports.ClassificationHistoryIdSchema = exports.ClassificationLabelIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.ClassificationLabelIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ClassificationHistoryIdSchema = common_1.UuidSchema.transform((v) => v);
/**
 * Inline `DocumentIdSchema` to break the cyclic import between
 * `./classification` and `./document` (`./document` imports
 * `ClassificationLabelIdSchema` from here; `./classification` would otherwise
 * import `DocumentIdSchema` from there). Functionally identical to the one
 * defined in `./document`.
 */
const DocumentIdSchemaInline = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `SensitivityLevel` (1-5). */
exports.SensitivityLevelSchema = zod_1.z.union([
    zod_1.z.literal(1),
    zod_1.z.literal(2),
    zod_1.z.literal(3),
    zod_1.z.literal(4),
    zod_1.z.literal(5),
]);
/** `z.infer` === `DefaultSensitivityName`. */
exports.DefaultSensitivityNameSchema = zod_1.z.enum([
    'public',
    'internal',
    'confidential',
    'restricted',
    'highly_sensitive',
]);
/** `z.infer` === `ClassificationBannerColor`. */
exports.ClassificationBannerColorSchema = zod_1.z.enum([
    'green',
    'blue',
    'amber',
    'orange',
    'red',
    'custom',
]);
/** `z.infer` === `ClassificationChangeDirection`. */
exports.ClassificationChangeDirectionSchema = zod_1.z.enum([
    'upgrade',
    'downgrade',
    'lateral',
]);
// ---------------------------------------------------------------------------
// Label schema
// ---------------------------------------------------------------------------
/** `z.infer` matches `ClassificationLabel`. */
exports.ClassificationLabelSchema = zod_1.z
    .object({
    id: exports.ClassificationLabelIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    code: zod_1.z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'code must be snake-case'),
    labelKey: zod_1.z.string().min(1).max(128),
    descriptionKey: zod_1.z.string().min(1).max(128),
    sensitivity: exports.SensitivityLevelSchema,
    downgradeRequiresJustification: zod_1.z.boolean(),
    bannerColor: exports.ClassificationBannerColorSchema,
    aiSummaryAllowed: zod_1.z.boolean(),
    externalShareAllowed: zod_1.z.boolean(),
    order: zod_1.z.number().int().min(0),
    enabled: zod_1.z.boolean(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/admin/classification-labels`. */
exports.CreateClassificationLabelRequestSchema = zod_1.z
    .object({
    code: zod_1.z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
    labelKey: zod_1.z.string().min(1).max(128),
    descriptionKey: zod_1.z.string().min(1).max(128),
    sensitivity: exports.SensitivityLevelSchema,
    downgradeRequiresJustification: zod_1.z.boolean().default(true),
    bannerColor: exports.ClassificationBannerColorSchema,
    aiSummaryAllowed: zod_1.z.boolean().default(false),
    externalShareAllowed: zod_1.z.boolean().default(false),
    order: zod_1.z.number().int().min(0),
    enabled: zod_1.z.boolean().default(true),
})
    .strict();
/** Request body for `PATCH /v1/admin/classification-labels/:id`. */
exports.UpdateClassificationLabelRequestSchema = zod_1.z
    .object({
    labelKey: zod_1.z.string().min(1).max(128).optional(),
    descriptionKey: zod_1.z.string().min(1).max(128).optional(),
    sensitivity: exports.SensitivityLevelSchema.optional(),
    downgradeRequiresJustification: zod_1.z.boolean().optional(),
    bannerColor: exports.ClassificationBannerColorSchema.optional(),
    aiSummaryAllowed: zod_1.z.boolean().optional(),
    externalShareAllowed: zod_1.z.boolean().optional(),
    order: zod_1.z.number().int().min(0).optional(),
    enabled: zod_1.z.boolean().optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Assign label
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/documents/:id/classification` (assign label). */
exports.AssignClassificationRequestSchema = zod_1.z
    .object({
    labelId: exports.ClassificationLabelIdSchema,
    reasonKey: zod_1.z.string().min(1).max(128).optional(),
    // Free-form justification text; required for downgrades.
    justification: zod_1.z.string().min(1).max(2000).optional(),
})
    .strict();
/** Response body for label assignment. */
exports.AssignClassificationResponseSchema = zod_1.z
    .object({
    documentId: DocumentIdSchemaInline,
    fromLabelId: exports.ClassificationLabelIdSchema.nullable(),
    toLabelId: exports.ClassificationLabelIdSchema,
    direction: exports.ClassificationChangeDirectionSchema,
    historyId: exports.ClassificationHistoryIdSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
/** `z.infer` matches `ClassificationHistory`. */
exports.ClassificationHistorySchema = zod_1.z
    .object({
    id: exports.ClassificationHistoryIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    documentId: DocumentIdSchemaInline,
    fromLabelId: exports.ClassificationLabelIdSchema.nullable(),
    toLabelId: exports.ClassificationLabelIdSchema,
    direction: exports.ClassificationChangeDirectionSchema,
    reasonKey: zod_1.z.string().min(1).max(128).nullable(),
    justification: zod_1.z.string().min(0).max(2000).nullable(),
    changedBy: user_1.UserIdSchema,
    changedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `GET /v1/documents/:id/classification/history`. */
exports.ClassificationHistoryQuerySchema = zod_1.z
    .object({
    documentId: DocumentIdSchemaInline.optional(),
    changedBy: user_1.UserIdSchema.optional(),
    direction: exports.ClassificationChangeDirectionSchema.optional(),
    from: common_1.IsoDateStringSchema.optional(),
    to: common_1.IsoDateStringSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(200).default(50),
    cursor: zod_1.z.string().min(1).max(1024).nullable().optional(),
})
    .strict();
/** `z.infer` matches `ClassificationPolicyResult`. */
exports.ClassificationPolicyResultSchema = zod_1.z
    .object({
    allowed: zod_1.z.boolean(),
    denialReasonKey: zod_1.z.string().min(1).max(128).nullable(),
    requiresStepUp: zod_1.z.boolean(),
    blockedByLegalHold: zod_1.z.boolean(),
})
    .strict();
//# sourceMappingURL=classification.js.map