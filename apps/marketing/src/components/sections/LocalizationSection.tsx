/**
 * Smart EDMS marketing site — LocalizationSection (spec §7.5, §12.11, §16).
 *
 * Showcases the six mandatory Smart EDMS locales. Renders:
 *   - The locale list with native names + English names + direction
 *   - An RTL demo card (renders the Arabic word for "document management"
 *     so visitors can see RTL rendering in action)
 *   - The ICU plural and locale-aware-formatting pillars
 *
 * Server component — uses the `SUPPORTED_LOCALES` metadata from
 * `@smart-edms/i18n` directly.
 */

import { type ReactNode } from 'react';
import {
  Box,
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  ThemeIcon,
  Stack,
  Code,
} from '@mantine/core';
import {
  Languages,
  ArrowLeftRight,
  Sigma,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import { LOCALES, type LocaleMeta } from '@smart-edms/i18n';

interface LocalizationSectionProps {
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface Pillar {
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly bodyKey: string;
}

const PILLARS: readonly Pillar[] = [
  { icon: ArrowLeftRight, titleKey: 'localization.rtl.title', bodyKey: 'localization.rtl.body' },
  { icon: Sigma, titleKey: 'localization.icu.title', bodyKey: 'localization.icu.body' },
  { icon: CalendarClock, titleKey: 'localization.formatting.title', bodyKey: 'localization.formatting.body' },
];

export function LocalizationSection({ t }: LocalizationSectionProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="localization-title"
      style={{ padding: '5rem 0' }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: 720, margin: '0 auto 3rem' }}>
          <ThemeIcon size={56} radius="md" variant="light" color="brand" style={{ margin: '0 auto 1.25rem' }}>
            <Languages size={28} />
          </ThemeIcon>
          <Title
            id="localization-title"
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}
          >
            {t('localization.title')}
          </Title>
          <Text size="lg" c="neutral.6">
            {t('localization.subtitle')}
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 2, xs: 3, md: 6 }} spacing="md" mb="3rem">
          {LOCALES.map((l: LocaleMeta) => (
            <Card
              key={l.code}
              padding="md"
              radius="md"
              withBorder
              shadow="sm"
              style={{
                textAlign: 'center',
                direction: l.direction,
              }}
            >
              <Text fw={700} size="md" style={{ color: '#1a1d27' }}>
                {l.nativeName}
              </Text>
              <Text size="xs" c="neutral.5" mt={4}>
                {l.englishName}
              </Text>
              <Text size="xs" c="neutral.4" mt={4}>
                {l.direction.toUpperCase()}
              </Text>
            </Card>
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.titleKey} padding="lg" radius="md" withBorder shadow="sm">
                <ThemeIcon
                  size={44}
                  radius="md"
                  variant="light"
                  color="brand"
                  style={{ marginBottom: '0.875rem' }}
                >
                  <Icon size={22} />
                </ThemeIcon>
                <Text fw={700} size="md" style={{ marginBottom: '0.5rem', color: '#1a1d27' }}>
                  {t(pillar.titleKey)}
                </Text>
                <Text size="sm" c="neutral.6" style={{ lineHeight: 1.55 }}>
                  {t(pillar.bodyKey)}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>

        {/* RTL demo card — shows the same string rendered in Arabic (RTL)
            and English (LTR) so visitors can see the layout flip. */}
        <Card
          padding="lg"
          radius="md"
          withBorder
          shadow="sm"
          style={{ marginTop: '2rem', maxWidth: 720, margin: '2rem auto 0' }}
        >
          <Stack gap="md">
            <Box>
              <Text size="xs" c="neutral.5" fw={600} mb={4}>AR (RTL)</Text>
              <Text
                size="md"
                dir="rtl"
                lang="ar"
                style={{ color: '#1a1d27', fontFamily: 'system-ui, sans-serif' }}
              >
                إدارة الوثائق الإلكترونية
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="neutral.5" fw={600} mb={4}>EN (LTR)</Text>
              <Text size="md" dir="ltr" lang="en" style={{ color: '#1a1d27' }}>
                Enterprise Document Management
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="neutral.5" fw={600} mb={4}>ICU plural — RU</Text>
              <Code block style={{ direction: 'ltr', textAlign: 'left' }}>
                {`{count, plural,
  one   {# документ}
  few   {# документа}
  many  {# документов}
  other {# документа}
}`}
              </Code>
            </Box>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}
