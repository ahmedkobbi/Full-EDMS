import { Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RevocationService } from './revocation.service.js';
import { AdminJwtGuard, type AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';
import { SEDMSCRL_MIME } from '@smart-edms/license-core';

/**
 * Revocation endpoints (spec §12.4).
 *
 * - GET  /v1/crl              — fetch the latest .sedmscrl (PUBLIC — on-prem backends fetch this)
 * - POST /v1/revocations/refresh — manually rebuild + sign the CRL (admin)
 */
@ApiTags('revocation')
@Controller('v1')
export class RevocationController {
  constructor(private readonly revocation: RevocationService) {}

  /**
   * Fetch the latest Certificate Revocation List (`.sedmscrl`).
   *
   * PUBLIC endpoint — on-prem backends fetch this periodically (when
   * online) to immediately invalidate revoked licenses. Offline
   * deployments must import the CRL manually.
   *
   * Returns the CRL as a JSON response with MIME type `application/vnd.smart-edms.sedmscrl+json`.
   */
  @Public()
  @Get('crl')
  @ApiOperation({ summary: 'Fetch the latest .sedmscrl revocation list (public — on-prem backends)' })
  async getCrl(@Req() req: AdminAuthenticatedRequest) {
    const result = await this.revocation.getLatest();
    // Mark revocations as propagated (best-effort — the CRL has been
    // served, so the on-prem backend will pick up the revocations on
    // its next signature verification).
    void this.revocation.markPropagated(result.version).catch(() => undefined);
    return result;
  }

  /**
   * Manually rebuild + sign the CRL. Admin-only.
   */
  @Post('revocations/refresh')
  @UseGuards(AdminJwtGuard)
  @AuditAction('crl.refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Manually rebuild + sign the CRL (admin)' })
  async refresh(@Req() req: AdminAuthenticatedRequest) {
    const result = await this.revocation.buildAndSign();
    void this.revocation.markPropagated(result.version).catch(() => undefined);
    return {
      version: result.version,
      generatedAt: result.crl.generatedAt,
      kid: result.kid,
      revokedLicenseIds: result.crl.revokedLicenseIds.length,
      revokedFingerprints: result.crl.revokedFingerprints.length,
    };
  }
}

// Re-export the MIME constant for callers that want to set Content-Type
// explicitly when streaming the CRL to disk.
export { SEDMSCRL_MIME };
