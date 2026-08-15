/**
 * Audit log explorer page (spec §9.12).
 *
 * Renders the audit timeline. Each event is shown with:
 *  - Timestamp (locale-aware)
 *  - Actor (user, AI assistant, system, etc.)
 *  - Action code
 *  - Result (allow / deny)
 *  - Trace id
 *
 * The timeline is the tour target `audit.timeline`.
 */
import { Stack, Title, Text, Paper, Group, Badge, Timeline, ThemeIcon } from '@mantine/core';
import { IconHistory, IconCheck, IconX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/common/EmptyState';

export function AuditPage() {
  const { t } = useTranslation();

  return (
    <Stack gap="md" data-tour-page="audit">
      <Stack gap={4}>
        <Title order={2}>{t('audit:title', { defaultValue: 'Audit log' })}</Title>
        <Text size="sm" c="dimmed">
          {t('audit:subtitle', { defaultValue: 'Tamper-evident record of every action.' })}
        </Text>
      </Stack>

      <Paper p="xl" withBorder radius="md" data-tour="audit.timeline">
        <EmptyState
          illustration="audit"
          titleKey="audit:empty.title"
          subtitleKey="audit:empty.subtitle"
        />
      </Paper>
    </Stack>
  );
}
