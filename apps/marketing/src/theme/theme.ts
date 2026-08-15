/**
 * Smart EDMS marketing site — Mantine v7 theme (spec §17, §18, §19, §27.5).
 *
 * Light-only, premium, high-contrast. Mirrors the License Admin and Electron
 * client token sets so the public site, the desktop app, and the admin panel
 * all look like the same product.
 *
 * Per spec §12.11, the marketing site is light-only — no dark mode. This
 * keeps the public brand presentation consistent and reduces the CSS payload
 * (no dark-theme overrides shipped to clients).
 *
 * Logical CSS properties (paddingInlineStart, marginInlineEnd, …) are used
 * throughout the component layer so Arabic (RTL) flips correctly without
 * per-locale overrides.
 */

import {
  createTheme,
  type MantineThemeOverride,
  type MantineColorsTuple,
} from '@mantine/core';

/**
 * Brand color scale — blue (matches License Admin / Electron).
 */
const BRAND_PRIMARY: readonly string[] = [
  '#e8f0ff',
  '#cfe0ff',
  '#a4c2ff',
  '#7aa3ff',
  '#4f85ff',
  '#2f6bff',
  '#1f54e6',
  '#1841b8',
  '#12308a',
  '#0c2060',
] as const;

const BRAND_NEUTRAL: readonly string[] = [
  '#ffffff',
  '#f7f8fa',
  '#eceef2',
  '#dde1e8',
  '#c2c8d3',
  '#9aa1ae',
  '#6b7280',
  '#4b5363',
  '#2f3543',
  '#1a1d27',
] as const;

const BRAND_STATUS = {
  success: [
    '#e9faf0', '#c8f3d8', '#94e5b3', '#5fd28d', '#34bd6a',
    '#1ba34f', '#13843f', '#0e6631', '#094823', '#052b16',
  ],
  warning: [
    '#fff5e0', '#ffe6b3', '#ffd380', '#ffbf54', '#ffa828',
    '#f79010', '#cc7208', '#a15600', '#783f00', '#4d2900',
  ],
  error: [
    '#fde8e8', '#fac5c5', '#f59a9a', '#ef6e6e', '#e74c4c',
    '#d12d2d', '#a82222', '#7f1a1a', '#561010', '#2d0808',
  ],
} as const;

function toTuple(arr: readonly string[]): MantineColorsTuple {
  if (arr.length !== 10) {
    throw new Error(`Mantine color tuple must have 10 entries, got ${arr.length}`);
  }
  return arr as unknown as MantineColorsTuple;
}

const TYPOGRAPHY = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  headingFontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monospaceFontFamily:
    "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, 'Courier New', monospace",
  headingFontWeight: '700' as const,
} as const;

const SPACING = {
  defaultRadius: '0.5rem',
  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  shadows: {
    light: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
  },
} as const;

const colorsRecord: Record<string, MantineColorsTuple> = {
  brand: toTuple(BRAND_PRIMARY),
  neutral: toTuple(BRAND_NEUTRAL),
  success: toTuple(BRAND_STATUS.success),
  warning: toTuple(BRAND_STATUS.warning),
  error: toTuple(BRAND_STATUS.error),
  info: toTuple(BRAND_PRIMARY),
  gray: toTuple(BRAND_NEUTRAL),
};

/**
 * The marketing theme. Light only.
 */
export const marketingTheme: MantineThemeOverride = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 5, dark: 5 },
  colors: colorsRecord,
  fontFamily: TYPOGRAPHY.fontFamily,
  headings: {
    fontFamily: TYPOGRAPHY.headingFontFamily,
    fontWeight: TYPOGRAPHY.headingFontWeight,
    sizes: {
      h1: { fontSize: '2.75rem', fontWeight: '800', lineHeight: '1.15' },
      h2: { fontSize: '2rem', fontWeight: '700', lineHeight: '1.2' },
      h3: { fontSize: '1.5rem', fontWeight: '700', lineHeight: '1.25' },
      h4: { fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.3' },
      h5: { fontSize: '1.0625rem', fontWeight: '600', lineHeight: '1.4' },
      h6: { fontSize: '0.9375rem', fontWeight: '600', lineHeight: '1.45' },
    },
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
  },
  components: {
    Container: {
      defaultProps: {
        size: 'lg',
      },
    },
    Card: {
      defaultProps: {
        shadow: SPACING.shadows.light,
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
    Textarea: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    Checkbox: { defaultProps: { radius: 'sm' } },
    Anchor: {
      styles: {
        root: { fontWeight: 500 },
      },
    },
  },
});
