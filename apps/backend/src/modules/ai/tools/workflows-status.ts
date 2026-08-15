/**
 * AI tool: `workflows.getStatus` (spec §11.5).
 *
 * Returns the current status of one workflow instance (by id) OR the most
 * recent workflow instances associated with a document. Tenant-scoped.
 */

import type { z } from 'zod';
import { WorkflowsGetStatusInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog';

interface WorkflowsGetStatusOutput {
  readonly instances: ReadonlyArray<{
    readonly instanceId: string;
    readonly status: string;
    readonly startedAt: string;
    readonly dueAt: string | null;
    readonly completedAt: string | null;
    readonly definitionNameKey: string | null;
  }>;
}

export const workflowsStatusTool: ToolDefinition<
  z.infer<typeof WorkflowsGetStatusInputSchema>,
  WorkflowsGetStatusOutput
> = {
  name: 'workflows.getStatus',
  descriptionKey: 'ai.tools.workflows.getStatus.description',
  requiredPermission: 'workflows:read',
  requiredLicenseModule: 'bpmn',
  mutates: false,
  rateLimitPerMinute: 20,
  inputSchema: {
    type: 'object',
    properties: {
      workflowInstanceId: { type: 'string', format: 'uuid', nullable: true },
      documentId: { type: 'string', format: 'uuid', nullable: true },
      limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      instances: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            instanceId: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            startedAt: { type: 'string', format: 'date-time' },
            dueAt: { type: 'string', format: 'date-time', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            definitionNameKey: { type: 'string', nullable: true },
          },
        },
      },
    },
  },
  inputZod: WorkflowsGetStatusInputSchema,
  async execute(input, ctx): Promise<ToolResult<WorkflowsGetStatusOutput>> {
    try {
      if (!input.workflowInstanceId && !input.documentId) {
        return {
          ok: false,
          reasonKey: 'errors.VALIDATION_FAILED',
          status: 'denied',
        };
      }
      // Tenant-scoped query — never trust the IDs alone.
      const where: Record<string, unknown> = { tenantId: ctx.tenantId };
      if (input.workflowInstanceId) where.id = input.workflowInstanceId;
      if (input.documentId) where.documentId = input.documentId;

      const rows = await ctx.prisma.workflowInstance.findMany({
        where: where as never,
        orderBy: { startedAt: 'desc' },
        take: input.limit,
        select: {
          id: true,
          status: true,
          startedAt: true,
          dueAt: true,
          completedAt: true,
          definition: { select: { code: true, name: true } },
        },
      });

      return {
        ok: true,
        output: {
          instances: rows.map((r) => ({
            instanceId: r.id,
            status: String(r.status),
            startedAt: r.startedAt.toISOString(),
            dueAt: r.dueAt?.toISOString() ?? null,
            completedAt: r.completedAt?.toISOString() ?? null,
            definitionNameKey: r.definition?.code ?? null,
          })),
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `workflows.getStatus:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
