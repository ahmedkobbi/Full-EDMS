import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { TenantService } from './tenant.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/tenant')
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @Get()
  get(@Req() req: AuthenticatedRequest) {
    return this.tenant.get(req.user!.tid);
  }

  @Roles('admin')
  @Audit({ category: 'tenant', code: 'tenant.update' })
  @Patch()
  update(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.tenant.update(req.user!.tid, body);
  }
}
