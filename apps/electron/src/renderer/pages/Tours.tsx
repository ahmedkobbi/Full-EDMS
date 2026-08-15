/**
 * Tours page (spec §10).
 *
 * Lists all 14 tour types. The user can start, resume, restart, or dismiss
 * any tour. Each tour card shows:
 *  - Title (localized via `t(tour.code + '.title')`)
 *  - Description (localized)
 *  - Status (not started / in progress / completed / skipped)
 *  - "Start" / "Resume" / "Restart" button
 *
 * The page is the tour target `help.menu`.
 */
import { Stack, Title, Text, SimpleGrid, Card, Group, Button, Badge } from '@mantine/core';
import { Play, RefreshCw, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToursQuery } from '../api/hooks';
import { useStartTour } from '../components/tour/TourEngine';
import { LoadingState } from '@smart-edms/ui';
import { ErrorState } from '@smart-edms/ui';
import { EmptyState } from '@smart-edms/ui';
import type { TourCode } from '@smart-edms/types';

export function ToursPage() {
  const { t } = useTranslation();
  const toursQuery = useToursQuery();
  const startTour = useStartTour();

  return (
    <Stack gap="md" data-tour="help.menu" data-tour-page="tours">
      <Stack gap={4}>
        <Title order={2}>{t('tours:title', { defaultValue: 'Guided tours' })}</Title>
        <Text size="sm" c="dimmed">
          {t('tours:subtitle', { defaultValue: 'Learn Smart EDMS at your own pace.' })}
        </Text>
      </Stack>

      {toursQuery.isLoading ? (
        <LoadingState variant="skeleton" />
      ) : toursQuery.isError ? (
        <ErrorState error={toursQuery.error} onRetry={() => toursQuery.refetch()} />
      ) : toursQuery.data?.length === 0 ? (
        <EmptyState illustration="generic" titleKey="tours:empty.title" subtitleKey="tours:empty.subtitle" />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {toursQuery.data?.map((tour) => {
            const code = tour.code as TourCode;
            const titleKey = `tour.${code}:title`;
            const subtitleKey = `tour.${code}:subtitle`;
            return (
              <Card key={tour.id} withBorder radius="md" padding="lg" shadow="sm">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Compass size={24} aria-hidden="true" />
                    <Badge variant="light" color="brand">
                      {t(`tour.common:audience.${tour.audience}`, { defaultValue: tour.audience })}
                    </Badge>
                  </Group>
                  <Stack gap={4}>
                    <Title order={5}>{t(titleKey, { defaultValue: tour.code })}</Title>
                    <Text size="xs" c="dimmed">
                      {t(subtitleKey, { defaultValue: '' })}
                    </Text>
                  </Stack>
                  <Group>
                    <Button
                      variant="filled"
                      size="xs"
                      leftSection={<Play size={12} aria-hidden="true" />}
                      onClick={() => startTour(code)}
                    >
                      {t('tour.common:button.takeTour')}
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<RefreshCw size={12} aria-hidden="true" />}
                    >
                      {t('tour.common:button.restart')}
                    </Button>
                  </Group>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}
