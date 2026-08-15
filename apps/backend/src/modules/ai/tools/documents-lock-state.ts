/**
 * AI tool: `documents.getLockState` (spec §11.5).
 *
 * Returns the current checkout / lock state of a document the user is
 * authorised to see. The locking user's email is NEVER returned — only
 * their display name.
 */

import type { z } from 'zod';
import { DocumentsGetLockStateInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface DocumentsGetLockStateOutput {
  readonly documentId: string;
  readonly isLocked: boolean;
  readonly lockedBy: { readonly userId: string; readonly displayName: string } | null;
  readonly lockedAt: string | null;
}

export const documentsGetLockStateTool: ToolDefinition<
  z.infer<typeof DocumentsGetLockStateInputSchema>,
  DocumentsGetLockStateOutput
> = {
  name: 'documents.getLockState',
  descriptionKey: 'ai.tools.documents.getLockState.description',
  requiredPermission: 'documents:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 30,
  inputSchema: {
    type: 'object',
    properties: { documentId: { type: 'string', format: 'uuid' } },
    required: ['documentId'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      isLocked: { type: 'boolean' },
      lockedBy: {
        type: 'object',
        properties: { userId: { type: 'string' }, displayName: { type: 'string' } },
        nullable: true,
      },
      lockedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  inputZod: DocumentsGetLockStateInputSchema,
  async execute(input, ctx): Promise<ToolResult<DocumentsGetLockStateOutput>> {
    try {
      const doc = await ctx.prisma.document.findFirst({
        where: { id: input.documentId, tenantId: ctx.tenantId, deletedAt: null },
        select: {
          id: true,
          sensitivityLevel: true,
          lockedByUserId: true,
          lockedAt: true,
          lockedByUser: { select: { id: true, firstName: true, lastName: true } },
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

      const isLocked = !!doc.lockedByUserId;
      const lockedBy = isLocked && doc.lockedByUser
        ? {
            userId: doc.lockedByUser.id,
            displayName: `${doc.lockedByUser.firstName ?? ''} ${doc.lockedByUser.lastName ?? ''}`.trim() || '(unknown)',
          }
        : null;

      return {
        ok: true,
        output: {
          documentId: doc.id,
          isLocked,
          lockedBy,
          lockedAt: doc.lockedAt?.toISOString() ?? null,
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `documents.getLockState:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
