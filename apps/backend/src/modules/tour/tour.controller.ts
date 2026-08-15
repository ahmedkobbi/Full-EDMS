/**
 * Smart EDMS — Tour REST controller (spec §10).
 *
 * All endpoints are JWT-protected (no @Public), tenant-scoped (uses
 * `req.user.tid`), and audited via the @Audit() decorator on mutations.
 *
 * Endpoint summary:
 *
 *   User-facing (under /v1/tours):
 *     GET    /                           list tours visible to current user
 *     GET    /:tourId                    get tour definition with steps
 *     POST   /:tourId/start              start (IN_PROGRESS)
 *     POST   /:tourId/complete           mark COMPLETED
 *     POST   /:tourId/skip               mark SKIPPED
 *     POST   /:tourId/dismiss            mark DISMISSED (+doNotShowAgain)
 *     POST   /:tourId/progress           update currentStepId/Order
 *     GET    /user-state                 all tour states for current user
 *     GET    /checklist                  interactive onboarding checklist
 *
 *   Admin (under /v1/admin/tours):
 *     GET    /                           all tour definitions
 *     PATCH  /:tourId                    enable/disable, configure triggers
 *     GET    /analytics                  privacy-safe aggregated analytics
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';
import { TourService } from './tour.service.js';
import {
  AdminTourListQuerySchema,
  AdminUpdateTourBodySchema,
  CompleteTourBodySchema,
  DismissTourBodySchema,
  SkipTourBodySchema,
  StartTourBodySchema,
  TourAnalyticsQuerySchema,
  TourListQuerySchema,
  TourProgressBodySchema,
  UserTourStateQuerySchema,
  type AdminTourListQuery,
  type AdminUpdateTourBody,
  type CompleteTourBody,
  type DismissTourBody,
  type SkipTourBody,
  type StartTourBody,
  type TourAnalyticsQuery,
  type TourListQuery,
  type TourProgressBody,
  type UserTourStateQuery,
} from './dto.js';

// ---------------------------------------------------------------------------
// User-facing controller
// ---------------------------------------------------------------------------

@Controller('v1/tours')
export class TourController {
  constructor(private readonly tours: TourService) {}

  @Get()
  async list(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = TourListQuerySchema.parse(query) as TourListQuery;
    return this.tours.listToursForUser(
      req.user!.tid,
      req.user!.sub,
      req.user!.roles ?? [],
      parsed,
    );
  }

  @Get('user-state')
  async listUserStates(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = UserTourStateQuerySchema.parse(query) as UserTourStateQuery;
    return this.tours.listUserStates(req.user!.tid, req.user!.sub, parsed);
  }

  @Get('checklist')
  async getChecklist(@Req() req: AuthenticatedRequest) {
    return this.tours.getChecklist(
      req.user!.tid,
      req.user!.sub,
      req.user!.roles ?? [],
    );
  }

  @Get(':tourId')
  async getOne(@Param('tourId') tourId: string, @Req() req: AuthenticatedRequest) {
    return this.tours.getTour(
      req.user!.tid,
      req.user!.sub,
      req.user!.roles ?? [],
      tourId,
    );
  }

  @Post(':tourId/start')
  @Audit({ category: 'tour', code: 'tour.started', resourceType: 'tour_definition', resourceIdParam: 'tourId' })
  @HttpCode(200)
  async start(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = StartTourBodySchema.parse(body ?? {}) as StartTourBody;
    return this.tours.startTour(
      req.user!.tid,
      req.user!.sub,
      req.user!.roles ?? [],
      tourId,
      parsed,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: (req.headers['x-request-id'] as string | undefined) ?? req.id,
      },
    );
  }

  @Post(':tourId/complete')
  @Audit({ category: 'tour', code: 'tour.completed', resourceType: 'tour_definition', resourceIdParam: 'tourId' })
  @HttpCode(200)
  async complete(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = CompleteTourBodySchema.parse(body ?? {}) as CompleteTourBody;
    return this.tours.completeTour(req.user!.tid, req.user!.sub, tourId, parsed, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: (req.headers['x-request-id'] as string | undefined) ?? req.id,
    });
  }

  @Post(':tourId/skip')
  @Audit({ category: 'tour', code: 'tour.skipped', resourceType: 'tour_definition', resourceIdParam: 'tourId' })
  @HttpCode(200)
  async skip(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = SkipTourBodySchema.parse(body ?? {}) as SkipTourBody;
    return this.tours.skipTour(req.user!.tid, req.user!.sub, tourId, parsed, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: (req.headers['x-request-id'] as string | undefined) ?? req.id,
    });
  }

  @Post(':tourId/dismiss')
  @Audit({ category: 'tour', code: 'tour.dismissed', resourceType: 'tour_definition', resourceIdParam: 'tourId' })
  @HttpCode(200)
  async dismiss(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = DismissTourBodySchema.parse(body ?? {}) as DismissTourBody;
    return this.tours.dismissTour(req.user!.tid, req.user!.sub, tourId, parsed, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: (req.headers['x-request-id'] as string | undefined) ?? req.id,
    });
  }

  @Post(':tourId/progress')
  @HttpCode(200)
  async progress(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = TourProgressBodySchema.parse(body) as TourProgressBody;
    return this.tours.reportProgress(
      req.user!.tid,
      req.user!.sub,
      tourId,
      parsed,
    );
  }
}

// ---------------------------------------------------------------------------
// Admin controller
// ---------------------------------------------------------------------------

@Controller('v1/admin/tours')
@Roles('admin')
export class TourAdminController {
  constructor(private readonly tours: TourService) {}

  @Get()
  async list(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = AdminTourListQuerySchema.parse(query) as AdminTourListQuery;
    return this.tours.adminListTours(req.user!.tid, parsed);
  }

  @Get('analytics')
  async analytics(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = TourAnalyticsQuerySchema.parse(query) as TourAnalyticsQuery;
    return this.tours.adminAnalytics(req.user!.tid, parsed);
  }

  @Patch(':tourId')
  @Audit({ category: 'admin', code: 'admin.policy_changed', resourceType: 'tour_definition', resourceIdParam: 'tourId' })
  async update(
    @Param('tourId') tourId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = AdminUpdateTourBodySchema.parse(body) as AdminUpdateTourBody;
    return this.tours.adminUpdateTour(req.user!.tid, req.user!.sub, tourId, parsed, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: (req.headers['x-request-id'] as string | undefined) ?? req.id,
    });
  }
}
