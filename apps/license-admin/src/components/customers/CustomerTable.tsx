/**
 * Customer table — server-side paginated via mantine-react-table.
 *
 * Uses cursor-based pagination (the licensing server returns `nextCursor`).
 * The "Load more" affordance appends the next page to the local rows list
 * so the admin can scroll through long customer lists without losing
 * already-loaded rows.
 *
 * Tour target: `data-tour="admin.customers.table"`.
 */
import { useMemo, useState } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Box, Button, Group } from '@mantine/core';
import { RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '@smart-edms/types';
import { useCustomersQuery } from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';

interface CustomerTableProps {
  readonly onCreate?: () => void;
  readonly pageSize?: number;
}

export function CustomerTable({ onCreate, pageSize = 25 }: CustomerTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<readonly Customer[]>([]);

  const query = useCustomersQuery({ limit: pageSize, cursor });

  const columns = useMemo<MRT_ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'legalName',
        header: t('admin:customers.column.legalName'),
        Cell: ({ row }) => (
          <Box
            style={{ cursor: 'pointer', fontWeight: 500 }}
            onClick={() => navigate(`/customers/${row.original.id}`)}
          >
            {row.original.legalName}
          </Box>
        ),
      },
      {
        accessorKey: 'displayName',
        header: t('admin:customers.column.displayName'),
      },
      {
        accessorKey: 'industry',
        header: t('admin:customers.column.industry'),
        Cell: ({ cell }) => cell.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'website',
        header: t('admin:customers.column.website'),
        Cell: ({ cell }) => {
          const url = cell.getValue<string | null>();
          if (!url) return '—';
          return (
            <a href={url} target="_blank" rel="noreferrer noopener">
              {url} <ExternalLink size={12} aria-hidden="true" style={{ verticalAlign: 'middle' }} />
            </a>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('admin:customers.column.created'),
        Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="date" />,
      },
    ],
    [t, navigate],
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
        illustration="customers"
        titleKey="admin:customers.empty.title"
        subtitleKey="admin:customers.empty.subtitle"
        actions={
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={onCreate}
            data-tour="admin.customers.create"
          >
            {t('admin:customers.create')}
          </Button>
        }
      />
    );
  }

  return (
    <Box data-tour="admin.customers.table">
      <Group justify="flex-end" mb="sm">
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
          data-tour="admin.customers.create"
        >
          {t('admin:customers.create')}
        </Button>
      </Group>
      <MantineReactTable<Customer>
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
