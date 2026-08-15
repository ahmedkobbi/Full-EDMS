/**
 * Admin page (spec §9.2).
 *
 * Tenant administration: users, roles, groups, branding, feature flags,
 * license management. Admin-only — the route is guarded by role on the
 * backend; the client just renders the page (the API will reject if the
 * user lacks the `admin` role).
 *
 * Includes a "License" tab that opens the LicenseImportModal.
 */
import { useState } from 'react';
import { Stack, Title, Text, Tabs, Paper, Group, Button } from '@mantine/core';
import { IconShieldCheck, IconUsers, IconKey, IconPalette, IconLicense } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@smart-edms/ui';
import { LicenseStatusBadge } from '../components/license/LicenseStatusBadge';
import { LicenseImportModal } from '../components/license/LicenseImportModal';

export function AdminPage() {
  const { t } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('users');

  return (
    <Stack gap="md" data-tour-page="admin">
      <Stack gap={4}>
        <Title order={2}>{t('admin:title', { defaultValue: 'Administration' })}</Title>
        <Text size="sm" c="dimmed">
          {t('admin:subtitle', { defaultValue: 'Tenant administration and configuration.' })}
        </Text>
      </Stack>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="users" leftSection={<IconUsers size={14} aria-hidden="true" />}>
            {t('admin:tab.users', { defaultValue: 'Users' })}
          </Tabs.Tab>
          <Tabs.Tab value="roles" leftSection={<IconShieldCheck size={14} aria-hidden="true" />}>
            {t('admin:tab.roles', { defaultValue: 'Roles' })}
          </Tabs.Tab>
          <Tabs.Tab value="branding" leftSection={<IconPalette size={14} aria-hidden="true" />}>
            {t('admin:tab.branding', { defaultValue: 'Branding' })}
          </Tabs.Tab>
          <Tabs.Tab value="license" leftSection={<IconLicense size={14} aria-hidden="true" />}>
            {t('license:title')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" pt="md">
          <Paper p="xl" withBorder radius="md">
            <EmptyState illustration="generic" titleKey="admin:users.empty.title" subtitleKey="admin:users.empty.subtitle" />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="roles" pt="md">
          <Paper p="xl" withBorder radius="md">
            <EmptyState illustration="generic" titleKey="admin:roles.empty.title" subtitleKey="admin:roles.empty.subtitle" />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="branding" pt="md">
          <Paper p="xl" withBorder radius="md">
            <EmptyState illustration="generic" titleKey="admin:branding.empty.title" subtitleKey="admin:branding.empty.subtitle" />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="license" pt="md" data-tour="license.statusWidget">
          <Paper p="xl" withBorder radius="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Stack gap={4}>
                  <Title order={4}>{t('license:overview.title')}</Title>
                  <Text size="sm" c="dimmed">
                    {t('license:subtitle')}
                  </Text>
                </Stack>
                <LicenseStatusBadge />
              </Group>
              <Group>
                <Button onClick={() => setImportOpen(true)}>
                  {t('license:action.importSedmslic')}
                </Button>
                <Button variant="light">{t('license:action.exportSedmsreq')}</Button>
                <Button variant="subtle">{t('license:action.contactSupport')}</Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <LicenseImportModal opened={importOpen} onClose={() => setImportOpen(false)} />
    </Stack>
  );
}
