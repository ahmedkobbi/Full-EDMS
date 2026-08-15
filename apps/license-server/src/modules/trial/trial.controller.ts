import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TrialService } from './trial.service.js';
import { AdminJwtGuard, type AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';

/**
 * Trial management endpoints (spec §12.10).
 *
 * - POST   /v1/trials           — create a trial (admin)
 * - GET    /v1/trials           — list trials (admin)
 * - GET    /v1/trials/:id       — get a trial (admin)
 * - POST   /v1/trials/:id/convert — convert trial to full license (admin)
 * - POST   /v1/trials/:id/cancel  — cancel a trial (admin)
 */
@ApiTags('trials')
@Controller('v1/trials')
@UseGuards(AdminJwtGuard)
export class TrialController {
  constructor(private readonly trial: TrialService) {}

  @Post()
  @AuditAction('trial.create')
  @ApiOperation({ summary: 'Create a trial license (admin)' })
  async create(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.trial.create(body as never, req.admin!.sub, req.ip);
  }

  @Get()
  @ApiOperation({ summary: 'List trials (admin)' })
  async list(
    @Query('customerId') customerId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    return this.trial.list({
      customerId,
      status,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a trial by ID (admin)' })
  async get(@Param('id') id: string) {
    return this.trial.get(id);
  }

  @Post(':id/convert')
  @AuditAction('trial.convert')
  @HttpCode(200)
  @ApiOperation({ summary: 'Convert a trial to a full license (admin)' })
  async convert(
    @Param('id') id: string,
    @Body() body: { planId: string; type: 'subscription' | 'perpetual' | 'enterprise'; durationDays?: number },
    @Req() req: AdminAuthenticatedRequest,
  ) {
    return this.trial.convert(id, body, req.admin!.sub, req.ip);
  }

  @Post(':id/cancel')
  @AuditAction('trial.cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a trial (admin)' })
  async cancel(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    return this.trial.cancel(id, req.admin!.sub, req.ip);
  }
}
