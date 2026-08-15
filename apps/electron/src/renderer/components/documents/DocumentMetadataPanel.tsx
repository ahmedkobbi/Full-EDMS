/**
 * Document metadata panel (spec §9.5, §9.3).
 *
 * Renders the document's metadata as a definition list. Each field is
 * rendered with its localized label (via `t(field.labelKey)`) and value
 * (formatted per the field type — date, number, enum, etc.).
 *
 * The panel also shows the document's:
 *  - Status (draft / active / archived / etc.)
 *  - Classification label
 *  - Tags
 *  - Owner
 *  - Created / updated timestamps (locale-aware)
 *  - Cryptographic checksum (truncated, copyable)
 */
import { Stack, Group, Text, Box, Badge, CopyButton, Button, Divider } from '@mantine/core';
import { IconCopy, IconCheck, IconTag, IconLock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Document } from '@smart-edms/types';
import { LocaleAwareDate } from '../common/LocaleAwareDate';

interface DocumentMetadataPanelProps {
  readonly document: Document;
}

export function DocumentMetadataPanel({ document }: DocumentMetadataPanelProps) {
  const { t } = useTranslation();

  return (
    <Stack gap="sm" p="md">
      <Text fw={600} size="sm">
        {t('documents:document.title')}
      </Text>

      <MetadataRow labelKey="documents:document.name" value={document.title} />
      {document.description && (
        <MetadataRow labelKey="documents:document.description" value={document.description} />
      )}
      <MetadataRow
        labelKey="documents:document.status"
        value={<Badge variant="light">{t(`common:status.${document.status}`)}</Badge>}
      />
      <MetadataRow
        labelKey="documents:document.language"
        value={document.contentLanguage}
      />
      <MetadataRow
        labelKey="documents:document.classification"
        value={
          <Badge variant="light" color="warning" leftSection={<IconLock size={10} />}>
            {document.classificationLabelId}
          </Badge>
        }
      />
      <MetadataRow
        labelKey="documents:document.tags"
        value={
          <Group gap={4}>
            {document.tagIds.length === 0 ? (
              <Text size="xs" c="dimmed">
                {t('common:label.none', { defaultValue: 'None' })}
              </Text>
            ) : (
              document.tagIds.map((tag) => (
                <Badge key={tag} variant="light" size="sm" leftSection={<IconTag size={10} />}>
                  {tag}
                </Badge>
              ))
            )}
          </Group>
        }
      />

      <Divider />

      <MetadataRow
        labelKey="documents:document.created"
        value={<LocaleAwareDate value={document.createdAt} variant="datetime" />}
      />
      <MetadataRow
        labelKey="documents:document.modified"
        value={<LocaleAwareDate value={document.updatedAt} variant="datetime" />}
      />
      <MetadataRow
        labelKey="documents:document.owner"
        value={document.ownerUserId}
      />

      {document.legalHold && (
        <Group gap="sm" mt="sm">
          <Badge variant="filled" color="error" leftSection={<IconLock size={10} />}>
            {t('documents:document.legalHold', { defaultValue: 'Legal hold' })}
          </Badge>
        </Group>
      )}

      <Divider />

      {/* Cryptographic checksum — truncated + copyable */}
      <Stack gap={4}>
        <Text size="xs" c="dimmed" fw={600}>
          {t('documents:document.checksum')}
        </Text>
        <Group gap="xs">
          <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
            {document.currentVersionId.slice(0, 16)}…
          </Text>
          <CopyButton value={document.currentVersionId}>
            {({ copied, copy }) => (
              <Button
                variant="subtle"
                size="xs"
                onClick={copy}
                leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} aria-hidden="true" />}
              >
                {copied ? t('common:toast.saved') : t('common:action.copy')}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Stack>
    </Stack>
  );
}

interface MetadataRowProps {
  readonly labelKey: string;
  readonly value: React.ReactNode;
}

function MetadataRow({ labelKey, value }: MetadataRowProps) {
  const { t } = useTranslation();
  const fullKey = labelKey.includes(':') ? labelKey : `documents:${labelKey}`;
  return (
    <Group justify="space-between" align="flex-start" gap="sm">
      <Text size="xs" c="dimmed" fw={500}>
        {t(fullKey)}
      </Text>
      <Box style={{ flex: 1, textAlign: 'end' }}>
        {typeof value === 'string' ? <Text size="sm">{value}</Text> : value}
      </Box>
    </Group>
  );
}
