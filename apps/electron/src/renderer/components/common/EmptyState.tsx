/**
 * Smart EDMS empty state (spec §17, §19).
 *
 * Premium empty states with friendly illustrations + helpful actions.
 * Never just "No data" — every empty state suggests the next action the
 * user should take.
 *
 * The illustration is rendered as inline SVG (no external assets, no
 * glassmorphism, solid background) so the component is self-contained.
 */
import { type ReactNode } from 'react';
import { Box, Stack, Text, Group, type MantineColor } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  /** Illustration preset. */
  readonly illustration:
    | 'documents'
    | 'search'
    | 'notifications'
    | 'workflow'
    | 'audit'
    | 'license'
    | 'generic';
  /** Title translation key (e.g. 'documents:library.empty.title'). */
  readonly titleKey: string;
  /** Subtitle translation key. */
  readonly subtitleKey?: string;
  /** Optional action buttons. */
  readonly actions?: ReactNode;
  /** Override the illustration color. */
  readonly color?: MantineColor;
}

const ILLUSTRATION_COLORS: Record<EmptyStateProps['illustration'], MantineColor> = {
  documents: 'brand',
  search: 'info',
  notifications: 'warning',
  workflow: 'success',
  audit: 'gray',
  license: 'brand',
  generic: 'gray',
};

function Illustration({
  kind,
  color,
}: {
  readonly kind: EmptyStateProps['illustration'];
  readonly color: MantineColor;
}) {
  // Each illustration is a simple geometric composition. The colour comes
  // from the Mantine palette so it adapts to light/dark automatically.
  const common = {
    width: 120,
    height: 120,
    viewBox: '0 0 120 120',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  } as const;

  // We use currentColor so the parent's `color` CSS property cascades.
  return (
    <Box
      style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(127, 127, 127, 0.08)',
      }}
    >
      <svg {...common} style={{ color: `var(--mantine-color-${color}-filled)` }} aria-hidden="true">
        {kind === 'documents' && (
          <>
            <rect x="30" y="28" width="44" height="56" rx="4" stroke="currentColor" strokeWidth="3" />
            <rect x="40" y="20" width="44" height="56" rx="4" stroke="currentColor" strokeWidth="3" fill="var(--mantine-color-body)" />
            <path d="M48 38h28M48 48h28M48 58h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {kind === 'search' && (
          <>
            <circle cx="54" cy="54" r="22" stroke="currentColor" strokeWidth="3" />
            <path d="M70 70l16 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M48 54h12M54 48v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {kind === 'notifications' && (
          <>
            <path d="M40 56a20 20 0 1 1 40 0v18l8 8H32l8-8V56z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M52 90a8 8 0 0 0 16 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === 'workflow' && (
          <>
            <rect x="24" y="48" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="3" />
            <rect x="72" y="48" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="3" />
            <rect x="48" y="20" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="3" />
            <rect x="48" y="76" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="3" />
            <path d="M48 32H36v16M72 32h12v16M48 88H36V72M72 88h12V72" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {kind === 'audit' && (
          <>
            <rect x="32" y="28" width="56" height="64" rx="4" stroke="currentColor" strokeWidth="3" />
            <path d="M44 44h32M44 56h32M44 68h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="84" cy="84" r="10" stroke="currentColor" strokeWidth="3" fill="var(--mantine-color-body)" />
            <path d="M80 84l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {kind === 'license' && (
          <>
            <rect x="28" y="32" width="64" height="48" rx="4" stroke="currentColor" strokeWidth="3" />
            <circle cx="48" cy="52" r="8" stroke="currentColor" strokeWidth="3" />
            <path d="M64 48h16M64 56h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 76h40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === 'generic' && (
          <>
            <rect x="32" y="32" width="56" height="56" rx="8" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="60" cy="60" r="8" stroke="currentColor" strokeWidth="3" />
          </>
        )}
      </svg>
    </Box>
  );
}

export function EmptyState({
  illustration,
  titleKey,
  subtitleKey,
  actions,
  color,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const resolvedColor = color ?? ILLUSTRATION_COLORS[illustration];

  return (
    <Stack align="center" justify="center" gap="md" py="xl">
      <Illustration kind={illustration} color={resolvedColor} />
      <Stack align="center" gap={4}>
        <Text fw={600} size="lg">
          {t(titleKey)}
        </Text>
        {subtitleKey && (
          <Text size="sm" c="dimmed" maw={420} ta="center">
            {t(subtitleKey)}
          </Text>
        )}
      </Stack>
      {actions && <Group gap="sm">{actions}</Group>}
    </Stack>
  );
}
