"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolDefinitionSchema = exports.AssistantAuditEventSchema = exports.AssistantActionSchema = exports.AssistantMessageSchema = exports.AssistantSessionSchema = exports.AiResponseChunkSchema = exports.AssistantToolInvocationSchema = exports.AssistantChatResponseSchema = exports.AssistantSuggestedActionSchema = exports.CitationSchema = exports.AssistantChatRequestSchema = exports.PromptInjectionDetectionSchema = exports.AssistantSettingsSchema = exports.AiContextEnvelopeSchema = exports.AdminGetSystemUsageInputSchema = exports.AdminGetHealthInputSchema = exports.TourStartInputSchema = exports.UiNavigateToInputSchema = exports.HelpSearchDocumentationInputSchema = exports.LicenseGetStatusInputSchema = exports.LegalHoldGetStatusInputSchema = exports.RetentionGetUpcomingExpiryInputSchema = exports.AuditGetRecentEventsInputSchema = exports.WorkflowsGetPendingApprovalsInputSchema = exports.WorkflowsGetStatusInputSchema = exports.DocumentsGetLockStateInputSchema = exports.DocumentsGetVersionsInputSchema = exports.DocumentsGetMetadataInputSchema = exports.DocumentsGetSummaryInputSchema = exports.DocumentsSearchToolInputSchema = exports.AssistantActionTargetTypeSchema = exports.AssistantActionTypeSchema = exports.ToolNameSchema = exports.AssistantActionStatusSchema = exports.AssistantToolInvocationStatusSchema = exports.AssistantMessageRoleSchema = exports.AssistantSessionStatusSchema = exports.AiModelModeSchema = exports.AssistantAuditEventIdSchema = exports.AssistantActionIdSchema = exports.AssistantToolInvocationIdSchema = exports.AssistantMessageIdSchema = exports.AssistantSessionIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const document_1 = require("./document");
const license_1 = require("./license");
const tour_1 = require("./tour");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.AssistantSessionIdSchema = common_1.UuidSchema.transform((v) => v);
exports.AssistantMessageIdSchema = common_1.UuidSchema.transform((v) => v);
exports.AssistantToolInvocationIdSchema = common_1.UuidSchema.transform((v) => v);
exports.AssistantActionIdSchema = common_1.UuidSchema.transform((v) => v);
exports.AssistantAuditEventIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums (spec §11.5, §11.11, §11.17)
// ---------------------------------------------------------------------------
/** `z.infer` === `AiModelMode` (§11.11). */
exports.AiModelModeSchema = zod_1.z.enum(['external', 'local', 'hybrid']);
/** `z.infer` === `AssistantSessionStatus`. */
exports.AssistantSessionStatusSchema = zod_1.z.enum([
    'active',
    'idle',
    'cleared',
    'archived',
]);
/** `z.infer` === `AssistantMessageRole`. */
exports.AssistantMessageRoleSchema = zod_1.z.enum([
    'user',
    'assistant',
    'system',
    'tool',
]);
/** `z.infer` === `AssistantToolInvocationStatus`. */
exports.AssistantToolInvocationStatusSchema = zod_1.z.enum([
    'pending',
    'authorized',
    'denied',
    'running',
    'succeeded',
    'failed',
    'timeout',
]);
/** `z.infer` === `AssistantActionStatus`. */
exports.AssistantActionStatusSchema = zod_1.z.enum([
    'suggested',
    'confirmed',
    'executing',
    'succeeded',
    'failed',
    'denied',
    'expired',
]);
/** `z.infer` === `ToolName` (§11.5 whitelist). */
exports.ToolNameSchema = zod_1.z.enum([
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
exports.AssistantActionTypeSchema = zod_1.z.enum([
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
exports.AssistantActionTargetTypeSchema = zod_1.z.enum([
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
exports.DocumentsSearchToolInputSchema = zod_1.z
    .object({
    query: zod_1.z.string().min(1).max(2048),
    folderId: common_1.UuidSchema.nullable().optional(),
    classificationLabelIds: zod_1.z.array(common_1.UuidSchema).max(20).optional(),
    limit: zod_1.z.number().int().min(1).max(50).default(10),
    includeOcr: zod_1.z.boolean().default(false),
})
    .strict();
/** Input schema for `documents.getSummary` tool. */
exports.DocumentsGetSummaryInputSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema,
    versionId: common_1.UuidSchema.nullable().optional(),
    maxLength: zod_1.z.number().int().min(50).max(4000).default(500),
})
    .strict();
/** Input schema for `documents.getMetadata` tool. */
exports.DocumentsGetMetadataInputSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema,
    versionId: common_1.UuidSchema.nullable().optional(),
})
    .strict();
/** Input schema for `documents.getVersions` tool. */
exports.DocumentsGetVersionsInputSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema,
    limit: zod_1.z.number().int().min(1).max(50).default(10),
})
    .strict();
