/**
 * Webhook drawer — create a webhook.
 *
 * Fields: customer, url, events (multi-select), enabled.
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  Group,
  MultiSelect,
  Select,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import {
  useCreateWebhookMutation,
  useCustomersQuery,
} from '../../api/hooks';

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'license.issued', label: 'license.issued' },
  { value: 'license.renewed', label: 'license.renewed' },
  { value: 'license.revoked', label: 'license.revoked' },
  { value: 'license.expired', label: 'license.expired' },
  { value: 'activation.online', label: 'activation.online' },
  { value: 'activation.offline.intake', label: 'activation.offline.intake' },
  { value: 'activation.offline.issue', label: 'activation.offline.issue' },
  { value: 'heartbeat.received', label: 'heartbeat.received' },
  { value: 'trial.created', label: 'trial.created' },
  { value: 'trial.converted', label: 'trial.converted' },
  { value: 'trial.cancelled', label: 'trial.cancelled' },
  { value: 'webhook.test', label: 'webhook.test' },
];

interface WebhookDrawerProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly defaultCustomerId?: string;
}

export function WebhookDrawer({ opened, onClose, defaultCustomerId }: WebhookDrawerProps) {
  const { t } = useTranslation();
  const createMutation = useCreateWebhookMutation();
  const customersQuery = useCustomersQuery({ limit: 100 });

  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId ?? null);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['license.issued', 'license.renewed', 'license.revoked']);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (opened) {
      setCustomerId(defaultCustomerId ?? null);
      setUrl('');
      setEvents(['license.issued', 'license.renewed', 'license.revoked']);
      setEnabled(true);
    }
  }, [opened, defaultCustomerId]);

  const handleSubmit = async (): Promise<void> => {
    if (!customerId || !url) {return;}
    try {
      await createMutation.mutateAsync({ customerId, url, events, enabled });
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('common:toast.created'),
        color: 'success',
      });
      onClose();
    } catch {
      // Error surfaced by the API client.
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t('admin:webhooks.create.title')}
      position="right"
      size="md"
    >
      <Stack gap="md">
        <Select
          label={t('admin:licenses.field.customer')}
          data={(customersQuery.data?.items ?? []).map((c) => ({ value: c.id, label: c.displayName }))}
          value={customerId}
          onChange={setCustomerId}
          searchable
          required
        />
        <TextInput
          label={t('admin:webhooks.field.url')}
          placeholder="https://example.com/webhooks/smart-edms"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          data-tour="admin.webhooks.field.url"
        />
        <MultiSelect
          label={t('admin:webhooks.field.events')}
          data={EVENT_OPTIONS}
          value={events}
          onChange={setEvents}
          searchable
          clearable
        />
        <Switch
          label={t('admin:webhooks.field.enabled')}
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={createMutation.isPending}
            disabled={!customerId || !url || events.length === 0}
            data-tour="admin.webhooks.submit"
          >
            {t('common:action.create')}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
