/**
 * API Key authentication guard.
 *
 * Allows alternative authentication via the `X-Api-Key` header instead of
 * a JWT Bearer token. Used for programmatic API access (integrations, scripts,
 * scanning agents).
 *
 * Spec ref: §9.15 (API key management), §21.3 (authorization — deny by default).
 *
 * When both JWT and API key are present, JWT takes precedence.
 * When neither is present, the request falls through to JwtAuthGuard which
 * throws UNAUTHENTICATED.
 *
 * Usage (applied globally alongside JwtAuthGuard):
 *   The guard checks for `X-Api-Key` header. If present, validates via
 *   ApiKeyService.validate(). If valid, populates req.user with a synthetic
 *   JWT payload derived from the API key's tenant + scopes.
 */
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeyService } from '../../modules/api-key/api-key.service';
import type { JwtPayload } from '../../modules/auth/types';

export interface ApiKeyAuthenticatedRequest extends FastifyRequest {
  user?: JwtPayload;
  apiKey?: {
    id: string;
    tenantId: string;
    scopes: string[];
    name: string;
  };
  tenantId?: string;
  id: string;
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<ApiKeyAuthenticatedRequest>();

    // If a Bearer token is already present, defer to JwtAuthGuard
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return true; // JwtAuthGuard will handle it
    }

    // Check for X-Api-Key header
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    if (!apiKeyHeader) {
      return true; // No API key — fall through to JwtAuthGuard
    }

    // Validate the API key
    const apiKey = await this.apiKeys.validate(apiKeyHeader);
    if (!apiKey) {
      this.logger.warn(`Invalid API key attempt: ${apiKeyHeader.slice(0, 12)}…`);
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    // Populate req.user with a synthetic JWT payload
    // API keys don't have a specific user — they act on behalf of the tenant
    req.user = {
      sub: `apikey:${apiKey.id}`,
      tid: apiKey.tenantId,
      email: '',
      roles: ['api-key'],
      type: 'access',
    };
    req.apiKey = {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
      name: apiKey.name,
    };
    req.tenantId = apiKey.tenantId;

    this.logger.debug(`API key authenticated: ${apiKey.name} (${apiKey.keyPrefix}…)`);
    return true;
  }
}
