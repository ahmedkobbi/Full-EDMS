/**
 * Not-found page (spec §17).
 *
 * Rendered for any unmatched route. Friendly, localized, with a CTA back
 * to the dashboard.
 */
import { Stack, Title, Text, Button, Container } from '@mantine/core';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="md" py="xl">
        <Title order={1} style={{ fontSize: '4rem', color: 'var(--mantine-color-dimmed)' }}>
          404
        </Title>
        <Title order={3}>{t('errors:notFound.title', { defaultValue: 'Page not found' })}</Title>
        <Text size="sm" c="dimmed" ta="center" maw={420}>
          {t('errors:notFound.body', { defaultValue: 'The page you are looking for does not exist.' })}
        </Text>
        <Button
          leftSection={<Home size={14} aria-hidden="true" />}
          onClick={() => navigate('/dashboard')}
        >
          {t('errors:notFound.backHome', { defaultValue: 'Back to dashboard' })}
        </Button>
      </Stack>
    </Container>
  );
}
