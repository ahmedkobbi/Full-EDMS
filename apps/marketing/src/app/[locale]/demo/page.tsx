import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import { Box, Card, Container, Text, Title } from '@mantine/core';
import { getServerI18n } from '../../../i18n/config';
import { DEFAULT_LOCALE, isSupportedLocale } from '../../../lib/locales';
import { buildPageMetadata } from '../../../lib/seo';
import { DemoRequestForm } from '../../../components/forms/DemoRequestForm';
import { I18nProvider } from '../../../i18n/I18nProvider';

interface DemoPageProps {
  readonly params: { readonly locale: string };
}

export function generateMetadata({ params }: DemoPageProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.demo'),
    description: i18n.t('pageDescription.demo'),
    locale,
    path: '/demo',
  });
}

export default function DemoPage({ params }: DemoPageProps): ReactNode {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  const t = i18n.t.bind(i18n);

  return (
    <Box component="section" style={{ padding: '4rem 0 5rem' }}>
      <Container size="sm" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Title
            order={1}
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '0.75rem',
              color: '#1a1d27',
            }}
          >
            {t('demo.title')}
          </Title>
          <Text size="lg" c="neutral.6" style={{ lineHeight: 1.6, maxWidth: 560, margin: '0 auto' }}>
            {t('demo.subtitle')}
          </Text>
        </Box>

        <Card padding="xl" radius="md" withBorder shadow="sm">
          <I18nProvider locale={locale}>
            <DemoRequestForm locale={locale} />
          </I18nProvider>
        </Card>
      </Container>
    </Box>
  );
}
