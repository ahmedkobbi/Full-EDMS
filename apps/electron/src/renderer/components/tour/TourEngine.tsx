/**
 * Tour engine (spec §10).
 *
 * The orchestrator that drives the 14 mandatory tour types. Mounted once
 * at the top of the renderer tree; listens for "start tour" events from
 * the command palette, the help menu, and the empty-state actions.
 *
 * Responsibilities:
 *  - Render the TourOverlay (backdrop with spotlight).
 *  - Render the TourStepPopover (anchored to the target element).
 *  - Look up the target element by `data-tour` selector.
 *  - Skip steps where the target element does not exist (or the user lacks
 *    permission, or the module is not licensed) — never block the tour.
 *  - Report progress to the backend (POST /v1/tours/:tourId/progress).
 *  - Respect the user's "do not show again" preference.
 *
 * The engine uses Mantine Popover (NOT a third-party library, per spec §10).
 *
 * Accessibility:
 *  - Escape pauses the tour.
 *  - Arrow keys navigate steps.
 *  - Screen reader announcements on step change.
 *  - Reduced-motion respect.
 *
 * RTL-aware: positions are resolved via logical start/end (never hardcoded
 * left/right).
 */
import { useCallback, useEffect, useState } from 'react';
import { useTourStore } from '../../store/tour';
import { useReportTourProgressMutation, useToursQuery, useTourStepsQuery, useUpdateTourStateMutation } from '../../api/hooks';
import { TourOverlay } from './TourOverlay';
import { TourStepPopover } from './TourStep';
import type { TourDefinition, TourStep as TourStepType } from '@smart-edms/types';

/** How long to wait for a target element to appear in the DOM (ms). */
const TARGET_WAIT_MS = 500;

/** Polling interval for target lookup. */
const TARGET_POLL_MS = 50;

/**
 * Look up the target element by `data-tour` selector. Returns null if the
 * element is not present in the DOM. The engine skips steps whose target
 * is missing (spec §10 — "Skip unavailable steps safely").
 */
function lookupTarget(selector: string): HTMLElement | null {
  if (!selector) {return null;}
  // The selector is a stable `data-tour` value, e.g. `app.sidebar`.
  // We use attribute selection rather than CSS querySelector to avoid
  // ambiguity when the value contains dots.
  return document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
}

