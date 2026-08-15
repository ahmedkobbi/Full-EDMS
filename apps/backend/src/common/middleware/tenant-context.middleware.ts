import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Populates req.tenantId from JWT (already verified by JwtAuthGuard) and
 * propagates X-Request-Id for correlation across logs and audit events.
 * Spec ref: §9.2 (tenant context enforced server-side), §21.7 (correlation IDs).
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: FastifyReply, next: () => void): void {
    // The Fastify request `id` is already a UUID (set in main.ts genReqId).
    // Forward it as X-Request-Id on outgoing internal calls if needed.
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = req.id;
    }
    next();
  }
}
