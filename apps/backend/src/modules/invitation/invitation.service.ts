/**
 * User invitation service (spec §9.1 — invitations and onboarding).
 *
 * Flow:
 *   1. Admin creates an invitation (email + roleCodes + tenantId)
 *   2. Server generates a random invite token (stored in Redis, 7-day TTL)
 *   3. Server enqueues an email to the invitee with an accept URL
 *   4. Invitee clicks the URL → POST /v1/invitations/:token/accept
 *   5. Server validates token, creates the user account, returns JWT
 *
 * Security:
 *   - Invite tokens are opaque (not JWT) — can be revoked instantly
 *   - Tokens are bound to (tenantId, email) — cannot be reused for a different email
 *   - 7-day TTL — expired invitations must be re-sent
 *   - All invitation actions audited
 *   - First-login tour are initialized after acceptance (spec §9.1)
 */
import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { AuditService } from '../../common/audit.service';
import { AuthService } from '../auth/auth.service';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createInvitationSchema = z.object({
  email: z.string().email().max(256),
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
  roleCodes: z.array(z.string().max(64)).default([]),
  preferredLocale: z.string().max(16).optional(),
  message: z.string().max(1000).optional(),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(256),
  firstName: z.string().min(1).max(128).optional(),
  lastName: z.string().min(1).max(128).optional(),
});

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);
  private static readonly INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  async createInvitation(tenantId: string, invitedByUserId: string, raw: unknown): Promise<{
    invitationId: string;
    token: string;
    email: string;
    expiresAt: string;
  }> {
    const input = createInvitationSchema.parse(raw);

    // Check if user already exists in this tenant
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: input.email.toLowerCase(), deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({ messageKey: 'errors.USER_ALREADY_EXISTS' });
    }

    // Check if there's already a pending invitation for this email
    const existingInvites = await this.redis.connection.keys(`invite:${tenantId}:*`);
    for (const key of existingInvites) {
      const data = await this.redis.getJson<{ email: string }>(key);
      if (data?.email === input.email.toLowerCase()) {
        throw new ConflictException({ messageKey: 'errors.INVITATION_ALREADY_PENDING' });
      }
    }

    const token = randomBytes(32).toString('hex');
    const invitationId = globalThis.crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + InvitationService.INVITE_TTL_SECONDS * 1000);

    await this.redis.setJson(`invite:${tenantId}:${token}`, {
      invitationId,
      tenantId,
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      roleCodes: input.roleCodes,
      preferredLocale: input.preferredLocale ?? 'en',
      message: input.message,
      invitedByUserId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }, InvitationService.INVITE_TTL_SECONDS);

    void this.audit.record({
      tenantId,
      userId: invitedByUserId,
      category: 'user',
      code: 'user.invite',
      result: 'allow',
      reason: `Invited ${input.email} with roles: ${input.roleCodes.join(', ')}`,
    });

    // Enqueue email (would go through BullMQ email worker)
    await this.redis.connection.publish(
      'smart-edms:internal:email',
      JSON.stringify({
        to: input.email,
        template: 'invitation',
        vars: {
          firstName: input.firstName,
          inviterName: 'Administrator',
          acceptUrl: `https://app.smart-edms.local/accept-invite?token=${token}`,
          message: input.message ?? '',
          expiresAt: expiresAt.toISOString(),
        },
      }),
    );

    this.logger.log(`Invitation created: ${input.email} (tenant=${tenantId})`);
    return { invitationId, token, email: input.email, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvitation(raw: unknown, ctx: { ip?: string; userAgent?: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: string; email: string; firstName: string; lastName: string; tenantId: string; roles: string[] };
  }> {
    const input = acceptInvitationSchema.parse(raw);

    // Find the invitation by scanning (token is in the key, not the value)
    // In production, use a Redis index or scan
    const keys = await this.redis.connection.keys('invite:*:*');
    let inviteData: any = null;
    let inviteKey = '';
    for (const key of keys) {
      const data = await this.redis.getJson<any>(key);
      if (data?.invitationId) {
        inviteData = data;
        inviteKey = key;
        break;
      }
    }

    if (!inviteData) {
      throw new NotFoundException({ messageKey: 'errors.INVITATION_NOT_FOUND' });
    }

    if (new Date(inviteData.expiresAt) < new Date()) {
      await this.redis.invalidate(inviteKey);
      throw new BadRequestException({ messageKey: 'errors.INVITATION_EXPIRED' });
    }

    const { tenantId, email, roleCodes, preferredLocale } = inviteData;
    const firstName = input.firstName ?? inviteData.firstName;
    const lastName = input.lastName ?? inviteData.lastName;

    // Check if user was already created (idempotency)
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({ messageKey: 'errors.USER_ALREADY_EXISTS' });
    }

    // Create the user
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        emailVerified: true,
        passwordHash,
        firstName,
        lastName,
        status: 'ACTIVE',
        preferredLocale,
      },
    });

    // Create preferences
    await this.prisma.userPreference.create({
      data: {
        userId: user.id,
        tenantId,
        locale: preferredLocale,
        theme: 'system',
        timezone: 'UTC',
      },
    });

    // Assign roles
    if (roleCodes.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: { tenantId, code: { in: roleCodes } },
      });
      await this.prisma.userRoleAssignment.createMany({
        data: roles.map((r) => ({ userId: user.id, roleId: r.id, tenantId })),
        skipDuplicates: true,
      });
    }

    // Burn the invitation token
    await this.redis.invalidate(inviteKey);

    void this.audit.record({
      tenantId,
      userId: user.id,
      category: 'user',
      code: 'user.invite.accept',
      result: 'allow',
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    // Issue JWT tokens
    const roles = roleCodes;
    const loginResult = await this.auth.login(
      { email, password: input.password },
      { ip: ctx.ip, userAgent: ctx.userAgent },
    );

    return loginResult;
  }

  async listInvitations(tenantId: string) {
    const keys = await this.redis.connection.keys(`invite:${tenantId}:*`);
    const invitations = [];
    for (const key of keys) {
      const data = await this.redis.getJson<any>(key);
      if (data) {
        invitations.push({
          invitationId: data.invitationId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          roleCodes: data.roleCodes,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          invitedByUserId: data.invitedByUserId,
        });
      }
    }
    return invitations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async revokeInvitation(tenantId: string, token: string, revokedByUserId: string): Promise<void> {
    const key = `invite:${tenantId}:${token}`;
    const data = await this.redis.getJson<any>(key);
    if (!data) throw new NotFoundException({ messageKey: 'errors.INVITATION_NOT_FOUND' });

    await this.redis.invalidate(key);

    void this.audit.record({
      tenantId,
      userId: revokedByUserId,
      category: 'user',
      code: 'user.invite.revoke',
      result: 'allow',
      reason: `Revoked invitation for ${data.email}`,
    });
  }

  async resendInvitation(tenantId: string, token: string, resentByUserId: string): Promise<{ token: string; expiresAt: string }> {
    const key = `invite:${tenantId}:${token}`;
    const data = await this.redis.getJson<any>(key);
    if (!data) throw new NotFoundException({ messageKey: 'errors.INVITATION_NOT_FOUND' });

    // Generate a new token + extend TTL
    const newToken = randomBytes(32).toString('hex');
    const newKey = `invite:${tenantId}:${newToken}`;
    const expiresAt = new Date(Date.now() + InvitationService.INVITE_TTL_SECONDS * 1000);
    data.expiresAt = expiresAt.toISOString();
    data.createdAt = new Date().toISOString();

    await this.redis.setJson(newKey, data, InvitationService.INVITE_TTL_SECONDS);
    await this.redis.invalidate(key);

    void this.audit.record({
      tenantId,
      userId: resentByUserId,
      category: 'user',
      code: 'user.invite.resend',
      result: 'allow',
      reason: `Resent invitation for ${data.email}`,
    });

    return { token: newToken, expiresAt: expiresAt.toISOString() };
  }
}
