/**
 * ErrorState — friendly error display with retry button (spec §17, §19).
 *
 * Accepts an `error` of `unknown` so callers can pass axios / fetch errors
 * directly. The component projects the error to a localised message key
 * via the optional `toMessageKey` callback (consumers can plug in their
 * `ApiError` mapper); the default behaviour surfaces a generic
 * `'common:error.title'` + `'common:error.unknown'`.
 *
 * RTL-aware: the icon and text are centered; the retry button uses logical
 * `marginInlineStart` so it appears on the correct side in RTL.
 */

import { type ReactElement, type ReactNode, useCallback } from 'react';
import { Stack, Text, Group, Button, Box } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Props for {@link ErrorState}. */
export interface ErrorStateProps {
  /** The error. Accepts `unknown` so callers can pass axios errors directly. */
  readonly error: unknown;
  /** Optional retry callback. If provided, a Retry button is shown. */
  readonly onRetry?: () => void;
  /** Optional title override (translation key). Default `'common:error.title'`. */
  readonly titleKey?: string;
  /** Optional message override (translation key). Default `'common:error.unknown'`. */
  readonly messageKey?: string;
  /**
   * Optional mapper from the raw error to a localised message key. If
   * provided, the mapped key is used in preference to `messageKey`.
   */
  readonly toMessageKey?: (error: unknown) => string | null;
  /** Optional children rendered below the message (e.g. expandable details). */
  readonly children?: ReactNode;
  /** Extra CSS class name(s) applied to the root element. */
  readonly className?: string;
}

/**
 * Default error → message-key mapper. Returns `null` (no override) so the
 * component falls back to `common:error.unknown`.
 */
function defaultToMessageKey(error: unknown): string | null {
  if (error && typeof error === 'object' && 'messageKey' in error) {
    const mk = (error as { messageKey: unknown }).messageKey;
    if (typeof mk === 'string' && mk.length > 0) return mk;
  }
  return null;
}

/**
 * Render a friendly error state. The component is accessible: it sets
 * `role="alert"` and `aria-live="assertive"` so screen readers announce
 * the error immediately.
 *
 * @example
 *   <ErrorState error={axiosError} onRetry={refetch} />
 */
export function ErrorState({
  error,
  onRetry,
  titleKey,
  messageKey,
  toMessageKey = defaultToMessageKey,
  children,
  className,
}: ErrorStateProps): ReactElement {
  const { t } = useTranslation();
  const resolvedTitle = titleKey ?? 'common:error.title';
  const resolvedMessage = toMessageKey(error) ?? messageKey ?? 'common:error.unknown';

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  return (
    <Stack
      align="center"
      justify="center"
      gap="md"
      py="xl"
      className={className}
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
        <AlertTriangle
          size={32}
          color="var(--mantine-color-error-filled)"
          aria-hidden="true"
        />
      </Box>
      <Stack align="center" gap={4}>
        <Text fw={600} size="lg" ta="center">
          {t(resolvedTitle)}
        </Text>
        <Text size="sm" c="dimmed" maw={480} ta="center">
          {t(resolvedMessage)}
        </Text>
      </Stack>
      {children}
      {onRetry && (
        <Group gap="sm">
          <Button variant="filled" color="brand" onClick={handleRetry}>
            {t('common:error.retry')}
          </Button>
        </Group>
      )}
    </Stack>
  );
}
