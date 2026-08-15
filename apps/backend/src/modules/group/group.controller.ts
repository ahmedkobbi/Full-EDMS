import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { GroupService } from './group.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/groups')
export class GroupController {
  constructor(private readonly groups: GroupService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.groups.list(req.user!.tid, q);
  }

  @Get(':id')
  getById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.groups.getById(req.user!.tid, id);
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'group.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.groups.create(req.user!.tid, body);
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'group.update', resourceType: 'group', resourceIdParam: 'id' })
  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.groups.update(req.user!.tid, id, body);
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'group.delete', resourceType: 'group', resourceIdParam: 'id' })
  @Delete(':id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.groups.softDelete(req.user!.tid, id);
    return { ok: true };
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'group.member.add', resourceType: 'group', resourceIdParam: 'id' })
  @Post(':id/members')
  addMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.groups.addMember(req.user!.tid, id, body);
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'group.member.remove', resourceType: 'group', resourceIdParam: 'id' })
  @Delete(':id/members/:userId')
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.groups.removeMember(req.user!.tid, id, userId);
    return { ok: true };
  }
}
