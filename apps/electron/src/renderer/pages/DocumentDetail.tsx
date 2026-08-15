/**
 * Document detail page (spec §9.3, §9.5).
 *
 * Renders a single document with:
 *  - Header (title, status, actions)
 *  - Preview pane (left)
 *  - Metadata panel (right)
 *  - Version history (collapsed by default)
 *
 * The page is reachable at `/documents/:id`.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Grid,
  Title,
  Text,
  Group,
  Button,
  Breadcrumbs,
  Anchor,
  Paper,
  Tabs,
  Container,
} from '@mantine/core';
import { IconArrowLeft, IconDownload, IconShare, IconHistory, IconTrash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { modals } from '@mantine/modals';
import { useDocumentQuery, useDeleteDocumentMutation } from '../api/hooks';
import { DocumentPreview } from '../components/documents/DocumentPreview';
import { DocumentMetadataPanel } from '../components/documents/DocumentMetadataPanel';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

export function DocumentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('preview');

  const query = useDocumentQuery(id);
  const deleteMutation = useDeleteDocumentMutation({
    onSuccess: () => navigate('/documents'),
  });

  if (!id) {
    return <EmptyState illustration="documents" titleKey="common:error.title" subtitleKey="documents:document.notFound" />;
  }

  if (query.isLoading) return <LoadingState variant="skeleton" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data) return <EmptyState illustration="documents" titleKey="documents:document.notFound" />;

  const document = query.data;

  const handleDelete = (): void => {
    modals.openConfirmModal({
      title: t('common:dialog.confirm.delete.title'),
      children: <Text size="sm">{t('common:dialog.confirm.delete.body')}</Text>,
      labels: { confirm: t('common:action.delete'), cancel: t('common:action.cancel') },
      confirmProps: { color: 'error' },
      onConfirm: () => deleteMutation.mutate(document.id),
    });
  };

  return (
    <Stack gap="md" data-tour-page="document-detail">
      <Breadcrumbs>
        <Anchor size="sm" onClick={() => navigate('/documents')}>
          {t('documents:library.title')}
        </Anchor>
        <Text size="sm">{document.title}</Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Stack gap={4}>
          <Title order={2}>{document.title}</Title>
          <Text size="sm" c="dimmed">
            {t(`common:status.${document.status}`)}
          </Text>
        </Stack>
        <Group gap="sm">
          <Button variant="subtle" leftSection={<IconDownload size={14} aria-hidden="true" />}>
            {t('documents:document.download.original')}
          </Button>
          <Button variant="subtle" leftSection={<IconShare size={14} aria-hidden="true" />}>
            {t('common:action.share')}
          </Button>
          <Button
            variant="subtle"
            color="error"
            leftSection={<IconTrash size={14} aria-hidden="true" />}
            onClick={handleDelete}
            loading={deleteMutation.isPending}
          >
            {t('common:action.delete')}
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="preview" leftSection={<IconArrowLeft size={14} aria-hidden="true" style={{ display: 'none' }} />}>
            {t('documents:document.preview.title')}
          </Tabs.Tab>
          <Tabs.Tab value="metadata">
            {t('documents:document.title')}
          </Tabs.Tab>
          <Tabs.Tab value="versions" leftSection={<IconHistory size={14} aria-hidden="true" />}>
            {t('documents:document.version.title')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="preview" pt="md">
          <Paper withBorder radius="md" p="md">
            <DocumentPreview document={document} />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="metadata" pt="md">
          <Paper withBorder radius="md">
            <DocumentMetadataPanel document={document} />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="versions" pt="md">
          <Paper withBorder radius="md" p="md">
            <EmptyState
              illustration="documents"
              titleKey="documents:document.version.previous"
              subtitleKey="documents:document.version.title"
            />
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
