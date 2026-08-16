'use client';

/**
 * Smart EDMS marketing site — FAQ section (spec §7.5).
 *
 * Six question/answer pairs covering deployment, languages, offline
 * licensing, AI safety, customer-managed keys, and demo/trial requests.
 *
 * Client component because the accordion requires interactive state.
 */

import { type ReactNode } from 'react';
import { Accordion, Box, Container, Stack, Text, Title } from '@mantine/core';

interface FAQProps {
  readonly t: (key: string, opts?: Record<string, unknown>) => string;
}

const QUESTION_KEYS = ['faq.q1', 'faq.q2', 'faq.q3', 'faq.q4', 'faq.q5', 'faq.q6'] as const;

export function FAQ({ t }: FAQProps): ReactNode {
  return (
    <Box
      component="section"
      aria-labelledby="faq-title"
      style={{ padding: '5rem 0', background: '#f7f8fa' }}
    >
      <Container size="md" px={{ base: 'md', md: 'lg' }}>
        <Stack align="center" gap="md" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Title
            id="faq-title"
            order={2}
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 700 }}
          >
            {t('faq.title')}
          </Title>
          <Text size="lg" c="neutral.6" style={{ maxWidth: 640 }}>
            {t('faq.subtitle')}
          </Text>
        </Stack>

        <Accordion variant="separated" radius="md" chevronPosition="right">
          {QUESTION_KEYS.map((key) => (
            <Accordion.Item key={key} value={key}>
              <Accordion.Control style={{ fontWeight: 600, color: '#1a1d27' }}>
                {t(`${key}.q`)}
              </Accordion.Control>
              <Accordion.Panel style={{ color: '#4b5363', lineHeight: 1.65 }}>
                {t(`${key}.a`)}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>
    </Box>
  );
}
