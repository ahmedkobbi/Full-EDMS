'use client';

/**
 * Smart EDMS marketing site — FeatureTabs (interactive product tour) (spec §12.11).
 *
 * Interactive tabbed component shown on the homepage and /features page. Each
 * tab represents one of the nine Smart EDMS capabilities (Documents, Workflows,
 * Audit, Search, Classification, Retention, AI Assistant, Guided Tour, Scanner).
 *
 * The right panel shows a screenshot placeholder (gradient + icon) — there are
 * no real product screenshots yet, so this is a clearly-labelled placeholder
 * rather than a fabricated image.
 *
 * Client component because tabs require interactive state.
 */

import { useState, type ReactNode } from 'react';
import {
  Box,
  Container,
  Title,
  Text,
  Tabs,
  ThemeIcon,
  Stack,
} from '@mantine/core';
import {
  FileText,
  Workflow,
  ShieldCheck,
  Search,
  Tag,
  Archive,
  Bot,
  Compass,
  ScanLine,
  type LucideIcon,
} from 'lucide-react';

interface FeatureTabsProps {
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface TabItem {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly bodyKey: string;
  /** Gradient pair for the screenshot placeholder. */
  readonly gradient: readonly [string, string];
}

const TABS: readonly TabItem[] = [
  { id: 'documents', icon: FileText, titleKey: 'features.feature.documents.title', bodyKey: 'features.feature.documents.body', gradient: ['#2f6bff', '#1a1d27'] },
  { id: 'workflows', icon: Workflow, titleKey: 'features.feature.workflows.title', bodyKey: 'features.feature.workflows.body', gradient: ['#1ba34f', '#0e6631'] },
  { id: 'audit', icon: ShieldCheck, titleKey: 'features.feature.audit.title', bodyKey: 'features.feature.audit.body', gradient: ['#7aa3ff', '#1841b8'] },
  { id: 'search', icon: Search, titleKey: 'features.feature.search.title', bodyKey: 'features.feature.search.body', gradient: ['#f79010', '#a15600'] },
  { id: 'classification', icon: Tag, titleKey: 'features.feature.classification.title', bodyKey: 'features.feature.classification.body', gradient: ['#d12d2d', '#7f1a1a'] },
  { id: 'retention', icon: Archive, titleKey: 'features.feature.retention.title', bodyKey: 'features.feature.retention.body', gradient: ['#4b5363', '#1a1d27'] },
  { id: 'aiAssistant', icon: Bot, titleKey: 'features.feature.aiAssistant.title', bodyKey: 'features.feature.aiAssistant.body', gradient: ['#2f6bff', '#1f54e6'] },
  { id: 'guidedTour', icon: Compass, titleKey: 'features.feature.guidedTour.title', bodyKey: 'features.feature.guidedTour.body', gradient: ['#34bd6a', '#13843f'] },
  { id: 'scanner', icon: ScanLine, titleKey: 'features.feature.scanner.title', bodyKey: 'features.feature.scanner.body', gradient: ['#9aa1ae', '#4b5363'] },
];

export function FeatureTabs({ t }: FeatureTabsProps): ReactNode {
  const [active, setActive] = useState<string>('documents');
  const activeTab = TABS.find((tab) => tab.id === active) ?? TABS[0];
  const ActiveIcon = activeTab.icon;

  return (
    <Box
      component="section"
      aria-labelledby="feature-tabs-title"
      style={{ padding: '5rem 0', background: '#f7f8fa' }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: 720, margin: '0 auto 3rem' }}>
          <Title
            id="feature-tabs-title"
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}
          >
            {t('featureTabs.title')}
          </Title>
          <Text size="lg" c="neutral.6">
            {t('featureTabs.subtitle')}
          </Text>
        </Box>

        <Box style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem' }}>
          <Tabs value={active} onChange={(v) => v && setActive(v)} variant="pills" radius="md">
            <Tabs.List
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                justifyContent: 'center',
                marginBottom: '1.5rem',
              }}
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Tabs.Tab
                    key={tab.id}
                    value={tab.id}
                    leftSection={<Icon size={16} />}
                    style={{ fontWeight: 600 }}
                  >
                    {t(tab.titleKey)}
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>

            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: '1.5rem',
                alignItems: 'stretch',
              }}
            >
              <Stack gap="md" style={{ padding: '1rem' }}>
                <ThemeIcon size={56} radius="md" variant="light" color="brand">
                  <ActiveIcon size={28} />
                </ThemeIcon>
                <Title order={3} style={{ fontWeight: 700, color: '#1a1d27' }}>
                  {t(activeTab.titleKey)}
                </Title>
                <Text size="md" c="neutral.7" style={{ lineHeight: 1.65 }}>
                  {t(activeTab.bodyKey)}
                </Text>
              </Stack>

              <Box
                role="img"
                aria-label={t('featureTabs.screenshotPlaceholder')}
                style={{
                  borderRadius: '0.75rem',
                  minHeight: 320,
                  background: `linear-gradient(135deg, ${activeTab.gradient[0]} 0%, ${activeTab.gradient[1]} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Box style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.9)' }}>
                  <ActiveIcon size={64} strokeWidth={1.5} />
                  <Text size="sm" mt="sm" style={{ opacity: 0.85, fontWeight: 500 }}>
                    {t('featureTabs.screenshotPlaceholder')}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Tabs>
        </Box>
      </Container>
    </Box>
  );
}
