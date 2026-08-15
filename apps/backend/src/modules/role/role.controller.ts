import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { RoleService } from './role.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/roles')
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.roles.list(req.user!.tid);
  }

  @Get('permissions')
  listPermissions(@Req() req: AuthenticatedRequest) {
    return this.roles.listPermissions(req.user!.tid);
  }

  @Get(':id')
  getById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.roles.getById(req.user!.tid, id);
  }

  @Roles('admin')
  @Audit({ category: 'user', code: 'role.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.roles.create(req.user!.tid, body);
  }

  @Roles('admin')
  @Audit({ category: 'user', code: 'role.update', resourceType: 'role', resourceIdParam: 'id' })
  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.roles.update(req.user!.tid, id, body);
  }

  @Roles('admin')
  @Audit({ category: 'user', code: 'role.delete', resourceType: 'role', resourceIdParam: 'id' })
  @Delete(':id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.roles.softDelete(req.user!.tid, id);
    return { ok: true };
  }
}
