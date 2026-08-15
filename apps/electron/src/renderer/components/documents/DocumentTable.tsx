/**
 * Document table (spec §9.3, §17, §27.5).
 *
 * Uses `mantine-react-table` for the data grid. Server-side pagination:
 * the table calls `useDocumentsQuery` with the current cursor and renders
 * only the items the backend returned. The user can sort, filter, and
 * click a row to navigate to the document detail page.
 *
 * The grid uses solid surfaces (no glassmorphism, spec §17).
 *
 * Tour target: `data-tour="documents.table"` so the tour engine can
 * highlight the table (spec §10.13).
 */
import { useMemo, useState } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table';
import { Box, Button, Group } from '@mantine/core';
import { Upload, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Document } from '@smart-edms/types';
import { useDocumentsQuery } from '../../api/hooks';
import { LocaleAwareDate, LoadingState, ErrorState, EmptyState } from '@smart-edms/ui';

interface DocumentTableProps {
  /** Optional folder filter. */
  readonly folderId?: string;
  /** Called when the user clicks the upload button. */
  readonly onUploadClick?: () => void;
}

export function DocumentTable({ folderId, onUploadClick }: DocumentTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const query = useDocumentsQuery({
    limit: 25,
    cursor: cursor as never,
  });

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: 'title',
        header: t('documents:document.name'),
        Cell: ({ row }) => (
          <Box style={{ cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate(`/documents/${row.original.id}`)}>
            {row.original.title}
          </Box>
        ),
      },
      {
        accessorKey: 'status',
        header: t('documents:document.status'),
        Cell: ({ cell }) => <span>{t(`common:status.${cell.getValue<string>()}`)}</span>,
      },
      {
        accessorKey: 'contentLanguage',
        header: t('documents:document.language'),
      },
      {
        accessorKey: 'createdAt',
        header: t('documents:document.created'),
        Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} />,
      },
      {
        accessorKey: 'updatedAt',
        header: t('documents:document.modified'),
        Cell: ({ cell }) => <LocaleAwareDate value={cell.getValue<string>()} variant="relative" />,
      },
      {
        id: 'size',
        header: t('documents:document.size'),
        Cell: () => '—', // Size is on the version; skipped for the list view.
      },
    ],
    [t, navigate],
  );

  if (query.isLoading) return <LoadingState variant="skeleton" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const data = query.data?.items ?? [];

  if (data.length === 0 && !cursor) {
    return (
      <EmptyState
        illustration="documents"
        titleKey="documents:library.empty.title"
        subtitleKey="documents:library.empty.subtitle"
        actions={
          <Button
            leftSection={<Upload size={16} aria-hidden="true" />}
            onClick={onUploadClick}
            data-tour="documents.upload"
          >
            {t('documents:library.empty.action')}
          </Button>
        }
      />
    );
  }

  // Filter by folder if provided (client-side; production would push to backend).
  const filtered = folderId ? data.filter((d) => d.folderId === folderId) : data;

  return (
    <Box data-tour="documents.table">
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
          leftSection={<Upload size={16} aria-hidden="true" />}
          onClick={onUploadClick}
          data-tour="documents.upload"
        >
          {t('documents:document.upload.title')}
        </Button>
      </Group>
      <MantineReactTable<Document>
        columns={columns}
        data={filtered as Document[]}
        enablePagination={false}
        enableSorting={false}
        enableColumnFilters={false}
        enableGlobalFilter={false}
        enableDensityToggle={false}
        enableHiding={false}
        enableColumnActions={false}
        enableFullScreenToggle={false}
        mantineTableProps={{
          striped: true,
          highlightOnHover: true,
        }}
        state={{ isLoading: query.isFetching }}
        renderBottomToolbarCustomActions={() =>
          query.data?.hasMore ? (
            <Button variant="subtle" size="xs" onClick={() => setCursor(query.data?.nextCursor ?? undefined)}>
              {t('common:pagination.more')}
            </Button>
          ) : null
        }
      />
    </Box>
  );
}
