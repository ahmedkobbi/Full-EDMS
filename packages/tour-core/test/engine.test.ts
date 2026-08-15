/**
 * @smart-edms/tour-core — engine tests.
 *
 * Verifies:
 *  - `start()` sorts + filters enabled steps + sets initial index.
 *  - `next()` / `previous()` navigation.
 *  - `skip()` / `complete()` / `dismiss()` lifecycle.
 *  - `shouldShowStep()` context-aware filtering (permission, license, DOM).
 *  - `computeNextAvailableStep()` skips unavailable steps.
 *  - `getProgress()` snapshot shape + percent calculation.
 */
import { describe, it, expect } from 'vitest';
import type {
  EntitlementModule,
  ISODateString,
  TourDefinition,
  TourDefinitionId,
  TourStep,
  TourStepId,
} from '@smart-edms/types';
import { TourEngine } from '../src/index.js';
import type { TourContext } from '../src/index.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const FIXED_NOW = '2025-01-31T12:00:00.000Z' as ISODateString;

function tid(s: string): TourDefinitionId {
  return s as TourDefinitionId;
}
function sid(s: string): TourStepId {
  return s as TourStepId;
}

function makeTour(overrides: Partial<TourDefinition> = {}): TourDefinition {
  return {
    id: tid('00000000-0000-0000-0000-000000000001'),
    tenantId: 'tenant-1' as never,
    code: 'welcome',
    module: 'core',
    audience: 'end_user',
    priority: 'normal',
    version: 1,
    trigger: 'first_login',
    enabled: true,
    licenseModuleRequired: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  };
}

function makeStep(
  stepOrder: number,
  overrides: Partial<TourStep> = {},
): TourStep {
  return {
    id: sid(`00000000-0000-0000-0000-0000000000${stepOrder.toString().padStart(3, '0')}`),
    tourId: tid('00000000-0000-0000-0000-000000000001'),
    stepOrder,
    targetSelector: `app.step${stepOrder}`,
    titleKey: `tour.test.step${stepOrder}.title` as never,
    bodyKey: `tour.test.step${stepOrder}.body` as never,
    placement: 'center',
    requiresPermission: null,
    requiresLicenseModule: null,
    actionType: 'none',
    waitForEvent: null,
    enabled: true,
    ...overrides,
  };
}

function ctx(overrides: Partial<TourContext> = {}): TourContext {
  return {
    permissions: [],
    licensedModules: [],
    currentRoute: '/',
    selectorExists: () => true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TourEngine.start', () => {
  it('sets status to in_progress and records startedAt', () => {
    const engine = new TourEngine({ now: () => FIXED_NOW });
    const tour = makeTour();
    engine.start(tour, [makeStep(1), makeStep(2), makeStep(3)]);
    expect(engine.getStatus()).toBe('in_progress');
    const state = engine.getState();
    expect(state.startedAt).toBe(FIXED_NOW);
    expect(state.endedAt).toBeNull();
    expect(state.tour?.id).toBe(tour.id);
  });

  it('sorts steps by stepOrder ascending', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(3), makeStep(1), makeStep(2)]);
    const state = engine.getState();
    expect(state.steps[0]!.stepOrder).toBe(1);
    expect(state.steps[1]!.stepOrder).toBe(2);
    expect(state.steps[2]!.stepOrder).toBe(3);
  });

  it('filters out disabled steps', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [
      makeStep(1, { enabled: false }),
      makeStep(2),
      makeStep(3, { enabled: false }),
      makeStep(4),
    ]);
    expect(engine.getState().steps.length).toBe(2);
    expect(engine.getState().steps[0]!.stepOrder).toBe(2);
    expect(engine.getState().steps[1]!.stepOrder).toBe(4);
  });

  it('throws if no enabled steps are provided', () => {
    const engine = new TourEngine();
    expect(() =>
      engine.start(makeTour(), [makeStep(1, { enabled: false })]),
    ).toThrow(/no enabled steps/);
  });

  it('sets currentIndex to 0 by default', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2)]);
    expect(engine.getCurrentStep()?.stepOrder).toBe(1);
  });
});

