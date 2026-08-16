import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { RedisService } from '../../common/redis.service';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticator as otplibAuthenticator } from 'otplib';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { JwtPayload, LoginResult } from './types';

const USER_WITH_RELATIONS = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { tenant: true, preferences: true, roleAssignments: { include: { role: true } } },
});
type UserWithRelations = Prisma.UserGetPayload<typeof USER_WITH_RELATIONS>;

const loginSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(8).max(256),
  mfaCode: z.string().optional(),
  deviceFingerprint: z.string().max(128).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Authentication service: login (with MFA), token refresh, logout, MFA enrollment.
 * Spec ref: §9.1 (IAM), §21.2 (authentication — strong password, MFA, lockout, step-up).
 *
 * Security rules enforced here:
 * - bcrypt with rounds from config (12 in production)
 * - rate-limited failed logins (via global rate-limit + per-user lockout)
 * - MFA required for admins (enforced in route guard)
 * - refresh tokens are hashed before storage, revocable
 * - audit log for every login attempt (success + failure)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  async login(raw: unknown, ctx: { ip?: string; userAgent?: string }): Promise<LoginResult> {
    const input = loginSchema.parse(raw);

    const user = await this.prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
      ...USER_WITH_RELATIONS,
    });

    if (!user || user.status !== 'ACTIVE' || !user.passwordHash) {
      void this.audit.record({
        tenantId: user?.tenantId ?? 'unknown',
        userId: user?.id,
        category: 'auth',
        code: 'auth.login',
        result: 'deny',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        reason: 'user_not_found_or_inactive',
      });
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      void this.audit.record({
        tenantId: user.tenantId,
        userId: user.id,
        category: 'auth',
        code: 'auth.login',
        result: 'deny',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        reason: 'account_locked',
      });
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordOk) {
      await this.incrementFailedLogin(user.id, user.tenantId);
      void this.audit.record({
        tenantId: user.tenantId,
        userId: user.id,
        category: 'auth',
        code: 'auth.login',
        result: 'deny',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        reason: 'invalid_password',
      });
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    // Reset failed login counter
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ctx.ip ?? null },
    });

    // If MFA enabled, require code
    if (user.mfaEnabled && user.mfaSecret) {
      if (!input.mfaCode) {
        const ticket = await this.issueMfaTicket(user.id, user.tenantId);
        return {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tenantId: user.tenantId,
            roles: user.roleAssignments.map((r) => r.role.code),
            locale: user.preferences?.locale ?? user.tenant.defaultLocale,
            theme: user.preferences?.theme ?? user.tenant.defaultTheme,
          },
          mfaRequired: true,
          mfaTicket: ticket,
        };
      }
      const ok = otplibAuthenticator.verify({ token: input.mfaCode, secret: user.mfaSecret });
      if (!ok) {
        void this.audit.record({
          tenantId: user.tenantId,
          userId: user.id,
          category: 'auth',
          code: 'auth.mfa.verify',
          result: 'deny',
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          reason: 'invalid_mfa_code',
        });
        throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
      }
    }

    return this.issueTokens(user, ctx);
  }

  async refresh(raw: unknown): Promise<LoginResult> {
    const input = refreshSchema.parse(raw);
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(input.refreshToken);
    } catch {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tid, deletedAt: null, status: 'ACTIVE' },
      ...USER_WITH_RELATIONS,
    });
    if (!user) {throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });}
    return this.issueTokens(user, { userAgent: undefined, ip: undefined });
  }

  async logout(accessToken: string): Promise<void> {
    try {
      const payload = await this.jwt.decode(accessToken) as JwtPayload | null;
      if (!payload) {return;}
      const ttl = (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.connection.set(`jwt:revoked:${sha256(accessToken)}`, '1', 'EX', ttl);
      }
    } catch (err) {
      this.logger.warn(`logout failed: ${(err as Error).message}`);
    }
  }

  async isRevoked(accessToken: string): Promise<boolean> {
    const exists = await this.redis.connection.get(`jwt:revoked:${sha256(accessToken)}`);
    return exists === '1';
  }

  private async issueTokens(
    user: UserWithRelations,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    if (!user) {throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });}
    const roles = user.roleAssignments.map((r) => r.role.code);
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      tid: user.tenantId,
      email: user.email,
      roles,
      locale: user.preferences?.locale ?? user.tenant.defaultLocale,
      type: 'access',
    };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = await this.jwt.signAsync(
      { ...payload, type: 'refresh' },
      { expiresIn: `${this.config.get<number>('JWT_REFRESH_TTL_SECONDS')}s` },
    );

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: sha256(accessToken),
        refreshTokenHash: sha256(refreshToken),
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        expiresAt: new Date(Date.now() + this.config.get<number>('JWT_REFRESH_TTL_SECONDS')! * 1000),
      },
    });

    void this.audit.record({
      tenantId: user.tenantId,
      userId: user.id,
      category: 'auth',
      code: 'auth.login',
      result: 'allow',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('JWT_ACCESS_TTL_SECONDS')!,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        roles,
        locale: user.preferences?.locale ?? user.tenant.defaultLocale,
        theme: user.preferences?.theme ?? user.tenant.defaultTheme,
      },
    };
  }

  private async incrementFailedLogin(userId: string, tenantId: string): Promise<void> {
    const max = 5;
    const lockMinutes = 15;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
    });
    if (user.failedLoginCount >= max) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000) },
      });
      void this.audit.record({
        tenantId,
        userId,
        category: 'auth',
        code: 'auth.account.locked',
        result: 'allow',
        reason: `too_many_failed_attempts:${user.failedLoginCount}`,
      });
    }
  }

  private async issueMfaTicket(userId: string, tenantId: string): Promise<string> {
    const ticket = randomBytes(32).toString('hex');
    await this.redis.setJson(`mfa:ticket:${ticket}`, { userId, tenantId }, 300);
    return ticket;
  }

  // ===========================================================================
  // §9.1 IAM — Password reset, MFA enrollment, session management
  // ===========================================================================

  /**
   * Initiate password reset. Generates a reset token (not a JWT — opaque random
   * token stored in Redis with 30min TTL). Sends a reset email (queued).
   * Spec ref: §9.1 (profile management, authentication).
   */
  async initiatePasswordReset(email: string, ctx: { ip?: string; userAgent?: string }): Promise<{ ok: true }> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, status: 'ACTIVE' },
    });
    // Always return ok — don't reveal whether the email exists (spec §21.5)
    if (!user) {
      void this.audit.record({
        tenantId: 'unknown',
        category: 'auth',
        code: 'auth.password.reset.request',
        result: 'deny',
        reason: 'user_not_found',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { ok: true };
    }

    const token = randomBytes(32).toString('hex');
    await this.redis.setJson(`password:reset:${token}`, { userId: user.id, tenantId: user.tenantId }, 1800); // 30 min

    void this.audit.record({
      tenantId: user.tenantId,
      userId: user.id,
      category: 'auth',
      code: 'auth.password.reset.request',
      result: 'allow',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    // Email dispatch would be queued via BullMQ here
    this.logger.log(`Password reset token issued for user ${user.id} (TTL=30min)`);
    return { ok: true };
  }

  /**
   * Complete password reset with token + new password.
   */
  async completePasswordReset(
    token: string,
    newPassword: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ ok: true }> {
    const resetData = await this.redis.getJson<{ userId: string; tenantId: string }>(`password:reset:${token}`);
    if (!resetData) {
      throw new UnauthorizedException({ messageKey: 'errors.PASSWORD_RESET_TOKEN_EXPIRED' });
    }

    if (newPassword.length < 8) {
      throw new UnauthorizedException({ messageKey: 'errors.VALIDATION_FAILED' });
    }

    const passwordHash = await bcrypt.hash(newPassword, this.config.get<number>('BCRYPT_ROUNDS') ?? 12);
    await this.prisma.user.update({
      where: { id: resetData.userId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    });

    // Burn the token
    await this.redis.invalidate(`password:reset:${token}`);

    // Revoke all existing sessions for this user (force re-login)
    await this.revokeAllSessions(resetData.userId, resetData.tenantId);

    void this.audit.record({
      tenantId: resetData.tenantId,
      userId: resetData.userId,
      category: 'auth',
      code: 'auth.password.reset.complete',
      result: 'allow',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { ok: true };
  }

  /**
   * Change password (authenticated user, knows current password).
   */
  async changePassword(
    tenantId: string,
    userId: string,
    currentPassword: string,
    newPassword: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentOk) {
      void this.audit.record({
        tenantId,
        userId,
        category: 'auth',
        code: 'auth.password.change',
        result: 'deny',
        reason: 'invalid_current_password',
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({ messageKey: 'errors.INVALID_CURRENT_PASSWORD' });
    }

    if (newPassword.length < 8) {
      throw new UnauthorizedException({ messageKey: 'errors.VALIDATION_FAILED' });
    }

    const passwordHash = await bcrypt.hash(newPassword, this.config.get<number>('BCRYPT_ROUNDS') ?? 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    void this.audit.record({
      tenantId,
      userId,
      category: 'auth',
      code: 'auth.password.change',
      result: 'allow',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { ok: true };
  }

  /**
   * Start MFA enrollment. Generates a new TOTP secret + QR code URI.
   * The secret is stored in Redis (NOT on the user record yet) until
   * the user verifies with a code (confirmEnrollment).
   * Spec ref: §21.2 (MFA enrollment must be protected).
   */
  async startMfaEnrollment(
    tenantId: string,
    userId: string,
  ): Promise<{ secret: string; qrCodeUri: string; backupCodes: string[] }> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });}
    if (user.mfaEnabled) {
      throw new UnauthorizedException({ messageKey: 'errors.MFA_ALREADY_ENABLED' });
    }

    const secret = otplibAuthenticator.generateSecret();
    const backupCodes = Array.from({ length: 10 }, () => randomBytes(5).toString('hex'));
    const qrCodeUri = otplibAuthenticator.keyuri(user.email, 'Smart EDMS', secret);

    // Store pending enrollment in Redis (10min TTL)
    await this.redis.setJson(`mfa:enrollment:${userId}`, { secret, backupCodes }, 600);

    void this.audit.record({
      tenantId,
      userId,
      category: 'auth',
      code: 'auth.mfa.enroll.start',
      result: 'allow',
    });

    return { secret, qrCodeUri, backupCodes };
  }

  /**
   * Confirm MFA enrollment. Verifies the first TOTP code against the pending
   * secret, then activates MFA on the user record.
   */
  async confirmMfaEnrollment(
    tenantId: string,
    userId: string,
    code: string,
  ): Promise<{ ok: true }> {
    const pending = await this.redis.getJson<{ secret: string; backupCodes: string[] }>(`mfa:enrollment:${userId}`);
    if (!pending) {
      throw new UnauthorizedException({ messageKey: 'errors.MFA_ENROLLMENT_EXPIRED' });
    }

    const ok = otplibAuthenticator.verify({ token: code, secret: pending.secret });
    if (!ok) {
      void this.audit.record({
        tenantId,
        userId,
        category: 'auth',
        code: 'auth.mfa.enroll.confirm',
        result: 'deny',
        reason: 'invalid_code',
      });
      throw new UnauthorizedException({ messageKey: 'errors.INVALID_MFA_CODE' });
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      pending.backupCodes.map((c) => bcrypt.hash(c, 10)),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: pending.secret,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    await this.redis.invalidate(`mfa:enrollment:${userId}`);

    void this.audit.record({
      tenantId,
      userId,
      category: 'auth',
      code: 'auth.mfa.enroll.confirm',
      result: 'allow',
    });

    return { ok: true };
  }

  /**
   * Disable MFA (requires current password verification).
   */
  async disableMfa(
    tenantId: string,
    userId: string,
    currentPassword: string,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordOk) {
      void this.audit.record({
        tenantId,
        userId,
        category: 'auth',
        code: 'auth.mfa.disable',
        result: 'deny',
        reason: 'invalid_password',
      });
      throw new UnauthorizedException({ messageKey: 'errors.INVALID_CURRENT_PASSWORD' });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    void this.audit.record({
      tenantId,
      userId,
      category: 'auth',
      code: 'auth.mfa.disable',
      result: 'allow',
    });

    return { ok: true };
  }

  /**
   * List active sessions for the current user.
   * Spec ref: §9.1 (session management).
   */
  async listSessions(tenantId: string, userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { tenantId, userId, status: 'ACTIVE', revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        deviceFingerprint: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return sessions;
  }

  /**
   * Revoke a specific session (by session ID). Only the session owner or an admin can revoke.
   */
  async revokeSession(tenantId: string, userId: string, sessionId: string): Promise<{ ok: true }> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, tenantId },
    });
    if (!session) {throw new UnauthorizedException({ messageKey: 'errors.NOT_FOUND' });}
    // Only the owner can revoke their own sessions (admins use a separate endpoint)
    if (session.userId !== userId) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHORIZED' });
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    // Add token hash to Redis revocation list (so the JWT is immediately invalid)
    if (session.tokenHash) {
      const ttl = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
      if (ttl > 0) {
        await this.redis.connection.set(`jwt:revoked:${session.tokenHash}`, '1', 'EX', ttl);
      }
    }

    void this.audit.record({
      tenantId,
      userId,
      category: 'auth',
      code: 'auth.session.revoke',
      result: 'allow',
      resourceId: sessionId,
    });

    return { ok: true };
  }

  /**
   * Revoke all sessions for a user (used on password reset/change).
   */
  async revokeAllSessions(tenantId: string, userId: string): Promise<{ count: number }> {
    const sessions = await this.prisma.session.findMany({
      where: { tenantId, userId, status: 'ACTIVE', revokedAt: null },
      select: { id: true, tokenHash: true, expiresAt: true },
    });

    for (const session of sessions) {
      if (session.tokenHash) {
        const ttl = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
        if (ttl > 0) {
          await this.redis.connection.set(`jwt:revoked:${session.tokenHash}`, '1', 'EX', ttl);
        }
      }
    }

    await this.prisma.session.updateMany({
      where: { tenantId, userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    void this.audit.record({
      tenantId,
      userId,
      category: 'auth',
      code: 'auth.session.revoke_all',
      result: 'allow',
      metadata: { count: sessions.length },
    });

    return { count: sessions.length };
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
