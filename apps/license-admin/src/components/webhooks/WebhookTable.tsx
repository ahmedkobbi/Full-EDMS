/**
 * Webhook table — lists webhooks for a customer. Includes a "send test"
 * action and a deliveries panel.
 */
import {
  Accordion,
  Badge,
  Box,
  Button,
  Code,
  Divider,
  Group,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { History, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import {
  useDeleteWebhookMutation,
  useReplayWebhookDeliveryMutation,
  useTestWebhookMutation,
  useWebhookDeliveriesQuery,
  useWebhooksQuery,
} from '../../api/hooks';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';
import { LocaleAwareDate } from '../common/LocaleAwareDate';

interface WebhookTableProps {
  readonly onCreate?: () => void;
  readonly customerId?: string;
}

export function WebhookTable({ onCreate, customerId: customerIdProp }: WebhookTableProps) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const customerId = customerIdProp ?? searchParams.get('customerId') ?? '';

  const query = useWebhooksQuery(customerId || undefined);
  const deleteMutation = useDeleteWebhookMutation();
  const testMutation = useTestWebhookMutation();

  if (!customerId) {
    return (
      <EmptyState
        illustration="webhooks"
        titleKey="admin:webhooks.empty.title"
        subtitleKey="admin:webhooks.empty.selectCustomer"
      />
    );
  }

  if (query.isLoading) {return <LoadingState variant="skeleton" />;}
  if (query.isError) {return <ErrorState error={query.error} onRetry={() => query.refetch()} />;}

  const webhooks = query.data ?? [];

  if (webhooks.length === 0) {
    return (
      <EmptyState
        illustration="webhooks"
        titleKey="admin:webhooks.empty.title"
        subtitleKey="admin:webhooks.empty.subtitle"
        actions={
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={onCreate}
            data-tour="admin.webhooks.create"
          >
            {t('admin:webhooks.create')}
          </Button>
        }
      />
    );
  }

  const handleTest = async (id: string): Promise<void> => {
    try {
      await testMutation.mutateAsync(id);
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('admin:webhooks.test.success'),
        color: 'success',
      });
    } catch {
      // Error surfaced by the API client.
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm(t('admin:webhooks.delete.confirm'))) {return;}
    await deleteMutation.mutateAsync({ id, customerId });
  };

  return (
    <Box data-tour="admin.webhooks.table">
      <Group justify="flex-end" mb="sm">
        <Button
          variant="light"
          leftSection={<RefreshCw size={14} aria-hidden="true" />}
          onClick={() => query.refetch()}
          loading={query.isFetching}
        >
          {t('common:action.refresh')}
        </Button>
        <Button
          leftSection={<Plus size={16} aria-hidden="true" />}
          onClick={onCreate}
          data-tour="admin.webhooks.create"
        >
          {t('admin:webhooks.create')}
        </Button>
      </Group>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('admin:webhooks.column.url')}</Table.Th>
            <Table.Th>{t('admin:webhooks.column.events')}</Table.Th>
            <Table.Th>{t('admin:webhooks.column.status')}</Table.Th>
            <Table.Th>{t('admin:webhooks.column.created')}</Table.Th>
            <Table.Th>{t('common:label.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {webhooks.map((w) => (
            <Table.Tr key={w.id}>
              <Table.Td>
                <Code style={{ fontSize: 12 }}>{w.url}</Code>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  {w.events.slice(0, 3).map((e) => (
                    <Badge key={e} size="xs" variant="light">{e}</Badge>
                  ))}
                  {w.events.length > 3 && (
                    <Badge size="xs" variant="light" color="gray">+{w.events.length - 3}</Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                {w.enabled
                  ? <Badge color="success" size="sm">{t('common:status.enabled')}</Badge>
                  : <Badge color="gray" size="sm">{t('common:status.disabled')}</Badge>}
              </Table.Td>
              <Table.Td><LocaleAwareDate value={w.createdAt} variant="date" /></Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<Send size={12} aria-hidden="true" />}
                    onClick={() => void handleTest(w.id)}
                    loading={testMutation.isPending}
                    data-tour="admin.webhooks.test"
                  >
                    {t('admin:webhooks.test.title')}
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="error"
                    leftSection={<Trash2 size={12} aria-hidden="true" />}
                    onClick={() => void handleDelete(w.id)}
                    loading={deleteMutation.isPending}
                  >
                    {t('common:action.delete')}
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Divider my="md" label={t('admin:webhooks.deliveries.title')} labelPosition="center" />

      <Accordion chevronPosition="right" variant="separated">
        {webhooks.map((w) => (
          <Accordion.Item key={w.id} value={w.id}>
            <Accordion.Control>
              <Group gap="sm">
                <History size={14} aria-hidden="true" />
                <Text size="sm" style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
                  {w.url}
                </Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <WebhookDeliveries webhookId={w.id} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Box>
  );
}

function WebhookDeliveries({ webhookId }: { readonly webhookId: string }) {
  const { t } = useTranslation();
  const query = useWebhookDeliveriesQuery(webhookId);
  const replayMutation = useReplayWebhookDeliveryMutation();

  if (query.isLoading) {return <LoadingState variant="skeleton" />;}
  if (query.isError) {return <ErrorState error={query.error} onRetry={() => query.refetch()} />;}

  const deliveries = query.data ?? [];

  if (deliveries.length === 0) {
    return <Text size="sm" c="dimmed">{t('admin:webhooks.deliveries.empty')}</Text>;
  }

  return (
    <Stack gap="xs">
      {deliveries.map((d) => (
        <Box
          key={d.id}
          p="sm"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-sm)',
          }}
        >
          <Group justify="space-between">
            <Stack gap={2}>
              <Group gap="sm">
                <Badge size="xs" variant="light">{d.event}</Badge>
                <Badge
                  size="xs"
                  color={
                    d.status === 'success' ? 'success' :
                    d.status === 'failed' ? 'error' :
                    d.status === 'retrying' ? 'warning' : 'gray'
                  }
                >
                  {d.status}
                </Badge>
                {d.statusCode !== null && (
                  <Text size="xs" c="dimmed">HTTP {d.statusCode}</Text>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {t('admin:webhooks.deliveries.attempts', { count: d.attemptCount })}
                {d.deliveredAt && ` · ${t('admin:webhooks.deliveries.deliveredAt')}: `}
                {d.deliveredAt && <LocaleAwareDate value={d.deliveredAt} variant="datetime" />}
              </Text>
            </Stack>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<Send size={12} aria-hidden="true" />}
              onClick={() => void replayMutation.mutateAsync(d.id)}
              loading={replayMutation.isPending}
            >
              {t('admin:webhooks.replay')}
            </Button>
          </Group>
        </Box>
      ))}
    </Stack>
  );
}
