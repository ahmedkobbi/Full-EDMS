/**
 * Help menu component (spec §10.14 — help menu launch).
 *
 * A dropdown menu in the topbar that provides:
 *  - Start / restart Guided Tour
 *  - Search documentation
 *  - Contact support
 *  - Keyboard shortcuts reference
 *  - About Smart EDMS
 *
 * All text uses t() (spec §16.3 — no hardcoded UI strings).
 * The help menu is the tour target `help.menu` (spec §10.13).
 *
 * Spec ref: §10.14 (help menu launch), §10.13 (stable selectors).
 */
import { Menu, ActionIcon, Stack, Text, Group, ThemeIcon, Divider } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
  IconHelp,
  IconRoute,
  IconBook,
  IconLifebuoy,
  IconKeyboard,
  IconInfoCircle,
} from '@tabler/icons-react';

export function HelpMenu() {
  const { t } = useTranslation();

  const startTour = (tourId: string) => {
    window.dispatchEvent(
      new CustomEvent('command-palette:start-tour', { detail: { tourId } }),
    );
  };

  return (
    <Menu shadow="md" width={260} position="bottom-end">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label={t('common:menu.help', { defaultValue: 'Help' })}
          data-tour="help.menu"
        >
          <IconHelp size={20} aria-hidden="true" />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{t('help.menu.title', { defaultValue: 'Help' })}</Menu.Label>

        <Menu.Item
          leftSection={<IconRoute size={14} aria-hidden="true" />}
          onClick={() => startTour('welcome')}
        >
          {t('help.menu.startWelcomeTour', { defaultValue: 'Start welcome tour' })}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconRoute size={14} aria-hidden="true" />}
          onClick={() => startTour('documents')}
        >
          {t('help.menu.startDocumentTour', { defaultValue: 'Document tour' })}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconRoute size={14} aria-hidden="true" />}
          onClick={() => startTour('search')}
        >
          {t('help.menu.startSearchTour', { defaultValue: 'Search tour' })}
        </Menu.Item>

        <Divider />

        <Menu.Item
          leftSection={<IconBook size={14} aria-hidden="true" />}
          component="a"
          href="/docs"
        >
          {t('help.menu.documentation', { defaultValue: 'Documentation' })}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconLifebuoy size={14} aria-hidden="true" />}
          component="a"
          href="mailto:support@smart-edms.example"
        >
          {t('help.menu.contactSupport', { defaultValue: 'Contact support' })}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconKeyboard size={14} aria-hidden="true" />}
        >
          {t('help.menu.keyboardShortcuts', { defaultValue: 'Keyboard shortcuts' })}
        </Menu.Item>

        <Divider />

        <Menu.Item
          leftSection={<IconInfoCircle size={14} aria-hidden="true" />}
        >
          <Stack gap={0}>
            <Text size="xs" fw={500}>
              {t('help.menu.about', { defaultValue: 'About Smart EDMS' })}
            </Text>
            <Text size="xs" c="dimmed">
              {t('common:app.version', { defaultValue: 'Version {{version}}', version: '1.0.0' })}
            </Text>
          </Stack>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
