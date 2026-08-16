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
import { ActivationService } from './activation.service.js';
import { type AdminAuthenticatedRequest, AdminJwtGuard } from '../../security/admin-jwt.guard.js';
import { ApiKeyGuard } from '../../security/api-key.guard.js';
import { OptionalApiKey } from '../../common/decorators/api-key.decorator.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';

/**
 * Activation endpoints (spec §12.7 online, §12.8 offline).
 *
 * - POST /v1/activate/online              — online activation (API key OR activation code)
 * - POST /v1/activate/offline-request     — intake a .sedmsreq file (admin)
 * - POST /v1/activate/offline-issue       — issue .sedmslic for a .sedmsreq (admin)
 * - POST /v1/activate/offline-reject/:id  — reject a .sedmsreq (admin)
 * - GET  /v1/activate/offline-requests    — list pending .sedmsreq (admin)
 * - GET  /v1/activate/offline-requests/:id — get a single .sedmsreq (admin)
 */
@ApiTags('activation')
@Controller('v1/activate')
export class ActivationController {
  constructor(private readonly activation: ActivationService) {}

  /**
   * Online activation (spec §12.7).
   *
   * Accepts either an API key (X-Api-Key header) OR an activation code in
   * the body. Used by the on-prem backend on first install + on
   * re-activation after a deployment fingerprint change.
   *
   * NOTE: This route is NOT decorated with @Public() — we want the
   * ApiKeyGuard to actually run (it accepts either an API key OR an
   * activation code in the body when @OptionalApiKey() is set). The
   * AdminJwtGuard is not in the controller-level @UseGuards, so admin
   * JWT is not required.
   */
  @Post('online')
  @OptionalApiKey()
  @UseGuards(ApiKeyGuard)
  @AuditAction('activation.online')
  @ApiOperation({ summary: 'Online activation (spec §12.7) — API key OR activation code' })
  async activateOnline(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest & { apiKey?: { customerId: string } }) {
    return this.activation.activateOnline(body as never, {
      apiKeyCustomerId: req.apiKey?.customerId,
      adminId: req.admin?.sub,
      ipAddress: req.ip,
    });
  }

  /**
   * Offline activation step 1 (§12.8): intake a `.sedmsreq` file.
   *
   * Admin-only — the operator uploads the file via the License Admin Panel.
   */
  @Post('offline-request')
  @UseGuards(AdminJwtGuard)
  @AuditAction('activation.offline.intake')
  @ApiOperation({ summary: 'Intake a .sedmsreq file for offline activation (admin)' })
  async intakeOfflineRequest(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.activation.intakeOfflineRequest(body as never, req.admin!.sub, req.ip);
  }

  /**
   * Offline activation step 2 (§12.8): issue the `.sedmslic` artifact.
   *
   * Admin-only.
   */
  @Post('offline-issue')
  @UseGuards(AdminJwtGuard)
  @AuditAction('activation.offline.issue')
  @HttpCode(200)
  @ApiOperation({ summary: 'Issue a .sedmslic artifact for an offline activation request (admin)' })
  async issueOfflineLicense(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.activation.issueOfflineLicense(body as never, req.admin!.sub, req.ip);
  }

  @Post('offline-reject/:id')
  @UseGuards(AdminJwtGuard)
  @AuditAction('activation.offline.reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject an offline activation request (admin)' })
  async rejectOfflineRequest(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: AdminAuthenticatedRequest,
  ) {
    return this.activation.rejectOfflineRequest(id, body.reason, req.admin!.sub, req.ip);
  }

  @Get('offline-requests')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'List offline activation requests (admin)' })
  async listOfflineRequests(
    @Query('status') status: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    return this.activation.listOfflineRequests({
      status,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('offline-requests/:id')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({ summary: 'Get a single offline activation request (admin)' })
  async getOfflineRequest(@Param('id') id: string) {
    return this.activation.getOfflineRequest(id);
  }
}
