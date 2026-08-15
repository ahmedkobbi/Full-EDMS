"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIToolCatalog = exports.WEBSOCKET_EVENTS = exports.REVOCATION_LIST_VERSION = exports.OFFLINE_REQUEST_VERSION = exports.LICENSE_ARTIFACT_VERSION = exports.LICENSE_PAYLOAD_VERSION = exports.AI_TOOL_CATALOG = void 0;
__exportStar(require("./common"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./tenant"), exports);
__exportStar(require("./user"), exports);
__exportStar(require("./document"), exports);
__exportStar(require("./classification"), exports);
__exportStar(require("./workflow"), exports);
__exportStar(require("./retention"), exports);
__exportStar(require("./audit"), exports);
__exportStar(require("./share"), exports);
__exportStar(require("./search"), exports);
__exportStar(require("./notification"), exports);
__exportStar(require("./license"), exports);
__exportStar(require("./tour"), exports);
__exportStar(require("./ai"), exports);
__exportStar(require("./scanner"), exports);
__exportStar(require("./websocket"), exports);
__exportStar(require("./branding"), exports);
__exportStar(require("./config"), exports);
// ---------------------------------------------------------------------------
// AI_TOOL_CATALOG — registry of all AI Assistant tools (spec §11.5 / §11.6)
// ---------------------------------------------------------------------------
const ai_1 = require("./ai");
/**
 * AI_TOOL_CATALOG — array of `{ name, description, inputSchema }` for the
 * AI gateway. The gateway uses this to advertise the whitelist to clients
 * (spec §11.6 `GET /v1/ai/assistant/tools`) and to dispatch tool calls.
 *
 * Each `inputSchema` is the concrete Zod schema the server uses to validate
 * tool inputs. The descriptions are localised description keys (not user-
 * facing strings).
 */
exports.AI_TOOL_CATALOG = [
    {
        name: 'documents.search',
        description: 'ai.tools.documents.search.description',
        inputSchema: ai_1.DocumentsSearchToolInputSchema,
    },
    {
        name: 'documents.getSummary',
        description: 'ai.tools.documents.getSummary.description',
        inputSchema: ai_1.DocumentsGetSummaryInputSchema,
    },
    {
        name: 'documents.getMetadata',
        description: 'ai.tools.documents.getMetadata.description',
        inputSchema: ai_1.DocumentsGetMetadataInputSchema,
    },
    {
        name: 'documents.getVersions',
        description: 'ai.tools.documents.getVersions.description',
        inputSchema: ai_1.DocumentsGetVersionsInputSchema,
    },
    {
        name: 'documents.getLockState',
        description: 'ai.tools.documents.getLockState.description',
        inputSchema: ai_1.DocumentsGetLockStateInputSchema,
    },
    {
        name: 'workflows.getStatus',
        description: 'ai.tools.workflows.getStatus.description',
        inputSchema: ai_1.WorkflowsGetStatusInputSchema,
    },
    {
        name: 'workflows.getPendingApprovals',
        description: 'ai.tools.workflows.getPendingApprovals.description',
        inputSchema: ai_1.WorkflowsGetPendingApprovalsInputSchema,
    },
    {
        name: 'audit.getRecentEvents',
        description: 'ai.tools.audit.getRecentEvents.description',
        inputSchema: ai_1.AuditGetRecentEventsInputSchema,
    },
    {
        name: 'retention.getUpcomingExpiry',
        description: 'ai.tools.retention.getUpcomingExpiry.description',
        inputSchema: ai_1.RetentionGetUpcomingExpiryInputSchema,
    },
    {
        name: 'legalHold.getStatus',
        description: 'ai.tools.legalHold.getStatus.description',
        inputSchema: ai_1.LegalHoldGetStatusInputSchema,
    },
    {
        name: 'license.getStatus',
        description: 'ai.tools.license.getStatus.description',
        inputSchema: ai_1.LicenseGetStatusInputSchema,
    },
    {
        name: 'help.searchDocumentation',
        description: 'ai.tools.help.searchDocumentation.description',
        inputSchema: ai_1.HelpSearchDocumentationInputSchema,
    },
    {
        name: 'ui.navigateTo',
        description: 'ai.tools.ui.navigateTo.description',
        inputSchema: ai_1.UiNavigateToInputSchema,
    },
    {
        name: 'tour.start',
        description: 'ai.tools.tour.start.description',
        inputSchema: ai_1.TourStartInputSchema,
    },
    {
        name: 'admin.getHealth',
        description: 'ai.tools.admin.getHealth.description',
        inputSchema: ai_1.AdminGetHealthInputSchema,
    },
    {
        name: 'admin.getSystemUsage',
        description: 'ai.tools.admin.getSystemUsage.description',
        inputSchema: ai_1.AdminGetSystemUsageInputSchema,
    },
];
exports.AIToolCatalog = exports.AI_TOOL_CATALOG;
// Re-export the constants + catalog explicitly for discoverability.
var license_1 = require("./license");
Object.defineProperty(exports, "LICENSE_PAYLOAD_VERSION", { enumerable: true, get: function () { return license_1.LICENSE_PAYLOAD_VERSION; } });
Object.defineProperty(exports, "LICENSE_ARTIFACT_VERSION", { enumerable: true, get: function () { return license_1.LICENSE_ARTIFACT_VERSION; } });
Object.defineProperty(exports, "OFFLINE_REQUEST_VERSION", { enumerable: true, get: function () { return license_1.OFFLINE_REQUEST_VERSION; } });
Object.defineProperty(exports, "REVOCATION_LIST_VERSION", { enumerable: true, get: function () { return license_1.REVOCATION_LIST_VERSION; } });
var websocket_1 = require("./websocket");
Object.defineProperty(exports, "WEBSOCKET_EVENTS", { enumerable: true, get: function () { return websocket_1.WEBSOCKET_EVENTS; } });
//# sourceMappingURL=index.js.map