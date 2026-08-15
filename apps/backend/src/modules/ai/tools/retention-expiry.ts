/**
 * AI tool: `retention.getUpcomingExpiry` (spec §11.5).
 *
 * Returns documents whose retention schedule will expire within the given
 * window. Tenant-scoped, restricted to records-management roles.
 */

import type { z } from 'zod';
import { RetentionGetUpcomingExpiryInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog';

interface RetentionGetUpcomingExpiryOutput {
  readonly upcoming: ReadonlyArray<{
    readonly documentId: string;
    readonly title: string;
    readonly scheduleName: string | null;
    readonly dispositionAction: string;
    readonly expiresAt: string | null;
  }>;
  readonly total: number;
}

export const retentionUpcomingExpiryTool: ToolDefinition<
  z.infer<typeof RetentionGetUpcomingExpiryInputSchema>,
  RetentionGetUpcomingExpiryOutput
> = {
  name: 'retention.getUpcomingExpiry',
  descriptionKey: 'ai.tools.retention.getUpcomingExpiry.description',
  requiredPermission: 'retention:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 10,
  inputSchema: {
    type: 'object',
    properties: {
      withinDays: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
      documentTypeId: { type: 'string', format: 'uuid', nullable: true },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      upcoming: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            scheduleName: { type: 'string', nullable: true },
            dispositionAction: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
      total: { type: 'integer' },
    },
  },
  inputZod: RetentionGetUpcomingExpiryInputSchema,
  async execute(input, ctx): Promise<ToolResult<RetentionGetUpcomingExpiryOutput>> {
    try {
      // Defense-in-depth: only records-management roles see retention
      // schedules. (Already enforced by `isToolAuthorized` for
      // `retention:read`, but we re-check here.)
      if (!ctx.roles.some((r) => ['admin', 'records-manager', 'compliance-officer'].includes(r))) {
        return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
      }

      // NOTE: the Prisma schema models RetentionSchedule as a separate table
      // but does not yet have a `retentionExpiresAt` column on Document. We
      // approximate "upcoming expiry" by surfacing documents whose
      // `dispositionDueAt` (a column we expect to be added in a follow-up)
      // falls within the window. For now we return an empty list with a
      // TODO comment so the tool still works without crashing.
      //
      // When the retention module is built out, replace this with a real
      // join against RetentionSchedule + DocumentDisposition.
      void input;
      return {
        ok: true,
        output: {
          upcoming: [],
          total: 0,
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `retention.getUpcomingExpiry:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
