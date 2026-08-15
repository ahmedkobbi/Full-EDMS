/**
 * Smart EDMS — AI Assistant REST controller (spec §11, §27.7).
 *
 * Endpoints (all JWT-protected, tenant-scoped):
 *
 *   POST   /v1/ai/assistant/chat                    main chat endpoint (SSE streaming when
 *                                                    ?stream=true, single JSON otherwise)
 *   GET    /v1/ai/assistant/sessions                list user's sessions (paginated)
 *   GET    /v1/ai/assistant/sessions/:id            get session with messages
 *   POST   /v1/ai/assistant/sessions/:id/feedback   thumbs up / down
 *   POST   /v1/ai/assistant/sessions/:id/clear      clear session (audited)
 *   GET    /v1/ai/assistant/tools                   list available tools for current user
 *
 * Admin endpoints (under @Roles('admin')):
 *   GET    /v1/admin/ai/settings                    tenant AI settings
 *   PATCH  /v1/admin/ai/settings                    update tenant AI settings
 *   GET    /v1/admin/ai/audit                       paginated AI audit events
 *   GET    /v1/admin/ai/usage                       usage metrics
 *
 * Spec ref: §11 (AI Assistant Bubble), §14 (API contract), §27.7 (rules),
 * §27.3 (audit every mutation).
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { LicenseRequired } from '../../common/decorators/license-required.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';
import { AiService, type AiRequestContext } from './ai.service.js';
import {
  AdminAuditQuerySchema,
  AdminUsageQuerySchema,
  SessionFeedbackBodySchema,
  SessionListQuerySchema,
  UpdateAssistantSettingsBodySchema,
  type AdminAuditQuery,
  type AdminUsageQuery,
  type SessionFeedbackBody,
  type SessionListQuery,
  type UpdateAssistantSettingsBody,
} from './dto.js';
import { AssistantChatRequestSchema } from '@smart-edms/schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the AiRequestContext from the authenticated Fastify request. */
function ctxFromReq(req: AuthenticatedRequest): AiRequestContext {
  return {
    tenantId: req.user!.tid,
    userId: req.user!.sub,
    roles: req.user!.roles ?? [],
    locale: req.user!.locale ?? 'en',
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    currentRoute: (req.headers['x-current-route'] as string | undefined) ?? '/',
  };
}

// ---------------------------------------------------------------------------
// User-facing controller
// ---------------------------------------------------------------------------

@Controller('v1/ai/assistant')
@LicenseRequired({ module: 'ai-assistant', failClosed: true })
export class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * Main chat endpoint. When `?stream=true`, writes SSE chunks to the
   * response; otherwise returns a single JSON response.
   */
  @Post('chat')
  @Audit({ category: 'ai_assistant', code: 'ai.message_sent', resourceType: 'assistant_message' })
  @HttpCode(200)
  async chat(
    @Body() body: unknown,
    @Query('stream') stream: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const parsed = AssistantChatRequestSchema.parse(body);
    const ctx = ctxFromReq(req);

    // Apply locale fallback from JWT when the body omits it.
    const finalBody = {
      message: parsed.message,
      sessionId: parsed.sessionId,
      locale: parsed.locale ?? ctx.locale,
      context: parsed.context,
      preInjectionCheck: parsed.preInjectionCheck,
    };

    if (stream === 'true') {
      // SSE streaming — write chunks as `text/event-stream`.
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache, no-transform');
      reply.header('Connection', 'keep-alive');
      reply.header('X-Accel-Buffering', 'no');

      const raw = reply.raw;
      raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      try {
        for await (const ev of this.ai.streamChat(finalBody, ctx)) {
          if (ev.type === 'chunk') {
            raw.write(`event: chunk\ndata: ${JSON.stringify({
              delta: ev.delta,
              sequence: ev.sequence,
              final: ev.final,
            })}\n\n`);
          } else {
            raw.write(`event: final\ndata: ${JSON.stringify(ev.response)}\n\n`);
          }
        }
      } catch (err) {
        raw.write(
          `event: error\ndata: ${JSON.stringify({
            messageKey: 'ai.errors.unavailable',
            detail: (err as Error).message.slice(0, 200),
          })}\n\n`,
        );
      } finally {
        raw.end();
      }
      // `passthrough: true` would re-send a response; we've handled the
      // reply manually so return void.
      return;
    }

    // Non-streaming path — return the full response as JSON.
    return this.ai.chat(finalBody, ctx);
  }

  @Get('sessions')
  async listSessions(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = SessionListQuerySchema.parse(query) as SessionListQuery;
    return this.ai.listSessions(req.user!.tid, req.user!.sub, parsed);
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ai.getSession(req.user!.tid, req.user!.sub, id);
  }

  @Post('sessions/:id/feedback')
  @Audit({ category: 'ai_assistant', code: 'ai.message_sent', resourceType: 'assistant_session' })
  @HttpCode(200)
  async submitFeedback(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = SessionFeedbackBodySchema.parse(body) as SessionFeedbackBody;
    return this.ai.submitFeedback(req.user!.tid, req.user!.sub, id, parsed);
  }

  @Post('sessions/:id/clear')
  @Audit({ category: 'ai_assistant', code: 'ai.session_started', resourceType: 'assistant_session' })
  @HttpCode(200)
  async clearSession(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ai.clearSession(req.user!.tid, req.user!.sub, id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    });
  }

  @Get('tools')
  async listTools(@Req() req: AuthenticatedRequest) {
    return this.ai.listTools(ctxFromReq(req));
  }

  /**
   * Confirm a suggested action. Sensitive actions are executed; destructive
   * actions are blocked and the client must redirect to the appropriate
   * admin UI (spec §11.4).
   */
  @Post('actions/:id/confirm')
  @Audit({ category: 'ai_assistant', code: 'ai.action.confirm', resourceType: 'assistant_action', resourceIdParam: 'id' })
  @HttpCode(200)
  async confirmAction(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ai.confirmAction(req.user!.tid, req.user!.sub, id, {
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Cancel a suggested action (user dismissed it). No execution.
   */
  @Post('actions/:id/cancel')
  @HttpCode(200)
  async cancelAction(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.ai.cancelAction(req.user!.tid, req.user!.sub, id);
  }
}

// ---------------------------------------------------------------------------
// Admin controller
// ---------------------------------------------------------------------------

@Controller('v1/admin/ai')
@Roles('admin')
export class AiAdminController {
  constructor(private readonly ai: AiService) {}

  @Get('settings')
  async getSettings(@Req() req: AuthenticatedRequest) {
    return this.ai.getSettings(req.user!.tid);
  }

  @Patch('settings')
  @Audit({ category: 'admin', code: 'admin.policy_changed', resourceType: 'assistant_settings' })
  async updateSettings(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = UpdateAssistantSettingsBodySchema.parse(body) as UpdateAssistantSettingsBody;
    return this.ai.updateSettings(req.user!.tid, parsed);
  }

  @Get('audit')
  async listAudit(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = AdminAuditQuerySchema.parse(query) as AdminAuditQuery;
    return this.ai.listAuditEvents(req.user!.tid, parsed);
  }

  @Get('usage')
  async getUsage(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = AdminUsageQuerySchema.parse(query) as AdminUsageQuery;
    return this.ai.getUsageMetrics(req.user!.tid, parsed);
  }
}
