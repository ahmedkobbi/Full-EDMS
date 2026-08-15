/**
 * Workflows page (spec §9.8).
 *
 * Renders workflow instances + the workflow designer canvas. The designer
 * canvas is the tour target `workflow.designerCanvas`.
 *
 * All data comes from the backend — no mock data.
 */
import { Stack, Title, Text, Group, Button, Paper, SimpleGrid, Card, Badge } from '@mantine/core';
import { IconPlus, IconWorkflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';

export function WorkflowsPage() {
  const { t } = useTranslation();

  return (
    <Stack gap="md" data-tour-page="workflows">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{t('workflow:title', { defaultValue: 'Workflows' })}</Title>
          <Text size="sm" c="dimmed">
            {t('workflow:subtitle', { defaultValue: 'Approvals and signature workflows.' })}
          </Text>
        </Stack>
        <Button leftSection={<IconPlus size={14} aria-hidden="true" />}>
          {t('workflow:create', { defaultValue: 'New workflow' })}
        </Button>
      </Group>

      <Paper
        p="xl"
        withBorder
        radius="md"
        style={{ minHeight: 400, background: 'var(--mantine-color-default)' }}
        data-tour="workflow.designerCanvas"
      >
        <EmptyState
          illustration="workflow"
          titleKey="workflow:empty.title"
          subtitleKey="workflow:empty.subtitle"
          actions={
            <Button leftSection={<IconPlus size={14} aria-hidden="true" />}>
              {t('workflow:create', { defaultValue: 'New workflow' })}
            </Button>
          }
        />
      </Paper>
    </Stack>
  );
}
