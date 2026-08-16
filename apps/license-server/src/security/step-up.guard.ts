import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';
import type { AdminAuthenticatedRequest, AdminJwtPayload } from './admin-jwt.guard.js';

/**
 * Step-up authentication guard.
 *
 * Spec ref: §12 (licensing), §21.2 (authentication), §27.3 (security rules).
 *
 * Sensitive operations — license revocation, signing-key rotation, webhook
 * secret reset, admin role changes — require step-up authentication: the
 * admin must have completed an MFA challenge within the last
 * `STEP_UP_AUTH_TTL_SECONDS` seconds (default 300 = 5 min).
 *
 * The `mfaVerifiedAt` claim is embedded in the admin JWT by the
 * `/v1/auth/mfa/verify` endpoint. After the TTL elapses, the admin must
 * re-verify MFA before the next sensitive operation.
 *
 * Usage:
 *   @Post('revoke')
 *   @UseGuards(StepUpGuard)
 *   async revokeLicense(...) { ... }
 *
 * The guard reads `admin.mfaVerifiedAt` from the JWT payload (set by
 * {@link AdminJwtGuard}). If absent or expired, returns 403 with
 * `STEP_UP_REQUIRED`.
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {return true;}

    const req = context.switchToHttp().getRequest<AdminAuthenticatedRequest & FastifyRequest>();
    const admin = req.admin as AdminJwtPayload | undefined;
    if (!admin) {
      // AdminJwtGuard should have run first. If not, fail closed.
      throw new ForbiddenException({ messageKey: 'errors.STEP_UP_REQUIRED' });
    }

    const ttlSeconds = this.config.get<number>('STEP_UP_AUTH_TTL_SECONDS') ?? 300;
    const now = Math.floor(Date.now() / 1000);
    const verifiedAt = admin.mfaVerifiedAt ?? 0;

    if (verifiedAt === 0 || now - verifiedAt > ttlSeconds) {
      throw new ForbiddenException({
        messageKey: 'errors.STEP_UP_REQUIRED',
        messageVars: { ttlSeconds },
      });
    }
    return true;
  }
}
