/**
 * Customer detail page — fetches by id, renders CustomerDetail, with an
 * "edit" affordance that opens the drawer.
 */
import { useState } from 'react';
import { Stack, Button, Skeleton } from '@mantine/core';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustomerQuery } from '../api/hooks';
import { PageHeader } from '../components/common/PageHeader';
import { CustomerDetail } from '../components/customers/CustomerDetail';
import { CustomerDrawer } from '../components/customers/CustomerDrawer';
import { ErrorState } from '@smart-edms/ui';

export function CustomerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const query = useCustomerQuery(id);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:customers.detail.title"
        subtitleKey="admin:customers.detail.subtitle"
        actions={
          <>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={14} aria-hidden="true" />}
              onClick={() => navigate('/customers')}
            >
              {t('common:action.back')}
            </Button>
            <Button
              leftSection={<Pencil size={14} aria-hidden="true" />}
              onClick={() => setEditOpen(true)}
              data-tour="admin.customers.edit"
            >
              {t('common:action.edit')}
            </Button>
          </>
        }
      />
      {query.isLoading && <Skeleton height={200} radius="md" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.data && (
        <>
          <CustomerDetail customer={query.data} />
          <CustomerDrawer
            opened={editOpen}
            onClose={() => setEditOpen(false)}
            customer={query.data}
          />
        </>
      )}
    </Stack>
  );
}
