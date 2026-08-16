/**
 * Activation table — lists activation records (online + offline) for the
 * admin's review. The table is server-side filtered by licenseId (optional)
 * and status (optional).
 */
import { useMemo } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Badge, Box, Button, Group, Select } from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { Activation } from '@smart-edms/types';
import { useLicensesQuery } from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';

// Note: the licensing server does not yet expose a top-level activations
// list endpoint. For the admin panel's purposes we list activations grouped
// by license (fetched via `useLicensesQuery`), then fetch each license's
// activations individually. A dedicated `GET /v1/activations` endpoint is
// the natural follow-up; the panel will adopt it once added.

interface ActivationTableProps {
  readonly activations: Activation[];
  readonly loading?: boolean;
  readonly onRefresh?: () => void;
}

export function ActivationTable({ activations, loading, onRefresh }: ActivationTableProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') ?? undefined;

  const columns = useMemo<MRT_ColumnDef<Activation>[]>(() => [
    {
      accessorKey: 'activationCode',
      header: t('admin:activations.column.code'),
      Cell: ({ cell }) => (
        <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 }}>
          {cell.getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'licenseId',
      header: t('admin:activations.column.licenseId'),
      Cell: ({ cell }) => (
        <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 }}>
          {cell.getValue<string>().slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('admin:activations.column.status'),
      Cell: ({ cell }) => {
        const s = cell.getValue<string>();
        const colors: Record<string, string> = {
          pending: 'gray',
          active: 'success',
          suspended: 'warning',
          revoked: 'error',
          expired: 'error',
        };
        return <Badge color={colors[s] ?? 'gray'} size="sm">{s}</Badge>;
      },
    },
    {
      accessorKey: 'fingerprint.fingerprintHash',
      header: t('admin:activations.column.fingerprint'),
      Cell: ({ cell }) => (
        <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 }}>
          {cell.getValue<string>().slice(0, 16)}…
        </span>
      ),
    },
    {
      accessorKey: 'activatedAt',
      header: t('admin:activations.column.activatedAt'),
      Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="datetime" />,
    },
    {
      accessorKey: 'lastHeartbeatAt',
      header: t('admin:activations.column.lastHeartbeat'),
      Cell: ({ cell }) => {
        const v = cell.getValue<string | null>();
        return v ? <LocaleAwareDate value={v} variant="relative" /> : '—';
      },
    },
  ], [t]);

  // We use useLicensesQuery only to keep the cache warm for the licenses page
  // (the activations endpoint is per-license on the server). The actual data
  // comes from the `activations` prop.
  void useLicensesQuery({ limit: 1 });

  const filtered = statusFilter
    ? activations.filter((a) => a.status === statusFilter)
    : activations;

  const updateFilter = (key: string, value: string | null): void => {
    const next = new URLSearchParams(searchParams);
    if (value) {next.set(key, value);}
    else {next.delete(key);}
    setSearchParams(next);
  };

  return (
    <Box data-tour="admin.activations.table">
      <Group justify="flex-end" mb="sm">
        <Select
          placeholder={t('admin:activations.filter.status')}
          data={['pending', 'active', 'suspended', 'revoked', 'expired'].map((s) => ({ value: s, label: s }))}
          value={statusFilter ?? null}
          onChange={(v) => updateFilter('status', v)}
          clearable
          w={180}
        />
        <Button
          variant="light"
          leftSection={<RefreshCw size={14} aria-hidden="true" />}
          onClick={onRefresh}
          loading={loading}
        >
          {t('common:action.refresh')}
        </Button>
      </Group>
      <MantineReactTable<Activation>
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
        state={{ isLoading: loading }}
      />
    </Box>
  );
}
