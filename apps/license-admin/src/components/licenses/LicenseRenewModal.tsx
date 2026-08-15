/**
 * License renew modal — extends the expiry date (and optionally the grace
 * period) of an existing license.
 *
 * No step-up required (renewal is not a destructive operation).
 */
import { useEffect, useState } from 'react';
import { Modal, Stack, Text, NumberInput, Button, Group, Alert } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

import { CalendarPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { License } from '@smart-edms/types';
import { useRenewLicenseMutation } from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';

interface LicenseRenewModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly license: License | null;
}

export function LicenseRenewModal({ opened, onClose, license }: LicenseRenewModalProps) {
  const { t } = useTranslation();
  const renewMutation = useRenewLicenseMutation();
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [gracePeriodDays, setGracePeriodDays] = useState<number | ''>(14);

  useEffect(() => {
    if (opened && license) {
      // Default the new expiry to the current expiry + 1 year, or 1 year
      // from now if the license has no expiry.
      const base = license.expiresAt ? new Date(license.expiresAt) : new Date();
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      setExpiresAt(next);
      setGracePeriodDays(license.gracePeriodDays || 14);
    }
  }, [opened, license]);

  if (!license) return null;

  const handleSubmit = async (): Promise<void> => {
    if (!expiresAt) return;
    try {
      await renewMutation.mutateAsync({
        id: license.id,
        expiresAt: expiresAt.toISOString(),
        gracePeriodDays: gracePeriodDays === '' ? 14 : gracePeriodDays,
      });
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('license:action.renew.success'),
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
      title={
        <Group gap="sm">
          <CalendarPlus size={18} aria-hidden="true" />
          <span>{t('admin:licenses.renew.title')}</span>
        </Group>
      }
      centered
      size="md"
      data-tour="admin.licenses.renewModal"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('admin:licenses.renew.currentExpiry')}:{' '}
          <strong>
            {license.expiresAt ? <LocaleAwareDate value={license.expiresAt} variant="date" /> : '∞'}
          </strong>
        </Text>
        <DateTimePicker
          label={t('admin:licenses.renew.newExpiry')}
          value={expiresAt}
          onChange={setExpiresAt}
          required
          clearable
        />
        <NumberInput
          label={t('admin:licenses.field.gracePeriodDays')}
          value={gracePeriodDays}
          onChange={(v) => setGracePeriodDays(typeof v === 'number' ? v : '')}
          min={0}
          max={365}
        />
        <Alert color="info" variant="light">
          {t('admin:licenses.renew.note')}
        </Alert>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={renewMutation.isPending}
            disabled={!expiresAt}
          >
            {t('license:action.renew')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
