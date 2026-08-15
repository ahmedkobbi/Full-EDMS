/**
 * Smart EDMS marketing site — final CTA section (spec §7.5).
 *
 * A bold call-to-action block inviting the visitor to book a demo. Includes
 * a primary CTA ("Book a demo") and a secondary anchor ("Or read the docs").
 *
 * Server component — no client state.
 */

import { type ReactNode } from 'react';
import { Box, Container, Title, Text, Button, Group, Anchor, Stack } from '@mantine/core';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { LocaleLink } from '../common/LocaleLink';

interface CTAProps {
  readonly locale: MandatoryLocaleCode;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

export function CTA({ locale, t }: CTAProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="cta-title"
      style={{
        padding: '5rem 0',
        background: '#1a1d27',
        color: 'white',
      }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Stack align="center" gap="md" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
          <Title
            id="cta-title"
            order={2}
            style={{ color: 'white', fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700 }}
          >
            {t('cta.title')}
          </Title>
          <Text size="lg" style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6 }}>
            {t('cta.subtitle')}
          </Text>
          <Group justify="center" gap="md" mt="md" wrap="wrap">
            <Button
              component={LocaleLink}
              href="/demo"
              locale={locale}
              size="lg"
              variant="filled"
              color="brand"
            >
              {t('cta.button')}
            </Button>
            <Anchor
              component={LocaleLink}
              href="/docs"
              locale={locale}
              size="lg"
              c="white"
              underline="always"
              style={{ fontWeight: 500 }}
            >
              {t('cta.secondary')}
            </Anchor>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
