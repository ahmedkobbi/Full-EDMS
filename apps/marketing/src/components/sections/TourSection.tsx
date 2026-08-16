/**
 * Smart EDMS marketing site — TourSection (spec §7.5, §12.11).
 *
 * A short marketing section that points visitors to the interactive product
 * tour on /features. Includes a CTA button "Open the full tour".
 *
 * Server component — no client state.
 */

import { type ReactNode } from 'react';
import { Box, Button, Container, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { Compass } from 'lucide-react';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { LocaleLink } from '../common/LocaleLink';

interface TourSectionProps {
  readonly locale: MandatoryLocaleCode;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

export function TourSection({ locale, t }: TourSectionProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="tour-title"
      style={{
        padding: '5rem 0',
        background: 'linear-gradient(135deg, #2f6bff 0%, #1f54e6 50%, #1841b8 100%)',
        color: 'white',
      }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Stack align="center" gap="md" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
          <ThemeIcon size={56} radius="md" variant="white" color="brand" style={{ background: 'rgba(255, 255, 255, 0.15)' }}>
            <Compass size={28} color="#fff" />
          </ThemeIcon>
          <Title
            id="tour-title"
            order={2}
            style={{ color: 'white', fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700 }}
          >
            {t('tour.title')}
          </Title>
          <Text size="lg" style={{ color: 'rgba(255, 255, 255, 0.92)', lineHeight: 1.6 }}>
            {t('tour.subtitle')}
          </Text>
          <Button
            component={LocaleLink}
            href="/features"
            locale={locale}
            size="lg"
            variant="filled"
            color="white"
            style={{ background: 'white', color: '#1f54e6', fontWeight: 600 }}
            mt="md"
          >
            {t('tour.cta')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
