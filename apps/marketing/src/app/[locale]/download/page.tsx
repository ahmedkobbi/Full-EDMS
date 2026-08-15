import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import { Container, Title, Text, Box, SimpleGrid, Card, Stack, Alert } from '@mantine/core';
import { Monitor, Apple, TerminalSquare, Server, Info } from 'lucide-react';
import { getServerI18n } from '../../../i18n/config';
import { isSupportedLocale, DEFAULT_LOCALE } from '../../../lib/locales';
import { buildPageMetadata } from '../../../lib/seo';
import { CTA } from '../../../components/sections/CTA';

interface DownloadPageProps {
  readonly params: { readonly locale: string };
}

export function generateMetadata({ params }: DownloadPageProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.download'),
    description: i18n.t('pageDescription.download'),
    locale,
    path: '/download',
  });
}

interface Platform {
  readonly id: 'windows' | 'macos' | 'linux' | 'server';
  readonly icon: typeof Monitor;
  readonly labelKey: string;
  readonly available: boolean;
}

const PLATFORMS: readonly Platform[] = [
  { id: 'windows', icon: Monitor, labelKey: 'download.platform.windows', available: false },
  { id: 'macos', icon: Apple, labelKey: 'download.platform.macos', available: false },
  { id: 'linux', icon: TerminalSquare, labelKey: 'download.platform.linux', available: false },
  { id: 'server', icon: Server, labelKey: 'download.platform.server', available: false },
];

export default function DownloadPage({ params }: DownloadPageProps): ReactNode {
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
              {t('download.title')}
            </Title>
            <Text size="lg" c="neutral.6" style={{ lineHeight: 1.6 }}>
              {t('download.subtitle')}
            </Text>
          </Box>
        </Container>
      </Box>

      <Box component="section" style={{ padding: '2rem 0 4rem' }}>
        <Container size="lg" px={{ base: 'md', md: 'lg' }}>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="lg">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              return (
                <Card key={platform.id} padding="lg" radius="md" withBorder shadow="sm" style={{ textAlign: 'center' }}>
                  <Stack align="center" gap="sm">
                    <Icon size={40} color="#2f6bff" />
                    <Text fw={700} size="md" style={{ color: '#1a1d27' }}>
                      {t(platform.labelKey)}
                    </Text>
                    <Text size="xs" c="neutral.5" fw={500}>
                      {t('download.comingSoon')}
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          <Alert
            icon={<Info size={18} />}
            color="brand"
            variant="light"
            radius="md"
            style={{ marginTop: '2rem', maxWidth: 880, margin: '2rem auto 0' }}
          >
            <Text size="sm" c="neutral.8" style={{ lineHeight: 1.6 }}>
              {t('download.note')}
            </Text>
          </Alert>

          <Text size="sm" c="neutral.6" ta="center" mt="xl">
            {t('download.cta.contactSales')}
          </Text>
        </Container>
      </Box>

      <CTA locale={locale} t={t} />
    </>
  );
}
