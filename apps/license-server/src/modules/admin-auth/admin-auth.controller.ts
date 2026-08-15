import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator.js';
import { AdminAuthService } from './admin-auth.service.js';
import type { AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';

@Controller('v1/auth/admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  /**
   * Step 1: Login with email + password. Returns MFA ticket.
   * @Public — no JWT required.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.auth.login(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Step 2: Verify MFA code against ticket, get access + refresh tokens.
   * @Public — no JWT required (the ticket is the credential).
   */
  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.auth.verifyMfa(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Step-up auth: re-verify TOTP, get a 5min step-up JWT.
   * Requires existing admin JWT (already authenticated).
   */
  @AdminRoles('admin', 'super_admin')
  @Post('mfa/step-up')
  @HttpCode(HttpStatus.OK)
  async stepUp(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.auth.stepUp(req.admin!.sub, body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Refresh access token using refresh token.
   * @Public — the refresh token is the credential.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: unknown) {
    return this.auth.refresh(body);
  }

  /**
   * Logout: revoke the access token.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: AdminAuthenticatedRequest) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.slice(7) ?? '';
    await this.auth.logout(token);
  }
}
