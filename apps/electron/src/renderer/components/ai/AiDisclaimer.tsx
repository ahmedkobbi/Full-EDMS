/**
 * AI disclaimer (spec §11.12).
 *
 * Shown on EVERY assistant message and at the bottom of the chat drawer.
 * The text is intentionally short and neutral so the user is reminded that:
 *  1. The AI's output is generated — verify before relying on it.
 *  2. The assistant never auto-executes actions; the user must confirm.
 *
 * The disclaimer is rendered as a small Alert with an info icon so it
 * reads as guidance rather than an error.
 */
import { Alert, Text } from '@mantine/core';
import { IconInfoCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AiDisclaimer() {
  const { t } = useTranslation();
  return (
    <Alert
      icon={<IconInfoCircle size={14} aria-hidden="true" />}
      color="gray"
      variant="light"
      py={6}
      px="sm"
      radius="sm"
      role="note"
      aria-label={t('ai:disclaimer.title')}
    >
      <Text size="xs" c="dimmed">
        {t('ai:bubble.response.disclaimer')}
      </Text>
    </Alert>
  );
}
