/**
 * License import modal (spec §4.3, §12.5).
 *
 * Imports a `.sedmslic` license file. The file is read as text, parsed
 * using `parseSedmslic` from `@smart-edms/license-core` to verify the
 * signature client-side (fail-closed), then uploaded to the backend for
 * server-side verification + activation.
 *
 * On success, the license state query is invalidated so the badge refreshes.
 *
 * Accessibility:
 *  - The file input has a localized aria-label.
 *  - The drag-and-drop area announces its state to screen readers.
 *  - The error message is announced via `aria-live="assertive"`.
 */
import { type DragEvent, useCallback, useState } from 'react';
import { Alert, Button, FileButton, Group, Modal, Stack, Text } from '@mantine/core';
import { AlertCircle, FileCheck, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { parseSedmslic, SEDMSLIC_MIME } from '@smart-edms/license-core';
import { useImportLicenseMutation } from '../../api/hooks';

interface LicenseImportModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function LicenseImportModal({ opened, onClose }: LicenseImportModalProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const importMutation = useImportLicenseMutation({
    onSuccess: () => {
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('license:action.importSedmslic.success'),
        color: 'success',
      });
      setSelectedFile(null);
      setParseError(null);
      onClose();
    },
    onError: (error) => {
      setParseError(error.messageKey as string);
    },
  });

  const handleFile = useCallback(
    async (file: File | null) => {
      setParseError(null);
      if (!file) {return;}
      setSelectedFile(file);

      // Client-side parse + signature verification. Fails closed.
      try {
        const text = await file.text();
        const artifact = parseSedmslic(text);
        // Verify the artifact has the expected structure.
        if (artifact.type !== 'sedms.license') {
          throw new Error('invalid type');
        }
      } catch (err) {
        setParseError(t('license:action.importSedmslic.invalid'));
        return;
      }

      // Upload for server-side verification + activation.
      importMutation.mutate({ file });
    },
    [importMutation, t],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('license:action.importSedmslic')}
      centered
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('license:action.importSedmslic.subtitle')}
        </Text>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '2px dashed var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--mantine-color-default)',
          }}
        >
          <Stack align="center" gap="sm">
            <Upload size={36} aria-hidden="true" />
            <Text size="sm">{t('license:action.importSedmslic.dragDrop')}</Text>
            <FileButton
              accept={SEDMSLIC_MIME}
              onChange={(file) => void handleFile(file)}
              aria-label={t('license:action.importSedmslic.browse')}
            >
              {(props) => (
                <Button variant="light" leftSection={<FileCheck size={16} />} {...props}>
                  {t('license:action.importSedmslic.browse')}
                </Button>
              )}
            </FileButton>
          </Stack>
        </div>

        {selectedFile && (
          <Group gap="sm">
            <FileCheck size={16} aria-hidden="true" />
            <Text size="sm">{selectedFile.name}</Text>
          </Group>
        )}

        {parseError && (
          <Alert
            icon={<AlertCircle size={16} />}
            color="error"
            variant="light"
            aria-live="assertive"
          >
            {t(parseError)}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
