/**
 * @smart-edms/schemas — retention, legal hold, disposition (spec §9.7)
 *
 * Zod schemas for: schedule create, hold create/remove, disposition approve,
 * certificate generate.
 */

import { z } from 'zod';
import type {
  DispositionRecordId,
  LegalHoldId,
  RetentionScheduleId,
} from '@smart-edms/types';
import { IsoDateStringSchema, UuidSchema } from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { DocumentIdSchema } from './document';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const RetentionScheduleIdSchema = UuidSchema.transform(
  (v): RetentionScheduleId => v as RetentionScheduleId,
);
export const LegalHoldIdSchema = UuidSchema.transform(
  (v): LegalHoldId => v as LegalHoldId,
);
export const DispositionRecordIdSchema = UuidSchema.transform(
  (v): DispositionRecordId => v as DispositionRecordId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `DispositionAction`. */
export const DispositionActionSchema = z.enum([
  'destroy',
  'archive',
  'review',
  'transfer_to_custodian',
  'crypto_shred',
]);

/** `z.infer` === `DispositionStatus`. */
export const DispositionStatusSchema = z.enum([
  'pending',
  'approved',
  'in_progress',
  'completed',
  'cancelled',
  'blocked_by_legal_hold',
]);

/** `z.infer` === `LegalHoldReason`. */
export const LegalHoldReasonSchema = z.enum([
  'litigation',
  'regulatory_inquiry',
  'audit',
  'investigation',
  'compliance_review',
  'custom',
]);

/** `z.infer` === `LegalHoldStatus`. */
export const LegalHoldStatusSchema = z.enum(['active', 'released', 'superseded']);

// ---------------------------------------------------------------------------
// Retention trigger (discriminated)
// ---------------------------------------------------------------------------

/** `z.infer` matches `RetentionTrigger` (discriminated on `kind`). */
export const RetentionTriggerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('creation') }).strict(),
  z.object({ kind: z.literal('last_modified') }).strict(),
  z.object({ kind: z.literal('declaration_of_record') }).strict(),
  z
    .object({
      kind: z.literal('workflow_completed'),
      workflowDefinitionId: UuidSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('classification_set'),
      classificationLabelId: UuidSchema,
    })
    .strict(),
  z
    .object({ kind: z.literal('custom'), resolverCode: z.string().min(1).max(64) })
    .strict(),
]);

// ---------------------------------------------------------------------------
// Retention schedule
// ---------------------------------------------------------------------------

