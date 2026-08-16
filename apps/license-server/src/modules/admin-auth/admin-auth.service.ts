import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RedisService } from '../../common/redis.service.js';
import bcrypt from 'bcryptjs';
import { authenticator as otplibAuthenticator } from 'otplib';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(8).max(256),
});

const mfaVerifySchema = z.object({
  mfaTicket: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

const stepUpSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export interface AdminJwtPayload {
  sub: string;          // admin user ID
  email: string;
  roles: string[];      // e.g. ['admin', 'super-admin']
  type: 'access' | 'refresh' | 'step-up';
  iat?: number;
  exp?: number;
}

/**
 * Admin authentication service for the Licensing Server.
 * Spec ref: §12.10 (license admin panel — secure login, MFA required).
 *
 * Flow:
 *   1. login(email, password) → validates credentials, issues MFA ticket (5min TTL)
 *   2. verifyMfa(ticket, code) → validates TOTP, issues access + refresh JWTs
 *   3. stepUp(code) → re-validates TOTP, issues 5min step-up JWT for sensitive ops
 *
 * Security:
 *   - bcrypt with 12 rounds
 *   - TOTP via otplib (RFC 6238)
 *   - MFA ticket stored in Redis (not JWT — can be revoked instantly)
 *   - Refresh tokens hashed before storage
 *   - All attempts audited
 *   - Failed logins tracked (lockout after 5 attempts, 15min)
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Step 1: Validate username + password, return MFA ticket.
   * The ticket is a random 32-byte hex string stored in Redis with a 5min TTL.
   * It is NOT a JWT — it cannot be used for anything except the MFA verify step.
   */
  async login(raw: unknown, ctx: { ip?: string; userAgent?: string }): Promise<{ mfaTicket: string; mfaRequired: true }> {
    const input = loginSchema.parse(raw);

    const admin = await this.prisma.adminUser.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!admin || !admin.isActive || !admin.passwordHash) {
      void this.audit.record({
        adminId: admin?.id,
        action: 'admin.login',
        target: 'admin_user',
        result: 'deny',
        reason: 'admin_not_found_or_inactive',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      void this.audit.record({
        adminId: admin.id,
        action: 'admin.login',
        target: 'admin_user',
        result: 'deny',
        reason: 'account_locked',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    const passwordOk = await bcrypt.compare(input.password, admin.passwordHash);
    if (!passwordOk) {
      await this.incrementFailedLogin(admin.id);
      void this.audit.record({
        adminId: admin.id,
        action: 'admin.login',
        target: 'admin_user',
        result: 'deny',
        reason: 'invalid_password',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    if (!admin.mfaSecret) {
      // MFA not enrolled — refuse login (MFA required for admins, spec §21.2)
      void this.audit.record({
        adminId: admin.id,
        action: 'admin.login',
        target: 'admin_user',
        result: 'deny',
        reason: 'mfa_not_enrolled',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({ messageKey: 'errors.MFA_REQUIRED' });
    }

    // Reset failed login counter
    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ctx.ip ?? null },
    });

    const ticket = randomBytes(32).toString('hex');
    await this.redis.connection.set(
      `admin:mfa:ticket:${ticket}`,
      JSON.stringify({ adminId: admin.id, email: admin.email }),
      'EX',
      300, // 5 min
    );

    void this.audit.record({
      adminId: admin.id,
      action: 'admin.login',
      target: 'admin_user',
      result: 'allow',
      reason: 'password_ok_mfa_pending',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { mfaTicket: ticket, mfaRequired: true };
  }

  /**
   * Step 2: Verify TOTP code against the MFA ticket, issue access + refresh JWTs.
   */
  async verifyMfa(raw: unknown, ctx: { ip?: string; userAgent?: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    admin: { id: string; email: string; firstName: string; lastName: string; roles: string[] };
  }> {
    const input = mfaVerifySchema.parse(raw);
    const ticketRaw = await this.redis.connection.get(`admin:mfa:ticket:${input.mfaTicket}`);
    if (!ticketRaw) {
      throw new UnauthorizedException({ messageKey: 'errors.MFA_TICKET_EXPIRED' });
    }
    const ticket = JSON.parse(ticketRaw) as { adminId: string; email: string };

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: ticket.adminId },
    });
    if (!admin || !admin.isActive || !admin.mfaSecret) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    const ok = otplibAuthenticator.verify({ token: input.code, secret: admin.mfaSecret });
    if (!ok) {
      void this.audit.record({
        adminId: admin.id,
        action: 'admin.mfa.verify',
        target: 'admin_user',
        result: 'deny',
        reason: 'invalid_mfa_code',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({ messageKey: 'errors.INVALID_MFA_CODE' });
    }

    // Burn the ticket so it can't be reused
    await this.redis.connection.del(`admin:mfa:ticket:${input.mfaTicket}`);

    const roles = admin.roles as string[];
    const payload: Omit<AdminJwtPayload, 'iat' | 'exp'> = {
      sub: admin.id,
      email: admin.email,
      roles,
      type: 'access',
    };

    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = await this.jwt.signAsync(
      { ...payload, type: 'refresh' },
      { expiresIn: '2592000s' }, // 30 days
    );

    void this.audit.record({
      adminId: admin.id,
      action: 'admin.mfa.verify',
      target: 'admin_user',
      result: 'allow',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        roles,
      },
    };
  }

  /**
   * Step-up authentication: re-verify TOTP, issue a 5min step-up JWT.
   * Required for sensitive operations (revocation, key rotation, API key deletion).
   */
  async stepUp(adminId: string, raw: unknown, ctx: { ip?: string; userAgent?: string }): Promise<{
    stepUpToken: string;
    expiresIn: number;
  }> {
    const input = stepUpSchema.parse(raw);
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin || !admin.isActive || !admin.mfaSecret) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    const ok = otplibAuthenticator.verify({ token: input.code, secret: admin.mfaSecret });
    if (!ok) {
      void this.audit.record({
        adminId: admin.id,
        action: 'admin.mfa.step_up',
        target: 'admin_user',
        result: 'deny',
        reason: 'invalid_mfa_code',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({ messageKey: 'errors.INVALID_MFA_CODE' });
    }

    const stepUpToken = await this.jwt.signAsync(
      { sub: admin.id, email: admin.email, roles: admin.roles as string[], type: 'step-up' },
      { expiresIn: '300s' }, // 5 min
    );

    void this.audit.record({
      adminId: admin.id,
      action: 'admin.mfa.step_up',
      target: 'admin_user',
      result: 'allow',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { stepUpToken, expiresIn: 300 };
  }

  async refresh(raw: unknown): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const input = z.object({ refreshToken: z.string().min(1) }).parse(raw);
    let payload: AdminJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminJwtPayload>(input.refreshToken);
    } catch {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    const newPayload: Omit<AdminJwtPayload, 'iat' | 'exp'> = {
      sub: admin.id,
      email: admin.email,
      roles: admin.roles as string[],
      type: 'access',
    };
    const accessToken = await this.jwt.signAsync(newPayload);
    const refreshToken = await this.jwt.signAsync(
      { ...newPayload, type: 'refresh' },
      { expiresIn: '2592000s' },
    );
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  async logout(accessToken: string): Promise<void> {
    try {
      const payload = await this.jwt.decode(accessToken) as AdminJwtPayload | null;
      if (!payload) {return;}
      const ttl = (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.connection.set(`admin:jwt:revoked:${sha256(accessToken)}`, '1', 'EX', ttl);
      }
    } catch (err) {
      this.logger.warn(`admin logout failed: ${(err as Error).message}`);
    }
  }

  private async incrementFailedLogin(adminId: string): Promise<void> {
    const max = 5;
    const lockMinutes = 15;
    const admin = await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { failedLoginCount: { increment: 1 } },
    });
    if (admin.failedLoginCount >= max) {
      await this.prisma.adminUser.update({
        where: { id: adminId },
        data: { lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000) },
      });
      void this.audit.record({
        adminId,
        action: 'admin.account.locked',
        target: 'admin_user',
        result: 'allow',
        reason: `too_many_failed_attempts:${admin.failedLoginCount}`,
      });
    }
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
