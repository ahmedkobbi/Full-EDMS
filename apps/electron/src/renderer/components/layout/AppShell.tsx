/**
 * AppShell layout (spec §17, §27.5).
 *
 * Wraps the Mantine v7 `AppShell` with the Smart EDMS sidebar + topbar.
 * Hosts the global CommandPalette (opened via ⌘K).
 *
 * The layout uses logical CSS properties so RTL (Arabic) flips automatically.
 * The TourEngine and AI bubble are mounted by App.tsx (not here) so they
 * persist across route transitions.
 */
import { type ReactNode } from 'react';
import { AppShell as MantineAppShell } from '@mantine/core';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useCommandPalette } from './CommandPalette';

interface AppShellLayoutProps {
  readonly children: ReactNode;
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const palette = useCommandPalette();

  return (
    <MantineAppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm' }}
      padding="md"
    >
      <MantineAppShell.Header data-tour="app.topbar">
        <Topbar onOpenCommandPalette={palette.open} />
      </MantineAppShell.Header>
      <MantineAppShell.Navbar data-tour="app.sidebar">
        <Sidebar />
      </MantineAppShell.Navbar>
      <MantineAppShell.Main>{children}</MantineAppShell.Main>
      {palette.palette}
    </MantineAppShell>
  );
}
