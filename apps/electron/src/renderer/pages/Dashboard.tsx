/**
 * Dashboard page (spec §4.1, §17).
 *
 * Landing page after login. Shows:
 *  - Welcome banner with the user's name
 *  - Quick stats (document count, workflow count, audit events, users)
 *    fetched from GET /v1/admin/dashboard via useAdminDashboardQuery
 *  - Recent documents table (fetched via useDocumentsQuery)
 *  - System health (fetched via useHealthQuery)
 *
 * All data comes from the backend via TanStack Query hooks — no mock data.
 *
 * Spec ref: §9.15 (admin dashboard — paginated queries), §17 (Mantine v7).
 */
import { Stack, Grid, Paper, Title, Text, Group, Button, SimpleGrid, Card, ThemeIcon, Badge, LoadingOverlay } from '@mantine/core';
import { IconFiles, IconWorkflow, IconHistory, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDocumentsQuery, useHealthQuery, useAdminDashboardQuery } from '../api/hooks';
import { LoadingState, ErrorState, LocaleAwareDate } from '@smart-edms/ui';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const documents = useDocumentsQuery({ limit: 5 });
  const health = useHealthQuery();
  const dashboard = useAdminDashboardQuery();

  const stats = dashboard.data as any;
  const counts = stats?.counts;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{t('dashboard.title', { defaultValue: 'Dashboard' })}</Title>
          <Text size="sm" c="dimmed">
            {t('dashboard.subtitle', { defaultValue: 'Welcome back.' })}
          </Text>
        </Stack>
        <Button
          variant="light"
          size="xs"
          onClick={() => { documents.refetch(); health.refetch(); dashboard.refetch(); }}
          loading={documents.isFetching || health.isFetching || dashboard.isFetching}
        >
          {t('common:action.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard
          icon={IconFiles}
          label={t('dashboard.documents', { defaultValue: 'Documents' })}
          value={counts?.documents ?? '—'}
          loading={dashboard.isLoading}
          onClick={() => navigate('/documents')}
        />
        <StatCard
          icon={IconWorkflow}
          label={t('dashboard.workflows', { defaultValue: 'Workflows' })}
          value={counts?.workflows ?? '—'}
          loading={dashboard.isLoading}
          onClick={() => navigate('/workflows')}
        />
        <StatCard
          icon={IconHistory}
          label={t('dashboard.auditEvents', { defaultValue: 'Audit events' })}
          value={counts?.auditEvents ?? '—'}
          loading={dashboard.isLoading}
          onClick={() => navigate('/audit')}
        />
        <StatCard
          icon={IconUsers}
          label={t('dashboard.users', { defaultValue: 'Users' })}
          value={counts?.users ?? '—'}
          loading={dashboard.isLoading}
          onClick={() => navigate('/admin')}
        />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="md" withBorder radius="md" pos="relative">
            <LoadingOverlay visible={documents.isLoading} />
            <Group justify="space-between" mb="sm">
              <Title order={4}>{t('dashboard.recentDocuments', { defaultValue: 'Recent documents' })}</Title>
              <Button variant="subtle" size="xs" onClick={() => navigate('/documents')}>
                {t('common:action.viewAll', { defaultValue: 'View all' })}
              </Button>
            </Group>
            {documents.isError ? (
              <ErrorState
                titleKey="errors.INTERNAL_ERROR"
                subtitleKey="dashboard.error.documentsLoadFailed"
                onRetry={() => documents.refetch()}
              />
            ) : documents.data?.items?.length === 0 ? (
              <Stack align="center" py="xl" gap="xs">
                <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                  <IconFiles size={24} aria-hidden="true" />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  {t('dashboard.noRecentDocuments', { defaultValue: 'No recent documents' })}
                </Text>
                <Button size="xs" onClick={() => navigate('/documents')}>
                  {t('dashboard.action.uploadDocument', { defaultValue: 'Upload document' })}
                </Button>
              </Stack>
            ) : (
              <Stack gap="xs">
                {documents.data?.items.map((doc: any) => (
                  <Group
                    key={doc.id}
                    justify="space-between"
                    p="xs"
                    style={{ cursor: 'pointer', borderRadius: 'var(--mantine-radius-sm)' }}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>{doc.title}</Text>
                      <Group gap="xs">
                        <Badge size="xs" variant="light">{doc.status}</Badge>
                        {doc.isLocked && <Badge size="xs" color="orange" variant="light">{t('document.locked', { defaultValue: 'Locked' })}</Badge>}
                      </Group>
                    </Stack>
                    <LocaleAwareDate value={doc.updatedAt} size="xs" c="dimmed" />
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            {/* System health */}
            <Paper p="md" withBorder radius="md" pos="relative">
              <LoadingOverlay visible={health.isLoading} />
              <Title order={4} mb="sm">
                {t('dashboard.systemHealth', { defaultValue: 'System health' })}
              </Title>
              {health.isError ? (
                <Text size="sm" c="red">{t('dashboard.healthError', { defaultValue: 'Failed to load health' })}</Text>
              ) : (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">{t('dashboard.status', { defaultValue: 'Status' })}</Text>
                    <Badge color={health.data?.status === 'ok' ? 'teal' : 'red'} variant="filled" size="sm">
                      {health.data?.status ?? '—'}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">{t('dashboard.version', { defaultValue: 'Version' })}</Text>
                    <Text size="sm" fw={500}>{health.data?.version ?? '—'}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">{t('dashboard.licenseState', { defaultValue: 'License' })}</Text>
                    <Badge
                      color={stats?.licenseState === 'valid' ? 'teal' : stats?.licenseState === 'invalid' ? 'red' : 'amber'}
                      variant="light"
                      size="sm"
                    >
                      {stats?.licenseState ?? '—'}
                    </Badge>
                  </Group>
                  {stats?.storageBytes && (
                    <Group justify="space-between">
                      <Text size="sm">{t('dashboard.storageUsed', { defaultValue: 'Storage' })}</Text>
                      <Text size="sm" fw={500}>{formatBytes(Number(stats.storageBytes))}</Text>
                    </Group>
                  )}
                </Stack>
              )}
            </Paper>

            {/* Quick actions */}
            <Paper p="md" withBorder radius="md">
              <Title order={4} mb="sm">
                {t('dashboard.quickActions', { defaultValue: 'Quick actions' })}
              </Title>
              <Stack gap="xs">
                <Button variant="light" size="sm" fullWidth onClick={() => navigate('/documents')}>
                  {t('dashboard.action.uploadDocument', { defaultValue: 'Upload document' })}
                </Button>
                <Button variant="light" size="sm" fullWidth onClick={() => navigate('/search')}>
                  {t('dashboard.action.search', { defaultValue: 'Search documents' })}
                </Button>
                <Button variant="light" size="sm" fullWidth onClick={() => navigate('/workflows')}>
                  {t('dashboard.action.viewWorkflows', { defaultValue: 'View workflows' })}
                </Button>
                <Button variant="light" size="sm" fullWidth onClick={() => navigate('/settings')}>
                  {t('dashboard.action.settings', { defaultValue: 'Settings' })}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

interface StatCardProps {
  readonly icon: typeof IconFiles;
  readonly label: string;
  readonly value: string | number;
  readonly loading?: boolean;
  readonly onClick?: () => void;
}

function StatCard({ icon: Icon, label, value, loading, onClick }: StatCardProps) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <LoadingOverlay visible={loading} />
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
          <Title order={3}>{value}</Title>
        </Stack>
        <ThemeIcon size={36} radius="md" variant="light" color="indigo">
          <Icon size={20} aria-hidden="true" />
        </ThemeIcon>
      </Group>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
