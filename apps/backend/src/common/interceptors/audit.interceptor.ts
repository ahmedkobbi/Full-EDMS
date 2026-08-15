import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, type AuditMetadata } from '../decorators/audit.decorator';
import { AuditService } from '../audit.service';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

/**
 * Intercepts controller methods decorated with @Audit() and records an audit event
 * for every call (success or failure). Spec ref: §9.12 (audit events), §27.3 (security rules).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const start = Date.now();
    const correlationId = (req.headers['x-request-id'] as string | undefined) ?? req.id;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.audit.record({
            tenantId: req.tenantId ?? meta.tenantIdFallback ?? 'unknown',
            userId: req.user?.sub,
            category: meta.category,
            code: meta.code,
            result: 'allow',
            resourceType: meta.resourceType,
            resourceId: extractResourceId(req, meta.resourceIdParam),
            documentId: extractResourceId(req, meta.documentIdParam),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            correlationId,
            metadata: { durationMs: Date.now() - start },
          });
        },
        error: (err) => {
          void this.audit.record({
            tenantId: req.tenantId ?? meta.tenantIdFallback ?? 'unknown',
            userId: req.user?.sub,
            category: meta.category,
            code: meta.code,
            result: 'deny',
            resourceType: meta.resourceType,
            resourceId: extractResourceId(req, meta.resourceIdParam),
            documentId: extractResourceId(req, meta.documentIdParam),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            correlationId,
            reason: (err as Error)?.message?.slice(0, 500),
            metadata: { durationMs: Date.now() - start, errorName: (err as Error)?.name },
          });
        },
      }),
    );
  }
}

function extractResourceId(req: AuthenticatedRequest, param?: string): string | undefined {
  if (!param) return undefined;
  return (req.params as Record<string, string | undefined>)?.[param];
}
