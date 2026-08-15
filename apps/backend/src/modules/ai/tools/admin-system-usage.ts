/**
 * AI tool: `admin.getSystemUsage` (spec §11.5).
 *
 * Returns coarse platform usage metrics: document count, user count,
 * storage bytes (sum). Admin-only. NEVER returns per-user PII.
 */

import type { z } from 'zod';
import { AdminGetSystemUsageInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface AdminGetSystemUsageOutput {
  readonly documents: { readonly total: number; readonly active: number; readonly deleted: number };
  readonly users: { readonly total: number };
  readonly storageBytes: string;
  readonly assistantSessions: { readonly total: number; readonly last24h: number };
  readonly checkedAt: string;
}

export const adminSystemUsageTool: ToolDefinition<
  z.infer<typeof AdminGetSystemUsageInputSchema>,
  AdminGetSystemUsageOutput
> = {
  name: 'admin.getSystemUsage',
  descriptionKey: 'ai.tools.admin.getSystemUsage.description',
  requiredPermission: 'admin:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 5,
  inputSchema: {
    type: 'object',
    properties: {
      includeStorage: { type: 'boolean', default: true },
      includeUsers: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      documents: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          active: { type: 'integer' },
          deleted: { type: 'integer' },
        },
      },
      users: { type: 'object', properties: { total: { type: 'integer' } } },
      storageBytes: { type: 'string' },
      assistantSessions: {
        type: 'object',
        properties: { total: { type: 'integer' }, last24h: { type: 'integer' } },
      },
      checkedAt: { type: 'string', format: 'date-time' },
    },
  },
  inputZod: AdminGetSystemUsageInputSchema,
  async execute(input, ctx): Promise<ToolResult<AdminGetSystemUsageOutput>> {
    if (!ctx.roles.includes('admin')) {
      return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
    }

    try {
      const [totalDocs, activeDocs, deletedDocs, totalUsers, totalSessions, recentSessions, storageAgg] =
        await Promise.all([
          ctx.prisma.document.count({ where: { tenantId: ctx.tenantId } }),
          ctx.prisma.document.count({ where: { tenantId: ctx.tenantId, deletedAt: null } }),
          ctx.prisma.document.count({ where: { tenantId: ctx.tenantId, NOT: { deletedAt: null } } }),
          input.includeUsers
            ? ctx.prisma.user.count({ where: { tenantId: ctx.tenantId } })
            : Promise.resolve(0),
          ctx.prisma.assistantSession.count({ where: { tenantId: ctx.tenantId } }),
          ctx.prisma.assistantSession.count({
            where: {
              tenantId: ctx.tenantId,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          }),
          input.includeStorage
            ? ctx.prisma.document.aggregate({
                where: { tenantId: ctx.tenantId },
                _sum: { sizeBytes: true },
              })
            : Promise.resolve({ _sum: { sizeBytes: null } }),
        ]);

      return {
        ok: true,
        output: {
          documents: { total: totalDocs, active: activeDocs, deleted: deletedDocs },
          users: { total: totalUsers },
          storageBytes: String(storageAgg._sum.sizeBytes ?? BigInt(0)),
          assistantSessions: { total: totalSessions, last24h: recentSessions },
          checkedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `admin.getSystemUsage:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
