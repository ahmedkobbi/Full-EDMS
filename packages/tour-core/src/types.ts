/**
 * @smart-edms/tour-core — type definitions for the engine.
 *
 * Reuses `TourDefinition`, `TourStep`, `TourStatus` from `@smart-edms/types`
 * (spec §10.11) and adds engine-specific types:
 *  - `TourContext` — runtime context used for step filtering (permissions,
 *    licensed modules, current route, selector-exists predicate).
 *  - `TourEngineState` — full state snapshot of a running engine.
 *  - `TourStepResolution` — the result of evaluating whether a step should
 *    be shown, including the reason when it is skipped.
 *  - `TourProgressSnapshot` — progress payload reported to the backend
 *    (spec §10.12).
 */

import type {
  EntitlementModule,
  TourDefinition,
  TourDefinitionId,
  TourStatus,
  TourStep,
} from '@smart-edms/types';

/**
 * Runtime context used by the engine to decide whether a step should be
 * shown. The engine receives this from the consumer (typically the React
 * layer pulls it from auth + license + DOM state).
 *
 * Fields:
 *  - `permissions` — the user's effective permission codes (e.g.
 *    `'documents:read'`, `'admin:read'`). Empty array means "no
 *    permissions" — steps with `requiresPermission` are skipped.
 *  - `licensedModules` — entitlement modules active for this tenant.
 *  - `currentRoute` — the route the user is currently on. Used by some
 *    tours to skip steps irrelevant to the current view.
 *  - `selectorExists` — predicate that returns `true` iff the DOM element
 *    matching the given `data-tour` selector is currently present. The
 *    engine uses this to skip steps whose target is not visible (spec §10.9).
 *    Default: a function that always returns `true` (no DOM available —
 *    useful for SSR / tests).
 */
export interface TourContext {
  readonly permissions: readonly string[];
  readonly licensedModules: readonly EntitlementModule[];
  readonly currentRoute: string;
  readonly selectorExists: (selector: string) => boolean;
}

/**
 * Full state snapshot of a running (or finished) tour engine. Consumers
 * subscribe to changes via the engine's `subscribe()` method or poll
 * `getState()` after each action.
 */
export interface TourEngineState {
  /** The tour being run, or `null` when no tour is active. */
  readonly tour: TourDefinition | null;
  /** The steps being run, in `stepOrder` order. */
  readonly steps: readonly TourStep[];
  /** Current step index (0-based) within `steps`. `-1` before `start()`. */
  readonly currentIndex: number;
  /** Lifecycle status. */
  readonly status: TourStatus;
  /** Whether the user has requested the tour not be shown again. */
  readonly doNotShowAgain: boolean;
  /** ISO timestamp of when the tour was started, or `null`. */
  readonly startedAt: string | null;
  /** ISO timestamp of when the tour ended, or `null`. */
  readonly endedAt: string | null;
}

/**
 * Result of evaluating whether a given step should be shown. Used internally
 * by `shouldShowStep` and `computeNextAvailableStep`; exposed so consumers
 * can introspect WHY a step was skipped (useful for analytics / debugging).
 */
export interface TourStepResolution {
  /** The step being evaluated. */
  readonly step: TourStep;
  /** Whether the step should be shown to the user. */
  readonly shouldShow: boolean;
  /**
   * The reason the step was skipped, when `shouldShow === false`.
   *  - `'disabled'` — the step's `enabled` flag is false.
   *  - `'missing_permission'` — the user lacks `step.requiresPermission`.
   *  - `'missing_license_module'` — the tenant lacks `step.requiresLicenseModule`.
   *  - `'target_not_found'` — the `data-tour` element is not in the DOM.
   *  - `'unknown'` — should never happen; defensive.
   */
  readonly skipReason:
    | 'disabled'
    | 'missing_permission'
    | 'missing_license_module'
    | 'target_not_found'
    | 'unknown'
    | null;
}

/**
 * Progress snapshot reported to the backend via
 * `POST /v1/tours/:tourId/progress` (spec §10.12). The engine exposes
 * `getProgress()` to produce this; consumers decide when to POST it.
 */
export interface TourProgressSnapshot {
  readonly tourId: TourDefinitionId;
  /** 1-based step order currently being shown. `0` if the tour hasn't started. */
  readonly currentStepOrder: number;
  /** Total steps in the tour. */
  readonly totalSteps: number;
  /** Completion percentage in the range `[0, 100]`. */
  readonly percent: number;
  /** Whether the tour was resumed from a previous session. */
  readonly resumed: boolean;
  /** ISO timestamp of the snapshot. */
  readonly updatedAt: string;
}
