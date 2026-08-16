import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../security/admin-jwt.guard.js';
import { ApiKeyService } from './api-key.service.js';
import type { AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';

@Controller('v1/api-keys')
@UseGuards(AdminJwtGuard)
export class ApiKeyAdminController {
  constructor(private readonly apiKeys: ApiKeyService) {}

  @Get()
  list() {
    return this.apiKeys.list();
  }

  @Post()
  create(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.apiKeys.create(req.admin!.sub, body);
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    await this.apiKeys.revoke(id, req.admin!.sub);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    await this.apiKeys.delete(id, req.admin!.sub);
    return { ok: true };
  }
}
