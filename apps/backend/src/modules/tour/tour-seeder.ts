/**
 * Smart EDMS — Tour seeder.
 *
 * Seeds the 14 default tour definitions (spec §10.2 — TourCode enum) plus
 * their step templates. Each tour has 6-12 steps with stable selectors
 * matching the `data-tour="..."` convention (spec §10.13).
 *
 * Tours are tenant-scoped: the seeder creates one row per tour per tenant
 * on first use (idempotent upsert keyed on `[tenantId, code]`).
 *
 * Critical rules:
 *  - All text is referenced by message key — the backend stores ONLY the
 *    keys (e.g. `tour.welcome.step1.title`). The frontend renders via `t()`.
 *  - Stable selectors follow the `app.<area>.<element>` pattern so the
 *    frontend can rename visible text without breaking tours.
 *  - Each tour carries an `audience` array and an optional
 *    `licenseModuleRequired` so the service can filter on role + license.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { EntitlementModule, TourCode, TourTrigger } from '@smart-edms/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One step in a default tour. The order is implied by array index. */
export interface DefaultTourStep {
  /** Stable selector, e.g. `app.sidebar.search`. Rendered as `data-tour="..."`. */
  targetSelector: string;
  /** Localised title key — frontend renders via `t()`. */
  titleKey: string;
  /** Localised body key — frontend renders via `t()`. */
  bodyKey: string;
  placement?:
    | 'top' | 'bottom' | 'start' | 'end'
    | 'top_start' | 'top_end' | 'bottom_start' | 'bottom_end'
    | 'center';
  /** Optional permission code the user must hold for this step to surface. */
  requiresPermission?: string;
  /** Optional licensed module required for this step to surface. */
  requiresLicenseModule?: EntitlementModule;
  /** Optional action the tour engine requests from the user. */
  actionType?:
    | 'none' | 'click' | 'hover' | 'input' | 'navigate'
    | 'checklist_toggle' | 'wait_for_event';
  /** Optional event the engine should wait for before advancing. */
  waitForEvent?: string;
}

/** A full default tour definition (code, audience, trigger, steps). */
export interface DefaultTour {
  code: TourCode;
  module: string;
  audience: readonly string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  trigger: TourTrigger;
  licenseModuleRequired?: EntitlementModule;
  steps: readonly DefaultTourStep[];
}

// ---------------------------------------------------------------------------
// The 14 default tours
// ---------------------------------------------------------------------------

