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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LicenseService } from './license.service.js';
import { AdminJwtGuard, type AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';
import { StepUpGuard } from '../../security/step-up.guard.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';

/**
 * License admin endpoints.
 *
 * Spec ref: §12 (licensing system), §12.5 (license payload).
 *
 * - POST /v1/licenses              — issue a new license (admin)
 * - GET  /v1/licenses              — list licenses (admin)
 * - GET  /v1/licenses/:id          — get a license (admin)
 * - PATCH /v1/licenses/:id/renew   — renew a license (admin)
 * - POST /v1/licenses/:id/revoke   — revoke a license (admin, step-up auth)
 *
 * Activation endpoints live in the activation module (POST /v1/activate/online,
 * POST /v1/activate/offline-request, POST /v1/activate/offline-issue).
 */
@ApiTags('licenses')
@Controller('v1')
@UseGuards(AdminJwtGuard)
export class LicenseController {
  constructor(private readonly license: LicenseService) {}

  @Post('licenses')
  @AuditAction('license.issue')
  @ApiOperation({ summary: 'Issue a new license (admin)' })
  async issue(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.license.issue(body as never, req.admin!.sub, req.ip);
  }

  @Get('licenses')
  @ApiOperation({ summary: 'List licenses (admin, paginated)' })
  async list(
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('customerId') customerId: string | undefined,
    @Query('productId') productId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('code') code: string | undefined,
  ) {
    return this.license.list({
      limit: limit ? Number(limit) : 50,
      cursor,
      customerId,
      productId,
      status,
      code,
    });
  }

  @Get('licenses/:id')
  @ApiOperation({ summary: 'Get a license by ID (admin)' })
  async get(@Param('id') id: string) {
    return this.license.get(id);
  }

  @Patch('licenses/:id/renew')
  @AuditAction('license.renew')
  @ApiOperation({ summary: 'Renew a license (admin)' })
  async renew(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AdminAuthenticatedRequest,
  ) {
    return this.license.renew(id, body as never, req.admin!.sub, req.ip);
  }

  @Post('licenses/:id/revoke')
  @UseGuards(StepUpGuard)
  @AuditAction('license.revoke')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke a license (admin, step-up auth required)' })
  async revoke(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AdminAuthenticatedRequest,
  ) {
    return this.license.revoke(id, body as never, req.admin!.sub, req.ip);
  }
}
