import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import { Box, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { Briefcase, LifeBuoy, Lock, Mail, ShieldAlert } from 'lucide-react';
import { getServerI18n } from '../../../i18n/config';
import { DEFAULT_LOCALE, isSupportedLocale } from '../../../lib/locales';
import { buildPageMetadata } from '../../../lib/seo';

interface ContactPageProps {
  readonly params: { readonly locale: string };
}

export function generateMetadata({ params }: ContactPageProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.contact'),
    description: i18n.t('pageDescription.contact'),
    locale,
    path: '/contact',
  });
}

interface ContactChannel {
  readonly id: 'email' | 'sales' | 'support' | 'security' | 'privacy';
  readonly icon: typeof Mail;
  readonly labelKey: string;
  readonly valueKey: string;
}

const CHANNELS: readonly ContactChannel[] = [
  { id: 'email', icon: Mail, labelKey: 'contact.email.label', valueKey: 'contact.email.value' },
  { id: 'sales', icon: Briefcase, labelKey: 'contact.sales.label', valueKey: 'contact.sales.value' },
  { id: 'support', icon: LifeBuoy, labelKey: 'contact.support.label', valueKey: 'contact.support.value' },
  { id: 'security', icon: ShieldAlert, labelKey: 'contact.security.label', valueKey: 'contact.security.value' },
  { id: 'privacy', icon: Lock, labelKey: 'contact.privacy.label', valueKey: 'contact.privacy.value' },
];

export default function ContactPage({ params }: ContactPageProps): ReactNode {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  const t = i18n.t.bind(i18n);

  return (
    <Box
      component="section"
      style={{
        padding: '4rem 0 5rem',
        background:
          'radial-gradient(ellipse at top, #e8f0ff 0%, #f7f8fa 50%, #ffffff 100%)',
      }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 3rem' }}>
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
            {t('contact.title')}
          </Title>
          <Text size="lg" c="neutral.6" style={{ lineHeight: 1.6 }}>
            {t('contact.subtitle')}
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const value = t(channel.valueKey);
            return (
              <Card key={channel.id} padding="lg" radius="md" withBorder shadow="sm">
                <Stack gap="sm">
                  <Group gap="sm" align="center">
                    <ThemeIcon size={36} radius="md" variant="light" color="brand">
                      <Icon size={18} />
                    </ThemeIcon>
                    <Text fw={700} size="sm" style={{ color: '#1a1d27' }}>
                      {t(channel.labelKey)}
                    </Text>
                  </Group>
                  <Text size="sm" c="brand.6" component="a" href={`mailto:${value}`} style={{ textDecoration: 'none' }}>
                    {value}
                  </Text>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
