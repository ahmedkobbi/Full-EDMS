/**
 * Topbar (spec §17, §27.5).
 *
 * Contains:
 *  - Page title (passed in via props by each page)
 *  - Language switcher
 *  - Theme toggle (system/light/dark)
 *  - Step-up badge (shows remaining minutes when a step-up session is active)
 *  - User menu (profile, sign out)
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
  Badge,
  Tooltip,
} from '@mantine/core';
import {
  Sun,
  Moon,
  Monitor,
  User,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/theme';
import {
  useAuthStore,
  selectAdminProfile,
  selectHasStepUp,
  selectStepUpExpiresAt,
} from '../../store/auth';
import type { ThemePreference } from '@smart-edms/types';
import { LOCALES, isRtl } from '@smart-edms/i18n';
import { useI18nStore } from '../../i18n/config';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';

export function Topbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearStepUpToken = useAuthStore((s) => s.clearStepUpToken);
  const admin = useAuthStore(selectAdminProfile);
  const hasStepUp = useAuthStore(selectHasStepUp);
  const stepUpExpiresAt = useAuthStore(selectStepUpExpiresAt);

  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const handleSignOut = (): void => {
    clearSession();
    navigate('/login');
  };

  const themeIcon =
    preference === 'light' ? (
      <Sun size={16} aria-hidden="true" />
    ) : preference === 'dark' ? (
      <Moon size={16} aria-hidden="true" />
    ) : (
      <Monitor size={16} aria-hidden="true" />
    );

  const remainingMs = stepUpExpiresAt ? stepUpExpiresAt - Date.now() : 0;
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60_000));

  return (
    <Group
      h="100%"
      px="md"
      justify="space-between"
      gap="md"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Box data-tour="admin.topbar.title" style={{ flex: 1, minWidth: 0 }}>
        <Text size="md" fw={600} truncate>
          {t('admin:app.title')}
        </Text>
      </Box>

      <Group gap="sm">
        {hasStepUp && (
          <Tooltip label={t('admin:stepUp.active', { minutes: remainingMin })}>
            <Badge
              color="success"
              variant="light"
              leftSection={<ShieldCheck size={12} aria-hidden="true" />}
              data-tour="admin.stepUpBadge"
            >
              {t('admin:stepUp.badge', { minutes: remainingMin })}
            </Badge>
          </Tooltip>
        )}

        {/* Language switcher */}
        <Menu shadow="md" width={220} position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={t('common:language.current', { name: current.nativeName })} data-tour="admin.languageSwitcher">
              <span style={{ fontSize: 14, fontWeight: 600 }}>{current.code.toUpperCase()}</span>
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('common:language.label')}</Menu.Label>
            {LOCALES.map((meta) => (
              <Menu.Item
                key={meta.code}
                onClick={() => setLocale(meta.code as MandatoryLocaleCode)}
                lang={meta.htmlLang}
                aria-current={meta.code === locale ? 'true' : undefined}
              >
                <Group justify="space-between">
                  <span>{meta.nativeName}</span>
                  <Text size="xs" c="dimmed">
                    {isRtl(meta.code as MandatoryLocaleCode) ? 'RTL' : 'LTR'}
                  </Text>
                </Group>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>

        {/* Theme switcher */}
        <Menu shadow="md" width={180} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={t('common:theme.system')} data-tour="admin.themeSwitcher">
              {themeIcon}
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('common:theme.system')}</Menu.Label>
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
        <Menu shadow="md" width={240} position="bottom-end">
          <Menu.Target>
            <Avatar
              color="brand"
              radius="xl"
              size="sm"
              style={{ cursor: 'pointer' }}
              aria-label={t('common:aria.userMenu')}
              data-tour="admin.userMenu"
            >
              {admin?.email?.slice(0, 1).toUpperCase() ?? '?'}
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>
              <Stack gap={0}>
                <Text size="sm" fw={500}>
                  {admin?.email}
                </Text>
                <Text size="xs" c="dimmed">
                  {admin ? t(`admin:role.${admin.role}`) : ''}
                </Text>
              </Stack>
            </Menu.Label>
            <Menu.Divider />
            <Menu.Item leftSection={<User size={14} />} onClick={() => navigate('/settings')}>
              {t('common:menu.profile')}
            </Menu.Item>
            <Menu.Item leftSection={<Settings size={14} />} onClick={() => navigate('/settings')}>
              {t('common:menu.settings')}
            </Menu.Item>
            {hasStepUp && (
              <>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<ShieldCheck size={14} />}
                  onClick={() => clearStepUpToken()}
                  color="warning"
                >
                  {t('admin:stepUp.clear')}
                </Menu.Item>
              </>
            )}
            <Menu.Divider />
            <Menu.Item
              leftSection={<LogOut size={14} />}
              color="error"
              onClick={handleSignOut}
            >
              {t('common:menu.signOut')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
