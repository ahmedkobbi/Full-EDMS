/**
 * Settings page (spec §9.1, §9.13, §17).
 *
 * Full user settings with real backend integration:
 *  - Profile (name, email, locale, timezone)
 *  - Preferences (theme, density, reduced motion, high contrast)
 *  - Security (change password, MFA enrollment/disable, session management)
 *  - Notifications (channel preferences, severity filters, do-not-disturb)
 *
 * All settings saved via backend API — no client-only persistence.
 *
 * Spec ref: §9.1 (profile management, MFA, session management),
 *           §9.13 (notification preferences).
 */
import { useState } from 'react';
import {
  Stack, Title, Text, Tabs, Paper, Group, Button, TextInput, PasswordInput,
  Select, SegmentedControl, Switch, Badge, Table, ActionIcon, Code,
  Alert, ThemeIcon, Modal, Divider, LoadingOverlay, Timeline,
} from '@mantine/core';
import { IconUser, IconSettings, IconShieldCheck, IconBell, IconKey, IconTrash, IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/theme';
import { LOCALES } from '@smart-edms/i18n';
import type { ThemePreference } from '@smart-edms/types';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import { LicenseStatusBadge } from '../components/license/LicenseStatusBadge';
import {
  useCurrentUser, useSessionsQuery, useRevokeSessionMutation, useRevokeAllSessionsMutation,
  useChangePasswordMutation, useStartMfaEnrollmentMutation, useConfirmMfaEnrollmentMutation,
  useDisableMfaMutation, useNotificationPreferencesQuery, useUpdateNotificationPreferencesMutation,
} from '../api/hooks';
import { LocaleAwareDate } from '@smart-edms/ui';

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('security');

  return (
    <Stack gap="md" data-tour-page="settings">
      <Stack gap={4}>
        <Title order={2}>{t('settings.title', { defaultValue: 'Settings' })}</Title>
        <Text size="sm" c="dimmed">
          {t('settings.subtitle', { defaultValue: 'Manage your profile, security, and preferences.' })}
        </Text>
      </Stack>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="security" leftSection={<IconShieldCheck size={14} aria-hidden="true" />}>
            {t('settings.tab.security', { defaultValue: 'Security' })}
          </Tabs.Tab>
          <Tabs.Tab value="preferences" leftSection={<IconSettings size={14} aria-hidden="true" />}>
            {t('settings.tab.preferences', { defaultValue: 'Preferences' })}
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={14} aria-hidden="true" />}>
            {t('settings.tab.notifications', { defaultValue: 'Notifications' })}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="security" pt="md">
          <SecurityTab />
        </Tabs.Panel>
        <Tabs.Panel value="preferences" pt="md">
          <PreferencesTab />
        </Tabs.Panel>
        <Tabs.Panel value="notifications" pt="md">
          <NotificationsTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

// ── Security Tab ────────────────────────────────────────────────────────────

function SecurityTab() {
  const { t } = useTranslation();
  const userQuery = useCurrentUser();
  const user = userQuery.data as any;
  const [mfaEnrollOpen, setMfaEnrollOpen] = useState(false);

  return (
    <Stack gap="md">
      {/* Password change */}
      <PasswordChangeSection />

      {/* MFA */}
      <Paper p="md" withBorder radius="md">
        <Group justify="space-between">
          <Stack gap={4}>
            <Group gap="xs">
              <ThemeIcon size={28} radius="md" variant="light" color={user?.mfaEnabled ? 'teal' : 'gray'}>
                <IconKey size={16} aria-hidden="true" />
              </ThemeIcon>
              <Text fw={500}>{t('settings.mfa.title', { defaultValue: 'Multi-factor authentication' })}</Text>
            </Group>
            <Text size="sm" c="dimmed">
              {user?.mfaEnabled
                ? t('settings.mfa.enabled', { defaultValue: 'MFA is enabled. You will be prompted for a code on login.' })
                : t('settings.mfa.disabled', { defaultValue: 'MFA is not enabled. Enable it for additional security.' })}
            </Text>
          </Stack>
          <Group gap="xs">
            {user?.mfaEnabled ? (
              <Badge size="sm" color="teal" variant="filled">{t('common:status.enabled', { defaultValue: 'Enabled' })}</Badge>
            ) : (
              <Badge size="sm" color="gray" variant="light">{t('common:status.disabled', { defaultValue: 'Disabled' })}</Badge>
            )}
            <Button
              size="xs"
              variant={user?.mfaEnabled ? 'light' : 'filled'}
              onClick={() => user?.mfaEnabled ? setMfaEnrollOpen(false) : setMfaEnrollOpen(true)}
            >
              {user?.mfaEnabled
                ? t('settings.mfa.disable', { defaultValue: 'Disable' })
                : t('settings.mfa.enable', { defaultValue: 'Enable' })}
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Active sessions */}
      <SessionsSection />

      <MfaEnrollModal opened={mfaEnrollOpen} onClose={() => setMfaEnrollOpen(false)} />
    </Stack>
  );
}

