/**
 * @smart-edms/schemas
 *
 * Comprehensive Zod schemas for the Smart EDMS monorepo. These schemas are
 * the SINGLE SOURCE OF TRUTH for runtime validation across the entire
 * monorepo — every API DTO, WebSocket event payload, license file payload,
 * AI tool input/output, and configuration object is validated here.
 *
 * Each schema's `z.infer` is intended to match the corresponding type from
 * `@smart-edms/types`. Branded nominal IDs use `.transform((v) => v as B)`
 * so the inferred OUTPUT type carries the brand.
 *
 * Domains covered (spec sections in parentheses):
 *  - common primitives, pagination, error envelope      (§14, §15.4)
 *  - authentication & session                           (§9.1, §15.1)
 *  - multi-tenancy                                      (§9.2, §15.3)
 *  - users, roles, groups, invitations, preferences     (§9.1, §15.1)
 *  - documents, uploads, versions, metadata             (§9.3, §9.5, §9.6)
 *  - classification & sensitivity                       (§9.4)
 *  - workflows, approvals, AI drafts                    (§9.8)
 *  - retention, legal hold, disposition                 (§9.7)
 *  - audit, evidence, hash-chain                        (§9.12)
 *  - sharing & external collaboration                   (§9.11)
 *  - search, DLA, Flex Search                           (§9.10)
 *  - notifications & alerts                             (§9.13)
 *  - licensing system, signed artifacts                 (§12, §15.2)
 *  - guided tour                                        (§10, §10.11)
 *  - AI Assistant, tool inputs, context envelope        (§11, §11.17)
 *  - scanner, OCR/OMR/ICR                               (§9.16)
 *  - WebSocket real-time events                         (§13, §13.4)
 *  - branding & theme                                   (§9.2, §16.6, §17)
 *  - environment configuration                          (§15.1)
 *
 * Conventions:
 *  - Input schemas use `.strict()` to reject unknown keys.
 *  - IDs use `z.string().uuid()`.
 *  - Timestamps use `z.string().datetime()` (RFC 3339, UTC, `Z` suffix).
 *  - Enums use `z.enum([...])` matching the literal unions in
 *    `@smart-edms/types`.
 *  - No `z.any()` and no `z.unknown()` except for genuinely untrusted
 *    external data (JSON Schema blobs, free-form JSON payloads). Every such
 *    use is called out with a comment.
 */

export * from './common';
export * from './auth';
export * from './tenant';
export * from './user';
export * from './document';
export * from './classification';
export * from './workflow';
export * from './retention';
export * from './audit';
export * from './share';
export * from './search';
export * from './notification';
export * from './license';
export * from './tour';
export * from './ai';
export * from './scanner';
export * from './websocket';
export * from './branding';
export * from './config';

// ---------------------------------------------------------------------------
// AI_TOOL_CATALOG — registry of all AI Assistant tools (spec §11.5 / §11.6)
// ---------------------------------------------------------------------------

import {
  AdminGetHealthInputSchema,
  AdminGetSystemUsageInputSchema,
  AuditGetRecentEventsInputSchema,
  DocumentsGetLockStateInputSchema,
  DocumentsGetMetadataInputSchema,
  DocumentsGetSummaryInputSchema,
  DocumentsGetVersionsInputSchema,
  DocumentsSearchToolInputSchema,
  HelpSearchDocumentationInputSchema,
  LegalHoldGetStatusInputSchema,
  LicenseGetStatusInputSchema,
  RetentionGetUpcomingExpiryInputSchema,
  TourStartInputSchema,
  UiNavigateToInputSchema,
  WorkflowsGetPendingApprovalsInputSchema,
  WorkflowsGetStatusInputSchema,
} from './ai';

/**
 * AI_TOOL_CATALOG — array of `{ name, description, inputSchema }` for the
 * AI gateway. The gateway uses this to advertise the whitelist to clients
 * (spec §11.6 `GET /v1/ai/assistant/tools`) and to dispatch tool calls.
 *
 * Each `inputSchema` is the concrete Zod schema the server uses to validate
 * tool inputs. The descriptions are localised description keys (not user-
 * facing strings).
 */
export const AI_TOOL_CATALOG = [
  {
    name: 'documents.search' as const,
    description: 'ai.tools.documents.search.description',
    inputSchema: DocumentsSearchToolInputSchema,
  },
  {
    name: 'documents.getSummary' as const,
    description: 'ai.tools.documents.getSummary.description',
    inputSchema: DocumentsGetSummaryInputSchema,
  },
  {
    name: 'documents.getMetadata' as const,
    description: 'ai.tools.documents.getMetadata.description',
    inputSchema: DocumentsGetMetadataInputSchema,
  },
  {
    name: 'documents.getVersions' as const,
    description: 'ai.tools.documents.getVersions.description',
    inputSchema: DocumentsGetVersionsInputSchema,
  },
  {
    name: 'documents.getLockState' as const,
    description: 'ai.tools.documents.getLockState.description',
    inputSchema: DocumentsGetLockStateInputSchema,
  },
  {
    name: 'workflows.getStatus' as const,
    description: 'ai.tools.workflows.getStatus.description',
    inputSchema: WorkflowsGetStatusInputSchema,
  },
  {
    name: 'workflows.getPendingApprovals' as const,
    description: 'ai.tools.workflows.getPendingApprovals.description',
    inputSchema: WorkflowsGetPendingApprovalsInputSchema,
  },
  {
    name: 'audit.getRecentEvents' as const,
    description: 'ai.tools.audit.getRecentEvents.description',
    inputSchema: AuditGetRecentEventsInputSchema,
  },
  {
    name: 'retention.getUpcomingExpiry' as const,
    description: 'ai.tools.retention.getUpcomingExpiry.description',
    inputSchema: RetentionGetUpcomingExpiryInputSchema,
  },
  {
    name: 'legalHold.getStatus' as const,
    description: 'ai.tools.legalHold.getStatus.description',
    inputSchema: LegalHoldGetStatusInputSchema,
  },
  {
    name: 'license.getStatus' as const,
    description: 'ai.tools.license.getStatus.description',
    inputSchema: LicenseGetStatusInputSchema,
  },
  {
    name: 'help.searchDocumentation' as const,
    description: 'ai.tools.help.searchDocumentation.description',
    inputSchema: HelpSearchDocumentationInputSchema,
  },
  {
    name: 'ui.navigateTo' as const,
    description: 'ai.tools.ui.navigateTo.description',
    inputSchema: UiNavigateToInputSchema,
  },
  {
    name: 'tour.start' as const,
    description: 'ai.tools.tour.start.description',
    inputSchema: TourStartInputSchema,
  },
  {
    name: 'admin.getHealth' as const,
    description: 'ai.tools.admin.getHealth.description',
    inputSchema: AdminGetHealthInputSchema,
  },
  {
    name: 'admin.getSystemUsage' as const,
    description: 'ai.tools.admin.getSystemUsage.description',
    inputSchema: AdminGetSystemUsageInputSchema,
  },
] as const;

/** Type of a single AI_TOOL_CATALOG entry. */
export type AiToolCatalogEntry = (typeof AI_TOOL_CATALOG)[number];

// Re-export the constants + catalog explicitly for discoverability.
export {
  LICENSE_PAYLOAD_VERSION,
  LICENSE_ARTIFACT_VERSION,
  OFFLINE_REQUEST_VERSION,
  REVOCATION_LIST_VERSION,
} from './license';
export { WEBSOCKET_EVENTS } from './websocket';
export { AI_TOOL_CATALOG as AIToolCatalog };
