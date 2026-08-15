/**
 * Licenses page — table + issue modal.
 */
import { useState } from 'react';
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { LicenseTable } from '../components/licenses/LicenseTable';
import { LicenseIssueModal } from '../components/licenses/LicenseIssueModal';

export function LicensesPage() {
  const [issueOpen, setIssueOpen] = useState(false);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:licenses.title"
        subtitleKey="admin:licenses.subtitle"
        tour="admin.licenses.page"
      />
      <LicenseTable onCreate={() => setIssueOpen(true)} />
      <LicenseIssueModal opened={issueOpen} onClose={() => setIssueOpen(false)} />
    </Stack>
  );
}
