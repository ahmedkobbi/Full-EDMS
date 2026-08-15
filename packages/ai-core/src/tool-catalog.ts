/**
 * @smart-edms/ai-core — framework-agnostic tool catalog (spec §11.5, §11.6).
 *
 * Re-exports the 16 tool definitions as a framework-agnostic catalog. Each
 * entry carries the tool's `name`, `descriptionKey`, `requiredPermission`,
 * `requiredLicenseModule`, and `mutates` flag — everything a client needs
 * to render the `GET /v1/ai/assistant/tools` whitelist EXCEPT the
 * `execute()` function (which is added by the backend's
 * `apps/backend/src/modules/ai/tool-catalog.ts`).
 *
 * Why split it out?
 *  - The Electron client and the License Admin panel need the catalog for
 *    UI rendering (e.g. showing which tools are licensed) but cannot
 *    import NestJS modules.
 *  - Tests can assert on the catalog shape without spinning up a backend.
 *
 * Spec ref: §11.5 (tool whitelist), §11.6 (`GET /tools`), §11.10 (data
 * minimization — tools return only summaries).
 */

import type {
  EntitlementModule,
  ToolName,
} from '@smart-edms/types';

/**
 * A single entry in the framework-agnostic tool catalog. The backend
 * composes this with an `execute()` function and the concrete Zod
 * `inputSchema` / `outputSchema`.
 */
export interface AiToolCatalogEntry {
  /** Canonical tool name (spec §11.5 whitelist). */
  readonly name: ToolName;
  /** Localised description key (e.g. `ai.tools.documents.search.description`). */
  readonly descriptionKey: string;
  /** Permission code required to invoke the tool (e.g. `documents:read`). */
  readonly requiredPermission: string;
  /** License module required, or `null` if the tool is core-only. */
  readonly requiredLicenseModule: EntitlementModule | null;
  /** Whether the tool mutates state (drives confirmation UX). */
  readonly mutates: boolean;
  /** Per-user-per-minute rate limit applied to the tool. */
  readonly rateLimitPerMinute: number;
}

/**
 * The 16 whitelisted AI tools (spec §11.5). The order is fixed for stable
 * iteration in `GET /v1/ai/assistant/tools`.
 *
 *  1.  documents.search
 *  2.  documents.getSummary
 *  3.  documents.getMetadata
 *  4.  documents.getVersions
 *  5.  documents.getLockState
 *  6.  workflows.getStatus
 *  7.  workflows.getPendingApprovals
 *  8.  audit.getRecentEvents
 *  9.  retention.getUpcomingExpiry
 * 10.  legalHold.getStatus
 * 11.  license.getStatus
 * 12.  help.searchDocumentation
 * 13.  ui.navigateTo
 * 14.  tour.start
 * 15.  admin.getHealth
 * 16.  admin.getSystemUsage
 *
 * Destructive tools are NOT in this catalog. Destructive actions are
 * suggested to the user via `AssistantSuggestedAction` and require explicit
 * confirmation in a dedicated UI flow (spec §11.4 — see
 * `./destructive-actions.ts`).
 */
