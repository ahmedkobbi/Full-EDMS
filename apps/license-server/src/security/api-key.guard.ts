import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';
import {
  API_KEY_SCOPES_KEY,
  IS_API_KEY_OPTIONAL_KEY,
} from '../common/decorators/api-key.decorator.js';

/**
 * API key authentication guard.
 *
 * Spec ref: §12.7 (online activation), §12.9 (heartbeat), §27.3 (security rules).
 *
 * The licensing server accepts API keys from on-premise backends for
 * machine-to-machine calls. API keys are:
 *   - created by an admin via the License Admin Panel,
 *   - bound to a customer,
 *   - scoped (e.g. `activation:online`, `heartbeat:write`, `license:read`),
 *   - hashed at rest (sha256), shown in plaintext only once at creation.
 *
 * The guard checks the `X-Api-Key` header. If the route is decorated
 * with `@OptionalApiKey()`, the guard also accepts an activation code in
 * the request body (used for online activation when the customer doesn't
 * have an API key yet).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

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

    const req = context.switchToHttp().getRequest<FastifyRequest & {
      apiKey?: { id: string; customerId: string; scopes: string[] };
      activationCode?: string;
    }>();

    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    if (apiKeyHeader) {
      const keyHash = sha256Hex(apiKeyHeader);
      const apiKey = await this.prisma.apiKey.findFirst({
        where: { keyHash, isActive: true, revokedAt: null },
      });
      if (!apiKey) {
        throw new UnauthorizedException({ messageKey: 'errors.INVALID_API_KEY' });
      }
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        throw new UnauthorizedException({ messageKey: 'errors.API_KEY_EXPIRED' });
      }

      // Scope check.
      const requiredScopes = this.reflector.getAllAndOverride<string[] | undefined>(
        API_KEY_SCOPES_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (requiredScopes && requiredScopes.length > 0) {
        const hasScope = apiKey.scopes.some((s: string) => requiredScopes.includes(s));
        if (!hasScope) {
          throw new UnauthorizedException({ messageKey: 'errors.INSUFFICIENT_SCOPE' });
        }
      }

      // Update lastUsedAt (fire-and-forget; don't block on it).
      void this.prisma.apiKey
        .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
        .catch((err: Error) => this.logger.warn(`Failed to update apiKey.lastUsedAt: ${err.message}`));

      req.apiKey = {
        id: apiKey.id,
        customerId: apiKey.customerId,
        scopes: apiKey.scopes,
      };
      return true;
    }

    // No API key header. Check if the route allows activation-code fallback.
    const optional = this.reflector.getAllAndOverride<boolean>(IS_API_KEY_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (optional) {
      // The body may carry an `activationCode` field. The controller is
      // responsible for validating it; we just record its presence so
      // downstream code knows the call is unauthenticated-by-API-key.
      const body = (req.body as { activationCode?: string } | null) ?? null;
      if (body?.activationCode) {
        req.activationCode = body.activationCode;
        return true;
      }
    }

    throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
  }
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
