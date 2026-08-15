import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Delete, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    return this.auth.login(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: unknown) {
    return this.auth.refresh(body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: AuthenticatedRequest) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.slice(7) ?? '';
    await this.auth.logout(token);
  }

  // ── §9.1 IAM — Password management ──────────────────────────────────────

  @Public()
  @Post('password-reset/initiate')
  @HttpCode(HttpStatus.OK)
  async initiatePasswordReset(@Body() body: { email: string }, @Req() req: AuthenticatedRequest) {
    return this.auth.initiatePasswordReset(body.email, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('password-reset/complete')
  @HttpCode(HttpStatus.OK)
  async completePasswordReset(
    @Body() body: { token: string; newPassword: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.auth.completePasswordReset(body.token, body.newPassword, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Audit({ category: 'auth', code: 'auth.password.change' })
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.auth.changePassword(
      req.user!.tid,
      req.user!.sub,
      body.currentPassword,
      body.newPassword,
      { ip: req.ip, userAgent: req.headers['user-agent'] },
    );
  }

  // ── §9.1 IAM — MFA enrollment ───────────────────────────────────────────

  @Audit({ category: 'auth', code: 'auth.mfa.enroll.start' })
  @Post('mfa/enroll/start')
  @HttpCode(HttpStatus.OK)
  async startMfaEnrollment(@Req() req: AuthenticatedRequest) {
    return this.auth.startMfaEnrollment(req.user!.tid, req.user!.sub);
  }

  @Audit({ category: 'auth', code: 'auth.mfa.enroll.confirm' })
  @Post('mfa/enroll/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmMfaEnrollment(@Body() body: { code: string }, @Req() req: AuthenticatedRequest) {
    return this.auth.confirmMfaEnrollment(req.user!.tid, req.user!.sub, body.code);
  }

  @Audit({ category: 'auth', code: 'auth.mfa.disable' })
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  async disableMfa(@Body() body: { currentPassword: string }, @Req() req: AuthenticatedRequest) {
    return this.auth.disableMfa(req.user!.tid, req.user!.sub, body.currentPassword);
  }

  // ── §9.1 IAM — Session management ───────────────────────────────────────

  @Get('sessions')
  async listSessions(@Req() req: AuthenticatedRequest) {
    return this.auth.listSessions(req.user!.tid, req.user!.sub);
  }

  @Audit({ category: 'auth', code: 'auth.session.revoke' })
  @Delete('sessions/:id')
  async revokeSession(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.auth.revokeSession(req.user!.tid, req.user!.sub, id);
  }

  @Audit({ category: 'auth', code: 'auth.session.revoke_all' })
  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@Req() req: AuthenticatedRequest) {
    return this.auth.revokeAllSessions(req.user!.tid, req.user!.sub);
  }
}
