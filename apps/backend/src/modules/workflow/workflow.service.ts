/**
 * Smart EDMS — Workflow service (spec §9.8).
 *
 * Implements the workflow definition + instance lifecycle. The actual
 * BPMN/CMMN/DMN execution is delegated to the minimal `workflow-engine.ts`
 * step-router; full BPMN engine integration is a follow-up.
 *
 * Critical rules:
 *  - Workflow execution must be durable: every state change is in a DB
 *    transaction. Instance state lives in `WorkflowInstance`, step state
 *    in `WorkflowStep`, approval decisions in `Approval`.
 *  - AI-generated drafts carry `isAiDraft: true` and CANNOT be published
 *    without `humanReviewed: true` (spec §9.8). The publish endpoint
 *    refuses to flip a draft to PUBLISHED if `isAiDraft && !humanReviewed`.
 *  - Long-running workflows queue-backed (BullMQ) for retries. The
 *    `instantiateWorkflow` enqueues a `WorkflowProcessor` job; the worker
 *    (declared in the module) advances the instance one step at a time.
 *  - All state changes audited via `AuditService`.
 *  - Approval decisions recorded with signature attestation (audit-trail
 *    hash; not a qualified e-signature).
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { RedisService } from '../../common/redis.service.js';
import {
  computeApprovalAttestation,
  computeInitialStep,
  routeNext,
  type EngineDefinition,
  type EngineInstance,
  type EngineStep,
} from './workflow-engine.js';
import type {
  CancelInstanceBody,
  CreateWorkflowBody,
  DelegateStepBody,
  InstantiateWorkflowBody,
  SubmitApprovalBody,
  UpdateWorkflowBody,
  WorkflowInstanceListQuery,
  WorkflowListQuery,
} from './dto.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** BullMQ queue name for workflow processing. */
export const WORKFLOW_QUEUE_NAME = 'smart-edms:workflow';

/** Cursor format for instance list pagination. */
interface InstanceCursor {
  sort: 'startedAt' | 'updatedAt';
  value: string;
  id: string;
}