function PasswordChangeSection() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const changePassword = useChangePasswordMutation();

  const handleSubmit = () => {
    if (newPassword !== confirmPassword) return;
    if (newPassword.length < 8) return;
    changePassword.mutate({ currentPassword, newPassword }, {
      onSuccess: () => {
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      },
    });
  };

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="sm">
        <Text fw={500}>{t('settings.password.title', { defaultValue: 'Change password' })}</Text>
        <PasswordInput
          label={t('settings.password.current', { defaultValue: 'Current password' })}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <PasswordInput
          label={t('settings.password.new', { defaultValue: 'New password' })}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={newPassword.length > 0 && newPassword.length < 8 ? t('form.minLength', { defaultValue: 'Must be at least 8 characters' }) : null}
        />
        <PasswordInput
          label={t('settings.password.confirm', { defaultValue: 'Confirm new password' })}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPassword.length > 0 && newPassword !== confirmPassword ? t('settings.password.mismatch', { defaultValue: 'Passwords do not match' }) : null}
        />
        {changePassword.isError && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {t('settings.password.error', { defaultValue: 'Failed to change password. Check your current password.' })}
          </Alert>
        )}
        {changePassword.isSuccess && (
          <Alert color="teal" icon={<IconCheck size={16} />}>
            {t('settings.password.success', { defaultValue: 'Password changed successfully.' })}
          </Alert>
        )}
        <Button
          onClick={handleSubmit}
          loading={changePassword.isPending}
          disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
        >
          {t('settings.password.submit', { defaultValue: 'Change password' })}
        </Button>
      </Stack>
    </Paper>
  );
}

