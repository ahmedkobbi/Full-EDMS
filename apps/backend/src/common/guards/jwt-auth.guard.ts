import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload } from '../../modules/auth/types';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: JwtPayload;
  tenantId?: string;
  id: string;
}

/**
 * JWT authentication guard. Validates access tokens on every protected route.
 * Spec ref: §21.2 (authentication), §27.3 (security rules).
 *
 * Public routes are explicitly decorated with @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    const token = authHeader.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      req.user = payload;
      req.tenantId = payload.tid;
      return true;
    } catch {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
  }
}
