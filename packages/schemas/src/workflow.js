"use strict";
/**
 * @smart-edms/schemas — workflows, approvals, signatures (spec §9.8)
 *
 * Zod schemas for: definition create (with BPMN/CMMN/DMN kind), instance
 * start, approval submit/reject/delegate, and AI-generated draft (marked
 * with `isAiDraft: true` flag).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticNegotiatorResultSchema = exports.AiWorkflowDraftSchema = exports.SubmitApprovalRequestSchema = exports.ApprovalSchema = exports.StartWorkflowInstanceResponseSchema = exports.StartWorkflowInstanceRequestSchema = exports.WorkflowInstanceSchema = exports.UpdateWorkflowDefinitionRequestSchema = exports.CreateWorkflowDefinitionResponseSchema = exports.CreateWorkflowDefinitionRequestSchema = exports.WorkflowDefinitionSchema = exports.WorkflowStepSchema = exports.WorkflowStepAssigneeSchema = exports.SignatureKindSchema = exports.ApprovalDecisionSchema = exports.WorkflowStepStatusSchema = exports.WorkflowStatusSchema = exports.WorkflowDefinitionStatusSchema = exports.WorkflowModelKindSchema = exports.ApprovalIdSchema = exports.WorkflowStepIdSchema = exports.WorkflowInstanceIdSchema = exports.WorkflowDefinitionIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const document_1 = require("./document");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.WorkflowDefinitionIdSchema = common_1.UuidSchema.transform((v) => v);
exports.WorkflowInstanceIdSchema = common_1.UuidSchema.transform((v) => v);
exports.WorkflowStepIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ApprovalIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `WorkflowModelKind`. */
exports.WorkflowModelKindSchema = zod_1.z.enum(['bpmn', 'cmmn', 'dmn']);
/** `z.infer` === `WorkflowDefinitionStatus`. */
exports.WorkflowDefinitionStatusSchema = zod_1.z.enum([
    'draft',
    'published',
    'archived',
    'deprecated',
]);
/** `z.infer` === `WorkflowStatus`. */
exports.WorkflowStatusSchema = zod_1.z.enum([
    'pending',
    'running',
    'paused',
    'completed',
    'cancelled',
    'failed',
    'escalated',
]);
/** `z.infer` === `WorkflowStepStatus`. */
exports.WorkflowStepStatusSchema = zod_1.z.enum([
    'not_started',
    'in_progress',
    'waiting_for_approval',
    'approved',
    'rejected',
    'skipped',
    'escalated',
    'completed',
]);
/** `z.infer` === `ApprovalDecision`. */
exports.ApprovalDecisionSchema = zod_1.z.enum([
    'approve',
    'reject',
    'delegate',
    'escalate',
    'recuse',
]);
/** `z.infer` === `SignatureKind`. */
exports.SignatureKindSchema = zod_1.z.enum([
    'audit_trail',
    'electronic_acknowledgment',
    'qualified_esignature',
]);
// ---------------------------------------------------------------------------
// Step / Definition
// ---------------------------------------------------------------------------
/** `z.infer` matches `WorkflowStep.assignee` (discriminated on `kind`). */
exports.WorkflowStepAssigneeSchema = zod_1.z.discriminatedUnion('kind', [
    zod_1.z.object({ kind: zod_1.z.literal('role'), roleId: common_1.UuidSchema }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('group'), groupId: common_1.UuidSchema }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('user'), userId: user_1.UserIdSchema }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('dynamic'), resolverCode: zod_1.z.string().min(1).max(64) }).strict(),
]);
/** `z.infer` matches `WorkflowStep`. */
exports.WorkflowStepSchema = zod_1.z
    .object({
    id: exports.WorkflowStepIdSchema,
    definitionId: exports.WorkflowDefinitionIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    stepOrder: zod_1.z.number().int().min(1),
    titleKey: zod_1.z.string().min(1).max(128),
    descriptionKey: zod_1.z.string().min(1).max(128).nullable(),
    assignee: exports.WorkflowStepAssigneeSchema,
    parallel: zod_1.z.boolean(),
    dueInHours: zod_1.z.number().int().min(1).nullable(),
    signatureRequired: zod_1.z.boolean(),
    signatureKind: exports.SignatureKindSchema.nullable(),
    enabled: zod_1.z.boolean(),
})
    .strict();
