/**
 * Dashboard page — KPIs for the licensing server.
 *
 * Cards:
 *  - Active licenses (count)
 *  - Expiring within 30 days (count)
 *  - Total activations (count)
 *  - Total customers (count)
 *  - Total trials (count)
 *  - Trials converted this month (count)
 *  - Pending offline requests (count)
 *
 * Each card links to the relevant detail page.
 */
import { Stack, SimpleGrid, Card, Group, Text, ThemeIcon, ActionIcon, Skeleton, Alert } from '@mantine/core';
import {
  FileCheck,
  Clock4,
  Bolt,
  Users,
  Flame,
  TrendingUp,
  ListChecks,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDashboardKpisQuery } from '../api/hooks';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorState } from '../components/common/ErrorState';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useDashboardKpisQuery();

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:dashboard.title"
        subtitleKey="admin:dashboard.subtitle"
        tour="admin.dashboard.page"
      />

      {query.isLoading && (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} height={140} radius="md" />
          ))}
        </SimpleGrid>
      )}

      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
          <KpiCard
            label={t('admin:dashboard.kpi.activeLicenses')}
            value={query.data.activeLicenses}
            total={query.data.totalLicenses}
            icon={<FileCheck size={24} aria-hidden="true" />}
            color="success"
            onClick={() => navigate('/licenses?status=active')}
          />
          <KpiCard
            label={t('admin:dashboard.kpi.expiringSoon')}
            value={query.data.expiringWithin30Days}
            icon={<Clock4 size={24} aria-hidden="true" />}
            color="warning"
            onClick={() => navigate('/licenses')}
          />
          <KpiCard
            label={t('admin:dashboard.kpi.totalActivations')}
            value={query.data.totalActivations}
            icon={<Bolt size={24} aria-hidden="true" />}
            color="info"
            onClick={() => navigate('/activations')}
          />
          <KpiCard
            label={t('admin:dashboard.kpi.totalCustomers')}
            value={query.data.totalCustomers}
            icon={<Users size={24} aria-hidden="true" />}
            color="brand"
            onClick={() => navigate('/customers')}
          />
          <KpiCard
            label={t('admin:dashboard.kpi.totalTrials')}
            value={query.data.totalTrials}
            icon={<Flame size={24} aria-hidden="true" />}
            color="warning"
            onClick={() => navigate('/trials')}
          />
          <KpiCard
            label={t('admin:dashboard.kpi.trialsConverted')}
            value={query.data.trialsConvertedThisMonth}
            icon={<TrendingUp size={24} aria-hidden="true" />}
            color="success"
            onClick={() => navigate('/trials')}
          />
          <KpiCard
            label={t('admin:dashboard.kpi.offlinePending')}
            value={query.data.offlineRequestsPending}
            icon={<ListChecks size={24} aria-hidden="true" />}
            color="error"
            onClick={() => navigate('/offline-activations')}
          />
          <Card withBorder padding="lg" data-tour="admin.dashboard.health">
            <Group justify="space-between" mb="sm">
              <ThemeIcon size={40} radius="md" color="info" variant="light">
                <Activity size={20} aria-hidden="true" />
              </ThemeIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => navigate('/audit')}
                aria-label={t('common:action.viewAll')}
              >
                <ExternalLink size={14} aria-hidden="true" />
              </ActionIcon>
            </Group>
            <Text size="xs" c="dimmed" fw={600}>{t('admin:dashboard.health.title')}</Text>
            <Text size="sm" mt={4}>
              {t('admin:dashboard.health.subtitle')}
            </Text>
            <Alert color="success" variant="light" mt="sm" p="xs">
              <Text size="xs">{t('admin:dashboard.health.ok')}</Text>
            </Alert>
          </Card>
        </SimpleGrid>
      )}
    </Stack>
  );
}

interface KpiCardProps {
  readonly label: string;
  readonly value: number;
  readonly total?: number;
  readonly icon: React.ReactNode;
  readonly color: 'brand' | 'success' | 'warning' | 'error' | 'info';
  readonly onClick?: () => void;
}

function KpiCard({ label, value, total, icon, color, onClick }: KpiCardProps) {
  return (
    <Card
      withBorder
      padding="lg"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <Group justify="space-between" mb="sm">
        <ThemeIcon size={40} radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        {onClick && (
          <ActionIcon variant="subtle" color="gray" aria-label={label}>
            <ExternalLink size={14} aria-hidden="true" />
          </ActionIcon>
        )}
      </Group>
      <Text size="xs" c="dimmed" fw={600}>{label}</Text>
      <Group gap={6} align="baseline" mt={4}>
        <Text size="xl" fw={700}>{value.toLocaleString()}</Text>
        {total !== undefined && (
          <Text size="xs" c="dimmed">/ {total.toLocaleString()}</Text>
        )}
      </Group>
    </Card>
  );
}
