/**
 * Trial create modal — admin creates a new trial for a customer.
 *
 * Fields: customer, product, durationDays, contactEmail (optional).
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import {
  useCreateTrialMutation,
  useCustomersQuery,
  useProductsQuery,
} from '../../api/hooks';

interface TrialCreateModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly defaultCustomerId?: string;
}

export function TrialCreateModal({ opened, onClose, defaultCustomerId }: TrialCreateModalProps) {
  const { t } = useTranslation();
  const createMutation = useCreateTrialMutation();
  const customersQuery = useCustomersQuery({ limit: 100 });
  const productsQuery = useProductsQuery();

  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId ?? null);
  const [productId, setProductId] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState<number | ''>(14);
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (opened) {
      setCustomerId(defaultCustomerId ?? null);
      setProductId(null);
      setDurationDays(14);
      setContactEmail('');
    }
  }, [opened, defaultCustomerId]);

  const handleSubmit = async (): Promise<void> => {
    if (!customerId || !productId) {return;}
    try {
      await createMutation.mutateAsync({
        customerId,
        productId,
        durationDays: durationDays === '' ? 14 : durationDays,
        contactEmail: contactEmail || null,
      });
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('admin:trials.create.success'),
        color: 'success',
      });
      onClose();
    } catch {
      // Error surfaced by the API client.
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('admin:trials.create.title')}
      size="md"
      centered
      data-tour="admin.trials.createModal"
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
        <Select
          label={t('admin:licenses.field.product')}
          data={(productsQuery.data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          value={productId}
          onChange={setProductId}
          searchable
          required
        />
        <NumberInput
          label={t('admin:trials.field.durationDays')}
          value={durationDays}
          onChange={(v) => setDurationDays(typeof v === 'number' ? v : '')}
          min={1}
          max={90}
          required
        />
        <TextInput
          label={t('admin:trials.field.contactEmail')}
          placeholder="admin@example.com"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <Text size="xs" c="dimmed">
          {t('admin:trials.create.disclaimer')}
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={createMutation.isPending}
            disabled={!customerId || !productId}
            data-tour="admin.trials.submit"
          >
            {t('admin:trials.create')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
