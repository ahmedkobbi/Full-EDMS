/**
 * AI tool: `documents.getVersions` (spec §11.5).
 *
 * Returns the immutable version history of a document the user is
 * authorised to see. Storage keys, checksums, and full original filenames
 * are NEVER returned to the model — only `versionNumber`, `sizeBytes`,
 * `mime`, and `createdAt`.
 */

import type { z } from 'zod';
import { DocumentsGetVersionsInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog';

interface DocumentsGetVersionsOutput {
  readonly documentId: string;
  readonly versions: ReadonlyArray<{
    readonly versionId: string;
    readonly versionNumber: number;
    readonly sizeBytes: string;
    readonly mime: string;
    readonly createdAt: string;
  }>;
}

export const documentsGetVersionsTool: ToolDefinition<
  z.infer<typeof DocumentsGetVersionsInputSchema>,
  DocumentsGetVersionsOutput
> = {
  name: 'documents.getVersions',
  descriptionKey: 'ai.tools.documents.getVersions.description',
  requiredPermission: 'documents:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 30,
  inputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    },
    required: ['documentId'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      versions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            versionId: { type: 'string', format: 'uuid' },
            versionNumber: { type: 'integer' },
            sizeBytes: { type: 'string' },
            mime: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  inputZod: DocumentsGetVersionsInputSchema,
  async execute(input, ctx): Promise<ToolResult<DocumentsGetVersionsOutput>> {
    try {
      // Tenant-scoped existence check.
      const doc = await ctx.prisma.document.findFirst({
        where: { id: input.documentId, tenantId: ctx.tenantId, deletedAt: null },
        select: {
          id: true,
          sensitivityLevel: true,
          legalHoldActive: true,
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: input.limit,
            select: {
              id: true,
              versionNumber: true,
              sizeBytes: true,
              mime: true,
              createdAt: true,
            },
          },
        },
      });
      if (!doc) {
        return { ok: false, reasonKey: 'errors.NOT_FOUND', status: 'denied' };
      }
      const elevated = ctx.roles.some((r) =>
        ['admin', 'records-manager', 'compliance-officer'].includes(r),
      );
      if (!elevated && doc.sensitivityLevel > 3) {
        return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
      }

      return {
        ok: true,
        output: {
          documentId: doc.id,
          versions: doc.versions.map((v) => ({
            versionId: v.id,
            versionNumber: v.versionNumber,
            sizeBytes: v.sizeBytes.toString(),
            mime: v.mime,
            createdAt: v.createdAt.toISOString(),
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
        reason: `documents.getVersions:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
