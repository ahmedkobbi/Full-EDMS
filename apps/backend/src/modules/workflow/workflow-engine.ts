/**
 * Smart EDMS — Minimal workflow step-router engine (spec §9.8).
 *
 * This is NOT a full BPMN/CMMN/DMN execution engine — it is a minimal,
 * deterministic step router that supports the common cases the Smart EDMS
 * workflow module needs:
 *
 *  - Sequential step flow (step N → step N+1)
 *  - Parallel branches (multiple steps with the same `stepOrder` advance
 *    together; the instance moves to the next order only when ALL parallel
 *    steps at the current order are completed/approved).
 *  - Escalation: when a step is `escalated`, the engine routes the
 *    instance to an explicit escalation step (if defined) or marks the
 *    instance as `ESCALATED`.
 *  - Rejection: when a step is `rejected`, the instance moves to `REJECTED`
 *    (terminal).
 *
 * The full BPMN/CMMN/DMN semantics (gateways, events, decision tables) are
 * out of scope here; they are interpreted by an external engine (e.g.
 * Camunda, bpmn-engine) wired up in a follow-up task. For now, this engine
 * computes the next step from the `steps` array stored in
 * `WorkflowDefinition.definitionJson`.
 *
 * Critical rules:
 *  - State changes are computed by the engine but persisted by the service
 *    in a transaction. The engine itself is pure: it takes the current
 *    state and returns the next state without touching the DB.
 *  - The engine never auto-publishes AI drafts — that is enforced in the
 *    service layer.
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types — these mirror the Zod schemas in dto.ts but are minimal so the
// engine has no Zod dependency (keeps it pure and testable).
// ---------------------------------------------------------------------------

export interface EngineStep {
  readonly stepOrder: number;
  readonly titleKey: string;
  readonly assignee:
    | { readonly kind: 'role'; readonly roleId: string }
    | { readonly kind: 'group'; readonly groupId: string }
    | { readonly kind: 'user'; readonly userId: string }
    | { readonly kind: 'dynamic'; readonly resolverCode: string };
  readonly parallel: boolean;
  readonly dueInHours: number | null;
  readonly signatureRequired: boolean;
  readonly signatureKind: string | null;
  readonly enabled: boolean;
}

export interface EngineDefinition {
  readonly steps: readonly EngineStep[];
}

export type EngineStepStatus =
  | 'not_started'
  | 'in_progress'
  | 'waiting_for_approval'
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'escalated'
  | 'completed';

export interface EngineStepState {
  readonly stepOrder: number;
  readonly status: EngineStepStatus;
  readonly assigneeId?: string | null;
  readonly delegateId?: string | null;
}

export interface EngineInstance {
  readonly status:
    | 'PENDING'
    | 'RUNNING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'FAILED'
    | 'COMPLETED';
  readonly currentStepOrder: number | null;
  readonly steps: readonly EngineStepState[];
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type RouteResult =
  | { readonly kind: 'advance'; readonly nextStepOrder: number; readonly parallel: boolean }
  | { readonly kind: 'complete'; readonly finalStatus: 'COMPLETED' | 'APPROVED' }
  | { readonly kind: 'reject'; readonly reason?: string }
  | { readonly kind: 'escalate'; readonly escalationStepOrder?: number }
  | { readonly kind: 'wait'; readonly reason: string };

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Compute the next step for an instance after a step transition.
 *
 * Algorithm:
 *  1. Find the current step order. If null, the instance hasn't started —
 *     the caller should call `computeInitialStep`.
 *  2. Find all steps at the current order (parallel branch).
 *  3. If ANY step at the current order is `rejected` → return `reject`.
 *  4. If ANY step at the current order is `escalated` → return `escalate`.
 *  5. If NOT ALL steps at the current order are terminal
 *     (`approved`/`completed`/`skipped`) → return `wait` (parallel branch
 *     still in flight).
 *  6. All steps at the current order are terminal-success → find the next
 *     order > current. If none → `complete`. Otherwise → `advance`.
 */
