/**
 * Smart EDMS marketing site — Stats section (spec §12.11).
 *
 * Per the spec: NO fake metrics, NO fake customer counts, NO fabricated
 * testimonials. This section is repositioned as architectural promises —
 * four pillars of what the platform is built to deliver, not numbers we
 * cannot substantiate.
 *
 * Title: "Backed by enterprise-grade architecture"
 * Subtitle: "Designed for regulated industries that require auditability,
 *            provenance, and reliability at every layer."
 *
 * The four cards describe: tamper-evident audit, provable provenance,
 * offline-first licensing, and six-language support — all verifiable product
 * capabilities, not vanity metrics.
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
  FileCheck2,
  Languages,
  type LucideIcon,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';

interface StatsProps {
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface StatItem {
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly bodyKey: string;
}

const ITEMS: readonly StatItem[] = [
  { icon: ShieldCheck, titleKey: 'stats.item.audit.title', bodyKey: 'stats.item.audit.body' },
  { icon: FileCheck2, titleKey: 'stats.item.provenance.title', bodyKey: 'stats.item.provenance.body' },
  { icon: WifiOff, titleKey: 'stats.item.offline.title', bodyKey: 'stats.item.offline.body' },
  { icon: Languages, titleKey: 'stats.item.multilingual.title', bodyKey: 'stats.item.multilingual.body' },
];

export function Stats({ t }: StatsProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="stats-title"
      style={{ padding: '5rem 0', background: '#f7f8fa' }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: 720, margin: '0 auto 3rem' }}>
          <Title
            id="stats-title"
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}
          >
            {t('stats.enterprise.title')}
          </Title>
          <Text size="lg" c="neutral.6">
            {t('stats.enterprise.subtitle')}
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="lg">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.titleKey} padding="lg" radius="md" withBorder shadow="sm">
                <ThemeIcon
                  size={48}
                  radius="md"
                  variant="light"
                  color="brand"
                  style={{ marginBottom: '1rem' }}
                >
                  <Icon size={24} />
                </ThemeIcon>
                <Text fw={700} size="md" style={{ marginBottom: '0.5rem', color: '#1a1d27' }}>
                  {t(item.titleKey)}
                </Text>
                <Text size="sm" c="neutral.6" style={{ lineHeight: 1.55 }}>
                  {t(item.bodyKey)}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