describe('TourEngine.next', () => {
  it('advances to the next step', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2), makeStep(3)]);
    engine.next();
    expect(engine.getCurrentStep()?.stepOrder).toBe(2);
    engine.next();
    expect(engine.getCurrentStep()?.stepOrder).toBe(3);
  });

  it('completes the tour when there are no more steps', () => {
    const engine = new TourEngine({ now: () => FIXED_NOW });
    engine.start(makeTour(), [makeStep(1), makeStep(2)]);
    engine.next();
    engine.next(); // off the end
    expect(engine.getStatus()).toBe('completed');
    expect(engine.getState().endedAt).toBe(FIXED_NOW);
    expect(engine.getCurrentStep()).toBeNull();
  });

  it('skips unavailable steps', () => {
    const engine = new TourEngine();
    // step 2 requires a permission the user does not have
    engine.start(
      makeTour(),
      [makeStep(1), makeStep(2, { requiresPermission: 'admin:read' }), makeStep(3)],
    );
    engine.next(ctx({ permissions: [] }));
    expect(engine.getCurrentStep()?.stepOrder).toBe(3);
  });

  it('is a no-op when no tour is active', () => {
    const engine = new TourEngine();
    engine.next();
    expect(engine.getStatus()).toBe('not_started');
  });
});

describe('TourEngine.previous', () => {
  it('moves back one step', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2), makeStep(3)]);
    engine.next();
    engine.next();
    expect(engine.getCurrentStep()?.stepOrder).toBe(3);
    engine.previous();
    expect(engine.getCurrentStep()?.stepOrder).toBe(2);
  });

  it('stops at index 0', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2)]);
    engine.previous();
    expect(engine.getCurrentStep()?.stepOrder).toBe(1);
  });

  it('is a no-op when no tour is active', () => {
    const engine = new TourEngine();
    engine.previous();
    expect(engine.getStatus()).toBe('not_started');
  });
});

describe('TourEngine.skip', () => {
  it('sets status to skipped and records endedAt', () => {
    const engine = new TourEngine({ now: () => FIXED_NOW });
    engine.start(makeTour(), [makeStep(1)]);
    engine.skip();
    expect(engine.getStatus()).toBe('skipped');
    expect(engine.getState().endedAt).toBe(FIXED_NOW);
  });

  it('is a no-op when no tour is active', () => {
    const engine = new TourEngine();
    engine.skip();
    expect(engine.getStatus()).toBe('not_started');
  });
});

describe('TourEngine.complete', () => {
  it('sets status to completed', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1)]);
    engine.complete();
    expect(engine.getStatus()).toBe('completed');
  });

  it('is a no-op when already completed', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1)]);
    engine.complete();
    engine.complete(); // second call should be a no-op
    expect(engine.getStatus()).toBe('completed');
  });
});

describe('TourEngine.dismiss', () => {
  it('sets status to dismissed', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1)]);
    engine.dismiss(true);
    expect(engine.getStatus()).toBe('dismissed');
    expect(engine.getState().doNotShowAgain).toBe(true);
  });

  it('defaults doNotShowAgain to false', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1)]);
    engine.dismiss();
    expect(engine.getState().doNotShowAgain).toBe(false);
  });
});

