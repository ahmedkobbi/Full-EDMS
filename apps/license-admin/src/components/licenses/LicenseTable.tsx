/**
 * License table — server-side paginated. Supports filtering by customer,
 * product, status, and code (passed via the URL search params or props).
 *
 * Tour target: `data-tour="admin.licenses.table"`.
 */
import { useMemo, useState, useEffect } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Box, Button, Group, Badge, Select, TextInput } from '@mantine/core';
import { RefreshCw, Plus, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { License, LicenseStatus } from '@smart-edms/types';
import { useLicensesQuery, useProductsQuery, useCustomersQuery } from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';

const STATUS_OPTIONS: LicenseStatus[] = [
  'draft',
  'pending_activation',
  'active',
  'suspended',
  'revoked',
  'expired',
  'cancelled',
];

interface LicenseTableProps {
  readonly onCreate?: () => void;
  readonly customerId?: string;
  readonly productId?: string;
}

export function LicenseTable({ onCreate, customerId: customerIdProp, productId: productIdProp }: LicenseTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<readonly License[]>([]);

  const customerId = customerIdProp ?? searchParams.get('customerId') ?? undefined;
  const productId = productIdProp ?? searchParams.get('productId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const code = searchParams.get('code') ?? undefined;

  const productsQuery = useProductsQuery();
  const customersQuery = useCustomersQuery({ limit: 100 });
  const query = useLicensesQuery({
    limit: 25,
    cursor,
    customerId,
    productId,
    status,
    code,
  });

  // Reset accumulated list whenever filters change.
  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, [customerId, productId, status, code]);

  const columns = useMemo<MRT_ColumnDef<License>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('admin:licenses.column.licenseId'),
        Cell: ({ row }) => (
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<Key size={14} aria-hidden="true" />}
            onClick={() => navigate(`/licenses/${row.original.id}`)}
            style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}
          >
            {row.original.id.slice(0, 8)}
          </Button>
        ),
      },
      {
        id: 'customer',
        header: t('admin:licenses.column.customer'),
        Cell: ({ row }) => {
          const c = customersQuery.data?.items.find((cu) => cu.id === row.original.customerId);
          return c?.displayName ?? row.original.customerId.slice(0, 8);
        },
      },
      {
        id: 'product',
        header: t('admin:licenses.column.product'),
        Cell: ({ row }) => {
          const p = productsQuery.data?.find((pr) => pr.id === row.original.productId);
          return p?.name ?? row.original.productId.slice(0, 8);
        },
      },
      {
        accessorKey: 'type',
        header: t('admin:licenses.column.type'),
        Cell: ({ cell }) => (
          <Badge size="sm" variant="light">{cell.getValue<string>()}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: t('admin:licenses.column.status'),
        Cell: ({ cell }) => {
          const s = cell.getValue<LicenseStatus>();
          const color: Record<LicenseStatus, string> = {
            draft: 'gray',
            pending_activation: 'warning',
            active: 'success',
            suspended: 'warning',
            revoked: 'error',
            expired: 'error',
            cancelled: 'gray',
          };
          return <Badge color={color[s]} size="sm">{t(`admin:licenses.status.${s}`)}</Badge>;
        },
      },
      {
        accessorKey: 'expiresAt',
        header: t('admin:licenses.column.expiresAt'),
        Cell: ({ cell }) => {
          const v = cell.getValue<string | null>();
          return v ? <LocaleAwareDate value={v} variant="date" /> : <span>∞</span>;
        },
      },
      {
        accessorKey: 'issuedAt',
        header: t('admin:licenses.column.issuedAt'),
        Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="date" />,
      },
    ],
    [t, navigate, customersQuery.data, productsQuery.data],
  );

  if (query.isLoading && accumulated.length === 0) {
    return <LoadingState variant="skeleton" />;
  }
  if (query.isError && accumulated.length === 0) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const items = query.data?.items ?? [];
  const combined = cursor ? [...accumulated, ...items] : [...items];

  if (combined.length === 0 && !cursor) {
    return (
      <EmptyState
        illustration="licenses"
        titleKey="admin:licenses.empty.title"
        subtitleKey="admin:licenses.empty.subtitle"
        actions={
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={onCreate}
            data-tour="admin.licenses.create"
          >
            {t('admin:licenses.issue')}
          </Button>
        }
      />
    );
  }

  const updateFilter = (key: string, value: string | null): void => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <Box data-tour="admin.licenses.table">
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <Select
            placeholder={t('admin:licenses.filter.customer')}
            data={(customersQuery.data?.items ?? []).map((c) => ({ value: c.id, label: c.displayName }))}
            value={customerId ?? null}
            onChange={(v) => updateFilter('customerId', v)}
            searchable
            clearable
            w={220}
          />
          <Select
            placeholder={t('admin:licenses.filter.product')}
            data={(productsQuery.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
            value={productId ?? null}
            onChange={(v) => updateFilter('productId', v)}
            searchable
            clearable
            w={220}
          />
          <Select
            placeholder={t('admin:licenses.filter.status')}
            data={STATUS_OPTIONS.map((s) => ({ value: s, label: t(`admin:licenses.status.${s}`) }))}
            value={status ?? null}
            onChange={(v) => updateFilter('status', v)}
            clearable
            w={180}
          />
          <TextInput
            placeholder={t('admin:licenses.filter.code')}
            value={code ?? ''}
            onChange={(e) => updateFilter('code', e.currentTarget.value || null)}
            w={180}
          />
        </Group>
        <Group gap="sm">
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
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={onCreate}
            data-tour="admin.licenses.create"
          >
            {t('admin:licenses.issue')}
          </Button>
        </Group>
      </Group>
      <MantineReactTable<License>
        columns={columns}
        data={combined}
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
      />
    </Box>
  );
}
