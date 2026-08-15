/**
 * @smart-edms/types — AI Assistant Bubble (spec §11, §11.17)
 *
 * Purpose: model the AI Assistant session, messages, tool invocations,
 * actions, settings, audit events, tool catalog, citations, and the
 * secure AI context envelope.
 *
 * Critical rules (spec §11.1, §11.4, §11.5, §11.9, §11.10):
 *  - The AI acts on behalf of the authenticated user; never as a superuser.
 *  - Read-only by default. Sensitive actions require explicit confirmation;
 *    destructive actions require a dedicated confirmed UI flow.
 *  - Document content is untrusted data; prompt-injection protections apply.
 *  - Data minimization: only retrieve the minimum data necessary.
 */

import type {
  ConfidenceScore,
  ISODateString,
  Locale,
  UUID,
} from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId } from './document';
import type { EntitlementModule } from './license';
import type { TourDefinitionId } from './tour';

/** Branded assistant-session identifier. */
export type AssistantSessionId = UUID

/** Branded assistant-message identifier. */
export type AssistantMessageId = UUID

/** Branded assistant-tool-invocation identifier. */
export type AssistantToolInvocationId = UUID;

/** Branded assistant-action identifier. */
export type AssistantActionId = UUID

/** Branded assistant-audit-event identifier. */
export type AssistantAuditEventId = UUID

/**
 * AI model deployment mode (spec §11.11).
 *  - `external`: external AI provider allowed (tenant-configurable).
 *  - `local`: local / self-hosted AI only.
 *  - `hybrid`: combination of both.
 */
export type AiModelMode = 'external' | 'local' | 'hybrid';

/** Status of an assistant session. */
export type AssistantSessionStatus = 'active' | 'idle' | 'cleared' | 'archived';

/** Role of a message in the conversation. */
export type AssistantMessageRole = 'user' | 'assistant' | 'system' | 'tool';

/** Status of a tool invocation. */
export type AssistantToolInvocationStatus =
  | 'pending'
  | 'authorized'
  | 'denied'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timeout';

/** Status of an assistant-suggested action. */
export type AssistantActionStatus =
  | 'suggested'
  | 'confirmed'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'denied'
  | 'expired';

/**
 * Canonical tool names whitelisted by the permission-aware tool layer
 * (spec §11.5). Each tool must be explicitly whitelisted, validate input
 * with Zod, enforce authorization, enforce tenant isolation, respect
 * license entitlements, return only necessary fields, be rate limited,
 * and be audited.
 */
export type ToolName =
  | 'documents.search'
  | 'documents.getSummary'
  | 'documents.getMetadata'
  | 'documents.getVersions'
  | 'documents.getLockState'
  | 'workflows.getStatus'
  | 'workflows.getPendingApprovals'
  | 'audit.getRecentEvents'
  | 'retention.getUpcomingExpiry'
  | 'legalHold.getStatus'
  | 'license.getStatus'
  | 'help.searchDocumentation'
  | 'ui.navigateTo'
  | 'tour.start'
  | 'admin.getHealth'
  | 'admin.getSystemUsage';

/** Kind of action the assistant may suggest to the user. */
export type AssistantActionType =
  | 'create_share_link'
  | 'start_workflow'
  | 'request_approval'
  | 'export_evidence'
  | 'generate_report'
  | 'modify_metadata'
  | 'navigate'
  | 'import_license'
  | 'contact_support'
  | 'launch_tour';

/** Resource type the suggested action targets. */
export type AssistantActionTargetType =
  | 'document'
  | 'workflow'
  | 'share_link'
  | 'retention_schedule'
  | 'legal_hold'
  | 'audit_event'
  | 'license'
  | 'tour'
  | 'admin_page'
  | 'external_url';

/**
 * Tool definition. Used by `GET /v1/ai/assistant/tools` to expose the
 * whitelist to the client (spec §11.5 / §11.6).
 */
