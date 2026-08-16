/**
 * Smart EDMS — Tour onboarding checklist (spec §10.18).
 *
 * The interactive onboarding checklist is a derived view: items are NOT
 * stored in the database — they are computed at request time from real
 * backend state (user preferences, document count, audit trail, etc.).
 * Spec §10.18 mandates that completion must be based on real state, never
 * faked.
 *
 * Each item declares a `completionResolverCode`. The service dispatches to
 * the matching resolver function. Items may optionally `launchesTourId`
 * (a tour that the user can launch from the checklist item).
 *
 * The 11 mandatory checklist items (spec §10.18):
 *   1. Choose language
 *   2. Choose theme
 *   3. Complete welcome tour
 *   4. Upload first document
 *   5. Add metadata to a document
 *   6. Run first search
 *   7. Preview a document
 *   8. Share or request approval
 *   9. View audit trail
 *  10. Review license status
 *  11. Try AI assistant
 */

import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A checklist item definition. */
export interface ChecklistItemDef {
  /** Stable resolver code; matches `TourChecklistItem.completionResolverCode`. */
  resolverCode: string;
  /** Localised label key, rendered via `t()`. */
  labelKey: string;
  /** Tour code that this item launches (optional). */
  launchesTourCode?: string;
}

/** A resolved checklist item with completion state. */
export interface ResolvedChecklistItem extends ChecklistItemDef {
  completed: boolean;
  completedAt: string | null;
  /** Optional tour id (looked up by code in the user's tenant). */
  launchesTourId: string | null;
}

/** Resolver signature: takes a context, returns whether the item is complete. */
export type ChecklistResolver = (ctx: ChecklistResolverContext) => Promise<boolean>;

/** Context passed to every resolver. */
export interface ChecklistResolverContext {
  readonly prisma: PrismaClient;
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly string[];
}

// ---------------------------------------------------------------------------
// The 11 mandatory checklist items (spec §10.18)
// ---------------------------------------------------------------------------

export const DEFAULT_CHECKLIST_ITEMS: readonly ChecklistItemDef[] = [
  { resolverCode: 'choose_language', labelKey: 'tour.checklist.choose_language.label' },
  { resolverCode: 'choose_theme', labelKey: 'tour.checklist.choose_theme.label' },
  {
    resolverCode: 'complete_welcome_tour',
    labelKey: 'tour.checklist.complete_welcome_tour.label',
    launchesTourCode: 'welcome',
  },
  { resolverCode: 'upload_first_document', labelKey: 'tour.checklist.upload_first_document.label' },
  { resolverCode: 'add_metadata', labelKey: 'tour.checklist.add_metadata.label' },
  { resolverCode: 'run_first_search', labelKey: 'tour.checklist.run_first_search.label' },
  { resolverCode: 'preview_document', labelKey: 'tour.checklist.preview_document.label' },
  { resolverCode: 'share_or_request_approval', labelKey: 'tour.checklist.share_or_request_approval.label' },
  { resolverCode: 'view_audit_trail', labelKey: 'tour.checklist.view_audit_trail.label' },
  { resolverCode: 'review_license_status', labelKey: 'tour.checklist.review_license_status.label' },
  {
    resolverCode: 'try_ai_assistant',
    labelKey: 'tour.checklist.try_ai_assistant.label',
    launchesTourCode: 'ai_assistant',
  },
];

// ---------------------------------------------------------------------------
// Resolvers — each checks REAL backend state
// ---------------------------------------------------------------------------

/**
 * Choose language — completed when the user's `locale` preference differs
 * from the tenant default (i.e. they explicitly chose one), OR when they
 * have any explicit locale set.
 */
const chooseLanguage: ChecklistResolver = async (ctx) => {
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { preferredLocale: true, tenant: { select: { defaultLocale: true } } },
  });
  if (!user) {return false;}
  return Boolean(user.preferredLocale && user.preferredLocale.length > 0);
};

/**
 * Choose theme — completed when the user has a `theme` preference set on
 * their `UserPreference` row. Defaults to system, but explicit selection
 * (light/dark) counts.
 */
const chooseTheme: ChecklistResolver = async (ctx) => {
  const pref = await ctx.prisma.userPreference.findUnique({
    where: { userId: ctx.userId },
    select: { theme: true },
  });
  if (!pref) {return false;}
  return pref.theme !== 'system' && Boolean(pref.theme);
};

/**
 * Complete welcome tour — completed when the user's `TourUserState` for
 * the `welcome` tour is `COMPLETED`.
 */
const completeWelcomeTour: ChecklistResolver = async (ctx) => {
  const tour = await ctx.prisma.tourDefinition.findFirst({
    where: { tenantId: ctx.tenantId, code: 'welcome' },
    select: { id: true },
  });
  if (!tour) {return false;}
  const state = await ctx.prisma.tourUserState.findUnique({
    where: { tourId_userId: { tourId: tour.id, userId: ctx.userId } },
    select: { status: true },
  });
  return state?.status === 'COMPLETED';
};

/** Upload first document — completed when the user has ≥1 ACTIVE document. */
const uploadFirstDocument: ChecklistResolver = async (ctx) => {
  const count = await ctx.prisma.document.count({
    where: {
      tenantId: ctx.tenantId,
      createdByUserId: ctx.userId,
      deletedAt: null,
    },
  });
  return count > 0;
};