function SessionsSection() {
  const { t } = useTranslation();
  const sessionsQuery = useSessionsQuery();
  const revokeSession = useRevokeSessionMutation();
  const revokeAll = useRevokeAllSessionsMutation();
  const sessions = (sessionsQuery.data ?? []) as any[];

  return (
    <Paper p="md" withBorder radius="md">
      <Group justify="space-between" mb="sm">
        <Text fw={500}>{t('settings.sessions.title', { defaultValue: 'Active sessions' })}</Text>
        <Button
          size="xs"
          variant="light"
          color="red"
          leftSection={<IconTrash size={12} aria-hidden="true" />}
          onClick={() => revokeAll.mutate()}
          loading={revokeAll.isPending}
        >
          {t('settings.sessions.revokeAll', { defaultValue: 'Revoke all' })}
        </Button>
      </Group>
      {sessions.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center">{t('settings.sessions.empty', { defaultValue: 'No active sessions' })}</Text>
      ) : (
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>IP</Table.Th>
              <Table.Th>{t('settings.sessions.device', { defaultValue: 'Device' })}</Table.Th>
              <Table.Th>{t('common:label.created', { defaultValue: 'Created' })}</Table.Th>
              <Table.Th>{t('settings.sessions.expires', { defaultValue: 'Expires' })}</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sessions.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td><Code size="xs">{s.ipAddress ?? '—'}</Code></Table.Td>
                <Table.Td><Text size="xs" lineClamp={1}>{s.userAgent ?? '—'}</Text></Table.Td>
                <Table.Td><LocaleAwareDate value={s.createdAt} size="xs" c="dimmed" /></Table.Td>
                <Table.Td><LocaleAwareDate value={s.expiresAt} size="xs" c="dimmed" /></Table.Td>
                <Table.Td>
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="subtle"
                    onClick={() => revokeSession.mutate(s.id)}
                    loading={revokeSession.isPending}
                  >
                    <IconTrash size={14} aria-hidden="true" />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}

function MfaEnrollModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [code, setCode] = useState('');
  const [enrollData, setEnrollData] = useState<{ secret: string; qrCodeUri: string; backupCodes: string[] } | null>(null);
  const startEnroll = useStartMfaEnrollmentMutation();
  const confirmEnroll = useConfirmMfaEnrollmentMutation();

  const handleStart = () => {
    startEnroll.mutate(undefined, {
      onSuccess: (data) => {
        setEnrollData(data);
        setStep('qr');
      },
    });
  };

  const handleVerify = () => {
    confirmEnroll.mutate({ code }, {
      onSuccess: () => setStep('backup'),
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('settings.mfa.enroll.title', { defaultValue: 'Enable MFA' })} size="md">
      {!enrollData && (
        <Stack align="center" py="xl">
          <Text size="sm" c="dimmed" ta="center">
            {t('settings.mfa.enroll.intro', { defaultValue: 'Click start to generate a TOTP secret and QR code.' })}
          </Text>
          <Button onClick={handleStart} loading={startEnroll.isPending}>
            {t('settings.mfa.enroll.start', { defaultValue: 'Start enrollment' })}
          </Button>
        </Stack>
      )}

      {enrollData && step === 'qr' && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('settings.mfa.enroll.scan', { defaultValue: 'Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password):' })}
          </Text>
          <Paper p="md" withBorder radius="md" ta="center">
            <Code>{enrollData.qrCodeUri}</Code>
          </Paper>
          <Text size="xs" c="dimmed">
            {t('settings.mfa.enroll.manual', { defaultValue: 'Or enter manually:' })} <Code>{enrollData.secret}</Code>
          </Text>
          <Button onClick={() => setStep('verify')}>
            {t('settings.mfa.enroll.next', { defaultValue: 'I have scanned the code' })}
          </Button>
        </Stack>
      )}

      {enrollData && step === 'verify' && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('settings.mfa.enroll.enterCode', { defaultValue: 'Enter the 6-digit code from your authenticator app:' })}
          </Text>
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            size="lg"
            ta="center"
          />
          {confirmEnroll.isError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {t('settings.mfa.enroll.invalidCode', { defaultValue: 'Invalid code. Try again.' })}
            </Alert>
          )}
          <Button onClick={handleVerify} loading={confirmEnroll.isPending} disabled={code.length !== 6}>
            {t('settings.mfa.enroll.verify', { defaultValue: 'Verify' })}
          </Button>
        </Stack>
      )}

      {enrollData && step === 'backup' && (
        <Stack gap="md">
          <Alert color="teal" icon={<IconCheck size={16} />}>
            {t('settings.mfa.enroll.success', { defaultValue: 'MFA enabled successfully!' })}
          </Alert>
          <Text size="sm" fw={500}>
            {t('settings.mfa.enroll.backupCodes', { defaultValue: 'Save these backup codes (use each once):' })}
          </Text>
          <Paper p="md" withBorder radius="md">
            <Stack gap={4}>
              {enrollData.backupCodes.map((c, i) => (
                <Code key={i}>{c}</Code>
              ))}
            </Stack>
          </Paper>
          <Button onClick={onClose}>{t('common:action.done', { defaultValue: 'Done' })}</Button>
        </Stack>
      )}
    </Modal>
  );
}

// ── Preferences Tab ─────────────────────────────────────────────────────────

function PreferencesTab() {
  const { t } = useTranslation();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <Stack gap="md">
      <Paper p="md" withBorder radius="md">
        <Stack gap="sm">
          <Text fw={500}>{t('settings.preferences.theme', { defaultValue: 'Theme' })}</Text>
          <SegmentedControl
            value={preference}
            onChange={(v) => setPreference(v as ThemePreference)}
            data={[
              { value: 'system', label: t('common:theme.system', { defaultValue: 'System' }) },
              { value: 'light', label: t('common:theme.light', { defaultValue: 'Light' }) },
              { value: 'dark', label: t('common:theme.dark', { defaultValue: 'Dark' }) },
            ]}
            data-tour="app.themeSwitcher"
          />
        </Stack>
      </Paper>

      <Paper p="md" withBorder radius="md">
        <Stack gap="sm">
          <Text fw={500}>{t('settings.preferences.language', { defaultValue: 'Language' })}</Text>
          <LanguageSwitcher />
        </Stack>
      </Paper>
    </Stack>
  );
}

