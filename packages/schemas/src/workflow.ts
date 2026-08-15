/**
 * @smart-edms/schemas — workflows, approvals, signatures (spec §9.8)
 *
 * Zod schemas for: definition create (with BPMN/CMMN/DMN kind), instance
 * start, approval submit/reject/delegate, and AI-generated draft (marked
 * with `isAiDraft: true` flag).
 */

import { z } from 'zod';
import type {
  ApprovalId,
  WorkflowDefinitionId,
  WorkflowInstanceId,
  WorkflowStepId,
} from '@smart-edms/types';
import { IsoDateStringSchema, UuidSchema } from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { DocumentIdSchema } from './document';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const WorkflowDefinitionIdSchema = UuidSchema.transform(
  (v): WorkflowDefinitionId => v as WorkflowDefinitionId,
);
export const WorkflowInstanceIdSchema = UuidSchema.transform(
  (v): WorkflowInstanceId => v as WorkflowInstanceId,
);
export const WorkflowStepIdSchema = UuidSchema.transform(
  (v): WorkflowStepId => v as WorkflowStepId,
);
export const ApprovalIdSchema = UuidSchema.transform(
  (v): ApprovalId => v as ApprovalId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `WorkflowModelKind`. */
export const WorkflowModelKindSchema = z.enum(['bpmn', 'cmmn', 'dmn']);

/** `z.infer` === `WorkflowDefinitionStatus`. */
export const WorkflowDefinitionStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
  'deprecated',
]);

/** `z.infer` === `WorkflowStatus`. */
export const WorkflowStatusSchema = z.enum([
  'pending',
  'running',
  'paused',
  'completed',
  'cancelled',
  'failed',
  'escalated',
]);

/** `z.infer` === `WorkflowStepStatus`. */
export const WorkflowStepStatusSchema = z.enum([
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
export const ApprovalDecisionSchema = z.enum([
  'approve',
  'reject',
  'delegate',
  'escalate',
  'recuse',
]);

/** `z.infer` === `SignatureKind`. */
export const SignatureKindSchema = z.enum([
  'audit_trail',
  'electronic_acknowledgment',
  'qualified_esignature',
]);

// ---------------------------------------------------------------------------
// Step / Definition
// ---------------------------------------------------------------------------

/** `z.infer` matches `WorkflowStep.assignee` (discriminated on `kind`). */
export const WorkflowStepAssigneeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('role'), roleId: UuidSchema }).strict(),
  z.object({ kind: z.literal('group'), groupId: UuidSchema }).strict(),
  z.object({ kind: z.literal('user'), userId: UserIdSchema }).strict(),
  z.object({ kind: z.literal('dynamic'), resolverCode: z.string().min(1).max(64) }).strict(),
]);

/** `z.infer` matches `WorkflowStep`. */
export const WorkflowStepSchema = z
  .object({
    id: WorkflowStepIdSchema,
    definitionId: WorkflowDefinitionIdSchema,
    tenantId: TenantIdSchema,
    stepOrder: z.number().int().min(1),
    titleKey: z.string().min(1).max(128),
    descriptionKey: z.string().min(1).max(128).nullable(),
    assignee: WorkflowStepAssigneeSchema,
    parallel: z.boolean(),
    dueInHours: z.number().int().min(1).nullable(),
    signatureRequired: z.boolean(),
    signatureKind: SignatureKindSchema.nullable(),
    enabled: z.boolean(),
  })
  .strict();

