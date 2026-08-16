/**
 * Page header — title + subtitle + actions row used at the top of every
 * admin page. Provides a consistent layout across the panel.
 */
import { type ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface PageHeaderProps {
  readonly titleKey: string;
  readonly subtitleKey?: string;
  readonly actions?: ReactNode;
  readonly tour?: string;
}

export function PageHeader({ titleKey, subtitleKey, actions, tour }: PageHeaderProps) {
  const { t } = useTranslation();
  return (
    <Group justify="space-between" align="flex-start" wrap="wrap" data-tour={tour}>
      <Stack gap={4}>
        <Title order={2}>{t(titleKey)}</Title>
        {subtitleKey && (
          <Text size="sm" c="dimmed">
            {t(subtitleKey)}
          </Text>
        )}
      </Stack>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}
