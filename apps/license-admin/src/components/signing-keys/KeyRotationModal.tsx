/**
 * Key rotation modal — requires step-up authentication.
 *
 * The admin specifies a `targetKeyPath` (filesystem path on the licensing
 * server where the new private key should be written) and optionally an
 * algorithm. The licensing server generates a new keypair, writes the
 * private key to the path (chmod 600), and marks the current key as
 * `retiring`. On the next server restart the new key becomes active.
 *
 * Spec ref: §12.4 (signing keys), §27.3 (security rules — rotation
 * requires step-up auth).
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { Key, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useRotateSigningKeyMutation } from '../../api/hooks';
import { useStepUp } from '../common/StepUpProvider';

interface KeyRotationModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

const ALG_OPTIONS = [
  { value: 'ed25519', label: 'Ed25519 (recommended)' },
  { value: 'ecdsa-p256-sha256', label: 'ECDSA P-256 SHA-256' },
  { value: 'rsa-pss-sha256', label: 'RSA-PSS SHA-256 (legacy)' },
];

export function KeyRotationModal({ opened, onClose }: KeyRotationModalProps) {
  const { t } = useTranslation();
  const rotateMutation = useRotateSigningKeyMutation();
  const { requestStepUp } = useStepUp();

  const [targetKeyPath, setTargetKeyPath] = useState('');
  const [alg, setAlg] = useState<string>('ed25519');

  useEffect(() => {
    if (opened) {
      setTargetKeyPath('/var/lib/smart-edms/license-server/keys/signing-key-<timestamp>.pem');
      setAlg('ed25519');
    }
  }, [opened]);

  const handleSubmit = (): void => {
    if (!targetKeyPath) {return;}
    // Step-up auth: re-prompts for MFA if the existing step-up token has expired.
    requestStepUp(
      async () => {
        try {
          await rotateMutation.mutateAsync({
            targetKeyPath,
            alg: alg as 'ed25519' | 'rsa-pss-sha256' | 'ecdsa-p256-sha256',
          });
          notifications.show({
            title: t('common:toast.success.title'),
            message: t('admin:signingKeys.rotate.success'),
            color: 'success',
          });
          onClose();
        } catch {
          // Error surfaced by the API client.
        }
      },
      {
        titleKey: 'admin:stepUp.rotateKey.title',
        descriptionKey: 'admin:stepUp.rotateKey.subtitle',
      },
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Key size={18} aria-hidden="true" />
          <span>{t('admin:signingKeys.rotate.title')}</span>
        </Group>
      }
      size="md"
      centered
      data-tour="admin.signingKeys.rotateModal"
    >
      <Stack gap="md">
        <Alert color="warning" variant="light" icon={<TriangleAlert size={16} />}>
          {t('admin:signingKeys.rotate.warning')}
        </Alert>
        <TextInput
          label={t('admin:signingKeys.field.targetKeyPath')}
          description={t('admin:signingKeys.field.targetKeyPath.description')}
          value={targetKeyPath}
          onChange={(e) => setTargetKeyPath(e.target.value)}
          required
          data-tour="admin.signingKeys.field.targetKeyPath"
        />
        <Select
          label={t('admin:signingKeys.field.algorithm')}
          data={ALG_OPTIONS}
          value={alg}
          onChange={(v) => v && setAlg(v)}
          required
        />
        <Alert color="info" variant="light">
          {t('admin:signingKeys.rotate.stepUpRequired')}
        </Alert>
        <Text size="xs" c="dimmed">
          {t('admin:signingKeys.rotate.note')}
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            loading={rotateMutation.isPending}
            disabled={!targetKeyPath}
            data-tour="admin.signingKeys.rotate.confirm"
          >
            {t('admin:signingKeys.rotate.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
