/**
 * @smart-edms/schemas — classification & sensitivity labels (spec §9.4)
 *
 * Zod schemas for: label create/update, assign label, history query.
 */

import { z } from 'zod';
import type {
  ClassificationHistoryId,
  ClassificationLabelId,
  DocumentId,
} from '@smart-edms/types';
import { IsoDateStringSchema, UuidSchema } from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const ClassificationLabelIdSchema = UuidSchema.transform(
  (v): ClassificationLabelId => v as ClassificationLabelId,
);

export const ClassificationHistoryIdSchema = UuidSchema.transform(
  (v): ClassificationHistoryId => v as ClassificationHistoryId,
);

/**
 * Inline `DocumentIdSchema` to break the cyclic import between
 * `./classification` and `./document` (`./document` imports
 * `ClassificationLabelIdSchema` from here; `./classification` would otherwise
 * import `DocumentIdSchema` from there). Functionally identical to the one
 * defined in `./document`.
 */
const DocumentIdSchemaInline = UuidSchema.transform(
  (v): DocumentId => v as DocumentId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `SensitivityLevel` (1-5). */
export const SensitivityLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

/** `z.infer` === `DefaultSensitivityName`. */
export const DefaultSensitivityNameSchema = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
  'highly_sensitive',
]);

/** `z.infer` === `ClassificationBannerColor`. */
export const ClassificationBannerColorSchema = z.enum([
  'green',
  'blue',
  'amber',
  'orange',
  'red',
  'custom',
]);

/** `z.infer` === `ClassificationChangeDirection`. */
export const ClassificationChangeDirectionSchema = z.enum([
  'upgrade',
  'downgrade',
  'lateral',
]);

// ---------------------------------------------------------------------------
// Label schema
// ---------------------------------------------------------------------------

/** `z.infer` matches `ClassificationLabel`. */
export const ClassificationLabelSchema = z
  .object({
    id: ClassificationLabelIdSchema,
    tenantId: TenantIdSchema,
    code: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'code must be snake-case'),
    labelKey: z.string().min(1).max(128),
    descriptionKey: z.string().min(1).max(128),
    sensitivity: SensitivityLevelSchema,
    downgradeRequiresJustification: z.boolean(),
    bannerColor: ClassificationBannerColorSchema,
    aiSummaryAllowed: z.boolean(),
    externalShareAllowed: z.boolean(),
    order: z.number().int().min(0),
    enabled: z.boolean(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/admin/classification-labels`. */
export const CreateClassificationLabelRequestSchema = z
  .object({
    code: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
    labelKey: z.string().min(1).max(128),
    descriptionKey: z.string().min(1).max(128),
    sensitivity: SensitivityLevelSchema,
    downgradeRequiresJustification: z.boolean().default(true),
    bannerColor: ClassificationBannerColorSchema,
    aiSummaryAllowed: z.boolean().default(false),
    externalShareAllowed: z.boolean().default(false),
    order: z.number().int().min(0),
    enabled: z.boolean().default(true),
  })
  .strict();

/** Request body for `PATCH /v1/admin/classification-labels/:id`. */
export const UpdateClassificationLabelRequestSchema = z
  .object({
    labelKey: z.string().min(1).max(128).optional(),
    descriptionKey: z.string().min(1).max(128).optional(),
    sensitivity: SensitivityLevelSchema.optional(),
    downgradeRequiresJustification: z.boolean().optional(),
    bannerColor: ClassificationBannerColorSchema.optional(),
    aiSummaryAllowed: z.boolean().optional(),
    externalShareAllowed: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Assign label
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/documents/:id/classification` (assign label). */
export const AssignClassificationRequestSchema = z
  .object({
    labelId: ClassificationLabelIdSchema,
    reasonKey: z.string().min(1).max(128).optional(),
    // Free-form justification text; required for downgrades.
    justification: z.string().min(1).max(2000).optional(),
  })
  .strict();

/** Response body for label assignment. */
export const AssignClassificationResponseSchema = z
  .object({
    documentId: DocumentIdSchemaInline,
    fromLabelId: ClassificationLabelIdSchema.nullable(),
    toLabelId: ClassificationLabelIdSchema,
    direction: ClassificationChangeDirectionSchema,
    historyId: ClassificationHistoryIdSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/** `z.infer` matches `ClassificationHistory`. */
export const ClassificationHistorySchema = z
  .object({
    id: ClassificationHistoryIdSchema,
    tenantId: TenantIdSchema,
    documentId: DocumentIdSchemaInline,
    fromLabelId: ClassificationLabelIdSchema.nullable(),
    toLabelId: ClassificationLabelIdSchema,
    direction: ClassificationChangeDirectionSchema,
    reasonKey: z.string().min(1).max(128).nullable(),
    justification: z.string().min(0).max(2000).nullable(),
    changedBy: UserIdSchema,
    changedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `GET /v1/documents/:id/classification/history`. */
export const ClassificationHistoryQuerySchema = z
  .object({
    documentId: DocumentIdSchemaInline.optional(),
    changedBy: UserIdSchema.optional(),
    direction: ClassificationChangeDirectionSchema.optional(),
    from: IsoDateStringSchema.optional(),
    to: IsoDateStringSchema.optional(),
    limit: z.number().int().min(1).max(200).default(50),
    cursor: z.string().min(1).max(1024).nullable().optional(),
  })
  .strict();

/** `z.infer` matches `ClassificationPolicyResult`. */
export const ClassificationPolicyResultSchema = z
  .object({
    allowed: z.boolean(),
    denialReasonKey: z.string().min(1).max(128).nullable(),
    requiresStepUp: z.boolean(),
    blockedByLegalHold: z.boolean(),
  })
  .strict();
