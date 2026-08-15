/**
 * @smart-edms/types — guided tour system (spec §10, §10.11, §10.14)
 *
 * Purpose: model the 14 mandatory tour types, tour definitions, steps,
 * per-user state, progress, and analytics events. Tours are tenant-scoped,
 * role-based, license-aware, permission-aware, RTL-aware, and skippable.
 *
 * Hard rules:
 *  - Tour text is never stored as a primary contract; only message keys.
 *  - Tour completion state must be real (spec §10.16) — no fake completion.
 *  - Tour analytics are disableable and privacy-safe (spec §10.15).
 */

import type { ISODateString, MessageKey, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { EntitlementModule } from './license';

/** Branded tour-definition identifier. */
export type TourDefinitionId = UUID

/** Branded tour-step identifier. */
export type TourStepId = UUID

/** Branded tour-user-state identifier. */
export type TourUserStateId = UUID

/** Branded tour-analytics-event identifier. */
export type TourAnalyticsEventId = UUID

/**
 * The 14 mandatory tour codes (spec §10.2). Stable across releases.
 */
export type TourCode =
  | 'welcome'
  | 'documents'
  | 'search'
  | 'records_manager'
  | 'security_officer'
  | 'auditor'
  | 'administrator'
  | 'workflow_designer'
  | 'scanner'
  | 'license'
  | 'realtime_collaboration'
  | 'ai_assistant'
  | 'empty_state_learning'
  | 'marketing_public';

/**
 * Tour status values (spec §10.11). Stable across releases.
 */
export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'dismissed';

/**
 * Tour trigger kinds (spec §10.14). Automatic triggers must be
 * non-intrusive and configurable.
 */
export type TourTrigger =
  | 'first_login'
  | 'first_module_entry'
  | 'help_menu'
  | 'admin_invitation'
  | 'license_activation'
  | 'scanner_agent_first_detected'
  | 'workflow_designer_first_opened'
  | 'audit_explorer_first_opened'
  | 'ai_assistant_first_opened'
  | 'empty_state_action'
  | 'command_palette'
  | 'in_app_notification'
  | 'manual';

/**
 * Tour audience (spec §10.10). Drives role-based filtering.
 */
export type TourAudience =
  | 'end_user'
  | 'records_manager'
  | 'security_officer'
  | 'auditor'
  | 'tenant_admin'
  | 'workflow_designer'
  | 'it_administrator'
  | 'marketing_visitor'
  | 'all';

/** Priority used for tour ordering and conflict resolution. */
export type TourPriority = 'low' | 'normal' | 'high' | 'critical';

/** Popover placement relative to the target element. Logical, not physical, for RTL safety. */
export type TourStepPlacement =
  | 'top'
  | 'bottom'
  | 'start'
  | 'end'
  | 'top_start'
  | 'top_end'
  | 'bottom_start'
  | 'bottom_end'
  | 'center';

/** Kind of action a tour step may request from the user. */
export type TourStepActionType =
  | 'none'
  | 'click'
  | 'hover'
  | 'input'
  | 'navigate'
  | 'checklist_toggle'
  | 'wait_for_event';

/**
 * Tour definition (spec §10.11). Stable, server-owned configuration that
 * drives the client-side tour engine.
 */
export interface TourDefinition {
  readonly id: TourDefinitionId;
  readonly tenantId: TenantId;
  readonly code: TourCode;
  /** Module label key — rendered via `t()`. */
  readonly module: string;
  readonly audience: TourAudience;
  readonly priority: TourPriority;
  /** Tour content version (independent of artifact version). */
  readonly version: number;
  readonly trigger: TourTrigger;
  readonly enabled: boolean;
  /** License module that must be enabled for this tour to surface. */
  readonly licenseModuleRequired: EntitlementModule | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Tour step (spec §10.11). Targets a stable `data-tour` selector; text is
 * always referenced by message key so the client renders via `t()`.
 */
export interface TourStep {
  readonly id: TourStepId;
  readonly tourId: TourDefinitionId;
  /** Step order within the tour (1-based). */
  readonly stepOrder: number;
  /** Stable selector like `app.sidebar`, `documents.upload` (spec §10.13). */
  readonly targetSelector: string;
  /** Localised title key, rendered via `t()`. */
  readonly titleKey: MessageKey;
  /** Localised body key, rendered via `t()`. */
  readonly bodyKey: MessageKey;
  readonly placement: TourStepPlacement;
  /** Permission required for this step to surface; `null` means none. */
  readonly requiresPermission: string | null;
  /** License module required for this step to surface; `null` means none. */
  readonly requiresLicenseModule: EntitlementModule | null;
  readonly actionType: TourStepActionType;
  /** Optional event the engine should wait for before advancing. */
  readonly waitForEvent: string | null;
  readonly enabled: boolean;
}

/**
 * Per-user tour state (spec §10.11). Persisted per user and per tenant.
 */
export interface TourUserState {
  readonly id: TourUserStateId;
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly tourId: TourDefinitionId;
  readonly status: TourStatus;
  readonly currentStepId: TourStepId | null;
  readonly startedAt: ISODateString | null;
  readonly completedAt: ISODateString | null;
  readonly skippedAt: ISODateString | null;
  readonly dismissedAt: ISODateString | null;
  /** Whether the user has requested the tour not be shown again. */
  readonly doNotShowAgain: boolean;
  /** Last-updated step index, for resume support. */
  readonly lastStepOrder: number;
  readonly updatedAt: ISODateString;
}

/**
 * Tour progress payload reported by the client (spec §10.5, §10.12).
 */
export interface TourProgress {
  readonly tourId: TourDefinitionId;
  readonly currentStepOrder: number;
  readonly totalSteps: number;
  /** Estimated remaining duration in seconds, where appropriate. */
  readonly estimatedRemainingSeconds: number | null;
  /** Whether the tour was resumed from a previous session. */
  readonly resumed: boolean;
  readonly updatedAt: ISODateString;
}

/**
 * Kind of tour analytics event (spec §10.15). All events are optional and
 * disableable.
 */
export type TourAnalyticsEventKind =
  | 'started'
  | 'step_viewed'
  | 'completed'
  | 'skipped'
  | 'dismissed'
  | 'drop_off'
  | 'restarted';

/**
 * Tour analytics event (spec §10.15). Privacy-safe; respects tenant
 * privacy settings and avoids unnecessary personal data.
 */
export interface TourAnalyticsEvent {
  readonly id: TourAnalyticsEventId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly tourId: TourDefinitionId;
  readonly kind: TourAnalyticsEventKind;
  readonly stepOrder: number | null;
  /** Duration in seconds up to this event, where applicable. */
  readonly durationSeconds: number | null;
  /** Drop-off step, when `kind === 'drop_off'`. */
  readonly dropOffStep: number | null;
  readonly occurredAt: ISODateString;
}

/**
 * Interactive onboarding checklist item (spec §10.18). Completion must be
 * based on real backend state — never faked.
 */
export interface TourChecklistItem {
  readonly id: UUID;
  readonly tourId: TourDefinitionId;
  /** Localised label key. */
  readonly labelKey: MessageKey;
  /** Resolver code that the backend evaluates to determine completion. */
  readonly completionResolverCode: string;
  readonly completed: boolean;
  readonly completedAt: ISODateString | null;
  /** Optional tour to launch when the user activates this item. */
  readonly launchesTourId: TourDefinitionId | null;
}

/**
 * Tour administration payload (spec §10.21). Used by `PATCH /v1/admin/tours/:id`.
 */
export interface TourAdminUpdate {
  readonly enabled?: boolean;
  readonly priority?: TourPriority;
  readonly trigger?: TourTrigger;
  readonly audience?: TourAudience;
}
