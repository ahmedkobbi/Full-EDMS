/**
 * Usage dashboard page (spec §12.1, §12.10).
 *
 * Shows aggregate usage metrics across all licenses:
 *  - Total active licenses
 *  - Total active activations
 *  - Total users across all deployments
 *  - Total storage used (human-readable)
 *  - Total documents
 *  - Total AI API calls today
 *
 * All data fetched from GET /v1/usage/aggregate.
 */
import { Stack, SimpleGrid, Card, Text, ThemeIcon, Group, LoadingOverlay, Button } from '@mantine/core';
import { IconUsers, IconServer, IconDatabase, IconFileText, IconBrain, IconLicense } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useUsageAggregateQuery } from '../api/hooks';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorState } from '@smart-edms/ui';

export function UsagePage() {
  const { t } = useTranslation();
  const query = useUsageAggregateQuery();
  const data = query.data;

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:usage.title"
        subtitleKey="admin:usage.subtitle"
        tour="admin.usage.page"
      />

      <Group justify="flex-end">
        <Button
          variant="light"
          size="xs"
          onClick={() => query.refetch()}
          loading={query.isFetching}
        >
          {t('common:action.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </Group>

      <LoadingOverlay visible={query.isLoading} />
      {query.isError && (
        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
        />
      )}

      {data && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          <UsageCard
            icon={IconLicense}
            label={t('admin:usage.totalLicenses', { defaultValue: 'Active licenses' })}
            value={data.totalLicenses}
            color="blue"
          />
          <UsageCard
            icon={IconServer}
            label={t('admin:usage.totalActivations', { defaultValue: 'Active activations' })}
            value={data.totalActivations}
            color="teal"
          />
          <UsageCard
            icon={IconUsers}
            label={t('admin:usage.totalUsers', { defaultValue: 'Total users' })}
            value={data.totalUsers}
            color="indigo"
          />
          <UsageCard
            icon={IconDatabase}
            label={t('admin:usage.totalStorage', { defaultValue: 'Storage used' })}
            value={formatBytes(Number(data.totalStorageBytes))}
            color="grape"
          />
          <UsageCard
            icon={IconFileText}
            label={t('admin:usage.totalDocuments', { defaultValue: 'Total documents' })}
            value={data.totalDocuments}
            color="orange"
          />
          <UsageCard
            icon={IconBrain}
            label={t('admin:usage.totalAiCalls', { defaultValue: 'AI calls (today)' })}
            value={data.totalAiCalls}
            color="pink"
          />
        </SimpleGrid>
      )}
    </Stack>
  );
}

function UsageCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
          <Text size="xl" fw={800}>{value}</Text>
        </Stack>
        <ThemeIcon size={40} radius="md" variant="light" color={color}>
          <Icon size={20} aria-hidden="true" />
        </ThemeIcon>
      </Group>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