export interface ToolDefinition {
  readonly name: ToolName;
  /** Localised description key. */
  readonly descriptionKey: string;
  /** Permission required to invoke this tool. */
  readonly requiredPermission: string;
  /** License module required to invoke this tool. */
  readonly requiredLicenseModule: EntitlementModule | null;
  /** Whether the tool mutates state (drives confirmation UX). */
  readonly mutates: boolean;
  /** JSON Schema for the tool input; the server validates with Zod. */
  readonly inputSchema: Readonly<Record<string, unknown>>;
  /** JSON Schema for the tool output (for client rendering). */
  readonly outputSchema: Readonly<Record<string, unknown>>;
  /** Rate limit applied per user per minute. */
  readonly rateLimitPerMinute: number;
}

/**
 * Assistant session (spec §11.17). Sessions are tenant-scoped and
 * user-scoped; chat history is retained per `AiFlagConfig.chatRetentionDays`.
 */
export interface AssistantSession {
  readonly id: AssistantSessionId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly locale: Locale;
  readonly status: AssistantSessionStatus;
  /** AI model deployment mode active for this session. */
  readonly modelMode: AiModelMode;
  /** External provider id when `modelMode` includes `external`. */
  readonly externalProviderId: string | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly clearedAt: ISODateString | null;
}

/**
 * Assistant message (spec §11.17). The full content is never stored in
 * plaintext by default; only a summary and a content hash. This supports
 * the data-minimization rule (spec §11.10) and audit minimization (§9.12).
 */
export interface AssistantMessage {
  readonly id: AssistantMessageId;
  readonly sessionId: AssistantSessionId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly role: AssistantMessageRole;
  /** Short summary of the message; safe to display in lists. */
  readonly contentSummary: string;
  /** Hash of the full content; the full content may be retained separately. */
  readonly contentHash: string;
  /** Model provider that produced this message (null for user messages). */
  readonly modelProvider: string | null;
  readonly createdAt: ISODateString;
}

/**
 * Assistant tool invocation (spec §11.17). Each invocation records the
 * input/output summaries, authorization decision, and outcome.
 */
export interface AssistantToolInvocation {
  readonly id: AssistantToolInvocationId;
  readonly messageId: AssistantMessageId;
  readonly sessionId: AssistantSessionId;
  readonly tenantId: TenantId;
  readonly toolName: ToolName;
  /** Input summary; never the full input payload. */
  readonly inputSummary: string;
  /** Output summary; never the full output payload. */
  readonly outputSummary: string;
  readonly status: AssistantToolInvocationStatus;
  /** Whether authorization was granted for this invocation. */
  readonly authorized: boolean;
  /** Localised denial-reason key, when denied. */
  readonly denialReasonKey: string | null;
  readonly occurredAt: ISODateString;
  /** Duration the tool took to execute, in milliseconds. */
  readonly durationMs: number;
}

/**
 * Assistant suggested action (spec §11.4, §11.17). Sensitive actions
 * require explicit user confirmation; destructive actions require a
 * dedicated confirmed UI flow (never silent execution).
 */
export interface AssistantAction {
  readonly id: AssistantActionId;
  readonly messageId: AssistantMessageId;
  readonly sessionId: AssistantSessionId;
  readonly tenantId: TenantId;
  readonly actionType: AssistantActionType;
  readonly targetType: AssistantActionTargetType;
  readonly targetId: UUID | null;
  /** Localised action label key, rendered via `t()`. */
  readonly labelKey: string;
  /** Whether explicit confirmation is required before execution. */
  readonly confirmationRequired: boolean;
  /** Whether this action is destructive (requires dedicated UI flow). */
  readonly destructive: boolean;
  readonly confirmedAt: ISODateString | null;
  readonly confirmedBy: UserId | null;
  readonly executedAt: ISODateString | null;
  readonly status: AssistantActionStatus;
  /** Localised failure-reason key, when failed. */
  readonly failureReasonKey: string | null;
}

/**
 * Assistant tenant settings (spec §11.15). Mirrors the per-tenant
 * `AiFlagConfig` but adds runtime fields used by the AI gateway.
 */
