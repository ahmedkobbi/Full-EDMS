"use strict";
/**
 * @smart-edms/schemas — retention, legal hold, disposition (spec §9.7)
 *
 * Zod schemas for: schedule create, hold create/remove, disposition approve,
 * certificate generate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveLegalHoldSuggestionSchema = exports.GenerateDispositionCertificateRequestSchema = exports.DispositionCertificateSchema = exports.ApproveDispositionResponseSchema = exports.ApproveDispositionRequestSchema = exports.DispositionRecordSchema = exports.AddLegalHoldDocumentsRequestSchema = exports.ReleaseLegalHoldRequestSchema = exports.CreateLegalHoldRequestSchema = exports.LegalHoldSchema = exports.UpdateRetentionScheduleRequestSchema = exports.CreateRetentionScheduleRequestSchema = exports.RetentionScheduleSchema = exports.RetentionTriggerSchema = exports.LegalHoldStatusSchema = exports.LegalHoldReasonSchema = exports.DispositionStatusSchema = exports.DispositionActionSchema = exports.DispositionRecordIdSchema = exports.LegalHoldIdSchema = exports.RetentionScheduleIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const document_1 = require("./document");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.RetentionScheduleIdSchema = common_1.UuidSchema.transform((v) => v);
exports.LegalHoldIdSchema = common_1.UuidSchema.transform((v) => v);
exports.DispositionRecordIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `DispositionAction`. */
exports.DispositionActionSchema = zod_1.z.enum([
    'destroy',
    'archive',
    'review',
    'transfer_to_custodian',
    'crypto_shred',
]);
/** `z.infer` === `DispositionStatus`. */
exports.DispositionStatusSchema = zod_1.z.enum([
    'pending',
    'approved',
    'in_progress',
    'completed',
    'cancelled',
    'blocked_by_legal_hold',
]);
/** `z.infer` === `LegalHoldReason`. */
exports.LegalHoldReasonSchema = zod_1.z.enum([
    'litigation',
    'regulatory_inquiry',
    'audit',
    'investigation',
    'compliance_review',
    'custom',
]);
/** `z.infer` === `LegalHoldStatus`. */
exports.LegalHoldStatusSchema = zod_1.z.enum(['active', 'released', 'superseded']);
// ---------------------------------------------------------------------------
// Retention trigger (discriminated)
// ---------------------------------------------------------------------------
/** `z.infer` matches `RetentionTrigger` (discriminated on `kind`). */
exports.RetentionTriggerSchema = zod_1.z.discriminatedUnion('kind', [
    zod_1.z.object({ kind: zod_1.z.literal('creation') }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('last_modified') }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('declaration_of_record') }).strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('workflow_completed'),
        workflowDefinitionId: common_1.UuidSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('classification_set'),
        classificationLabelId: common_1.UuidSchema,
    })
        .strict(),
    zod_1.z
        .object({ kind: zod_1.z.literal('custom'), resolverCode: zod_1.z.string().min(1).max(64) })
        .strict(),
]);
// ---------------------------------------------------------------------------
// Retention schedule
// ---------------------------------------------------------------------------
/** `z.infer` matches `RetentionSchedule`. */
exports.RetentionScheduleSchema = zod_1.z
    .object({
    id: exports.RetentionScheduleIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(0).max(2000).nullable(),
    labelKey: zod_1.z.string().min(1).max(128),
    trigger: exports.RetentionTriggerSchema,
    retentionDays: zod_1.z.number().int().min(0).max(36500),
    dispositionAction: exports.DispositionActionSchema,
    cryptoShreddingAllowed: zod_1.z.boolean(),
    reviewPeriodDays: zod_1.z.number().int().min(0).nullable(),
    enabled: zod_1.z.boolean(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/admin/retention/schedules`. */
exports.CreateRetentionScheduleRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(0).max(2000).optional(),
    labelKey: zod_1.z.string().min(1).max(128),
    trigger: exports.RetentionTriggerSchema,
    retentionDays: zod_1.z.number().int().min(0).max(36500),
    dispositionAction: exports.DispositionActionSchema,
    cryptoShreddingAllowed: zod_1.z.boolean().default(false),
    reviewPeriodDays: zod_1.z.number().int().min(0).nullable().optional(),
    enabled: zod_1.z.boolean().default(true),
})
    .strict();
/** Request body for `PATCH /v1/admin/retention/schedules/:id`. */
exports.UpdateRetentionScheduleRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().min(0).max(2000).optional(),
    labelKey: zod_1.z.string().min(1).max(128).optional(),
    retentionDays: zod_1.z.number().int().min(0).max(36500).optional(),
    dispositionAction: exports.DispositionActionSchema.optional(),
    cryptoShreddingAllowed: zod_1.z.boolean().optional(),
    reviewPeriodDays: zod_1.z.number().int().min(0).nullable().optional(),
    enabled: zod_1.z.boolean().optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Legal hold
// ---------------------------------------------------------------------------
/** `z.infer` matches `LegalHold`. */
exports.LegalHoldSchema = zod_1.z
    .object({
    id: exports.LegalHoldIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    caseCode: zod_1.z.string().min(1).max(128),
    reason: exports.LegalHoldReasonSchema,
    description: zod_1.z.string().min(0).max(2000).nullable(),
    status: exports.LegalHoldStatusSchema,
    documentIds: zod_1.z.array(document_1.DocumentIdSchema),
    appliedBy: user_1.UserIdSchema,
    appliedAt: common_1.IsoDateStringSchema,
    releasedBy: user_1.UserIdSchema.nullable(),
    releasedAt: common_1.IsoDateStringSchema.nullable(),
    releaseReasonKey: zod_1.z.string().min(1).max(128).nullable(),
})
    .strict();
/** Request body for `POST /v1/legal-holds` (create hold). */
exports.CreateLegalHoldRequestSchema = zod_1.z
    .object({
    caseCode: zod_1.z.string().min(1).max(128),
    reason: exports.LegalHoldReasonSchema,
    description: zod_1.z.string().min(0).max(2000).optional(),
    documentIds: zod_1.z.array(document_1.DocumentIdSchema).min(1),
})
    .strict();
/** Request body for `DELETE /v1/legal-holds/:id` (release hold). */
exports.ReleaseLegalHoldRequestSchema = zod_1.z
    .object({
    releaseReasonKey: zod_1.z.string().min(1).max(128),
})
    .strict();
/** Request body for `POST /v1/legal-holds/:id/documents` (add documents). */
exports.AddLegalHoldDocumentsRequestSchema = zod_1.z
    .object({
    documentIds: zod_1.z.array(document_1.DocumentIdSchema).min(1),
})
    .strict();
// ---------------------------------------------------------------------------
// Disposition
// ---------------------------------------------------------------------------
/** `z.infer` matches `DispositionRecord`. */
exports.DispositionRecordSchema = zod_1.z
    .object({
    id: exports.DispositionRecordIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    documentId: document_1.DocumentIdSchema,
    scheduleId: exports.RetentionScheduleIdSchema,
    action: exports.DispositionActionSchema,
    status: exports.DispositionStatusSchema,
    trigger: exports.RetentionTriggerSchema,
    triggeredAt: common_1.IsoDateStringSchema,
    scheduledFor: common_1.IsoDateStringSchema,
    executedAt: common_1.IsoDateStringSchema.nullable(),
    approvedBy: user_1.UserIdSchema.nullable(),
    approvedAt: common_1.IsoDateStringSchema.nullable(),
    evidenceHash: zod_1.z.string().min(1).max(256).nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/retention/dispositions/:id/approve`. */
exports.ApproveDispositionRequestSchema = zod_1.z
    .object({
    comment: zod_1.z.string().min(0).max(2000).optional(),
})
    .strict();
/** Response body for disposition approve (includes certificate if completed). */
exports.ApproveDispositionResponseSchema = zod_1.z
    .object({
    record: exports.DispositionRecordSchema,
    certificate: zod_1.z.lazy(() => exports.DispositionCertificateSchema).nullable(),
})
    .strict();
/** `z.infer` matches `DispositionCertificate`. */
exports.DispositionCertificateSchema = zod_1.z
    .object({
    recordId: exports.DispositionRecordIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    documentId: document_1.DocumentIdSchema,
    action: exports.DispositionActionSchema,
    executedAt: common_1.IsoDateStringSchema,
    evidenceHash: zod_1.z.string().min(1).max(256),
    titleKey: zod_1.z.string().min(1).max(128),
    signature: zod_1.z
        .object({
        algorithm: zod_1.z.string().min(1).max(64),
        keyId: zod_1.z.string().min(1).max(128),
        value: zod_1.z.string().min(1).max(2048),
    })
        .strict(),
})
    .strict();
/** Request body for `POST /v1/retention/dispositions/:id/certificate` (regenerate). */
exports.GenerateDispositionCertificateRequestSchema = zod_1.z
    .object({
    format: zod_1.z.enum(['json', 'pdf', 'csv']).default('json'),
})
    .strict();
// ---------------------------------------------------------------------------
// Predictive legal-hold suggestion
// ---------------------------------------------------------------------------
/** `z.infer` matches `PredictiveLegalHoldSuggestion`. */
exports.PredictiveLegalHoldSuggestionSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    documentId: document_1.DocumentIdSchema,
    suggestedReason: exports.LegalHoldReasonSchema,
    confidence: zod_1.z.number().int().min(1).max(100),
    explanationKey: zod_1.z.string().min(1).max(128),
    requiresHumanApproval: zod_1.z.literal(true),
    suggestedAt: common_1.IsoDateStringSchema,
})
    .strict();
//# sourceMappingURL=retention.js.map