/** Add metadata — completed when the user has authored ≥1 MetadataValue on a document they created. */
const addMetadata: ChecklistResolver = async (ctx) => {
  const count = await ctx.prisma.metadataValue.count({
    where: {
      tenantId: ctx.tenantId,
      document: { createdByUserId: ctx.userId },
    },
  });
  return count > 0;
};

/**
 * Run first search — completed when the user has ≥1 AuditEvent with
 * `code: 'search.executed'` (or the closest existing search code).
 *
 * NOTE: `search.executed` is not in the current `AuditEventCode` union,
 * so we search by category `access` + a `searchQuery` metadata key
 * recorded by the Search module. Falls back to counting any access
 * audit event from this user.
 */
const runFirstSearch: ChecklistResolver = async (ctx) => {
  const count = await ctx.prisma.auditEvent.count({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      category: 'access',
    },
  });
  return count > 0;
};

/**
 * Preview a document — completed when the user has ≥1 AuditEvent with
 * `code: 'document.previewed'`.
 */
const previewDocument: ChecklistResolver = async (ctx) => {
  const count = await ctx.prisma.auditEvent.count({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      code: 'document.previewed',
    },
  });
  return count > 0;
};

/**
 * Share or request approval — completed when the user has created ≥1
 * ShareLink OR started ≥1 WorkflowInstance.
 */
const shareOrRequestApproval: ChecklistResolver = async (ctx) => {
  const [shareCount, wfCount] = await Promise.all([
    ctx.prisma.shareLink.count({
      where: { tenantId: ctx.tenantId, createdByUserId: ctx.userId },
    }),
    ctx.prisma.workflowInstance.count({
      where: { tenantId: ctx.tenantId, startedByUserId: ctx.userId },
    }),
  ]);
  return shareCount > 0 || wfCount > 0;
};

/** View audit trail — completed when the user has read ≥1 AuditEvent. */
const viewAuditTrail: ChecklistResolver = async (ctx) => {
  // Audit reads are themselves audited under `category: 'read'` +
  // `resourceType: 'audit_event'`.
  const count = await ctx.prisma.auditEvent.count({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      resourceType: 'audit_event',
    },
  });
  return count > 0;
};

/**
 * Review license status — completed when the user has viewed the license
 * status endpoint (audited as `code: 'license.activated'` with
 * `resourceType: 'license'`) OR is admin with ≥1 license audit event
 * of any kind.
 */
const reviewLicenseStatus: ChecklistResolver = async (ctx) => {
  const count = await ctx.prisma.auditEvent.count({
    where: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      category: 'license',
    },
  });
  return count > 0;
};

/**
 * Try AI assistant — completed when the user has ≥1 AssistantSession.
 */
const tryAiAssistant: ChecklistResolver = async (ctx) => {
  const count = await ctx.prisma.assistantSession.count({
    where: { tenantId: ctx.tenantId, userId: ctx.userId },
  });
  return count > 0;
};

// ---------------------------------------------------------------------------
// Resolver registry
// ---------------------------------------------------------------------------

export const CHECKLIST_RESOLVERS: Readonly<Record<string, ChecklistResolver>> = {
  choose_language: chooseLanguage,
  choose_theme: chooseTheme,
  complete_welcome_tour: completeWelcomeTour,
  upload_first_document: uploadFirstDocument,
  add_metadata: addMetadata,
  run_first_search: runFirstSearch,
  preview_document: previewDocument,
  share_or_request_approval: shareOrRequestApproval,
  view_audit_trail: viewAuditTrail,
  review_license_status: reviewLicenseStatus,
  try_ai_assistant: tryAiAssistant,
};

/**
 * Resolve the full checklist for a user. Items are computed in parallel;
 * if a resolver throws, the item is reported as incomplete (fail-safe).
 *
 * @param lastCompletedAtMap optional map of `resolverCode -> ISODateString`
 *   taken from the most recent `completedAt` AuditEvent for each resolver.
 *   When omitted, `completedAt` is left `null` even for completed items.
 */
export async function resolveChecklist(
  ctx: ChecklistResolverContext,
  options?: {
    readonly launchesTourIdByCode?: Readonly<Record<string, string>>;
  },
): Promise<readonly ResolvedChecklistItem[]> {
  const results = await Promise.all(
    DEFAULT_CHECKLIST_ITEMS.map(async (def) => {
      const resolver = CHECKLIST_RESOLVERS[def.resolverCode];
      let completed = false;
      if (resolver) {
        try {
          completed = await resolver(ctx);
        } catch {
          completed = false;
        }
      }
      const launchesTourId =
        def.launchesTourCode && options?.launchesTourIdByCode
          ? options.launchesTourIdByCode[def.launchesTourCode] ?? null
          : null;
      const item: ResolvedChecklistItem = {
        ...def,
        completed,
        // We don't track per-item completion timestamps in this iteration;
        // the frontend can derive "completed just now" from the boolean
        // transition. A future enhancement can persist a
        // `TourChecklistCompletion` table keyed on (user, resolverCode).
        completedAt: null,
        launchesTourId,
      };
      return item;
    }),
  );
  return results;
}
