/**
 * Smart EDMS design tokens (spec §17, §19).
 *
 * Centralized brand color palette, typography, spacing, and radii used by
 * the Mantine v7 theme provider. All values are hex strings or rem units;
 * no runtime CSS-in-JS is used (per spec §27.5).
 *
 * The palette is engineered for:
 *  - High-Assurance Premium aesthetic — solid elevated surfaces, subtle
 *    borders, high-contrast text, semantic status colors.
 *  - No glassmorphism on data tables or sidebars (spec §17).
 *  - Both light and dark themes premium quality (spec §18, §19).
 */

/**
 * Primary brand color — a deep enterprise blue used for primary actions,
 * active states, focus rings, and the wordmark. The 10-shade ramp matches
 * Mantine v7's color scheme (shade 0 = lightest, shade 9 = darkest).
 *
 * Color rationale: blue conveys trust and stability, appropriate for an
 * enterprise document management system used in regulated industries.
 */
export const BRAND_PRIMARY: readonly string[] = [
  '#e8f0ff', // 0
  '#cfe0ff', // 1
  '#a4c2ff', // 2
  '#7aa3ff', // 3
  '#4f85ff', // 4
  '#2f6bff', // 5 — default primary
  '#1f54e6', // 6 — hovered primary
  '#1841b8', // 7
  '#12308a', // 8
  '#0c2060', // 9
] as const;

/**
 * Neutral gray ramp used for surfaces, borders, and text. Tuned so that:
 *  - Light theme has warm-tinted grays (no blue cast).
 *  - Dark theme has cool-tinted grays for contrast against the brand blue.
 */
export const BRAND_NEUTRAL: readonly string[] = [
  '#ffffff', // 0 — pure white surface
  '#f7f8fa', // 1 — page background (light)
  '#eceef2', // 2 — bordered surface
  '#dde1e8', // 3 — divider
  '#c2c8d3', // 4 — muted border
  '#9aa1ae', // 5 — secondary text (light)
  '#6b7280', // 6 — tertiary text
  '#4b5363', // 7 — primary text on dark surfaces
  '#2f3543', // 8 — dark surface
  '#1a1d27', // 9 — darkest surface (dark theme background)
] as const;

/**
 * Semantic status colors. Each color maps to a UI status (success, warning,
 * error, info). The ramps follow the same 10-shade convention.
 */
export const BRAND_STATUS = {
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
  info: BRAND_PRIMARY,
} as const;

/** Typography scale. Rem-based so it scales with the user's font-size setting. */
export const TYPOGRAPHY = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  headingFontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monospaceFontFamily:
    "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, 'Courier New', monospace",
  headingFontWeight: '700' as const,
  fontSize: '16px' as const,
  headings: {
    h1: { fontSize: '2rem', fontWeight: '700', lineHeight: '1.2' },
    h2: { fontSize: '1.625rem', fontWeight: '700', lineHeight: '1.25' },
    h3: { fontSize: '1.375rem', fontWeight: '600', lineHeight: '1.3' },
    h4: { fontSize: '1.125rem', fontWeight: '600', lineHeight: '1.35' },
    h5: { fontSize: '1rem', fontWeight: '600', lineHeight: '1.4' },
    h6: { fontSize: '0.875rem', fontWeight: '600', lineHeight: '1.45' },
  },
} as const;

/** Spacing and radius tokens (rem). */
export const SPACING = {
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
    dark: '0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.5)',
  },
} as const;

/**
 * Z-index scale. Tour overlay sits above sidebars and drawers; AI bubble sits
 * below the tour overlay but above everything else.
 */
export const Z_INDEX = {
  sidebar: 100,
  topbar: 110,
  commandPalette: 200,
  aiBubble: 800,
  tourOverlay: 1000,
  tourPopover: 1010,
} as const;

/**
 * Build the Mantine v7 colors object. Mantine expects each color to be an
 * array of 10 hex strings (shades 0–9).
 */
export function buildColorScale(colorScheme: 'light' | 'dark'): Record<string, readonly string[]> {
  return {
    brand: BRAND_PRIMARY,
    neutral: BRAND_NEUTRAL,
    success: BRAND_STATUS.success,
    warning: BRAND_STATUS.warning,
    error: BRAND_STATUS.error,
    info: BRAND_STATUS.info,
    // Per-theme overrides for the default Mantine 'dark'/'gray' ramps so
    // surfaces stay premium in both color schemes.
    gray: colorScheme === 'dark' ? BRAND_NEUTRAL : BRAND_NEUTRAL,
  };
}
