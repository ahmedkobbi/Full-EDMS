/**
 * Workflows page (spec §9.8).
 *
 * Fetches real workflow definitions + instances from the backend.
 * Shows:
 *  - Workflow definitions (templates) in a grid
 *  - Active workflow instances in a table with status + current step
 *
 * The designer canvas is the tour target `workflow.designerCanvas`.
 *
 * Spec ref: §9.8 (workflows, approvals, BPMN/CMMN/DMN).
 */
import {
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { Clock, Plus, RefreshCw, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWorkflowDefinitionsQuery, useWorkflowInstancesQuery } from '../api/hooks';
import { ErrorState } from '@smart-edms/ui';
import { EmptyState } from '@smart-edms/ui';
import { LocaleAwareDate } from '@smart-edms/ui';

export function WorkflowsPage() {
  const { t } = useTranslation();

  const definitionsQuery = useWorkflowDefinitionsQuery({ limit: 20 });
  const instancesQuery = useWorkflowInstancesQuery({ limit: 20 });

  return (
    <Stack gap="md" data-tour-page="workflows">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{t('workflow.title', { defaultValue: 'Workflows' })}</Title>
          <Text size="sm" c="dimmed">
            {t('workflow.subtitle', { defaultValue: 'Approvals, signature workflows, and BPMN/CMMN/DMN models.' })}
          </Text>
        </Stack>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => {
              definitionsQuery.refetch();
              instancesQuery.refetch();
            }}
            loading={definitionsQuery.isFetching || instancesQuery.isFetching}
          >
            {t('common:action.refresh', { defaultValue: 'RefreshCw' })}
          </Button>
          <Button leftSection={<Plus size={14} aria-hidden="true" />}>
            {t('workflow.create', { defaultValue: 'New workflow' })}
          </Button>
        </Group>
      </Group>

      <Tabs defaultValue="instances">
        <Tabs.List>
          <Tabs.Tab value="instances" leftSection={<Clock size={14} aria-hidden="true" />}>
            {t('workflow.tabs.instances', { defaultValue: 'Active instances' })}
          </Tabs.Tab>
          <Tabs.Tab value="definitions" leftSection={<Workflow size={14} aria-hidden="true" />}>
            {t('workflow.tabs.definitions', { defaultValue: 'Definitions' })}
          </Tabs.Tab>
        </Tabs.List>

        {/* Active instances tab */}
        <Tabs.Panel value="instances" pt="md">
          <Paper p="xl" withBorder radius="md" pos="relative">
            <LoadingOverlay visible={instancesQuery.isLoading} />
            {instancesQuery.isError ? (
              <ErrorState
                error={instancesQuery.error}
                titleKey="errors.INTERNAL_ERROR"
                messageKey="workflow.error.instancesLoadFailed"
                onRetry={() => instancesQuery.refetch()}
              />
            ) : !instancesQuery.data?.items || instancesQuery.data.items.length === 0 ? (
              <EmptyState
                illustration="workflow"
                titleKey="workflow.instances.empty.title"
                subtitleKey="workflow.instances.empty.subtitle"
                actions={
                  <Button leftSection={<Plus size={14} aria-hidden="true" />}>
                    {t('workflow.create', { defaultValue: 'New workflow' })}
                  </Button>
                }
              />
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('workflow.instance.status', { defaultValue: 'Status' })}</Table.Th>
                    <Table.Th>{t('workflow.instance.definition', { defaultValue: 'Workflow' })}</Table.Th>
                    <Table.Th>{t('workflow.instance.startedBy', { defaultValue: 'Started by' })}</Table.Th>
                    <Table.Th>{t('workflow.instance.startedAt', { defaultValue: 'Started' })}</Table.Th>
                    <Table.Th>{t('workflow.instance.dueAt', { defaultValue: 'Due' })}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {instancesQuery.data.items.map((instance) => {
                    const statusColor =
                      instance.status === 'completed' ? 'teal'
                      : instance.status === 'failed' || instance.status === 'cancelled' ? 'red'
                      : instance.status === 'running' ? 'blue'
                      : 'gray';
                    return (
                      <Table.Tr key={instance.id}>
                        <Table.Td>
                          <Badge size="xs" color={statusColor} variant="filled">
                            {instance.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {instance.definitionId.slice(0, 8)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{instance.initiatedBy?.slice(0, 8) ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <LocaleAwareDate value={instance.startedAt} size="xs" c="dimmed" />
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">—</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>

        {/* Definitions tab */}
        <Tabs.Panel value="definitions" pt="md">
          <Paper
            p="xl"
            withBorder
            radius="md"
            style={{ minHeight: 400 }}
            data-tour="workflow.designerCanvas"
            pos="relative"
          >
            <LoadingOverlay visible={definitionsQuery.isLoading} />
            {definitionsQuery.isError ? (
              <ErrorState
                error={definitionsQuery.error}
                titleKey="errors.INTERNAL_ERROR"
                messageKey="workflow.error.definitionsLoadFailed"
                onRetry={() => definitionsQuery.refetch()}
              />
            ) : !definitionsQuery.data?.items || definitionsQuery.data.items.length === 0 ? (
              <EmptyState
                illustration="workflow"
                titleKey="workflow.definitions.empty.title"
                subtitleKey="workflow.definitions.empty.subtitle"
                actions={
                  <Button leftSection={<Plus size={14} aria-hidden="true" />}>
                    {t('workflow.create', { defaultValue: 'New workflow' })}
                  </Button>
                }
              />
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                {definitionsQuery.data.items.map((def) => (
                  <Card key={def.id} withBorder padding="md" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <ThemeIcon size={32} radius="md" variant="light" color="grape">
                          <Workflow size={16} aria-hidden="true" />
                        </ThemeIcon>
                        <Stack gap={0}>
                          <Text fw={500} size="sm">{def.name}</Text>
                          <Text size="xs" c="dimmed">{def.modelKind}</Text>
                        </Stack>
                      </Group>
                      <Badge
                        size="xs"
                        color={def.status === 'published' ? 'teal' : def.status === 'draft' ? 'yellow' : 'gray'}
                        variant={def.status === 'published' ? 'filled' : 'light'}
                      >
                        {def.status}
                      </Badge>
                    </Group>
                    <Stack gap={4}>
                      <Badge size="xs" variant="light" w="fit-content">
                        {def.modelKind}
                      </Badge>
                      {def.aiGenerated && (
                        <Badge size="xs" color="orange" variant="light" w="fit-content">
                          {t('workflow.aiDraft', { defaultValue: 'AI draft — review required' })}
                        </Badge>
                      )}
                      <LocaleAwareDate
                        value={def.createdAt}
                        size="xs"
                        c="dimmed"
                      />
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
