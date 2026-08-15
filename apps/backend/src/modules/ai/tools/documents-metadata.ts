/**
 * AI tool: `documents.getMetadata` (spec §11.5).
 *
 * Returns the metadata-field/value pairs attached to a document the user
 * is authorised to see. Values are projected to a narrow summary: scalar
 * fields only — file blobs, hashes, signatures are NOT included.
 */

import type { z } from 'zod';
import { DocumentsGetMetadataInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog';

interface DocumentsGetMetadataOutput {
  readonly documentId: string;
  readonly title: string;
  readonly documentType: string | null;
  readonly classificationLabelId: string | null;
  readonly sensitivityLevel: number;
  readonly metadata: ReadonlyArray<{
    readonly field: string;
    readonly value: string;
  }>;
}

export const documentsGetMetadataTool: ToolDefinition<
  z.infer<typeof DocumentsGetMetadataInputSchema>,
  DocumentsGetMetadataOutput
> = {
  name: 'documents.getMetadata',
  descriptionKey: 'ai.tools.documents.getMetadata.description',
  requiredPermission: 'documents:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 30,
  inputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      versionId: { type: 'string', format: 'uuid', nullable: true },
    },
    required: ['documentId'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      documentType: { type: 'string', nullable: true },
      classificationLabelId: { type: 'string', format: 'uuid', nullable: true },
      sensitivityLevel: { type: 'integer' },
      metadata: {
        type: 'array',
        items: {
          type: 'object',
          properties: { field: { type: 'string' }, value: { type: 'string' } },
        },
      },
    },
  },
  inputZod: DocumentsGetMetadataInputSchema,
  async execute(input, ctx): Promise<ToolResult<DocumentsGetMetadataOutput>> {
    try {
      const doc = await ctx.prisma.document.findFirst({
        where: { id: input.documentId, tenantId: ctx.tenantId, deletedAt: null },
        select: {
          id: true,
          title: true,
          documentType: true,
          classificationId: true,
          sensitivityLevel: true,
          sourceSystem: true,
          contentLanguage: true,
          textDirection: true,
          createdAt: true,
          updatedAt: true,
          legalHoldActive: true,
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

      // Project selected columns to a flat metadata array. We do not pull
      // the full MetadataValue graph here — that requires the metadata
      // schema module which is not yet wired up.
      const metadata: Array<{ field: string; value: string }> = [
        { field: 'documentType', value: doc.documentType ?? '(none)' },
        { field: 'classificationLabelId', value: doc.classificationId ?? '(none)' },
        { field: 'sensitivityLevel', value: String(doc.sensitivityLevel) },
        { field: 'sourceSystem', value: doc.sourceSystem ?? '(unknown)' },
        { field: 'contentLanguage', value: doc.contentLanguage ?? 'en' },
        { field: 'textDirection', value: doc.textDirection ?? 'auto' },
        { field: 'legalHoldActive', value: String(doc.legalHoldActive) },
        { field: 'createdAt', value: doc.createdAt.toISOString() },
        { field: 'updatedAt', value: doc.updatedAt.toISOString() },
      ];

      return {
        ok: true,
        output: {
          documentId: doc.id,
          title: doc.title,
          documentType: doc.documentType,
          classificationLabelId: doc.classificationId,
          sensitivityLevel: doc.sensitivityLevel,
          metadata,
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `documents.getMetadata:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
