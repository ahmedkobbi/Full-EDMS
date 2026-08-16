/**
 * Document preview (spec §9.3).
 *
 * Renders a preview of the document's current version. For images + PDFs
 * we use the browser's native rendering; for other types we show a
 * "no preview available" message with a download button.
 *
 * The preview URL is fetched from the backend's `GET /v1/documents/:id/preview`
 * endpoint, which returns a signed URL (short-lived) into object storage.
 */
import { useEffect, useState } from 'react';
import { Box, Button, Center, Image, Stack, Text } from '@mantine/core';
import { Download, File } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Document } from '@smart-edms/types';
import { apiClient } from '../../api/client';
import { ErrorState, LoadingState } from '@smart-edms/ui';

interface DocumentPreviewProps {
  readonly document: Document;
}

export function DocumentPreview({ document }: DocumentPreviewProps) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    apiClient
      .get<{ url: string }>(`/documents/${document.id}/preview`)
      .then((res) => {
        if (!cancelled) {
          setPreviewUrl(res.data.url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  if (isLoading) {return <LoadingState variant="skeleton" />;}
  if (error) {return <ErrorState error={error} />;}

  const isImage = previewUrl?.match(/\.(png|jpe?g|gif|webp|svg)$/i);
  const isPdf = previewUrl?.match(/\.pdf$/i);

  if (!previewUrl) {
    return (
      <Stack align="center" py="xl" gap="md">
        <File size={48} aria-hidden="true" />
        <Text size="sm" c="dimmed">
          {t('documents:document.preview.noPreview')}
        </Text>
        <Button variant="light" leftSection={<Download size={14} aria-hidden="true" />}>
          {t('documents:document.preview.downloadInstead')}
        </Button>
      </Stack>
    );
  }

  if (isImage) {
    return (
      <Center p="md">
        <Image src={previewUrl} alt={document.title} fit="contain" style={{ maxHeight: 600 }} />
      </Center>
    );
  }

  if (isPdf) {
    return (
      <Box style={{ width: '100%', height: 600 }}>
        <iframe src={previewUrl} title={document.title} style={{ width: '100%', height: '100%', border: 'none' }} />
      </Box>
    );
  }

  return (
    <Stack align="center" py="xl" gap="md">
      <File size={48} aria-hidden="true" />
      <Text size="sm" c="dimmed">
        {t('documents:document.preview.noPreview')}
      </Text>
      <Button variant="light" leftSection={<Download size={14} aria-hidden="true" />}>
        {t('documents:document.preview.downloadInstead')}
      </Button>
    </Stack>
  );
}
