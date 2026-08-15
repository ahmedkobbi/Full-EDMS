/**
 * Error state (spec §17, §19).
 *
 * Renders a friendly error block with a retry button. The error is rendered
 * via `t('errors:...')` using the `messageKey` from the API client's
 * `toServerError()` helper, so each Axios error is surfaced in the user's
 * locale.
 */
import { type ReactNode } from 'react';
import { Stack, Text, Button, Group, Box } from '@mantine/core';
import { TriangleAlert, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toServerError } from '../../api/client';

interface ErrorStateProps {
  readonly error: unknown;
  readonly onRetry?: () => void;
  readonly titleKey?: string;
  readonly children?: ReactNode;
}

export function ErrorState({ error, onRetry, titleKey, children }: ErrorStateProps) {
  const { t } = useTranslation();
  const serverError = toServerError(error);
  const messageKey = serverError.messageKey ?? 'errors.unknown';
  const message = serverError.message ?? t(messageKey, serverError.messageVars ?? {});

  return (
    <Stack align="center" justify="center" gap="md" py="xl">
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
        <TriangleAlert size={28} color="var(--mantine-color-error-filled)" aria-hidden="true" />
      </Box>
      <Stack align="center" gap={4}>
        <Text fw={600} size="lg">
          {t(titleKey ?? 'common:error.title')}
        </Text>
        <Text size="sm" c="dimmed" maw={480} ta="center">
          {message}
        </Text>
      </Stack>
      <Group gap="sm">
        {onRetry && (
          <Button
            variant="light"
            leftSection={<RefreshCw size={14} aria-hidden="true" />}
            onClick={onRetry}
          >
            {t('common:error.retry')}
          </Button>
        )}
        {children}
      </Group>
    </Stack>
  );
}
