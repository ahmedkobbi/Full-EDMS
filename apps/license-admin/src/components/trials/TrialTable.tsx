/**
 * Trial table — lists trials. Supports filtering by customer + status.
 */
import { useMemo } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Box, Button, Group, Badge, Select } from '@mantine/core';
import { RefreshCw, Plus, Repeat, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { Trial } from '@smart-edms/types';
import { useTrialsQuery, useConvertTrialMutation, useCancelTrialMutation } from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';

interface TrialTableProps {
  readonly onCreate?: () => void;
  readonly customerId?: string;
}

export function TrialTable({ onCreate, customerId: customerIdProp }: TrialTableProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const customerId = customerIdProp ?? searchParams.get('customerId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const query = useTrialsQuery({ customerId, status, limit: 50 });
  const convertMutation = useConvertTrialMutation();
  const cancelMutation = useCancelTrialMutation();

  const columns = useMemo<MRT_ColumnDef<Trial>[]>(() => [
    {
      accessorKey: 'id',
      header: t('admin:trials.column.id'),
      Cell: ({ cell }) => (
        <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 }}>
          {cell.getValue<string>().slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: 'customerId',
      header: t('admin:trials.column.customer'),
      Cell: ({ cell }) => (
        <span style={{ fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 }}>
          {cell.getValue<string>().slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: 'startedAt',
      header: t('admin:trials.column.started'),
      Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="date" />,
    },
    {
      accessorKey: 'endsAt',
      header: t('admin:trials.column.ends'),
      Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="date" />,
    },
    {
      id: 'status',
      header: t('admin:trials.column.status'),
      Cell: ({ row }) => {
        const now = Date.now();
        const ends = new Date(row.original.endsAt).getTime();
        if (row.original.convertedToLicenseId) {
          return <Badge color="success" size="sm">{t('admin:trials.status.converted')}</Badge>;
        }
        if (ends < now) {
          return <Badge color="error" size="sm">{t('admin:trials.status.expired')}</Badge>;
        }
        return <Badge color="success" size="sm">{t('admin:trials.status.active')}</Badge>;
      },
    },
    {
      id: 'actions',
      header: t('common:label.actions'),
      Cell: ({ row }) => (
        <Group gap="xs">
          {!row.original.convertedToLicenseId && (
            <>
              <Button
                size="xs"
                variant="light"
                leftSection={<Repeat size={12} aria-hidden="true" />}
                onClick={() => {
                  const planId = window.prompt(t('admin:trials.convert.planPrompt'));
                  if (planId) {
                    void convertMutation.mutateAsync({
                      id: row.original.id,
                      planId,
                      type: 'subscription',
                    });
                  }
                }}
                loading={convertMutation.isPending}
              >
                {t('admin:trials.convert.title')}
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="error"
                leftSection={<Ban size={12} aria-hidden="true" />}
                onClick={() => {
                  if (window.confirm(t('admin:trials.cancel.confirm'))) {
                    void cancelMutation.mutateAsync(row.original.id);
                  }
                }}
                loading={cancelMutation.isPending}
              >
                {t('admin:trials.cancel.title')}
              </Button>
            </>
          )}
        </Group>
      ),
    },
  ], [t, convertMutation, cancelMutation]);

  if (query.isLoading) return <LoadingState variant="skeleton" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const data = query.data ?? [];

  if (data.length === 0) {
    return (
      <EmptyState
        illustration="trials"
        titleKey="admin:trials.empty.title"
        subtitleKey="admin:trials.empty.subtitle"
        actions={
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={onCreate}
            data-tour="admin.trials.create"
          >
            {t('admin:trials.create')}
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
    <Box data-tour="admin.trials.table">
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Group gap="sm">
          <Select
            placeholder={t('admin:trials.filter.status')}
            data={['active', 'expired', 'converted'].map((s) => ({ value: s, label: t(`admin:trials.status.${s}`) }))}
            value={status ?? null}
            onChange={(v) => updateFilter('status', v)}
            clearable
            w={180}
          />
        </Group>
        <Group gap="sm">
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
            data-tour="admin.trials.create"
          >
            {t('admin:trials.create')}
          </Button>
        </Group>
      </Group>
      <MantineReactTable<Trial>
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
        mantineTableProps={{ striped: true, highlightOnHover: true }}
        state={{ isLoading: query.isFetching }}
      />
    </Box>
  );
}
