/**
 * BrandedLogo — the Smart EDMS wordmark + logomark (spec §19).
 *
 * Renders the Smart EDMS wordmark + logomark. Used in the sidebar, topbar,
 * login page, splash screen, and AI assistant bubble header.
 *
 * Branding rules (spec §19):
 *  - The wordmark "Smart EDMS" is the SAME in every locale (the product
 *    name is never translated; only descriptive text translates).
 *  - The logomark uses the primary brand color.
 *  - Both light and dark variants must have AA contrast.
 *  - No glassmorphism — solid background.
 *
 * The component is RTL-agnostic (the logomark is always to the start of
 * the wordmark, which Mantine's `dir` attribute handles via flexbox).
 */

import { type CSSProperties, type ReactElement } from 'react';
import { Box, useMantineTheme } from '@mantine/core';

/** Props for {@link BrandedLogo}. */
export interface BrandedLogoProps {
  /** Visual size preset. Default `'md'`. */
  readonly size?: 'sm' | 'md' | 'lg';
  /** Show the wordmark next to the logomark. Default `true`. */
  readonly showWordmark?: boolean;
  /** Show the tagline under the wordmark. Default `false`. */
  readonly showTagline?: boolean;
  /** Override the brand color (defaults to `theme.colors.brand[5]`). */
  readonly color?: string;
  /** Extra CSS class name(s) applied to the root element. */
  readonly className?: string;
  /** Inline style override applied to the root element. */
  readonly style?: CSSProperties;
}

/** Size → pixel dimensions map. */
const SIZE_MAP = {
  sm: { mark: 24, wordmark: 14, tagline: 11, gap: 6 },
  md: { mark: 32, wordmark: 18, tagline: 12, gap: 8 },
  lg: { mark: 48, wordmark: 26, tagline: 14, gap: 12 },
} as const;

/**
 * The Smart EDMS logomark — a stylized document-fold + arrow inside a
 * rounded square. Rendered as inline SVG so it scales crisply and inherits
 * the brand color. The mark is intentionally geometric (not photographic)
 * so it works at any size and any DPI.
 */
function Logomark({
  size,
  color,
  background,
}: {
  readonly size: number;
  readonly color: string;
  readonly background: string;
}): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Smart EDMS"
    >
      <rect width="48" height="48" rx="11" fill={background} />
      <path
        d="M16 14h12l8 8v14a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M28 14v8h8" fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 28h10M20 32h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Arrow glyph suggesting forward motion (RTL-safe: points to the end). */}
      <path
        d="M33 20l3 3-3 3"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Render the Smart EDMS branded logo. The logomark is always rendered; the
 * wordmark and tagline are optional.
 *
 * @example
 *   <BrandedLogo size="lg" showTagline />
 */
export function BrandedLogo({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  color,
  className,
  style,
}: BrandedLogoProps): ReactElement {
  const theme = useMantineTheme();
  const dims = SIZE_MAP[size];
  const brandColor = color ?? theme.colors.brand[5];
  const bgColor = theme.colors.brand[0];

  return (
    <Box
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dims.gap,
        // Logical property: in RTL the logomark stays at the start (right side).
        flexDirection: 'row',
        ...style,
      }}
    >
      <Logomark size={dims.mark} color={brandColor} background={bgColor} />
      {showWordmark && (
        <Box style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <Box
            component="span"
            style={{
              fontFamily: theme.headings.fontFamily,
              fontWeight: 700,
              fontSize: dims.wordmark,
              color: theme.colors.gray[9] ?? theme.colors.neutral[9],
              letterSpacing: '-0.01em',
            }}
          >
            Smart EDMS
          </Box>
          {showTagline && (
            <Box
              component="span"
              style={{
                fontSize: dims.tagline,
                color: theme.colors.gray[6],
                fontWeight: 500,
              }}
            >
              Enterprise Document Management
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
