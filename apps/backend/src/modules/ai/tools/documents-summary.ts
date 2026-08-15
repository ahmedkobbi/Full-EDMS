/**
 * AI tool: `documents.getSummary` (spec §11.5).
 *
 * Returns a short summary of a document the user is authorised to see.
 * The summary is derived from the document's title + description +
 * classification — NEVER from the raw file content (which would require
 * running an extractor and could leak prompt-injection payloads from the
 * document body).
 *
 * CRITICAL: the AI must NOT receive the raw document bytes. This tool is
 * the only sanctioned way for the AI to "see" a document, and even then
 * only its metadata.
 */

import type { z } from 'zod';
import type { Citation } from '@smart-edms/types';
import { DocumentsGetSummaryInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface DocumentsGetSummaryOutput {
  readonly documentId: string;
  readonly title: string;
  readonly summary: string;
  readonly classificationLabel: string | null;
  readonly sensitivityLevel: number;
  readonly documentType: string | null;
  readonly updatedAt: string;
  readonly versionNumber: number;
  readonly legalHoldActive: boolean;
}

export const documentsSummaryTool: ToolDefinition<
  z.infer<typeof DocumentsGetSummaryInputSchema>,
  DocumentsGetSummaryOutput
> = {
  name: 'documents.getSummary',
  descriptionKey: 'ai.tools.documents.getSummary.description',
  requiredPermission: 'documents:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 30,
  inputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      versionId: { type: 'string', format: 'uuid', nullable: true },
      maxLength: { type: 'integer', minimum: 50, maximum: 4000, default: 500 },
    },
    required: ['documentId'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      summary: { type: 'string' },
      classificationLabel: { type: 'string', nullable: true },
      sensitivityLevel: { type: 'integer' },
      documentType: { type: 'string', nullable: true },
      updatedAt: { type: 'string', format: 'date-time' },
      versionNumber: { type: 'integer' },
      legalHoldActive: { type: 'boolean' },
    },
  },
  inputZod: DocumentsGetSummaryInputSchema,
  async execute(input, ctx): Promise<ToolResult<DocumentsGetSummaryOutput>> {
    try {
      // Tenant-scoped fetch — never trust the documentId alone.
      const doc = await ctx.prisma.document.findFirst({
        where: { id: input.documentId, tenantId: ctx.tenantId, deletedAt: null },
        select: {
          id: true,
          title: true,
          description: true,
          documentType: true,
          sensitivityLevel: true,
          updatedAt: true,
          legalHoldActive: true,
          classification: { select: { id: true, code: true, nameKey: true, sensitivityLevel: true } },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            select: { versionNumber: true },
          },
        },
      });
      if (!doc) {
        // Don't reveal existence — return a generic denial.
        return { ok: false, reasonKey: 'errors.NOT_FOUND', status: 'denied' };
      }

      // Permission check — non-elevated users cannot see sensitivity > 3 or
      // legal-hold docs. (Mirrors SearchService.)
      const elevated = ctx.roles.some((r) =>
        ['admin', 'records-manager', 'compliance-officer'].includes(r),
      );
      if (!elevated && doc.sensitivityLevel > 3) {
        return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
      }
      if (!elevated && doc.legalHoldActive && !ctx.roles.includes('records-manager')) {
        return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
      }

      // Build the summary from title + description only.
      const desc = (doc.description ?? '').trim();
      const summary = desc
        ? desc.length > input.maxLength
          ? `${desc.slice(0, input.maxLength - 1)}…`
          : desc
        : doc.title;

      const citation: Citation = {
        documentId: doc.id as Citation['documentId'],
        versionId: null,
        title: doc.title,
        classificationLabelId: doc.classification?.id ?? ('00000000-0000-0000-0000-000000000000' as Citation['classificationLabelId']),
        updatedAt: doc.updatedAt.toISOString() as Citation['updatedAt'],
        workflowState: null,
        retentionState: null,
        legalHoldState: doc.legalHoldActive ? 'active' : 'none',
        locator: null,
        confidence: 0.9 as Citation['confidence'],
      };

      return {
        ok: true,
        output: {
          documentId: doc.id,
          title: doc.title,
          summary,
          classificationLabel: doc.classification?.nameKey ?? doc.classification?.code ?? null,
          sensitivityLevel: doc.sensitivityLevel,
          documentType: doc.documentType,
          updatedAt: doc.updatedAt.toISOString(),
          versionNumber: doc.versions[0]?.versionNumber ?? 1,
          legalHoldActive: doc.legalHoldActive,
        },
        citations: [citation],
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `documents.getSummary:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
