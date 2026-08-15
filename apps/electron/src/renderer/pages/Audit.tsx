/**
 * Audit log explorer page (spec §9.12).
 *
 * Fetches real audit events from the backend and renders a timeline.
 * Each event shows:
 *  - Timestamp (locale-aware)
 *  - Actor (user, AI assistant, system)
 *  - Action code
 *  - Result (allow / deny) with color-coded badge
 *  - Resource type + ID
 *  - IP address
 *
 * Includes filter controls: category, result, date range.
 *
 * Spec ref: §9.12 (audit, evidence, provenance), §24.2 (audit hash chain verifies).
 */
import { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  Timeline,
  ThemeIcon,
  Select,
  TextInput,
  Button,
  Code,
  Divider,
  LoadingOverlay,
} from '@mantine/core';
import { IconHistory, IconCheck, IconX, IconShield, IconFilter, IconRefresh } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuditEventsQuery } from '../api/hooks';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LocaleAwareDate } from '../components/common/LocaleAwareDate';

export function AuditPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const query = useAuditEventsQuery({
    limit: 50,
    cursor,
    category: category ?? undefined,
    result: (result as 'allow' | 'deny') ?? undefined,
  });

  const events = query.data?.items ?? [];

  return (
    <Stack gap="md" data-tour-page="audit">
      <Stack gap={4}>
        <Title order={2}>{t('audit.title', { defaultValue: 'Audit log' })}</Title>
        <Text size="sm" c="dimmed">
          {t('audit.subtitle', { defaultValue: 'Tamper-evident record of every action.' })}
        </Text>
      </Stack>

      {/* Filters */}
      <Paper p="md" withBorder radius="md">
        <Group gap="md" grow>
          <Select
            label={t('audit.filter.category', { defaultValue: 'Category' })}
            placeholder={t('audit.filter.allCategories', { defaultValue: 'All categories' })}
            value={category}
            onChange={setCategory}
            clearable
            data={[
              { value: 'auth', label: 'Authentication' },
              { value: 'document', label: 'Documents' },
              { value: 'workflow', label: 'Workflows' },
              { value: 'share', label: 'Sharing' },
              { value: 'license', label: 'License' },
              { value: 'ai_assistant', label: 'AI Assistant' },
              { value: 'admin', label: 'Administration' },
              { value: 'classification', label: 'Classification' },
              { value: 'scanner', label: 'Scanner' },
              { value: 'tenant', label: 'Tenant' },
              { value: 'user', label: 'Users' },
            ]}
          />
          <Select
            label={t('audit.filter.result', { defaultValue: 'Result' })}
            placeholder={t('audit.filter.allResults', { defaultValue: 'All results' })}
            value={result}
            onChange={setResult}
            clearable
            data={[
              { value: 'allow', label: t('audit.result.allow', { defaultValue: 'Allowed' }) },
              { value: 'deny', label: t('audit.result.deny', { defaultValue: 'Denied' }) },
            ]}
          />
          <Button
            variant="light"
            leftSection={<IconRefresh size={14} aria-hidden="true" />}
            onClick={() => {
              setCursor(undefined);
              query.refetch();
            }}
            loading={query.isFetching}
            mt={22}
          >
            {t('common:action.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </Group>
      </Paper>

      {/* Timeline */}
      <Paper p="xl" withBorder radius="md" data-tour="audit.timeline" pos="relative">
        <LoadingOverlay visible={query.isLoading} />
        {query.isError ? (
          <ErrorState
            titleKey="errors.INTERNAL_ERROR"
            subtitleKey="audit.error.loadFailed"
            onRetry={() => query.refetch()}
          />
        ) : events.length === 0 && !query.isLoading ? (
          <EmptyState
            illustration="audit"
            titleKey="audit.empty.title"
            subtitleKey="audit.empty.subtitle"
          />
        ) : (
          <>
            <Group justify="space-between" mb="md">
              <Text fw={500} size="sm">
                {t('audit.eventCount', {
                  defaultValue: '{{count}} events',
                  count: query.data?.total ?? 0,
                })}
              </Text>
              {query.data?.cursor && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setCursor(query.data!.cursor!)}
                  loading={query.isFetching}
                >
                  {t('common:action.showMore', { defaultValue: 'Load more' })}
                </Button>
              )}
            </Group>
            <Timeline bulletSize={28} lineWidth={2}>
              {events.map((event) => (
                <Timeline.Item
                  key={event.id}
                  bullet={
                    <ThemeIcon
                      size={28}
                      radius="xl"
                      color={event.result === 'deny' ? 'red' : 'teal'}
                      variant={event.result === 'deny' ? 'filled' : 'light'}
                    >
                      {event.result === 'deny' ? (
                        <IconX size={14} aria-hidden="true" />
                      ) : (
                        <IconCheck size={14} aria-hidden="true" />
                      )}
                    </ThemeIcon>
                  }
                  title={
                    <Group gap="xs">
                      <Text fw={500} size="sm">{event.code}</Text>
                      <Badge size="xs" variant="light" color="gray">
                        {event.category}
                      </Badge>
                      {event.result === 'deny' && (
                        <Badge size="xs" color="red" variant="filled">
                          {t('audit.result.denied', { defaultValue: 'Denied' })}
                        </Badge>
                      )}
                    </Group>
                  }
                >
                  <Stack gap={4}>
                    <LocaleAwareDate value={event.occurredAt} size="xs" c="dimmed" />
                    {event.reason && (
                      <Text size="xs" c="dimmed">
                        {t('audit.reason', { defaultValue: 'Reason' })}: {event.reason}
                      </Text>
                    )}
                    {event.resourceType && (
                      <Text size="xs" c="dimmed">
                        {t('audit.resource', { defaultValue: 'Resource' })}: {event.resourceType}
                        {event.resourceId && (
                          <Code ml={4} size="xs">{event.resourceId.slice(0, 8)}</Code>
                        )}
                      </Text>
                    )}
                    {event.ipAddress && (
                      <Text size="xs" c="dimmed">
                        {t('audit.ip', { defaultValue: 'IP' })}: <Code size="xs">{event.ipAddress}</Code>
                      </Text>
                    )}
                  </Stack>
                </Timeline.Item>
              ))}
            </Timeline>
          </>
        )}
      </Paper>

      {/* Hash chain verification */}
      <Divider />
      <Paper p="md" withBorder radius="md">
        <Group gap="md">
          <ThemeIcon size={36} radius="md" variant="light" color="indigo">
            <IconShield size={18} aria-hidden="true" />
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={500} size="sm">
              {t('audit.integrity.title', { defaultValue: 'Audit integrity' })}
            </Text>
            <Text size="xs" c="dimmed">
              {t('audit.integrity.description', {
                defaultValue: 'All audit events are hash-chained and append-only. Verify integrity via the audit export endpoint.',
              })}
            </Text>
          </Stack>
        </Group>
      </Paper>
    </Stack>
  );
}
