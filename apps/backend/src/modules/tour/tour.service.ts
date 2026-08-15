/**
 * Smart EDMS — Tour service.
 *
 * Business logic for the guided tour system (spec §10).
 *
 * Responsibilities:
 *  - List tours visible to a user (filtered by role, license module,
 *    tenant-enabled flag, and per-user `doNotShowAgain`).
 *  - Get a single tour definition with its steps.
 *  - Start / complete / skip / dismiss / progress a tour for a user.
 *  - Return the user's full tour-state map.
 *  - Admin: list, update, analytics.
 *  - Resolve the onboarding checklist (spec §10.18).
 *  - Seed default tours on first use per tenant (idempotent).
 *
 * Critical rules:
 *  - Tour content is referenced by message key; the backend stores ONLY
 *    keys (spec §10.11). The frontend renders via `t()`.
 *  - Tours only surface when: (a) the user's role matches the tour's
 *    audience, (b) the licensed module (if any) is entitled, (c) the tour
 *    is enabled at the tenant level, and (d) the user hasn't dismissed
 *    with `doNotShowAgain: true` (unless overridden by query).
 *  - Privacy-safe analytics (spec §10.15): aggregate counts only, no PII,
 *    no per-user timeline. The endpoint returns counts grouped by tour code
 *    and event kind.
 *  - Stable selectors: stored as-is on `TourStep.targetSelector`. The
 *    frontend uses them as `data-tour="<selector>"`.
 *  - Tour progress is persisted per user + tenant (the schema's
 *    `TourUserState` table is keyed on `[tourId, userId]`).
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuditEventCode } from '@smart-edms/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { LicenseService } from '../license/license.service.js';
import { DEFAULT_TOURS, seedDefaultTours } from './tour-seeder.js';
import { resolveChecklist } from './tour-checklist.js';
import type {
  AdminTourListQuery,
  AdminUpdateTourBody,
  CompleteTourBody,
  DismissTourBody,
  SkipTourBody,
  StartTourBody,
  TourAnalyticsQuery,
  TourListQuery,
  TourProgressBody,
  UserTourStateQuery,
} from './dto.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Role-to-audience mapping. The user passes if ANY of their roles matches. */
const ROLE_TO_AUDIENCE: Readonly<Record<string, readonly string[]>> = {
  admin: ['tenant_admin', 'it_administrator', 'all'],
  'records-manager': ['records_manager', 'all'],
  'security-officer': ['security_officer', 'all'],
  auditor: ['auditor', 'all'],
  'workflow-designer': ['workflow_designer', 'all'],
  editor: ['end_user', 'all'],
  viewer: ['end_user', 'all'],
  end_user: ['end_user', 'all'],
};

/** Translate a user's roles into the set of audiences they belong to. */
function audiencesForRoles(roles: readonly string[]): Set<string> {
  const out = new Set<string>(['all']);
  for (const r of roles) {
    const aud = ROLE_TO_AUDIENCE[r];
    if (aud) for (const a of aud) out.add(a);
  }
  // Marketing visitors are unauthenticated; treat them separately.
  return out;
}

