/**
 * Document upload (spec §9.3, §17).
 *
 * Uses `@mantine/dropzone` for drag-and-drop + click-to-browse uploads.
 * Multi-file supported. Each file is uploaded individually via the
 * `useUploadDocumentMutation` hook; progress is shown per file.
 *
 * The dropzone is keyboard accessible (Tab + Enter to browse).
 *
 * Tour target: `data-tour="documents.upload"` so the tour engine can
 * highlight the upload area (spec §10.13).
 */
import { useState, useCallback } from 'react';
import { Dropzone, IMAGE_MIME_TYPE, PDF_MIME_TYPE, MS_WORD_MIME_TYPE } from '@mantine/dropzone';
import { Group, Text, Stack, Progress, Box, Button, type MantineColor } from '@mantine/core';
import { IconUpload, IconFile, IconX, IconCheck, IconAlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useUploadDocumentMutation } from '../../api/hooks';

interface UploadItem {
  readonly file: File;
  readonly status: 'pending' | 'uploading' | 'success' | 'error';
  readonly progress: number;
  readonly error?: string;
}

interface DocumentUploadProps {
  /** Optional folder to upload into. */
  readonly folderId?: string;
  /** Called after all uploads complete. */
  readonly onComplete?: () => void;
}

const ACCEPTED_MIME_TYPES = [
  ...IMAGE_MIME_TYPE,
  ...PDF_MIME_TYPE,
  ...MS_WORD_MIME_TYPE,
];

export function DocumentUpload({ folderId, onComplete }: DocumentUploadProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<UploadItem[]>([]);
  const uploadMutation = useUploadDocumentMutation();

  const handleDrop = useCallback(
    async (files: File[]) => {
      const newItems: UploadItem[] = files.map((file) => ({
        file,
        status: 'pending',
        progress: 0,
      }));
      setItems((prev) => [...prev, ...newItems]);

      for (const file of files) {
        try {
          // Update status to uploading.
          setItems((prev) =>
            prev.map((item) =>
              item.file === file ? { ...item, status: 'uploading', progress: 30 } : item,
            ),
          );

          await uploadMutation.mutateAsync({ file, folderId });

          // Update status to success.
          setItems((prev) =>
            prev.map((item) =>
              item.file === file ? { ...item, status: 'success', progress: 100 } : item,
            ),
          );

          notifications.show({
            title: t('common:toast.success.title'),
            message: t('documents:document.upload.success', { name: file.name }),
            color: 'success',
          });
        } catch (err) {
          setItems((prev) =>
            prev.map((item) =>
              item.file === file
                ? { ...item, status: 'error', progress: 0, error: String(err) }
                : item,
            ),
          );
          notifications.show({
            title: t('common:toast.error.title'),
            message: t('documents:document.upload.error.network', { name: file.name }),
            color: 'error',
          });
        }
      }

      onComplete?.();
    },
    [uploadMutation, folderId, onComplete, t],
  );

  return (
    <Stack gap="md" data-tour="documents.upload">
      <Dropzone onDrop={handleDrop} accept={ACCEPTED_MIME_TYPES} multiple>
        <Group justify="center" gap="sm" p="xl">
          <Dropzone.Accept>
            <IconUpload size={36} aria-hidden="true" />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={36} aria-hidden="true" />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFile size={36} aria-hidden="true" />
          </Dropzone.Idle>
          <Stack gap={2} align="center">
            <Text size="sm" fw={500}>
              {t('documents:document.upload.dropzone')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('documents:document.upload.subtitle')}
            </Text>
          </Stack>
        </Group>
      </Dropzone>

      {items.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {t('documents:document.upload.queue')}
          </Text>
          {items.map((item, idx) => (
            <UploadRow key={`${item.file.name}-${idx}`} item={item} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function UploadRow({ item }: { readonly item: UploadItem }) {
  const { t } = useTranslation();
  const color: MantineColor =
    item.status === 'success'
      ? 'success'
      : item.status === 'error'
        ? 'error'
        : 'brand';

  return (
    <Group gap="sm" align="center">
      <IconFile size={16} aria-hidden="true" />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" truncate>
          {item.file.name}
        </Text>
        {item.status === 'uploading' && (
          <Progress value={item.progress} size="xs" color={color} radius="sm" />
        )}
        {item.status === 'error' && (
          <Text size="xs" c="error">
            {item.error ?? t('documents:document.upload.error.network', { name: item.file.name })}
          </Text>
        )}
      </Stack>
      {item.status === 'success' && <IconCheck size={16} aria-hidden="true" />}
      {item.status === 'error' && <IconAlertCircle size={16} aria-hidden="true" />}
    </Group>
  );
}
