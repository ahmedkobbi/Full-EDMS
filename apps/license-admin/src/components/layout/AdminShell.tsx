/**
 * AdminShell layout (spec §17, §27.5, §12.10).
 *
 * Wraps the Mantine v7 `AppShell` with the Smart EDMS sidebar + topbar.
 * Hosts the global guided tour (mounted by App.tsx) and the step-up modal
 * (mounted by App.tsx so any page can request it via the `useStepUp()` hook).
 */
import { type ReactNode } from 'react';
import { AppShell as MantineAppShell } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AdminShellLayoutProps {
  readonly children: ReactNode;
}

export function AdminShell({ children }: AdminShellLayoutProps) {
  return (
    <MantineAppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm' }}
      padding="md"
    >
      <MantineAppShell.Header data-tour="admin.topbar">
        <Topbar />
      </MantineAppShell.Header>
      <MantineAppShell.Navbar data-tour="admin.sidebar">
        <Sidebar />
      </MantineAppShell.Navbar>
      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
