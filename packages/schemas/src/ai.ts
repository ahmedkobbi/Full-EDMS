/**
 * @smart-edms/schemas — AI Assistant Bubble (spec §11, §11.17)
 *
 * CRITICAL FILE — Zod schemas for the AI Assistant chat request/response,
 * tool invocations, all tool input schemas (§11.5 whitelist), the secure
 * AI context envelope (§11.7), assistant settings (§11.15), and prompt
 * injection detection (§11.9).
 *
 * Critical rules (spec §11.1, §11.4, §11.5, §11.9, §11.10):
 *  - The AI acts on behalf of the authenticated user; never as a superuser.
 *  - Read-only by default. Sensitive actions require explicit confirmation;
 *    destructive actions require a dedicated confirmed UI flow.
 *  - Document content is untrusted data; prompt-injection protections apply.
 *  - Data minimization: only retrieve the minimum data necessary.
 */

import { z } from 'zod';
import type {
  AssistantActionId,
  AssistantActionTargetType,
  AssistantAuditEventId,
  AssistantMessageId,
  AssistantSessionId,
  AssistantToolInvocationId,
} from '@smart-edms/types';
import {
  ConfidenceScoreSchema,
  IsoDateStringSchema,
  LocaleSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { DocumentIdSchema } from './document';
import { EntitlementModuleSchema } from './license';
import { TourDefinitionIdSchema } from './tour';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const AssistantSessionIdSchema = UuidSchema.transform(
  (v): AssistantSessionId => v as AssistantSessionId,
);
export const AssistantMessageIdSchema = UuidSchema.transform(
  (v): AssistantMessageId => v as AssistantMessageId,
);
export const AssistantToolInvocationIdSchema = UuidSchema.transform(
  (v): AssistantToolInvocationId => v as AssistantToolInvocationId,
);
export const AssistantActionIdSchema = UuidSchema.transform(
  (v): AssistantActionId => v as AssistantActionId,
);
export const AssistantAuditEventIdSchema = UuidSchema.transform(
  (v): AssistantAuditEventId => v as AssistantAuditEventId,
);

// ---------------------------------------------------------------------------
// Enums (spec §11.5, §11.11, §11.17)
// ---------------------------------------------------------------------------

/** `z.infer` === `AiModelMode` (§11.11). */
export const AiModelModeSchema = z.enum(['external', 'local', 'hybrid']);

/** `z.infer` === `AssistantSessionStatus`. */
export const AssistantSessionStatusSchema = z.enum([
  'active',
  'idle',
  'cleared',
  'archived',
]);

/** `z.infer` === `AssistantMessageRole`. */
export const AssistantMessageRoleSchema = z.enum([
  'user',
  'assistant',
  'system',
  'tool',
]);

/** `z.infer` === `AssistantToolInvocationStatus`. */
export const AssistantToolInvocationStatusSchema = z.enum([
  'pending',
  'authorized',
  'denied',
  'running',
  'succeeded',
  'failed',
  'timeout',
]);

/** `z.infer` === `AssistantActionStatus`. */
export const AssistantActionStatusSchema = z.enum([
  'suggested',
  'confirmed',
  'executing',
  'succeeded',
  'failed',
  'denied',
  'expired',
]);

/** `z.infer` === `ToolName` (§11.5 whitelist). */
export const ToolNameSchema = z.enum([
  'documents.search',
  'documents.getSummary',
  'documents.getMetadata',
  'documents.getVersions',
  'documents.getLockState',
  'workflows.getStatus',
  'workflows.getPendingApprovals',
  'audit.getRecentEvents',
  'retention.getUpcomingExpiry',
  'legalHold.getStatus',
  'license.getStatus',
  'help.searchDocumentation',
  'ui.navigateTo',
  'tour.start',
  'admin.getHealth',
  'admin.getSystemUsage',
]);

/** `z.infer` === `AssistantActionType`. */
export const AssistantActionTypeSchema = z.enum([
  'create_share_link',
  'start_workflow',
  'request_approval',
  'export_evidence',
  'generate_report',
  'modify_metadata',
  'navigate',
  'import_license',
  'contact_support',
  'launch_tour',
]);

/** `z.infer` === `AssistantActionTargetType`. */
export const AssistantActionTargetTypeSchema: z.ZodType<AssistantActionTargetType> = z.enum([
  'document',
  'workflow',
  'share_link',
  'retention_schedule',
  'legal_hold',
  'audit_event',
  'license',
  'tour',
  'admin_page',
  'external_url',
]);

// ---------------------------------------------------------------------------
// Tool input schemas (spec §11.5)
// ---------------------------------------------------------------------------

/** Input schema for `documents.search` tool. */
export const DocumentsSearchToolInputSchema = z
  .object({
    query: z.string().min(1).max(2048),
    folderId: UuidSchema.nullable().optional(),
    classificationLabelIds: z.array(UuidSchema).max(20).optional(),
    limit: z.number().int().min(1).max(50).default(10),
    includeOcr: z.boolean().default(false),
  })
  .strict();

/** Input schema for `documents.getSummary` tool. */
export const DocumentsGetSummaryInputSchema = z
  .object({
    documentId: DocumentIdSchema,
    versionId: UuidSchema.nullable().optional(),
    maxLength: z.number().int().min(50).max(4000).default(500),
  })
  .strict();

/** Input schema for `documents.getMetadata` tool. */
export const DocumentsGetMetadataInputSchema = z
  .object({
    documentId: DocumentIdSchema,
    versionId: UuidSchema.nullable().optional(),
  })
  .strict();

/** Input schema for `documents.getVersions` tool. */
export const DocumentsGetVersionsInputSchema = z
  .object({
    documentId: DocumentIdSchema,
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();

/** Input schema for `documents.getLockState` tool. */
export const DocumentsGetLockStateInputSchema = z
  .object({
    documentId: DocumentIdSchema,
  })
  .strict();

/** Input schema for `workflows.getStatus` tool. */
export const WorkflowsGetStatusInputSchema = z
  .object({
    workflowInstanceId: UuidSchema.nullable().optional(),
    documentId: DocumentIdSchema.nullable().optional(),
    limit: z.number().int().min(1).max(20).default(5),
  })
  .strict();

/** Input schema for `workflows.getPendingApprovals` tool. */
export const WorkflowsGetPendingApprovalsInputSchema = z
  .object({
    forUserId: UserIdSchema.nullable().optional(),
    limit: z.number().int().min(1).max(20).default(10),
  })
  .strict();

/** Input schema for `audit.getRecentEvents` tool. */
export const AuditGetRecentEventsInputSchema = z
  .object({
    category: z
      .enum([
        'authentication',
        'authorization',
        'access',
        'create',
        'read',
        'update',
        'delete',
        'download',
        'preview',
        'redaction',
        'export',
        'sharing',
        'workflow',
        'admin',
        'locale',
        'license',
        'tour',
        'ai_assistant',
        'security',
        'retention',
        'legal_hold',
        'classification',
        'scanner',
        'provenance',
      ])
      .optional(),
    severity: z.enum(['info', 'notice', 'warning', 'critical']).optional(),
    since: IsoDateStringSchema.optional(),
    limit: z.number().int().min(1).max(20).default(10),
  })
  .strict();

/** Input schema for `retention.getUpcomingExpiry` tool. */
export const RetentionGetUpcomingExpiryInputSchema = z
  .object({
    withinDays: z.number().int().min(1).max(365).default(30),
    documentTypeId: UuidSchema.nullable().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .strict();

/** Input schema for `legalHold.getStatus` tool. */
export const LegalHoldGetStatusInputSchema = z
  .object({
    documentId: DocumentIdSchema.nullable().optional(),
    caseCode: z.string().min(1).max(128).optional(),
    limit: z.number().int().min(1).max(20).default(10),
  })
  .strict();

/** Input schema for `license.getStatus` tool. */
export const LicenseGetStatusInputSchema = z
  .object({
    includeEntitlements: z.boolean().default(true),
    includeUsage: z.boolean().default(false),
  })
  .strict();

/** Input schema for `help.searchDocumentation` tool. */
export const HelpSearchDocumentationInputSchema = z
  .object({
    query: z.string().min(1).max(512),
    locale: LocaleSchema.optional(),
    limit: z.number().int().min(1).max(10).default(5),
  })
  .strict();

/** Input schema for `ui.navigateTo` tool. */
export const UiNavigateToInputSchema = z
  .object({
    route: z.string().min(1).max(256),
    // Optional query parameters.
    params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .strict();

/** Input schema for `tour.start` tool. */
export const TourStartInputSchema = z
  .object({
    tourCode: z.enum([
      'welcome',
      'documents',
      'search',
      'records_manager',
      'security_officer',
      'auditor',
      'administrator',
      'workflow_designer',
      'scanner',
      'license',
      'realtime_collaboration',
      'ai_assistant',
      'empty_state_learning',
      'marketing_public',
    ]),
  })
  .strict();

/** Input schema for `admin.getHealth` tool. */
export const AdminGetHealthInputSchema = z
  .object({
    includeDependencies: z.boolean().default(true),
  })
  .strict();

/** Input schema for `admin.getSystemUsage` tool. */
export const AdminGetSystemUsageInputSchema = z
  .object({
    includeStorage: z.boolean().default(true),
    includeUsers: z.boolean().default(true),
  })
  .strict();

// ---------------------------------------------------------------------------
// AiContextEnvelope (spec §11.7) — CRITICAL
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof AiContextEnvelopeSchema>` MUST match `AiContextEnvelope`
 * from `@smart-edms/types`.
 *
 * Provided by the AI Gateway to the planner. Must NOT include secrets,
 * tokens, private keys, full database credentials, or unrestricted
 * permission bypass.
 */
export const AiContextEnvelopeSchema = z
  .object({
    userId: UserIdSchema,
    tenantId: TenantIdSchema,
    roles: z.array(z.string().min(1).max(128)),
    permissionsSummary: z.array(z.string().min(1).max(128)),
    locale: LocaleSchema,
    timezone: z.string().min(1).max(64),
    licensedModules: z.array(EntitlementModuleSchema),
    currentRoute: z.string().min(1).max(256),
    requestId: UuidSchema,
    theme: z.enum(['light', 'dark']),
    tourContext: z.array(
      z
        .object({
          tourId: TourDefinitionIdSchema,
          status: z.string().min(1).max(32),
        })
        .strict(),
    ),
  })
  .strict();

// ---------------------------------------------------------------------------
// AssistantSettings (spec §11.15) — CRITICAL
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof AssistantSettingsSchema>` MUST match `AssistantSettings`
 * from `@smart-edms/types`. Mirrors the per-tenant `AiFlagConfig` plus
 * runtime fields used by the AI gateway.
 */
export const AssistantSettingsSchema = z
  .object({
    tenantId: TenantIdSchema,
    enabled: z.boolean(),
    allowedRoleIds: z.array(z.string().min(1).max(128)),
    allowedTools: z.array(ToolNameSchema),
    modelMode: AiModelModeSchema,
    externalProviderId: z.string().min(1).max(128).nullable(),
    showCitations: z.boolean(),
    allowNavigationActions: z.boolean(),
    allowSuggestedActions: z.boolean(),
    requireDisclaimer: z.boolean(),
    chatRetentionDays: z.number().int().min(0).max(3650),
    dailyQuotaPerUser: z.number().int().min(0).max(100000),
    privacyNoticeKey: z.string().min(1).max(128),
    updatedAt: IsoDateStringSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// PromptInjectionDetection (spec §11.9) — CRITICAL
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof PromptInjectionDetectionSchema>` MUST match
 * `PromptInjectionDetection` from `@smart-edms/types`. Document content is
 * treated as untrusted data.
 */
export const PromptInjectionDetectionSchema = z
  .object({
    detected: z.boolean(),
    explanationKey: z.string().min(1).max(128).nullable(),
    blocked: z.boolean(),
    category: z.enum([
      'embedded_instruction',
      'secret_extraction',
      'sql_injection',
      'endpoint_abuse',
      'other',
    ]),
  })
  .strict();

// ---------------------------------------------------------------------------
// Assistant chat request / response
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/ai/assistant/chat`. */
export const AssistantChatRequestSchema = z
  .object({
    message: z.string().min(1).max(8000),
    sessionId: AssistantSessionIdSchema.optional(),
    // Optional secure context envelope (spec §11.7). When omitted the
    // gateway constructs it from the authenticated session.
    context: AiContextEnvelopeSchema.optional(),
    locale: LocaleSchema,
    // Optional client-side prompt-injection pre-check result.
    preInjectionCheck: PromptInjectionDetectionSchema.optional(),
  })
  .strict();

/** `z.infer` matches `Citation` (spec §11.8). */
export const CitationSchema = z
  .object({
    documentId: DocumentIdSchema,
    versionId: UuidSchema.nullable(),
    title: z.string().min(1).max(512),
    classificationLabelId: UuidSchema,
    updatedAt: IsoDateStringSchema,
    workflowState: z.string().min(1).max(64).nullable(),
    retentionState: z.string().min(1).max(64).nullable(),
    legalHoldState: z.enum(['active', 'none']),
    locator: z
      .object({
        page: z.number().int().min(1),
        snippet: z.string().min(0).max(2048),
      })
      .nullable(),
    confidence: ConfidenceScoreSchema.nullable(),
  })
  .strict();

/** `z.infer` matches a suggested action surfaced in the response. */
export const AssistantSuggestedActionSchema = z
  .object({
    actionId: AssistantActionIdSchema,
    actionType: AssistantActionTypeSchema,
    targetType: AssistantActionTargetTypeSchema,
    targetId: UuidSchema.nullable(),
    labelKey: z.string().min(1).max(128),
    confirmationRequired: z.boolean(),
    destructive: z.boolean(),
  })
  .strict();

/** Response body for `POST /v1/ai/assistant/chat`. */
export const AssistantChatResponseSchema = z
  .object({
    messageId: AssistantMessageIdSchema,
    sessionId: AssistantSessionIdSchema,
    content: z.string().min(0).max(16000),
    citations: z.array(CitationSchema),
    suggestedActions: z.array(AssistantSuggestedActionSchema),
    // Localised disclaimer key, always rendered alongside the response.
    disclaimerKey: z.string().min(1).max(128),
    // Optional prompt-injection detection result if the server detected
    // something suspicious in the user's input.
    injectionDetection: PromptInjectionDetectionSchema.nullable(),
    // Tool invocations performed while generating the response.
    toolInvocations: z.array(z.lazy(() => AssistantToolInvocationSchema)),
    // Model provider that produced the response.
    modelProvider: z.string().min(1).max(64),
  })
  .strict();

// ---------------------------------------------------------------------------
// AssistantToolInvocation (spec §11.17)
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof AssistantToolInvocationSchema>` matches
 * `AssistantToolInvocation` from `@smart-edms/types`.
 */
export const AssistantToolInvocationSchema = z
  .object({
    id: AssistantToolInvocationIdSchema,
    messageId: AssistantMessageIdSchema,
    sessionId: AssistantSessionIdSchema,
    tenantId: TenantIdSchema,
    toolName: ToolNameSchema,
    // Input summary; never the full input payload (spec §11.10).
    inputSummary: z.string().min(0).max(2000),
    // Output summary; never the full output payload.
    outputSummary: z.string().min(0).max(4000),
    status: AssistantToolInvocationStatusSchema,
    authorized: z.boolean(),
    denialReasonKey: z.string().min(1).max(128).nullable(),
    occurredAt: IsoDateStringSchema,
    durationMs: z.number().int().min(0),
  })
  .strict();

// ---------------------------------------------------------------------------
// Streaming chunk (spec §13.4 — `ai.response.chunk`)
// ---------------------------------------------------------------------------

/** `z.infer` matches `AiResponseChunk`. */
export const AiResponseChunkSchema = z
  .object({
    sessionId: AssistantSessionIdSchema,
    messageId: AssistantMessageIdSchema,
    delta: z.string().min(0).max(2000),
    sequence: z.number().int().min(0),
    final: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Session / Message / Action / AuditEvent
// ---------------------------------------------------------------------------

/** `z.infer` matches `AssistantSession`. */
export const AssistantSessionSchema = z
  .object({
    id: AssistantSessionIdSchema,
    tenantId: TenantIdSchema,
    userId: UserIdSchema,
    locale: LocaleSchema,
    status: AssistantSessionStatusSchema,
    modelMode: AiModelModeSchema,
    externalProviderId: z.string().min(1).max(128).nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    clearedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `AssistantMessage`. */
export const AssistantMessageSchema = z
  .object({
    id: AssistantMessageIdSchema,
    sessionId: AssistantSessionIdSchema,
    tenantId: TenantIdSchema,
    userId: UserIdSchema,
    role: AssistantMessageRoleSchema,
    contentSummary: z.string().min(0).max(2000),
    contentHash: z.string().min(1).max(256),
    modelProvider: z.string().min(1).max(64).nullable(),
    createdAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `AssistantAction`. */
export const AssistantActionSchema = z
  .object({
    id: AssistantActionIdSchema,
    messageId: AssistantMessageIdSchema,
    sessionId: AssistantSessionIdSchema,
    tenantId: TenantIdSchema,
    actionType: AssistantActionTypeSchema,
    targetType: AssistantActionTargetTypeSchema,
    targetId: UuidSchema.nullable(),
    labelKey: z.string().min(1).max(128),
    confirmationRequired: z.boolean(),
    destructive: z.boolean(),
    confirmedAt: IsoDateStringSchema.nullable(),
    confirmedBy: UserIdSchema.nullable(),
    executedAt: IsoDateStringSchema.nullable(),
    status: AssistantActionStatusSchema,
    failureReasonKey: z.string().min(1).max(128).nullable(),
  })
  .strict();

/** `z.infer` matches `AssistantAuditEvent`. */
export const AssistantAuditEventSchema = z
  .object({
    id: AssistantAuditEventIdSchema,
    tenantId: TenantIdSchema,
    userId: UserIdSchema,
    sessionId: AssistantSessionIdSchema,
    messageId: AssistantMessageIdSchema.nullable(),
    toolsInvoked: z.array(ToolNameSchema),
    dataCategoriesAccessed: z.array(z.string().min(1).max(64)),
    documentIdsAccessed: z.array(DocumentIdSchema),
    actionSuggestions: z.array(AssistantActionTypeSchema),
    actionConfirmations: z.array(AssistantActionIdSchema),
    resultStatus: z.enum(['succeeded', 'failed', 'denied', 'partial']),
    locale: LocaleSchema,
    requestId: UuidSchema,
    modelProvider: z.string().min(1).max(64),
    occurredAt: IsoDateStringSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// ToolDefinition (spec §11.5 / §11.6)
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof ToolDefinitionSchema>` matches `ToolDefinition` from
 * `@smart-edms/types`.
 *
 * `inputSchema` and `outputSchema` are intentionally `z.unknown()` — they
 * are JSON Schema blobs the client renders; the server validates with the
 * concrete Zod schemas defined above.
 */
export const ToolDefinitionSchema = z
  .object({
    name: ToolNameSchema,
    descriptionKey: z.string().min(1).max(128),
    requiredPermission: z.string().min(1).max(128),
    requiredLicenseModule: EntitlementModuleSchema.nullable(),
    mutates: z.boolean(),
    // JSON Schema blob for the client; the server uses the concrete Zod
    // schemas defined above.
    inputSchema: z.record(z.string(), z.unknown()),
    outputSchema: z.record(z.string(), z.unknown()),
    rateLimitPerMinute: z.number().int().min(0).max(10000),
  })
  .strict();
