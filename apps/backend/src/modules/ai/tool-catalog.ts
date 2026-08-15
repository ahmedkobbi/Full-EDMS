/**
 * Smart EDMS — AI Assistant tool catalogue (spec §11.5, §11.6).
 *
 * This file defines the runtime contract for the 16 whitelisted AI tools and
 * exposes a registry used by {@link AiService} to dispatch tool calls.
 *
 * CRITICAL RULES (spec §11.5, §11.10):
 *  - Each tool MUST validate input with Zod.
 *  - Each tool MUST enforce authorization via `requiredPermission` /
 *    `requiredLicenseModule` AND by checking `ctx.roles` inside `execute`.
 *  - Each tool MUST enforce tenant isolation by always filtering on
 *    `ctx.tenantId`.
 *  - Each tool MUST return ONLY the minimum data necessary (spec §11.10 —
 *    data minimisation). Never return raw database rows; always project to
 *    a narrow summary.
 *  - Each tool invocation MUST be audited by the caller (AiService writes
 *    the {@link AssistantToolInvocation} row after `execute` returns).
 *  - Destructive tools are NOT in this catalogue. Destructive actions are
 *    suggested to the user via {@link AssistantSuggestedAction} and require
 *    explicit confirmation in a dedicated UI flow (spec §11.4).
 *
 * Tool catalogue (spec §11.5):
 *   documents.search, documents.getSummary, documents.getMetadata,
 *   documents.getVersions, documents.getLockState,
 *   workflows.getStatus, workflows.getPendingApprovals,
 *   audit.getRecentEvents, retention.getUpcomingExpiry, legalHold.getStatus,
 *   license.getStatus, help.searchDocumentation,
 *   ui.navigateTo, tour.start,
 *   admin.getHealth, admin.getSystemUsage.
 */

import type { z } from 'zod';
import type { EntitlementModule, ToolName } from '@smart-edms/types';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../../common/audit.service';
import type { RedisService } from '../../common/redis.service';
import type { SearchService } from '../search/search.service';
import type { LicenseService } from '../license/license.service';
import type { Citation } from '@smart-edms/types';

// ---------------------------------------------------------------------------
// Tool execution context — passed to every tool's `execute` function
// ---------------------------------------------------------------------------

/**
 * The runtime context a tool receives on every invocation. Carries auth info,
 * locale, and the small set of injected services tools are allowed to use.
 *
 * CRITICAL: this envelope must NEVER include secrets, tokens, private keys,
 * password hashes, or JWT material (spec §11.7 — secure context envelope).
 */
export interface ToolContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
  readonly locale: string;
  readonly requestId: string;
  /** Coarse permission summary — for analytics only, not for authz. */
  readonly permissionsSummary: readonly string[];
  /** Licensed modules for this tenant (used by tool-level entitlement checks). */
  readonly licensedModules: readonly EntitlementModule[];
  /** Current UI route the user is on (helps ui.navigateTo suggest wisely). */
  readonly currentRoute: string;

  // Injected services
  readonly prisma: PrismaService;
  readonly audit: AuditService;
  readonly redis: RedisService;
  readonly search: SearchService;
  readonly license: LicenseService;
}

// ---------------------------------------------------------------------------
// Tool result shape
// ---------------------------------------------------------------------------

/**
 * Result returned by a tool's `execute` function.
 *
 *  - `ok: true` — succeeded; `output` is the narrow summary the AI consumes.
 *    Optionally includes `citations` (filtered by user access — the caller
 *    does NOT re-filter) and `suggestedActions` (proposed follow-ups).
 *  - `ok: false` — denied or failed; `reasonKey` is a localised message key
 *    the AI surfaces to the user.
 */
export type ToolResult<O = unknown> =
  | {
      readonly ok: true;
      readonly output: O;
      readonly citations?: readonly Citation[];
      readonly suggestedActions?: readonly SuggestedActionDraft[];
    }
  | {
      readonly ok: false;
      readonly reasonKey: string;
      readonly status: 'denied' | 'failed' | 'timeout';
    };

