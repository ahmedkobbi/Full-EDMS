/**
 * Smart EDMS marketing site — FeatureGrid section (spec §7.5, §12.11).
 *
 * Renders the nine mandatory product features from spec §12.11:
 *   Documents, Workflows, Audit, Search, Classification, Retention,
 *   AI Assistant, Guided Tour, Scanner.
 *
 * Each feature has a translated title + body. Icons come from lucide-react.
 * Server component — no client state.
 */

import { type ReactNode } from 'react';
import {
  Box,
  Card,
  Container,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  Archive,
  Bot,
  Compass,
  FileText,
  type LucideIcon,
  ScanLine,
  Search,
  ShieldCheck,
  Tag,
  Workflow,
} from 'lucide-react';

interface FeatureGridProps {
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface FeatureItem {
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly bodyKey: string;
}

const FEATURES: readonly FeatureItem[] = [
  { icon: FileText, titleKey: 'features.feature.documents.title', bodyKey: 'features.feature.documents.body' },
  { icon: Workflow, titleKey: 'features.feature.workflows.title', bodyKey: 'features.feature.workflows.body' },
  { icon: ShieldCheck, titleKey: 'features.feature.audit.title', bodyKey: 'features.feature.audit.body' },
  { icon: Search, titleKey: 'features.feature.search.title', bodyKey: 'features.feature.search.body' },
  { icon: Tag, titleKey: 'features.feature.classification.title', bodyKey: 'features.feature.classification.body' },
  { icon: Archive, titleKey: 'features.feature.retention.title', bodyKey: 'features.feature.retention.body' },
  { icon: Bot, titleKey: 'features.feature.aiAssistant.title', bodyKey: 'features.feature.aiAssistant.body' },
  { icon: Compass, titleKey: 'features.feature.guidedTour.title', bodyKey: 'features.feature.guidedTour.body' },
  { icon: ScanLine, titleKey: 'features.feature.scanner.title', bodyKey: 'features.feature.scanner.body' },
];

export function FeatureGrid({ t }: FeatureGridProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="features-title"
      style={{ padding: '5rem 0' }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: 720, margin: '0 auto 3rem' }}>
          <Title
            id="features-title"
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}
          >
            {t('features.title')}
          </Title>
          <Text size="lg" c="neutral.6">
            {t('features.subtitle')}
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.titleKey}
                padding="xl"
                radius="md"
                withBorder
                shadow="sm"
                style={{ height: '100%' }}
              >
                <ThemeIcon
                  size={52}
                  radius="md"
                  variant="light"
                  color="brand"
                  style={{ marginBottom: '1.25rem' }}
                >
                  <Icon size={26} />
                </ThemeIcon>
                <Text
                  fw={700}
                  size="lg"
                  component="h3"
                  style={{ marginBottom: '0.625rem', color: '#1a1d27' }}
                >
                  {t(feature.titleKey)}
                </Text>
                <Text size="sm" c="neutral.6" style={{ lineHeight: 1.6 }}>
                  {t(feature.bodyKey)}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
