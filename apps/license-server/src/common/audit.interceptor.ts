import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_ACTION_KEY } from './decorators/audit-action.decorator.js';
import { AuditService } from '../modules/audit/audit.service.js';
import type { AdminAuthenticatedRequest } from '../security/admin-jwt.guard.js';

/**
 * Intercepts controller methods decorated with @AuditAction() and records
 * an entry in the licensing-server audit log on every call (success or
 * failure).
 *
 * Spec ref: §12.1 (audit log), §21.7 (logging), §27.3 (security rules).
 *
 * Records:
 *   - admin ID (from JWT)
 *   - action code (from decorator metadata)
 *   - target resource ID (extracted from `req.params.id` or `req.params.licenseId`)
 *   - IP address (from Fastify's `req.ip`)
 *   - user agent
 *   - result ('allow' or 'deny') — encoded in metadata
 *   - duration (in metadata)
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    if (!action) {return next.handle();}

    const req = context.switchToHttp().getRequest<AdminAuthenticatedRequest>();
    const start = Date.now();

    // Extract a target resource ID from common param names.
    const params = req.params as Record<string, string | undefined>;
    const target =
      params.id ?? params.licenseId ?? params.customerId ?? params.productId ?? params.requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.audit.record({
            adminId: req.admin?.sub,
            action,
            target,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { result: 'allow', durationMs: Date.now() - start },
          });
        },
        error: (err: unknown) => {
          void this.audit.record({
            adminId: req.admin?.sub,
            action,
            target,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              result: 'deny',
              durationMs: Date.now() - start,
              errorName: (err as Error)?.name,
              reason: (err as Error)?.message?.slice(0, 500),
            },
          });
        },
      }),
    );
  }
}