/** Input schema for `documents.getLockState` tool. */
exports.DocumentsGetLockStateInputSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema,
})
    .strict();
/** Input schema for `workflows.getStatus` tool. */
exports.WorkflowsGetStatusInputSchema = zod_1.z
    .object({
    workflowInstanceId: common_1.UuidSchema.nullable().optional(),
    documentId: document_1.DocumentIdSchema.nullable().optional(),
    limit: zod_1.z.number().int().min(1).max(20).default(5),
})
    .strict();
/** Input schema for `workflows.getPendingApprovals` tool. */
exports.WorkflowsGetPendingApprovalsInputSchema = zod_1.z
    .object({
    forUserId: user_1.UserIdSchema.nullable().optional(),
    limit: zod_1.z.number().int().min(1).max(20).default(10),
})
    .strict();
/** Input schema for `audit.getRecentEvents` tool. */
exports.AuditGetRecentEventsInputSchema = zod_1.z
    .object({
    category: zod_1.z
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
    severity: zod_1.z.enum(['info', 'notice', 'warning', 'critical']).optional(),
    since: common_1.IsoDateStringSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(20).default(10),
})
    .strict();
/** Input schema for `retention.getUpcomingExpiry` tool. */
exports.RetentionGetUpcomingExpiryInputSchema = zod_1.z
    .object({
    withinDays: zod_1.z.number().int().min(1).max(365).default(30),
    documentTypeId: common_1.UuidSchema.nullable().optional(),
    limit: zod_1.z.number().int().min(1).max(50).default(20),
})
    .strict();
/** Input schema for `legalHold.getStatus` tool. */
exports.LegalHoldGetStatusInputSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema.nullable().optional(),
    caseCode: zod_1.z.string().min(1).max(128).optional(),
    limit: zod_1.z.number().int().min(1).max(20).default(10),
})
    .strict();
/** Input schema for `license.getStatus` tool. */
exports.LicenseGetStatusInputSchema = zod_1.z
    .object({
    includeEntitlements: zod_1.z.boolean().default(true),
    includeUsage: zod_1.z.boolean().default(false),
})
    .strict();
/** Input schema for `help.searchDocumentation` tool. */
exports.HelpSearchDocumentationInputSchema = zod_1.z
    .object({
    query: zod_1.z.string().min(1).max(512),
    locale: common_1.LocaleSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(10).default(5),
})
    .strict();
/** Input schema for `ui.navigateTo` tool. */
exports.UiNavigateToInputSchema = zod_1.z
    .object({
    route: zod_1.z.string().min(1).max(256),
    // Optional query parameters.
    params: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()])).optional(),
})
    .strict();
