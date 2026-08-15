/**
 * License revoke modal — requires step-up authentication.
 *
 * The admin enters a reason for the revocation; on submit, the `useStepUp`
 * hook ensures a valid step-up token (re-prompts for MFA if expired), then
 * the `useRevokeLicenseMutation` fires. The API client attaches the
 * step-up token via the `X-Step-Up-Token` header so the server's
 * `StepUpGuard` verifies it (spec §27.3).
 */
import { useEffect, useState } from 'react';
import { Modal, Stack, Text, Textarea, Button, Group, Alert, Badge } from '@mantine/core';
import { ShieldAlert, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { License } from '@smart-edms/types';
import { useRevokeLicenseMutation } from '../../api/hooks';
import { useStepUp } from '../common/StepUpProvider';

interface LicenseRevokeModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly license: License | null;
}

export function LicenseRevokeModal({ opened, onClose, license }: LicenseRevokeModalProps) {
  const { t } = useTranslation();
  const revokeMutation = useRevokeLicenseMutation();
  const { requestStepUp } = useStepUp();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (opened) {
      setReason('');
      revokeMutation.reset();
    }
  }, [opened, revokeMutation]);

  if (!license) return null;

  const handleSubmit = (): void => {
    if (!reason.trim()) return;
    // Step-up: re-prompts for MFA if the existing step-up token has expired.
    requestStepUp(
      async () => {
        try {
          await revokeMutation.mutateAsync({ id: license.id, reason });
          notifications.show({
            title: t('common:toast.success.title'),
            message: t('admin:licenses.revoke.success'),
            color: 'success',
          });
          onClose();
        } catch {
          // Error surfaced by the API client.
        }
      },
      {
        titleKey: 'admin:stepUp.revokeLicense.title',
        descriptionKey: 'admin:stepUp.revokeLicense.subtitle',
      },
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ShieldAlert size={18} color="var(--mantine-color-error-filled)" aria-hidden="true" />
          <span>{t('admin:licenses.revoke.title')}</span>
        </Group>
      }
      centered
      size="md"
      data-tour="admin.licenses.revokeModal"
    >
      <Stack gap="md">
        <Alert color="error" variant="light" icon={<TriangleAlert size={16} />}>
          {t('admin:licenses.revoke.warning')}
        </Alert>

        <Group gap="sm">
          <Badge variant="light" color="gray">{t('admin:licenses.column.licenseId')}</Badge>
          <Text size="sm" style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
            {license.id}
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          {t('admin:licenses.revoke.customer')}: <strong>{license.customerId}</strong>
        </Text>

        <Textarea
          label={t('admin:licenses.revoke.reason')}
          placeholder={t('admin:licenses.revoke.reason.placeholder')}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          required
          autosize
          minRows={3}
          data-tour="admin.licenses.revoke.reason"
        />

        <Alert color="info" variant="light">
          {t('admin:licenses.revoke.stepUpRequired')}
        </Alert>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <Button
            color="error"
            onClick={handleSubmit}
            loading={revokeMutation.isPending}
            disabled={!reason.trim()}
            data-tour="admin.licenses.revoke.confirm"
          >
            {t('admin:licenses.revoke.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
