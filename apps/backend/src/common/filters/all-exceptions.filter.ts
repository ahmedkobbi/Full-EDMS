import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { ApiErrorEnvelope } from '@smart-edms/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const traceId = ((req.headers['x-request-id'] as string | undefined) ?? randomUUID()) as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let envelope: ApiErrorEnvelope;

    if (exception && typeof exception === 'object' && 'response' in exception) {
      const nestResp = (exception as { response: { messageKey?: string; messageVars?: Record<string, unknown>; code?: string; details?: unknown; statusCode?: number } }).response;
      const nestStatus = (exception as { status?: number }).status;
      status = nestStatus ?? HttpStatus.BAD_REQUEST;
      envelope = {
        ok: false,
        error: {
          code: (nestResp.code ?? mapStatusToCode(status)) as ApiErrorEnvelope['error']['code'],
          messageKey: nestResp.messageKey ?? 'errors.INTERNAL_ERROR',
          messageVars: nestResp.messageVars as any,
          traceId,
          details: (nestResp.details as Record<string, unknown> | undefined) ?? undefined,
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
      this.logger.error(`[${traceId}] ${status} ${req.method} ${req.url} — ${(exception as Error)?.message}`);
    }
    void res.status(status).send(envelope);
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400: return 'VALIDATION_FAILED';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'UNAUTHORIZED';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_FAILED';
    case 429: return 'RATE_LIMITED';
    case 503: return 'SERVICE_UNAVAILABLE';
    default: return 'INTERNAL_ERROR';
  }
}
