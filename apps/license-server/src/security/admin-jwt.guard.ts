import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';

/**
 * Admin JWT payload — distinct from the on-prem backend's JwtPayload
 * because the licensing server has its own admin user directory.
 *
 * `mfaVerifiedAt` is set when the admin completes an MFA challenge. The
 * {@link StepUpGuard} checks it for sensitive operations.
 */
export interface AdminJwtPayload {
  /** Admin user ID. */
  sub: string;
  /** Admin email. */
  email: string;
  /** Role: `'super_admin'` | `'admin'` | `'support'` | `'read_only'`. */
  role: AdminRole;
  /** Timestamp (seconds) of the most recent MFA verification. */
  mfaVerifiedAt?: number;
  /** Session ID (for revocation). */
  sid: string;
  /** Token type — always `'access'` for access tokens. */
  typ: 'access';
}

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'read_only';

export interface AdminAuthenticatedRequest extends FastifyRequest {
  admin?: AdminJwtPayload;
  id: string;
}

/**
 * Admin JWT authentication guard.
 *
 * Spec ref: §12 (licensing system), §21.2 (authentication), §27.3 (security rules).
 *
 * Requires a valid admin JWT in the `Authorization: Bearer <token>` header.
 * The JWT MUST carry `role` and (for sensitive operations) `mfaVerifiedAt`
 * within the step-up window.
 *
 * Admin JWTs are issued by the licensing server's own `/v1/auth/login` +
 * `/v1/auth/mfa/verify` endpoints (out of scope for this skeleton; the
 * admin user directory and login flow are added by the License Admin Panel
 * integration task).
 *
 * For development, set `JWT_SECRET` and mint a token via the dev-only
 * `/v1/auth/dev-token` endpoint (gated by `NODE_ENV=development`).
 */
@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {return true;}

    const req = context.switchToHttp().getRequest<AdminAuthenticatedRequest>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    const token = authHeader.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<AdminJwtPayload>(token);
      if (payload.typ !== 'access') {
        throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
      }
      req.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
  }
}
