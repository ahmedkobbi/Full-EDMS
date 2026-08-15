import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { UserService } from './user.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Roles('admin', 'user-manager')
  @Get('users')
  list(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.users.list(req.user!.tid, q);
  }

  @Roles('admin', 'user-manager')
  @Get('users/:id')
  getById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.users.getById(req.user!.tid, id);
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.users.getById(req.user!.tid, req.user!.sub);
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'user.create' })
  @Post('users')
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.users.create(req.user!.tid, body);
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'user.update', resourceType: 'user', resourceIdParam: 'id' })
  @Patch('users/:id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.users.update(req.user!.tid, id, body);
  }

  @Patch('me/preferences')
  updatePreferences(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.users.updatePreferences(req.user!.tid, req.user!.sub, body);
  }

  @Roles('admin')
  @Audit({ category: 'user', code: 'user.delete', resourceType: 'user', resourceIdParam: 'id' })
  @Delete('users/:id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.users.softDelete(req.user!.tid, id);
    return { ok: true };
  }
}
