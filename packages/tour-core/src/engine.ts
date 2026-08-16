/**
 * @smart-edms/tour-core — the engine (spec §10).
 *
 * The `TourEngine` class is a small, framework-agnostic state machine that
 * drives a tour through its steps. It does NOT render anything; consumers
 * (the React `TourEngine` component, the License Admin `GuidedTour` runner)
 * subscribe to state changes and render the overlay themselves.
 *
 * Responsibilities:
 *  - Hold the current tour + step + status.
 *  - `next()` / `previous()` — navigate steps, skipping unavailable ones
 *    via `computeNextAvailableStep` (spec §10.9 — skip safely).
 *  - `skip()` / `complete()` / `dismiss()` — end the tour with the
 *    appropriate `TourStatus` (`skipped`, `completed`, `dismissed`).
 *  - `shouldShowStep(step, context)` — context-aware filtering: permission,
 *    license module, selector presence (spec §10.9).
 *  - `getProgress()` — produce a `TourProgressSnapshot` for backend reporting
 *    (spec §10.12).
 *
 * The engine is REACT-INDEPENDENT. It does not call React hooks; consumers
 * can use it with `useSyncExternalStore` or any other subscription model.
 *
 * Spec ref: §10 (overview), §10.9 (skip safely), §10.11 (types),
 * §10.12 (progress), §10.13 (selectors).
 */

import type {
  TourDefinition,
  TourStatus,
  TourStep,
} from '@smart-edms/types';
import type {
  TourContext,
  TourEngineState,
  TourProgressSnapshot,
  TourStepResolution,
} from './types';

/**
 * Options for constructing a `TourEngine`.
 *
 *  - `now` — function returning the current ISO timestamp. Default:
 *    `() => new Date().toISOString()`. Override in tests for determinism.
 */
export interface TourEngineOptions {
  readonly now?: () => string;
}

/**
 * Default `TourContext`: grants no permissions, no licensed modules, no
 * current route, and reports every selector as present. Useful for tests
 * and for consumers that have not yet wired up real context.
 */
export const DEFAULT_CONTEXT: TourContext = {
  permissions: [],
  licensedModules: [],
  currentRoute: '/',
  selectorExists: () => true,
};

/** Initial state: no tour, no steps, status `not_started`. */
const INITIAL_STATE: TourEngineState = {
  tour: null,
  steps: [],
  currentIndex: -1,
  status: 'not_started',
  doNotShowAgain: false,
  startedAt: null,
  endedAt: null,
};

/**
 * Framework-agnostic tour engine. Construct one per active tour session.
 *
 * @example
 *   const engine = new TourEngine();
 *   engine.start(tourDef, sortedSteps);
 *   engine.next(context);
 *   const progress = engine.getProgress();
 */
export class TourEngine {
  private state: TourEngineState = INITIAL_STATE;
  private readonly now: () => string;

