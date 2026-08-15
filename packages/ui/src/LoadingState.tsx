/**
 * LoadingState — centered spinner OR skeleton loader (spec §17, §19).
 *
 * Renders a centered Mantine `Loader` with a localised status message. For
 * full-screen loading (app boot, route transitions), pass `fullScreen`.
 *
 * Skeleton loading is available via `variant="skeleton"` — used by data
 * tables and detail panels so the user sees the shape of the content
 * before it arrives.
 *
 * RTL-aware: the spinner and text are centered; the skeleton lines use
 * logical `width` percentages so they render correctly in either direction.
 */

import { type ReactElement } from 'react';
import { Loader, Stack, Text, Skeleton, type MantineColor } from '@mantine/core';
import { useTranslation } from 'react-i18next';

/** Props for {@link LoadingState}. */
export interface LoadingStateProps {
  /**
   * Translation key for the loading message. Default `'common:status.loading'`
   * (resolved via `t()` from `react-i18next`).
   */
  readonly messageKey?: string;
  /** Full-screen variant — fills the viewport. Default `false`. */
  readonly fullScreen?: boolean;
  /** Visual variant. `'spinner'` (default) or `'skeleton'`. */
  readonly variant?: 'spinner' | 'skeleton';
  /** Override the spinner color (defaults to `theme.primaryColor`). */
  readonly color?: MantineColor;
  /** Extra CSS class name(s) applied to the root element. */
  readonly className?: string;
}

/**
 * Render a loading state. The visible message is resolved via `t()` from
 * `react-i18next`; the consumer must have wired up the `common` namespace.
 *
 * @example
 *   <LoadingState />                                 // spinner + "Loading…"
 *   <LoadingState variant="skeleton" />              // skeleton lines
 *   <LoadingState fullScreen messageKey="auth:loading.session" />
 */
export function LoadingState({
  messageKey = 'common:status.loading',
  fullScreen = false,
  variant = 'spinner',
  color,
  className,
}: LoadingStateProps): ReactElement {
  const { t } = useTranslation();

  if (variant === 'skeleton') {
    return (
      <Stack
        gap="sm"
        p="md"
        className={className}
        style={fullScreen ? { minHeight: '100vh' } : undefined}
      >
        <Skeleton height={36} radius="md" />
        <Skeleton height={20} width="80%" radius="sm" />
        <Skeleton height={20} width="60%" radius="sm" />
        <Skeleton height={200} radius="md" mt="sm" />
      </Stack>
    );
  }

  return (
    <Stack
      align="center"
      justify="center"
      gap="sm"
      className={className}
      style={fullScreen ? { minHeight: '100vh' } : { minHeight: 200 }}
    >
      <Loader color={color ?? 'brand'} size="lg" />
      <Text size="sm" c="dimmed">
        {t(messageKey)}
      </Text>
    </Stack>
  );
}