/** Input schema for `tour.start` tool. */
exports.TourStartInputSchema = zod_1.z
    .object({
    tourCode: zod_1.z.enum([
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
exports.AdminGetHealthInputSchema = zod_1.z
    .object({
    includeDependencies: zod_1.z.boolean().default(true),
})
    .strict();
/** Input schema for `admin.getSystemUsage` tool. */
exports.AdminGetSystemUsageInputSchema = zod_1.z
    .object({
    includeStorage: zod_1.z.boolean().default(true),
    includeUsers: zod_1.z.boolean().default(true),
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
exports.AiContextEnvelopeSchema = zod_1.z
    .object({
    userId: user_1.UserIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    roles: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    permissionsSummary: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    locale: common_1.LocaleSchema,
    timezone: zod_1.z.string().min(1).max(64),
    licensedModules: zod_1.z.array(license_1.EntitlementModuleSchema),
    currentRoute: zod_1.z.string().min(1).max(256),
    requestId: common_1.UuidSchema,
    theme: zod_1.z.enum(['light', 'dark']),
    tourContext: zod_1.z.array(zod_1.z
        .object({
        tourId: tour_1.TourDefinitionIdSchema,
        status: zod_1.z.string().min(1).max(32),
    })
        .strict()),
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
exports.AssistantSettingsSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    enabled: zod_1.z.boolean(),
    allowedRoleIds: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    allowedTools: zod_1.z.array(exports.ToolNameSchema),
    modelMode: exports.AiModelModeSchema,
    externalProviderId: zod_1.z.string().min(1).max(128).nullable(),
    showCitations: zod_1.z.boolean(),
    allowNavigationActions: zod_1.z.boolean(),
    allowSuggestedActions: zod_1.z.boolean(),
    requireDisclaimer: zod_1.z.boolean(),
    chatRetentionDays: zod_1.z.number().int().min(0).max(3650),
    dailyQuotaPerUser: zod_1.z.number().int().min(0).max(100000),
    privacyNoticeKey: zod_1.z.string().min(1).max(128),
    updatedAt: common_1.IsoDateStringSchema,
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
exports.PromptInjectionDetectionSchema = zod_1.z
    .object({
    detected: zod_1.z.boolean(),
    explanationKey: zod_1.z.string().min(1).max(128).nullable(),
    blocked: zod_1.z.boolean(),
    category: zod_1.z.enum([
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
exports.AssistantChatRequestSchema = zod_1.z
    .object({
    message: zod_1.z.string().min(1).max(8000),
    sessionId: exports.AssistantSessionIdSchema.optional(),
    // Optional secure context envelope (spec §11.7). When omitted the
    // gateway constructs it from the authenticated session.
    context: exports.AiContextEnvelopeSchema.optional(),
    locale: common_1.LocaleSchema,
    // Optional client-side prompt-injection pre-check result.
    preInjectionCheck: exports.PromptInjectionDetectionSchema.optional(),
})
    .strict();
/** `z.infer` matches `Citation` (spec §11.8). */
exports.CitationSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema,
    versionId: common_1.UuidSchema.nullable(),
    title: zod_1.z.string().min(1).max(512),
    classificationLabelId: common_1.UuidSchema,
    updatedAt: common_1.IsoDateStringSchema,
    workflowState: zod_1.z.string().min(1).max(64).nullable(),
    retentionState: zod_1.z.string().min(1).max(64).nullable(),
    legalHoldState: zod_1.z.enum(['active', 'none']),
    locator: zod_1.z
        .object({
        page: zod_1.z.number().int().min(1),
        snippet: zod_1.z.string().min(0).max(2048),
    })
        .nullable(),
    confidence: common_1.ConfidenceScoreSchema.nullable(),
})
    .strict();
/** `z.infer` matches a suggested action surfaced in the response. */
exports.AssistantSuggestedActionSchema = zod_1.z
    .object({
    actionId: exports.AssistantActionIdSchema,
    actionType: exports.AssistantActionTypeSchema,
    targetType: exports.AssistantActionTargetTypeSchema,
    targetId: common_1.UuidSchema.nullable(),
    labelKey: zod_1.z.string().min(1).max(128),
    confirmationRequired: zod_1.z.boolean(),
    destructive: zod_1.z.boolean(),
})
    .strict();
/** Response body for `POST /v1/ai/assistant/chat`. */
exports.AssistantChatResponseSchema = zod_1.z
    .object({
    messageId: exports.AssistantMessageIdSchema,
    sessionId: exports.AssistantSessionIdSchema,
    content: zod_1.z.string().min(0).max(16000),
    citations: zod_1.z.array(exports.CitationSchema),
    suggestedActions: zod_1.z.array(exports.AssistantSuggestedActionSchema),
    // Localised disclaimer key, always rendered alongside the response.
    disclaimerKey: zod_1.z.string().min(1).max(128),
    // Optional prompt-injection detection result if the server detected
    // something suspicious in the user's input.
    injectionDetection: exports.PromptInjectionDetectionSchema.nullable(),
    // Tool invocations performed while generating the response.
    toolInvocations: zod_1.z.array(zod_1.z.lazy(() => exports.AssistantToolInvocationSchema)),
    // Model provider that produced the response.
    modelProvider: zod_1.z.string().min(1).max(64),
})
    .strict();
// ---------------------------------------------------------------------------
// AssistantToolInvocation (spec §11.17)
// ---------------------------------------------------------------------------
/**
 * `z.infer<typeof AssistantToolInvocationSchema>` matches
 * `AssistantToolInvocation` from `@smart-edms/types`.
 */
exports.AssistantToolInvocationSchema = zod_1.z
    .object({
    id: exports.AssistantToolInvocationIdSchema,
    messageId: exports.AssistantMessageIdSchema,
    sessionId: exports.AssistantSessionIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    toolName: exports.ToolNameSchema,
    // Input summary; never the full input payload (spec §11.10).
    inputSummary: zod_1.z.string().min(0).max(2000),
    // Output summary; never the full output payload.
    outputSummary: zod_1.z.string().min(0).max(4000),
    status: exports.AssistantToolInvocationStatusSchema,
    authorized: zod_1.z.boolean(),
    denialReasonKey: zod_1.z.string().min(1).max(128).nullable(),
    occurredAt: common_1.IsoDateStringSchema,
    durationMs: zod_1.z.number().int().min(0),
})
    .strict();
// ---------------------------------------------------------------------------
// Streaming chunk (spec §13.4 — `ai.response.chunk`)
// ---------------------------------------------------------------------------
/** `z.infer` matches `AiResponseChunk`. */
exports.AiResponseChunkSchema = zod_1.z
    .object({
    sessionId: exports.AssistantSessionIdSchema,
    messageId: exports.AssistantMessageIdSchema,
    delta: zod_1.z.string().min(0).max(2000),
    sequence: zod_1.z.number().int().min(0),
    final: zod_1.z.boolean(),
})
    .strict();
// ---------------------------------------------------------------------------
// Session / Message / Action / AuditEvent
// ---------------------------------------------------------------------------
/** `z.infer` matches `AssistantSession`. */
exports.AssistantSessionSchema = zod_1.z
    .object({
    id: exports.AssistantSessionIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    userId: user_1.UserIdSchema,
    locale: common_1.LocaleSchema,
    status: exports.AssistantSessionStatusSchema,
    modelMode: exports.AiModelModeSchema,
    externalProviderId: zod_1.z.string().min(1).max(128).nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    clearedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `AssistantMessage`. */
exports.AssistantMessageSchema = zod_1.z
    .object({
    id: exports.AssistantMessageIdSchema,
    sessionId: exports.AssistantSessionIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    userId: user_1.UserIdSchema,
    role: exports.AssistantMessageRoleSchema,
    contentSummary: zod_1.z.string().min(0).max(2000),
    contentHash: zod_1.z.string().min(1).max(256),
    modelProvider: zod_1.z.string().min(1).max(64).nullable(),
    createdAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `AssistantAction`. */
exports.AssistantActionSchema = zod_1.z
    .object({
    id: exports.AssistantActionIdSchema,
    messageId: exports.AssistantMessageIdSchema,
    sessionId: exports.AssistantSessionIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    actionType: exports.AssistantActionTypeSchema,
    targetType: exports.AssistantActionTargetTypeSchema,
    targetId: common_1.UuidSchema.nullable(),
    labelKey: zod_1.z.string().min(1).max(128),
    confirmationRequired: zod_1.z.boolean(),
    destructive: zod_1.z.boolean(),
    confirmedAt: common_1.IsoDateStringSchema.nullable(),
    confirmedBy: user_1.UserIdSchema.nullable(),
    executedAt: common_1.IsoDateStringSchema.nullable(),
    status: exports.AssistantActionStatusSchema,
    failureReasonKey: zod_1.z.string().min(1).max(128).nullable(),
})
    .strict();
/** `z.infer` matches `AssistantAuditEvent`. */
exports.AssistantAuditEventSchema = zod_1.z
    .object({
    id: exports.AssistantAuditEventIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    userId: user_1.UserIdSchema,
    sessionId: exports.AssistantSessionIdSchema,
    messageId: exports.AssistantMessageIdSchema.nullable(),
    toolsInvoked: zod_1.z.array(exports.ToolNameSchema),
    dataCategoriesAccessed: zod_1.z.array(zod_1.z.string().min(1).max(64)),
    documentIdsAccessed: zod_1.z.array(document_1.DocumentIdSchema),
    actionSuggestions: zod_1.z.array(exports.AssistantActionTypeSchema),
    actionConfirmations: zod_1.z.array(exports.AssistantActionIdSchema),
    resultStatus: zod_1.z.enum(['succeeded', 'failed', 'denied', 'partial']),
    locale: common_1.LocaleSchema,
    requestId: common_1.UuidSchema,
    modelProvider: zod_1.z.string().min(1).max(64),
    occurredAt: common_1.IsoDateStringSchema,
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
exports.ToolDefinitionSchema = zod_1.z
    .object({
    name: exports.ToolNameSchema,
    descriptionKey: zod_1.z.string().min(1).max(128),
    requiredPermission: zod_1.z.string().min(1).max(128),
    requiredLicenseModule: license_1.EntitlementModuleSchema.nullable(),
    mutates: zod_1.z.boolean(),
    // JSON Schema blob for the client; the server uses the concrete Zod
    // schemas defined above.
    inputSchema: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    outputSchema: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    rateLimitPerMinute: zod_1.z.number().int().min(0).max(10000),
})
    .strict();
//# sourceMappingURL=ai.js.map