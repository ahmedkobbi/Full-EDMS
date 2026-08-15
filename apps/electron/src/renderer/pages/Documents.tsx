/**
 * Documents page (spec §9.3).
 *
 * The document library. Renders the DocumentTable with an upload button.
 * Clicking upload opens a Modal containing the DocumentUpload dropzone.
 *
 * All data comes from the backend — no mock data (spec §17).
 */
import { useState } from 'react';
import { Stack, Modal, Title, Text, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DocumentTable } from '../components/documents/DocumentTable';
import { DocumentUpload } from '../components/documents/DocumentUpload';

export function DocumentsPage() {
  const { t } = useTranslation();
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <Stack gap="md" data-tour-page="documents">
      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{t('documents:library.title')}</Title>
          <Text size="sm" c="dimmed">
            {t('documents:library.subtitle')}
          </Text>
        </Group>
      </Stack>

      <DocumentTable onUploadClick={() => setUploadOpen(true)} />

      <Modal
        opened={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title={t('documents:document.upload.title')}
        size="lg"
      >
        <DocumentUpload onComplete={() => setUploadOpen(false)} />
      </Modal>
    </Stack>
  );
}
