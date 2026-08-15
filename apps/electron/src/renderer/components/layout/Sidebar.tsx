/**
 * Sidebar (spec §17, §19, §27.5).
 *
 * Renders the primary navigation. Uses Mantine v7 NavLink with logical CSS
 * properties so RTL flips automatically.
 *
 * Navigation items:
 *  - Dashboard
 *  - Documents
 *  - Search
 *  - Workflows
 *  - Audit log
 *  - Scanner
 *  - Tours
 *  - Admin
 *  - Settings
 *
 * The sidebar also hosts:
 *  - BrandedLogo (top)
 *  - LicenseStatusBadge (bottom)
 *
 * Each NavLink carries a stable `data-tour` selector so the tour engine
 * can target it (spec §10.13).
 */
import { NavLink, ScrollArea, Stack, Box, Group } from '@mantine/core';
import {
  LayoutDashboard,
  Files,
  Search,
  Workflow,
  History,
  Scan,
  Compass,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandedLogo } from '@smart-edms/ui';
import { LicenseStatusBadge } from '../license/LicenseStatusBadge';

interface NavItem {
  readonly to: string;
  readonly labelKey: string;
  readonly icon: typeof LayoutDashboard;
  readonly tour?: string;
  readonly adminOnly?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, tour: 'app.sidebar.dashboard' },
  { to: '/documents', labelKey: 'nav.documents', icon: Files, tour: 'app.sidebar.documents' },
  { to: '/search', labelKey: 'nav.search', icon: Search, tour: 'app.sidebar.search' },
  { to: '/workflows', labelKey: 'nav.workflows', icon: Workflow, tour: 'app.sidebar.workflows' },
  { to: '/audit', labelKey: 'nav.audit', icon: History, tour: 'app.sidebar.audit' },
  { to: '/scanner', labelKey: 'nav.scanner', icon: Scan, tour: 'app.sidebar.scanner' },
  { to: '/tours', labelKey: 'nav.tours', icon: Compass, tour: 'app.sidebar.tours' },
  { to: '/admin', labelKey: 'nav.admin', icon: ShieldCheck, tour: 'app.sidebar.admin', adminOnly: true },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, tour: 'app.sidebar.settings' },
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        // Solid surface — no glassmorphism (spec §17).
      }}
      data-tour="app.sidebar"
    >
      <Box
        p="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <BrandedLogo size="md" />
      </Box>
      <ScrollArea flex={1} type="hover" offsetScrollbars>
        <Stack gap={2} p="sm">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              label={t(item.labelKey)}
              leftSection={<item.icon size={18} aria-hidden="true" />}
              active={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
              onClick={() => navigate(item.to)}
              data-tour={item.tour}
              variant="light"
            />
          ))}
        </Stack>
      </ScrollArea>
      <Box
        p="sm"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group justify="space-between" data-tour="license.statusWidget">
          <LicenseStatusBadge />
        </Group>
      </Box>
    </Box>
  );
}
