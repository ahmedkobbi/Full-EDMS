/**
 * Guided tour for the License Admin Panel (spec §12.10, §10).
 *
 * A lightweight, dependency-free tour engine that walks the admin through
 * the panel's main sections. Each step targets a `data-tour` attribute on
 * a real DOM element and renders a popover with a title + body. The tour
 * state is persisted to `localStorage` so first-time admins see it on
 * their first visit, but they can dismiss / restart it from Settings.
 *
 * Uses the `tour.license` namespace from `@smart-edms/i18n` (already
 * translated into all six mandatory locales).
 *
 * The tour is intentionally simple — no animations, no SVG masks — because
 * the panel's audience is enterprise admins who value clarity over polish.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, Group, Stack, Text, ActionIcon } from '@mantine/core';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocaleDirection } from '../../i18n/config';

const TOUR_STORAGE_KEY = 'smart-edms:admin:tour-completed';

interface TourStep {
  readonly target: string;
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly placement?: 'bottom' | 'top' | 'start' | 'end';
}

const STEPS: readonly TourStep[] = [
  {
    target: 'admin.sidebar.dashboard',
    titleKey: 'tour.license:step.overview.title',
    bodyKey: 'tour.license:step.overview.body',
    placement: 'end',
  },
  {
    target: 'admin.sidebar.customers',
    titleKey: 'admin:tour.customers.title',
    bodyKey: 'admin:tour.customers.body',
    placement: 'end',
  },
  {
    target: 'admin.sidebar.licenses',
    titleKey: 'admin:tour.licenses.title',
    bodyKey: 'admin:tour.licenses.body',
    placement: 'end',
  },
  {
    target: 'admin.sidebar.offlineActivations',
    titleKey: 'admin:tour.offlineActivations.title',
    bodyKey: 'admin:tour.offlineActivations.body',
    placement: 'end',
  },
  {
    target: 'admin.sidebar.signingKeys',
    titleKey: 'admin:tour.signingKeys.title',
    bodyKey: 'admin:tour.signingKeys.body',
    placement: 'end',
  },
  {
    target: 'admin.sidebar.audit',
    titleKey: 'admin:tour.audit.title',
    bodyKey: 'admin:tour.audit.body',
    placement: 'end',
  },
  {
    target: 'admin.topbar.title',
    titleKey: 'admin:tour.topbar.title',
    bodyKey: 'admin:tour.topbar.body',
    placement: 'bottom',
  },
];

interface TourState {
  readonly active: boolean;
  readonly stepIndex: number;
}

function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  } catch {
    // Best-effort.
  }
}

function clearTourCompleted(): void {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}

function findTargetElement(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
}

function computePopoverStyle(
  targetRect: DOMRect,
  placement: NonNullable<TourStep['placement']>,
  dir: 'ltr' | 'rtl',
): CSSProperties {
  const spacing = 12;
  const popoverWidth = 360;
  const base: CSSProperties = {
    position: 'fixed',
    width: popoverWidth,
    zIndex: 1010,
  };
  if (placement === 'bottom') {
    return {
      ...base,
      top: targetRect.bottom + spacing,
      left: Math.max(spacing, Math.min(targetRect.left, window.innerWidth - popoverWidth - spacing)),
    };
  }
  if (placement === 'top') {
    return {
      ...base,
      top: Math.max(spacing, targetRect.top - 200 - spacing),
      left: Math.max(spacing, Math.min(targetRect.left, window.innerWidth - popoverWidth - spacing)),
    };
  }
  // 'start' / 'end' — place beside the target
  const horizontalStart = dir === 'ltr' ? placement === 'start' : placement === 'end';
  if (horizontalStart) {
    return {
      ...base,
      top: targetRect.top,
      left: Math.max(spacing, targetRect.right + spacing),
    };
  }
  return {
    ...base,
    top: targetRect.top,
    left: Math.max(spacing, targetRect.left - popoverWidth - spacing),
  };
}

export function GuidedTour(): React.ReactElement | null {
  const { t } = useTranslation();
  const dir = useLocaleDirection();
  const [state, setState] = useState<TourState>({ active: false, stepIndex: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Start the tour automatically on first visit (after a brief delay so the
  // shell has rendered).
  useEffect(() => {
    if (isTourCompleted()) return;
    const timer = window.setTimeout(() => {
      setState({ active: true, stepIndex: 0 });
    }, 800);
    return () => window.clearTimeout(timer);
  }, []);

  // Re-measure the target whenever the step changes or the window resizes.
  useEffect(() => {
    if (!state.active) return;
    const step = STEPS[state.stepIndex];
    if (!step) return;
    const measure = (): void => {
      const el = findTargetElement(step.target);
      if (el) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        setTargetRect(el.getBoundingClientRect());
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [state.active, state.stepIndex]);

  if (!state.active) return null;

  const step = STEPS[state.stepIndex];
  if (!step) return null;

  const isLast = state.stepIndex === STEPS.length - 1;

  const handleNext = (): void => {
    if (isLast) {
      markTourCompleted();
      setState({ active: false, stepIndex: 0 });
    } else {
      setState((s) => ({ ...s, stepIndex: s.stepIndex + 1 }));
    }
  };

  const handlePrev = (): void => {
    setState((s) => ({ ...s, stepIndex: Math.max(0, s.stepIndex - 1) }));
  };

  const handleDismiss = (): void => {
    markTourCompleted();
    setState({ active: false, stepIndex: 0 });
  };

  const popoverStyle = targetRect
    ? computePopoverStyle(targetRect, step.placement ?? 'end', dir)
    : {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 360,
        zIndex: 1010,
      };

  return createPortal(
    <>
      {/* Overlay — semi-transparent so the highlighted target is visible */}
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
        onClick={handleDismiss}
      />
      <Box
        style={popoverStyle}
        role="dialog"
        aria-labelledby="admin-tour-title"
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          p="lg"
          bg="var(--mantine-color-body)"
          style={{
            borderRadius: 'var(--mantine-radius-lg)',
            border: '1px solid var(--mantine-color-default-border)',
            boxShadow: 'var(--mantine-shadow-xl)',
          }}
        >
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="xs" c="dimmed" fw={600}>
                {t('tour.common:stepIndicator', { current: state.stepIndex + 1, total: STEPS.length })}
              </Text>
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleDismiss} aria-label={t('common:aria.close')}>
                <X size={14} aria-hidden="true" />
              </ActionIcon>
            </Group>
            <Text id="admin-tour-title" fw={700} size="lg">
              {t(step.titleKey)}
            </Text>
            <Text size="sm" c="dimmed">
              {t(step.bodyKey)}
            </Text>
            <Group justify="space-between" mt="sm">
              <Button variant="subtle" size="sm" onClick={handleDismiss}>
                {t('tour.common:skip')}
              </Button>
              <Group gap="sm">
                {state.stepIndex > 0 && (
                  <Button variant="light" size="sm" leftSection={<ArrowLeft size={14} aria-hidden="true" />} onClick={handlePrev}>
                    {t('common:action.previous')}
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} rightSection={isLast ? <Check size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}>
                  {isLast ? t('tour.common:finish') : t('common:action.next')}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Box>
      </Box>
    </>,
    document.body,
  );
}

/**
 * Restart the tour from the beginning. Called from the Settings page.
 */
export function restartTour(): void {
  clearTourCompleted();
  // Reload the page so the GuidedTour's useEffect re-runs.
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
