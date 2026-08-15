/**
 * Smart EDMS marketing site — SecuritySection (spec §7.5, §12.11).
 *
 * Renders the six security pillars (audit log, MFA/SSO, DLP, encryption,
 * anomaly detection, offline licensing) plus an explicit "no fabricated
 * certifications" note.
 *
 * Per spec §12.11: NO fabricated compliance claims. We describe the
 * architecture, NOT third-party certifications we have not earned. The
 * `security.note` key makes this explicit so prospective customers know to
 * ask for the current attestation list rather than assuming SOC 2 / ISO 27001
 * based on marketing copy.
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
  Alert,
  Stack,
} from '@mantine/core';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Database,
  Activity,
  WifiOff,
  Info,
  type LucideIcon,
} from 'lucide-react';

interface SecuritySectionProps {
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface SecurityItem {
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly bodyKey: string;
}

const ITEMS: readonly SecurityItem[] = [
  { icon: ShieldCheck, titleKey: 'security.feature.audit.title', bodyKey: 'security.feature.audit.body' },
  { icon: KeyRound, titleKey: 'security.feature.mfa.title', bodyKey: 'security.feature.mfa.body' },
  { icon: Lock, titleKey: 'security.feature.dlp.title', bodyKey: 'security.feature.dlp.body' },
  { icon: Database, titleKey: 'security.feature.encryption.title', bodyKey: 'security.feature.encryption.body' },
  { icon: Activity, titleKey: 'security.feature.anomaly.title', bodyKey: 'security.feature.anomaly.body' },
  { icon: WifiOff, titleKey: 'security.feature.offline.title', bodyKey: 'security.feature.offline.body' },
];

export function SecuritySection({ t }: SecuritySectionProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="security-title"
      style={{ padding: '5rem 0', background: '#f7f8fa' }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: 720, margin: '0 auto 3rem' }}>
          <Title
            id="security-title"
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}
          >
            {t('security.title')}
          </Title>
          <Text size="lg" c="neutral.6">
            {t('security.subtitle')}
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
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

        <Alert
          icon={<Info size={18} />}
          color="brand"
          variant="light"
          radius="md"
          style={{ marginTop: '2rem', maxWidth: 880, margin: '2rem auto 0' }}
        >
          <Text size="sm" c="neutral.8" style={{ lineHeight: 1.6 }}>
            {t('security.note')}
          </Text>
        </Alert>

        <Stack gap="md" style={{ marginTop: '3rem', maxWidth: 880, margin: '3rem auto 0' }}>
          <Title order={3} ta="center" style={{ marginBottom: '0.5rem' }}>
            {t('compliance.title')}
          </Title>
          <Text size="md" c="neutral.6" ta="center" style={{ maxWidth: 640, margin: '0 auto 1.5rem' }}>
            {t('compliance.subtitle')}
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
            {([
              'gdpr',
              'hipaa',
              'eidas',
              'iso',
            ] as const).map((key) => (
              <Card key={key} padding="md" radius="md" withBorder>
                <Text fw={700} size="sm" style={{ marginBottom: '0.375rem', color: '#1a1d27' }}>
                  {t(`compliance.item.${key}.title`)}
                </Text>
                <Text size="xs" c="neutral.6" style={{ lineHeight: 1.5 }}>
                  {t(`compliance.item.${key}.body`)}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
          <Text size="sm" c="neutral.5" ta="center" mt="md">
            {t('compliance.note')}
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