/** `z.infer` matches `WorkflowDefinition`. */
exports.WorkflowDefinitionSchema = zod_1.z
    .object({
    id: exports.WorkflowDefinitionIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(0).max(2000).nullable(),
    modelKind: exports.WorkflowModelKindSchema,
    modelPayload: zod_1.z.string().min(1).max(5_000_000),
    status: exports.WorkflowDefinitionStatusSchema,
    version: zod_1.z.number().int().min(1),
    steps: zod_1.z.array(exports.WorkflowStepSchema),
    aiGenerated: zod_1.z.boolean(),
    humanReviewed: zod_1.z.boolean(),
    createdBy: user_1.UserIdSchema,
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    publishedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
// ---------------------------------------------------------------------------
// Definition CRUD DTOs
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/admin/workflows/definitions`. */
exports.CreateWorkflowDefinitionRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(0).max(2000).optional(),
    modelKind: exports.WorkflowModelKindSchema,
    modelPayload: zod_1.z.string().min(1).max(5_000_000),
    steps: zod_1.z.array(zod_1.z
        .object({
        stepOrder: zod_1.z.number().int().min(1),
        titleKey: zod_1.z.string().min(1).max(128),
        descriptionKey: zod_1.z.string().min(1).max(128).nullable().optional(),
        assignee: exports.WorkflowStepAssigneeSchema,
        parallel: zod_1.z.boolean().default(false),
        dueInHours: zod_1.z.number().int().min(1).nullable().optional(),
        signatureRequired: zod_1.z.boolean().default(false),
        signatureKind: exports.SignatureKindSchema.nullable().optional(),
        enabled: zod_1.z.boolean().default(true),
    })
        .strict()),
    // AI-generated drafts MUST be marked per spec §9.8.
    isAiDraft: zod_1.z.boolean().default(false),
})
    .strict();
/** Response body for create workflow definition. */
exports.CreateWorkflowDefinitionResponseSchema = zod_1.z
    .object({
    definition: exports.WorkflowDefinitionSchema,
    // Warnings surfaced for AI drafts requiring human review.
    warnings: zod_1.z.array(zod_1.z.string().min(1).max(512)).default([]),
})
    .strict();
/** Request body for `PATCH /v1/admin/workflows/definitions/:id`. */
exports.UpdateWorkflowDefinitionRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().min(0).max(2000).optional(),
    modelPayload: zod_1.z.string().min(1).max(5_000_000).optional(),
    steps: zod_1.z.array(exports.WorkflowStepSchema).optional(),
    status: exports.WorkflowDefinitionStatusSchema.optional(),
    // Marking human review of an AI draft.
    humanReviewed: zod_1.z.boolean().optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Instance / Approval
// ---------------------------------------------------------------------------
/** `z.infer` matches `WorkflowInstance.context` — open JSON bag. */
const WorkflowContextSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
/** `z.infer` matches `WorkflowInstance`. */
exports.WorkflowInstanceSchema = zod_1.z
    .object({
    id: exports.WorkflowInstanceIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    definitionId: exports.WorkflowDefinitionIdSchema,
    definitionVersion: zod_1.z.number().int().min(1),
    documentId: document_1.DocumentIdSchema.nullable(),
    initiatedBy: user_1.UserIdSchema,
    status: exports.WorkflowStatusSchema,
    currentStepId: exports.WorkflowStepIdSchema.nullable(),
    startedAt: common_1.IsoDateStringSchema,
    completedAt: common_1.IsoDateStringSchema.nullable(),
    cancelledAt: common_1.IsoDateStringSchema.nullable(),
    // `context` is an open JSON bag — server-side narrows by definition.
    context: WorkflowContextSchema,
})
    .strict();
/** Request body for `POST /v1/workflows/definitions/:id/instances` (start). */
exports.StartWorkflowInstanceRequestSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema.nullable().optional(),
    // Context variables for the workflow.
    context: WorkflowContextSchema.default({}),
})
    .strict();
/** Response body for start workflow. */
exports.StartWorkflowInstanceResponseSchema = zod_1.z
    .object({
    instance: exports.WorkflowInstanceSchema,
})
    .strict();
/** `z.infer` matches `Approval`. */
exports.ApprovalSchema = zod_1.z
    .object({
    id: exports.ApprovalIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    instanceId: exports.WorkflowInstanceIdSchema,
    stepId: exports.WorkflowStepIdSchema,
    approverUserId: user_1.UserIdSchema,
    assignedToUserId: user_1.UserIdSchema,
    decision: exports.ApprovalDecisionSchema.nullable(),
    reasonKey: zod_1.z.string().min(1).max(128).nullable(),
    comment: zod_1.z.string().min(0).max(4000).nullable(),
    signature: zod_1.z
        .object({
        kind: exports.SignatureKindSchema,
        attestationHash: zod_1.z.string().min(1).max(256),
        signedAt: common_1.IsoDateStringSchema,
    })
        .nullable(),
    delegatedToUserId: user_1.UserIdSchema.nullable(),
    dueAt: common_1.IsoDateStringSchema.nullable(),
    decidedAt: common_1.IsoDateStringSchema.nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/workflows/approvals/:id` (submit decision). */
exports.SubmitApprovalRequestSchema = zod_1.z
    .object({
    decision: exports.ApprovalDecisionSchema,
    comment: zod_1.z.string().min(0).max(4000).optional(),
    reasonKey: zod_1.z.string().min(1).max(128).optional(),
    // For `delegate` decision.
    delegateToUserId: user_1.UserIdSchema.optional(),
    // For signature-required steps.
    signature: zod_1.z
        .object({
        kind: exports.SignatureKindSchema,
        attestationHash: zod_1.z.string().min(1).max(256),
    })
        .optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// AI-generated workflow draft (spec §9.8)
// ---------------------------------------------------------------------------
/**
 * AI-generated workflow draft. The `isAiDraft: true` flag is REQUIRED and
 * hardcoded — schema rejects any payload that doesn't set it (spec §9.8).
 */
exports.AiWorkflowDraftSchema = zod_1.z
    .object({
    isAiDraft: zod_1.z.literal(true),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(0).max(2000),
    modelKind: exports.WorkflowModelKindSchema,
    modelPayload: zod_1.z.string().min(1).max(5_000_000),
    // Localised risk-memo summary key.
    riskMemoSummaryKey: zod_1.z.string().min(1).max(128),
    // AI confidence score in [1,100].
    confidence: zod_1.z.number().int().min(1).max(100),
    requiresHumanSignOff: zod_1.z.literal(true),
})
    .strict();
/** `z.infer` matches `AgenticNegotiatorResult` (§9.8). */
exports.AgenticNegotiatorResultSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    documentId: document_1.DocumentIdSchema,
    dmnDecisionId: common_1.UuidSchema,
    redlinedVersionId: common_1.UuidSchema.nullable(),
    riskMemoSummaryKey: zod_1.z.string().min(1).max(128),
    prefillWorkflowInstanceId: exports.WorkflowInstanceIdSchema.nullable(),
    aiGenerated: zod_1.z.literal(true),
    requiresHumanSignOff: zod_1.z.literal(true),
})
    .strict();
//# sourceMappingURL=workflow.js.map