/** `z.infer` matches `WorkflowDefinition`. */
export const WorkflowDefinitionSchema = z
  .object({
    id: WorkflowDefinitionIdSchema,
    tenantId: TenantIdSchema,
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).nullable(),
    modelKind: WorkflowModelKindSchema,
    modelPayload: z.string().min(1).max(5_000_000),
    status: WorkflowDefinitionStatusSchema,
    version: z.number().int().min(1),
    steps: z.array(WorkflowStepSchema),
    aiGenerated: z.boolean(),
    humanReviewed: z.boolean(),
    createdBy: UserIdSchema,
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    publishedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Definition CRUD DTOs
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/admin/workflows/definitions`. */
export const CreateWorkflowDefinitionRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).optional(),
    modelKind: WorkflowModelKindSchema,
    modelPayload: z.string().min(1).max(5_000_000),
    steps: z.array(
      z
        .object({
          stepOrder: z.number().int().min(1),
          titleKey: z.string().min(1).max(128),
          descriptionKey: z.string().min(1).max(128).nullable().optional(),
          assignee: WorkflowStepAssigneeSchema,
          parallel: z.boolean().default(false),
          dueInHours: z.number().int().min(1).nullable().optional(),
          signatureRequired: z.boolean().default(false),
          signatureKind: SignatureKindSchema.nullable().optional(),
          enabled: z.boolean().default(true),
        })
        .strict(),
    ),
    // AI-generated drafts MUST be marked per spec §9.8.
    isAiDraft: z.boolean().default(false),
  })
  .strict();

/** Response body for create workflow definition. */
export const CreateWorkflowDefinitionResponseSchema = z
  .object({
    definition: WorkflowDefinitionSchema,
    // Warnings surfaced for AI drafts requiring human review.
    warnings: z.array(z.string().min(1).max(512)).default([]),
  })
  .strict();

/** Request body for `PATCH /v1/admin/workflows/definitions/:id`. */
export const UpdateWorkflowDefinitionRequestSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(0).max(2000).optional(),
    modelPayload: z.string().min(1).max(5_000_000).optional(),
    steps: z.array(WorkflowStepSchema).optional(),
    status: WorkflowDefinitionStatusSchema.optional(),
    // Marking human review of an AI draft.
    humanReviewed: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Instance / Approval
// ---------------------------------------------------------------------------

/** `z.infer` matches `WorkflowInstance.context` — open JSON bag. */
const WorkflowContextSchema = z.record(z.string(), z.unknown());

/** `z.infer` matches `WorkflowInstance`. */
export const WorkflowInstanceSchema = z
  .object({
    id: WorkflowInstanceIdSchema,
    tenantId: TenantIdSchema,
    definitionId: WorkflowDefinitionIdSchema,
    definitionVersion: z.number().int().min(1),
    documentId: DocumentIdSchema.nullable(),
    initiatedBy: UserIdSchema,
    status: WorkflowStatusSchema,
    currentStepId: WorkflowStepIdSchema.nullable(),
    startedAt: IsoDateStringSchema,
    completedAt: IsoDateStringSchema.nullable(),
    cancelledAt: IsoDateStringSchema.nullable(),
    // `context` is an open JSON bag — server-side narrows by definition.
    context: WorkflowContextSchema,
  })
  .strict();

/** Request body for `POST /v1/workflows/definitions/:id/instances` (start). */
export const StartWorkflowInstanceRequestSchema = z
  .object({
    documentId: DocumentIdSchema.nullable().optional(),
    // Context variables for the workflow.
    context: WorkflowContextSchema.default({}),
  })
  .strict();

/** Response body for start workflow. */
export const StartWorkflowInstanceResponseSchema = z
  .object({
    instance: WorkflowInstanceSchema,
  })
  .strict();

/** `z.infer` matches `Approval`. */
export const ApprovalSchema = z
  .object({
    id: ApprovalIdSchema,
    tenantId: TenantIdSchema,
    instanceId: WorkflowInstanceIdSchema,
    stepId: WorkflowStepIdSchema,
    approverUserId: UserIdSchema,
    assignedToUserId: UserIdSchema,
    decision: ApprovalDecisionSchema.nullable(),
    reasonKey: z.string().min(1).max(128).nullable(),
    comment: z.string().min(0).max(4000).nullable(),
    signature: z
      .object({
        kind: SignatureKindSchema,
        attestationHash: z.string().min(1).max(256),
        signedAt: IsoDateStringSchema,
      })
      .nullable(),
    delegatedToUserId: UserIdSchema.nullable(),
    dueAt: IsoDateStringSchema.nullable(),
    decidedAt: IsoDateStringSchema.nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/workflows/approvals/:id` (submit decision). */
export const SubmitApprovalRequestSchema = z
  .object({
    decision: ApprovalDecisionSchema,
    comment: z.string().min(0).max(4000).optional(),
    reasonKey: z.string().min(1).max(128).optional(),
    // For `delegate` decision.
    delegateToUserId: UserIdSchema.optional(),
    // For signature-required steps.
    signature: z
      .object({
        kind: SignatureKindSchema,
        attestationHash: z.string().min(1).max(256),
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
export const AiWorkflowDraftSchema = z
  .object({
    isAiDraft: z.literal(true),
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000),
    modelKind: WorkflowModelKindSchema,
    modelPayload: z.string().min(1).max(5_000_000),
    // Localised risk-memo summary key.
    riskMemoSummaryKey: z.string().min(1).max(128),
    // AI confidence score in [1,100].
    confidence: z.number().int().min(1).max(100),
    requiresHumanSignOff: z.literal(true),
  })
  .strict();

/** `z.infer` matches `AgenticNegotiatorResult` (§9.8). */
export const AgenticNegotiatorResultSchema = z
  .object({
    tenantId: TenantIdSchema,
    documentId: DocumentIdSchema,
    dmnDecisionId: UuidSchema,
    redlinedVersionId: UuidSchema.nullable(),
    riskMemoSummaryKey: z.string().min(1).max(128),
    prefillWorkflowInstanceId: WorkflowInstanceIdSchema.nullable(),
    aiGenerated: z.literal(true),
    requiresHumanSignOff: z.literal(true),
  })
  .strict();
