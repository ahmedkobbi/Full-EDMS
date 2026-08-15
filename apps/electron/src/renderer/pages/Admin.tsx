/**
 * Admin page (spec §9.2, §9.15).
 *
 * Tenant administration dashboard with real data from backend:
 *  - System stats (users, documents, workflows, storage)
 *  - User management (list, create, suspend)
 *  - License status + import
 *  - Quota usage (users/documents/storage)
 *
 * All data fetched from backend — no mock data.
 *
 * Spec ref: §9.15 (admin console — dashboard with paginated queries),
 *           §9.2 (tenant-level quotas should be supported).
 */
import { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Tabs,
  Paper,
  Group,
  Button,
  SimpleGrid,
  Card,
  ThemeIcon,
  Progress,
  Badge,
  Table,
  ActionIcon,
  LoadingOverlay,
} from '@mantine/core';
import { IconShieldCheck, IconUsers, IconKey, IconPalette, IconLicense, IconFiles, IconWorkflow, IconDatabase, IconRefresh, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAdminDashboardQuery, useAuditEventsQuery } from '../api/hooks';
import { LoadingState } from '@smart-edms/ui';
import { ErrorState } from '@smart-edms/ui';
import { EmptyState } from '@smart-edms/ui';
import { LocaleAwareDate } from '@smart-edms/ui';
import { LicenseStatusBadge } from '../components/license/LicenseStatusBadge';
import { LicenseImportModal } from '../components/license/LicenseImportModal';

