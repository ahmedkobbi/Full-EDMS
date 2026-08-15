/**
 * Smart EDMS marketing site — Pricing section (spec §7.5, §12.11).
 *
 * Three tiers: Team, Business, Enterprise. Per spec, NO invented prices —
 * all tiers display "Custom" with a "Contact sales" CTA. The `pricing.disclaimer`
 * makes it explicit that final pricing depends on deployment model, user count,
 * storage, and support level.
 *
 * The legacy `pricing.starter.*` keys (with the fabricated $499) and
 * `pricing.business.price` ($1,499) are intentionally NOT rendered.
 */

import { type ReactNode } from 'react';
import {
  Box,
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Button,
  List,
  ThemeIcon,
  Stack,
  Badge,
} from '@mantine/core';
import { Check } from 'lucide-react';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { LocaleLink } from '../common/LocaleLink';

interface PricingProps {
  readonly locale: MandatoryLocaleCode;
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

interface Tier {
  readonly id: 'team' | 'business' | 'enterprise';
  readonly nameKey: string;
  readonly priceKey: string;
  readonly descriptionKey: string;
  readonly featuresKey: string;
  readonly ctaKey: string;
  readonly featured?: boolean;
}

const TIERS: readonly Tier[] = [
  {
    id: 'team',
    nameKey: 'pricing.team.name',
    priceKey: 'pricing.team.price',
    descriptionKey: 'pricing.team.description',
    featuresKey: 'pricing.team.features',
    ctaKey: 'pricing.team.cta',
  },
  {
    id: 'business',
    nameKey: 'pricing.business.name',
    priceKey: 'pricing.business.startingFrom',
    descriptionKey: 'pricing.business.description',
    featuresKey: 'pricing.business.features',
    ctaKey: 'pricing.business.cta',
    featured: true,
  },
  {
    id: 'enterprise',
    nameKey: 'pricing.enterprise.name',
    priceKey: 'pricing.enterprise.price',
    descriptionKey: 'pricing.enterprise.description',
    featuresKey: 'pricing.enterprise.features',
    ctaKey: 'pricing.enterprise.cta',
  },
];

export function Pricing({ locale, t }: PricingProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="pricing-title"
      style={{ padding: '5rem 0' }}
    >
      <Container size="lg" px={{ base: 'md', md: 'lg' }}>
        <Box style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: 720, margin: '0 auto 3rem' }}>
          <Title
            id="pricing-title"
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}
          >
            {t('pricing.title')}
          </Title>
          <Text size="lg" c="neutral.6">
            {t('pricing.subtitle')}
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {TIERS.map((tier) => {
            const features = t(tier.featuresKey).split('|').filter(Boolean);
            return (
              <Card
                key={tier.id}
                padding="xl"
                radius="md"
                withBorder
                shadow={tier.featured ? 'lg' : 'sm'}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderColor: tier.featured ? '#2f6bff' : undefined,
                  borderWidth: tier.featured ? 2 : 1,
                  position: 'relative',
                }}
              >
                {tier.featured && (
                  <Badge
                    color="brand"
                    variant="filled"
                    radius="sm"
                    style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}
                  >
                    {t('pricing.business.name')}
                  </Badge>
                )}

                <Stack gap="sm" style={{ marginBottom: '1.5rem' }}>
                  <Text fw={700} size="lg" style={{ color: '#1a1d27' }}>
                    {t(tier.nameKey)}
                  </Text>
                  <Text size="sm" c="neutral.6" style={{ lineHeight: 1.5, minHeight: '2.5em' }}>
                    {t(tier.descriptionKey)}
                  </Text>
                  <Box style={{ marginTop: '0.5rem' }}>
                    <Text fw={800} size="xl" style={{ color: '#1a1d27', lineHeight: 1.2 }}>
                      {t(tier.priceKey)}
                    </Text>
                  </Box>
                </Stack>

                <List
                  spacing="xs"
                  size="sm"
                  center
                  style={{ flex: 1, marginBottom: '1.5rem' }}
                  listStyleType="none"
                >
                  {features.map((feature, i) => (
                    <List.Item
                      key={i}
                      icon={
                        <ThemeIcon color="brand" variant="light" size={20} radius="xl">
                          <Check size={12} />
                        </ThemeIcon>
                      }
                      style={{ paddingLeft: 0, color: '#4b5363', lineHeight: 1.5 }}
                    >
                      {feature}
                    </List.Item>
                  ))}
                </List>

                <Button
                  component={LocaleLink}
                  href="/demo"
                  locale={locale}
                  variant={tier.featured ? 'filled' : 'outline'}
                  color="brand"
                  fullWidth
                >
                  {t(tier.ctaKey)}
                </Button>
              </Card>
            );
          })}
        </SimpleGrid>

        <Text size="sm" c="neutral.5" ta="center" mt="xl" style={{ maxWidth: 720, margin: '1.5rem auto 0' }}>
          {t('pricing.disclaimer')}
        </Text>
        <Text size="xs" c="neutral.5" ta="center" mt="sm">
          {t('pricing.note')}
        </Text>
      </Container>
    </Box>
  );
}