export function routeNext(
  definition: EngineDefinition,
  instance: EngineInstance,
): RouteResult {
  if (instance.status === 'COMPLETED' || instance.status === 'APPROVED') {
    return { kind: 'complete', finalStatus: instance.status };
  }
  if (instance.status === 'REJECTED' || instance.status === 'CANCELLED' || instance.status === 'FAILED') {
    return { kind: 'reject', reason: `instance already ${instance.status}` };
  }

  const currentOrder = instance.currentStepOrder;
  if (currentOrder === null) {
    // Should not happen post-start; treat as advance to the first step.
    const first = computeInitialStep(definition);
    if (!first) return { kind: 'complete', finalStatus: 'COMPLETED' };
    return { kind: 'advance', nextStepOrder: first.stepOrder, parallel: first.parallel };
  }

  // All steps at current order
  const parallelBranch = instance.steps.filter((s) => s.stepOrder === currentOrder);

  // Check rejection
  const rejected = parallelBranch.find((s) => s.status === 'rejected');
  if (rejected) {
    return { kind: 'reject', reason: `step ${currentOrder} rejected` };
  }

  // Check escalation
  const escalated = parallelBranch.find((s) => s.status === 'escalated');
  if (escalated) {
    // Look for an escalation step (one with a higher order whose titleKey
    // contains "escalation"). If none, mark the instance as escalated.
    const escalationStep = definition.steps
      .filter((s) => s.enabled && s.stepOrder > currentOrder)
      .find((s) => s.titleKey.toLowerCase().includes('escalation'));
    return {
      kind: 'escalate',
      escalationStepOrder: escalationStep?.stepOrder,
    };
  }

  // Check whether all parallel steps are terminal-success
  const terminalSuccess = new Set<EngineStepStatus>(['approved', 'completed', 'skipped']);
  const allDone = parallelBranch.length > 0 && parallelBranch.every((s) => terminalSuccess.has(s.status));
  if (!allDone) {
    return { kind: 'wait', reason: 'parallel branch in flight' };
  }

  // Find next enabled step with order > current
  const next = definition.steps
    .filter((s) => s.enabled && s.stepOrder > currentOrder)
    .sort((a, b) => a.stepOrder - b.stepOrder)[0];

  if (!next) {
    return { kind: 'complete', finalStatus: 'COMPLETED' };
  }

  // Determine if the next step is part of a parallel branch
  const nextParallelCount = definition.steps.filter(
    (s) => s.enabled && s.stepOrder === next.stepOrder,
  ).length;

  return {
    kind: 'advance',
    nextStepOrder: next.stepOrder,
    parallel: nextParallelCount > 1,
  };
}

/**
 * Compute the initial step for a fresh instance. Returns the lowest-order
 * enabled step. If there are multiple at the same order, returns the first
 * (parallel branch — the service will create all of them).
 */
export function computeInitialStep(
  definition: EngineDefinition,
): { readonly stepOrder: number; readonly parallel: boolean } | null {
  const enabled = definition.steps.filter((s) => s.enabled);
  if (enabled.length === 0) return null;
  const minOrder = Math.min(...enabled.map((s) => s.stepOrder));
  const parallelCount = enabled.filter((s) => s.stepOrder === minOrder).length;
  return { stepOrder: minOrder, parallel: parallelCount > 1 };
}

/**
 * Resolve a step's concrete assignee user id, given a resolver context.
 *
 * For `kind: 'user'`, returns the userId directly.
 * For `kind: 'role'` / `kind: 'group'`, the caller must provide a
 * `resolveRoleOrGroup` function that returns the first matching user id.
 * For `kind: 'dynamic'`, the caller provides `resolveDynamic`.
 */
export function resolveAssignee(
  step: EngineStep,
  ctx: {
    resolveRoleOrGroup?: (roleIdOrGroupId: string) => Promise<string | null>;
    resolveDynamic?: (resolverCode: string) => Promise<string | null>;
  },
): Promise<string | null> {
  switch (step.assignee.kind) {
    case 'user':
      return Promise.resolve(step.assignee.userId);
    case 'role':
      return ctx.resolveRoleOrGroup
        ? ctx.resolveRoleOrGroup(step.assignee.roleId)
        : Promise.resolve(null);
    case 'group':
      return ctx.resolveRoleOrGroup
        ? ctx.resolveRoleOrGroup(step.assignee.groupId)
        : Promise.resolve(null);
    case 'dynamic':
      return ctx.resolveDynamic
        ? ctx.resolveDynamic(step.assignee.resolverCode)
        : Promise.resolve(null);
  }
}

/**
 * Compute a basic audit-trail signature attestation hash for an approval.
 *
 * This is NOT a qualified e-signature — it is a tamper-evidence hash that
 * binds the approver, decision, comment, and timestamp. The hash is
 * sha256(`<instanceId>:<approverId>:<decision>:<commentHash>:<isoTime>`).
 *
 * The caller is responsible for storing the hash on the `Approval` row.
 */
export function computeApprovalAttestation(input: {
  readonly instanceId: string;
  readonly approverId: string;
  readonly decision: string;
  readonly comment: string | null;
  readonly isoTime: string;
}): string {
  const commentHash = input.comment
    ? createHash('sha256').update(input.comment).digest('hex').slice(0, 16)
    : 'null';
  return createHash('sha256')
    .update(`${input.instanceId}:${input.approverId}:${input.decision}:${commentHash}:${input.isoTime}`)
    .digest('hex');
}