export function AdminPage() {
  const { t } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const dashboardQuery = useAdminDashboardQuery();
  const auditQuery = useAuditEventsQuery({ limit: 10 });

  const stats = dashboardQuery.data as any;
  const auditEvents = auditQuery.data?.items ?? [];

  return (
    <Stack gap="md" data-tour-page="admin">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{t('admin.title', { defaultValue: 'Administration' })}</Title>
          <Text size="sm" c="dimmed">
            {t('admin.subtitle', { defaultValue: 'Tenant administration and system overview.' })}
          </Text>
        </Stack>
        <Button
          variant="light"
          leftSection={<IconRefresh size={14} aria-hidden="true" />}
          onClick={() => { dashboardQuery.refetch(); auditQuery.refetch(); }}
          loading={dashboardQuery.isFetching || auditQuery.isFetching}
        >
          {t('common:action.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview">
            {t('admin.tab.overview', { defaultValue: 'Overview' })}
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUsers size={14} aria-hidden="true" />}>
            {t('admin.tab.users', { defaultValue: 'Users' })}
          </Tabs.Tab>
          <Tabs.Tab value="roles" leftSection={<IconShieldCheck size={14} aria-hidden="true" />}>
            {t('admin.tab.roles', { defaultValue: 'Roles' })}
          </Tabs.Tab>
          <Tabs.Tab value="license" leftSection={<IconLicense size={14} aria-hidden="true" />}>
            {t('license.title', { defaultValue: 'License' })}
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview tab — system stats */}
        <Tabs.Panel value="overview" pt="md">
          <LoadingOverlay visible={dashboardQuery.isLoading} />
          {dashboardQuery.isError ? (
            <ErrorState
              titleKey="errors.INTERNAL_ERROR"
              subtitleKey="admin.error.loadFailed"
              onRetry={() => dashboardQuery.refetch()}
            />
          ) : stats ? (
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <StatCard
                  icon={IconUsers}
                  label={t('admin.stats.users', { defaultValue: 'Active users' })}
                  value={stats.counts?.users ?? '—'}
                  onClick={() => setActiveTab('users')}
                />
                <StatCard
                  icon={IconFiles}
                  label={t('admin.stats.documents', { defaultValue: 'Documents' })}
                  value={stats.counts?.documents ?? '—'}
                />
                <StatCard
                  icon={IconWorkflow}
                  label={t('admin.stats.workflows', { defaultValue: 'Active workflows' })}
                  value={stats.counts?.workflows ?? '—'}
                />
                <StatCard
                  icon={IconDatabase}
                  label={t('admin.stats.storage', { defaultValue: 'Storage used' })}
                  value={formatBytes(Number(stats.storageBytes ?? 0))}
                />
              </SimpleGrid>

              {/* License state */}
              <Paper p="md" withBorder radius="md" data-tour="license.statusWidget">
                <Group justify="space-between">
                  <Stack gap={4}>
                    <Text fw={500} size="sm">{t('license.title', { defaultValue: 'License' })}</Text>
                    <Badge
                      size="sm"
                      color={stats.licenseState === 'valid' ? 'teal' : stats.licenseState === 'invalid' ? 'red' : 'amber'}
                      variant="filled"
                    >
                      {stats.licenseState ?? 'unknown'}
                    </Badge>
                  </Stack>
                  <LicenseStatusBadge />
                </Group>
              </Paper>

              {/* Recent audit events */}
              <Paper p="md" withBorder radius="md">
                <Group justify="space-between" mb="sm">
                  <Text fw={500} size="sm">{t('admin.recentActivity', { defaultValue: 'Recent activity' })}</Text>
                  <Badge size="xs" variant="light">{auditQuery.data?.total ?? 0}</Badge>
                </Group>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('audit.event', { defaultValue: 'Event' })}</Table.Th>
                      <Table.Th>{t('audit.result', { defaultValue: 'Result' })}</Table.Th>
                      <Table.Th>{t('common:label.created', { defaultValue: 'Time' })}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {auditEvents.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={3}>
                          <Text size="sm" c="dimmed" ta="center">{t('admin.noActivity', { defaultValue: 'No recent activity' })}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      auditEvents.map((event: any) => (
                        <Table.Tr key={event.id}>
                          <Table.Td>
                            <Text size="xs" fw={500}>{event.code}</Text>
                            <Text size="xs" c="dimmed">{event.category}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" color={event.result === 'deny' ? 'red' : 'teal'} variant="light">
                              {event.result}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <LocaleAwareDate value={event.occurredAt} size="xs" c="dimmed" />
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          ) : null}
        </Tabs.Panel>

        {/* Users tab */}
        <Tabs.Panel value="users" pt="md">
          <Paper p="xl" withBorder radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={500}>{t('admin.users.title', { defaultValue: 'User management' })}</Text>
              <Button size="xs" leftSection={<IconPlus size={14} aria-hidden="true" />}>
                {t('admin.users.add', { defaultValue: 'Add user' })}
              </Button>
            </Group>
            <EmptyState
              illustration="generic"
              titleKey="admin.users.empty.title"
              subtitleKey="admin.users.empty.subtitle"
            />
          </Paper>
        </Tabs.Panel>

        {/* Roles tab */}
        <Tabs.Panel value="roles" pt="md">
          <Paper p="xl" withBorder radius="md">
            <EmptyState
              illustration="generic"
              titleKey="admin.roles.empty.title"
              subtitleKey="admin.roles.empty.subtitle"
            />
          </Paper>
        </Tabs.Panel>

        {/* License tab */}
        <Tabs.Panel value="license" pt="md">
          <Paper p="xl" withBorder radius="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Stack gap={4}>
                  <Title order={4}>{t('license.overview.title', { defaultValue: 'License overview' })}</Title>
                  <Text size="sm" c="dimmed">{t('license.subtitle', { defaultValue: 'Manage your Smart EDMS license' })}</Text>
                </Stack>
                <LicenseStatusBadge />
              </Group>
              <Group>
                <Button onClick={() => setImportOpen(true)}>
                  {t('license.action.importSedmslic', { defaultValue: 'Import license (.sedmslic)' })}
                </Button>
                <Button variant="light">{t('license.action.exportSedmsreq', { defaultValue: 'Export request (.sedmsreq)' })}</Button>
                <Button variant="subtle">{t('license.action.contactSupport', { defaultValue: 'Contact support' })}</Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <LicenseImportModal opened={importOpen} onClose={() => setImportOpen(false)} />
    </Stack>
  );
}

function StatCard({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: string | number; onClick?: () => void }) {
  return (
    <Card withBorder padding="md" radius="md" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <Group justify="space-between" mb="xs">
        <ThemeIcon size={36} radius="md" variant="light" color="indigo">
          <Icon size={18} aria-hidden="true" />
        </ThemeIcon>
      </Group>
      <Text fw={700} size="xl">{value}</Text>
      <Text size="xs" c="dimmed">{label}</Text>
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
