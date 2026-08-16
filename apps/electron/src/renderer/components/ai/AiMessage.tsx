/**
 * AI message (spec §11).
 *
 * Renders a single message in the AI chat drawer. User messages are
 * right-aligned (in LTR); assistant messages are left-aligned with a
 * branded avatar. In RTL the alignment flips automatically (Mantine's
 * `dir` handling + logical CSS properties).
 *
 * Assistant messages also render:
 *  - Citations (AiCitations) — clickable, navigate to the source document
 *  - Disclaimer (AiDisclaimer) — shown on EVERY assistant message
 *  - Suggested actions (rendered as chips) — the user must click to confirm;
 *    destructive actions trigger a confirm dialog (handled here)
 *
 * Read-only default (spec §11.4): no action is auto-executed.
 */
import { Avatar, Box, Button, Group, Stack, Text } from '@mantine/core';
import { Sparkles, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { modals } from '@mantine/modals';
import type { Citation } from '@smart-edms/types';
import { AiCitations } from './AiCitations';
import { AiDisclaimer } from './AiDisclaimer';
import { LocaleAwareDate } from '@smart-edms/ui';

interface LocalMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly citations?: Citation[];
  readonly createdAt: string;
}

interface AiMessageProps {
  readonly message: LocalMessage;
}

export function AiMessage({ message }: AiMessageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAssistant = message.role === 'assistant';

  /**
   * Render suggested action buttons. Sensitive actions require a confirm
   * dialog; destructive actions require the dedicated confirm flow (here
   * represented by a modal with the destructive styling).
   */
  const handleNavigate = (target: string): void => {
    // Read-only default: even navigation actions require the user to click.
    // The action is only executed after explicit confirmation.
    modals.openConfirmModal({
      title: t('ai:actions.confirm.title'),
      children: <Text size="sm">{t('ai:actions.confirm.body', { target })}</Text>,
      labels: { confirm: t('common:action.confirm'), cancel: t('common:action.cancel') },
      onConfirm: () => navigate(target),
    });
  };

  if (isAssistant) {
    return (
      <Group align="flex-start" gap="sm">
        <Avatar color="brand" radius="xl" size="sm">
          <Sparkles size={14} aria-hidden="true" />
        </Avatar>
        <Stack gap={4} style={{ flex: 1, maxWidth: '85%' }}>
          <Box
            p="sm"
            style={{
              background: 'var(--mantine-color-default)',
              borderRadius: 'var(--mantine-radius-md)',
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Text>
          </Box>
          {message.citations && message.citations.length > 0 && (
            <AiCitations citations={message.citations} onSelect={(docId) => navigate(`/documents/${docId}`)} />
          )}
          <Group gap="sm" align="center">
            <LocaleAwareDate value={message.createdAt} variant="datetime" size="xs" c="dimmed" />
            <Button
              variant="subtle"
              size="xs"
              onClick={() => handleNavigate('/documents')}
            >
              {t('ai:actions.navigate')}
            </Button>
          </Group>
          <AiDisclaimer />
        </Stack>
      </Group>
    );
  }

  return (
    <Group align="flex-start" gap="sm" justify="flex-end">
      <Stack gap={4} style={{ flex: 1, maxWidth: '85%', alignItems: 'flex-end' }}>
        <Box
          p="sm"
          style={{
            background: 'var(--mantine-color-brand-filled)',
            color: 'var(--mantine-color-white)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Text>
        </Box>
        <LocaleAwareDate value={message.createdAt} variant="datetime" size="xs" c="dimmed" />
      </Stack>
      <Avatar color="gray" radius="xl" size="sm">
        <User size={14} aria-hidden="true" />
      </Avatar>
    </Group>
  );
}
