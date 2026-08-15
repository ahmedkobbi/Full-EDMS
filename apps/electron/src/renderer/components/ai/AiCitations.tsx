/**
 * AI citations (spec §11.8).
 *
 * Renders the citations attached to an assistant answer. Each citation
 * shows:
 *  - Document title (clickable → navigate to the document)
 *  - Confidence score (if available)
 *  - Classification label (if available)
 *
 * Citations may ONLY reference resources the user is authorised to access
 * (the backend enforces this). The client just displays them.
 *
 * Accessibility:
 *  - Each citation is a link with a descriptive aria-label.
 *  - The list has role="list" for screen reader announcement.
 */
import { Stack, Group, Text, Badge, UnstyledButton } from '@mantine/core';
import { FileText, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Citation } from '@smart-edms/types';
import { formatPercent } from '@smart-edms/i18n';
import { useI18nStore } from '../../i18n/config';

interface AiCitationsProps {
  readonly citations: readonly Citation[];
  /** Called when the user clicks a citation. Receives the document id. */
  readonly onSelect: (documentId: string) => void;
}

export function AiCitations({ citations, onSelect }: AiCitationsProps) {
  const { t } = useTranslation();
  const locale = useI18nStore((s) => s.locale);

  if (citations.length === 0) return null;

  return (
    <Stack gap={4} role="list" aria-label={t('ai:bubble.response.citations')}>
      <Text size="xs" c="dimmed" fw={600}>
        {t('ai:bubble.response.citations.count', { count: citations.length })}
      </Text>
      {citations.map((citation) => (
        <UnstyledButton
          key={citation.documentId}
          onClick={() => onSelect(citation.documentId)}
          role="listitem"
          aria-label={t('ai:citations.openDocument', { title: citation.title })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 'var(--mantine-radius-sm)',
            border: '1px solid var(--mantine-color-default-border)',
            background: 'var(--mantine-color-body)',
            width: '100%',
            textAlign: 'start',
          }}
        >
          <FileText size={14} aria-hidden="true" />
          <Group gap={4} style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
            <Text size="xs" truncate fw={500}>
              {citation.title}
            </Text>
            {citation.confidence != null && (
              <Badge size="xs" variant="light" color="gray">
                {formatPercent(citation.confidence / 100, locale)}
              </Badge>
            )}
          </Group>
          <ExternalLink size={12} aria-hidden="true" />
        </UnstyledButton>
      ))}
    </Stack>
  );
}
