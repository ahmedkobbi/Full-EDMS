/**
 * Audit log table — server-side paginated. Filters by action, customerId,
 * and free-text search.
 *
 * The audit log is the licensing server's own log (distinct from the EDMS
 * audit log). It records every admin action — license issue, revoke, key
 * rotation, webhook test, API key creation, etc.
 *
 * Spec ref: §12.1 (license audit log), §21.7 (logging & monitoring),
 * §24.2 (compliance — audit log integrity verification).
 */
import { useEffect, useMemo, useState } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Alert, Badge, Box, Button, Group, Select, TextInput } from '@mantine/core';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LicenseAuditLog } from '@smart-edms/types';
import {
  useAuditLogsQuery,
  useAuditVerifyQuery,
} from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';

const ACTION_OPTIONS = [
  'customer.create',
  'customer.update',
  'customer.delete',
  'customer.contact.add',
  'product.create',
  'product.plan.create',
  'license.issue',
  'license.renew',
  'license.revoke',
  'activation.online',
  'activation.offline.intake',
  'activation.offline.issue',
  'activation.offline.reject',
  'trial.create',
  'trial.convert',
  'trial.cancel',
  'webhook.create',
  'webhook.delete',
  'webhook.replay',
  'signing-key.rotate',
];

interface AuditLogTableProps {
  readonly customerId?: string;
}

export function AuditLogTable({ customerId: customerIdProp }: AuditLogTableProps) {
  const { t } = useTranslation();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<readonly LicenseAuditLog[]>([]);
  const [action, setAction] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(customerIdProp ?? null);
  const [search, setSearch] = useState('');

  const query = useAuditLogsQuery({
    limit: 50,
    cursor,
    action: action ?? undefined,
    customerId: customerId ?? undefined,
  });
  const verifyQuery = useAuditVerifyQuery();

  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, [action, customerId, search]);

  const columns = useMemo<MRT_ColumnDef<LicenseAuditLog>[]>(() => [
    {
      accessorKey: 'occurredAt',
      header: t('audit:event.timestamp'),
      Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="datetime" />,
    },
    {
      accessorKey: 'actor',
      header: t('audit:event.actor'),
      Cell: ({ cell }) => (
        <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 }}>
          {cell.getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: t('audit:event.action'),
      Cell: ({ cell }) => <Badge size="sm" variant="light">{cell.getValue<string>()}</Badge>,
    },
    {
      accessorKey: 'customerId',
      header: t('audit:event.tenant'),
      Cell: ({ cell }) => {
        const v = cell.getValue<string | null>();
        return v ? (
          <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 }}>
            {v.slice(0, 8)}…
          </span>
        ) : '—';
      },
    },
    {
      accessorKey: 'licenseId',
      header: t('admin:licenses.column.licenseId'),
      Cell: ({ cell }) => {
        const v = cell.getValue<string | null>();
        return v ? (
          <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 }}>
            {v.slice(0, 8)}…
          </span>
        ) : '—';
      },
    },
    {
      accessorKey: 'ip',
      header: t('audit:event.ipAddress'),
      Cell: ({ cell }) => cell.getValue<string | null>() ?? '—',
    },
  ], [t]);

  if (query.isLoading && accumulated.length === 0) {
    return <LoadingState variant="skeleton" />;
  }
  if (query.isError && accumulated.length === 0) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const items = query.data?.items ?? [];
  const combined = cursor ? [...accumulated, ...items] : [...items];
  const filtered = search
    ? combined.filter(
        (l) =>
          l.actor.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          (l.ip ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : combined;

  if (filtered.length === 0 && !cursor && !action && !customerId && !search) {
    return (
      <EmptyState
        illustration="audit"
        titleKey="admin:audit.empty.title"
        subtitleKey="admin:audit.empty.subtitle"
      />
    );
  }

  return (
    <Box data-tour="admin.audit.table">
      {/* Hash-chain integrity verification banner */}
      {verifyQuery.data && (
        <Alert
          color={verifyQuery.data.ok ? 'success' : 'error'}
          variant="light"
          icon={<ShieldCheck size={16} />}
          mb="md"
        >
          {verifyQuery.data.ok
            ? t('admin:audit.verify.ok', { count: verifyQuery.data.checkedCount ?? 0 })
            : t('admin:audit.verify.broken', { sequence: verifyQuery.data.firstBrokenSequence ?? '?' })}
        </Alert>
      )}

      <Group justify="space-between" mb="sm" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <TextInput
            placeholder={t('common:action.search')}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<Search size={14} aria-hidden="true" />}
            w={240}
          />
          <Select
            placeholder={t('audit:log.filter.action')}
            data={ACTION_OPTIONS.map((a) => ({ value: a, label: a }))}
            value={action}
            onChange={setAction}
            clearable
            searchable
            w={220}
          />
          <TextInput
            placeholder={t('audit:log.filter.tenant')}
            value={customerId ?? ''}
            onChange={(e) => setCustomerId(e.currentTarget.value || null)}
            w={180}
          />
        </Group>
        <Button
          variant="light"
          leftSection={<RefreshCw size={14} aria-hidden="true" />}
          onClick={() => {
            setCursor(undefined);
            setAccumulated([]);
            void query.refetch();
          }}
          loading={query.isFetching}
        >
          {t('common:action.refresh')}
        </Button>
      </Group>
      <MantineReactTable<LicenseAuditLog>
        columns={columns}
        data={filtered}
        enablePagination={false}
        enableSorting={false}
        enableColumnFilters={false}
        enableGlobalFilter={false}
        enableDensityToggle={false}
        enableHiding={false}
        enableColumnActions={false}
        enableFullScreenToggle={false}
        mantineTableProps={{ striped: true, highlightOnHover: true }}
        state={{ isLoading: query.isFetching }}
        renderBottomToolbarCustomActions={() =>
          query.data?.hasMore ? (
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                if (query.data?.nextCursor) {
                  setAccumulated(combined);
                  setCursor(query.data.nextCursor);
                }
              }}
            >
              {t('common:pagination.more')}
            </Button>
          ) : null
        }
        renderDetailPanel={({ row }) => (
          <Box p="sm">
            <Group gap="md">
              <Box>
                <strong>{t('audit:event.userAgent')}:</strong> {row.original.userAgent ?? '—'}
              </Box>
              <Box>
                <strong>{t('audit:event.details')}:</strong>{' '}
                <pre style={{ margin: 0, fontSize: 12, maxWidth: 600, overflow: 'auto' }}>
                  {JSON.stringify(row.original.payload, null, 2)}
                </pre>
              </Box>
            </Group>
          </Box>
        )}
      />
    </Box>
  );
}
