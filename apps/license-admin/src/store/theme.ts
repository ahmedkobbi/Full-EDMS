/**
 * Smart EDMS License Admin theme store (spec §4.7, §18).
 *
 * Persists the user's theme preference (system | light | dark) to
 * `localStorage` under a namespaced key so it does not collide with the
 * Electron client's theme preference on the same machine. The ThemeProvider
 * reads the preference and resolves it against the OS preference to produce
 * the effective colour scheme. System is the default per spec §18.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MantineColorScheme } from '@mantine/core';
import type { ThemePreference } from '@smart-edms/types';

const STORAGE_KEY = 'smart-edms:admin:theme';

interface ThemeStoreState {
  /** User-chosen preference. `system` follows the OS. */
  preference: ThemePreference;
  /** Resolved scheme after applying the OS preference. Always 'light' or 'dark'. */
  resolvedScheme: MantineColorScheme;
  setPreference: (pref: ThemePreference) => void;
  setResolvedScheme: (scheme: MantineColorScheme) => void;
  toggleResolvedScheme: () => void;
}

function readInitialScheme(): MantineColorScheme {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-mantine-color-scheme');
  return attr === 'dark' ? 'dark' : 'light';
}

function readInitialPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Best-effort.
  }
  return 'system';
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      preference: readInitialPreference(),
      resolvedScheme: readInitialScheme(),
      setPreference: (pref) => {
        set({ preference: pref });
        try {
          localStorage.setItem(STORAGE_KEY, pref);
        } catch {
          // Best-effort.
        }
      },
      setResolvedScheme: (scheme) => set({ resolvedScheme: scheme }),
      toggleResolvedScheme: () => {
        const next: MantineColorScheme = get().resolvedScheme === 'dark' ? 'light' : 'dark';
        set({ resolvedScheme: next });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ preference: state.preference }) as ThemeStoreState,
    },
  ),
);

export type { MantineColorScheme, ThemePreference };
