/**
 * AI tool: `documents.search` (spec §11.5).
 *
 * Searches documents the user is authorised to see by delegating to the
 * existing {@link SearchService}. Permission-aware filtering is applied
 * INSIDE SearchService — inaccessible documents are excluded BEFORE
 * pagination so totals and cursors never reveal their existence (spec §9.10
 * critical rule).
 *
 * Output: a narrow summary of each hit (id, title, snippet, classification
 * label id, updated-at). Raw row payloads are never returned to the model.
 */

import type { z } from 'zod';
import type { Citation } from '@smart-edms/types';
import { DocumentsSearchToolInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog';

interface DocumentsSearchOutput {
  readonly total: number;
  readonly hits: ReadonlyArray<{
    readonly documentId: string;
    readonly title: string;
    readonly snippet: string;
    readonly classificationLabelId: string | null;
    readonly updatedAt: string;
  }>;
  readonly tookMs: number;
}

export const documentsSearchTool: ToolDefinition<
  z.infer<typeof DocumentsSearchToolInputSchema>,
  DocumentsSearchOutput
> = {
  name: 'documents.search',
  descriptionKey: 'ai.tools.documents.search.description',
  requiredPermission: 'documents:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 30,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1, maxLength: 2048 },
      folderId: { type: 'string', format: 'uuid', nullable: true },
      classificationLabelIds: { type: 'array', items: { type: 'string', format: 'uuid' }, maxItems: 20 },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      includeOcr: { type: 'boolean', default: false },
    },
    required: ['query'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      hits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            snippet: { type: 'string' },
            classificationLabelId: { type: 'string', format: 'uuid', nullable: true },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      tookMs: { type: 'integer' },
    },
  },
  inputZod: DocumentsSearchToolInputSchema,
  async execute(input, ctx): Promise<ToolResult<DocumentsSearchOutput>> {
    try {
      const result = await ctx.search.search({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        userRoles: ctx.roles,
        text: input.query,
        limit: input.limit,
      });

      // Narrow the hits to a minimal summary. We DO NOT include storage keys,
      // checksums, owner email, or any field the model does not need.
      const hits = result.hits.slice(0, input.limit).map((h) => ({
        documentId: h.documentId,
        title: h.title,
        snippet: h.snippet,
        classificationLabelId: h.classificationId,
        updatedAt: h.updatedAt,
      }));

      // Citations are derived from the top hits — the AI service persists
      // them on the assistant message.
      const citations: Citation[] = result.hits.slice(0, 5).map((h) => ({
        documentId: h.documentId as Citation['documentId'],
        versionId: null,
        title: h.title,
        classificationLabelId: (h.classificationId ?? '00000000-0000-0000-0000-000000000000') as Citation['classificationLabelId'],
        updatedAt: h.updatedAt as Citation['updatedAt'],
        workflowState: null,
        retentionState: null,
        legalHoldState: 'none',
        locator: { page: 1, snippet: h.snippet.slice(0, 200) },
        confidence: 0.7 as Citation['confidence'],
      }));

      return {
        ok: true,
        output: { total: result.total, hits, tookMs: result.tookMs },
        citations,
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `documents.search:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
