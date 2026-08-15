import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HeartbeatService } from './heartbeat.service.js';
import { ApiKeyGuard } from '../../security/api-key.guard.js';
import { OptionalApiKey } from '../../common/decorators/api-key.decorator.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';
import type { AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';
import type { HeartbeatRequest } from '@smart-edms/license-core';

/**
 * Heartbeat endpoint (spec §12.9).
 *
 * POST /v1/heartbeat
 *
 * Accepts either an API key (X-Api-Key header) OR an activation code in
 * the body. Used by the on-prem backend on every heartbeat interval.
 *
 * Returns a signed HeartbeatResponse that the on-prem backend verifies
 * against its embedded public key.
 *
 * NOTE: This route is NOT decorated with @Public() — we want the
 * ApiKeyGuard to actually run (it accepts either an API key OR an
 * activation code in the body when @OptionalApiKey() is set). The
 * AdminJwtGuard is not in the controller-level @UseGuards, so admin
 * JWT is not required.
 */
@ApiTags('heartbeat')
@Controller('v1/heartbeat')
@OptionalApiKey()
@UseGuards(ApiKeyGuard)
export class HeartbeatController {
  constructor(private readonly heartbeat: HeartbeatService) {}

  @Post()
  @AuditAction('heartbeat.receive')
  @ApiOperation({ summary: 'Receive a heartbeat from an on-prem deployment (spec §12.9)' })
  async receive(@Body() body: HeartbeatRequest, @Req() req: AdminAuthenticatedRequest & { apiKey?: { customerId: string } }) {
    return this.heartbeat.receiveHeartbeat(body, {
      apiKeyCustomerId: req.apiKey?.customerId,
      ipAddress: req.ip,
    });
  }
}
