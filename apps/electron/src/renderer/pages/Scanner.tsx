/**
 * Scanner page (spec §9.16).
 *
 * Lists scanner agent profiles. Each profile shows the scanner's name,
 * last-seen status, and configured OCR/OMR/ICR profile.
 *
 * The profiles list is the tour target `scanner.profiles`.
 */
import { Stack, Title, Text, Paper, Group, Button } from '@mantine/core';
import { IconPlus, IconScan } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/common/EmptyState';

export function ScannerPage() {
  const { t } = useTranslation();

  return (
    <Stack gap="md" data-tour-page="scanner">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{t('scanner:title', { defaultValue: 'Scanner agents' })}</Title>
          <Text size="sm" c="dimmed">
            {t('scanner:subtitle', { defaultValue: 'Manage scanner agents and OCR profiles.' })}
          </Text>
        </Stack>
        <Button leftSection={<IconPlus size={14} aria-hidden="true" />}>
          {t('scanner:addProfile', { defaultValue: 'Add scanner profile' })}
        </Button>
      </Group>

      <Paper p="xl" withBorder radius="md" data-tour="scanner.profiles">
        <EmptyState
          illustration="generic"
          titleKey="scanner:empty.title"
          subtitleKey="scanner:empty.subtitle"
        />
      </Paper>
    </Stack>
  );
}