  constructor(options: TourEngineOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  // ─────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Start a tour session. Resets any previous state, sorts steps by
   * `stepOrder` ascending, filters out disabled steps, and sets the
   * current step to the first available step (after context filtering
   * via `computeNextAvailableStep`).
   *
   * @param tour   — the tour definition.
   * @param steps  — the tour's steps (will be sorted + filtered).
   * @param context — optional context for initial step resolution.
   *
   * @throws `Error` if `steps` is empty after filtering disabled steps.
   */
  start(
    tour: TourDefinition,
    steps: readonly TourStep[],
    context: TourContext = DEFAULT_CONTEXT,
  ): void {
    const enabledSteps = [...steps]
      .filter((s) => s.enabled)
      .sort((a, b) => a.stepOrder - b.stepOrder);
    if (enabledSteps.length === 0) {
      throw new Error('TourEngine.start: no enabled steps provided');
    }
    const now = this.now();
    this.state = {
      tour,
      steps: enabledSteps,
      currentIndex: 0,
      status: 'in_progress',
      doNotShowAgain: false,
      startedAt: now,
      endedAt: null,
    };
    // If the first step should not be shown, advance to the next available.
    const firstAvailable = this.computeNextAvailableStep(0, context);
    if (firstAvailable === -1) {
      // No step is available — complete the tour immediately so the engine
      // is never stuck in `in_progress` with no visible step.
      this.state = {
        ...this.state,
        currentIndex: enabledSteps.length, // off the end
        status: 'completed',
        endedAt: this.now(),
      };
    } else if (firstAvailable !== 0) {
      this.state = { ...this.state, currentIndex: firstAvailable };
    }
  }

  /**
   * Advance to the next available step. Skips steps that
   * `shouldShowStep` rejects (spec §10.9). If no further step is available,
   * calls `complete()` (the tour ends with status `completed`).
   *
   * No-op if no tour is active or if the tour is no longer `in_progress`.
   */
  next(context: TourContext = DEFAULT_CONTEXT): void {
    if (this.state.status !== 'in_progress') {return;}
    const nextIdx = this.computeNextAvailableStep(this.state.currentIndex + 1, context);
    if (nextIdx === -1) {
      this.complete();
      return;
    }
    this.state = { ...this.state, currentIndex: nextIdx };
  }

  /**
   * Navigate to the previous step. Unlike `next()`, this does NOT skip
   * unavailable steps — the user explicitly asked to go back, so we honor
   * the request even if the previous step is filtered. Stops at index 0.
   *
   * No-op if no tour is active or if the tour is no longer `in_progress`.
   */
  previous(): void {
    if (this.state.status !== 'in_progress') {return;}
    if (this.state.currentIndex <= 0) {return;}
    this.state = { ...this.state, currentIndex: this.state.currentIndex - 1 };
  }

  /**
   * End the tour with status `skipped`. Records `endedAt`. The consumer
   * is responsible for persisting the skipped status to the backend.
   */
  skip(): void {
    if (this.state.status !== 'in_progress') {return;}
    this.state = { ...this.state, status: 'skipped', endedAt: this.now() };
  }

  /**
   * End the tour with status `completed`. Records `endedAt`. The consumer
   * is responsible for persisting the completed status to the backend.
   */
  complete(): void {
    if (this.state.status !== 'in_progress') {return;}
    this.state = { ...this.state, status: 'completed', endedAt: this.now() };
  }

  /**
   * End the tour with status `dismissed`. Optionally record
   * `doNotShowAgain` (the user checked "don't show this again").
   */
  dismiss(doNotShowAgain: boolean = false): void {
    if (this.state.status !== 'in_progress') {return;}
    this.state = {
      ...this.state,
      status: 'dismissed',
      doNotShowAgain,
      endedAt: this.now(),
    };
  }

  /** Reset the engine to its initial state. Useful when reusing the instance. */
  reset(): void {
    this.state = INITIAL_STATE;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Introspection
  // ─────────────────────────────────────────────────────────────────────

  /** Return the current step, or `null` if no tour is active. */
  getCurrentStep(): TourStep | null {
    if (this.state.status !== 'in_progress') {return null;}
    return this.state.steps[this.state.currentIndex] ?? null;
  }

  /** Return a snapshot of the engine's full state. */
  getState(): TourEngineState {
    return this.state;
  }

  /** Return the current tour status. */
  getStatus(): TourStatus {
    return this.state.status;
  }

  /**
   * Return a progress snapshot suitable for `POST /v1/tours/:id/progress`
   * (spec §10.12). Returns `null` if no tour is active.
   *
   * `percent` is computed as `currentStepOrder / totalSteps * 100`,
   * clamped to `[0, 100]`.
   */
  getProgress(): TourProgressSnapshot | null {
    if (!this.state.tour) {return null;}
    const total = this.state.steps.length;
    const currentStepOrder = this.state.currentIndex + 1;
    const percent = total === 0 ? 0 : Math.min(100, Math.max(0, Math.round((currentStepOrder / total) * 100)));
    return {
      tourId: this.state.tour.id,
      currentStepOrder: Math.max(0, currentStepOrder),
      totalSteps: total,
      percent,
      resumed: this.state.currentIndex > 0,
      updatedAt: this.now(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Context-aware step filtering (spec §10.9)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Evaluate whether `step` should be shown given `context`. Returns a
   * `TourStepResolution` describing the decision and (when skipped) the
   * reason.
   *
   * A step is skipped when any of:
   *  - `step.enabled === false` (defensive — `start()` already filters these).
   *  - `step.requiresPermission` is set AND `context.permissions` does not
   *    include it.
   *  - `step.requiresLicenseModule` is set AND `context.licensedModules`
   *    does not include it.
   *  - `context.selectorExists(step.targetSelector)` returns `false`.
   */
  shouldShowStep(step: TourStep, context: TourContext): TourStepResolution {
    if (!step.enabled) {
      return { step, shouldShow: false, skipReason: 'disabled' };
    }
    if (step.requiresPermission && !context.permissions.includes(step.requiresPermission)) {
      return { step, shouldShow: false, skipReason: 'missing_permission' };
    }
    if (
      step.requiresLicenseModule &&
      !context.licensedModules.includes(step.requiresLicenseModule)
    ) {
      return { step, shouldShow: false, skipReason: 'missing_license_module' };
    }
    if (!context.selectorExists(step.targetSelector)) {
      return { step, shouldShow: false, skipReason: 'target_not_found' };
    }
    return { step, shouldShow: true, skipReason: null };
  }

  /**
   * Find the index of the next available step starting from `fromIndex`
   * (inclusive). Returns `-1` if no step in `[fromIndex, steps.length)`
   * passes `shouldShowStep`.
   *
   * Used by `next()` to skip unavailable steps safely (spec §10.9).
   */
  computeNextAvailableStep(fromIndex: number, context: TourContext): number {
    if (fromIndex < 0) {fromIndex = 0;}
    for (let i = fromIndex; i < this.state.steps.length; i++) {
      const step = this.state.steps[i];
      if (!step) {continue;}
      if (this.shouldShowStep(step, context).shouldShow) {
        return i;
      }
    }
    return -1;
  }
}
