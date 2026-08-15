/**
 * Topbar (spec §17, §27.5).
 *
 * Contains:
 *  - Search trigger (opens CommandPalette)
 *  - Language switcher
 *  - Theme toggle (system/light/dark)
 *  - User menu (profile, settings, sign out)
 *
 * The topbar uses logical CSS properties so the layout flips for RTL.
 */
import {
  Group,
  ActionIcon,
  Menu,
  Avatar,
  Text,
  Stack,
  SegmentedControl,
  Box,
  type CSSProperties,
} from '@mantine/core';
import {
  IconSearch,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconUser,
  IconSettings,
  IconLogout,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher';
import { useThemeStore } from '../../store/theme';
import { useAuthStore } from '../../store/auth';
import { NotificationCenter } from './NotificationCenter';
import { HelpMenu } from './HelpMenu';
import type { ThemePreference } from '@smart-edms/types';

interface TopbarProps {
  /** Open the command palette. */
  readonly onOpenCommandPalette?: () => void;
}

export function Topbar({ onOpenCommandPalette }: TopbarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const clearSession = useAuthStore((s) => s.clearSession);
  const session = useAuthStore((s) => s.session);

  const handleSignOut = async (): Promise<void> => {
    await clearSession();
    navigate('/login');
  };

  const themeIcon =
    preference === 'light' ? (
      <IconSun size={16} aria-hidden="true" />
    ) : preference === 'dark' ? (
      <IconMoon size={16} aria-hidden="true" />
    ) : (
      <IconDeviceDesktop size={16} aria-hidden="true" />
    );

  return (
    <Group
      h="100%"
      px="md"
      justify="space-between"
      gap="md"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      {/* Search trigger */}
      <Box
        style={{
          flex: 1,
          maxWidth: 480,
          cursor: 'pointer',
        }}
        onClick={onOpenCommandPalette}
        data-tour="app.search"
      >
        <Group
          gap="sm"
          px="sm"
          py={6}
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            background: 'var(--mantine-color-body)',
          }}
        >
          <IconSearch size={16} aria-hidden="true" />
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            {t('common:form.placeholder.search')}
          </Text>
          <Text size="xs" c="dimmed" style={{ opacity: 0.7 }}>
            ⌘K
          </Text>
        </Group>
      </Box>

      <Group gap="sm">
        {/* Notifications */}
        <NotificationCenter />

        {/* Help menu */}
        <HelpMenu />

        {/* Language switcher */}
        <LanguageSwitcher variant="compact" />

        {/* Theme switcher */}
        <Menu shadow="md" width={180} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={t('common:appearance.theme')} data-tour="app.themeSwitcher">
              {themeIcon}
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('common:appearance.theme')}</Menu.Label>
            <SegmentedControl
              value={preference}
              onChange={(value) => setPreference(value as ThemePreference)}
              fullWidth
              orientation="vertical"
              data={[
                { value: 'system', label: t('common:theme.system') },
                { value: 'light', label: t('common:theme.light') },
                { value: 'dark', label: t('common:theme.dark') },
              ]}
            />
          </Menu.Dropdown>
        </Menu>

        {/* User menu */}
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <Avatar
              color="brand"
              radius="xl"
              size="sm"
              style={{ cursor: 'pointer' }}
              aria-label={t('common:aria.userMenu')}
              data-tour="app.userMenu"
            >
              {session?.userId?.slice(0, 1).toUpperCase() ?? '?'}
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>
              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  {session?.userId}
                </Text>
                <Text size="xs" c="dimmed">
                  {session?.tenantId}
                </Text>
              </Stack>
            </Menu.Label>
            <Menu.Divider />
            <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate('/settings')}>
              {t('common:menu.profile')}
            </Menu.Item>
            <Menu.Item leftSection={<IconSettings size={14} />} onClick={() => navigate('/settings')}>
              {t('common:menu.settings')}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconLogout size={14} />}
              color="error"
              onClick={() => void handleSignOut()}
            >
              {t('common:menu.signOut')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