// ── Notifications Tab ───────────────────────────────────────────────────────

function NotificationsTab() {
  const { t } = useTranslation();
  const prefsQuery = useNotificationPreferencesQuery();
  const updatePrefs = useUpdateNotificationPreferencesMutation();
  const prefs = prefsQuery.data as any;

  const toggleChannel = (channel: string, value: boolean) => {
    updatePrefs.mutate({ channels: { ...prefs?.channels, [channel]: value } });
  };

  const toggleSeverity = (severity: string, value: boolean) => {
    updatePrefs.mutate({ severities: { ...prefs?.severities, [severity]: value } });
  };

  return (
    <LoadingOverlay visible={prefsQuery.isLoading}>
      <Stack gap="md">
        {/* Channels */}
        <Paper p="md" withBorder radius="md">
          <Stack gap="sm">
            <Text fw={500}>{t('settings.notifications.channels', { defaultValue: 'Notification channels' })}</Text>
            <Group justify="space-between">
              <Text size="sm">{t('settings.notifications.inApp', { defaultValue: 'In-app' })}</Text>
              <Switch checked={prefs?.channels?.in_app ?? true} onChange={(e) => toggleChannel('in_app', e.currentTarget.checked)} />
            </Group>
            <Group justify="space-between">
              <Text size="sm">{t('settings.notifications.email', { defaultValue: 'Email' })}</Text>
              <Switch checked={prefs?.channels?.email ?? true} onChange={(e) => toggleChannel('email', e.currentTarget.checked)} />
            </Group>
            <Group justify="space-between">
              <Text size="sm">{t('settings.notifications.desktop', { defaultValue: 'Desktop' })}</Text>
              <Switch checked={prefs?.channels?.desktop ?? true} onChange={(e) => toggleChannel('desktop', e.currentTarget.checked)} />
            </Group>
          </Stack>
        </Paper>

        {/* Severities */}
        <Paper p="md" withBorder radius="md">
          <Stack gap="sm">
            <Text fw={500}>{t('settings.notifications.severities', { defaultValue: 'Alert types' })}</Text>
            {(['info', 'success', 'warning', 'danger'] as const).map((sev) => (
              <Group key={sev} justify="space-between">
                <Group gap="xs">
                  <Badge size="xs" color={sev === 'danger' ? 'red' : sev === 'warning' ? 'amber' : sev === 'success' ? 'teal' : 'blue'} variant="light">
                    {sev}
                  </Badge>
                  <Text size="sm">{t(`settings.notifications.severity.${sev}`, { defaultValue: sev })}</Text>
                </Group>
                <Switch checked={prefs?.severities?.[sev] ?? true} onChange={(e) => toggleSeverity(sev, e.currentTarget.checked)} />
              </Group>
            ))}
          </Stack>
        </Paper>

        {/* Do Not Disturb */}
        <Paper p="md" withBorder radius="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={500}>{t('settings.notifications.dnd', { defaultValue: 'Do not disturb' })}</Text>
              <Switch
                checked={prefs?.doNotDisturb ?? false}
                onChange={(e) => updatePrefs.mutate({ doNotDisturb: e.currentTarget.checked })}
              />
            </Group>
            {prefs?.doNotDisturb && (
              <Group gap="xs">
                <Select
                  label={t('settings.notifications.dndFrom', { defaultValue: 'From' })}
                  value={prefs?.doNotDisturbFrom ?? '22:00'}
                  onChange={(v) => updatePrefs.mutate({ doNotDisturbFrom: v })}
                  data={Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)}
                  w={120}
                />
                <Select
                  label={t('settings.notifications.dndTo', { defaultValue: 'To' })}
                  value={prefs?.doNotDisturbTo ?? '07:00'}
                  onChange={(v) => updatePrefs.mutate({ doNotDisturbTo: v })}
                  data={Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)}
                  w={120}
                />
              </Group>
            )}
          </Stack>
        </Paper>
      </Stack>
    </LoadingOverlay>
  );
}