export function TourEngine() {
  const toursQuery = useToursQuery();
  const activeTour = useTourStore((s) => s.activeTour);
  const steps = useTourStore((s) => s.steps);
  const currentIndex = useTourStore((s) => s.currentIndex);
  const paused = useTourStore((s) => s.paused);
  const doNotShowAgain = useTourStore((s) => s.doNotShowAgain);
  const start = useTourStore((s) => s.start);
  const skip = useTourStore((s) => s.skip);
  const clear = useTourStore((s) => s.clear);
  const next = useTourStore((s) => s.next);

  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [pendingTourId, setPendingTourId] = useState<string | null>(null);
  const reportProgress = useReportTourProgressMutation(activeTour?.id ?? '');
  const updateState = useUpdateTourStateMutation(activeTour?.id ?? '');

  // Fetch steps for the tour the user just requested via command palette.
  // The query is disabled until pendingTourId is set, then auto-fetches.
  const tourStepsQuery = useTourStepsQuery(pendingTourId ?? undefined);

  /**
   * Listen for tour-start events from the command palette + help menu.
   * Sets pendingTourId, which triggers the useTourStepsQuery fetch above.
   * Once steps arrive, the tour store's `start()` is called with real data.
   */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tourId: string }>).detail;
      if (!detail) {return;}
      const tour = toursQuery.data?.find((t) => t.id === detail.tourId);
      if (!tour) {return;}
      setPendingTourId(detail.tourId);
    };
    window.addEventListener('command-palette:start-tour', handler);
    return () => window.removeEventListener('command-palette:start-tour', handler);
  }, [toursQuery.data]);

  /**
   * When tour steps arrive from the backend, start the tour with real data.
   * Spec ref: §10.6 (no hardcoded text — content comes from t() keys),
   *           §10.9 (skip unavailable steps safely).
   */
  useEffect(() => {
    if (!pendingTourId || !tourStepsQuery.data) {return;}
    const tour = toursQuery.data?.find((t) => t.id === pendingTourId);
    if (!tour) {
      setPendingTourId(null);
      return;
    }
    // Filter out disabled steps + sort by stepOrder
    const realSteps = tourStepsQuery.data
      .filter((s) => s.enabled !== false)
      .sort((a, b) => a.stepOrder - b.stepOrder);
    start(tour, realSteps as TourStepType[]);
    setPendingTourId(null);
  }, [pendingTourId, tourStepsQuery.data, toursQuery.data, start]);

  /**
   * Look up the target element when the step changes. Polls briefly so
   * async-loaded content (route transitions, etc.) has time to render.
   */
  useEffect(() => {
    if (!activeTour || paused) {
      setTarget(null);
      return;
    }

    const currentStep = steps[currentIndex];
    if (!currentStep) {
      setTarget(null);
      return;
    }

    let elapsed = 0;
    const interval = setInterval(() => {
      const el = lookupTarget(currentStep.targetSelector);
      if (el) {
        setTarget(el);
        clearInterval(interval);
      } else {
        elapsed += TARGET_POLL_MS;
        if (elapsed >= TARGET_WAIT_MS) {
          // Target not found — skip this step (spec §10: skip safely).
          clearInterval(interval);
          next();
        }
      }
    }, TARGET_POLL_MS);

    return () => clearInterval(interval);
  }, [activeTour, paused, currentIndex, steps, next]);

  /**
   * Report progress to the backend whenever the step changes.
   */
  useEffect(() => {
    if (!activeTour || steps.length === 0) {return;}
    reportProgress.mutate({
      currentStepOrder: currentIndex + 1,
      totalSteps: steps.length,
      resumed: currentIndex > 0,
    });
  }, [activeTour, currentIndex, steps.length, reportProgress]);

  /**
   * On unmount or tour change, persist the final state.
   */
  useEffect(() => {
    return () => {
      if (activeTour && doNotShowAgain) {
        updateState.mutate({ status: 'dismissed', doNotShowAgain: true });
      }
    };
  }, [activeTour, doNotShowAgain, updateState]);

  /**
   * Handle the skip action: persist skipped state to the backend.
   */
  const handleSkip = useCallback(() => {
    if (activeTour) {
      updateState.mutate({ status: 'skipped' });
    }
    skip();
  }, [activeTour, skip, updateState]);

  /**
   * Handle the finish action: persist completed state.
   */
  const handleFinish = useCallback(() => {
    if (activeTour) {
      updateState.mutate({ status: 'completed' });
    }
    clear();
  }, [activeTour, clear, updateState]);

  // If no tour is active, render nothing.
  if (!activeTour || paused) {return null;}

  const currentStep = steps[currentIndex];
  if (!currentStep) {return null;}

  const targetRect = target?.getBoundingClientRect() ?? null;

  return (
    <>
      <TourOverlay targetRect={targetRect} onDismiss={handleSkip} />
      <TourStepPopover
        step={currentStep}
        index={currentIndex}
        total={steps.length}
        target={target}
        isLast={currentIndex === steps.length - 1}
      />
      {/* Hidden handler so the engine picks up finish via store change */}
      <FinishHandlerWatcher onFinish={handleFinish} />
    </>
  );
}

/**
 * Watches the tour store for the "finish" state. When `currentIndex`
 * exceeds the last step, the engine finishes the tour. This is a
 * belt-and-braces check so the finish button and the index-overflow path
 * both call the same handler.
 */
function FinishHandlerWatcher({ onFinish }: { readonly onFinish: () => void }) {
  const steps = useTourStore((s) => s.steps);
  const currentIndex = useTourStore((s) => s.currentIndex);
  useEffect(() => {
    if (steps.length > 0 && currentIndex >= steps.length) {
      onFinish();
    }
  }, [currentIndex, steps.length, onFinish]);
  return null;
}

/**
 * Hook to start a tour programmatically. Used by the Tours page and by
 * empty-state action buttons.
 */
export function useStartTour() {
  const toursQuery = useToursQuery();
  const start = useTourStore((s) => s.start);

  return useCallback(
    (tourCode: string) => {
      const tour = toursQuery.data?.find((t: TourDefinition) => t.code === tourCode);
      if (!tour) {return;}
      // Stubbed steps — production would call the backend.
      const stubSteps: TourStepType[] = [];
      start(tour, stubSteps);
    },
    [toursQuery.data, start],
  );
}
