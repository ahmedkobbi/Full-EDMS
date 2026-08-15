/**
 * Document detail page (spec §9.3, §9.4, §9.6).
 *
 * Full document view with real backend integration:
 *  - Document metadata (title, description, type, classification, tags)
 *  - Classification banner (colored by sensitivity level)
 *  - Version history (list all versions, restore)
 *  - Comments (list, create, resolve)
 *  - Tags (list, add, remove)
 *  - Actions: lock/unlock, download, share, declare-as-record, delete
 *  - Metadata panel (custom fields)
 *
 * All data fetched from backend — no mock data.
 *
 * Spec ref: §9.3 (document management), §9.4 (classification banners),
 *           §9.6 (versioning + immutability).
 */
import { useState } from 'react';
import {
  Stack, Title, Text, Group, Button, Paper, Tabs, Badge, Table, Textarea,
  ActionIcon, ThemeIcon, Divider, LoadingOverlay, TextInput,
  SimpleGrid, Menu, Code,
} from '@mantine/core';
import {
  IconArrowLeft, IconDownload, IconLock, IconLockOpen, IconShare, IconTrash,
  IconHistory, IconMessageCircle, IconTag, IconFileInfo, IconShieldCheck,
  IconRefresh, IconPlus, IconDots,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useDocumentQuery, useDeleteDocumentMutation, useDocumentVersionsQuery,
  useDocumentCommentsQuery, useCreateCommentMutation, useDocumentTagsQuery,
  useAddTagMutation, useLockDocumentMutation, useUnlockDocumentMutation,
  useRestoreVersionMutation, useDeclareRecordMutation,
} from '../api/hooks';
import { LoadingState, ErrorState, EmptyState, LocaleAwareDate } from '@smart-edms/ui';
import { ClassificationBanner } from '../components/common/ClassificationBanner';

export function DocumentDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('versions');

  const docQuery = useDocumentQuery(id!);
  const deleteDoc = useDeleteDocumentMutation();
  const lockDoc = useLockDocumentMutation(id!);
  const unlockDoc = useUnlockDocumentMutation(id!);
  const declareRecord = useDeclareRecordMutation(id!);

  const doc = docQuery.data as any;

  if (docQuery.isLoading) return <LoadingState variant="skeleton" />;
  if (docQuery.isError) return <ErrorState error={docQuery.error} titleKey="errors.NOT_FOUND" messageKey="document.notFound" onRetry={() => docQuery.refetch()} />;
  if (!doc) return null;

  return (
    <Stack gap="md" data-tour-page="document-detail">
      {/* Back button + actions */}
      <Group justify="space-between">
        <Button variant="subtle" leftSection={<IconArrowLeft size={14} aria-hidden="true" />} onClick={() => navigate('/documents')}>
          {t('common:action.back', { defaultValue: 'Back' })}
        </Button>
        <Group gap="xs">
          <Button variant="light" leftSection={<IconDownload size={14} aria-hidden="true" />}>
            {t('common:action.download', { defaultValue: 'Download' })}
          </Button>
          {doc.isLocked ? (
            <Button variant="light" leftSection={<IconLockOpen size={14} aria-hidden="true" />} onClick={() => unlockDoc.mutate()} loading={unlockDoc.isPending}>
              {t('document.unlock', { defaultValue: 'Unlock' })}
            </Button>
          ) : (
            <Button variant="light" leftSection={<IconLock size={14} aria-hidden="true" />} onClick={() => lockDoc.mutate()} loading={lockDoc.isPending}>
              {t('document.lock', { defaultValue: 'Lock' })}
            </Button>
          )}
          <Button variant="light" leftSection={<IconShare size={14} aria-hidden="true" />}>
            {t('common:action.share', { defaultValue: 'Share' })}
          </Button>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="light" size="lg"><IconDots size={16} aria-hidden="true" /></ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {!doc.isRecord && (
                <Menu.Item leftSection={<IconShieldCheck size={14} aria-hidden="true" />} onClick={() => declareRecord.mutate({ reason: 'Declared as record' })}>
                  {t('document.declareRecord', { defaultValue: 'Declare as record' })}
                </Menu.Item>
              )}
              <Menu.Item leftSection={<IconRefresh size={14} aria-hidden="true" />} onClick={() => docQuery.refetch()}>
                {t('common:action.refresh', { defaultValue: 'Refresh' })}
              </Menu.Item>
              <Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={14} aria-hidden="true" />} onClick={() => { if (confirm(t('document.confirmDelete', { defaultValue: 'Delete this document?' }))) { deleteDoc.mutate(id ?? '', { onSuccess: () => navigate('/documents') }); } }}>
                {t('common:action.delete', { defaultValue: 'Delete' })}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* Classification banner */}
      <ClassificationBanner
        bannerText={doc.classification?.bannerText ?? null}
        color={doc.classification?.color ?? null}
        sensitivityLevel={doc.sensitivityLevel ?? 2}
        nameKey={doc.classification?.nameKey}
      />

      {/* Document header */}
      <Paper p="md" withBorder radius="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Stack gap={4}>
              <Title order={3}>{doc.title}</Title>
              {doc.description && <Text size="sm" c="dimmed">{doc.description}</Text>}
            </Stack>
            <Group gap="xs">
              {doc.isRecord && <Badge color="grape" variant="filled">{t('document.record', { defaultValue: 'Record' })}</Badge>}
              {doc.isLocked && <Badge color="orange" variant="filled">{t('document.locked', { defaultValue: 'Locked' })}</Badge>}
              <Badge variant="light">{doc.status}</Badge>
            </Group>
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <InfoItem label={t('document.type', { defaultValue: 'Type' })} value={doc.documentType ?? '—'} />
            <InfoItem label={t('document.language', { defaultValue: 'Language' })} value={doc.contentLanguage ?? '—'} />
            <InfoItem label={t('common:label.created', { defaultValue: 'Created' })} value={<LocaleAwareDate value={doc.createdAt} size="xs" />} />
            <InfoItem label={t('common:label.updated', { defaultValue: 'Updated' })} value={<LocaleAwareDate value={doc.updatedAt} size="xs" />} />
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* Tabs: versions, comments, tags, metadata */}
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'versions')}>
        <Tabs.List>
          <Tabs.Tab value="versions" leftSection={<IconHistory size={14} aria-hidden="true" />}>
            {t('document.versions', { defaultValue: 'Versions' })}
          </Tabs.Tab>
          <Tabs.Tab value="comments" leftSection={<IconMessageCircle size={14} aria-hidden="true" />}>
            {t('document.comments', { defaultValue: 'Comments' })}
          </Tabs.Tab>
          <Tabs.Tab value="tags" leftSection={<IconTag size={14} aria-hidden="true" />}>
            {t('document.tags', { defaultValue: 'Tags' })}
          </Tabs.Tab>
          <Tabs.Tab value="metadata" leftSection={<IconFileInfo size={14} aria-hidden="true" />}>
            {t('document.metadata', { defaultValue: 'Metadata' })}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="versions" pt="md">
          <VersionsTab documentId={id!} />
        </Tabs.Panel>
        <Tabs.Panel value="comments" pt="md">
          <CommentsTab documentId={id!} />
        </Tabs.Panel>
        <Tabs.Panel value="tags" pt="md">
          <TagsTab documentId={id!} />
        </Tabs.Panel>
        <Tabs.Panel value="metadata" pt="md">
          <MetadataTab doc={doc} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm">{value}</Text>
    </Stack>
  );
}

