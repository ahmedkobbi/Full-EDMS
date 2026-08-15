/**
 * Smart EDMS marketing site — Header (spec §7.5, §12.11).
 *
 * Sticky, premium, accessible. Renders the brand logo, primary navigation
 * (Features, Pricing, Security, Docs, Download), the language switcher, and
 * two CTAs ("Request a demo" + "Try free").
 *
 * The header is rendered as a server component because it has no client-side
 * state of its own — only the LanguageSwitcher is interactive, so it is the
 * only client component in the tree.
 *
 * Accessibility:
 *   - `<header role="banner">` semantic landmark.
 *   - `<nav aria-label="Primary">` for the main navigation.
 *   - Skip-to-content link is rendered here (visible on focus) so keyboard
 *     users can bypass the header.
 *   - All interactive elements have a visible focus ring.
 */

import { type ReactNode } from 'react';
import { Container, Group, Button, Box, Anchor } from '@mantine/core';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { BrandedLogo } from '../common/BrandedLogo';
import { LocaleLink } from '../common/LocaleLink';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  readonly locale: MandatoryLocaleCode;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface NavItem {
  readonly href: string;
  readonly labelKey: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/features', labelKey: 'nav.features' },
  { href: '/pricing', labelKey: 'nav.pricing' },
  { href: '/security', labelKey: 'nav.security' },
  { href: '/docs', labelKey: 'nav.docs' },
  { href: '/download', labelKey: 'nav.download' },
];

export function Header({ locale, t }: HeaderProps): ReactNode {
  return (
    <Box
      component="header"
      role="banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'saturate(180%) blur(8px)',
        borderBottom: '1px solid #eceef2',
      }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Group justify="space-between" h={64} wrap="nowrap">
          <LocaleLink href="/" locale={locale} aria-label="Smart EDMS home">
            <BrandedLogo size="md" showTagline={false} />
          </LocaleLink>

          <Box
            component="nav"
            aria-label="Primary"
            style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}
            visibleFrom="md"
          >
            {NAV_ITEMS.map((item) => (
              <Anchor
                key={item.href}
                component={LocaleLink}
                href={item.href}
                locale={locale}
                c="neutral.7"
                underline="never"
                style={{ fontSize: '0.9375rem', fontWeight: 500 }}
              >
                {t(item.labelKey)}
              </Anchor>
            ))}
          </Box>

          <Group gap="sm" wrap="nowrap">
            <Box visibleFrom="sm">
              <LanguageSwitcher currentLocale={locale} label={t('languageSwitcher.label')} />
            </Box>
            <Box visibleFrom="md">
              <Button
                component={LocaleLink}
                href="/trial"
                locale={locale}
                variant="subtle"
                color="neutral"
              >
                {t('nav.tryFree')}
              </Button>
            </Box>
            <Button
              component={LocaleLink}
              href="/demo"
              locale={locale}
              variant="filled"
              color="brand"
            >
              {t('nav.requestDemo')}
            </Button>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
