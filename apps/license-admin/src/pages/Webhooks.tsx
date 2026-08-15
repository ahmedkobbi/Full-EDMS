/**
 * Webhooks page — table + create drawer.
 */
import { useState } from 'react';
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { WebhookTable } from '../components/webhooks/WebhookTable';
import { WebhookDrawer } from '../components/webhooks/WebhookDrawer';

export function WebhooksPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:webhooks.title"
        subtitleKey="admin:webhooks.subtitle"
        tour="admin.webhooks.page"
      />
      <WebhookTable onCreate={() => setDrawerOpen(true)} />
      <WebhookDrawer opened={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Stack>
  );
}
