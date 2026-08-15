import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import { Container, Title, Text, Box, Stack, Alert, Divider } from '@mantine/core';
import { Info } from 'lucide-react';
import { getServerI18n } from '../../../i18n/config';
import { isSupportedLocale, DEFAULT_LOCALE } from '../../../lib/locales';
import { buildPageMetadata } from '../../../lib/seo';

interface TermsPageProps {
  readonly params: { readonly locale: string };
}

export function generateMetadata({ params }: TermsPageProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.terms'),
    description: i18n.t('pageDescription.terms'),
    locale,
    path: '/terms',
  });
}

interface Section {
  readonly titleKey: string;
  readonly bodyKey: string;
}

const SECTIONS: readonly Section[] = [
  { titleKey: 'terms.section.acceptance.title', bodyKey: 'terms.section.acceptance.body' },
  { titleKey: 'terms.section.license.title', bodyKey: 'terms.section.license.body' },
  { titleKey: 'terms.section.use.title', bodyKey: 'terms.section.use.body' },
  { titleKey: 'terms.section.fees.title', bodyKey: 'terms.section.fees.body' },
  { titleKey: 'terms.section.warranty.title', bodyKey: 'terms.section.warranty.body' },
  { titleKey: 'terms.section.liability.title', bodyKey: 'terms.section.liability.body' },
  { titleKey: 'terms.section.termination.title', bodyKey: 'terms.section.termination.body' },
  { titleKey: 'terms.section.contact.title', bodyKey: 'terms.section.contact.body' },
];

export default function TermsPage({ params }: TermsPageProps): ReactNode {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  const t = i18n.t.bind(i18n);
  const lastUpdated = '2025-01-15';

  return (
    <Box component="section" style={{ padding: '4rem 0 5rem' }}>
      <Container size="md" px={{ base: 'md', md: 'lg' }}>
        <Stack gap="md">
          <Title
            order={1}
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#1a1d27',
            }}
          >
            {t('terms.title')}
          </Title>
          <Text size="sm" c="neutral.5">
            {t('terms.updated', { date: lastUpdated })}
          </Text>
          <Text size="md" c="neutral.7" style={{ lineHeight: 1.7 }}>
            {t('terms.intro')}
          </Text>

          <Divider my="sm" />

          {SECTIONS.map((section) => (
            <Box key={section.titleKey} component="section" mt="md">
              <Title order={2} size="h3" style={{ color: '#1a1d27', marginBottom: '0.5rem' }}>
                {t(section.titleKey)}
              </Title>
              <Text size="md" c="neutral.7" style={{ lineHeight: 1.7 }}>
                {t(section.bodyKey)}
              </Text>
            </Box>
          ))}

          <Alert
            icon={<Info size={18} />}
            color="warning"
            variant="light"
            radius="md"
            mt="lg"
          >
            <Text size="sm" c="neutral.8" style={{ lineHeight: 1.6 }}>
              {t('terms.disclaimer')}
            </Text>
          </Alert>
        </Stack>
      </Container>
    </Box>
  );
}
