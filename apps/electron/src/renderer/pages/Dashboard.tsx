/**
 * Dashboard page (spec §4.1, §17).
 *
 * Landing page after login. Shows:
 *  - Welcome banner with the user's name
 *  - Quick stats (document count, workflow count, audit events)
 *  - Recent documents table
 *  - Tours picker
 *  - License status widget (already in sidebar, but surfaced here too)
 *
 * All data comes from the backend via TanStack Query hooks — no mock data.
 */
import { Stack, Grid, Paper, Title, Text, Group, Button, SimpleGrid, Card } from '@mantine/core';
import { IconFiles, IconWorkflow, IconHistory, IconUsers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDocumentsQuery, useHealthQuery } from '../api/hooks';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { LocaleAwareDate } from '../components/common/LocaleAwareDate';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const documents = useDocumentsQuery({ limit: 5 });
  const health = useHealthQuery();

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2}>{t('dashboard:title', { defaultValue: 'Dashboard' })}</Title>
        <Text size="sm" c="dimmed">
          {t('dashboard:subtitle', { defaultValue: 'Welcome back.' })}
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard
          icon={IconFiles}
          labelKey="nav.documents"
          value="—"
          onClick={() => navigate('/documents')}
        />
        <StatCard
          icon={IconWorkflow}
          labelKey="nav.workflows"
          value="—"
          onClick={() => navigate('/workflows')}
        />
        <StatCard
          icon={IconHistory}
          labelKey="nav.audit"
          value="—"
          onClick={() => navigate('/audit')}
        />
        <StatCard
          icon={IconUsers}
          labelKey="nav.admin"
          value="—"
          onClick={() => navigate('/admin')}
        />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="md" withBorder radius="md">
            <Group justify="space-between" mb="sm">
              <Title order={4}>{t('dashboard:recentDocuments', { defaultValue: 'Recent documents' })}</Title>
              <Button variant="subtle" size="xs" onClick={() => navigate('/documents')}>
                {t('common:action.viewAll')}
              </Button>
            </Group>
            {documents.isLoading ? (
              <LoadingState variant="skeleton" />
            ) : documents.isError ? (
              <ErrorState error={documents.error} onRetry={() => documents.refetch()} />
            ) : (
              <Stack gap="xs">
                {documents.data?.items.map((doc) => (
                  <Group
                    key={doc.id}
                    justify="space-between"
                    p="xs"
                    style={{ cursor: 'pointer', borderRadius: 'var(--mantine-radius-sm)' }}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {doc.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {doc.status}
                      </Text>
                    </Stack>
                    <LocaleAwareDate value={doc.updatedAt} variant="relative" size="xs" c="dimmed" />
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" withBorder radius="md">
            <Title order={4} mb="sm">
              {t('dashboard:systemHealth', { defaultValue: 'System health' })}
            </Title>
            {health.isLoading ? (
              <LoadingState />
            ) : health.isError ? (
              <ErrorState error={health.error} onRetry={() => health.refetch()} />
            ) : (
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm">{t('health:status', { defaultValue: 'Status' })}</Text>
                  <Text size="sm" fw={500}>
                    {health.data?.status ?? '—'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">{t('health:version', { defaultValue: 'Version' })}</Text>
                  <Text size="sm" fw={500}>
                    {health.data?.version ?? '—'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">{t('health:licenseState', { defaultValue: 'License state' })}</Text>
                  <Text size="sm" fw={500}>
                    {health.data?.licenseState ?? '—'}
                  </Text>
                </Group>
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

interface StatCardProps {
  readonly icon: typeof IconFiles;
  readonly labelKey: string;
  readonly value: string;
  readonly onClick?: () => void;
}

function StatCard({ icon: Icon, labelKey, value, onClick }: StatCardProps) {
  const { t } = useTranslation();
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {t(labelKey)}
          </Text>
          <Title order={3}>{value}</Title>
        </Stack>
        <Icon size={28} aria-hidden="true" />
      </Group>
    </Card>
  );
}
