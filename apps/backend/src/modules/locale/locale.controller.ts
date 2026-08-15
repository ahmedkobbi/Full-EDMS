import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { LocaleService } from './locale.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/locale')
export class LocaleController {
  constructor(private readonly locale: LocaleService) {}

  @Get('overrides')
  listOverrides(@Req() req: AuthenticatedRequest, @Query('locale') locale?: string) {
    return this.locale.listOverrides(req.user!.tid, locale);
  }

  @Get('overrides/:locale')
  getOverridesForLocale(@Req() req: AuthenticatedRequest, @Param('locale') locale: string) {
    return this.locale.getOverridesForLocale(req.user!.tid, locale);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'locale.override.upsert' })
  @Post('overrides')
  upsertOverride(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.locale.upsertOverride(req.user!.tid, body);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'locale.override.delete' })
  @Delete('overrides/:locale/:namespace/:key')
  async deleteOverride(
    @Req() req: AuthenticatedRequest,
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
    @Param('key') key: string,
  ) {
    await this.locale.deleteOverride(req.user!.tid, locale, namespace, key);
    return { ok: true };
  }

  @Get('enabled')
  getEnabledLocales(@Req() req: AuthenticatedRequest) {
    return this.locale.getEnabledLocales(req.user!.tid);
  }
}
