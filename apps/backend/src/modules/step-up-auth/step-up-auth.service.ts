/**
 * Step-up authentication service for the on-premise backend (spec §9.15).
 *
 * Issues a 5-minute step-up JWT after MFA re-verification. Used for
 * destructive admin actions (user deletion, security policy changes, etc.).
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { authenticator as otplibAuthenticator } from 'otplib';
import { z } from 'zod';

const stepUpSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

@Injectable()
export class StepUpAuthService {
  private readonly logger = new Logger(StepUpAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Issue a step-up JWT after verifying the user's current TOTP code.
   * The JWT is valid for 5 minutes and must be sent as X-Step-Up-Token header.
   */
  async issueStepUpToken(
    tenantId: string,
    userId: string,
    raw: unknown,
  ): Promise<{ stepUpToken: string; expiresIn: number }> {
    const input = stepUpSchema.parse(raw);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException({ messageKey: 'errors.MFA_NOT_ENABLED' });
    }

    const ok = otplibAuthenticator.verify({ token: input.code, secret: user.mfaSecret });
    if (!ok) {
      void this.audit.record({
        tenantId,
        userId,
        category: 'auth',
        code: 'auth.step_up',
        result: 'deny',
        reason: 'invalid_mfa_code',
      });
      throw new UnauthorizedException({ messageKey: 'errors.INVALID_MFA_CODE' });
    }

    const stepUpToken = await this.jwt.signAsync(
      { sub: userId, tid: tenantId, type: 'step-up' },
      { expiresIn: '300s' }, // 5 minutes
    );

    void this.audit.record({
      tenantId,
      userId,
      category: 'auth',
      code: 'auth.step_up',
      result: 'allow',
    });

    this.logger.log(`Step-up token issued: user=${userId}`);
    return { stepUpToken, expiresIn: 300 };
  }
}
