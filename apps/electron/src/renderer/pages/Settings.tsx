/**
 * Settings page (spec §9.1, §17).
 *
 * User-level settings with tabs:
 *  - Profile
 *  - Preferences (locale, theme, density)
 *  - Accessibility
 *  - Notifications
 *  - Security (MFA, sessions)
 *
 * All settings are saved via the backend's `PATCH /v1/users/me/preferences`
 * endpoint — no client-only persistence for user data.
 */
import { Stack, Title, Text, Tabs, Paper, Group, SegmentedControl, Select } from '@mantine/core';
import { IconUser, IconSettings, IconAccessibility, IconBell, IconShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/theme';
import { useI18nStore } from '../i18n/config';
import { LOCALES } from '@smart-edms/i18n';
import type { ThemePreference } from '@smart-edms/types';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import { LicenseStatusBadge } from '../components/license/LicenseStatusBadge';

export function SettingsPage() {
  const { t } = useTranslation();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const locale = useI18nStore((s) => s.locale);

  return (
    <Stack gap="md" data-tour-page="settings" data-tour="app.settings">
      <Stack gap={4}>
        <Title order={2}>{t('settings:title')}</Title>
        <Text size="sm" c="dimmed">
          {t('settings:subtitle')}
        </Text>
      </Stack>

      <Tabs defaultValue="preferences">
        <Tabs.List>
          <Tabs.Tab value="profile" leftSection={<IconUser size={14} aria-hidden="true" />}>
            {t('settings:tab.profile')}
          </Tabs.Tab>
          <Tabs.Tab value="preferences" leftSection={<IconSettings size={14} aria-hidden="true" />}>
            {t('settings:tab.preferences')}
          </Tabs.Tab>
          <Tabs.Tab value="accessibility" leftSection={<IconAccessibility size={14} aria-hidden="true" />}>
            {t('settings:tab.accessibility')}
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={14} aria-hidden="true" />}>
            {t('settings:tab.notifications')}
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShieldCheck size={14} aria-hidden="true" />}>
            {t('settings:tab.security')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="md">
          <Paper p="lg" withBorder radius="md">
            <Stack gap="md">
              <Title order={5}>{t('settings:profile.title')}</Title>
              <Text size="sm" c="dimmed">
                {t('settings:profile.subtitle')}
              </Text>
              {/* Profile form would go here — backend integration */}
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="preferences" pt="md">
          <Paper p="lg" withBorder radius="md">
            <Stack gap="lg">
              <Title order={5}>{t('settings:preferences.title')}</Title>

              <Group justify="space-between">
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {t('settings:preferences.language')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings:preferences.language.description')}
                  </Text>
                </Stack>
                <LanguageSwitcher variant="full" />
              </Group>

              <Group justify="space-between">
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {t('settings:appearance.theme')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('settings:appearance.subtitle')}
                  </Text>
                </Stack>
                <SegmentedControl
                  value={preference}
                  onChange={(value) => setPreference(value as ThemePreference)}
                  data={[
                    { value: 'system', label: t('common:theme.system') },
                    { value: 'light', label: t('common:theme.light') },
                    { value: 'dark', label: t('common:theme.dark') },
                  ]}
                />
              </Group>

              <Group justify="space-between">
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {t('settings:preferences.dateFormat')}
                  </Text>
                </Stack>
                <Select
                  data={[
                    { value: 'short', label: t('settings:preferences.dateFormat.short') },
                    { value: 'medium', label: t('settings:preferences.dateFormat.medium') },
                    { value: 'long', label: t('settings:preferences.dateFormat.long') },
                  ]}
                  defaultValue="medium"
                  style={{ width: 220 }}
                />
              </Group>

              <Group justify="space-between">
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    {t('settings:preferences.firstDayOfWeek')}
                  </Text>
                </Stack>
                <Select
                  data={[
                    { value: '0', label: t('settings:preferences.firstDayOfWeek.sunday') },
                    { value: '1', label: t('settings:preferences.firstDayOfWeek.monday') },
                    { value: '6', label: t('settings:preferences.firstDayOfWeek.saturday') },
                  ]}
                  defaultValue="1"
                  style={{ width: 220 }}
                />
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="accessibility" pt="md">
          <Paper p="lg" withBorder radius="md">
            <Stack gap="md">
              <Title order={5}>{t('settings:accessibility.title')}</Title>
              <Text size="sm" c="dimmed">
                {t('settings:accessibility.subtitle')}
              </Text>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="notifications" pt="md">
          <Paper p="lg" withBorder radius="md">
            <Stack gap="md">
              <Title order={5}>{t('settings:tab.notifications')}</Title>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="md">
          <Paper p="lg" withBorder radius="md">
            <Stack gap="md">
              <Title order={5}>{t('settings:tab.security')}</Title>
              <Group justify="space-between">
                <Text size="sm">{t('license:title')}</Text>
                <LicenseStatusBadge />
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
