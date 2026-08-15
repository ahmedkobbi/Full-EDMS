/**
 * Smart EDMS — Workflow module DTOs (Zod schemas).
 *
 * Single source of truth for runtime validation of the Workflow REST
 * endpoints. Composes schemas from `@smart-edms/schemas` where applicable
 * (spec §9.8, §14, §15.4).
 *
 * Notes:
 *  - `tenantId` is always taken from the JWT, never the body.
 *  - `userId` is always taken from the JWT, never the body.
 *  - All schemas use `.strict()`.
 */

import { z } from 'zod';
import {
  WorkflowModelKindSchema,
  WorkflowStepAssigneeSchema,
  SignatureKindSchema,
  ApprovalDecisionSchema,
} from '@smart-edms/schemas';

// ---------------------------------------------------------------------------
// Step definition (used inside Create + Update bodies)
// ---------------------------------------------------------------------------

export const WorkflowStepInputSchema = z
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
  .strict();

export type WorkflowStepInput = z.infer<typeof WorkflowStepInputSchema>;

// ---------------------------------------------------------------------------
// POST /v1/workflows — create definition
// ---------------------------------------------------------------------------

export const CreateWorkflowBodySchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9_-]+$/, 'code must be lowercase, digits, underscore or hyphen'),
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).optional(),
    modelKind: WorkflowModelKindSchema,
    bpmnXml: z.string().min(1).max(5_000_000).optional(),
    cmmnXml: z.string().min(1).max(5_000_000).optional(),
    dmnTableXml: z.string().min(1).max(5_000_000).optional(),
    /** Definition-level steps array, stored as JSON in `definitionJson`. */
    steps: z.array(WorkflowStepInputSchema).min(1).max(100),
    /** AI-generated drafts MUST be marked — they cannot be auto-published. */
    isAiDraft: z.boolean().default(false),
  })
  .strict()
  .refine(
    (v) => {
      if (v.modelKind === 'bpmn' && !v.bpmnXml) return false;
      if (v.modelKind === 'cmmn' && !v.cmmnXml) return false;
      if (v.modelKind === 'dmn' && !v.dmnTableXml) return false;
      return true;
    },
    { message: 'model payload must match modelKind' },
  );

export type CreateWorkflowBody = z.infer<typeof CreateWorkflowBodySchema>;

// ---------------------------------------------------------------------------
// GET /v1/workflows — list definitions
// ---------------------------------------------------------------------------

export const WorkflowListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1024).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    modelKind: WorkflowModelKindSchema.optional(),
    code: z.string().min(1).max(64).optional(),
    /** Include AI drafts (default: true for designers, false otherwise). */
    includeAiDrafts: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
  })
  .strict();

export type WorkflowListQuery = z.infer<typeof WorkflowListQuerySchema>;

// ---------------------------------------------------------------------------
// PATCH /v1/workflows/:id — update draft
// ---------------------------------------------------------------------------

export const UpdateWorkflowBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(0).max(2000).optional(),
    bpmnXml: z.string().min(1).max(5_000_000).optional(),
    cmmnXml: z.string().min(1).max(5_000_000).optional(),
    dmnTableXml: z.string().min(1).max(5_000_000).optional(),
    steps: z.array(WorkflowStepInputSchema).min(1).max(100).optional(),
    /** Mark an AI draft as human-reviewed (enables publishing). */
    humanReviewed: z.boolean().optional(),
  })
  .strict();

export type UpdateWorkflowBody = z.infer<typeof UpdateWorkflowBodySchema>;

// ---------------------------------------------------------------------------
// POST /v1/workflows/:id/instantiate — start instance
// ---------------------------------------------------------------------------

export const InstantiateWorkflowBodySchema = z
  .object({
    documentId: z.string().uuid().optional(),
    /** Input variables for the workflow. */
    context: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type InstantiateWorkflowBody = z.infer<typeof InstantiateWorkflowBodySchema>;

// ---------------------------------------------------------------------------
// GET /v1/workflows/instances — list instances
// ---------------------------------------------------------------------------

export const WorkflowInstanceListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1024).optional(),
    status: z
      .enum(['PENDING', 'RUNNING', 'APPROVED', 'REJECTED', 'CANCELLED', 'FAILED', 'COMPLETED'])
      .optional(),
    documentId: z.string().uuid().optional(),
    /** Filter by assignee (current user by default). */
    assigneeId: z.string().uuid().optional(),
    /** Filter by definition id. */
    definitionId: z.string().uuid().optional(),
  })
  .strict();

export type WorkflowInstanceListQuery = z.infer<typeof WorkflowInstanceListQuerySchema>;

// ---------------------------------------------------------------------------
// POST /v1/workflows/instances/:id/approve — submit approval decision
// ---------------------------------------------------------------------------

export const SubmitApprovalBodySchema = z
  .object({
    decision: ApprovalDecisionSchema,
    comment: z.string().min(0).max(4000).optional(),
    reasonKey: z.string().min(1).max(128).optional(),
    /** Required when decision=delegate. */
    delegateToUserId: z.string().uuid().optional(),
    /** Signature attestation (audit-trail only by default). */
    signature: z
      .object({
        kind: SignatureKindSchema,
        attestationHash: z.string().min(1).max(256),
      })
      .optional(),
  })
  .strict()
  .refine(
    (v) => v.decision !== 'delegate' || Boolean(v.delegateToUserId),
    { message: 'delegateToUserId is required when decision=delegate' },
  );

export type SubmitApprovalBody = z.infer<typeof SubmitApprovalBodySchema>;

// ---------------------------------------------------------------------------
// POST /v1/workflows/instances/:id/delegate — delegate current step
// ---------------------------------------------------------------------------

export const DelegateStepBodySchema = z
  .object({
    delegateToUserId: z.string().uuid(),
    comment: z.string().min(0).max(4000).optional(),
    reasonKey: z.string().min(1).max(128).optional(),
  })
  .strict();

export type DelegateStepBody = z.infer<typeof DelegateStepBodySchema>;

// ---------------------------------------------------------------------------
// POST /v1/workflows/instances/:id/cancel — cancel instance
// ---------------------------------------------------------------------------

export const CancelInstanceBodySchema = z
  .object({
    reasonKey: z.string().min(1).max(128).optional(),
    comment: z.string().min(0).max(4000).optional(),
  })
  .strict();

export type CancelInstanceBody = z.infer<typeof CancelInstanceBodySchema>;
