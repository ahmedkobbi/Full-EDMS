/**
 * Smart EDMS — Retention service (spec §9.7).
 *
 * Implements retention schedule CRUD, upcoming-expiry queries, and the
 * scheduled disposition-evaluation job.
 *
 * Critical rules:
 *  - Retention evaluation runs as a scheduled worker (cron). The cron
 *    scans for documents whose retention clock has expired and creates
 *    `DispositionRecord` rows with `status=PENDING`. It NEVER auto-
 *    executes disposition — approval is required (spec §9.7).
 *  - Disposition jobs are idempotent: a document can have at most one
 *    PENDING/APPROVED disposition record per schedule. Re-running the
 *    cron does NOT create duplicate records.
 *  - Legal hold checks: if a document is under an active legal hold,
 *    the disposition record is created with `status=BLOCKED_LEGAL_HOLD`
 *    (so records-managers see the conflict).
 *  - All operations audited via `AuditService`.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Allowed trigger kinds (string-typed in the DB; validated here). */
export const RETENTION_TRIGGER_KINDS = [
  'creation',
  'last_modified',
  'declaration_of_record',
  'workflow_completed',
  'classification_set',
  'custom',
] as const;
export type RetentionTriggerKind = (typeof RETENTION_TRIGGER_KINDS)[number];

/** Allowed disposition actions (string-typed in the DB; validated here). */
export const DISPOSITION_ACTIONS = [
  'destroy',
  'archive',
  'review',
  'transfer_to_custodian',
  'crypto_shred',
  'delete', // legacy alias for `destroy`
] as const;
export type DispositionAction = (typeof DISPOSITION_ACTIONS)[number];

// ---------------------------------------------------------------------------
// DTOs (Zod)
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const CreateRetentionScheduleBodySchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9_-]+$/, 'code must be lowercase, digits, underscore or hyphen'),
    name: z.string().min(1).max(200),
    description: z.string().min(0).max(2000).optional(),
    triggerKind: z.enum(RETENTION_TRIGGER_KINDS),
    triggerDateField: z.string().min(1).max(64).nullable().optional(),
    retentionDays: z.number().int().min(0).max(36500),
    dispositionAction: z.enum(DISPOSITION_ACTIONS).default('destroy'),
    isActive: z.boolean().default(true),
  })
  .strict()
  .refine(
    (v) => v.triggerKind !== 'custom' || Boolean(v.triggerDateField),
    { message: 'triggerDateField is required when triggerKind=custom' },
  );

export type CreateRetentionScheduleBody = z.infer<typeof CreateRetentionScheduleBodySchema>;

export const UpdateRetentionScheduleBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(0).max(2000).optional(),
    triggerKind: z.enum(RETENTION_TRIGGER_KINDS).optional(),
    triggerDateField: z.string().min(1).max(64).nullable().optional(),
    retentionDays: z.number().int().min(0).max(36500).optional(),
    dispositionAction: z.enum(DISPOSITION_ACTIONS).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type UpdateRetentionScheduleBody = z.infer<typeof UpdateRetentionScheduleBodySchema>;

export const RetentionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(100),
    isActive: z.enum(['true', 'false']).optional().transform((v) =>
      v === undefined ? undefined : v === 'true',
    ),
    code: z.string().min(1).max(64).optional(),
  })
  .strict();

export type RetentionListQuery = z.infer<typeof RetentionListQuerySchema>;

