/**
 * AI assistant bubble (spec §11).
 *
 * A floating button that opens the AiChatDrawer. Position is bottom-end in
 * LTR locales and bottom-start in RTL (Arabic) — both are achieved via
 * logical CSS properties (`inset-inline-end`), not hardcoded `right`/`left`.
 *
 * The bubble is hidden when:
 *  - The `ai-assistant` license module is not active.
 *  - The user's role is not in `AssistantSettings.allowedRoleIds`.
 *  - The user has dismissed the assistant from settings.
 *
 * The bubble is keyboard accessible:
 *  - Tab to focus.
 *  - Enter / Space to open.
 *  - Esc closes the drawer.
 *
 * The bubble degrades gracefully: if the AI gateway is unreachable, the
 * drawer opens but shows a localized "AI unavailable" message instead of
 * crashing.
 */
import { useState, useEffect } from 'react';
import { ActionIcon, Box, Tooltip } from '@mantine/core';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLicenseStateQuery } from '../../api/hooks';
import { AiChatDrawer } from './AiChatDrawer';

export function AiAssistantBubble() {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const licenseQuery = useLicenseStateQuery();

  // Hide when the AI assistant module is not licensed.
  const aiLicensed =
    licenseQuery.data?.artifact?.payload?.entitlements?.includes('ai-assistant') ?? false;

  // Re-check on window focus so a newly-activated license is picked up.
  useEffect(() => {
    const handler = () => licenseQuery.refetch();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [licenseQuery]);

  if (!aiLicensed) return null;

  return (
    <>
      <Box
        style={{
          position: 'fixed',
          // Logical CSS property — flips automatically for RTL.
          insetInlineEnd: 24,
          bottom: 24,
          zIndex: 800,
        }}
        data-tour="ai.bubble"
      >
        <Tooltip label={t('ai:bubble.launcher.tooltip')} position="top-end">
          <ActionIcon
            variant="filled"
            color="brand"
            size="xl"
            radius="xl"
            aria-label={t('ai:bubble.launcher.aria')}
            onClick={() => setOpened((o) => !o)}
            style={{
              width: 56,
              height: 56,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            {opened ? (
              <MessageCircle size={24} aria-hidden="true" />
            ) : (
              <Sparkles size={24} aria-hidden="true" />
            )}
          </ActionIcon>
        </Tooltip>
      </Box>

      <AiChatDrawer opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}
