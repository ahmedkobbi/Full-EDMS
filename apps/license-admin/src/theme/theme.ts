/**
 * Smart EDMS License Admin Mantine v7 theme (spec §17, §18, §27.5).
 *
 * Builds two MantineTheme instances — light and dark — both premium quality.
 * The ThemeProvider picks one based on the user preference (system/light/dark).
 *
 * Mirrors the Electron client's theme so the panel and the desktop app look
 * like the same product. Logical CSS properties (start/end) are used so RTL
 * (Arabic) flips automatically without overrides.
 *
 * Note: Mantine v7.13+ removed `colorScheme` and `dir` from the theme
 * object — `colorScheme` is set via the `MantineProvider` props, and `dir`
 * is set on the `<html>` element. The `buildRtlTheme` helper was removed
 * accordingly.
 */
import { createTheme, type MantineColorsTuple, type MantineThemeOverride } from '@mantine/core';
import {
  BRAND_NEUTRAL,
  buildColorScale,
  SPACING,
  TYPOGRAPHY,
  Z_INDEX,
} from './tokens';

function toTuple(arr: readonly string[]): MantineColorsTuple {
  if (arr.length !== 10) {
    throw new Error(`Mantine color tuple must have 10 entries, got ${arr.length}`);
  }
  return arr as unknown as MantineColorsTuple;
}

function buildBaseTheme(colorScheme: 'light' | 'dark'): MantineThemeOverride {
  const colors = buildColorScale(colorScheme);
  const colorsRecord: Record<string, MantineColorsTuple> = {};
  for (const [name, ramp] of Object.entries(colors)) {
    colorsRecord[name] = toTuple(ramp);
  }

  return createTheme({
    primaryColor: 'brand',
    primaryShade: { light: 5, dark: 4 },
    colors: colorsRecord,
    fontFamily: TYPOGRAPHY.fontFamily,
    headings: {
      fontFamily: TYPOGRAPHY.headingFontFamily,
      fontWeight: TYPOGRAPHY.headingFontWeight,
      sizes: TYPOGRAPHY.headings,
    },
    fontFamilyMonospace: TYPOGRAPHY.monospaceFontFamily,
    defaultRadius: SPACING.defaultRadius,
    radius: SPACING.radius,
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    lineHeights: {
      xs: '1.2',
      sm: '1.3',
      md: '1.5',
      lg: '1.6',
      xl: '1.75',
    },
    spacing: {
      xs: '0.375rem',
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.5rem',
    },
    other: {
      shadows: SPACING.shadows,
      zIndex: Z_INDEX,
    },
    components: {
      Card: {
        defaultProps: {
          shadow: colorScheme === 'dark' ? SPACING.shadows.dark : SPACING.shadows.light,
          padding: 'lg',
          radius: 'md',
          withBorder: true,
        },
      },
      Button: {
        defaultProps: { radius: 'md' },
        styles: { root: { fontWeight: 600 } },
      },
      TextInput: { defaultProps: { radius: 'md' } },
      Select: { defaultProps: { radius: 'md' } },
      Drawer: { defaultProps: { radius: 'md' } },
      Modal: { defaultProps: { radius: 'md' } },
      Table: {
        styles: {
          thead: {
            th: {
              backgroundColor: colorScheme === 'dark' ? BRAND_NEUTRAL[8] : BRAND_NEUTRAL[1],
              fontWeight: 600,
              borderBottom: `1px solid ${colorScheme === 'dark' ? BRAND_NEUTRAL[7] : BRAND_NEUTRAL[3]}`,
            },
          },
        },
      },
      AppShell: {
        defaultProps: {
          navbar: { width: { base: 240 }, breakpoint: 'sm' },
          header: { height: 56 },
        },
      },
      NavLink: {
        styles: {
          root: {
            borderRadius: '0.5rem',
            paddingInlineStart: '0.75rem',
            paddingInlineEnd: '0.75rem',
          },
        },
      },
      ActionIcon: { defaultProps: { radius: 'md' } },
    },
  });
}

export const lightTheme: MantineThemeOverride = buildBaseTheme('light');
export const darkTheme: MantineThemeOverride = buildBaseTheme('dark');

export function buildTheme(colorScheme: 'light' | 'dark'): MantineThemeOverride {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
