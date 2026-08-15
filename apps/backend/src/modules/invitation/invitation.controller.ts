import { Body, Controller, Get, Post, Delete, Param, Req, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { InvitationService } from './invitation.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/invitations')
export class InvitationController {
  constructor(private readonly invitations: InvitationService) {}

  @Roles('admin', 'user-manager')
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.invitations.listInvitations(req.user!.tid);
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'user.invite' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.invitations.createInvitation(req.user!.tid, req.user!.sub, body);
  }

  @Public()
  @Post('accept')
  async accept(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    return this.invitations.acceptInvitation(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'user.invite.revoke' })
  @Delete(':token')
  async revoke(@Req() req: AuthenticatedRequest, @Param('token') token: string) {
    await this.invitations.revokeInvitation(req.user!.tid, token, req.user!.sub);
    return { ok: true };
  }

  @Roles('admin', 'user-manager')
  @Audit({ category: 'user', code: 'user.invite.resend' })
  @Post(':token/resend')
  resend(@Req() req: AuthenticatedRequest, @Param('token') token: string) {
    return this.invitations.resendInvitation(req.user!.tid, token, req.user!.sub);
  }
}
