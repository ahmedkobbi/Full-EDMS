/**
 * Smart EDMS — Retention REST controller (spec §9.7).
 *
 * Endpoints (all JWT-protected, tenant-scoped):
 *
 *   POST   /v1/retention/schedules              create schedule
 *   GET    /v1/retention/schedules              list schedules
 *   PATCH  /v1/retention/schedules/:id          update schedule
 *   DELETE /v1/retention/schedules/:id          soft-delete (audited)
 *   GET    /v1/retention/upcoming-expiry        docs expiring in N days
 *   POST   /v1/retention/evaluate               admin: trigger cron now
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import { RetentionService } from './retention.service';
import {
  CreateRetentionScheduleBodySchema,
  RetentionListQuerySchema,
  UpcomingExpiryQuerySchema,
  UpdateRetentionScheduleBodySchema,
  type CreateRetentionScheduleBody,
  type RetentionListQuery,
  type UpcomingExpiryQuery,
  type UpdateRetentionScheduleBody,
} from './retention.service';
import { RetentionCron } from './retention-cron';

@Controller('v1/retention')
@Roles('admin', 'records-manager', 'auditor')
export class RetentionController {
  constructor(
    private readonly retention: RetentionService,
    private readonly cron: RetentionCron,
  ) {}

  @Post('schedules')
  @Roles('admin', 'records-manager')
  @Audit({ category: 'retention', code: 'retention.schedule_applied', resourceType: 'retention_schedule' })
  @HttpCode(200)
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = CreateRetentionScheduleBodySchema.parse(body) as CreateRetentionScheduleBody;
    return this.retention.createSchedule(req.user!.tid, req.user!.sub, parsed);
  }

  @Get('schedules')
  async list(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = RetentionListQuerySchema.parse(query) as RetentionListQuery;
    return this.retention.listSchedules(req.user!.tid, parsed);
  }

  @Patch('schedules/:id')
  @Roles('admin', 'records-manager')
  @Audit({ category: 'retention', code: 'retention.schedule_applied', resourceType: 'retention_schedule', resourceIdParam: 'id' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = UpdateRetentionScheduleBodySchema.parse(body) as UpdateRetentionScheduleBody;
    return this.retention.updateSchedule(req.user!.tid, req.user!.sub, id, parsed);
  }

  @Delete('schedules/:id')
  @Roles('admin', 'records-manager')
  @Audit({ category: 'retention', code: 'retention.schedule_applied', resourceType: 'retention_schedule', resourceIdParam: 'id' })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.retention.deleteSchedule(req.user!.tid, req.user!.sub, id);
  }

  /**
   * List documents whose retention will expire within N days.
   * Auditor role allowed (read-only) per spec §9.7.
   */
  @Get('upcoming-expiry')
  async upcomingExpiry(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = UpcomingExpiryQuerySchema.parse(query) as UpcomingExpiryQuery;
    return this.retention.upcomingExpiry(req.user!.tid, parsed);
  }

  /**
   * Admin-only: trigger the retention evaluation cron immediately.
   * Useful for testing or after importing a large document set.
   */
  @Post('evaluate')
  @Roles('admin')
  @Audit({ category: 'retention', code: 'retention.disposition_executed' })
  @HttpCode(200)
  async evaluateNow() {
    await this.cron.runOnce();
    return { triggered: true };
  }

  // ── §9.7 Disposition approval + cancellation ─────────────────────────────

  /**
   * List pending dispositions for approval (records-manager dashboard).
   */
  @Get('dispositions/pending')
  async listPendingDispositions(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    return this.retention.listPendingDispositions(
      req.user!.tid,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Approve a pending disposition. If the document is under legal hold,
   * the disposition is blocked.
   */
  @Post('dispositions/:id/approve')
  @Roles('admin', 'records-manager')
  @Audit({ category: 'retention', code: 'retention.disposition.approve', resourceType: 'disposition_record', resourceIdParam: 'id' })
  @HttpCode(200)
  async approveDisposition(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.retention.approveDisposition(req.user!.tid, id, req.user!.sub);
  }

  /**
   * Cancel a pending disposition (document should be retained longer).
   */
  @Post('dispositions/:id/cancel')
  @Roles('admin', 'records-manager')
  @Audit({ category: 'retention', code: 'retention.disposition.cancel', resourceType: 'disposition_record', resourceIdParam: 'id' })
  @HttpCode(200)
  async cancelDisposition(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.retention.cancelDisposition(req.user!.tid, id, req.user!.sub, body.reason);
  }
}
