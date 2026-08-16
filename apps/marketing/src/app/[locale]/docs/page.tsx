import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import { Box, Card, Container, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  BookOpenCheck,
  Code2,
  type LucideIcon,
  Rocket,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { getServerI18n } from '../../../i18n/config';
import { DEFAULT_LOCALE, isSupportedLocale } from '../../../lib/locales';
import { buildPageMetadata } from '../../../lib/seo';
import { CTA } from '../../../components/sections/CTA';

interface DocsPageProps {
  readonly params: { readonly locale: string };
}

export function generateMetadata({ params }: DocsPageProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.docs'),
    description: i18n.t('pageDescription.docs'),
    locale,
    path: '/docs',
  });
}

interface DocLink {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly href: string;
}

const DOC_LINKS: readonly DocLink[] = [
  { id: 'gettingStarted', icon: Rocket, titleKey: 'docs.link.gettingStarted.title', bodyKey: 'docs.link.gettingStarted.body', href: '/docs/getting-started' },
  { id: 'api', icon: Code2, titleKey: 'docs.link.api.title', bodyKey: 'docs.link.api.body', href: '/docs/api' },
  { id: 'admin', icon: Settings, titleKey: 'docs.link.admin.title', bodyKey: 'docs.link.admin.body', href: '/docs/admin' },
  { id: 'security', icon: ShieldCheck, titleKey: 'docs.link.security.title', bodyKey: 'docs.link.security.body', href: '/docs/security' },
  { id: 'compliance', icon: BookOpenCheck, titleKey: 'docs.link.compliance.title', bodyKey: 'docs.link.compliance.body', href: '/docs/compliance' },
];

export default function DocsPage({ params }: DocsPageProps): ReactNode {
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
              {t('docs.title')}
            </Title>
            <Text size="lg" c="neutral.6" style={{ lineHeight: 1.6 }}>
              {t('docs.subtitle')}
            </Text>
          </Box>
        </Container>
      </Box>

      <Box component="section" style={{ padding: '2rem 0 4rem' }}>
        <Container size="lg" px={{ base: 'md', md: 'lg' }}>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
            {DOC_LINKS.map((doc) => {
              const Icon = doc.icon;
              return (
                <Card key={doc.id} padding="lg" radius="md" withBorder shadow="sm" component="a" href={doc.href}>
                  <Stack gap="sm">
                    <ThemeIcon size={44} radius="md" variant="light" color="brand">
                      <Icon size={22} />
                    </ThemeIcon>
                    <Text fw={700} size="md" style={{ color: '#1a1d27' }}>
                      {t(doc.titleKey)}
                    </Text>
                    <Text size="sm" c="neutral.6" style={{ lineHeight: 1.55 }}>
                      {t(doc.bodyKey)}
                    </Text>
                    <Text size="sm" c="brand.6" fw={600}>
                      {t('docs.placeholder')} →
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          <Text size="sm" c="neutral.5" ta="center" mt="xl">
            {t('docs.subtitle')}
          </Text>
        </Container>
      </Box>

      <CTA locale={locale} t={t} />
    </>
  );
}
