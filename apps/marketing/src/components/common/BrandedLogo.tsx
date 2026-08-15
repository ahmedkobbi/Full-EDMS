'use client';

/**
 * Smart EDMS branded logo — marketing variant (spec §19).
 *
 * Renders the Smart EDMS logomark + wordmark. Used in the header and footer
 * of every marketing page. The wordmark "Smart EDMS" is the same in every
 * locale (the product name is never translated; only descriptive text
 * translates).
 *
 * Mirrors the License Admin and Electron BrandedLogo so the public site, the
 * desktop app, and the admin panel all look like the same product. The
 * tagline shown under the wordmark is configurable via props (the marketing
 * site uses "Enterprise Document Management" by default).
 *
 * Marked 'use client' because it reads the active Mantine theme via
 * `useMantineTheme()` for color resolution. The theme is provided by
 * `ClientProviders` at the root of the layout.
 */

import { type CSSProperties } from 'react';
import { useMantineTheme } from '@mantine/core';

interface BrandedLogoProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly showWordmark?: boolean;
  readonly showTagline?: boolean;
  readonly tagline?: string;
  readonly color?: string;
  readonly style?: CSSProperties;
}

const SIZE_MAP = {
  sm: { mark: 24, wordmark: 14, tagline: 11, gap: 6 },
  md: { mark: 32, wordmark: 18, tagline: 12, gap: 8 },
  lg: { mark: 48, wordmark: 26, tagline: 14, gap: 12 },
} as const;

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
      <path d="M20 28h10M20 32h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
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
  tagline,
  color,
  style,
}: BrandedLogoProps) {
  const theme = useMantineTheme();
  const dims = SIZE_MAP[size];
  const brandColor = color ?? theme.colors.brand[6];
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
              fontWeight: 800,
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
              {tagline ?? 'Enterprise Document Management'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
