import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import { Container, Title, Text, Box, Stack, Alert, Divider } from '@mantine/core';
import { Info } from 'lucide-react';
import { getServerI18n } from '../../../i18n/config';
import { isSupportedLocale, DEFAULT_LOCALE } from '../../../lib/locales';
import { buildPageMetadata } from '../../../lib/seo';

interface PrivacyPageProps {
  readonly params: { readonly locale: string };
}

export function generateMetadata({ params }: PrivacyPageProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.privacy'),
    description: i18n.t('pageDescription.privacy'),
    locale,
    path: '/privacy',
  });
}

interface Section {
  readonly titleKey: string;
  readonly bodyKey: string;
}

const SECTIONS: readonly Section[] = [
  { titleKey: 'privacy.section.dataController.title', bodyKey: 'privacy.section.dataController.body' },
  { titleKey: 'privacy.section.dataCollected.title', bodyKey: 'privacy.section.dataCollected.body' },
  { titleKey: 'privacy.section.dataUse.title', bodyKey: 'privacy.section.dataUse.body' },
  { titleKey: 'privacy.section.dataRetention.title', bodyKey: 'privacy.section.dataRetention.body' },
  { titleKey: 'privacy.section.rights.title', bodyKey: 'privacy.section.rights.body' },
  { titleKey: 'privacy.section.contact.title', bodyKey: 'privacy.section.contact.body' },
];

export default function PrivacyPage({ params }: PrivacyPageProps): ReactNode {
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
            {t('privacy.title')}
          </Title>
          <Text size="sm" c="neutral.5">
            {t('privacy.updated', { date: lastUpdated })}
          </Text>
          <Text size="md" c="neutral.7" style={{ lineHeight: 1.7 }}>
            {t('privacy.intro')}
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
              {t('privacy.disclaimer')}
            </Text>
          </Alert>
        </Stack>
      </Container>
    </Box>
  );
}
