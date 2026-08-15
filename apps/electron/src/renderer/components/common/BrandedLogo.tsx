/**
 * Smart EDMS branded logo (spec §19).
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
 */
import { type CSSProperties } from 'react';
import { useMantineTheme } from '@mantine/core';

interface BrandedLogoProps {
  /** Visual size preset. */
  readonly size?: 'sm' | 'md' | 'lg';
  /** Show the wordmark next to the logomark (default true). */
  readonly showWordmark?: boolean;
  /** Show the tagline under the wordmark (default false). */
  readonly showTagline?: boolean;
  /** Override the color (defaults to theme primary). */
  readonly color?: string;
  readonly style?: CSSProperties;
}

const SIZE_MAP = {
  sm: { mark: 24, wordmark: 14, tagline: 11, gap: 6 },
  md: { mark: 32, wordmark: 18, tagline: 12, gap: 8 },
  lg: { mark: 48, wordmark: 26, tagline: 14, gap: 12 },
} as const;

/**
 * The Smart EDMS logomark — a stylized "S" inside a rounded square. Rendered
 * as inline SVG so it scales crisply and inherits the brand color.
 *
 * The mark is intentionally geometric (not photographic) so it works at any
 * size and any DPI. The internal glyph is a stylized document-fold + arrow
 * — suggesting both document management and forward motion.
 */
function Logomark({
  size,
  color,
  background,
}: {
  readonly size: number;
  readonly color: string;
  readonly background: string;
}) {
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
      <path
        d="M20 28h10M20 32h10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Arrow glyph suggesting forward motion */}
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

export function BrandedLogo({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  color,
  style,
}: BrandedLogoProps) {
  const theme = useMantineTheme();
  const dims = SIZE_MAP[size];
  const brandColor = color ?? theme.colors.brand[5];
  const bgColor = theme.colors.brand[0];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dims.gap,
        ...style,
      }}
    >
      <Logomark size={dims.mark} color={brandColor} background={bgColor} />
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            style={{
              fontFamily: theme.headings.fontFamily,
              fontWeight: 700,
              fontSize: dims.wordmark,
              color: theme.colors.neutral[9] ?? theme.colors.gray[9],
              letterSpacing: '-0.01em',
            }}
          >
            Smart EDMS
          </span>
          {showTagline && (
            <span
              style={{
                fontSize: dims.tagline,
                color: theme.colors.gray[6],
                fontWeight: 500,
              }}
            >
              Enterprise Document Management
            </span>
          )}
        </div>
      )}
    </div>
  );
}
