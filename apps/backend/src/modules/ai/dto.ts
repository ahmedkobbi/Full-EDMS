/**
 * Smart EDMS — AI Assistant module DTOs (Zod schemas).
 *
 * These schemas are the SINGLE SOURCE OF TRUTH for runtime validation of the
 * AI Assistant REST endpoints. They compose and re-export schemas from
 * `@smart-edms/schemas` where applicable (spec §14, §15.4).
 *
 * Spec ref: §11 (AI Assistant Bubble), §11.5 (tool catalogue),
 * §11.7 (secure context envelope), §11.9 (prompt injection),
 * §11.15 (settings), §11.17 (entity schemas), §14 (API contract).
 *
 * Notes:
 *  - All `tenantId` / `userId` come from the JWT, never from the body.
 *  - All schemas use `.strict()` to reject unknown keys.
 *  - Locale is taken from `req.user.locale` if the body omits it.
 */

import { z } from 'zod';
import {
  AiModelModeSchema,
  AssistantChatRequestSchema,
  AssistantSessionIdSchema,
  ToolNameSchema,
} from '@smart-edms/schemas';

export { AssistantChatRequestSchema };
export type AssistantChatRequestBody = z.infer<typeof AssistantChatRequestSchema>;

// ---------------------------------------------------------------------------
// Pagination for `GET /v1/ai/assistant/sessions`
// ---------------------------------------------------------------------------

export const SessionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().min(1).max(1024).optional(),
    includeArchived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .strict();

export type SessionListQuery = z.infer<typeof SessionListQuerySchema>;

// ---------------------------------------------------------------------------
// Session feedback — `POST /v1/ai/assistant/sessions/:id/feedback`
// ---------------------------------------------------------------------------

export const SessionFeedbackBodySchema = z
  .object({
    messageId: z.string().uuid().optional(),
    rating: z.enum(['up', 'down']),
    /** Localized reason key (free-form text would be a privacy concern). */
    reasonKey: z.string().min(1).max(128).optional(),
    /** Optional free-text comment (sanitized; max 2 000 chars). */
    comment: z.string().min(1).max(2000).optional(),
  })
  .strict();

export type SessionFeedbackBody = z.infer<typeof SessionFeedbackBodySchema>;

// ---------------------------------------------------------------------------
// Admin — `PATCH /v1/admin/ai/settings`
// ---------------------------------------------------------------------------

export const UpdateAssistantSettingsBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    allowedRoles: z.array(z.string().min(1).max(128)).max(50).optional(),
    allowedTools: z.array(ToolNameSchema).max(16).optional(),
    externalAiAllowed: z.boolean().optional(),
    localOnlyMode: z.boolean().optional(),
    modelProvider: z.string().min(1).max(64).nullable().optional(),
    chatRetentionDays: z.number().int().min(0).max(3650).optional(),
    showCitations: z.boolean().optional(),
    allowNavigationActions: z.boolean().optional(),
    allowSuggestedActions: z.boolean().optional(),
    requireDisclaimer: z.boolean().optional(),
    rateLimitPerMinute: z.number().int().min(0).max(1000).optional(),
    usageQuotaPerDay: z.number().int().min(0).max(100000).optional(),
    privacyNotice: z.string().min(1).max(8000).nullable().optional(),
  })
  .strict();

export type UpdateAssistantSettingsBody = z.infer<typeof UpdateAssistantSettingsBodySchema>;

// ---------------------------------------------------------------------------
// Admin — `GET /v1/admin/ai/audit` query
// ---------------------------------------------------------------------------

export const AdminAuditQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    sessionId: AssistantSessionIdSchema.optional(),
    category: z.string().min(1).max(64).optional(),
    code: z.string().min(1).max(64).optional(),
    result: z.enum(['allow', 'deny']).optional(),
    since: z.string().datetime().optional(),
    until: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z.string().min(1).max(1024).optional(),
  })
  .strict();

export type AdminAuditQuery = z.infer<typeof AdminAuditQuerySchema>;

// ---------------------------------------------------------------------------
// Admin — `GET /v1/admin/ai/usage` query
// ---------------------------------------------------------------------------

export const AdminUsageQuerySchema = z
  .object({
    /** Group results by user or by day. */
    groupBy: z.enum(['user', 'day']).default('user'),
    since: z.string().datetime().optional(),
    until: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict();

export type AdminUsageQuery = z.infer<typeof AdminUsageQuerySchema>;

// ---------------------------------------------------------------------------
// Model mode resolver (used by the service to compute the model mode for
// a session based on tenant settings + AI_PROVIDER env var).
// ---------------------------------------------------------------------------

export const ResolvedModelModeSchema = AiModelModeSchema;
export type ResolvedModelMode = z.infer<typeof ResolvedModelModeSchema>;
