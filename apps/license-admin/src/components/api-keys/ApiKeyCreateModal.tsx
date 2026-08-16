/**
 * API key create modal — shows the raw key ONCE on creation.
 *
 * After the API returns the raw key, the modal displays it with a
 * prominent "Copy" button + a warning that the key will not be shown
 * again. The admin must acknowledge they have saved the key before the
 * modal can be closed.
 */
import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  Code,
  CopyButton,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

import { Check, Copy, Key, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import {
  useCreateApiKeyMutation,
  useCustomersQuery,
} from '../../api/hooks';

const SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'activation:online', label: 'activation:online' },
  { value: 'heartbeat:write', label: 'heartbeat:write' },
  { value: 'license:read', label: 'license:read' },
  { value: 'license:write', label: 'license:write' },
  { value: 'customer:read', label: 'customer:read' },
  { value: 'customer:write', label: 'customer:write' },
  { value: 'webhook:write', label: 'webhook:write' },
  { value: 'audit:read', label: 'audit:read' },
];

interface ApiKeyCreateModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly defaultCustomerId?: string;
}

export function ApiKeyCreateModal({ opened, onClose, defaultCustomerId }: ApiKeyCreateModalProps) {
  const { t } = useTranslation();
  const createMutation = useCreateApiKeyMutation();
  const customersQuery = useCustomersQuery({ limit: 100 });

  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId ?? null);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['activation:online', 'heartbeat:write']);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Post-creation state — the raw key is held in memory only until the
  // modal is closed, then discarded.
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (opened) {
      setCustomerId(defaultCustomerId ?? null);
      setName('');
      setScopes(['activation:online', 'heartbeat:write']);
      setExpiresAt(null);
      setRawKey(null);
      setAcknowledged(false);
    }
  }, [opened, defaultCustomerId]);

  const handleCreate = async (): Promise<void> => {
    if (!customerId || !name) {return;}
    try {
      const res = await createMutation.mutateAsync({
        customerId,
        name,
        scopes,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      });
      setRawKey(res.key);
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('admin:apiKeys.create.success'),
        color: 'success',
      });
    } catch {
      // Error surfaced by the API client.
    }
  };

  const handleClose = (): void => {
    if (rawKey && !acknowledged) {return;}
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <Key size={18} aria-hidden="true" />
          <span>{t('admin:apiKeys.create.title')}</span>
        </Group>
      }
      size="md"
      centered
      closeOnClickOutside={!rawKey || acknowledged}
      closeOnEscape={!rawKey || acknowledged}
      data-tour="admin.apiKeys.createModal"
    >
      {!rawKey ? (
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
            label={t('admin:apiKeys.field.name')}
            placeholder={t('admin:apiKeys.field.name.placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <MultiSelect
            label={t('admin:apiKeys.field.scopes')}
            data={SCOPE_OPTIONS}
            value={scopes}
            onChange={setScopes}
            searchable
            clearable
          />
          <DateTimePicker
            label={t('admin:apiKeys.field.expiresAt')}
            value={expiresAt}
            onChange={setExpiresAt}
            clearable
            description={t('admin:apiKeys.field.expiresAt.description')}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              {t('common:action.cancel')}
            </Button>
            <Button
              onClick={() => void handleCreate()}
              loading={createMutation.isPending}
              disabled={!customerId || !name}
              data-tour="admin.apiKeys.submit"
            >
              {t('admin:apiKeys.create')}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          <Alert color="warning" variant="light" icon={<TriangleAlert size={16} />}>
            {t('admin:apiKeys.warning.shownOnce')}
          </Alert>
          <Box>
            <Text size="sm" fw={500} mb={4}>
              {t('admin:apiKeys.rawKey')}
            </Text>
            <Group gap="xs">
              <Code style={{ flex: 1, fontSize: 13, wordBreak: 'break-all', padding: '8px 10px' }}>
                {rawKey}
              </Code>
              <CopyButton value={rawKey} timeout={2000}>
                {({ copied, copy }) => (
                  <ActionIcon
                    color={copied ? 'success' : 'brand'}
                    variant="light"
                    onClick={copy}
                    aria-label={t('common:action.copy')}
                  >
                    {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  </ActionIcon>
                )}
              </CopyButton>
            </Group>
          </Box>
          <Alert color="info" variant="light">
            {t('admin:apiKeys.warning.storage')}
          </Alert>
          <Checkbox
            label={t('admin:apiKeys.acknowledge')}
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button
              onClick={handleClose}
              disabled={!acknowledged}
              data-tour="admin.apiKeys.close"
            >
              {t('common:action.close')}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
