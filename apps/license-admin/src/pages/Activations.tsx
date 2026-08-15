/**
 * Activations page — table of activations.
 *
 * Note: the licensing server exposes activations per-license (no global
 * list endpoint). The page fetches the most recent licenses and aggregates
 * their activations client-side for display. A dedicated `GET /v1/activations`
 * endpoint is the natural follow-up.
 */
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { ActivationTable } from '../components/activations/ActivationTable';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useLicensesQuery, useLicenseActivationsQuery } from '../api/hooks';

export function ActivationsPage() {
  const licensesQuery = useLicensesQuery({ limit: 25 });
  const licenseIds = (licensesQuery.data?.items ?? []).slice(0, 10).map((l) => l.id);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:activations.title"
        subtitleKey="admin:activations.subtitle"
        tour="admin.activations.page"
      />
      {licensesQuery.isLoading ? (
        <LoadingState variant="skeleton" />
      ) : licenseIds.length === 0 ? (
        <EmptyState
          illustration="activations"
          titleKey="admin:activations.empty.title"
          subtitleKey="admin:activations.empty.subtitle"
        />
      ) : (
        <Stack gap="md">
          {licenseIds.map((id) => (
            <ActivationsForLicense key={id} licenseId={id} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function ActivationsForLicense({ licenseId }: { readonly licenseId: string }) {
  const query = useLicenseActivationsQuery(licenseId);
  if (!query.data || query.data.length === 0) return null;
  return (
    <ActivationTable
      activations={query.data}
      loading={query.isFetching}
      onRefresh={() => query.refetch()}
    />
  );
}
