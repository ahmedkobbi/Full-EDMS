/**
 * Smart EDMS theme provider (spec §4.7, §18).
 *
 * Wraps Mantine v7's `MantineProvider` and reads the user preference from the
 * Zustand `useThemeStore`. The preference is persisted to `localStorage`
 * (immediate, synchronous) AND to Electron `safeStorage` (asynchronous,
 * OS-encrypted) per spec §18.
 *
 * Mantine v7 NOTE: `ColorSchemeProvider` was REMOVED in v7. The correct
 * pattern is to use `MantineProvider` with the `forceColorScheme` prop +
 * `data-mantine-color-scheme` attribute on the document element.
 *
 * System preference detection uses `window.matchMedia('(prefers-color-scheme:
 * dark)')`. When the user chooses `system`, the theme follows the OS, and a
 * media-query listener re-applies the resolved scheme when the OS preference
 * changes (e.g. macOS Auto mode).
 *
 * No FOUC: `index.html` sets the `data-mantine-color-scheme` attribute
 * synchronously from `localStorage` before React mounts.
 *
 * RTL support: Mantine v7 handles RTL natively when the `<html dir="rtl">`
 * attribute is set. Logical CSS properties (ms-, me-, ps-, pe-, start-,
 * end-) are used everywhere in the renderer so no extra plugin is needed.
 */
import { useEffect, type ReactNode } from 'react';
import { MantineProvider, type MantineColorScheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/modals/styles.css';
import '@mantine/dropzone/styles.css';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/ar';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/de';

import { useThemeStore } from '../store/theme';
import { useI18nStore } from '../i18n/config';
import { buildTheme } from './theme';
import { isRtl } from '@smart-edms/i18n';

interface ThemeProviderProps {
  readonly children: ReactNode;
}

/**
 * Apply the resolved color scheme to the document element. Called whenever
 * the user preference or OS preference changes.
 *
 * Mantine v7: sets the `data-mantine-color-scheme` attribute which
 * MantineProvider reads to apply the correct CSS variables.
 */
function applyColorScheme(scheme: MantineColorScheme): void {
  document.documentElement.setAttribute('data-mantine-color-scheme', scheme);
  document.documentElement.style.colorScheme = scheme;
}

/**
 * Apply the document direction (LTR/RTL) and lang attribute. Called when
 * the active locale changes.
 */
function applyDirection(locale: string): void {
  const dir = isRtl(locale as Parameters<typeof isRtl>[0]) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = locale;
}

/**
 * ThemeProvider — wraps the app with Mantine v7 + color scheme management.
 *
 * Mantine v7 pattern:
 *   - NO ColorSchemeProvider (removed in v7)
 *   - Use MantineProvider with `forceColorScheme` prop
 *   - Set `data-mantine-color-scheme` attribute on <html> manually
 *   - Import CSS: `@mantine/core/styles.css` (required in v7)
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const preference = useThemeStore((s) => s.preference);
  const resolvedScheme = useThemeStore((s) => s.resolvedScheme);
  const setResolvedScheme = useThemeStore((s) => s.setResolvedScheme);
  const locale = useI18nStore((s) => s.locale);

  // Resolve the color scheme from the user preference + the OS preference.
  useEffect(() => {
    if (preference !== 'system') {
      setResolvedScheme(preference);
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setResolvedScheme(media.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setResolvedScheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [preference, setResolvedScheme]);

  // Apply the resolved scheme to the document element.
  useEffect(() => {
    applyColorScheme(resolvedScheme);
  }, [resolvedScheme]);

  // Apply direction + lang whenever the locale changes.
  useEffect(() => {
    applyDirection(locale);
  }, [locale]);

  // Push the preference to the main process so nativeTheme follows it.
  useEffect(() => {
    void window.smartEdms?.setNativeTheme?.(preference).catch(() => {
      // Best-effort; preload may not be available in test envs.
    });
  }, [preference]);

  // Listen for OS-level theme changes.
  useEffect(() => {
    if (!window.smartEdms?.onNativeThemeChange) return;
    const unsubscribe = window.smartEdms.onNativeThemeChange(() => {
      // OS preference changed. The matchMedia listener above handles
      // updating the resolved scheme when the user preference is `system`.
    });
    return unsubscribe;
  }, []);

  const dir = isRtl(locale as Parameters<typeof isRtl>[0]) ? 'rtl' : 'ltr';
  const theme = buildTheme(resolvedScheme);

  return (
    <MantineProvider theme={{ ...theme, dir }} forceColorScheme={resolvedScheme}>
      <DatesProvider settings={{ locale, firstDayOfWeek: 1 }}>
        <ModalsProvider>
          <Notifications position="top-right" />
          {children}
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