export const DEFAULT_TOURS: readonly DefaultTour[] = [
  // 1. Welcome tour — 8 steps
  {
    code: 'welcome',
    module: 'core',
    audience: ['end_user', 'all'],
    priority: 'critical',
    trigger: 'first_login',
    steps: [
      { targetSelector: 'app.shell', titleKey: 'tour.welcome.step1.title', bodyKey: 'tour.welcome.step1.body', placement: 'center' },
      { targetSelector: 'app.sidebar', titleKey: 'tour.welcome.step2.title', bodyKey: 'tour.welcome.step2.body', placement: 'end' },
      { targetSelector: 'app.sidebar.documents', titleKey: 'tour.welcome.step3.title', bodyKey: 'tour.welcome.step3.body', actionType: 'click' },
      { targetSelector: 'app.sidebar.search', titleKey: 'tour.welcome.step4.title', bodyKey: 'tour.welcome.step4.body', actionType: 'click' },
      { targetSelector: 'app.topbar.notifications', titleKey: 'tour.welcome.step5.title', bodyKey: 'tour.welcome.step5.body', placement: 'bottom' },
      { targetSelector: 'app.topbar.profile', titleKey: 'tour.welcome.step6.title', bodyKey: 'tour.welcome.step6.body', placement: 'bottom_end' },
      { targetSelector: 'app.topbar.help', titleKey: 'tour.welcome.step7.title', bodyKey: 'tour.welcome.step7.body', actionType: 'click' },
      { targetSelector: 'app.ai.bubble', titleKey: 'tour.welcome.step8.title', bodyKey: 'tour.welcome.step8.body', requiresLicenseModule: 'ai-assistant', placement: 'top_start' },
    ],
  },

  // 2. Documents tour — 9 steps
  {
    code: 'documents',
    module: 'documents',
    audience: ['end_user', 'records_manager', 'all'],
    priority: 'high',
    trigger: 'first_module_entry',
    steps: [
      { targetSelector: 'documents.upload', titleKey: 'tour.documents.step1.title', bodyKey: 'tour.documents.step1.body', actionType: 'click' },
      { targetSelector: 'documents.list', titleKey: 'tour.documents.step2.title', bodyKey: 'tour.documents.step2.body' },
      { targetSelector: 'documents.list.row', titleKey: 'tour.documents.step3.title', bodyKey: 'tour.documents.step3.body', actionType: 'click' },
      { targetSelector: 'documents.detail.header', titleKey: 'tour.documents.step4.title', bodyKey: 'tour.documents.step4.body' },
      { targetSelector: 'documents.detail.metadata', titleKey: 'tour.documents.step5.title', bodyKey: 'tour.documents.step5.body' },
      { targetSelector: 'documents.detail.versions', titleKey: 'tour.documents.step6.title', bodyKey: 'tour.documents.step6.body' },
      { targetSelector: 'documents.detail.actions', titleKey: 'tour.documents.step7.title', bodyKey: 'tour.documents.step7.body', placement: 'bottom_start' },
      { targetSelector: 'documents.detail.share', titleKey: 'tour.documents.step8.title', bodyKey: 'tour.documents.step8.body', actionType: 'click' },
      { targetSelector: 'documents.detail.classification', titleKey: 'tour.documents.step9.title', bodyKey: 'tour.documents.step9.body' },
    ],
  },

  // 3. Search tour — 7 steps
  {
    code: 'search',
    module: 'search',
    audience: ['end_user', 'all'],
    priority: 'high',
    trigger: 'first_module_entry',
    licenseModuleRequired: 'advanced-search',
    steps: [
      { targetSelector: 'app.search.input', titleKey: 'tour.search.step1.title', bodyKey: 'tour.search.step1.body', actionType: 'input' },
      { targetSelector: 'app.search.filters', titleKey: 'tour.search.step2.title', bodyKey: 'tour.search.step2.body' },
      { targetSelector: 'app.search.filter.date', titleKey: 'tour.search.step3.title', bodyKey: 'tour.search.step3.body' },
      { targetSelector: 'app.search.filter.classification', titleKey: 'tour.search.step4.title', bodyKey: 'tour.search.step4.body' },
      { targetSelector: 'app.search.results', titleKey: 'tour.search.step5.title', bodyKey: 'tour.search.step5.body' },
      { targetSelector: 'app.search.results.row', titleKey: 'tour.search.step6.title', bodyKey: 'tour.search.step6.body', actionType: 'click' },
      { targetSelector: 'app.search.saved', titleKey: 'tour.search.step7.title', bodyKey: 'tour.search.step7.body', actionType: 'click' },
    ],
  },

  // 4. Records Manager tour — 10 steps
  {
    code: 'records_manager',
    module: 'records',
    audience: ['records_manager', 'tenant_admin'],
    priority: 'high',
    trigger: 'first_module_entry',
    steps: [
      { targetSelector: 'records.dashboard', titleKey: 'tour.records_manager.step1.title', bodyKey: 'tour.records_manager.step1.body' },
      { targetSelector: 'records.schedule.list', titleKey: 'tour.records_manager.step2.title', bodyKey: 'tour.records_manager.step2.body' },
      { targetSelector: 'records.schedule.create', titleKey: 'tour.records_manager.step3.title', bodyKey: 'tour.records_manager.step3.body', actionType: 'click' },
      { targetSelector: 'records.disposition.queue', titleKey: 'tour.records_manager.step4.title', bodyKey: 'tour.records_manager.step4.body' },
      { targetSelector: 'records.disposition.approve', titleKey: 'tour.records_manager.step5.title', bodyKey: 'tour.records_manager.step5.body', actionType: 'click' },
      { targetSelector: 'records.holds.list', titleKey: 'tour.records_manager.step6.title', bodyKey: 'tour.records_manager.step6.body' },
      { targetSelector: 'records.holds.create', titleKey: 'tour.records_manager.step7.title', bodyKey: 'tour.records_manager.step7.body', actionType: 'click' },
      { targetSelector: 'records.certificate.view', titleKey: 'tour.records_manager.step8.title', bodyKey: 'tour.records_manager.step8.body' },
      { targetSelector: 'records.reports.disposition', titleKey: 'tour.records_manager.step9.title', bodyKey: 'tour.records_manager.step9.body' },
      { targetSelector: 'records.reports.audit', titleKey: 'tour.records_manager.step10.title', bodyKey: 'tour.records_manager.step10.body' },
    ],
  },

  // 5. Security Officer tour — 8 steps
  {
    code: 'security_officer',
    module: 'security',
    audience: ['security_officer', 'tenant_admin'],
    priority: 'high',
    trigger: 'first_module_entry',
    steps: [
      { targetSelector: 'security.dashboard', titleKey: 'tour.security_officer.step1.title', bodyKey: 'tour.security_officer.step1.body' },
      { targetSelector: 'security.users.list', titleKey: 'tour.security_officer.step2.title', bodyKey: 'tour.security_officer.step2.body' },
      { targetSelector: 'security.users.suspend', titleKey: 'tour.security_officer.step3.title', bodyKey: 'tour.security_officer.step3.body', actionType: 'click' },
      { targetSelector: 'security.roles.matrix', titleKey: 'tour.security_officer.step4.title', bodyKey: 'tour.security_officer.step4.body' },
      { targetSelector: 'security.audit.trail', titleKey: 'tour.security_officer.step5.title', bodyKey: 'tour.security_officer.step5.body' },
      { targetSelector: 'security.audit.hashchain', titleKey: 'tour.security_officer.step6.title', bodyKey: 'tour.security_officer.step6.body' },
      { targetSelector: 'security.sessions.active', titleKey: 'tour.security_officer.step7.title', bodyKey: 'tour.security_officer.step7.body' },
      { targetSelector: 'security.breakglass.log', titleKey: 'tour.security_officer.step8.title', bodyKey: 'tour.security_officer.step8.body' },
    ],
  },

  // 6. Auditor tour — 7 steps
  {
    code: 'auditor',
    module: 'audit',
    audience: ['auditor', 'tenant_admin'],
    priority: 'high',
    trigger: 'audit_explorer_first_opened',
    steps: [
      { targetSelector: 'audit.explorer', titleKey: 'tour.auditor.step1.title', bodyKey: 'tour.auditor.step1.body' },
      { targetSelector: 'audit.explorer.filter', titleKey: 'tour.auditor.step2.title', bodyKey: 'tour.auditor.step2.body' },
      { targetSelector: 'audit.explorer.timeline', titleKey: 'tour.auditor.step3.title', bodyKey: 'tour.auditor.step3.body' },
      { targetSelector: 'audit.explorer.export', titleKey: 'tour.auditor.step4.title', bodyKey: 'tour.auditor.step4.body', actionType: 'click' },
      { targetSelector: 'audit.hashchain.verify', titleKey: 'tour.auditor.step5.title', bodyKey: 'tour.auditor.step5.body' },
      { targetSelector: 'audit.receipt.list', titleKey: 'tour.auditor.step6.title', bodyKey: 'tour.auditor.step6.body' },
      { targetSelector: 'audit.reports.compliance', titleKey: 'tour.auditor.step7.title', bodyKey: 'tour.auditor.step7.body' },
    ],
  },

  // 7. Administrator tour — 9 steps
  {
    code: 'administrator',
    module: 'admin',
    audience: ['tenant_admin', 'it_administrator'],
    priority: 'high',
    trigger: 'first_module_entry',
    steps: [
      { targetSelector: 'admin.dashboard', titleKey: 'tour.administrator.step1.title', bodyKey: 'tour.administrator.step1.body' },
      { targetSelector: 'admin.tenants.list', titleKey: 'tour.administrator.step2.title', bodyKey: 'tour.administrator.step2.body' },
      { targetSelector: 'admin.tenants.edit', titleKey: 'tour.administrator.step3.title', bodyKey: 'tour.administrator.step3.body', actionType: 'click' },
      { targetSelector: 'admin.users.list', titleKey: 'tour.administrator.step4.title', bodyKey: 'tour.administrator.step4.body' },
      { targetSelector: 'admin.users.invite', titleKey: 'tour.administrator.step5.title', bodyKey: 'tour.administrator.step5.body', actionType: 'click' },
      { targetSelector: 'admin.features.flags', titleKey: 'tour.administrator.step6.title', bodyKey: 'tour.administrator.step6.body' },
      { targetSelector: 'admin.branding.theme', titleKey: 'tour.administrator.step7.title', bodyKey: 'tour.administrator.step7.body' },
      { targetSelector: 'admin.integrations.list', titleKey: 'tour.administrator.step8.title', bodyKey: 'tour.administrator.step8.body' },
      { targetSelector: 'admin.health.status', titleKey: 'tour.administrator.step9.title', bodyKey: 'tour.administrator.step9.body' },
    ],
  },

  // 8. Workflow Designer tour — 8 steps
  {
    code: 'workflow_designer',
    module: 'workflow',
    audience: ['workflow_designer', 'tenant_admin'],
    priority: 'normal',
    trigger: 'workflow_designer_first_opened',
    licenseModuleRequired: 'bpmn',
    steps: [
      { targetSelector: 'workflow.designer.canvas', titleKey: 'tour.workflow_designer.step1.title', bodyKey: 'tour.workflow_designer.step1.body' },
      { targetSelector: 'workflow.designer.palette', titleKey: 'tour.workflow_designer.step2.title', bodyKey: 'tour.workflow_designer.step2.body' },
      { targetSelector: 'workflow.designer.node', titleKey: 'tour.workflow_designer.step3.title', bodyKey: 'tour.workflow_designer.step3.body', actionType: 'click' },
      { targetSelector: 'workflow.designer.properties', titleKey: 'tour.workflow_designer.step4.title', bodyKey: 'tour.workflow_designer.step4.body' },
      { targetSelector: 'workflow.designer.approver', titleKey: 'tour.workflow_designer.step5.title', bodyKey: 'tour.workflow_designer.step5.body' },
      { targetSelector: 'workflow.designer.dmn', titleKey: 'tour.workflow_designer.step6.title', bodyKey: 'tour.workflow_designer.step6.body', requiresLicenseModule: 'dmn' },
      { targetSelector: 'workflow.designer.validate', titleKey: 'tour.workflow_designer.step7.title', bodyKey: 'tour.workflow_designer.step7.body', actionType: 'click' },
      { targetSelector: 'workflow.designer.publish', titleKey: 'tour.workflow_designer.step8.title', bodyKey: 'tour.workflow_designer.step8.body', actionType: 'click' },
    ],
  },

  // 9. Scanner tour — 7 steps
  {
    code: 'scanner',
    module: 'scanner',
    audience: ['end_user', 'records_manager'],
    priority: 'normal',
    trigger: 'scanner_agent_first_detected',
    licenseModuleRequired: 'scanner-agent',
    steps: [
      { targetSelector: 'scanner.dashboard', titleKey: 'tour.scanner.step1.title', bodyKey: 'tour.scanner.step1.body' },
      { targetSelector: 'scanner.agents.list', titleKey: 'tour.scanner.step2.title', bodyKey: 'tour.scanner.step2.body' },
      { targetSelector: 'scanner.agents.register', titleKey: 'tour.scanner.step3.title', bodyKey: 'tour.scanner.step3.body', actionType: 'click' },
      { targetSelector: 'scanner.jobs.queue', titleKey: 'tour.scanner.step4.title', bodyKey: 'tour.scanner.step4.body' },
      { targetSelector: 'scanner.jobs.create', titleKey: 'tour.scanner.step5.title', bodyKey: 'tour.scanner.step5.body', actionType: 'click' },
      { targetSelector: 'scanner.ocr.profile', titleKey: 'tour.scanner.step6.title', bodyKey: 'tour.scanner.step6.body', requiresLicenseModule: 'ocr' },
      { targetSelector: 'scanner.jobs.result', titleKey: 'tour.scanner.step7.title', bodyKey: 'tour.scanner.step7.body' },
    ],
  },

  // 10. License tour — 6 steps
  {
    code: 'license',
    module: 'license',
    audience: ['tenant_admin', 'it_administrator'],
    priority: 'normal',
    trigger: 'license_activation',
    steps: [
      { targetSelector: 'license.status', titleKey: 'tour.license.step1.title', bodyKey: 'tour.license.step1.body' },
      { targetSelector: 'license.entitlements', titleKey: 'tour.license.step2.title', bodyKey: 'tour.license.step2.body' },
      { targetSelector: 'license.limits', titleKey: 'tour.license.step3.title', bodyKey: 'tour.license.step3.body' },
      { targetSelector: 'license.heartbeat', titleKey: 'tour.license.step4.title', bodyKey: 'tour.license.step4.body' },
      { targetSelector: 'license.offline.request', titleKey: 'tour.license.step5.title', bodyKey: 'tour.license.step5.body', actionType: 'click' },
      { targetSelector: 'license.import', titleKey: 'tour.license.step6.title', bodyKey: 'tour.license.step6.body', actionType: 'click' },
    ],
  },

  // 11. Real-time collaboration tour — 7 steps
  {
    code: 'realtime_collaboration',
    module: 'collaboration',
    audience: ['end_user', 'all'],
    priority: 'normal',
    trigger: 'first_module_entry',
    steps: [
      { targetSelector: 'collab.presence.indicator', titleKey: 'tour.realtime_collaboration.step1.title', bodyKey: 'tour.realtime_collaboration.step1.body' },
      { targetSelector: 'collab.cursor.list', titleKey: 'tour.realtime_collaboration.step2.title', bodyKey: 'tour.realtime_collaboration.step2.body' },
      { targetSelector: 'collab.comment.thread', titleKey: 'tour.realtime_collaboration.step3.title', bodyKey: 'tour.realtime_collaboration.step3.body', actionType: 'click' },
      { targetSelector: 'collab.comment.reply', titleKey: 'tour.realtime_collaboration.step4.title', bodyKey: 'tour.realtime_collaboration.step4.body', actionType: 'input' },
      { targetSelector: 'collab.mention', titleKey: 'tour.realtime_collaboration.step5.title', bodyKey: 'tour.realtime_collaboration.step5.body', actionType: 'input' },
      { targetSelector: 'collab.lock.state', titleKey: 'tour.realtime_collaboration.step6.title', bodyKey: 'tour.realtime_collaboration.step6.body' },
      { targetSelector: 'collab.notifications', titleKey: 'tour.realtime_collaboration.step7.title', bodyKey: 'tour.realtime_collaboration.step7.body' },
    ],
  },

  // 12. AI Assistant tour — 8 steps
  {
    code: 'ai_assistant',
    module: 'ai_assistant',
    audience: ['end_user', 'all'],
    priority: 'high',
    trigger: 'ai_assistant_first_opened',
    licenseModuleRequired: 'ai-assistant',
    steps: [
      { targetSelector: 'ai.bubble', titleKey: 'tour.ai_assistant.step1.title', bodyKey: 'tour.ai_assistant.step1.body', actionType: 'click' },
      { targetSelector: 'ai.panel.input', titleKey: 'tour.ai_assistant.step2.title', bodyKey: 'tour.ai_assistant.step2.body', actionType: 'input' },
      { targetSelector: 'ai.panel.send', titleKey: 'tour.ai_assistant.step3.title', bodyKey: 'tour.ai_assistant.step3.body', actionType: 'click' },
      { targetSelector: 'ai.panel.citations', titleKey: 'tour.ai_assistant.step4.title', bodyKey: 'tour.ai_assistant.step4.body' },
      { targetSelector: 'ai.panel.suggested_actions', titleKey: 'tour.ai_assistant.step5.title', bodyKey: 'tour.ai_assistant.step5.body' },
      { targetSelector: 'ai.panel.disclaimer', titleKey: 'tour.ai_assistant.step6.title', bodyKey: 'tour.ai_assistant.step6.body' },
      { targetSelector: 'ai.panel.history', titleKey: 'tour.ai_assistant.step7.title', bodyKey: 'tour.ai_assistant.step7.body' },
      { targetSelector: 'ai.panel.feedback', titleKey: 'tour.ai_assistant.step8.title', bodyKey: 'tour.ai_assistant.step8.body', actionType: 'click' },
    ],
  },

  // 13. Empty-state learning tour — 6 steps
  {
    code: 'empty_state_learning',
    module: 'core',
    audience: ['end_user', 'all'],
    priority: 'low',
    trigger: 'empty_state_action',
    steps: [
      { targetSelector: 'empty.state.cta', titleKey: 'tour.empty_state_learning.step1.title', bodyKey: 'tour.empty_state_learning.step1.body', actionType: 'click' },
      { targetSelector: 'empty.state.hint', titleKey: 'tour.empty_state_learning.step2.title', bodyKey: 'tour.empty_state_learning.step2.body' },
      { targetSelector: 'empty.state.tooltip', titleKey: 'tour.empty_state_learning.step3.title', bodyKey: 'tour.empty_state_learning.step3.body' },
      { targetSelector: 'empty.state.checklist', titleKey: 'tour.empty_state_learning.step4.title', bodyKey: 'tour.empty_state_learning.step4.body' },
      { targetSelector: 'empty.state.shortcuts', titleKey: 'tour.empty_state_learning.step5.title', bodyKey: 'tour.empty_state_learning.step5.body' },
      { targetSelector: 'empty.state.dismiss', titleKey: 'tour.empty_state_learning.step6.title', bodyKey: 'tour.empty_state_learning.step6.body', actionType: 'click' },
    ],
  },

  // 14. Marketing (public) tour — 6 steps
  {
    code: 'marketing_public',
    module: 'marketing',
    audience: ['marketing_visitor', 'all'],
    priority: 'low',
    trigger: 'manual',
    steps: [
      { targetSelector: 'marketing.hero', titleKey: 'tour.marketing.step1.title', bodyKey: 'tour.marketing.step1.body', placement: 'center' },
      { targetSelector: 'marketing.features', titleKey: 'tour.marketing.step2.title', bodyKey: 'tour.marketing.step2.body' },
      { targetSelector: 'marketing.screenshot', titleKey: 'tour.marketing.step3.title', bodyKey: 'tour.marketing.step3.body', actionType: 'hover' },
      { targetSelector: 'marketing.testimonials', titleKey: 'tour.marketing.step4.title', bodyKey: 'tour.marketing.step4.body' },
      { targetSelector: 'marketing.pricing', titleKey: 'tour.marketing.step5.title', bodyKey: 'tour.marketing.step5.body', actionType: 'click' },
      { targetSelector: 'marketing.cta', titleKey: 'tour.marketing.step6.title', bodyKey: 'tour.marketing.step6.body', actionType: 'click' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------

/**
 * Idempotently seed default tours for a tenant.
 *
 * For each `DefaultTour`:
 *  - Upsert the `TourDefinition` row keyed on `[tenantId, code]`.
 *  - Replace the `TourStep` rows (delete + recreate) — steps are owned by
 *    the definition, not by user state, so re-seeding is safe.
 *
 * Existing user state (`TourUserState`) is preserved across re-seeds because
 * it references the tour by id, and the upsert keeps the id stable.
 */
export async function seedDefaultTours(
  prisma: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
): Promise<{ seeded: number; updated: number }> {
  let seeded = 0;
  let updated = 0;

  for (const def of DEFAULT_TOURS) {
    const priorityRank =
      def.priority === 'critical' ? 400 :
      def.priority === 'high' ? 300 :
      def.priority === 'normal' ? 200 : 100;

    const existing = await (prisma as PrismaClient).tourDefinition.findUnique({
      where: { tenantId_code: { tenantId, code: def.code } },
      select: { id: true, version: true },
    });

    const tour = await (prisma as PrismaClient).tourDefinition.upsert({
      where: { tenantId_code: { tenantId, code: def.code } },
      create: {
        tenantId,
        code: def.code,
        module: def.module,
        audience: [...def.audience],
        priority: priorityRank,
        version: 1,
        triggerType: def.trigger,
        enabled: true,
        licenseModuleRequired: def.licenseModuleRequired ?? null,
      },
      update: {
        module: def.module,
        audience: [...def.audience],
        priority: priorityRank,
        triggerType: def.trigger,
        licenseModuleRequired: def.licenseModuleRequired ?? null,
      },
    });

    // Replace steps atomically.
    await (prisma as PrismaClient).tourStep.deleteMany({ where: { tourId: tour.id } });
    await (prisma as PrismaClient).tourStep.createMany({
      data: def.steps.map((s, idx) => ({
        tourId: tour.id,
        stepOrder: idx + 1,
        targetSelector: s.targetSelector,
        titleKey: s.titleKey,
        bodyKey: s.bodyKey,
        placement: s.placement ?? 'auto',
        requiresPermission: s.requiresPermission ?? null,
        requiresLicenseModule: s.requiresLicenseModule ?? null,
        actionType: s.actionType ?? 'none',
        waitForEvent: s.waitForEvent ?? null,
        enabled: true,
      })),
    });

    if (existing) {
      updated++;
    } else {
      seeded++;
    }
  }

  return { seeded, updated };
}