export const AI_TOOL_CATALOG: readonly AiToolCatalogEntry[] = [
  {
    name: 'documents.search',
    descriptionKey: 'ai.tools.documents.search.description',
    requiredPermission: 'documents:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 30,
  },
  {
    name: 'documents.getSummary',
    descriptionKey: 'ai.tools.documents.getSummary.description',
    requiredPermission: 'documents:read',
    requiredLicenseModule: 'ai-assistant',
    mutates: false,
    rateLimitPerMinute: 20,
  },
  {
    name: 'documents.getMetadata',
    descriptionKey: 'ai.tools.documents.getMetadata.description',
    requiredPermission: 'documents:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 30,
  },
  {
    name: 'documents.getVersions',
    descriptionKey: 'ai.tools.documents.getVersions.description',
    requiredPermission: 'documents:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 30,
  },
  {
    name: 'documents.getLockState',
    descriptionKey: 'ai.tools.documents.getLockState.description',
    requiredPermission: 'documents:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 30,
  },
  {
    name: 'workflows.getStatus',
    descriptionKey: 'ai.tools.workflows.getStatus.description',
    requiredPermission: 'workflows:read',
    requiredLicenseModule: 'bpmn',
    mutates: false,
    rateLimitPerMinute: 20,
  },
  {
    name: 'workflows.getPendingApprovals',
    descriptionKey: 'ai.tools.workflows.getPendingApprovals.description',
    requiredPermission: 'workflows:read',
    requiredLicenseModule: 'bpmn',
    mutates: false,
    rateLimitPerMinute: 20,
  },
  {
    name: 'audit.getRecentEvents',
    descriptionKey: 'ai.tools.audit.getRecentEvents.description',
    requiredPermission: 'audit:read',
    requiredLicenseModule: 'audit-export',
    mutates: false,
    rateLimitPerMinute: 10,
  },
  {
    name: 'retention.getUpcomingExpiry',
    descriptionKey: 'ai.tools.retention.getUpcomingExpiry.description',
    requiredPermission: 'retention:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 10,
  },
  {
    name: 'legalHold.getStatus',
    descriptionKey: 'ai.tools.legalHold.getStatus.description',
    requiredPermission: 'legal-hold:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 10,
  },
  {
    name: 'license.getStatus',
    descriptionKey: 'ai.tools.license.getStatus.description',
    requiredPermission: 'license:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 10,
  },
  {
    name: 'help.searchDocumentation',
    descriptionKey: 'ai.tools.help.searchDocumentation.description',
    requiredPermission: 'help:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 30,
  },
  {
    name: 'ui.navigateTo',
    descriptionKey: 'ai.tools.ui.navigateTo.description',
    requiredPermission: 'ui:navigate',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 20,
  },
  {
    name: 'tour.start',
    descriptionKey: 'ai.tools.tour.start.description',
    requiredPermission: 'tour:read',
    requiredLicenseModule: 'guided-tour-analytics',
    mutates: false,
    rateLimitPerMinute: 10,
  },
  {
    name: 'admin.getHealth',
    descriptionKey: 'ai.tools.admin.getHealth.description',
    requiredPermission: 'admin:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 5,
  },
  {
    name: 'admin.getSystemUsage',
    descriptionKey: 'ai.tools.admin.getSystemUsage.description',
    requiredPermission: 'admin:read',
    requiredLicenseModule: null,
    mutates: false,
    rateLimitPerMinute: 5,
  },
] as const;

/**
 * Coarse role → permission mapping used by `isToolAuthorized` for the
 * catalog. The backend's `tool-catalog.ts` may override this with a more
 * granular check; this is the fallback for non-backend consumers (e.g. the
 * License Admin panel previewing which tools a role would unlock).
 */
export const ROLES_BY_PERMISSION: Readonly<Record<string, readonly string[]>> = {
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

/** Type of the role-permission map (handy for typed overrides). */
export type AiToolCatalogPermissionMap = typeof ROLES_BY_PERMISSION;

/**
 * Coarse authorization check: does the user (with the given roles + licensed
 * modules) pass the catalog-level gate for the given tool? The backend's
 * `tool-catalog.ts` performs the authoritative check inside each tool's
 * `execute()`; this is the framework-agnostic preview used by UIs that
 * render the tool whitelist.
 *
 * `admin` implicitly satisfies every permission in the catalog (but the
 * license-module check is still enforced).
 */
export function isToolAuthorized(
  tool: AiToolCatalogEntry,
  roles: readonly string[],
  licensedModules: readonly EntitlementModule[],
): { authorized: boolean; denialReasonKey: string | null } {
  if (
    tool.requiredLicenseModule &&
    !licensedModules.includes(tool.requiredLicenseModule)
  ) {
    return { authorized: false, denialReasonKey: 'errors.AI_NOT_LICENSED' };
  }
  if (roles.includes('admin')) {
    return { authorized: true, denialReasonKey: null };
  }
  const satisfyingRoles = ROLES_BY_PERMISSION[tool.requiredPermission];
  if (!satisfyingRoles) {
    return { authorized: false, denialReasonKey: 'errors.AI_TOOL_FORBIDDEN' };
  }
  const authorized = roles.some((r) => satisfyingRoles.includes(r));
  return {
    authorized,
    denialReasonKey: authorized ? null : 'errors.AI_TOOL_FORBIDDEN',
  };
}
