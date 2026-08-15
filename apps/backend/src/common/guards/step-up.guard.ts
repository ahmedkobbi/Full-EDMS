/**
 * Step-up authentication guard for the on-premise backend (spec §9.15, §21.2).
 *
 * Requires a step-up JWT (issued after re-verification of MFA) for
 * destructive admin actions:
 *  - Deleting a user
 *  - Changing security policies
 *  - Changing tenant configuration
 *  - Disabling audit (if ever allowed)
 *
 * The step-up JWT is sent in the `X-Step-Up-Token` header and must have
 * been issued within the last 5 minutes.
 *
 * Spec ref: §9.15 (destructive actions require confirmation, high-risk actions
 *           require step-up authentication), §21.2 (step-up authentication
 *           for sensitive actions).
 */
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/redis.service';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { STEP_UP_REQUIRED_KEY } from '../decorators/step-up-required.decorator';

export interface StepUpPayload {
  sub: string;
  tid: string;
  type: 'step-up';
  iat: number;
  exp: number;
}

@Injectable()
export class StepUpGuard implements CanActivate {
  private readonly logger = new Logger(StepUpGuard.name);
  private static readonly STEP_UP_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiresStepUp = this.reflector.getAllAndOverride<boolean>(STEP_UP_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresStepUp) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: { sub: string; tid: string } }>();
    const stepUpToken = req.headers['x-step-up-token'] as string | undefined;

    if (!stepUpToken) {
      throw new ForbiddenException({ messageKey: 'errors.STEP_UP_REQUIRED' });
    }

    try {
      const payload = await this.jwt.verifyAsync<StepUpPayload>(stepUpToken);
      if (payload.type !== 'step-up') {
        throw new ForbiddenException({ messageKey: 'errors.INVALID_STEP_UP_TOKEN' });
      }

      // Verify the step-up token belongs to the same user
      if (req.user && payload.sub !== req.user.sub) {
        throw new ForbiddenException({ messageKey: 'errors.STEP_UP_USER_MISMATCH' });
      }

      // Check revocation list
      const revoked = await this.redis.connection.get(`stepup:revoked:${this.hashToken(stepUpToken)}`);
      if (revoked === '1') {
        throw new ForbiddenException({ messageKey: 'errors.STEP_UP_TOKEN_REVOKED' });
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.warn(`Step-up token validation failed: ${(err as Error).message}`);
      throw new ForbiddenException({ messageKey: 'errors.INVALID_STEP_UP_TOKEN' });
    }
  }

  private hashToken(token: string): string {
    const { createHash } = require('node:crypto');
    return createHash('sha256').update(token).digest('hex');
  }
}
