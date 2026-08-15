/**
 * Audit logs page.
 */
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { AuditLogTable } from '../components/audit/AuditLogTable';

export function AuditLogsPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:audit.title"
        subtitleKey="admin:audit.subtitle"
        tour="admin.audit.page"
      />
      <AuditLogTable />
    </Stack>
  );
}
