/**
 * Trials page — table + create modal.
 */
import { useState } from 'react';
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { TrialTable } from '../components/trials/TrialTable';
import { TrialCreateModal } from '../components/trials/TrialCreateModal';

export function TrialsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:trials.title"
        subtitleKey="admin:trials.subtitle"
        tour="admin.trials.page"
      />
      <TrialTable onCreate={() => setCreateOpen(true)} />
      <TrialCreateModal opened={createOpen} onClose={() => setCreateOpen(false)} />
    </Stack>
  );
}
