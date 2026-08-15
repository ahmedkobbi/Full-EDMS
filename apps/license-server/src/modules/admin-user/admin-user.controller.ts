import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req } from '@nestjs/common';
import { AdminJwtGuard } from '../../security/admin-jwt.guard.js';
import { AdminUserService } from './admin-user.service.js';
import type { AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';

@Controller('v1/admin-users')
@UseGuards(AdminJwtGuard)
export class AdminUserController {
  constructor(private readonly users: AdminUserService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Post()
  create(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.users.create(req.admin!.sub, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.users.update(id, req.admin!.sub, body);
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    await this.users.suspend(id, req.admin!.sub);
    return { ok: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    await this.users.delete(id, req.admin!.sub);
    return { ok: true };
  }
}
