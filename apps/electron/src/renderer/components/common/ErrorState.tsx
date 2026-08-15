/**
 * Error state (spec §17, §19).
 *
 * Premium error states with friendly localized messages + retry action.
 * Accepts an `ApiError` so the message can be rendered via `t(error.messageKey)`
 * (the backend always returns a stable message key, never a hardcoded string).
 */
import { type ReactNode } from 'react';
import { Stack, Text, Group, Button, Box } from '@mantine/core';
import { IconAlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiError } from '@smart-edms/types';
import { toApiError } from '../../api/client';

interface ErrorStateProps {
  /** The error. Accepts `unknown` so callers can pass axios errors directly. */
  readonly error: unknown;
  /** Optional retry callback. If provided, a "Retry" button is shown. */
  readonly onRetry?: () => void;
  /** Optional title override (translation key). */
  readonly titleKey?: string;
  /** Optional children rendered below the message (e.g. details). */
  readonly children?: ReactNode;
}

export function ErrorState({ error, onRetry, titleKey, children }: ErrorStateProps) {
  const { t } = useTranslation();
  const apiError: ApiError = toApiError(error);

  return (
    <Stack
      align="center"
      justify="center"
      gap="md"
      py="xl"
      role="alert"
      aria-live="assertive"
    >
      <Box
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--mantine-color-error-light)',
        }}
      >
        <IconAlertTriangle size={32} color="var(--mantine-color-error-filled)" aria-hidden="true" />
      </Box>
      <Stack align="center" gap={4}>
        <Text fw={600} size="lg">
          {t(titleKey ?? 'common:error.title')}
        </Text>
        <Text size="sm" c="dimmed" maw={480} ta="center">
          {t(apiError.messageKey as string, apiError.messageVars ?? {})}
        </Text>
      </Stack>
      {children}
      {onRetry && (
        <Group gap="sm">
          <Button variant="filled" color="brand" onClick={onRetry}>
            {t('common:error.retry')}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
