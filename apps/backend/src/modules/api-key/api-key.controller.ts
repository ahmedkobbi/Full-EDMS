import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { ApiKeyService } from './api-key.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeys: ApiKeyService) {}

  @Roles('admin')
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.apiKeys.list(req.user!.tid);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'api_key.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.apiKeys.create(req.user!.tid, req.user!.sub, body);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'api_key.revoke', resourceType: 'api_key', resourceIdParam: 'id' })
  @Post(':id/revoke')
  async revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.apiKeys.revoke(req.user!.tid, req.user!.sub, id);
    return { ok: true };
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'api_key.delete', resourceType: 'api_key', resourceIdParam: 'id' })
  @Delete(':id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.apiKeys.delete(req.user!.tid, req.user!.sub, id);
    return { ok: true };
  }
}
