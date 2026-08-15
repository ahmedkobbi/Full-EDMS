/**
 * Settings page — admin profile, theme, language, tour reset.
 */
import { Stack, Card, Group, Text, Button, SegmentedControl, Select, Divider, Alert } from '@mantine/core';
import { User, Palette, Languages, Compass, ShieldCheck, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LOCALES, type MandatoryLocaleCode } from '@smart-edms/i18n';
import { useThemeStore } from '../store/theme';
import { useI18nStore } from '../i18n/config';
import { useAuthStore, selectAdminProfile, selectHasStepUp, selectStepUpExpiresAt } from '../store/auth';
import { PageHeader } from '../components/common/PageHeader';
import { restartTour } from '../components/tour/GuidedTour';
import type { ThemePreference } from '@smart-edms/types';

export function SettingsPage() {
  const { t } = useTranslation();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const admin = useAuthStore(selectAdminProfile);
  const hasStepUp = useAuthStore(selectHasStepUp);
  const stepUpExpiresAt = useAuthStore(selectStepUpExpiresAt);
  const clearStepUpToken = useAuthStore((s) => s.clearStepUpToken);

  const remainingMin = stepUpExpiresAt
    ? Math.max(0, Math.floor((stepUpExpiresAt - Date.now()) / 60_000))
    : 0;

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:settings.title"
        subtitleKey="admin:settings.subtitle"
        tour="admin.settings.page"
      />

      <Card withBorder padding="lg">
        <Group gap="sm" mb="md">
          <User size={20} aria-hidden="true" />
          <Text size="md" fw={600}>{t('admin:settings.profile.title')}</Text>
        </Group>
        <Stack gap="xs">
          <Text size="sm"><strong>{t('auth:login.username.label')}:</strong> {admin?.email}</Text>
          <Text size="sm"><strong>{t('admin:settings.profile.role')}:</strong> {admin ? t(`admin:role.${admin.role}`) : ''}</Text>
        </Stack>
      </Card>

      <Card withBorder padding="lg">
        <Group gap="sm" mb="md">
          <Palette size={20} aria-hidden="true" />
          <Text size="md" fw={600}>{t('common:theme.system')}</Text>
        </Group>
        <SegmentedControl
          value={preference}
          onChange={(v) => setPreference(v as ThemePreference)}
          data={[
            { value: 'system', label: t('common:theme.system') },
            { value: 'light', label: t('common:theme.light') },
            { value: 'dark', label: t('common:theme.dark') },
          ]}
          fullWidth
        />
        <Alert color="info" variant="light" mt="sm">
          {t('admin:settings.theme.description')}
        </Alert>
      </Card>

      <Card withBorder padding="lg">
        <Group gap="sm" mb="md">
          <Languages size={20} aria-hidden="true" />
          <Text size="md" fw={600}>{t('common:language.label')}</Text>
        </Group>
        <Select
          data={LOCALES.map((l) => ({ value: l.code, label: `${l.nativeName} (${l.englishName})` }))}
          value={locale}
          onChange={(v) => v && setLocale(v as MandatoryLocaleCode)}
          w={300}
        />
      </Card>

      <Card withBorder padding="lg">
        <Group gap="sm" mb="md">
          <ShieldCheck size={20} aria-hidden="true" />
          <Text size="md" fw={600}>{t('admin:settings.stepUp.title')}</Text>
        </Group>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {hasStepUp
              ? t('admin:settings.stepUp.active', { minutes: remainingMin })
              : t('admin:settings.stepUp.inactive')}
          </Text>
          {hasStepUp && (
            <Button variant="light" color="warning" leftSection={<Key size={14} aria-hidden="true" />} onClick={() => clearStepUpToken()}>
              {t('admin:stepUp.clear')}
            </Button>
          )}
          <Alert color="info" variant="light">
            {t('admin:settings.stepUp.description')}
          </Alert>
        </Stack>
      </Card>

      <Card withBorder padding="lg">
        <Group gap="sm" mb="md">
          <Compass size={20} aria-hidden="true" />
          <Text size="md" fw={600}>{t('admin:settings.tour.title')}</Text>
        </Group>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">{t('admin:settings.tour.description')}</Text>
          <Button variant="light" leftSection={<Compass size={14} aria-hidden="true" />} onClick={() => restartTour()}>
            {t('admin:settings.tour.restart')}
          </Button>
        </Stack>
      </Card>

      <Divider />
      <Text size="xs" c="dimmed" ta="center">
        {t('common:app.copyright', { year: new Date().getFullYear() })}
      </Text>
    </Stack>
  );
}
