/**
 * AI tool: `audit.getRecentEvents` (spec §11.5).
 *
 * Returns recent audit events the user is authorised to see. Limited to a
 * narrow summary: `code`, `category`, `result`, `occurredAt`, `resourceType`,
 * `resourceId` (when present). Reason text and metadata are NEVER returned
 * to the model — they may contain user-identifying or sensitive diagnostic
 * information.
 *
 * Permission: limited to admin / compliance-officer / auditor roles.
 */

import type { z } from 'zod';
import { AuditGetRecentEventsInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface AuditGetRecentEventsOutput {
  readonly events: ReadonlyArray<{
    readonly id: string;
    readonly category: string;
    readonly code: string;
    readonly result: string;
    readonly resourceType: string | null;
    readonly resourceId: string | null;
    readonly occurredAt: string;
  }>;
  readonly total: number;
}

export const auditRecentTool: ToolDefinition<
  z.infer<typeof AuditGetRecentEventsInputSchema>,
  AuditGetRecentEventsOutput
> = {
  name: 'audit.getRecentEvents',
  descriptionKey: 'ai.tools.audit.getRecentEvents.description',
  requiredPermission: 'audit:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 10,
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      severity: { type: 'string', enum: ['info', 'notice', 'warning', 'critical'] },
      since: { type: 'string', format: 'date-time' },
      limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
            code: { type: 'string' },
            result: { type: 'string' },
            resourceType: { type: 'string', nullable: true },
            resourceId: { type: 'string', nullable: true },
            occurredAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      total: { type: 'integer' },
    },
  },
  inputZod: AuditGetRecentEventsInputSchema,
  async execute(input, ctx): Promise<ToolResult<AuditGetRecentEventsOutput>> {
    try {
      // Defense-in-depth: re-check the role inside `execute` even though
      // `isToolAuthorized` already enforces `audit:read`.
      if (!ctx.roles.some((r) => ['admin', 'compliance-officer', 'auditor'].includes(r))) {
        return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
      }

      const where: Record<string, unknown> = { tenantId: ctx.tenantId };
      if (input.category) where.category = input.category;
      if (input.severity) where.severity = input.severity;
      if (input.since) where.occurredAt = { gte: new Date(input.since) };

      const [rows, total] = await Promise.all([
        ctx.prisma.auditEvent.findMany({
          where: where as never,
          orderBy: { occurredAt: 'desc' },
          take: input.limit,
          select: {
            id: true,
            category: true,
            code: true,
            result: true,
            resourceType: true,
            resourceId: true,
            occurredAt: true,
          },
        }),
        ctx.prisma.auditEvent.count({ where: where as never }),
      ]);

      return {
        ok: true,
        output: {
          events: rows.map((r) => ({
            id: r.id,
            category: r.category,
            code: r.code,
            result: r.result,
            resourceType: r.resourceType,
            resourceId: r.resourceId,
            occurredAt: r.occurredAt.toISOString(),
          })),
          total,
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `audit.getRecentEvents:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
