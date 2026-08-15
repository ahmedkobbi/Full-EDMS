/**
 * Scanner page (spec §9.16).
 *
 * Fetches real scanner profiles + recent scan jobs from the backend.
 * Lists scanner profiles with status, driver kind, and last-seen.
 * Lists recent scan jobs with progress, file counts, and status.
 *
 * The profiles list is the tour target `scanner.profiles`.
 *
 * Spec ref: §4.6 (scanner integration roadmap), §9.16 (document digitization).
 */
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Button,
  SimpleGrid,
  Card,
  Badge,
  Progress,
  Table,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  LoadingOverlay,
} from '@mantine/core';
import { IconPlus, IconScan, IconRefresh, IconDeviceDesktop, IconFileImport } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useScannerProfilesQuery, useScannerJobsQuery } from '../api/hooks';
import { LoadingState } from '@smart-edms/ui';
import { ErrorState } from '@smart-edms/ui';
import { EmptyState } from '@smart-edms/ui';
import { LocaleAwareDate } from '@smart-edms/ui';

export function ScannerPage() {
  const { t } = useTranslation();

  const profilesQuery = useScannerProfilesQuery();
  const jobsQuery = useScannerJobsQuery({ limit: 10 });

  return (
    <Stack gap="md" data-tour-page="scanner">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{t('scanner.title', { defaultValue: 'Scanner agents' })}</Title>
          <Text size="sm" c="dimmed">
            {t('scanner.subtitle', { defaultValue: 'Manage scanner profiles and view scan jobs.' })}
          </Text>
        </Stack>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconRefresh size={14} aria-hidden="true" />}
            onClick={() => {
              profilesQuery.refetch();
              jobsQuery.refetch();
            }}
            loading={profilesQuery.isFetching || jobsQuery.isFetching}
          >
            {t('common:action.refresh', { defaultValue: 'Refresh' })}
          </Button>
          <Button leftSection={<IconPlus size={14} aria-hidden="true" />}>
            {t('scanner.addProfile', { defaultValue: 'Add scanner profile' })}
          </Button>
        </Group>
      </Group>

      {/* Scanner profiles */}
      <Paper p="xl" withBorder radius="md" data-tour="scanner.profiles" pos="relative">
        <LoadingOverlay visible={profilesQuery.isLoading} />
        <Group justify="space-between" mb="md">
          <Text fw={500}>{t('scanner.profiles.title', { defaultValue: 'Scanner profiles' })}</Text>
          <Badge size="sm" variant="light">
            {profilesQuery.data?.length ?? 0}
          </Badge>
        </Group>
        {profilesQuery.isError ? (
          <ErrorState
            titleKey="errors.INTERNAL_ERROR"
            subtitleKey="scanner.error.loadFailed"
            onRetry={() => profilesQuery.refetch()}
          />
        ) : !profilesQuery.data || profilesQuery.data.length === 0 ? (
          <EmptyState
            illustration="generic"
            titleKey="scanner.empty.title"
            subtitleKey="scanner.empty.subtitle"
            actions={
              <Button leftSection={<IconPlus size={14} aria-hidden="true" />}>
                {t('scanner.addProfile', { defaultValue: 'Add scanner profile' })}
              </Button>
            }
          />
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
            {profilesQuery.data.map((profile) => (
              <Card key={profile.id} withBorder padding="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ThemeIcon size={32} radius="md" variant="light" color="blue">
                      <IconScan size={16} aria-hidden="true" />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text fw={500} size="sm">{profile.name}</Text>
                      <Text size="xs" c="dimmed">{profile.code}</Text>
                    </Stack>
                  </Group>
                  <Badge
                    size="xs"
                    color={profile.isActive ? 'teal' : 'gray'}
                    variant={profile.isActive ? 'filled' : 'light'}
                  >
                    {profile.isActive
                      ? t('common:status.active', { defaultValue: 'Active' })
                      : t('common:status.inactive', { defaultValue: 'Inactive' })}
                  </Badge>
                </Group>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    {t('scanner.driver', { defaultValue: 'Driver' })}: {profile.driverKind}
                  </Text>
                  {profile.deviceId && (
                    <Text size="xs" c="dimmed">
                      {t('scanner.device', { defaultValue: 'Device' })}: {profile.deviceId}
                    </Text>
                  )}
                  <LocaleAwareDate
                    value={profile.createdAt}
                    size="xs"
                    c="dimmed"
                    prefix={t('common:label.created', { defaultValue: 'Created' }) + ': '}
                  />
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Paper>

      {/* Recent scan jobs */}
      <Paper p="xl" withBorder radius="md" pos="relative">
        <LoadingOverlay visible={jobsQuery.isLoading} />
        <Group justify="space-between" mb="md">
          <Text fw={500}>{t('scanner.recentJobs', { defaultValue: 'Recent scan jobs' })}</Text>
          <Badge size="sm" variant="light">
            {jobsQuery.data?.total ?? 0}
          </Badge>
        </Group>
        {jobsQuery.isError ? (
          <ErrorState
            titleKey="errors.INTERNAL_ERROR"
            subtitleKey="scanner.error.jobsLoadFailed"
            onRetry={() => jobsQuery.refetch()}
          />
        ) : !jobsQuery.data?.items || jobsQuery.data.items.length === 0 ? (
          <EmptyState
            illustration="generic"
            titleKey="scanner.jobs.empty.title"
            subtitleKey="scanner.jobs.empty.subtitle"
          />
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('scanner.job.status', { defaultValue: 'Status' })}</Table.Th>
                <Table.Th>{t('scanner.job.progress', { defaultValue: 'Progress' })}</Table.Th>
                <Table.Th>{t('scanner.job.files', { defaultValue: 'Files' })}</Table.Th>
                <Table.Th>{t('scanner.job.ocr', { defaultValue: 'OCR Language' })}</Table.Th>
                <Table.Th>{t('common:label.created', { defaultValue: 'Created' })}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {jobsQuery.data.items.map((job) => {
                const progress = job.totalFiles > 0 ? (job.processedFiles / job.totalFiles) * 100 : 0;
                const statusColor =
                  job.status === 'COMPLETED' ? 'teal'
                  : job.status === 'FAILED' ? 'red'
                  : job.status === 'RUNNING' ? 'blue'
                  : job.status === 'QUARANTINED' ? 'orange'
                  : 'gray';
                return (
                  <Table.Tr key={job.id}>
                    <Table.Td>
                      <Badge size="xs" color={statusColor} variant="filled">
                        {job.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ minWidth: 120 }}>
                      <Progress value={progress} size="sm" color={statusColor} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">
                        {job.processedFiles} / {job.totalFiles}
                        {job.failedFiles > 0 && (
                          <Text component="span" size="xs" c="red" ml={4}>
                            ({job.failedFiles} failed)
                          </Text>
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{job.ocrLanguage ?? '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <LocaleAwareDate value={job.createdAt} size="xs" c="dimmed" />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* Upload fallback (Phase 1 — browser upload) */}
      <Paper p="md" withBorder radius="md" style={{ borderStyle: 'dashed' }}>
        <Group gap="md">
          <ThemeIcon size={40} radius="md" variant="light" color="indigo">
            <IconFileImport size={20} aria-hidden="true" />
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={500} size="sm">
              {t('scanner.upload.title', { defaultValue: 'Upload files directly' })}
            </Text>
            <Text size="xs" c="dimmed">
              {t('scanner.upload.subtitle', {
                defaultValue: 'Phase 1: browser-based upload. TWAIN/WIA/ISIS support in Phase 2.',
              })}
            </Text>
          </Stack>
          <Button
            variant="light"
            component="a"
            href="/documents"
            size="xs"
            ml="auto"
          >
            {t('scanner.upload.go', { defaultValue: 'Go to Documents' })}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
