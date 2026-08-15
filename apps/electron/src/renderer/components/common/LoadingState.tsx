/**
 * Loading state (spec §17, §19).
 *
 * Renders a centered Mantine Loader with a localized status message.
 * For full-screen loading (app boot, route transitions), pass `fullScreen`.
 *
 * Skeleton loading is available via the `variant="skeleton"` prop — used by
 * data tables and detail panels so the user sees the shape of the content
 * before it arrives.
 */
import { Loader, Stack, Text, Skeleton, type MantineColor } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface LoadingStateProps {
  /** Translation key for the loading message (default 'common:status.loading'). */
  readonly messageKey?: string;
  /** Full-screen variant — fills the viewport. */
  readonly fullScreen?: boolean;
  /** Skeleton variant — renders a few skeleton lines instead of a spinner. */
  readonly variant?: 'spinner' | 'skeleton';
  readonly color?: MantineColor;
}

export function LoadingState({
  messageKey = 'common:status.loading',
  fullScreen = false,
  variant = 'spinner',
  color,
}: LoadingStateProps) {
  const { t } = useTranslation();

  if (variant === 'skeleton') {
    return (
      <Stack gap="sm" p="md" style={fullScreen ? { minHeight: '100vh' } : undefined}>
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
      style={fullScreen ? { minHeight: '100vh' } : { minHeight: 200 }}
    >
      <Loader color={color ?? 'brand'} size="lg" />
      <Text size="sm" c="dimmed">
        {t(messageKey)}
      </Text>
    </Stack>
  );
}
