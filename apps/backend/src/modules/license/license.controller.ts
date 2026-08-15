import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { LicenseService } from './license.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/license')
export class LicenseController {
  constructor(private readonly license: LicenseService) {}

  /**
   * Returns the current license state and payload (admin-only).
   * Spec ref: §4.4 (license states), §12 (licensing system).
   */
  @Roles('admin')
  @Get('status')
  async getStatus() {
    const result = await this.license.getActivePayload();
    if (!result) return { state: 'invalid' as const, payload: null };
    return result;
  }

  /**
   * Import a `.sedmslic` file (offline activation).
   */
  @Roles('admin')
  @Audit({ category: 'license', code: 'license.import' })
  @Post('import')
  async importLicense(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const result = await this.license.importSedmslic({
      ...(body as object),
      importedByUserId: req.user!.sub,
    });
    return result;
  }

  /**
   * Generate a `.sedmsreq` file for offline activation request.
   */
  @Roles('admin')
  @Audit({ category: 'license', code: 'license.offline.request' })
  @Post('offline-request')
  async generateOfflineRequest(@Query('productId') productId: string, @Body() body: { contactEmail?: string }) {
    return this.license.generateOfflineRequest(productId, (body as { contactEmail?: string })?.contactEmail);
  }
}
