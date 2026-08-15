import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import { Container, Title, Text, Box } from '@mantine/core';
import { getServerI18n } from '../../../i18n/config';
import { isSupportedLocale, DEFAULT_LOCALE } from '../../../lib/locales';
import { buildPageMetadata } from '../../../lib/seo';
import { SecuritySection } from '../../../components/sections/SecuritySection';
import { CTA } from '../../../components/sections/CTA';

interface SecurityPageProps {
  readonly params: { readonly locale: string };
}

export function generateMetadata({ params }: SecurityPageProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.security'),
    description: i18n.t('pageDescription.security'),
    locale,
    path: '/security',
  });
}

export default function SecurityPage({ params }: SecurityPageProps): ReactNode {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  const t = i18n.t.bind(i18n);

  return (
    <>
      <Box
        component="section"
        style={{
          paddingTop: '4rem',
          paddingBottom: '3rem',
          background:
            'radial-gradient(ellipse at top, #e8f0ff 0%, #f7f8fa 50%, #ffffff 100%)',
        }}
      >
        <Container size="lg" px={{ base: 'md', md: 'lg' }}>
          <Box style={{ textAlign: 'center', maxWidth: 880, margin: '0 auto' }}>
            <Title
              order={1}
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: '1rem',
                color: '#1a1d27',
              }}
            >
              {t('security.title')}
            </Title>
            <Text size="lg" c="neutral.6" style={{ lineHeight: 1.6 }}>
              {t('security.subtitle')}
            </Text>
          </Box>
        </Container>
      </Box>

      <SecuritySection t={t} />
      <CTA locale={locale} t={t} />
    </>
  );
}
