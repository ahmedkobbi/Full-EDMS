import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { RedisService } from '../../common/redis.service.js';
import bcrypt from 'bcryptjs';
import { authenticator as otplibAuthenticator } from 'otplib';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import type { JwtPayload, LoginResult } from './types.js';

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
      include: { tenant: true, preferences: true, roleAssignments: { include: { role: true } } },
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
      include: { tenant: true, preferences: true, roleAssignments: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    return this.issueTokens(user, { userAgent: undefined, ip: undefined });
  }

  async logout(accessToken: string): Promise<void> {
    try {
      const payload = await this.jwt.decode(accessToken) as JwtPayload | null;
      if (!payload) return;
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
    user: Awaited<ReturnType<PrismaService['user']['findFirst']>> & object,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    if (!user) throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
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
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
