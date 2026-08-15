/**
 * @smart-edms/tour-core
 *
 * Framework-agnostic tour engine core (spec §10). Manages:
 *  - Tour session state (start, navigate, skip, complete, dismiss).
 *  - Context-aware step filtering (permission, license, selector exists).
 *  - Progress snapshots for backend reporting (spec §10.12).
 *
 * Consumers:
 *  - `apps/electron/src/renderer/components/tour/TourEngine.tsx` — the
 *    React engine that drives the in-app overlay.
 *  - `apps/license-admin/src/components/tour/GuidedTour.tsx` — the admin
 *    panel's guided-tour runner.
 *
 * The engine is intentionally React-agnostic and HTTP-agnostic. It does NOT:
 *  - Render the popover / overlay (consumers do that with their UI stack).
 *  - Persist progress to the backend (consumers POST `getProgress()` snapshots).
 *  - Hold hardcoded copy (every step references message keys).
 *
 * Spec ref: §10 (overview), §10.9 (skip unavailable steps safely),
 * §10.11 (definition + step types), §10.13 (stable selectors),
 * §10.12 (progress reporting).
 */

export {
  TourEngine,
  type TourEngineOptions,
} from './engine';

export {
  TOUR_SELECTORS,
  type TourSelector,
} from './selectors';

export {
  type TourContext,
  type TourEngineState,
  type TourStepResolution,
  type TourProgressSnapshot,
} from './types';
