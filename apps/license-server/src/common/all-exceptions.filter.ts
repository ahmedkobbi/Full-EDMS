import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpAdapterHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';

/**
 * Global exception filter for the licensing server.
 *
 * Spec ref: §14.2 (common error contract), §27.1 (centralize error handling).
 *
 * Converts all errors into a standard envelope:
 *   {
 *     ok: false,
 *     error: {
 *       code: 'VALIDATION_FAILED',
 *       messageKey: 'errors.VALIDATION_FAILED',
 *       messageVars: { field: 'email' },
 *       traceId: 'uuid',
 *       details?: unknown
 *     }
 *   }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor() {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const traceId = ((req.headers['x-request-id'] as string | undefined) ?? randomUUID()) as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let envelope: { ok: false; error: { code: string; messageKey: string; messageVars?: Record<string, unknown>; traceId: string; details?: unknown } };

    if (exception && typeof exception === 'object' && 'response' in exception) {
      const nestResp = (exception as {
        response: { messageKey?: string; messageVars?: Record<string, unknown>; code?: string; details?: unknown; statusCode?: number };
      }).response;
      const nestStatus = (exception as { status?: number }).status;
      status = nestStatus ?? HttpStatus.BAD_REQUEST;
      envelope = {
        ok: false,
        error: {
          code: nestResp.code ?? mapStatusToCode(status),
          messageKey: nestResp.messageKey ?? 'errors.INTERNAL_ERROR',
          messageVars: nestResp.messageVars,
          traceId,
          details: nestResp.details,
        },
      };
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      envelope = {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          messageKey: 'errors.INTERNAL_ERROR',
          traceId,
        },
      };
    } else {
      envelope = {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          messageKey: 'errors.INTERNAL_ERROR',
          traceId,
        },
      };
    }

    if (status >= 500) {
      this.logger.error(
        `[${traceId}] ${status} ${req.method} ${req.url} — ${(exception as Error)?.message}`,
      );
    }
    void res.status(status).send(envelope);
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_FAILED';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'UNAUTHORIZED';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_FAILED';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'INTERNAL_ERROR';
  }
}
