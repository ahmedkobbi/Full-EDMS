/**
 * Smart EDMS tour store (spec §10).
 *
 * Holds the in-progress tour state in memory. Progress is reported to the
 * backend via `POST /v1/tours/:tourId/progress` (so it survives device
 * switches) and mirrored locally for instant UI feedback.
 *
 * The store supports:
 *  - start(tourId)         — begin a tour from step 1 (or resume).
 *  - next() / previous()   — navigate steps.
 *  - skip()                — abandon the tour (status → skipped).
 *  - pause() / resume()    — pause without losing progress.
 *  - finish()              — mark complete.
 *  - restart()             — restart from step 1.
 *  - doNotShowAgain()      — dismiss permanently for this user.
 *
 * Tour content (titles, bodies) is rendered via `t()` using the message
 * keys stored on each TourStep. The store NEVER holds user-visible text —
 * only message keys.
 */
import { create } from 'zustand';
import type {
  TourDefinition,
  TourDefinitionId,
  TourStep,
  TourStepPlacement,
} from '@smart-edms/types';

interface TourStoreState {
  /** Active tour definition, or null if no tour is running. */
  activeTour: TourDefinition | null;
  /** Steps for the active tour (loaded from the backend). */
  steps: TourStep[];
  /** Index into `steps` for the current step (0-based). */
  currentIndex: number;
  /** Whether the tour is paused (overlay hidden but progress retained). */
  paused: boolean;
  /** Whether the user has requested this tour not be shown again. */
  doNotShowAgain: boolean;

  start: (tour: TourDefinition, steps: TourStep[]) => void;
  resume: (tour: TourDefinition, steps: TourStep[], fromStep: number) => void;
  next: () => void;
  previous: () => void;
  skip: () => void;
  pause: () => void;
  resumePaused: () => void;
  finish: () => void;
  restart: () => void;
  setDoNotShowAgain: () => void;
  dismiss: () => void;
  clear: () => void;
}

export const useTourStore = create<TourStoreState>((set, get) => ({
  activeTour: null,
  steps: [],
  currentIndex: 0,
  paused: false,
  doNotShowAgain: false,

  start: (tour, steps) =>
    set({
      activeTour: tour,
      steps,
      currentIndex: 0,
      paused: false,
      doNotShowAgain: false,
    }),

  resume: (tour, steps, fromStep) =>
    set({
      activeTour: tour,
      steps,
      currentIndex: Math.max(0, Math.min(fromStep, steps.length - 1)),
      paused: false,
      doNotShowAgain: false,
    }),

  next: () => {
    const { currentIndex, steps } = get();
    if (currentIndex >= steps.length - 1) {return;}
    set({ currentIndex: currentIndex + 1, paused: false });
  },

  previous: () => {
    const { currentIndex } = get();
    if (currentIndex <= 0) {return;}
    set({ currentIndex: currentIndex - 1, paused: false });
  },

  skip: () =>
    set({
      activeTour: null,
      steps: [],
      currentIndex: 0,
      paused: false,
    }),

  pause: () => set({ paused: true }),
  resumePaused: () => set({ paused: false }),

  finish: () =>
    set({
      activeTour: null,
      steps: [],
      currentIndex: 0,
      paused: false,
    }),

  restart: () => set({ currentIndex: 0, paused: false }),

  setDoNotShowAgain: () => set({ doNotShowAgain: true }),

  dismiss: () =>
    set({
      activeTour: null,
      steps: [],
      currentIndex: 0,
      paused: false,
    }),

  clear: () =>
    set({
      activeTour: null,
      steps: [],
      currentIndex: 0,
      paused: false,
      doNotShowAgain: false,
    }),
}));

/**
 * Convert a logical placement (start/end/top/bottom) into a Mantine Popover
 * position. Mantine uses physical positions (`left`/`right`) but we expose
 * logical placements to keep the tour engine RTL-safe.
 *
 * In LTR: `start` → `left`, `end` → `right`.
 * In RTL: `start` → `right`, `end` → `left`.
 *
 * The caller passes the current `dir` so we can resolve correctly.
 */
export function resolvePlacement(
  placement: TourStepPlacement,
  dir: 'ltr' | 'rtl',
): 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' {
  const startIsLeft = dir === 'ltr';
  const start = startIsLeft ? 'left' : 'right';
  const end = startIsLeft ? 'right' : 'left';

  switch (placement) {
    case 'top':
      return 'top';
    case 'bottom':
      return 'bottom';
    case 'start':
      return start;
    case 'end':
      return end;
    case 'top_start':
      return `top-${startIsLeft ? 'start' : 'end'}` as 'top-start' | 'top-end';
    case 'top_end':
      return `top-${startIsLeft ? 'end' : 'start'}` as 'top-start' | 'top-end';
    case 'bottom_start':
      return `bottom-${startIsLeft ? 'start' : 'end'}` as 'bottom-start' | 'bottom-end';
    case 'bottom_end':
      return `bottom-${startIsLeft ? 'end' : 'start'}` as 'bottom-start' | 'bottom-end';
    case 'center':
      return 'bottom';
    default:
      return 'bottom';
  }
}

export type { TourDefinitionId };
