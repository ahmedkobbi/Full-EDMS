/**
 * Smart EDMS Mantine v7 theme configuration (spec §17, §18, §27.5).
 *
 * Builds two MantineTheme instances — light and dark — both premium quality.
 * The ThemeProvider picks one based on the user preference (system/light/dark).
 *
 * Design rules (spec §17, §19):
 *  - No glassmorphism on data tables or sidebars — solid surfaces only.
 *  - Subtle borders + elevated shadows on cards.
 *  - High-contrast text — AA contrast minimum on all body text.
 *  - Semantic status colors (success/warning/error/info) used consistently.
 *  - Logical CSS properties (start/end) so RTL works without overrides.
 */
import { createTheme, type MantineColorsTuple, type MantineThemeOverride } from '@mantine/core';
import {
  BRAND_NEUTRAL,
  BRAND_PRIMARY,
  BRAND_STATUS,
  buildColorScale,
  SPACING,
  TYPOGRAPHY,
} from './tokens';

/**
 * Convert a readonly string array to Mantine's `MantineColorsTuple` type
 * (which requires a fixed-length 10-tuple).
 */
function toTuple(arr: readonly string[]): MantineColorsTuple {
  if (arr.length !== 10) {
    throw new Error(`Mantine color tuple must have 10 entries, got ${arr.length}`);
  }
  return arr as unknown as MantineColorsTuple;
}

/**
 * Build the base theme shared by light + dark variants. The variant only
 * overrides the color scheme and the resolvable colors.
 */
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
      // Per-variant shadow tokens. Components reference these via
      // `theme.other.shadows` instead of hardcoding.
      shadows: SPACING.shadows,
      zIndex: {
        sidebar: 100,
        topbar: 110,
        commandPalette: 200,
        aiBubble: 800,
        tourOverlay: 1000,
        tourPopover: 1010,
      },
      // Brand constants used by the BrandedLogo and other identity surfaces.
      brand: {
        primaryColor: BRAND_PRIMARY,
        neutralColor: BRAND_NEUTRAL,
        statusColors: BRAND_STATUS,
        wordmark: 'Smart EDMS',
      },
    },
    components: {
      // Solid surfaces only — no glassmorphism (spec §17).
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
        styles: {
          root: { fontWeight: 600 },
        },
      },
      TextInput: {
        defaultProps: { radius: 'md' },
      },
      Select: {
        defaultProps: { radius: 'md' },
      },
      Drawer: {
        defaultProps: { radius: 'md' },
      },
      Modal: {
        defaultProps: { radius: 'md' },
      },
      // Tables: solid header background, no transparency (spec §17).
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
      // Sidebars: solid surface (no glassmorphism).
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
            // Logical properties so RTL works (spec §27.5).
            paddingInlineStart: '0.75rem',
            paddingInlineEnd: '0.75rem',
          },
        },
      },
      // Focus rings must be visible for accessibility (spec §27.5).
      ActionIcon: {
        defaultProps: { radius: 'md' },
      },
    },
  });
}

export const lightTheme: MantineThemeOverride = buildBaseTheme('light');
export const darkTheme: MantineThemeOverride = buildBaseTheme('dark');

/**
 * Build a theme variant for a specific color scheme. Used by ThemeProvider
 * when the user toggles between light and dark.
 */
export function buildTheme(colorScheme: 'light' | 'dark'): MantineThemeOverride {
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}

/**
 * Build a theme variant for a specific color scheme AND direction. Mantine
 * v7 handles `dir` via the `<html dir="rtl">` attribute set by the
 * ThemeProvider; the theme object itself does not carry a `dir` property.
 */
export function buildRtlTheme(colorScheme: 'light' | 'dark', _dir: 'ltr' | 'rtl'): MantineThemeOverride {
  // Direction is applied at the document level by ThemeProvider via the
  // `<html dir="rtl|ltr">` attribute. Mantine v7 reads it from there.
  return buildTheme(colorScheme);
}
