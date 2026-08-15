/**
 * Step-up authentication modal (spec §27.3, §12.10).
 *
 * Used by sensitive operations — license revoke, signing-key rotation,
 * API-key revoke. The admin enters their current TOTP code; the modal calls
 * `/v1/auth/admin/mfa/step-up`, receives a 5-minute step-up JWT, stores it
 * in the auth store (in-memory only), and then calls the `onConfirmed`
 * callback to proceed with the actual mutation.
 *
 * If the admin already has a valid (non-expired) step-up token, the modal
 * skips the prompt and calls `onConfirmed` immediately.
 *
 * Spec ref: §27.3 — "Step-up authentication requires the user to re-enter
 * their MFA code before sensitive operations. The step-up token is valid
 * for 5 minutes."
 */
import { useEffect, useState } from 'react';
import { Modal, Stack, Text, PinInput, Button, Alert, Group } from '@mantine/core';
import { ShieldCheck, CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import {
  useAdminStepUpMutation,
} from '../../api/hooks';
import {
  useAuthStore,
  selectHasStepUp,
  selectStepUpExpiresAt,
} from '../../store/auth';

interface StepUpModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  /** Called once the step-up token is valid. */
  readonly onConfirmed: () => void;
  /** Title key (defaults to admin.stepUp.title). */
  readonly titleKey?: string;
  /** Description key (defaults to admin.stepUp.subtitle). */
  readonly descriptionKey?: string;
}

export function StepUpModal({
  opened,
  onClose,
  onConfirmed,
  titleKey = 'admin:stepUp.title',
  descriptionKey = 'admin:stepUp.subtitle',
}: StepUpModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const hasStepUp = useAuthStore(selectHasStepUp);
  const stepUpExpiresAt = useAuthStore(selectStepUpExpiresAt);
  const setStepUpToken = useAuthStore((s) => s.setStepUpToken);
  const stepUpMutation = useAdminStepUpMutation();

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (opened) {
      setCode('');
      stepUpMutation.reset();
    }
  }, [opened, stepUpMutation]);

  // If the admin already has a valid step-up token when the modal opens,
  // skip the prompt and call onConfirmed immediately.
  useEffect(() => {
    if (opened && hasStepUp) {
      onConfirmed();
      onClose();
    }
  }, [opened, hasStepUp, onConfirmed, onClose]);

  const handleSubmit = async (): Promise<void> => {
    if (code.length !== 6) return;
    try {
      const res = await stepUpMutation.mutateAsync({ code });
      setStepUpToken(res.stepUpToken, res.expiresAt);
      notifications.show({
        title: t('admin:stepUp.success.title'),
        message: t('admin:stepUp.success.message'),
        color: 'success',
      });
      onConfirmed();
      onClose();
    } catch {
      // Error surfaced inline via the mutation's `error` state.
    }
  };

  const remainingMs = stepUpExpiresAt ? stepUpExpiresAt - Date.now() : 0;
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60_000));

  return (
    <Modal
      opened={opened && !hasStepUp}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{t(titleKey)}</span>
        </Group>
      }
      centered
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t(descriptionKey)}
        </Text>
        <Stack gap="xs" align="center">
          <Text size="sm" fw={500}>
            {t('auth:login.mfa.code.label')}
          </Text>
          <PinInput
            length={6}
            value={code}
            onChange={setCode}
            type="number"
            inputMode="numeric"
            autoFocus
            size="lg"
            aria-label={t('auth:login.mfa.code.label')}
          />
        </Stack>
        {stepUpMutation.isError && (
          <Alert color="error" variant="light" icon={<CircleAlert size={16} />}>
            {t('auth:login.error.mfaInvalid')}
          </Alert>
        )}
        <Alert color="info" variant="light" icon={<CircleAlert size={16} />}>
          {t('admin:stepUp.ttlNote', { ttlMinutes: 5 })}
        </Alert>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={stepUpMutation.isPending}
            disabled={code.length !== 6}
          >
            {t('admin:stepUp.confirm')}
          </Button>
        </Group>
        {remainingMin > 0 && (
          <Text size="xs" c="dimmed" ta="center">
            {t('admin:stepUp.remainingMinutes', { minutes: remainingMin })}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}

/**
 * Convenience hook: clears the step-up token. Used by the Topbar so the
 * admin can manually clear a step-up session before the TTL expires.
 */
export function useClearStepUp(): () => void {
  const clearStepUpToken = useAuthStore((s) => s.clearStepUpToken);
  return clearStepUpToken;
}
