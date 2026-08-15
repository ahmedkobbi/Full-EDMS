/**
 * Empty state (spec §17, §19).
 *
 * Premium empty states with friendly illustrations + helpful actions.
 * Never just "No data" — every empty state suggests the next action the
 * admin should take.
 */
import { type ReactNode } from 'react';
import { Box, Stack, Text, Group, type MantineColor } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  readonly illustration:
    | 'customers'
    | 'products'
    | 'licenses'
    | 'activations'
    | 'trials'
    | 'webhooks'
    | 'apiKeys'
    | 'audit'
    | 'signingKeys'
    | 'offline'
    | 'generic'
    | 'workflow'
    | 'license'
    | 'documents'
    | 'search'
    | 'notifications';
  readonly titleKey: string;
  readonly subtitleKey?: string;
  readonly actions?: ReactNode;
  readonly color?: MantineColor;
}

const ILLUSTRATION_COLORS: Record<EmptyStateProps['illustration'], MantineColor> = {
  customers: 'brand',
  products: 'info',
  licenses: 'brand',
  activations: 'success',
  trials: 'warning',
  webhooks: 'info',
  apiKeys: 'brand',
  audit: 'gray',
  signingKeys: 'success',
  offline: 'warning',
  generic: 'gray',
  workflow: 'brand',
  license: 'brand',
  documents: 'info',
  search: 'brand',
  notifications: 'warning',
};

function Illustration({
  kind,
  color,
}: {
  readonly kind: EmptyStateProps['illustration'];
  readonly color: MantineColor;
}) {
  const common = {
    width: 120,
    height: 120,
    viewBox: '0 0 120 120',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  } as const;

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
        {kind === 'customers' && (
          <>
            <circle cx="42" cy="44" r="10" stroke="currentColor" strokeWidth="3" />
            <path d="M28 76a14 14 0 0 1 28 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="78" cy="56" r="8" stroke="currentColor" strokeWidth="3" />
            <path d="M66 80a10 10 0 0 1 24 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === 'products' && (
          <>
            <rect x="32" y="32" width="56" height="56" rx="6" stroke="currentColor" strokeWidth="3" />
            <path d="M48 56h24M48 68h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {kind === 'licenses' && (
          <>
            <rect x="28" y="32" width="64" height="48" rx="4" stroke="currentColor" strokeWidth="3" />
            <circle cx="48" cy="52" r="8" stroke="currentColor" strokeWidth="3" />
            <path d="M64 48h16M64 56h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 76h40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === 'activations' && (
          <>
            <circle cx="60" cy="60" r="22" stroke="currentColor" strokeWidth="3" />
            <path d="M48 60l8 8 16-16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {kind === 'trials' && (
          <>
            <circle cx="60" cy="60" r="22" stroke="currentColor" strokeWidth="3" />
            <path d="M60 46v14l10 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === 'webhooks' && (
          <>
            <path d="M40 50a20 20 0 1 1 40 0v14l6 8H34l6-8V50z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M52 84a8 8 0 0 0 16 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === 'apiKeys' && (
          <>
            <circle cx="44" cy="60" r="10" stroke="currentColor" strokeWidth="3" />
            <path d="M54 60h26M68 60v12M78 60v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
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
        {kind === 'signingKeys' && (
          <>
            <rect x="40" y="44" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="3" />
            <path d="M50 44v-6a10 10 0 0 1 20 0v6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="60" r="4" fill="currentColor" />
          </>
        )}
        {kind === 'offline' && (
          <>
            <path d="M40 60a20 20 0 1 1 40 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M48 60a12 12 0 0 1 24 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="60" r="3" fill="currentColor" />
            <path d="M60 76v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === 'generic' && (
          <>
            <rect x="32" y="32" width="56" height="56" rx="8" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="60" cy="60" r="8" stroke="currentColor" strokeWidth="3" />
          </>
        )}
        {(kind === 'workflow' || kind === 'documents' || kind === 'license' || kind === 'search' || kind === 'notifications') && (
          <>
            <rect x="32" y="32" width="56" height="56" rx="8" stroke="currentColor" strokeWidth="3" />
            <path d="M48 56h24M48 64h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
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