/**
 * A draft suggested action emitted by a tool. The AI service persists it as
 * an {@link AssistantAction} row with `confirmationRequired: true` for
 * sensitive actions. Destructive actions are NEVER auto-executed — only
 * suggested.
 */
export interface SuggestedActionDraft {
  readonly actionType:
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
  readonly targetType:
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
  readonly targetId: string | null;
  readonly labelKey: string;
  readonly confirmationRequired: boolean;
  readonly destructive: boolean;
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

/**
 * Static + runtime definition of a whitelisted AI tool.
 *
 * `inputSchema` and `outputSchema` are JSON Schema blobs the client renders;
 * the server validates input with the concrete Zod schema (`inputZod`).
 */
export interface ToolDefinition<I = unknown, O = unknown> {
  readonly name: ToolName;
  readonly descriptionKey: string;
  readonly requiredPermission: string;
  readonly requiredLicenseModule: EntitlementModule | null;
  /** True if the tool mutates state (drives confirmation UX). */
  readonly mutates: boolean;
  readonly rateLimitPerMinute: number;
  /** JSON Schema blob the client renders. */
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  /** Concrete Zod schema the server uses to validate input. */
  readonly inputZod: z.ZodType<I, z.ZodTypeDef, any>;
  /**
   * Execute the tool. The caller (AiService) is responsible for:
   *   - verifying the user has `requiredPermission` (or one of its aliases);
   *   - verifying `requiredLicenseModule` is in `ctx.licensedModules`;
   *   - writing the {@link AssistantToolInvocation} audit row.
   * The tool itself MUST additionally enforce tenant isolation and
   * data-minimisation (spec §11.5, §11.10).
   */
  execute: (input: I, ctx: ToolContext) => Promise<ToolResult<O>>;
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

import { documentsSearchTool } from './tools/documents-search';
import { documentsSummaryTool } from './tools/documents-summary';
import { documentsGetMetadataTool } from './tools/documents-metadata';
import { documentsGetVersionsTool } from './tools/documents-versions';
import { documentsGetLockStateTool } from './tools/documents-lock-state';
import { workflowsStatusTool } from './tools/workflows-status';
import { workflowsPendingApprovalsTool } from './tools/workflows-pending-approvals';
import { auditRecentTool } from './tools/audit-recent';
import { retentionUpcomingExpiryTool } from './tools/retention-expiry';
import { legalHoldStatusTool } from './tools/legal-hold-status';
import { licenseStatusTool } from './tools/license-status';
import { helpSearchTool } from './tools/help-search';
import { uiNavigateTool } from './tools/ui-navigate';
import { tourStartTool } from './tools/tour-start';
import { adminHealthTool } from './tools/admin-health';
import { adminSystemUsageTool } from './tools/admin-system-usage';

/**
 * Ordered registry of all 16 AI tools. The order is fixed for stable
 * iteration in `GET /v1/ai/assistant/tools`.
 */
export const TOOL_REGISTRY: readonly ToolDefinition<any, any>[] = [
  documentsSearchTool,
  documentsSummaryTool,
  documentsGetMetadataTool,
  documentsGetVersionsTool,
  documentsGetLockStateTool,
  workflowsStatusTool,
  workflowsPendingApprovalsTool,
  auditRecentTool,
  retentionUpcomingExpiryTool,
  legalHoldStatusTool,
  licenseStatusTool,
  helpSearchTool,
  uiNavigateTool,
  tourStartTool,
  adminHealthTool,
  adminSystemUsageTool,
] as const;

/** Map of tool name → definition for O(1) dispatch. */
const TOOL_MAP: ReadonlyMap<ToolName, ToolDefinition<any, any>> = new Map(
  TOOL_REGISTRY.map((t) => [t.name, t] as const),
);

/**
 * Look up a tool by name. Returns `undefined` for unknown tools (the caller
 * MUST refuse unknown tool calls — they are not in the whitelist).
 */
export function getToolDefinition(name: ToolName): ToolDefinition<any, any> | undefined {
  return TOOL_MAP.get(name);
}

/**
 * Authorisation check — does the user have the required permission for the
 * given tool? Permission resolution is intentionally coarse:
 *   - `'admin'` role passes every tool that requires admin-level permission;
 *   - otherwise the role must literally include the required permission
 *     string OR be one of the role codes mapped to the permission.
 *
 * `requiredPermission` strings follow the convention `<domain>:<action>` —
 * e.g. `'documents:read'`, `'workflows:read'`, `'admin:read'`. Each tool's
 * `execute` function MAY additionally enforce finer-grained checks (e.g.
 * legal-hold visibility).
 */
export function isToolAuthorized(
  tool: ToolDefinition,
  ctx: ToolContext,
  licensedModules: readonly EntitlementModule[],
): { authorized: boolean; denialReasonKey: string | null } {
  // Step 1: license module check
  if (tool.requiredLicenseModule && !licensedModules.includes(tool.requiredLicenseModule)) {
    return { authorized: false, denialReasonKey: 'errors.AI_NOT_LICENSED' };
  }

  // Step 2: role / permission check
  const roles = ctx.roles;
  if (roles.includes('admin')) {
    // Admins implicitly satisfy every permission in this catalogue.
    return { authorized: true, denialReasonKey: null };
  }

  // Map each tool's `requiredPermission` to the set of role codes that
  // satisfy it. This is intentionally permissive within each domain — the
  // tool's `execute` may still apply finer-grained checks (e.g. sensitivity
  // ceiling, legal-hold visibility).
  const satisfyingRoles = ROLES_BY_PERMISSION[tool.requiredPermission];
  if (!satisfyingRoles) {
    // Unknown permission — fail closed.
    return { authorized: false, denialReasonKey: 'errors.AI_TOOL_FORBIDDEN' };
  }
  const authorized = roles.some((r) => satisfyingRoles.includes(r));
  return {
    authorized,
    denialReasonKey: authorized ? null : 'errors.AI_TOOL_FORBIDDEN',
  };
}

/** Coarse role → permission mapping for the catalogue. */
const ROLES_BY_PERMISSION: Readonly<Record<string, readonly string[]>> = {
  'documents:read': ['admin', 'records-manager', 'compliance-officer', 'editor', 'viewer'],
  'documents:write': ['admin', 'records-manager', 'editor'],
  'workflows:read': ['admin', 'records-manager', 'compliance-officer', 'editor', 'viewer'],
  'audit:read': ['admin', 'compliance-officer', 'auditor'],
  'retention:read': ['admin', 'records-manager', 'compliance-officer'],
  'legal-hold:read': ['admin', 'records-manager', 'compliance-officer'],
  'license:read': ['admin', 'records-manager', 'compliance-officer', 'viewer'],
  'help:read': ['admin', 'records-manager', 'compliance-officer', 'auditor', 'editor', 'viewer'],
  'tour:read': ['admin', 'records-manager', 'compliance-officer', 'auditor', 'editor', 'viewer'],
  'ui:navigate': ['admin', 'records-manager', 'compliance-officer', 'auditor', 'editor', 'viewer'],
  'admin:read': ['admin'],
};

/**
 * Public shape of a tool definition returned by `GET /v1/ai/assistant/tools`.
 * Strips the `execute` function and the concrete Zod schema (server-only).
 */
export interface PublicToolDefinition {
  readonly name: ToolName;
  readonly descriptionKey: string;
  readonly requiredPermission: string;
  readonly requiredLicenseModule: EntitlementModule | null;
  readonly mutates: boolean;
  readonly rateLimitPerMinute: number;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

/**
 * Convert an internal {@link ToolDefinition} into the public shape returned
 * by the `GET /tools` endpoint. Strips the `execute` function and the
 * concrete Zod schema (server-only).
 */
export function toPublicToolDefinition(tool: ToolDefinition): PublicToolDefinition {
  return {
    name: tool.name,
    descriptionKey: tool.descriptionKey,
    requiredPermission: tool.requiredPermission,
    requiredLicenseModule: tool.requiredLicenseModule,
    mutates: tool.mutates,
    rateLimitPerMinute: tool.rateLimitPerMinute,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
  };
}
