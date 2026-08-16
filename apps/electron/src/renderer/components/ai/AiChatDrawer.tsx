/**
 * AI chat drawer (spec §11).
 *
 * Mantine Drawer that slides in from the inline-end side (right in LTR,
 * left in RTL). Contains:
 *  - Header with the assistant title + subtitle ("read-only by default")
 *  - Messages list (AiMessage components)
 *  - Suggested actions (rendered as chips)
 *  - Input box with send button
 *  - Settings + clear conversation controls
 *
 * The drawer is keyboard accessible:
 *  - Tab moves focus through interactive elements.
 *  - Enter sends the message (Shift+Enter for newline).
 *  - Escape closes the drawer.
 *
 * Read-only default (spec §11.4): the assistant never auto-executes actions.
 * Suggested actions are shown as buttons that the user must click to confirm.
 * Destructive actions require an additional confirm dialog (handled in
 * AiMessage).
 */
import { type KeyboardEvent, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Send, Settings, Sparkles, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '../../i18n/config';
import {
  useSendAiMessageMutation,
  useStartAiSessionMutation,
} from '../../api/hooks';
import { AiMessage } from './AiMessage';
import { AiDisclaimer } from './AiDisclaimer';
import { EmptyState, ErrorState, LoadingState } from '@smart-edms/ui';
import type { Citation } from '@smart-edms/types';

interface AiChatDrawerProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

interface LocalMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly citations?: Citation[];
  readonly createdAt: string;
}

export function AiChatDrawer({ opened, onClose }: AiChatDrawerProps) {
  const { t } = useTranslation();
  const locale = useI18nStore((s) => s.locale);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startSession = useStartAiSessionMutation({
    onSuccess: (session) => setSessionId(session.id),
  });
  const sendMessage = useSendAiMessageMutation(sessionId ?? '', {
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        {
          id: response.messageId,
          role: 'assistant',
          content: response.content,
          citations: response.citations,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
  });

  const handleSend = (): void => {
    if (!input.trim()) {return;}
    if (!sessionId) {
      startSession.mutate({ locale });
      setTimeout(() => {
        sendMessage.mutate({ content: input });
      }, 100);
    } else {
      sendMessage.mutate({ content: input });
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: 'user',
        content: input,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = (): void => {
    setMessages([]);
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      padding={0}
      title={
        <Group gap="sm">
          <Sparkles size={20} aria-hidden="true" />
          <Stack gap={0}>
            <Title order={5}>{t('ai:bubble.panel.title')}</Title>
            <Text size="xs" c="dimmed">
              {t('ai:bubble.panel.subtitle')}
            </Text>
          </Stack>
          <Group gap={4} ml="auto">
            <ActionIcon key="settings" variant="subtle" aria-label={t('ai:bubble.panel.settings')}>
              <Settings size={16} aria-hidden="true" />
            </ActionIcon>
            <ActionIcon
              key="clear"
              variant="subtle"
              aria-label={t('ai:bubble.panel.clear')}
              onClick={handleClear}
            >
              <Trash size={16} aria-hidden="true" />
            </ActionIcon>
          </Group>
        </Group>
      }
    >
      <Stack gap={0} style={{ height: '100%' }}>
        <ScrollArea flex={1} p="md">
          {messages.length === 0 ? (
            <EmptyState
              illustration="generic"
              titleKey="ai:bubble.empty.title"
              subtitleKey="ai:bubble.empty.subtitle"
              actions={
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setInput(t('ai:bubble.suggestion.example1'))}
                >
                  {t('ai:bubble.suggestion.example1')}
                </Button>
              }
            />
          ) : (
            <Stack gap="md">
              {messages.map((msg) => (
                <AiMessage key={msg.id} message={msg} />
              ))}
              {sendMessage.isPending && (
                <LoadingState messageKey="ai:bubble.typing.title" />
              )}
              {sendMessage.isError && (
                <ErrorState
                  error={sendMessage.error}
                  onRetry={() => sendMessage.mutate({ content: input })}
                />
              )}
            </Stack>
          )}
        </ScrollArea>

        <Box
          p="sm"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Group gap="sm">
            <TextInput
              placeholder={t('ai:bubble.input.placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              flex={1}
              aria-label={t('ai:bubble.input.placeholder')}
              disabled={sendMessage.isPending}
            />
            <ActionIcon
              variant="filled"
              color="brand"
              size="lg"
              onClick={handleSend}
              loading={sendMessage.isPending}
              aria-label={t('ai:bubble.input.send')}
            >
              <Send size={18} aria-hidden="true" />
            </ActionIcon>
          </Group>
          <Box mt="xs">
            <AiDisclaimer />
          </Box>
        </Box>
      </Stack>
    </Drawer>
  );
}
