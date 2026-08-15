/**
 * AI tool: `workflows.getPendingApprovals` (spec §11.5).
 *
 * Returns approvals pending action by the current user (or, if `forUserId`
 * is omitted, the calling user). Tenant-scoped.
 */

import type { z } from 'zod';
import { WorkflowsGetPendingApprovalsInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface WorkflowsGetPendingApprovalsOutput {
  readonly approvals: ReadonlyArray<{
    readonly approvalId: string;
    readonly workflowInstanceId: string;
    readonly stepLabelKey: string | null;
    readonly dueAt: string | null;
    readonly requestedAt: string;
  }>;
}

export const workflowsPendingApprovalsTool: ToolDefinition<
  z.infer<typeof WorkflowsGetPendingApprovalsInputSchema>,
  WorkflowsGetPendingApprovalsOutput
> = {
  name: 'workflows.getPendingApprovals',
  descriptionKey: 'ai.tools.workflows.getPendingApprovals.description',
  requiredPermission: 'workflows:read',
  requiredLicenseModule: 'bpmn',
  mutates: false,
  rateLimitPerMinute: 20,
  inputSchema: {
    type: 'object',
    properties: {
      forUserId: { type: 'string', format: 'uuid', nullable: true },
      limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      approvals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            approvalId: { type: 'string', format: 'uuid' },
            workflowInstanceId: { type: 'string', format: 'uuid' },
            stepLabelKey: { type: 'string', nullable: true },
            dueAt: { type: 'string', format: 'date-time', nullable: true },
            requestedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  inputZod: WorkflowsGetPendingApprovalsInputSchema,
  async execute(input, ctx): Promise<ToolResult<WorkflowsGetPendingApprovalsOutput>> {
    try {
      // If `forUserId` is provided, only admins can query on behalf of
      // another user.
      const targetUserId = input.forUserId ?? ctx.userId;
      if (input.forUserId && input.forUserId !== ctx.userId && !ctx.roles.includes('admin')) {
        return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
      }

      const rows = await ctx.prisma.approval.findMany({
        where: {
          tenantId: ctx.tenantId,
          assigneeUserId: targetUserId,
          decision: 'PENDING' as never,
        },
        orderBy: { createdAt: 'asc' },
        take: input.limit,
        select: {
          id: true,
          workflowInstanceId: true,
          stepLabelKey: true,
          dueAt: true,
          createdAt: true,
        },
      });

      return {
        ok: true,
        output: {
          approvals: rows.map((r) => ({
            approvalId: r.id,
            workflowInstanceId: r.workflowInstanceId,
            stepLabelKey: (r as { stepLabelKey?: string | null }).stepLabelKey ?? null,
            dueAt: (r as { dueAt?: Date | null }).dueAt?.toISOString() ?? null,
            requestedAt: r.createdAt.toISOString(),
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
        reason: `workflows.getPendingApprovals:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
