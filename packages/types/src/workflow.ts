/**
 * @smart-edms/types — workflows, approvals, signatures (spec §9.8)
 *
 * Purpose: model BPMN / CMMN / DMN workflow definitions, instances, steps,
 * approvals, and electronic acknowledgments. Workflow execution must be
 * durable and queue-backed (spec §9.8); AI-generated drafts must be marked.
 */

import type { ISODateString, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId } from './document';

/** Branded workflow-definition identifier. */
export type WorkflowDefinitionId = UUID;

/** Branded workflow-instance identifier. */
export type WorkflowInstanceId = UUID;

/** Branded workflow-step identifier. */
export type WorkflowStepId = UUID

/** Branded approval identifier. */
export type ApprovalId = UUID

/**
 * Standardized process-modeling kinds (spec §9.8).
 *  - `bpmn` for standard processes
 *  - `cmmn` for adaptive case management
 *  - `dmn` for business rules and decision tables
 */
export type WorkflowModelKind = 'bpmn' | 'cmmn' | 'dmn';

/** Lifecycle status of a workflow definition. */
export type WorkflowDefinitionStatus = 'draft' | 'published' | 'archived' | 'deprecated';

/** Lifecycle status of a running workflow instance. */
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'escalated';

/** Lifecycle status of a single workflow step. */
export type WorkflowStepStatus =
  | 'not_started'
  | 'in_progress'
  | 'waiting_for_approval'
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'escalated'
  | 'completed';

/** Result of an approval decision. */
export type ApprovalDecision = 'approve' | 'reject' | 'delegate' | 'escalate' | 'recuse';

/** Signature / acknowledgment kind (spec §9.8 — basic audit-trail signatures). */
export type SignatureKind = 'audit_trail' | 'electronic_acknowledgment' | 'qualified_esignature';

/**
 * Workflow step definition. Each step has an assignee policy, optional due
 * date, and may require a signature acknowledgment.
 */
export interface WorkflowStep {
  readonly id: WorkflowStepId;
  readonly definitionId: WorkflowDefinitionId;
  readonly tenantId: TenantId;
  /** Step order within the workflow. */
  readonly stepOrder: number;
  /** Localised title key, rendered via `t()`. */
  readonly titleKey: string;
  readonly descriptionKey: string | null;
  /** Assignee resolver: a role, group, or named user. */
  readonly assignee:
    | { readonly kind: 'role'; readonly roleId: UUID }
    | { readonly kind: 'group'; readonly groupId: UUID }
    | { readonly kind: 'user'; readonly userId: UserId }
    | { readonly kind: 'dynamic'; readonly resolverCode: string };
  /** Whether this step is part of a parallel branch. */
  readonly parallel: boolean;
  /** Optional due-date offset in hours from instance start. */
  readonly dueInHours: number | null;
  /** Whether a signature acknowledgment is required (spec §9.8). */
  readonly signatureRequired: boolean;
  readonly signatureKind: SignatureKind | null;
  readonly enabled: boolean;
}

/**
 * Workflow definition. May be BPMN, CMMN, or DMN. Drafts created by AI
 * Workflow Generation must carry `aiGenerated: true` (spec §9.8).
 */
export interface WorkflowDefinition {
  readonly id: WorkflowDefinitionId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly description: string | null;
  readonly modelKind: WorkflowModelKind;
  /** Opaque serialised model payload (BPMN XML, CMMN XML, or DMN XML). */
  readonly modelPayload: string;
  readonly status: WorkflowDefinitionStatus;
  readonly version: number;
  readonly steps: readonly WorkflowStep[];
  /** Whether the definition was drafted by AI (must be marked). */
  readonly aiGenerated: boolean;
  /** Whether human review has been completed for AI drafts. */
  readonly humanReviewed: boolean;
  readonly createdBy: UserId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly publishedAt: ISODateString | null;
}

/**
 * Approval record. One per approver per step. Tracks decision, comment, and
 * optional signature attestation.
 */
export interface Approval {
  readonly id: ApprovalId;
  readonly tenantId: TenantId;
  readonly instanceId: WorkflowInstanceId;
  readonly stepId: WorkflowStepId;
  readonly approverUserId: UserId;
  /** Original assignee; differs from approver only when delegated. */
  readonly assignedToUserId: UserId;
  readonly decision: ApprovalDecision | null;
  /** Localised decision-reason key. */
  readonly reasonKey: string | null;
  readonly comment: string | null;
  /** Signature attestation blob (audit-trail only by default). */
  readonly signature: {
    readonly kind: SignatureKind;
    readonly attestationHash: string;
    readonly signedAt: ISODateString;
  } | null;
  readonly delegatedToUserId: UserId | null;
  readonly dueAt: ISODateString | null;
  readonly decidedAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Running workflow instance. State changes must be transactional (spec §9.8).
 */
export interface WorkflowInstance {
  readonly id: WorkflowInstanceId;
  readonly tenantId: TenantId;
  readonly definitionId: WorkflowDefinitionId;
  readonly definitionVersion: number;
  /** Optional document that triggered the workflow. */
  readonly documentId: DocumentId | null;
  /** Initiating user (or service account id). */
  readonly initiatedBy: UserId;
  readonly status: WorkflowStatus;
  readonly currentStepId: WorkflowStepId | null;
  readonly startedAt: ISODateString;
  readonly completedAt: ISODateString | null;
  readonly cancelledAt: ISODateString | null;
  /** Context payload (input variables for the workflow). */
  readonly context: Readonly<Record<string, unknown>>;
}

/**
 * Agentic document negotiator result (spec §9.8). When an uploaded contract
 * contradicts a tenant's DMN policy, the AI drafts a redlined addendum,
 * generates a risk memo, and routes a pre-filled approval workflow. The
 * draft must be marked and require human sign-off.
 */
export interface AgenticNegotiatorResult {
  readonly tenantId: TenantId;
  readonly documentId: DocumentId;
  readonly dmnDecisionId: UUID;
  /** Redlined addendum document version id (always a draft). */
  readonly redlinedVersionId: UUID | null;
  /** Localised risk-memo summary; the full memo is stored as a document. */
  readonly riskMemoSummaryKey: string;
  /** Pre-filled workflow instance awaiting human sign-off. */
  readonly prefillWorkflowInstanceId: WorkflowInstanceId | null;
  /** Always true — AI-generated workflow drafts must be marked (§9.8). */
  readonly aiGenerated: true;
  readonly requiresHumanSignOff: true;
}
