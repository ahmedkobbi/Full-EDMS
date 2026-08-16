/**
 * License detail page — fetches a license by id and renders LicenseDetail.
 */
import { Button, Skeleton, Stack } from '@mantine/core';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useLicenseQuery } from '../api/hooks';
import { PageHeader } from '../components/common/PageHeader';
import { LicenseDetail } from '../components/licenses/LicenseDetail';
import { LicenseIssueModal } from '../components/licenses/LicenseIssueModal';
import { ErrorState } from '@smart-edms/ui';

export function LicenseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issueOpen, setIssueOpen] = useState(false);
  const query = useLicenseQuery(id);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:licenses.detail.title"
        subtitleKey="admin:licenses.detail.subtitle"
        actions={
          <>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={14} aria-hidden="true" />}
              onClick={() => navigate('/licenses')}
            >
              {t('common:action.back')}
            </Button>
            <Button
              variant="light"
              leftSection={<Plus size={14} aria-hidden="true" />}
              onClick={() => setIssueOpen(true)}
            >
              {t('admin:licenses.issue')}
            </Button>
          </>
        }
      />
      {query.isLoading && <Skeleton height={300} radius="md" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {query.data && <LicenseDetail license={query.data} />}
      <LicenseIssueModal opened={issueOpen} onClose={() => setIssueOpen(false)} />
    </Stack>
  );
}