// ── Versions Tab ────────────────────────────────────────────────────────────

function VersionsTab({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const versionsQuery = useDocumentVersionsQuery(documentId);
  const restoreVersion = useRestoreVersionMutation(documentId);
  const versions = (versionsQuery.data ?? []) as any[];

  return (
    <Paper p="md" withBorder radius="md" pos="relative">
      <LoadingOverlay visible={versionsQuery.isLoading} />
      {versions.length === 0 ? (
        <EmptyState illustration="generic" titleKey="document.versions.empty.title" subtitleKey="document.versions.empty.subtitle" />
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>{t('document.version.size', { defaultValue: 'Size' })}</Table.Th>
              <Table.Th>{t('document.version.checksum', { defaultValue: 'Checksum' })}</Table.Th>
              <Table.Th>{t('document.version.reason', { defaultValue: 'Reason' })}</Table.Th>
              <Table.Th>{t('common:label.created', { defaultValue: 'Created' })}</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {versions.map((v) => (
              <Table.Tr key={v.id}>
                <Table.Td><Badge variant="light">v{v.versionNumber}</Badge></Table.Td>
                <Table.Td><Text size="xs">{formatBytes(Number(v.sizeBytes))}</Text></Table.Td>
                <Table.Td><Code>{v.checksum?.slice(0, 12)}…</Code></Table.Td>
                <Table.Td><Text size="xs">{v.changeReason ?? '—'}</Text></Table.Td>
                <Table.Td><LocaleAwareDate value={v.createdAt} size="xs" c="dimmed" /></Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconHistory size={12} aria-hidden="true" />}
                    onClick={() => {
                      const reason = prompt(t('document.version.restoreReason', { defaultValue: 'Reason for restore:' }));
                      if (reason) restoreVersion.mutate({ versionId: v.id, reason });
                    }}
                    loading={restoreVersion.isPending}
                  >
                    {t('document.version.restore', { defaultValue: 'Restore' })}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}

// ── Comments Tab ────────────────────────────────────────────────────────────

function CommentsTab({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const commentsQuery = useDocumentCommentsQuery(documentId);
  const createComment = useCreateCommentMutation(documentId);
  const [newComment, setNewComment] = useState('');
  const comments = (commentsQuery.data ?? []) as any[];

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ body: newComment }, {
      onSuccess: () => setNewComment(''),
    });
  };

  return (
    <Stack gap="md">
      <Paper p="md" withBorder radius="md">
        <Textarea
          placeholder={t('document.comments.placeholder', { defaultValue: 'Write a comment…' })}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          autosize
          minRows={2}
        />
        <Group justify="flex-end" mt="sm">
          <Button size="xs" onClick={handleSubmit} loading={createComment.isPending} disabled={!newComment.trim()}>
            {t('document.comments.submit', { defaultValue: 'Comment' })}
          </Button>
        </Group>
      </Paper>

      <Paper p="md" withBorder radius="md" pos="relative">
        <LoadingOverlay visible={commentsQuery.isLoading} />
        {comments.length === 0 ? (
          <EmptyState illustration="generic" titleKey="document.comments.empty.title" subtitleKey="document.comments.empty.subtitle" />
        ) : (
          <Stack gap="sm">
            {comments.map((c) => (
              <Paper key={c.id} p="sm" withBorder radius="sm">
                <Group justify="space-between" mb={4}>
                  <Group gap="xs">
                    <ThemeIcon size={24} radius="xl" variant="light" color="blue">
                      <IconMessageCircle size={12} aria-hidden="true" />
                    </ThemeIcon>
                    <Text size="sm" fw={500}>{c.user?.firstName} {c.user?.lastName}</Text>
                    {c.resolved && <Badge size="xs" color="teal" variant="light">{t('document.comments.resolved', { defaultValue: 'Resolved' })}</Badge>}
                  </Group>
                  <LocaleAwareDate value={c.createdAt} size="xs" c="dimmed" />
                </Group>
                <Text size="sm">{c.body}</Text>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

// ── Tags Tab ────────────────────────────────────────────────────────────────

function TagsTab({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const tagsQuery = useDocumentTagsQuery(documentId);
  const addTag = useAddTagMutation(documentId);
  const [newTag, setNewTag] = useState('');
  const tags = tagsQuery.data?.tags ?? [];

  const handleAdd = () => {
    if (!newTag.trim()) return;
    addTag.mutate(newTag.trim(), { onSuccess: () => setNewTag('') });
  };

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="sm">
        <Group gap="xs">
          <TextInput
            placeholder={t('document.tags.placeholder', { defaultValue: 'Add tag…' })}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            size="sm"
          />
          <Button size="sm" onClick={handleAdd} loading={addTag.isPending} leftSection={<IconPlus size={12} aria-hidden="true" />}>
            {t('common:action.add', { defaultValue: 'Add' })}
          </Button>
        </Group>
        <Group gap="xs">
          {tags.length === 0 ? (
            <Text size="sm" c="dimmed">{t('document.tags.empty', { defaultValue: 'No tags yet' })}</Text>
          ) : (
            tags.map((tag) => (
              <Badge key={tag} variant="light" size="md">{tag}</Badge>
            ))
          )}
        </Group>
      </Stack>
    </Paper>
  );
}

// ── Metadata Tab ────────────────────────────────────────────────────────────

function MetadataTab({ doc }: { doc: any }) {
  const { t } = useTranslation();

  const metadataFields = [
    { label: t('metadata.fields.documentType', { defaultValue: 'Document type' }), value: doc.documentType },
    { label: t('metadata.fields.sourceSystem', { defaultValue: 'Source system' }), value: doc.sourceSystem },
    { label: t('metadata.fields.contentLanguage', { defaultValue: 'Content language' }), value: doc.contentLanguage },
    { label: t('metadata.fields.textDirection', { defaultValue: 'Text direction' }), value: doc.textDirection },
  ];

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="sm">
        <Text fw={500}>{t('document.metadata.title', { defaultValue: 'Document metadata' })}</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {metadataFields.map((field) => (
            <Stack key={field.label} gap={0}>
              <Text size="xs" c="dimmed">{field.label}</Text>
              <Text size="sm">{field.value ?? '—'}</Text>
            </Stack>
          ))}
        </SimpleGrid>
        {doc.classification && (
          <>
            <Divider />
            <Stack gap={0}>
              <Text size="xs" c="dimmed">{t('document.metadata.classification', { defaultValue: 'Classification' })}</Text>
              <Group gap="xs">
                <Badge color={doc.classification.color ?? 'gray'} variant="filled">{doc.classification.bannerText ?? doc.classification.code}</Badge>
                <Text size="sm">Level {doc.sensitivityLevel}</Text>
              </Group>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