/** `z.infer` matches `RetentionSchedule`. */
export const RetentionScheduleSchema = z
  .object({
    id: RetentionScheduleIdSchema,
    tenantId: TenantIdSchema,
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).nullable(),
    labelKey: z.string().min(1).max(128),
    trigger: RetentionTriggerSchema,
    retentionDays: z.number().int().min(0).max(36500),
    dispositionAction: DispositionActionSchema,
    cryptoShreddingAllowed: z.boolean(),
    reviewPeriodDays: z.number().int().min(0).nullable(),
    enabled: z.boolean(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/admin/retention/schedules`. */
export const CreateRetentionScheduleRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).optional(),
    labelKey: z.string().min(1).max(128),
    trigger: RetentionTriggerSchema,
    retentionDays: z.number().int().min(0).max(36500),
    dispositionAction: DispositionActionSchema,
    cryptoShreddingAllowed: z.boolean().default(false),
    reviewPeriodDays: z.number().int().min(0).nullable().optional(),
    enabled: z.boolean().default(true),
  })
  .strict();

/** Request body for `PATCH /v1/admin/retention/schedules/:id`. */
export const UpdateRetentionScheduleRequestSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(0).max(2000).optional(),
    labelKey: z.string().min(1).max(128).optional(),
    retentionDays: z.number().int().min(0).max(36500).optional(),
    dispositionAction: DispositionActionSchema.optional(),
    cryptoShreddingAllowed: z.boolean().optional(),
    reviewPeriodDays: z.number().int().min(0).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Legal hold
// ---------------------------------------------------------------------------

/** `z.infer` matches `LegalHold`. */
export const LegalHoldSchema = z
  .object({
    id: LegalHoldIdSchema,
    tenantId: TenantIdSchema,
    caseCode: z.string().min(1).max(128),
    reason: LegalHoldReasonSchema,
    description: z.string().min(0).max(2000).nullable(),
    status: LegalHoldStatusSchema,
    documentIds: z.array(DocumentIdSchema),
    appliedBy: UserIdSchema,
    appliedAt: IsoDateStringSchema,
    releasedBy: UserIdSchema.nullable(),
    releasedAt: IsoDateStringSchema.nullable(),
    releaseReasonKey: z.string().min(1).max(128).nullable(),
  })
  .strict();

/** Request body for `POST /v1/legal-holds` (create hold). */
export const CreateLegalHoldRequestSchema = z
  .object({
    caseCode: z.string().min(1).max(128),
    reason: LegalHoldReasonSchema,
    description: z.string().min(0).max(2000).optional(),
    documentIds: z.array(DocumentIdSchema).min(1),
  })
  .strict();

/** Request body for `DELETE /v1/legal-holds/:id` (release hold). */
export const ReleaseLegalHoldRequestSchema = z
  .object({
    releaseReasonKey: z.string().min(1).max(128),
  })
  .strict();

/** Request body for `POST /v1/legal-holds/:id/documents` (add documents). */
export const AddLegalHoldDocumentsRequestSchema = z
  .object({
    documentIds: z.array(DocumentIdSchema).min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// Disposition
// ---------------------------------------------------------------------------

/** `z.infer` matches `DispositionRecord`. */
export const DispositionRecordSchema = z
  .object({
    id: DispositionRecordIdSchema,
    tenantId: TenantIdSchema,
    documentId: DocumentIdSchema,
    scheduleId: RetentionScheduleIdSchema,
    action: DispositionActionSchema,
    status: DispositionStatusSchema,
    trigger: RetentionTriggerSchema,
    triggeredAt: IsoDateStringSchema,
    scheduledFor: IsoDateStringSchema,
    executedAt: IsoDateStringSchema.nullable(),
    approvedBy: UserIdSchema.nullable(),
    approvedAt: IsoDateStringSchema.nullable(),
    evidenceHash: z.string().min(1).max(256).nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/retention/dispositions/:id/approve`. */
export const ApproveDispositionRequestSchema = z
  .object({
    comment: z.string().min(0).max(2000).optional(),
  })
  .strict();

/** Response body for disposition approve (includes certificate if completed). */
export const ApproveDispositionResponseSchema = z
  .object({
    record: DispositionRecordSchema,
    certificate: z.lazy(() => DispositionCertificateSchema).nullable(),
  })
  .strict();

/** `z.infer` matches `DispositionCertificate`. */
export const DispositionCertificateSchema = z
  .object({
    recordId: DispositionRecordIdSchema,
    tenantId: TenantIdSchema,
    documentId: DocumentIdSchema,
    action: DispositionActionSchema,
    executedAt: IsoDateStringSchema,
    evidenceHash: z.string().min(1).max(256),
    titleKey: z.string().min(1).max(128),
    signature: z
      .object({
        algorithm: z.string().min(1).max(64),
        keyId: z.string().min(1).max(128),
        value: z.string().min(1).max(2048),
      })
      .strict(),
  })
  .strict();

/** Request body for `POST /v1/retention/dispositions/:id/certificate` (regenerate). */
export const GenerateDispositionCertificateRequestSchema = z
  .object({
    format: z.enum(['json', 'pdf', 'csv']).default('json'),
  })
  .strict();

// ---------------------------------------------------------------------------
// Predictive legal-hold suggestion
// ---------------------------------------------------------------------------

/** `z.infer` matches `PredictiveLegalHoldSuggestion`. */
export const PredictiveLegalHoldSuggestionSchema = z
  .object({
    tenantId: TenantIdSchema,
    documentId: DocumentIdSchema,
    suggestedReason: LegalHoldReasonSchema,
    confidence: z.number().int().min(1).max(100),
    explanationKey: z.string().min(1).max(128),
    requiresHumanApproval: z.literal(true),
    suggestedAt: IsoDateStringSchema,
  })
  .strict();
