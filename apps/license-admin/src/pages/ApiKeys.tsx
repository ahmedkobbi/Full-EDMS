/**
 * API keys page — table + create modal.
 */
import { useState } from 'react';
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { ApiKeyTable } from '../components/api-keys/ApiKeyTable';
import { ApiKeyCreateModal } from '../components/api-keys/ApiKeyCreateModal';

export function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:apiKeys.title"
        subtitleKey="admin:apiKeys.subtitle"
        tour="admin.apiKeys.page"
      />
      <ApiKeyTable onCreate={() => setCreateOpen(true)} />
      <ApiKeyCreateModal opened={createOpen} onClose={() => setCreateOpen(false)} />
    </Stack>
  );
}
