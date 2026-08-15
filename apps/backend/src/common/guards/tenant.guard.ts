import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

/**
 * Enforces tenant isolation: every request is scoped to the tenant in the JWT.
 * Path-supplied tenant IDs that differ from the JWT tenant ID are rejected.
 * Spec ref: §9.2 (multi-tenancy), §15.3 (tenant isolation), §27.3 (security rules).
 *
 * Negative tests MUST verify cross-tenant access is denied (spec §24.2).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user?.tid) {
      throw new ForbiddenException({ messageKey: 'errors.TENANT_MISMATCH' });
    }

    // If path has :tenantId, ensure it matches JWT
    const pathTenantId = (req.params as Record<string, string | undefined>)?.tenantId;
    if (pathTenantId && pathTenantId !== req.user.tid) {
      throw new ForbiddenException({ messageKey: 'errors.TENANT_MISMATCH' });
    }

    // Optional role check
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      if (!req.user.roles?.some((r) => requiredRoles.includes(r))) {
        throw new ForbiddenException({ messageKey: 'errors.UNAUTHORIZED' });
      }
    }

    return true;
  }
}