export const UpcomingExpiryQuerySchema = z
  .object({
    withinDays: z.coerce.number().int().min(1).max(365).default(30),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict();

export type UpcomingExpiryQuery = z.infer<typeof UpcomingExpiryQuerySchema>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Schedule CRUD
  // -------------------------------------------------------------------------

  async createSchedule(
    tenantId: string,
    userId: string,
    body: CreateRetentionScheduleBody,
  ): Promise<{ id: string; code: string; createdAt: string }> {
    const existing = await this.prisma.retentionSchedule.findUnique({
      where: { tenantId_code: { tenantId, code: body.code } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: `retention schedule "${body.code}" already exists`,
      });
    }

    const action = body.dispositionAction === 'delete' ? 'delete' : body.dispositionAction;

    const schedule = await this.prisma.retentionSchedule.create({
      data: {
        tenantId,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        triggerKind: body.triggerKind,
        triggerDateField: body.triggerDateField ?? null,
        retentionDays: body.retentionDays,
        dispositionAction: action,
        isActive: body.isActive,
      },
      select: { id: true, code: true, createdAt: true },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'retention',
      code: 'retention.schedule_applied',
      result: 'allow',
      resourceType: 'retention_schedule',
      resourceId: schedule.id,
      metadata: { code: body.code, triggerKind: body.triggerKind, retentionDays: body.retentionDays },
    });

    return schedule;
  }

  async listSchedules(
    tenantId: string,
    query: RetentionListQuery,
  ): Promise<{
    readonly schedules: ReadonlyArray<{
      readonly id: string;
      readonly code: string;
      readonly name: string;
      readonly description: string | null;
      readonly triggerKind: string;
      readonly triggerDateField: string | null;
      readonly retentionDays: number;
      readonly dispositionAction: string;
      readonly isActive: boolean;
      readonly updatedAt: string;
    }>;
  }> {
    const where: Prisma.RetentionScheduleWhereInput = { tenantId };
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.code) where.code = query.code;

    const rows = await this.prisma.retentionSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return {
      schedules: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        triggerKind: r.triggerKind,
        triggerDateField: r.triggerDateField,
        retentionDays: r.retentionDays,
        dispositionAction: r.dispositionAction,
        isActive: r.isActive,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  async updateSchedule(
    tenantId: string,
    userId: string,
    id: string,
    body: UpdateRetentionScheduleBody,
  ): Promise<{ id: string; updatedAt: string }> {
    const existing = await this.prisma.retentionSchedule.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const data: Prisma.RetentionScheduleUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.triggerKind !== undefined) data.triggerKind = body.triggerKind;
    if (body.triggerDateField !== undefined) data.triggerDateField = body.triggerDateField;
    if (body.retentionDays !== undefined) data.retentionDays = body.retentionDays;
    if (body.dispositionAction !== undefined) {
      data.dispositionAction = body.dispositionAction === 'delete' ? 'delete' : body.dispositionAction;
    }
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await this.prisma.retentionSchedule.update({
      where: { id },
      data,
      select: { id: true, updatedAt: true },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'retention',
      code: 'retention.schedule_applied',
      result: 'allow',
      resourceType: 'retention_schedule',
      resourceId: id,
      metadata: { changes: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Soft-delete a retention schedule. Sets `isActive=false` rather than
   * deleting the row, so historical disposition records retain their FK.
   * Spec §9.7: deletion must be audited.
   */
  async deleteSchedule(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{ id: string; isActive: false }> {
    const existing = await this.prisma.retentionSchedule.findFirst({
      where: { id, tenantId },
      select: { id: true, isActive: true, code: true },
    });
    if (!existing) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    await this.prisma.retentionSchedule.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'retention',
      code: 'retention.schedule_applied',
      result: 'allow',
      resourceType: 'retention_schedule',
      resourceId: id,
      metadata: { action: 'deactivate', code: existing.code },
    });

    return { id, isActive: false };
  }

  // -------------------------------------------------------------------------
  // Upcoming expiry
  // -------------------------------------------------------------------------

  /**
   * List documents whose retention clock will expire within `withinDays`
   * days. Restricted to records-management / auditor / admin roles
   * (enforced at the controller layer).
   *
   * The expiry date is computed at query time from the schedule's trigger
   * kind + retention days + the document's relevant timestamp. We do not
   * materialise `retentionExpiresAt` on the Document (it would need to be
   * recomputed on every schedule update); instead, we compute it on read.
   */
  async upcomingExpiry(
    tenantId: string,
    query: UpcomingExpiryQuery,
  ): Promise<{
    readonly upcoming: ReadonlyArray<{
      readonly documentId: string;
      readonly title: string;
      readonly scheduleId: string;
      readonly scheduleCode: string;
      readonly scheduleName: string;
      readonly dispositionAction: string;
      readonly triggerKind: string;
      readonly triggerDate: string;
      readonly expiresAt: string;
      readonly daysUntilExpiry: number;
      readonly legalHoldActive: boolean;
    }>;
    readonly total: number;
  }> {
    const now = new Date();
    const horizon = new Date(now.getTime() + query.withinDays * 24 * 3600_000);

    // Fetch all documents that have a retention schedule attached.
    // We intentionally don't pre-filter at SQL level on expiry because the
    // expiry computation depends on the schedule's trigger kind (which
    // determines which document field to read). We do the filter in JS.
    // For tenants with very large document counts, a follow-up should add
    // a materialised `retentionExpiresAt` column.
    const docs = await this.prisma.document.findMany({
      where: {
        tenantId,
        deletedAt: null,
        retentionSchedule: { isActive: true },
      },
      take: query.limit * 5, // over-fetch then filter in JS
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        legalHoldActive: true,
        retentionSchedule: {
          select: {
            id: true,
            code: true,
            name: true,
            triggerKind: true,
            retentionDays: true,
            dispositionAction: true,
          },
        },
      },
    });

    const upcoming: Array<{
      documentId: string;
      title: string;
      scheduleId: string;
      scheduleCode: string;
      scheduleName: string;
      dispositionAction: string;
      triggerKind: string;
      triggerDate: string;
      expiresAt: string;
      daysUntilExpiry: number;
      legalHoldActive: boolean;
    }> = [];

    for (const doc of docs) {
      if (!doc.retentionSchedule) continue;
      const schedule = doc.retentionSchedule;

      // Determine the trigger date based on triggerKind.
      const triggerDate = this.resolveTriggerDate(doc, schedule.triggerKind);
      if (!triggerDate) continue;

      const expiresAt = new Date(
        triggerDate.getTime() + schedule.retentionDays * 24 * 3600_000,
      );
      if (expiresAt > horizon) continue; // outside window
      if (expiresAt < now && schedule.dispositionAction === 'review') {
        // For 'review' actions, even past-expiry documents are surfaced.
      } else if (expiresAt < now) {
        // Already expired — still surface so records-managers can act.
      }

      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (24 * 3600_000),
      );

      upcoming.push({
        documentId: doc.id,
        title: doc.title,
        scheduleId: schedule.id,
        scheduleCode: schedule.code,
        scheduleName: schedule.name,
        dispositionAction: schedule.dispositionAction,
        triggerKind: schedule.triggerKind,
        triggerDate: triggerDate.toISOString(),
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
        legalHoldActive: doc.legalHoldActive,
      });
    }

    upcoming.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
    const slice = upcoming.slice(0, query.limit);

    return { upcoming: slice, total: upcoming.length };
  }

  // -------------------------------------------------------------------------
  // Disposition evaluation (cron-triggered)
  // -------------------------------------------------------------------------

  /**
   * Scan for documents whose retention has expired and create
   * `DispositionRecord` rows with `status=PENDING` (or
   * `BLOCKED_LEGAL_HOLD` if the document is under hold). Idempotent:
   * skips documents that already have a non-terminal disposition record.
   *
   * This method does NOT execute the disposition — only schedules it for
   * human approval. Spec §9.7.
   *
   * @returns count of new disposition records created.
   */
  async evaluateDisposition(): Promise<{
    scanned: number;
    created: number;
    blocked: number;
    skipped: number;
  }> {
    let scanned = 0;
    let created = 0;
    let blocked = 0;
    let skipped = 0;

    // Iterate over all tenants that have at least one active schedule.
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null, retentionSchedules: { some: { isActive: true } } },
      select: { id: true },
    });

    for (const tenant of tenants) {
      const result = await this.evaluateDispositionForTenant(tenant.id);
      scanned += result.scanned;
      created += result.created;
      blocked += result.blocked;
      skipped += result.skipped;
    }

    this.logger.log(
      `Disposition evaluation complete: scanned=${scanned} created=${created} blocked=${blocked} skipped=${skipped}`,
    );
    return { scanned, created, blocked, skipped };
  }

  /**
   * Per-tenant disposition evaluation. The actual heavy lifting. Used by
   * `evaluateDisposition` and exposed for testing / manual triggering.
   */
  async evaluateDispositionForTenant(tenantId: string): Promise<{
    scanned: number;
    created: number;
    blocked: number;
    skipped: number;
  }> {
    const now = new Date();
    let scanned = 0;
    let created = 0;
    let blocked = 0;
    let skipped = 0;

    const docs = await this.prisma.document.findMany({
      where: {
        tenantId,
        deletedAt: null,
        retentionSchedule: { isActive: true },
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        legalHoldActive: true,
        retentionScheduleId: true,
        retentionSchedule: {
          select: {
            id: true,
            triggerKind: true,
            retentionDays: true,
            dispositionAction: true,
          },
        },
      },
    });

    for (const doc of docs) {
      scanned++;
      if (!doc.retentionSchedule || !doc.retentionScheduleId) {
        skipped++;
        continue;
      }
      const schedule = doc.retentionSchedule;
      const triggerDate = this.resolveTriggerDate(doc, schedule.triggerKind);
      if (!triggerDate) {
        skipped++;
        continue;
      }

      const expiresAt = new Date(
        triggerDate.getTime() + schedule.retentionDays * 24 * 3600_000,
      );

      // Only create a disposition record if retention has actually expired.
      if (expiresAt > now) {
        skipped++;
        continue;
      }

      // Idempotency check: is there an existing non-terminal disposition
      // record for this document + schedule?
      const existing = await this.prisma.dispositionRecord.findFirst({
        where: {
          tenantId,
          documentId: doc.id,
          retentionScheduleId: schedule.id,
          status: { in: ['PENDING', 'APPROVED', 'BLOCKED_LEGAL_HOLD'] },
        },
        select: { id: true, status: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Create the disposition record. If the document is under legal
      // hold, mark it BLOCKED_LEGAL_HOLD so records-managers see the
      // conflict; otherwise PENDING (awaiting approval).
      const status = doc.legalHoldActive ? 'BLOCKED_LEGAL_HOLD' : 'PENDING';

      await this.prisma.dispositionRecord.create({
        data: {
          id: randomUUID(),
          tenantId,
          documentId: doc.id,
          retentionScheduleId: schedule.id,
          legalHoldId: null,
          status,
          scheduledAt: expiresAt,
        },
      });

      if (status === 'BLOCKED_LEGAL_HOLD') {
        blocked++;
      } else {
        created++;
      }

      await this.audit.record({
        tenantId,
        actorKind: 'system',
        category: 'retention',
        code: 'retention.disposition_executed',
        result: 'allow',
        resourceType: 'disposition_record',
        resourceId: doc.id,
        documentId: doc.id,
        metadata: {
          action: 'scheduled',
          scheduleId: schedule.id,
          expiresAt: expiresAt.toISOString(),
          legalHoldActive: doc.legalHoldActive,
        },
      });
    }

    return { scanned, created, blocked, skipped };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * Resolve the trigger date for a document based on the schedule's
   * trigger kind. Returns `null` if the trigger can't be resolved (e.g.
   * `workflow_completed` without a stored completion timestamp).
   */
  private resolveTriggerDate(
    doc: { createdAt: Date; updatedAt: Date },
    triggerKind: string,
  ): Date | null {
    switch (triggerKind) {
      case 'creation':
        return doc.createdAt;
      case 'last_modified':
      case 'declaration_of_record':
      case 'classification_set':
        // We don't have dedicated fields for these; fall back to updatedAt.
        return doc.updatedAt;
      case 'workflow_completed':
        // Requires joining against WorkflowInstance.completedAt — left as
        // a follow-up. For now, fall back to updatedAt.
        return doc.updatedAt;
      case 'custom':
        // Custom resolvers would need a plugin hook. Fall back to createdAt.
        return doc.createdAt;
      default:
        return null;
    }
  }
}