describe('TourEngine.shouldShowStep', () => {
  it('returns shouldShow=true when no constraints are set', () => {
    const engine = new TourEngine();
    const step = makeStep(1);
    const result = engine.shouldShowStep(step, ctx());
    expect(result.shouldShow).toBe(true);
    expect(result.skipReason).toBeNull();
  });

  it('returns disabled when step.enabled is false', () => {
    const engine = new TourEngine();
    const result = engine.shouldShowStep(makeStep(1, { enabled: false }), ctx());
    expect(result.shouldShow).toBe(false);
    expect(result.skipReason).toBe('disabled');
  });

  it('returns missing_permission when permission is not held', () => {
    const engine = new TourEngine();
    const step = makeStep(1, { requiresPermission: 'documents:read' });
    expect(engine.shouldShowStep(step, ctx({ permissions: [] })).shouldShow).toBe(false);
    expect(engine.shouldShowStep(step, ctx({ permissions: ['documents:read'] })).shouldShow).toBe(true);
  });

  it('returns missing_license_module when module is not licensed', () => {
    const engine = new TourEngine();
    const step = makeStep(1, { requiresLicenseModule: 'ai-assistant' as EntitlementModule });
    expect(engine.shouldShowStep(step, ctx({ licensedModules: [] })).shouldShow).toBe(false);
    expect(
      engine.shouldShowStep(step, ctx({ licensedModules: ['ai-assistant' as EntitlementModule] })).shouldShow,
    ).toBe(true);
  });

  it('returns target_not_found when selector is not in the DOM', () => {
    const engine = new TourEngine();
    const step = makeStep(1, { targetSelector: 'app.sidebar' });
    const result = engine.shouldShowStep(
      step,
      ctx({ selectorExists: (s) => s !== 'app.sidebar' }),
    );
    expect(result.shouldShow).toBe(false);
    expect(result.skipReason).toBe('target_not_found');
  });
});

describe('TourEngine.computeNextAvailableStep', () => {
  it('returns the fromIndex when that step is available', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2), makeStep(3)]);
    const idx = engine.computeNextAvailableStep(1, ctx());
    expect(idx).toBe(1);
  });

  it('skips unavailable steps and returns the next available index', () => {
    const engine = new TourEngine();
    engine.start(
      makeTour(),
      [
        makeStep(1),
        makeStep(2, { requiresPermission: 'admin:read' }),
        makeStep(3, { requiresPermission: 'admin:read' }),
        makeStep(4),
      ],
    );
    const idx = engine.computeNextAvailableStep(1, ctx({ permissions: [] }));
    expect(idx).toBe(3);
  });

  it('returns -1 when no step is available', () => {
    const engine = new TourEngine();
    engine.start(
      makeTour(),
      [makeStep(1), makeStep(2, { requiresPermission: 'admin:read' })],
    );
    const idx = engine.computeNextAvailableStep(1, ctx({ permissions: [] }));
    expect(idx).toBe(-1);
  });

  it('returns -1 when fromIndex is past the end', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2)]);
    const idx = engine.computeNextAvailableStep(5, ctx());
    expect(idx).toBe(-1);
  });

  it('clamps negative fromIndex to 0', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2)]);
    const idx = engine.computeNextAvailableStep(-5, ctx());
    expect(idx).toBe(0);
  });
});

describe('TourEngine.getProgress', () => {
  it('returns null when no tour is active', () => {
    const engine = new TourEngine();
    expect(engine.getProgress()).toBeNull();
  });

  it('reports 1-based currentStepOrder and percent', () => {
    const engine = new TourEngine({ now: () => FIXED_NOW });
    engine.start(makeTour(), [makeStep(1), makeStep(2), makeStep(3), makeStep(4)]);
    // currentIndex = 0 → step 1
    let p = engine.getProgress()!;
    expect(p.currentStepOrder).toBe(1);
    expect(p.totalSteps).toBe(4);
    expect(p.percent).toBe(25);
    expect(p.tourId).toBe('00000000-0000-0000-0000-000000000001');
    expect(p.resumed).toBe(false);
    expect(p.updatedAt).toBe(FIXED_NOW);

    engine.next();
    p = engine.getProgress()!;
    expect(p.currentStepOrder).toBe(2);
    expect(p.percent).toBe(50);
    expect(p.resumed).toBe(true);
  });

  it('clamps percent to [0, 100]', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1)]);
    expect(engine.getProgress()!.percent).toBe(100);
  });
});

describe('TourEngine.reset', () => {
  it('restores the initial state', () => {
    const engine = new TourEngine();
    engine.start(makeTour(), [makeStep(1), makeStep(2)]);
    engine.next();
    engine.reset();
    expect(engine.getStatus()).toBe('not_started');
    expect(engine.getState().tour).toBeNull();
    expect(engine.getState().steps.length).toBe(0);
    expect(engine.getCurrentStep()).toBeNull();
  });
});
