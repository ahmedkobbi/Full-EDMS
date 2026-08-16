/**
 * Sidebar (spec §17, §19, §27.5, §12.10).
 *
 * Renders the primary navigation for the License Admin Panel. Uses Mantine
 * v7 NavLink with logical CSS properties so RTL flips automatically.
 *
 * Navigation groups:
 *  - Overview: Dashboard, Audit logs
 *  - Customers: Customers, Trials
 *  - Catalog: Products, Licenses
 *  - Activations: Activations, Offline activations
 *  - Integrations: Webhooks, API keys
 *  - Security: Signing keys
 *  - Settings
 *
 * Each NavLink carries a stable `data-tour` selector so the guided tour
 * (spec §12.10) can target it.
 */
import { Box, NavLink, ScrollArea, Stack, Text } from '@mantine/core';
import {
  Bolt,
  ChartBar,
  Clock4,
  FileCheck,
  History,
  Key,
  LayoutDashboard,
  ListChecks,
  Package,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandedLogo } from '../common/BrandedLogo';

interface NavItem {
  readonly to: string;
  readonly labelKey: string;
  readonly icon: typeof LayoutDashboard;
  readonly tour?: string;
}

interface NavGroup {
  readonly labelKey: string;
  readonly items: readonly NavItem[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    labelKey: 'admin:nav.overview',
    items: [
      { to: '/dashboard', labelKey: 'admin:nav.dashboard', icon: LayoutDashboard, tour: 'admin.sidebar.dashboard' },
      { to: '/usage', labelKey: 'admin:nav.usage', icon: ChartBar, tour: 'admin.sidebar.usage' },
      { to: '/audit', labelKey: 'admin:nav.audit', icon: History, tour: 'admin.sidebar.audit' },
    ],
  },
  {
    labelKey: 'admin:nav.customers',
    items: [
      { to: '/customers', labelKey: 'admin:nav.customers', icon: Users, tour: 'admin.sidebar.customers' },
      { to: '/trials', labelKey: 'admin:nav.trials', icon: Clock4, tour: 'admin.sidebar.trials' },
    ],
  },
  {
    labelKey: 'admin:nav.catalog',
    items: [
      { to: '/products', labelKey: 'admin:nav.products', icon: Package, tour: 'admin.sidebar.products' },
      { to: '/licenses', labelKey: 'admin:nav.licenses', icon: FileCheck, tour: 'admin.sidebar.licenses' },
    ],
  },
  {
    labelKey: 'admin:nav.activations',
    items: [
      { to: '/activations', labelKey: 'admin:nav.activations', icon: Bolt, tour: 'admin.sidebar.activations' },
      { to: '/offline-activations', labelKey: 'admin:nav.offlineActivations', icon: ListChecks, tour: 'admin.sidebar.offlineActivations' },
    ],
  },
  {
    labelKey: 'admin:nav.integrations',
    items: [
      { to: '/webhooks', labelKey: 'admin:nav.webhooks', icon: Webhook, tour: 'admin.sidebar.webhooks' },
      { to: '/api-keys', labelKey: 'admin:nav.apiKeys', icon: Key, tour: 'admin.sidebar.apiKeys' },
    ],
  },
  {
    labelKey: 'admin:nav.security',
    items: [
      { to: '/signing-keys', labelKey: 'admin:nav.signingKeys', icon: ShieldCheck, tour: 'admin.sidebar.signingKeys' },
      { to: '/admin-users', labelKey: 'admin:nav.adminUsers', icon: ShieldCheck, tour: 'admin.sidebar.adminUsers' },
      { to: '/settings', labelKey: 'admin:nav.settings', icon: Settings, tour: 'admin.sidebar.settings' },
    ],
  },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-tour="admin.sidebar">
      <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <BrandedLogo size="md" showTagline />
      </Box>
      <ScrollArea flex={1} type="hover" offsetScrollbars>
        <Stack gap="xs" p="sm">
          {NAV_GROUPS.map((group) => (
            <Box key={group.labelKey} mb="xs">
              <Text size="xs" c="dimmed" fw={600} px="sm" mb={4} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                {t(group.labelKey)}
              </Text>
              <Stack gap={2}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    label={t(item.labelKey)}
                    leftSection={<item.icon size={18} aria-hidden="true" />}
                    active={
                      location.pathname === item.to ||
                      location.pathname.startsWith(item.to + '/')
                    }
                    onClick={() => navigate(item.to)}
                    data-tour={item.tour}
                    variant="light"
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