/** Map a numeric priority rank to a label. */
function rankToPriority(rank: number): 'low' | 'normal' | 'high' | 'critical' {
  if (rank >= 400) return 'critical';
  if (rank >= 300) return 'high';
  if (rank >= 200) return 'normal';
  return 'low';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TourService {
  private readonly logger = new Logger(TourService.name);
  /** Per-tenant flag: have we attempted the seed for this tenant? */
  private readonly seededTenants = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly license: LicenseService,
  ) {}

  // -------------------------------------------------------------------------
  // Seeding
  // -------------------------------------------------------------------------

  /**
   * Ensure the default tours exist for this tenant. Idempotent: re-runs are
   * safe but cheap (the seeder uses `upsert` + `deleteMany` + `createMany`
   * per tour, which is a no-op when nothing changed).
   *
   * Catches all errors — a failed seed must NOT break tour listing.
   */
  async ensureSeeded(tenantId: string): Promise<void> {
    if (this.seededTenants.has(tenantId)) return;
    try {
      await seedDefaultTours(this.prisma, tenantId);
      this.seededTenants.add(tenantId);
    } catch (err) {
      this.logger.warn(
        `Tour seed failed for tenant ${tenantId}: ${(err as Error).message}`,
      );
      // Don't rethrow — listing will fall back to whatever tours exist.
    }
  }

  // -------------------------------------------------------------------------
  // User-facing queries
  // -------------------------------------------------------------------------

  /**
   * List tours visible to the current user. Filters:
   *  - tour is enabled
   *  - user's role matches the tour's audience (any of them)
   *  - the tour's required license module (if any) is entitled
   *  - the user has not set `doNotShowAgain: true` (unless `includeDoNotShow`)
   *  - the user has not dismissed the tour (unless `includeDismissed`)
   */
  async listToursForUser(
    tenantId: string,
    userId: string,
    roles: readonly string[],
    query: TourListQuery,
  ): Promise<{
    readonly tours: ReadonlyArray<{
      readonly id: string;
      readonly code: string;
      readonly module: string;
      readonly priority: 'low' | 'normal' | 'high' | 'critical';
      readonly triggerType: string;
      readonly licenseModuleRequired: string | null;
      readonly audience: readonly string[];
      readonly status: string;
      readonly doNotShowAgain: boolean;
      readonly stepCount: number;
    }>;
  }> {
    await this.ensureSeeded(tenantId);

    const where: Record<string, unknown> = {
      tenantId,
      enabled: true,
    };
    if (query.code) where.code = query.code;
    if (query.module) where.module = query.module;
    if (query.audience) where.audience = { has: query.audience };

    const tours = await this.prisma.tourDefinition.findMany({
      where: where as never,
      orderBy: { priority: 'desc' },
      take: query.limit,
      select: {
        id: true,
        code: true,
        module: true,
        priority: true,
        triggerType: true,
        licenseModuleRequired: true,
        audience: true,
        enabled: true,
        _count: { select: { steps: { where: { enabled: true } } } },
      },
    });

    const userAudiences = audiencesForRoles(roles);
    const licensedModules = await this.resolveLicensedModules();

    // Fetch all user states in one shot.
    const tourIds = tours.map((t) => t.id);
    const states = await this.prisma.tourUserState.findMany({
      where: { tenantId, userId, tourId: { in: tourIds } },
      select: { tourId: true, status: true, doNotShowAgain: true },
    });
    const stateByTour = new Map(states.map((s) => [s.tourId, s]));

    const filtered = tours
      .filter((t) => {
        // Audience check
        const hasAudience = t.audience.some((a) => userAudiences.has(a));
        if (!hasAudience) return false;

        // License check
        if (
          t.licenseModuleRequired &&
          !licensedModules.includes(t.licenseModuleRequired)
        ) {
          return false;
        }

        // User state filters
        const state = stateByTour.get(t.id);
        if (state?.doNotShowAgain && !query.includeDoNotShow) return false;
        if (state?.status === 'DISMISSED' && !query.includeDismissed) return false;
        return true;
      })
      .map((t) => {
        const state = stateByTour.get(t.id);
        return {
          id: t.id,
          code: t.code,
          module: t.module,
          priority: rankToPriority(t.priority),
          triggerType: t.triggerType,
          licenseModuleRequired: t.licenseModuleRequired,
          audience: t.audience,
          status: state?.status ?? 'NOT_STARTED',
          doNotShowAgain: state?.doNotShowAgain ?? false,
          stepCount: t._count.steps,
        };
      });

    return { tours: filtered };
  }

  /**
   * Get a single tour definition with its steps. The tour must be enabled
   * and the user must have audience + license access; otherwise 404.
   */
  async getTour(
    tenantId: string,
    userId: string,
    roles: readonly string[],
    tourId: string,
  ): Promise<{
    readonly id: string;
    readonly code: string;
    readonly module: string;
    readonly audience: readonly string[];
    readonly priority: 'low' | 'normal' | 'high' | 'critical';
    readonly triggerType: string;
    readonly licenseModuleRequired: string | null;
    readonly steps: ReadonlyArray<{
      readonly id: string;
      readonly stepOrder: number;
      readonly targetSelector: string;
      readonly titleKey: string;
      readonly bodyKey: string;
      readonly placement: string;
      readonly requiresPermission: string | null;
      readonly requiresLicenseModule: string | null;
      readonly actionType: string;
      readonly waitForEvent: string | null;
    }>;
    readonly userState: {
      readonly status: string;
      readonly currentStepId: string | null;
      readonly currentStepOrder: number;
      readonly doNotShowAgain: boolean;
    } | null;
  }> {
    await this.ensureSeeded(tenantId);

    const tour = await this.prisma.tourDefinition.findFirst({
      where: { id: tourId, tenantId },
      include: {
        steps: {
          where: { enabled: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
    if (!tour) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (!tour.enabled) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    // Audience + license checks
    const userAudiences = audiencesForRoles(roles);
    if (!tour.audience.some((a) => userAudiences.has(a))) {
      throw new ForbiddenException({ messageKey: 'errors.FORBIDDEN' });
    }
    if (tour.licenseModuleRequired) {
      const licensed = await this.resolveLicensedModules();
      if (!licensed.includes(tour.licenseModuleRequired)) {
        throw new ForbiddenException({ messageKey: 'errors.LICENSE_REQUIRED' });
      }
    }

    const state = await this.prisma.tourUserState.findUnique({
      where: { tourId_userId: { tourId, userId } },
      select: {
        status: true,
        currentStepId: true,
        currentStepOrder: true,
        doNotShowAgain: true,
      },
    });

    return {
      id: tour.id,
      code: tour.code,
      module: tour.module,
      audience: tour.audience,
      priority: rankToPriority(tour.priority),
      triggerType: tour.triggerType,
      licenseModuleRequired: tour.licenseModuleRequired,
      steps: tour.steps.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        targetSelector: s.targetSelector,
        titleKey: s.titleKey,
        bodyKey: s.bodyKey,
        placement: s.placement,
        requiresPermission: s.requiresPermission,
        requiresLicenseModule: s.requiresLicenseModule,
        actionType: s.actionType,
        waitForEvent: s.waitForEvent,
      })),
      userState: state
        ? {
            status: state.status,
            currentStepId: state.currentStepId,
            currentStepOrder: state.currentStepOrder,
            doNotShowAgain: state.doNotShowAgain,
          }
        : null,
    };
  }

  // -------------------------------------------------------------------------
  // State mutations
  // -------------------------------------------------------------------------

  /** Start a tour: set state to IN_PROGRESS with the first step. */
  async startTour(
    tenantId: string,
    userId: string,
    roles: readonly string[],
    tourId: string,
    body: StartTourBody,
    ctx: { ipAddress?: string; userAgent?: string; correlationId?: string },
  ): Promise<{ tourId: string; status: string; currentStepOrder: number }> {
    const tour = await this.prisma.tourDefinition.findFirst({
      where: { id: tourId, tenantId, enabled: true },
      select: { id: true, code: true, audience: true, licenseModuleRequired: true },
    });
    if (!tour) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    // Re-validate access at mutation time (defense in depth).
    const userAudiences = audiencesForRoles(roles);
    if (!tour.audience.some((a) => userAudiences.has(a))) {
      throw new ForbiddenException({ messageKey: 'errors.FORBIDDEN' });
    }
    if (tour.licenseModuleRequired) {
      const licensed = await this.resolveLicensedModules();
      if (!licensed.includes(tour.licenseModuleRequired)) {
        throw new ForbiddenException({ messageKey: 'errors.LICENSE_REQUIRED' });
      }
    }

    const firstStep = await this.prisma.tourStep.findFirst({
      where: { tourId, enabled: true },
      orderBy: { stepOrder: 'asc' },
      select: { id: true, stepOrder: true },
    });

    const now = new Date();
    const state = await this.prisma.tourUserState.upsert({
      where: { tourId_userId: { tourId, userId } },
      create: {
        tourId,
        userId,
        tenantId,
        status: 'IN_PROGRESS',
        currentStepId: firstStep?.id ?? null,
        currentStepOrder: firstStep?.stepOrder ?? 0,
        startedAt: now,
      },
      update: {
        status: 'IN_PROGRESS',
        currentStepId: firstStep?.id ?? null,
        currentStepOrder: firstStep?.stepOrder ?? 0,
        startedAt: now,
        // Clear terminal-state timestamps when restarting.
        completedAt: null,
        skippedAt: null,
        doNotShowAgain: false,
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'tour',
      code: 'tour.started',
      result: 'allow',
      resourceType: 'tour_definition',
      resourceId: tourId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      correlationId: ctx.correlationId,
      metadata: {
        tourCode: tour.code,
        trigger: body.trigger,
        currentRoute: body.currentRoute,
      },
    });

    return {
      tourId,
      status: state.status,
      currentStepOrder: state.currentStepOrder,
    };
  }

  /** Mark a tour COMPLETED. */
  async completeTour(
    tenantId: string,
    userId: string,
    tourId: string,
    body: CompleteTourBody,
    ctx: { ipAddress?: string; userAgent?: string; correlationId?: string },
  ): Promise<{ tourId: string; status: string; completedAt: string }> {
    const tour = await this.prisma.tourDefinition.findFirst({
      where: { id: tourId, tenantId },
      select: { id: true, code: true },
    });
    if (!tour) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const now = new Date();
    const state = await this.prisma.tourUserState.upsert({
      where: { tourId_userId: { tourId, userId } },
      create: {
        tourId,
        userId,
        tenantId,
        status: 'COMPLETED',
        currentStepOrder: body.finalStepOrder ?? 0,
        startedAt: now,
        completedAt: now,
      },
      update: {
        status: 'COMPLETED',
        completedAt: now,
        ...(body.finalStepOrder !== undefined
          ? { currentStepOrder: body.finalStepOrder }
          : {}),
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'tour',
      code: 'tour.completed',
      result: 'allow',
      resourceType: 'tour_definition',
      resourceId: tourId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      correlationId: ctx.correlationId,
      metadata: { tourCode: tour.code, finalStepOrder: body.finalStepOrder },
    });

    return {
      tourId,
      status: state.status,
      completedAt: state.completedAt?.toISOString() ?? now.toISOString(),
    };
  }

  /** Mark a tour SKIPPED (with optional reason). */
  async skipTour(
    tenantId: string,
    userId: string,
    tourId: string,
    body: SkipTourBody,
    ctx: { ipAddress?: string; userAgent?: string; correlationId?: string },
  ): Promise<{ tourId: string; status: string; skippedAt: string }> {
    const tour = await this.prisma.tourDefinition.findFirst({
      where: { id: tourId, tenantId },
      select: { id: true, code: true },
    });
    if (!tour) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const now = new Date();
    const state = await this.prisma.tourUserState.upsert({
      where: { tourId_userId: { tourId, userId } },
      create: {
        tourId,
        userId,
        tenantId,
        status: 'SKIPPED',
        currentStepOrder: body.dropOffStep ?? 0,
        startedAt: now,
        skippedAt: now,
      },
      update: {
        status: 'SKIPPED',
        skippedAt: now,
        ...(body.dropOffStep !== undefined ? { currentStepOrder: body.dropOffStep } : {}),
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'tour',
      code: 'tour.skipped',
      result: 'allow',
      resourceType: 'tour_definition',
      resourceId: tourId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      correlationId: ctx.correlationId,
      reason: body.reasonKey ?? null,
      metadata: {
        tourCode: tour.code,
        dropOffStep: body.dropOffStep,
      },
    });

    return {
      tourId,
      status: state.status,
      skippedAt: state.skippedAt?.toISOString() ?? now.toISOString(),
    };
  }

  /** Dismiss a tour; optionally set `doNotShowAgain: true`. */
  async dismissTour(
    tenantId: string,
    userId: string,
    tourId: string,
    body: DismissTourBody,
    ctx: { ipAddress?: string; userAgent?: string; correlationId?: string },
  ): Promise<{ tourId: string; status: string; doNotShowAgain: boolean }> {
    const tour = await this.prisma.tourDefinition.findFirst({
      where: { id: tourId, tenantId },
      select: { id: true, code: true },
    });
    if (!tour) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const now = new Date();
    const state = await this.prisma.tourUserState.upsert({
      where: { tourId_userId: { tourId, userId } },
      create: {
        tourId,
        userId,
        tenantId,
        status: 'DISMISSED',
        doNotShowAgain: body.doNotShowAgain,
        startedAt: now,
      },
      update: {
        status: 'DISMISSED',
        doNotShowAgain: body.doNotShowAgain,
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'tour',
      code: 'tour.dismissed',
      result: 'allow',
      resourceType: 'tour_definition',
      resourceId: tourId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      correlationId: ctx.correlationId,
      metadata: {
        tourCode: tour.code,
        doNotShowAgain: body.doNotShowAgain,
      },
    });

    return {
      tourId,
      status: state.status,
      doNotShowAgain: state.doNotShowAgain,
    };
  }

  /**
   * Update progress (current step). Does NOT change the tour's lifecycle
   * status — only the `currentStepId` / `currentStepOrder`. The frontend
   * reports progress periodically so a refreshed page can resume.
   */
  async reportProgress(
    tenantId: string,
    userId: string,
    tourId: string,
    body: TourProgressBody,
  ): Promise<{ tourId: string; currentStepOrder: number }> {
    const tour = await this.prisma.tourDefinition.findFirst({
      where: { id: tourId, tenantId },
      select: { id: true },
    });
    if (!tour) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    // Look up the step at the given order (within this tour).
    const step = await this.prisma.tourStep.findFirst({
      where: { tourId, stepOrder: body.currentStepOrder, enabled: true },
      select: { id: true, stepOrder: true },
    });
    if (!step) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: `no enabled step at order ${body.currentStepOrder}`,
      });
    }

    const now = new Date();
    await this.prisma.tourUserState.upsert({
      where: { tourId_userId: { tourId, userId } },
      create: {
        tourId,
        userId,
        tenantId,
        status: 'IN_PROGRESS',
        currentStepId: step.id,
        currentStepOrder: step.stepOrder,
        startedAt: now,
      },
      update: {
        currentStepId: step.id,
        currentStepOrder: step.stepOrder,
        // If the tour was previously in a terminal state, reactivate it
        // when the user reports progress (e.g. they restarted client-side).
        ...(body.resumed ? { status: 'IN_PROGRESS' } : {}),
      },
    });

    return { tourId, currentStepOrder: step.stepOrder };
  }

  // -------------------------------------------------------------------------
  // User-state listing
  // -------------------------------------------------------------------------

  /** Return all tour states for the current user (across all tours). */
  async listUserStates(
    tenantId: string,
    userId: string,
    query: UserTourStateQuery,
  ): Promise<{
    readonly states: ReadonlyArray<{
      readonly tourId: string;
      readonly tourCode: string;
      readonly status: string;
      readonly currentStepOrder: number;
      readonly doNotShowAgain: boolean;
      readonly startedAt: string | null;
      readonly completedAt: string | null;
      readonly skippedAt: string | null;
      readonly updatedAt: string;
    }>;
  }> {
    const where: Record<string, unknown> = { tenantId, userId };
    if (query.status) where.status = query.status;

    const rows = await this.prisma.tourUserState.findMany({
      where: where as never,
      take: query.limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        tourId: true,
        status: true,
        currentStepOrder: true,
        doNotShowAgain: true,
        startedAt: true,
        completedAt: true,
        skippedAt: true,
        updatedAt: true,
        tour: { select: { code: true } },
      },
    });

    return {
      states: rows.map((r) => ({
        tourId: r.tourId,
        tourCode: r.tour.code,
        status: r.status,
        currentStepOrder: r.currentStepOrder,
        doNotShowAgain: r.doNotShowAgain,
        startedAt: r.startedAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
        skippedAt: r.skippedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Checklist (spec §10.18)
  // -------------------------------------------------------------------------

  async getChecklist(
    tenantId: string,
    userId: string,
    roles: readonly string[],
  ): Promise<{
    readonly items: ReadonlyArray<{
      readonly resolverCode: string;
      readonly labelKey: string;
      readonly completed: boolean;
      readonly completedAt: string | null;
      readonly launchesTourId: string | null;
      readonly launchesTourCode: string | null;
    }>;
    readonly completedCount: number;
    readonly totalCount: number;
  }> {
    await this.ensureSeeded(tenantId);

    // Build a map of tour code -> tour id for the launchesTourId lookup.
    const tours = await this.prisma.tourDefinition.findMany({
      where: { tenantId },
      select: { id: true, code: true },
    });
    const tourIdByCode = new Map(tours.map((t) => [t.code, t.id]));

    const items = await resolveChecklist(
      {
        prisma: this.prisma,
        tenantId,
        userId,
        roles,
      },
      { launchesTourIdByCode: Object.fromEntries(tourIdByCode) },
    );

    return {
      items: items.map((i) => ({
        resolverCode: i.resolverCode,
        labelKey: i.labelKey,
        completed: i.completed,
        completedAt: i.completedAt,
        launchesTourId: i.launchesTourId,
        launchesTourCode: i.launchesTourCode ?? null,
      })),
      completedCount: items.filter((i) => i.completed).length,
      totalCount: items.length,
    };
  }

  // -------------------------------------------------------------------------
  // Admin endpoints
  // -------------------------------------------------------------------------

  /** Admin: list all tour definitions for the tenant (including disabled). */
  async adminListTours(
    tenantId: string,
    query: AdminTourListQuery,
  ): Promise<{
    readonly tours: ReadonlyArray<{
      readonly id: string;
      readonly code: string;
      readonly module: string;
      readonly audience: readonly string[];
      readonly priority: 'low' | 'normal' | 'high' | 'critical';
      readonly triggerType: string;
      readonly enabled: boolean;
      readonly licenseModuleRequired: string | null;
      readonly version: number;
      readonly stepCount: number;
    }>;
  }> {
    await this.ensureSeeded(tenantId);

    const where: Record<string, unknown> = { tenantId };
    if (query.code) where.code = query.code;
    if (query.enabled !== undefined) where.enabled = query.enabled;
    if (query.module) where.module = query.module;

    const tours = await this.prisma.tourDefinition.findMany({
      where: where as never,
      orderBy: { priority: 'desc' },
      take: query.limit,
      select: {
        id: true,
        code: true,
        module: true,
        audience: true,
        priority: true,
        triggerType: true,
        enabled: true,
        licenseModuleRequired: true,
        version: true,
        _count: { select: { steps: true } },
      },
    });

    return {
      tours: tours.map((t) => ({
        id: t.id,
        code: t.code,
        module: t.module,
        audience: t.audience,
        priority: rankToPriority(t.priority),
        triggerType: t.triggerType,
        enabled: t.enabled,
        licenseModuleRequired: t.licenseModuleRequired,
        version: t.version,
        stepCount: t._count.steps,
      })),
    };
  }

  /** Admin: update a tour definition (enable/disable, triggers, audience). */
  async adminUpdateTour(
    tenantId: string,
    userId: string,
    tourId: string,
    body: AdminUpdateTourBody,
    ctx: { ipAddress?: string; userAgent?: string; correlationId?: string },
  ): Promise<{ tourId: string; updated: Record<string, unknown> }> {
    const tour = await this.prisma.tourDefinition.findFirst({
      where: { id: tourId, tenantId },
      select: { id: true, code: true, enabled: true, triggerType: true, audience: true, priority: true, licenseModuleRequired: true },
    });
    if (!tour) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const data: Record<string, unknown> = {};
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.triggerType !== undefined) data.triggerType = body.triggerType;
    if (body.audience !== undefined) data.audience = body.audience;
    if (body.licenseModuleRequired !== undefined) data.licenseModuleRequired = body.licenseModuleRequired;
    if (body.priority !== undefined) {
      data.priority =
        body.priority === 'critical' ? 400 :
        body.priority === 'high' ? 300 :
        body.priority === 'normal' ? 200 : 100;
    }

    const updated = await this.prisma.tourDefinition.update({
      where: { id: tourId },
      data: data as never,
      select: {
        id: true,
        enabled: true,
        triggerType: true,
        audience: true,
        priority: true,
        licenseModuleRequired: true,
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'admin',
      code: 'admin.policy_changed',
      result: 'allow',
      resourceType: 'tour_definition',
      resourceId: tourId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      correlationId: ctx.correlationId,
      metadata: {
        tourCode: tour.code,
        changes: Object.keys(data),
        before: {
          enabled: tour.enabled,
          triggerType: tour.triggerType,
          audience: tour.audience,
          priority: tour.priority,
          licenseModuleRequired: tour.licenseModuleRequired,
        },
        after: {
          enabled: updated.enabled,
          triggerType: updated.triggerType,
          audience: updated.audience,
          priority: updated.priority,
          licenseModuleRequired: updated.licenseModuleRequired,
        },
      },
    });

    return { tourId, updated: { ...updated, priority: rankToPriority(updated.priority) } };
  }

  /**
   * Admin: privacy-safe aggregated analytics. Returns counts grouped by
   * tour code + event kind. NEVER returns per-user data, PII, or
   * timeline details. Spec §10.15.
   *
   * Implementation: we synthesise the aggregates from the audit log
   * (which already records tour.* events with the tourCode in metadata).
   * This keeps the analytics privacy-safe by construction: the audit log
   * is already PII-minimised (no user emails, no message content), and
   * grouping by code+kind collapses individual users.
   */
  async adminAnalytics(
    tenantId: string,
    query: TourAnalyticsQuery,
  ): Promise<{
    readonly buckets: ReadonlyArray<{
      readonly tourCode: string;
      readonly kind: string;
      readonly count: number;
    }>;
    readonly totals: {
      readonly started: number;
      readonly completed: number;
      readonly skipped: number;
      readonly dismissed: number;
    };
  }> {
    const where: Record<string, unknown> = {
      tenantId,
      category: 'tour',
    };
    if (query.from) where.occurredAt = { gte: new Date(query.from) };
    if (query.to) {
      const toFilter = query.from
        ? { ...(where.occurredAt as object), lte: new Date(query.to) }
        : { lte: new Date(query.to) };
      where.occurredAt = toFilter;
    }

    // Map audit code -> analytics kind.
    const codeToKind: Record<string, string> = {
      'tour.started': 'started',
      'tour.completed': 'completed',
      'tour.skipped': 'skipped',
      'tour.dismissed': 'dismissed',
    };
    const codes = Object.keys(codeToKind);
    if (query.kind) {
      // Reverse-lookup the audit code from the kind
      const matchingCode = codes.find((c) => codeToKind[c] === query.kind);
      if (matchingCode) where.code = matchingCode;
    }

    // Group by code; we can't easily group by tourCode in SQL because
    // tourCode is inside a JSONB metadata column. So we fetch one count
    // per audit code and synthesise per-tour buckets lazily (when the
    // caller asks for a specific tour code, we add a metadata filter).
    if (query.code) {
      // Prisma JSONB filtering: use stringContains on the metadata column.
      // This is approximate — for exact filtering we'd need a raw query.
      // For analytics purposes, substring match on `"tourCode":"<code>"` is
      // good enough because tour codes are short, unique, and validated.
      (where as Record<string, unknown>).metadata = {
        path: ['tourCode'],
        equals: query.code,
      };
    }

    const groups: Array<{ code: string; count: number }> = [];
    for (const code of codes) {
      const count = await this.prisma.auditEvent.count({
        where: { ...(where as never), code: code as never } as never,
      });
      if (count > 0) {
        groups.push({ code, count });
      }
    }

    const buckets = groups.map((g) => ({
      tourCode: query.code ?? '*',
      kind: codeToKind[g.code],
      count: g.count,
    }));

    return {
      buckets,
      totals: {
        started: groups.find((g) => g.code === 'tour.started')?.count ?? 0,
        completed: groups.find((g) => g.code === 'tour.completed')?.count ?? 0,
        skipped: groups.find((g) => g.code === 'tour.skipped')?.count ?? 0,
        dismissed: groups.find((g) => g.code === 'tour.dismissed')?.count ?? 0,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * Resolve the set of entitled license modules for the current tenant.
   * Falls back to the empty list (no modules entitled) on any error —
   * `fail-closed` for license-required tours.
   */
  private async resolveLicensedModules(): Promise<readonly string[]> {
    try {
      const active = await this.license.getActivePayload();
      if (!active) return [];
      return active.payload.entitlements as readonly string[];
    } catch (err) {
      this.logger.warn(
        `Could not resolve licensed modules: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /** Expose the default tour count for diagnostics. */
  get defaultTourCount(): number {
    return DEFAULT_TOURS.length;
  }
}

// Re-export for the controller's audit-code typing.
export type TourAuditCode = Extract<
  AuditEventCode,
  'tour.started' | 'tour.completed' | 'tour.skipped' | 'tour.dismissed'
>;
