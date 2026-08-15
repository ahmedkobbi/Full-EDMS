/**
 * Product table — server-side paginated via mantine-react-table.
 *
 * The licensing server's `GET /v1/products` returns the full list (no
 * pagination) so we render with `enablePagination={false}` and let the
 * admin scroll. Each row expands to show the product's plans via the
 * `PlanEditor` component.
 */
import { useMemo, useState } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Box, Button, Group, Accordion, Text } from '@mantine/core';
import { RefreshCw, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Product } from '@smart-edms/types';
import { useProductsQuery } from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';
import { PlanEditor } from './PlanEditor';

interface ProductTableProps {
  readonly onCreate?: () => void;
}

export function ProductTable({ onCreate }: ProductTableProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const query = useProductsQuery();

  const columns = useMemo<MRT_ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('admin:products.column.code'),
        Cell: ({ cell }) => (
          <Text fw={600} style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
            {cell.getValue<string>()}
          </Text>
        ),
      },
      {
        accessorKey: 'name',
        header: t('admin:products.column.name'),
      },
      {
        accessorKey: 'version',
        header: t('admin:products.column.version'),
      },
      {
        accessorKey: 'description',
        header: t('admin:products.column.description'),
        Cell: ({ cell }) => cell.getValue<string | null>() ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: t('admin:products.column.created'),
        Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="date" />,
      },
    ],
    [t],
  );

  if (query.isLoading) return <LoadingState variant="skeleton" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const data = query.data ?? [];

  if (data.length === 0) {
    return (
      <EmptyState
        illustration="products"
        titleKey="admin:products.empty.title"
        subtitleKey="admin:products.empty.subtitle"
        actions={
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={onCreate}
            data-tour="admin.products.create"
          >
            {t('admin:products.create')}
          </Button>
        }
      />
    );
  }

  return (
    <Box data-tour="admin.products.table">
      <Group justify="flex-end" mb="sm">
        <Button
          variant="light"
          leftSection={<RefreshCw size={14} aria-hidden="true" />}
          onClick={() => query.refetch()}
          loading={query.isFetching}
        >
          {t('common:action.refresh')}
        </Button>
        <Button
          leftSection={<Plus size={16} aria-hidden="true" />}
          onClick={onCreate}
          data-tour="admin.products.create"
        >
          {t('admin:products.create')}
        </Button>
      </Group>
      <MantineReactTable<Product>
        columns={columns}
        data={data}
        enablePagination={false}
        enableSorting={false}
        enableColumnFilters={false}
        enableGlobalFilter={false}
        enableDensityToggle={false}
        enableHiding={false}
        enableColumnActions={false}
        enableFullScreenToggle={false}
        enableExpanding
        state={{ isLoading: query.isFetching, expanded: expandedId ? { [expandedId]: true } : {} }}
        onExpandedChange={(updater) => {
          if (typeof updater === 'function') {
            const next = updater(expandedId ? { [expandedId]: true } : {});
            const keys = Object.keys(next);
            setExpandedId(keys.length > 0 ? keys[0] : null);
          }
        }}
        mantineTableProps={{ striped: true, highlightOnHover: true }}
        renderDetailPanel={({ row }) => (
          <Box p="sm">
            <PlanEditor productId={row.original.id} />
          </Box>
        )}
      />
      <Accordion chevronPosition="right" variant="separated" mt="md">
        <Accordion.Item value="help">
          <Accordion.Control>{t('admin:products.help.title')}</Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" c="dimmed">
              {t('admin:products.help.body')}
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
}
