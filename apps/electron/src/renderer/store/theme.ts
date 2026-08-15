/**
 * Smart EDMS theme store (spec §4.7, §18).
 *
 * Persists the user's theme preference (system | light | dark) to
 * `localStorage` so it survives restarts. The ThemeProvider reads the
 * preference and resolves it against the OS preference to produce the
 * effective color scheme.
 *
 * The store is intentionally tiny — it holds only the preference and the
 * resolved scheme. Mantine's `ColorSchemeProvider` does the actual
 * theme switching.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColorScheme } from '@mantine/core';
import type { ThemePreference } from '@smart-edms/types';

const STORAGE_KEY = 'smart-edms:theme';

interface ThemeStoreState {
  /** User-chosen preference. `system` follows the OS. */
  preference: ThemePreference;
  /** Resolved scheme after applying the OS preference. */
  resolvedScheme: ColorScheme;

  setPreference: (pref: ThemePreference) => void;
  setResolvedScheme: (scheme: ColorScheme) => void;
  toggleResolvedScheme: () => void;
}

/**
 * Read the initial resolved scheme from the document element. The
 * `index.html` bootstrap script sets `data-mantine-color-scheme` before
 * React mounts, so we can read it synchronously here (no FOUC).
 */
function readInitialScheme(): ColorScheme {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-mantine-color-scheme');
  return attr === 'dark' ? 'dark' : 'light';
}

/**
 * Read the initial preference from localStorage. Defaults to 'system'.
 */
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
        // Persist to localStorage immediately — the persist middleware does
        // this asynchronously, but we want the next page load to read the
        // correct value synchronously.
        try {
          localStorage.setItem(STORAGE_KEY, pref);
        } catch {
          // Best-effort.
        }
        // Also push to the main process so nativeTheme follows.
        void window.smartEdms?.setNativeTheme?.(pref).catch(() => {
          // Best-effort.
        });
      },

      setResolvedScheme: (scheme) => set({ resolvedScheme: scheme }),

      toggleResolvedScheme: () => {
        const next: ColorScheme = get().resolvedScheme === 'dark' ? 'light' : 'dark';
        set({ resolvedScheme: next });
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist the preference, not the resolved scheme (which is
      // derived from the OS preference at runtime).
      partialize: (state) => ({ preference: state.preference }) as ThemeStoreState,
    },
  ),
);

export type { ColorScheme, ThemePreference };
