/**
 * Smart EDMS marketing site — Footer (spec §7.5, §12.11).
 *
 * Renders four navigation columns (Product, Resources, Legal, Company) plus
 * the brand logo and a language switcher. The copyright line is interpolated
 * with the current year via i18next's `{{year}}` syntax.
 *
 * Server component — no client-side state.
 */

import { type ReactNode } from 'react';
import { Anchor, Box, Container, Divider, Group, Stack, Text } from '@mantine/core';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { BrandedLogo } from '../common/BrandedLogo';
import { LocaleLink } from '../common/LocaleLink';
import { LanguageSwitcher } from './LanguageSwitcher';

interface FooterProps {
  readonly locale: MandatoryLocaleCode;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface FooterColumn {
  readonly titleKey: string;
  readonly links: ReadonlyArray<{ readonly href: string; readonly labelKey: string }>;
}

const COLUMNS: readonly FooterColumn[] = [
  {
    titleKey: 'footer.product',
    links: [
      { href: '/features', labelKey: 'footer.features' },
      { href: '/pricing', labelKey: 'footer.pricing' },
      { href: '/demo', labelKey: 'footer.demo' },
      { href: '/trial', labelKey: 'footer.trial' },
      { href: '/download', labelKey: 'footer.download' },
    ],
  },
  {
    titleKey: 'footer.resources',
    links: [
      { href: '/docs', labelKey: 'footer.docs' },
      { href: '/security', labelKey: 'footer.legal.security' },
      { href: '/contact', labelKey: 'footer.contact' },
    ],
  },
  {
    titleKey: 'footer.legal',
    links: [
      { href: '/privacy', labelKey: 'footer.legal.privacy' },
      { href: '/terms', labelKey: 'footer.legal.terms' },
      { href: '/security', labelKey: 'footer.legal.compliance' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { href: '/contact', labelKey: 'footer.contact' },
    ],
  },
];

export function Footer({ locale, t }: FooterProps): ReactNode {
  const year = new Date().getUTCFullYear();
  return (
    <Box
      component="footer"
      role="contentinfo"
      style={{
        background: '#1a1d27',
        color: '#c2c8d3',
        marginTop: '6rem',
        padding: '3.5rem 0 1.5rem',
      }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Group align="flex-start" justify="space-between" wrap="wrap" gap="xl">
          <Stack gap="md" style={{ maxWidth: 320 }}>
            <BrandedLogo
              size="md"
              showTagline
              tagline={t('brand.tagline')}
              color="#a4c2ff"
              style={{ filter: 'brightness(1.4)' }}
            />
            <Text size="sm" c="gray.5" style={{ lineHeight: 1.55 }}>
              {t('footer.tagline')}
            </Text>
            <Box style={{ marginTop: '0.5rem' }}>
              <LanguageSwitcher
                currentLocale={locale}
                label={t('languageSwitcher.label')}
                variant="footer"
              />
            </Box>
          </Stack>

          <Group align="flex-start" gap="xl" wrap="wrap">
            {COLUMNS.map((col) => (
              <Stack key={col.titleKey} gap="xs" style={{ minWidth: 160 }}>
                <Text size="sm" fw={700} c="white" style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {t(col.titleKey)}
                </Text>
                {col.links.map((link) => (
                  <Anchor
                    key={link.labelKey}
                    component={LocaleLink}
                    href={link.href}
                    locale={locale}
                    c="gray.5"
                    underline="never"
                    style={{ fontSize: '0.875rem', lineHeight: 1.6 }}
                  >
                    {t(link.labelKey)}
                  </Anchor>
                ))}
              </Stack>
            ))}
          </Group>
        </Group>

        <Divider my="xl" color="rgba(255, 255, 255, 0.08)" />

        <Text size="xs" c="gray.6" ta="center">
          {t('footer.copyright', { year })}
        </Text>
      </Container>
    </Box>
  );
}
