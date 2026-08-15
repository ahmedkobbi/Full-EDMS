/**
 * Tour checklist (spec §10.18).
 *
 * Renders an onboarding checklist for a tour. Each item shows:
 *  - A checkbox (read-only — completion is based on REAL backend state)
 *  - A localized label (via `t(item.labelKey)`)
 *  - A "completed" / "incomplete" status
 *  - An optional action button to launch a related tour
 *
 * Completion is NEVER faked (spec §10.16) — the backend resolves the
 * `completionResolverCode` and returns `completed: true/false`. The
 * client just displays the result.
 */
import { Stack, Group, Text, ThemeIcon, Button, Box, Progress } from '@mantine/core';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TourDefinitionId, TourChecklistItem } from '@smart-edms/types';
import { useTourChecklistQuery } from '../../api/hooks';

interface TourChecklistProps {
  readonly tourId: TourDefinitionId | string;
}

export function TourChecklist({ tourId }: TourChecklistProps) {
  const { t } = useTranslation();
  const query = useTourChecklistQuery(tourId as string);

  if (query.isLoading) {
    return (
      <Stack gap="sm">
        {[1, 2, 3].map((i) => (
          <Group key={i} gap="sm">
            <ThemeIcon variant="light" color="gray" size="sm" />
            <Text size="sm" c="dimmed">
              {t('common:status.loading')}
            </Text>
          </Group>
        ))}
      </Stack>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Text size="sm" c="dimmed">
        {t('common:error.title')}
      </Text>
    );
  }

  const items: TourChecklistItem[] = query.data;
  const completed = items.filter((i) => i.completed).length;
  const percent = items.length === 0 ? 0 : (completed / items.length) * 100;

  return (
    <Stack gap="md" data-tour="tour.checklist">
      <Group justify="space-between">
        <Stack gap={2}>
          <Text fw={600}>{t('tour.common:checklist.title')}</Text>
          <Text size="xs" c="dimmed">
            {t('tour.common:checklist.subtitle')}
          </Text>
        </Stack>
        <Text size="sm" c="dimmed" fw={500}>
          {t('tour.common:checklist.progress', { done: completed, total: items.length })}
        </Text>
      </Group>

      <Progress value={percent} size="sm" color="success" radius="md" />

      <Stack gap="xs">
        {items.map((item) => (
          <Group key={item.id} gap="sm" align="flex-start">
            <ThemeIcon
              variant={item.completed ? 'filled' : 'light'}
              color={item.completed ? 'success' : 'gray'}
              size="md"
              radius="xl"
            >
              {item.completed ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Circle size={10} aria-hidden="true" />
              )}
            </ThemeIcon>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text size="sm" c={item.completed ? 'dimmed' : undefined} td={item.completed ? 'line-through' : undefined}>
                {t(item.labelKey)}
              </Text>
              <Text size="xs" c="dimmed">
                {item.completed
                  ? t('tour.common:checklist.completed')
                  : t('tour.common:checklist.incomplete')}
              </Text>
            </Stack>
            {item.launchesTourId && !item.completed && (
              <Button
                variant="subtle"
                size="xs"
                rightSection={<ArrowRight size={12} aria-hidden="true" />}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('command-palette:start-tour', {
                      detail: { tourId: item.launchesTourId },
                    }),
                  );
                }}
              >
                {t('tour.common:button.takeTour')}
              </Button>
            )}
          </Group>
        ))}
      </Stack>

      <Box style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
        <Text size="xs" c="dimmed" ta="center">
          {t('tour.common:checklist.note', { defaultValue: 'Completion is based on your real activity.' })}
        </Text>
      </Box>
    </Stack>
  );
}