export interface AssistantSettings {
  readonly tenantId: TenantId;
  readonly enabled: boolean;
  readonly allowedRoleIds: readonly string[];
  readonly allowedTools: readonly ToolName[];
  readonly modelMode: AiModelMode;
  readonly externalProviderId: string | null;
  /** Whether citations are shown to end users. */
  readonly showCitations: boolean;
  /** Whether suggested navigation actions are allowed. */
  readonly allowNavigationActions: boolean;
  /** Whether suggested actions (beyond navigation) are allowed. */
  readonly allowSuggestedActions: boolean;
  /** Whether the disclaimer banner is rendered. */
  readonly requireDisclaimer: boolean;
  readonly chatRetentionDays: number;
  readonly dailyQuotaPerUser: number;
  /** Localised privacy-notice key. */
  readonly privacyNoticeKey: string;
  readonly updatedAt: ISODateString;
}

/**
 * Assistant audit event (spec §11.14). Every AI interaction must be
 * audited; the audit log is protected from tampering and minimises
 * sensitive content.
 */
export interface AssistantAuditEvent {
  readonly id: AssistantAuditEventId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly sessionId: AssistantSessionId;
  readonly messageId: AssistantMessageId | null;
  readonly toolsInvoked: readonly ToolName[];
  /** Data categories accessed by the AI in this interaction. */
  readonly dataCategoriesAccessed: readonly string[];
  /** Document ids accessed by the AI, where applicable. */
  readonly documentIdsAccessed: readonly DocumentId[];
  /** Action suggestions produced by the AI. */
  readonly actionSuggestions: readonly AssistantActionType[];
  /** Action confirmations issued by the user. */
  readonly actionConfirmations: readonly AssistantActionId[];
  /** Result status of the interaction. */
  readonly resultStatus: 'succeeded' | 'failed' | 'denied' | 'partial';
  readonly locale: Locale;
  /** Request id propagated from the HTTP / WS request. */
  readonly requestId: UUID;
  /** Model provider or local-model indicator (spec §11.14). */
  readonly modelProvider: string;
  readonly occurredAt: ISODateString;
}

/**
 * Citation attached to an assistant answer (spec §11.8). Citations may
 * only reference resources the user is authorised to access.
 */
export interface Citation {
  readonly documentId: DocumentId;
  readonly versionId: UUID | null;
  readonly title: string;
  readonly classificationLabelId: UUID;
  readonly updatedAt: ISODateString;
  readonly workflowState: string | null;
  readonly retentionState: string | null;
  readonly legalHoldState: 'active' | 'none';
  /** Page or DLA block reference, when available. */
  readonly locator: { readonly page: number; readonly snippet: string } | null;
  /** Confidence that this citation supports the answer. */
  readonly confidence: ConfidenceScore | null;
}

/**
 * Secure AI context envelope (spec §11.7). Provided by the AI Gateway to
 * the planner. Must NOT include secrets, tokens, private keys, full
 * database credentials, or unrestricted permission bypass.
 */
export interface AiContextEnvelope {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly roles: readonly string[];
  /** Permissions summary — coarse, not the full permission list. */
  readonly permissionsSummary: readonly string[];
  readonly locale: Locale;
  readonly timezone: string;
  readonly licensedModules: readonly EntitlementModule[];
  readonly currentRoute: string;
  readonly requestId: UUID;
  readonly theme: 'light' | 'dark';
  /** Tour ids the user has been offered/completed (for tour suggestion). */
  readonly tourContext: ReadonlyArray<{
    readonly tourId: TourDefinitionId;
    readonly status: string;
  }>;
}

/**
 * Streaming chunk emitted via `ai.response.chunk` (spec §13.4). Used by
 * the client to render the assistant answer token-by-token.
 */
export interface AiResponseChunk {
  readonly sessionId: AssistantSessionId;
  readonly messageId: AssistantMessageId;
  readonly delta: string;
  /** Sequence number of the chunk within the message. */
  readonly sequence: number;
  readonly final: boolean;
}

/**
 * Result of a prompt-injection detection pass (spec §11.9). Document
 * content is treated as untrusted data.
 */
export interface PromptInjectionDetection {
  readonly detected: boolean;
  /** Localised explanation key shown to the user. */
  readonly explanationKey: string | null;
  /** Whether the request was blocked outright. */
  readonly blocked: boolean;
  readonly category: 'embedded_instruction' | 'secret_extraction' | 'sql_injection' | 'endpoint_abuse' | 'other';
}
