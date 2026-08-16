/**
 * Offline activations page — review panel + recent pending requests list.
 */
import { Grid, Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { OfflineActivationReview, RecentOfflineRequests } from '../components/activations/OfflineActivationReview';

export function OfflineActivationsPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:offlineActivations.title"
        subtitleKey="admin:offlineActivations.subtitle"
        tour="admin.offlineActivations.page"
      />
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <OfflineActivationReview />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <RecentOfflineRequests />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
