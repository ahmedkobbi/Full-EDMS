/**
 * Smart EDMS marketing site — Hero section (spec §7.5, §12.11).
 *
 * Premium hero with:
 *   - Non-fabricated badge ("Six languages. One platform.")
 *   - Translated headline + subtitle
 *   - Two CTAs (primary = Request a demo, secondary = Take the tour)
 *   - Product screenshot placeholder (gradient, no real screenshot yet)
 *
 * Per spec §12.11, NO fabricated customer counts, NO fake compliance claims,
 * NO invented metrics. The hero.badge.locale key replaces the legacy
 * hero.badge ("Trusted by organisations in 40+ countries") which was a
 * fabricated customer claim.
 */

import { type ReactNode } from 'react';
import { Container, Title, Text, Button, Group, Box, Badge } from '@mantine/core';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { LocaleLink } from '../common/LocaleLink';

interface HeroProps {
  readonly locale: MandatoryLocaleCode;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

export function Hero({ locale, t }: HeroProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="hero-title"
      style={{
        position: 'relative',
        paddingTop: '5rem',
        paddingBottom: '4rem',
        background:
          'radial-gradient(ellipse at top, #e8f0ff 0%, #f7f8fa 50%, #ffffff 100%)',
        overflow: 'hidden',
      }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <Badge
            variant="light"
            color="brand"
            size="lg"
            radius="xl"
            style={{ marginBottom: '1.5rem', textTransform: 'none', fontWeight: 600 }}
          >
            {t('hero.badge.locale')}
          </Badge>

          <Title
            id="hero-title"
            order={1}
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              marginBottom: '1.25rem',
              color: '#1a1d27',
            }}
          >
            {t('hero.title')}
          </Title>

          <Text
            size="lg"
            c="neutral.6"
            style={{
              fontSize: '1.1875rem',
              lineHeight: 1.6,
              maxWidth: 720,
              margin: '0 auto 2rem',
            }}
          >
            {t('hero.subtitle')}
          </Text>

          <Group justify="center" gap="md" wrap="wrap">
            <Button
              component={LocaleLink}
              href="/demo"
              locale={locale}
              size="lg"
              variant="filled"
              color="brand"
            >
              {t('hero.cta.primary')}
            </Button>
            <Button
              component={LocaleLink}
              href="/features"
              locale={locale}
              size="lg"
              variant="outline"
              color="brand"
            >
              {t('hero.cta.secondary')}
            </Button>
          </Group>

          <Text size="sm" c="neutral.5" mt="lg" style={{ fontWeight: 500 }}>
            {t('hero.trust.noCreditCard')}
          </Text>
        </Box>

        {/* Product screenshot placeholder — gradient panel representing the
            Smart EDMS desktop UI. Replaced with a real screenshot once one
            is available. */}
        <Box
          style={{
            marginTop: '3.5rem',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06)',
            border: '1px solid #dde1e8',
            background: 'linear-gradient(135deg, #2f6bff 0%, #1a1d27 100%)',
            aspectRatio: '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Smart EDMS product screenshot"
          role="img"
        >
          <Text c="white" size="xl" fw={600} style={{ opacity: 0.85 }}>
            Smart EDMS
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
