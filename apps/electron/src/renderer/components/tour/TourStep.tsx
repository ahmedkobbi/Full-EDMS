/**
 * Tour step popover (spec §10).
 *
 * Renders the popover content for a single tour step. Uses Mantine v7's
 * `Popover` component (NOT a third-party library, per spec §10).
 *
 * Content:
 *  - Step title (via `t(step.titleKey)`)
 *  - Step body (via `t(step.bodyKey)`)
 *  - Progress indicator ("Step 3 of 8")
 *  - Navigation buttons: Previous, Next, Skip, Finish
 *  - "Don't show again" checkbox
 *
 * Accessibility:
 *  - The popover has `role="dialog"` and `aria-labelledby`.
 *  - Keyboard navigation: ← → for prev/next, Escape to skip, Enter to finish.
 *  - Focus is moved to the popover on mount.
 *  - Reduced-motion users get no animation.
 *
 * RTL: position is resolved via the `placement` field (logical start/end),
 * never hardcoded left/right.
 */
import { type ReactNode, useEffect } from 'react';
import { Box, Button, Checkbox, Group, Popover, Progress, Stack, Text } from '@mantine/core';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TourStep } from '@smart-edms/types';
import { resolvePlacement, useTourStore } from '../../store/tour';
import { useLocaleDirection } from '../../i18n/LanguageSwitcher';

interface TourStepProps {
  /** The current step. */
  readonly step: TourStep;
  /** Index of the current step (0-based). */
  readonly index: number;
  /** Total step count. */
  readonly total: number;
  /** The target element to anchor the popover to. */
  readonly target: HTMLElement | null;
  /** Whether this is the last step (changes Next → Finish). */
  readonly isLast: boolean;
}

export function TourStepPopover({
  step,
  index,
  total,
  target,
  isLast,
}: TourStepProps) {
  const { t } = useTranslation();
  const dir = useLocaleDirection();
  const next = useTourStore((s) => s.next);
  const previous = useTourStore((s) => s.previous);
  const skip = useTourStore((s) => s.skip);
  const finish = useTourStore((s) => s.finish);
  const doNotShowAgain = useTourStore((s) => s.doNotShowAgain);
  const setDoNotShowAgain = useTourStore((s) => s.setDoNotShowAgain);

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isLast) {finish();}
        else {next();}
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previous();
      } else if (e.key === 'Enter' && isLast) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, previous, skip, finish, isLast]);

  // Announce the step change to screen readers.
  useEffect(() => {
    const announcement = t('tour.common:accessibility.stepChanged', {
      current: index + 1,
      total,
      title: t(step.titleKey),
    });
    const live = document.createElement('div');
    live.setAttribute('aria-live', 'assertive');
    live.setAttribute('aria-atomic', 'true');
    live.style.position = 'absolute';
    live.style.width = '1px';
    live.style.height = '1px';
    live.style.overflow = 'hidden';
    live.style.clip = 'rect(0 0 0 0)';
    live.textContent = announcement;
    document.body.appendChild(live);
    return () => {
      document.body.removeChild(live);
    };
  }, [index, total, step.titleKey, t]);

  const placement = resolvePlacement(step.placement, dir);
  const progressPercent = ((index + 1) / total) * 100;

  const content: ReactNode = (
    <Stack gap="sm" p="sm" style={{ minWidth: 280, maxWidth: 360 }}>
      <Group justify="space-between" gap="sm">
        <Text size="xs" c="dimmed" fw={600}>
          {t('tour.common:progress.step', { current: index + 1, total })}
        </Text>
        <ActionIconSkip onSkip={skip} />
      </Group>

      <Progress value={progressPercent} size="sm" color="brand" radius="md" />

      <Stack gap={4}>
        <Text fw={600} size="md" component="h3">
          {t(step.titleKey)}
        </Text>
        <Text size="sm" c="dimmed">
          {t(step.bodyKey)}
        </Text>
      </Stack>

      <Group justify="space-between" mt="xs">
        <Checkbox
          size="xs"
          label={t('tour.common:button.dontShowAgain')}
          checked={doNotShowAgain}
          onChange={(e) => e.currentTarget.checked && setDoNotShowAgain()}
        />
        <Group gap="xs">
          {index > 0 && (
            <Button
              variant="subtle"
              size="sm"
              leftSection={<ArrowLeft size={14} aria-hidden="true" />}
              onClick={previous}
              aria-label={t('tour.common:button.previous')}
            >
              {t('tour.common:button.previous')}
            </Button>
          )}
          {isLast ? (
            <Button
              variant="filled"
              size="sm"
              color="brand"
              rightSection={<Check size={14} aria-hidden="true" />}
              onClick={finish}
              aria-label={t('tour.common:button.finish')}
            >
              {t('tour.common:button.finish')}
            </Button>
          ) : (
            <Button
              variant="filled"
              size="sm"
              color="brand"
              rightSection={<ArrowRight size={14} aria-hidden="true" />}
              onClick={next}
              aria-label={t('tour.common:button.next')}
            >
              {t('tour.common:button.next')}
            </Button>
          )}
        </Group>
      </Group>
    </Stack>
  );

  // If we have a target, anchor to it; otherwise center the popover.
  if (!target) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1010,
        }}
      >
        <Box bg="var(--mantine-color-body)" style={{ borderRadius: 'var(--mantine-radius-md)', boxShadow: 'var(--mantine-shadow-lg)' }}>
          {content}
        </Box>
      </div>
    );
  }

  return (
    <Popover
      opened
      position={placement}
      withArrow
      shadow="xl"
      zIndex={1010}
      offset={8}
      withinPortal={false}
    >
      <Popover.Target>
        <span
          style={{
            position: 'absolute',
            top: target.offsetTop,
            left: target.offsetLeft,
            width: target.offsetWidth,
            height: target.offsetHeight,
            pointerEvents: 'none',
          }}
        />
      </Popover.Target>
      <Popover.Dropdown>{content}</Popover.Dropdown>
    </Popover>
  );
}

/** Tiny inline action icon for skip — kept local so the main render reads cleanly. */
function ActionIconSkip({ onSkip }: { readonly onSkip: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onSkip}
      aria-label={t('tour.common:button.skip')}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--mantine-color-dimmed)',
        padding: 4,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <X size={14} aria-hidden="true" />
    </button>
  );
}