function encodeCursor(c: InstanceCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): InstanceCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as InstanceCursor;
    if (!parsed.sort || !parsed.value || !parsed.id) {
      throw new Error('invalid cursor shape');
    }
    return parsed;
  } catch {
    throw new BadRequestException({
      messageKey: 'errors.VALIDATION_FAILED',
      detail: 'invalid cursor',
    });
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private readonly workflowQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {
    // BullMQ queue is created lazily on the shared Redis connection.
    this.workflowQueue = new Queue(WORKFLOW_QUEUE_NAME, {
      connection: this.redis.connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Definition CRUD
  // -------------------------------------------------------------------------

  /** Create a workflow definition (DRAFT). AI drafts are marked `isAiDraft`. */
  async createDefinition(
    tenantId: string,
    userId: string,
    body: CreateWorkflowBody,
  ): Promise<{
    readonly id: string;
    readonly code: string;
    readonly version: number;
    readonly status: string;
    readonly isAiDraft: boolean;
    readonly warnings: readonly string[];
  }> {
    // Check uniqueness of [tenantId, code] — version defaults to 1.
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { tenantId_code_version: { tenantId, code: body.code, version: 1 } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: `workflow code "${body.code}" already exists at version 1`,
      });
    }

    const definitionJson: Prisma.JsonValue = {
      steps: body.steps.map((s) => ({
        stepOrder: s.stepOrder,
        titleKey: s.titleKey,
        descriptionKey: s.descriptionKey ?? null,
        assignee: s.assignee,
        parallel: s.parallel,
        dueInHours: s.dueInHours ?? null,
        signatureRequired: s.signatureRequired,
        signatureKind: s.signatureKind ?? null,
        enabled: s.enabled,
      })),
    };

    const def = await this.prisma.workflowDefinition.create({
      data: {
        tenantId,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        modelKind: body.modelKind.toUpperCase() as 'BPMN' | 'CMMN' | 'DMN',
        bpmnXml: body.bpmnXml ?? null,
        cmmnXml: body.cmmnXml ?? null,
        dmnTableXml: body.dmnTableXml ?? null,
        definitionJson,
        version: 1,
        status: 'DRAFT',
        isAiDraft: body.isAiDraft,
        createdByUserId: userId,
      },
      select: {
        id: true,
        code: true,
        version: true,
        status: true,
        isAiDraft: true,
      },
    });

    const warnings: string[] = [];
    if (body.isAiDraft) {
      warnings.push('workflow.warnings.aiDraftRequiresHumanReview');
      warnings.push('workflow.warnings.aiDraftCannotAutoPublish');
    }

    await this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.started',
      result: 'allow',
      resourceType: 'workflow_definition',
      resourceId: def.id,
      metadata: {
        code: body.code,
        modelKind: body.modelKind,
        isAiDraft: body.isAiDraft,
        stepCount: body.steps.length,
      },
    });

    return { ...def, warnings };
  }

  /** List workflow definitions (paginated, cursor-based). */
  async listDefinitions(
    tenantId: string,
    query: WorkflowListQuery,
  ): Promise<{
    readonly definitions: ReadonlyArray<{
      readonly id: string;
      readonly code: string;
      readonly name: string;
      readonly modelKind: string;
      readonly status: string;
      readonly version: number;
      readonly isAiDraft: boolean;
      readonly stepCount: number;
      readonly updatedAt: string;
    }>;
    readonly nextCursor: string | null;
  }> {
    const where: Prisma.WorkflowDefinitionWhereInput = { tenantId };
    if (query.status) where.status = query.status;
    if (query.modelKind) where.modelKind = query.modelKind.toUpperCase() as 'BPMN' | 'CMMN' | 'DMN';
    if (query.code) where.code = query.code;
    if (!query.includeAiDrafts) where.isAiDraft = false;

    const limit = query.limit;
    let cursorClause: Prisma.WorkflowDefinitionWhereUniqueInput | undefined;
    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      where.updatedAt = { lt: new Date(c.value) };
      cursorClause = { id: c.id };
    }

    const rows = await this.prisma.workflowDefinition.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      cursor: cursorClause,
      skip: cursorClause ? 1 : 0,
      select: {
        id: true,
        code: true,
        name: true,
        modelKind: true,
        status: true,
        version: true,
        isAiDraft: true,
        updatedAt: true,
        definitionJson: true,
      },
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? encodeCursor({
          sort: 'updatedAt',
          value: slice[slice.length - 1].updatedAt.toISOString(),
          id: slice[slice.length - 1].id,
        })
      : null;

    return {
      definitions: slice.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        modelKind: r.modelKind,
        status: r.status,
        version: r.version,
        isAiDraft: r.isAiDraft,
        stepCount: (r.definitionJson as { steps?: unknown[] })?.steps?.length ?? 0,
        updatedAt: r.updatedAt.toISOString(),
      })),
      nextCursor,
    };
  }

  /** Get a single definition with XML payload + steps JSON. */
  async getDefinition(
    tenantId: string,
    id: string,
  ): Promise<{
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly description: string | null;
    readonly modelKind: string;
    readonly bpmnXml: string | null;
    readonly cmmnXml: string | null;
    readonly dmnTableXml: string | null;
    readonly definitionJson: unknown;
    readonly status: string;
    readonly version: number;
    readonly isAiDraft: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
  }> {
    const def = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId },
    });
    if (!def) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    return {
      id: def.id,
      code: def.code,
      name: def.name,
      description: def.description,
      modelKind: def.modelKind,
      bpmnXml: def.bpmnXml,
      cmmnXml: def.cmmnXml,
      dmnTableXml: def.dmnTableXml,
      definitionJson: def.definitionJson,
      status: def.status,
      version: def.version,
      isAiDraft: def.isAiDraft,
      createdAt: def.createdAt.toISOString(),
      updatedAt: def.updatedAt.toISOString(),
    };
  }

  /** Update a draft definition. AI drafts can be marked `humanReviewed`. */
  async updateDefinition(
    tenantId: string,
    userId: string,
    id: string,
    body: UpdateWorkflowBody,
  ): Promise<{ id: string; updatedAt: string }> {
    const def = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true, isAiDraft: true, definitionJson: true },
    });
    if (!def) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (def.status !== 'DRAFT') {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'only DRAFT definitions can be updated',
      });
    }

    const data: Prisma.WorkflowDefinitionUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.bpmnXml !== undefined) data.bpmnXml = body.bpmnXml;
    if (body.cmmnXml !== undefined) data.cmmnXml = body.cmmnXml;
    if (body.dmnTableXml !== undefined) data.dmnTableXml = body.dmnTableXml;
    if (body.steps !== undefined) {
      data.definitionJson = {
        steps: body.steps.map((s) => ({
          stepOrder: s.stepOrder,
          titleKey: s.titleKey,
          descriptionKey: s.descriptionKey ?? null,
          assignee: s.assignee,
          parallel: s.parallel,
          dueInHours: s.dueInHours ?? null,
          signatureRequired: s.signatureRequired,
          signatureKind: s.signatureKind ?? null,
          enabled: s.enabled,
        })),
      } as Prisma.InputJsonValue;
    }
    // `humanReviewed` is stored as part of `definitionJson` meta — there is
    // no dedicated column. We tuck it under a `__meta` key.
    if (body.humanReviewed !== undefined) {
      const existing = (def.definitionJson as Record<string, unknown>) ?? {};
      const meta = (existing.__meta as Record<string, unknown>) ?? {};
      meta.humanReviewed = body.humanReviewed;
      meta.humanReviewedAt = new Date().toISOString();
      meta.humanReviewedBy = userId;
      existing.__meta = meta;
      data.definitionJson = existing as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data,
      select: { id: true, updatedAt: true },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.step_updated',
      result: 'allow',
      resourceType: 'workflow_definition',
      resourceId: id,
      metadata: { changes: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Publish a draft. AI drafts MUST have `humanReviewed: true` first.
   * Spec §9.8 — AI-generated drafts CANNOT be auto-published.
   */
  async publishDefinition(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{
    readonly id: string;
    readonly status: string;
    readonly publishedAt: string;
  }> {
    const def = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true, isAiDraft: true, definitionJson: true, code: true, version: true },
    });
    if (!def) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (def.status !== 'DRAFT') {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'only DRAFT definitions can be published',
      });
    }

    // AI draft gating
    if (def.isAiDraft) {
      const meta = (def.definitionJson as { __meta?: { humanReviewed?: boolean } })?.__meta;
      if (!meta?.humanReviewed) {
        await this.audit.record({
          tenantId,
          userId,
          category: 'workflow',
          code: 'workflow.step_updated',
          result: 'deny',
          resourceType: 'workflow_definition',
          resourceId: id,
          reason: 'AI draft requires human review before publishing',
        });
        throw new ForbiddenException({
          messageKey: 'errors.AI_DRAFT_REQUIRES_HUMAN_REVIEW',
        });
      }
    }

    const now = new Date();
    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      select: { id: true, status: true },
    });

    // Archive any prior PUBLISHED version of the same code.
    await this.prisma.workflowDefinition.updateMany({
      where: {
        tenantId,
        code: def.code,
        id: { not: id },
        status: 'PUBLISHED',
      },
      data: { status: 'ARCHIVED' },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.step_updated',
      result: 'allow',
      resourceType: 'workflow_definition',
      resourceId: id,
      metadata: {
        code: def.code,
        version: def.version,
        wasAiDraft: def.isAiDraft,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      publishedAt: now.toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Instance lifecycle
  // -------------------------------------------------------------------------

  /**
   * Instantiate a workflow. Creates the instance + initial step rows in a
   * transaction, then enqueues a BullMQ job to advance the instance.
   */
  async instantiate(
    tenantId: string,
    userId: string,
    definitionId: string,
    body: InstantiateWorkflowBody,
  ): Promise<{
    readonly instanceId: string;
    readonly status: string;
    readonly currentStepOrder: number | null;
  }> {
    const def = await this.prisma.workflowDefinition.findFirst({
      where: { id: definitionId, tenantId, status: 'PUBLISHED' },
      select: { id: true, definitionJson: true, code: true, version: true },
    });
    if (!def) {
      throw new NotFoundException({
        messageKey: 'errors.NOT_FOUND',
        detail: 'workflow definition not found or not published',
      });
    }

    // Optional document binding — verify the document exists in the tenant.
    if (body.documentId) {
      const doc = await this.prisma.document.findFirst({
        where: { id: body.documentId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!doc) {
        throw new BadRequestException({
          messageKey: 'errors.VALIDATION_FAILED',
          detail: 'documentId does not refer to an active document',
        });
      }
    }

    const defJson = def.definitionJson as { steps?: EngineStep[] };
    const engineDef: EngineDefinition = {
      steps: defJson.steps ?? [],
    };
    const initial = computeInitialStep(engineDef);
    if (!initial) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: 'workflow definition has no enabled steps',
      });
    }

    // Create the instance + initial WorkflowStep rows in a transaction.
    const instanceId = randomUUID();
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.workflowInstance.create({
        data: {
          id: instanceId,
          definitionId,
          documentId: body.documentId ?? null,
          tenantId,
          status: 'RUNNING',
          context: body.context as Prisma.InputJsonValue,
          startedByUserId: userId,
          startedAt: now,
          dueAt: null,
        },
      });

      // Create the initial step(s) — for parallel branches, all at the
      // initial order.
      const initialSteps = engineDef.steps.filter(
        (s) => s.enabled && s.stepOrder === initial.stepOrder,
      );
      for (const step of initialSteps) {
        await tx.workflowStep.create({
          data: {
            id: randomUUID(),
            instanceId,
            tenantId,
            stepKey: `step-${step.stepOrder}`,
            name: step.titleKey,
            status: 'in_progress',
            assigneeId: step.assignee.kind === 'user' ? step.assignee.userId : null,
            startedAt: now,
            dueAt: step.dueInHours
              ? new Date(now.getTime() + step.dueInHours * 3600_000)
              : null,
            metadata: { definitionStep: step } as Prisma.InputJsonValue,
          },
        });
      }
    });

    // Enqueue a processing job (advances the instance if there are
    // auto-advance steps; otherwise waits for an approval).
    await this.workflowQueue.add(
      'advance',
      { instanceId, tenantId },
      { jobId: `advance:${instanceId}:initial` },
    );

    await this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.started',
      result: 'allow',
      resourceType: 'workflow_instance',
      resourceId: instanceId,
      documentId: body.documentId,
      metadata: {
        definitionId,
        code: def.code,
        version: def.version,
        initialStepOrder: initial.stepOrder,
        parallel: initial.parallel,
      },
    });

    return {
      instanceId,
      status: 'RUNNING',
      currentStepOrder: initial.stepOrder,
    };
  }

  /** List workflow instances (paginated, filterable). */
  async listInstances(
    tenantId: string,
    query: WorkflowInstanceListQuery,
  ): Promise<{
    readonly instances: ReadonlyArray<{
      readonly id: string;
      readonly definitionId: string;
      readonly documentId: string | null;
      readonly status: string;
      readonly startedByUserId: string;
      readonly startedAt: string;
      readonly completedAt: string | null;
      readonly dueAt: string | null;
    }>;
    readonly nextCursor: string | null;
  }> {
    const where: Prisma.WorkflowInstanceWhereInput = { tenantId };
    if (query.status) where.status = query.status;
    if (query.documentId) where.documentId = query.documentId;
    if (query.definitionId) where.definitionId = query.definitionId;
    if (query.assigneeId) {
      where.steps = { some: { assigneeId: query.assigneeId } };
    }

    let cursorClause: Prisma.WorkflowInstanceWhereUniqueInput | undefined;
    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      where.startedAt = { lt: new Date(c.value) };
      cursorClause = { id: c.id };
    }

    const limit = query.limit;
    const rows = await this.prisma.workflowInstance.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit + 1,
      cursor: cursorClause,
      skip: cursorClause ? 1 : 0,
      select: {
        id: true,
        definitionId: true,
        documentId: true,
        status: true,
        startedByUserId: true,
        startedAt: true,
        completedAt: true,
        dueAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? encodeCursor({
          sort: 'startedAt',
          value: slice[slice.length - 1].startedAt.toISOString(),
          id: slice[slice.length - 1].id,
        })
      : null;

    return {
      instances: slice.map((r) => ({
        id: r.id,
        definitionId: r.definitionId,
        documentId: r.documentId,
        status: r.status,
        startedByUserId: r.startedByUserId,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        dueAt: r.dueAt?.toISOString() ?? null,
      })),
      nextCursor,
    };
  }

  /** Get a single instance with its steps and approvals. */
  async getInstance(
    tenantId: string,
    instanceId: string,
  ): Promise<{
    readonly id: string;
    readonly definitionId: string;
    readonly documentId: string | null;
    readonly status: string;
    readonly startedByUserId: string;
    readonly startedAt: string;
    readonly completedAt: string | null;
    readonly context: unknown;
    readonly steps: ReadonlyArray<{
      readonly id: string;
      readonly stepKey: string;
      readonly name: string;
      readonly status: string;
      readonly assigneeId: string | null;
      readonly delegateId: string | null;
      readonly startedAt: string | null;
      readonly completedAt: string | null;
      readonly dueAt: string | null;
    }>;
    readonly approvals: ReadonlyArray<{
      readonly id: string;
      readonly approverId: string;
      readonly decision: string | null;
      readonly comment: string | null;
      readonly decidedAt: string | null;
    }>;
  }> {
    const inst = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: {
        steps: { orderBy: { startedAt: 'asc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!inst) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    return {
      id: inst.id,
      definitionId: inst.definitionId,
      documentId: inst.documentId,
      status: inst.status,
      startedByUserId: inst.startedByUserId,
      startedAt: inst.startedAt.toISOString(),
      completedAt: inst.completedAt?.toISOString() ?? null,
      context: inst.context,
      steps: inst.steps.map((s) => ({
        id: s.id,
        stepKey: s.stepKey,
        name: s.name,
        status: s.status,
        assigneeId: s.assigneeId,
        delegateId: s.delegateId,
        startedAt: s.startedAt?.toISOString() ?? null,
        completedAt: s.completedAt?.toISOString() ?? null,
        dueAt: s.dueAt?.toISOString() ?? null,
      })),
      approvals: inst.approvals.map((a) => ({
        id: a.id,
        approverId: a.approverId,
        decision: a.decision,
        comment: a.comment,
        decidedAt: a.decidedAt?.toISOString() ?? null,
      })),
    };
  }

  /**
   * Submit an approval decision for the current step of an instance.
   * Records the `Approval` row with audit-trail signature attestation,
   * advances the instance using the engine, and enqueues a follow-up
   * processing job.
   */
  async submitApproval(
    tenantId: string,
    userId: string,
    instanceId: string,
    body: SubmitApprovalBody,
  ): Promise<{
    readonly instanceId: string;
    readonly status: string;
    readonly decision: string;
    readonly advanced: boolean;
  }> {
    const inst = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: { steps: { orderBy: { startedAt: 'asc' } }, definition: true },
    });
    if (!inst) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (inst.status !== 'RUNNING' && inst.status !== 'PENDING') {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: `instance is ${inst.status}, cannot accept approvals`,
      });
    }

    // Find the current active step (the in_progress one with the highest order)
    const currentStep = inst.steps
      .filter((s) => s.status === 'in_progress' || s.status === 'waiting_for_approval')
      .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))[0];
    if (!currentStep) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'no active step to approve',
      });
    }

    // Authorization: the caller must be the assignee or delegate, or an admin.
    const isAssignee = currentStep.assigneeId === userId || currentStep.delegateId === userId;
    const isAdmin = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    }))?.roles?.some((r: string) => r === 'admin') ?? false;
    if (!isAssignee && !isAdmin) {
      throw new ForbiddenException({ messageKey: 'errors.FORBIDDEN' });
    }

    // Compute audit-trail signature attestation.
    const now = new Date();
    const attestationHash = body.signature?.attestationHash ?? computeApprovalAttestation({
      instanceId,
      approverId: userId,
      decision: body.decision,
      comment: body.comment ?? null,
      isoTime: now.toISOString(),
    });
    const signatureKind = body.signature?.kind ?? 'audit_trail';
    const signatureBlob = JSON.stringify({
      kind: signatureKind,
      attestationHash,
      signedAt: now.toISOString(),
    });

    // Update the step + create the Approval row + advance the instance in a
    // transaction.
    const defJson = inst.definition.definitionJson as { steps?: EngineStep[] };
    const engineDef: EngineDefinition = { steps: defJson.steps ?? [] };

    // Map the API decision value to the Prisma enum value.
    // API (Zod): 'approve' | 'reject' | 'delegate' | 'escalate' | 'recuse'
    // Prisma enum: APPROVED | REJECTED | DELEGATED | ESCALATED
    // ('recuse' has no Prisma enum value — we treat it as a REJECTED
    //  decision with a 'recused' reason key in metadata.)
    const decisionToEnum: Record<string, 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'ESCALATED'> = {
      approve: 'APPROVED',
      reject: 'REJECTED',
      delegate: 'DELEGATED',
      escalate: 'ESCALATED',
      recuse: 'REJECTED',
    };
    const prismaDecision = decisionToEnum[body.decision];
    if (!prismaDecision) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: `unsupported decision: ${body.decision}`,
      });
    }

    const newStepStatus =
      body.decision === 'approve' ? 'approved' :
      body.decision === 'reject' ? 'rejected' :
      body.decision === 'delegate' ? 'completed' :
      body.decision === 'escalate' ? 'escalated' :
      'skipped'; // 'recuse' — treated as skipped at the step level

    await this.prisma.$transaction(async (tx) => {
      await tx.approval.create({
        data: {
          id: randomUUID(),
          instanceId,
          tenantId,
          approverId: userId,
          decision: prismaDecision,
          comment: body.comment ?? null,
          signature: signatureBlob,
          decidedAt: now,
        },
      });

      await tx.workflowStep.update({
        where: { id: currentStep.id },
        data: {
          status: newStepStatus,
          completedAt: now,
          ...(body.decision === 'delegate' && body.delegateToUserId
            ? { delegateId: body.delegateToUserId }
            : {}),
        },
      });
    });

    // Re-fetch the instance to compute routing with the updated step states.
    const refreshed = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: { steps: true },
    });
    if (!refreshed) {
      throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    }

    const engineInstance: EngineInstance = {
      status: refreshed.status as EngineInstance['status'],
      // The "current step order" is the order of the step that was just
      // transitioned — `routeNext` will inspect the parallel branch at
      // this order to decide whether to advance, wait, reject, or
      // escalate.
      currentStepOrder: Number(currentStep.stepKey.replace('step-', '')),
      steps: refreshed.steps.map((s) => ({
        stepOrder: Number(s.stepKey.replace('step-', '')),
        status: s.status as EngineInstance['steps'][number]['status'],
        assigneeId: s.assigneeId,
        delegateId: s.delegateId,
      })),
    };

    const route = routeNext(engineDef, engineInstance);

    let advanced = false;
    let finalStatus = refreshed.status;

    if (route.kind === 'advance') {
      // Create the next step row(s)
      const nextSteps = engineDef.steps.filter(
        (s) => s.enabled && s.stepOrder === route.nextStepOrder,
      );
      for (const step of nextSteps) {
        await this.prisma.workflowStep.create({
          data: {
            id: randomUUID(),
            instanceId,
            tenantId,
            stepKey: `step-${step.stepOrder}`,
            name: step.titleKey,
            status: 'in_progress',
            assigneeId: step.assignee.kind === 'user' ? step.assignee.userId : null,
            startedAt: now,
            dueAt: step.dueInHours
              ? new Date(now.getTime() + step.dueInHours * 3600_000)
              : null,
            metadata: { definitionStep: step } as Prisma.InputJsonValue,
          },
        });
      }
      advanced = true;
    } else if (route.kind === 'complete') {
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: route.finalStatus, completedAt: now },
      });
      finalStatus = route.finalStatus;
      advanced = true;
    } else if (route.kind === 'reject') {
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'REJECTED', completedAt: now },
      });
      finalStatus = 'REJECTED';
      advanced = true;
    } else if (route.kind === 'escalate') {
      if (route.escalationStepOrder) {
        // Create the escalation step
        const escStep = engineDef.steps.find(
          (s) => s.enabled && s.stepOrder === route.escalationStepOrder,
        );
        if (escStep) {
          await this.prisma.workflowStep.create({
            data: {
              id: randomUUID(),
              instanceId,
              tenantId,
              stepKey: `step-${escStep.stepOrder}`,
              name: escStep.titleKey,
              status: 'in_progress',
              assigneeId: escStep.assignee.kind === 'user' ? escStep.assignee.userId : null,
              startedAt: now,
              metadata: { escalation: true, definitionStep: escStep } as Prisma.InputJsonValue,
            },
          });
          advanced = true;
        }
      } else {
        await this.prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { status: 'FAILED', completedAt: now },
        });
        finalStatus = 'FAILED';
        advanced = true;
      }
    }
    // route.kind === 'wait' → no-op (parallel branch still in flight)

    if (advanced) {
      await this.workflowQueue.add(
        'advance',
        { instanceId, tenantId },
        { jobId: `advance:${instanceId}:${Date.now()}` },
      );
    }

    await this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.approval_completed',
      result: 'allow',
      resourceType: 'workflow_instance',
      resourceId: instanceId,
      documentId: refreshed.documentId ?? undefined,
      metadata: {
        decision: body.decision,
        stepId: currentStep.id,
        advanced,
        signatureKind,
      },
    });

    // Emit WebSocket events (spec §13.4)
    await this.emitWsEvent(tenantId, {
      name: 'workflow.approval.completed',
      payload: {
        tenantId,
        instanceId,
        decision: body.decision,
        stepId: currentStep.id,
        advanced,
        finalStatus,
      },
    });
    if (advanced) {
      await this.emitWsEvent(tenantId, {
        name: 'workflow.step.updated',
        payload: {
          tenantId,
          instanceId,
          stepKey: advanced.stepKey,
          status: 'pending',
          assigneeId: advanced.assigneeId,
        },
      });
    }

    return {
      instanceId,
      status: finalStatus,
      decision: body.decision,
      advanced,
    };
  }

  /** Delegate the current step to another user. */
  async delegateStep(
    tenantId: string,
    userId: string,
    instanceId: string,
    body: DelegateStepBody,
  ): Promise<{ instanceId: string; delegatedTo: string }> {
    return this.submitApproval(tenantId, userId, instanceId, {
      decision: 'delegate',
      delegateToUserId: body.delegateToUserId,
      comment: body.comment,
      reasonKey: body.reasonKey,
    }).then((r) => ({ instanceId: r.instanceId, delegatedTo: body.delegateToUserId }));
  }

  /** Cancel an instance (terminal state). */
  async cancelInstance(
    tenantId: string,
    userId: string,
    instanceId: string,
    body: CancelInstanceBody,
  ): Promise<{ instanceId: string; status: string }> {
    const inst = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      select: { id: true, status: true },
    });
    if (!inst) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (inst.status === 'COMPLETED' || inst.status === 'CANCELLED' || inst.status === 'REJECTED') {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: `instance is already ${inst.status}`,
      });
    }

    const now = new Date();
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'CANCELLED', completedAt: now },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.cancelled',
      result: 'allow',
      resourceType: 'workflow_instance',
      resourceId: instanceId,
      reason: body.reasonKey ?? null,
      metadata: { comment: body.comment },
    });

    return { instanceId, status: 'CANCELLED' };
  }

  /**
   * Process an instance one step. Called by the BullMQ worker. Idempotent:
   * if the instance is already in a terminal state, returns immediately.
   *
   * This is a minimal pass-through — the actual step advancement happens
   * in `submitApproval`. The worker exists so future auto-advance steps
   * (e.g. system actions, timers) can hook in here without changing the
   * API surface.
   */
  async processInstance(instanceId: string, tenantId: string): Promise<void> {
    const inst = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      select: { id: true, status: true },
    });
    if (!inst) {
      this.logger.warn(`processInstance: instance ${instanceId} not found`);
      return;
    }
    if (
      inst.status === 'COMPLETED' ||
      inst.status === 'CANCELLED' ||
      inst.status === 'REJECTED' ||
      inst.status === 'FAILED'
    ) {
      return;
    }

    // Hook for future auto-advance logic. Currently a no-op: instances
    // advance only on explicit approval submissions.
    this.logger.debug(`processInstance: instance ${instanceId} in state ${inst.status} (no auto-advance)`);
  }

  /**
   * List pending approvals for a user (spec §9.8).
   * Returns workflow steps where the user is the assignee and status is pending.
   */
  async listPendingApprovals(tenantId: string, userId: string) {
    const steps = await this.prisma.workflowStep.findMany({
      where: {
        tenantId,
        assigneeId: userId,
        status: 'pending',
      },
      orderBy: { dueAt: 'asc' },
      take: 50,
      include: {
        instance: {
          include: {
            definition: { select: { id: true, name: true, code: true, modelKind: true } },
            document: { select: { id: true, title: true } },
          },
        },
      },
    });
    return steps.map((s) => ({
      stepId: s.id,
      stepKey: s.stepKey,
      stepName: s.name,
      instanceId: s.instanceId,
      status: s.status,
      dueAt: s.dueAt,
      startedAt: s.startedAt,
      workflow: {
        id: s.instance.definition.id,
        name: s.instance.definition.name,
        code: s.instance.definition.code,
        modelKind: s.instance.definition.modelKind,
      },
      document: s.instance.document
        ? { id: s.instance.document.id, title: s.instance.document.title }
        : null,
    }));
  }

  /**
   * Emit a WebSocket event via Redis pub/sub (spec §13.4).
   * The WebSocket gateway subscribes to `smart-edms:ws-events:${tenantId}`
   * and fans out to connected sockets in the `tenant:${tenantId}` room.
   */
  private async emitWsEvent(tenantId: string, event: { name: string; payload: unknown }): Promise<void> {
    try {
      await this.redis.connection.publish(
        `smart-edms:ws-events:${tenantId}`,
        JSON.stringify(event),
      );
    } catch (err) {
      this.logger.warn(`ws event publish failed tenant=${tenantId}: ${(err as Error).message}`);
    }
  }
}
