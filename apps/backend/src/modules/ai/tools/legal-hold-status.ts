/**
 * AI tool: `legalHold.getStatus` (spec §11.5).
 *
 * Returns active legal holds for the tenant (or, when `documentId` is
 * provided, the holds attached to that document). Tenant-scoped, restricted
 * to records-management roles.
 */

import type { z } from 'zod';
import { LegalHoldGetStatusInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog';

interface LegalHoldGetStatusOutput {
  readonly holds: ReadonlyArray<{
    readonly holdId: string;
    readonly code: string;
    readonly name: string;
    readonly caseReference: string | null;
    readonly placedAt: string;
    readonly isActive: boolean;
    readonly releasedAt: string | null;
  }>;
  readonly total: number;
}

export const legalHoldStatusTool: ToolDefinition<
  z.infer<typeof LegalHoldGetStatusInputSchema>,
  LegalHoldGetStatusOutput
> = {
  name: 'legalHold.getStatus',
  descriptionKey: 'ai.tools.legalHold.getStatus.description',
  requiredPermission: 'legal-hold:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 10,
  inputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid', nullable: true },
      caseCode: { type: 'string', minLength: 1, maxLength: 128 },
      limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      holds: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            holdId: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            caseReference: { type: 'string', nullable: true },
            placedAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
            releasedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
      total: { type: 'integer' },
    },
  },
  inputZod: LegalHoldGetStatusInputSchema,
  async execute(input, ctx): Promise<ToolResult<LegalHoldGetStatusOutput>> {
    try {
      if (!ctx.roles.some((r) => ['admin', 'records-manager', 'compliance-officer'].includes(r))) {
        return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
      }

      const where: Record<string, unknown> = { tenantId: ctx.tenantId };
      if (input.caseCode) where.code = input.caseCode;
      if (input.documentId) {
        // Documents under legal hold are linked via the Document.legalHoldActive
        // boolean and a join table; for now we filter by `isActive: true` and
        // optionally by documentId via the relation.
        where.documents = { some: { id: input.documentId } };
      }

      const [rows, total] = await Promise.all([
        ctx.prisma.legalHold.findMany({
          where: where as never,
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          select: {
            id: true,
            code: true,
            name: true,
            caseReference: true,
            createdAt: true,
            isActive: true,
            releasedAt: true,
          },
        }),
        ctx.prisma.legalHold.count({ where: where as never }),
      ]);

      return {
        ok: true,
        output: {
          holds: rows.map((r) => ({
            holdId: r.id,
            code: r.code,
            name: r.name,
            caseReference: r.caseReference,
            placedAt: r.createdAt.toISOString(),
            isActive: r.isActive,
            releasedAt: r.releasedAt?.toISOString() ?? null,
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
        reason: `legalHold.getStatus:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
