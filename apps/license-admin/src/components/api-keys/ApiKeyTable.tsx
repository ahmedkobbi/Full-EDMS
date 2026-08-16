/**
 * API key table — lists API keys for a customer. The raw key is shown ONLY
 * once on creation (via the ApiKeyCreateModal); after creation only the
 * key prefix is displayed.
 *
 * Revoking an API key requires step-up authentication.
 */
import {
  Badge,
  Box,
  Button,
  Code,
  Group,
  Table,
} from '@mantine/core';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import {
  useApiKeysQuery,
  useRevokeApiKeyMutation,
} from '../../api/hooks';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { useStepUp } from '../common/StepUpProvider';

interface ApiKeyTableProps {
  readonly onCreate?: () => void;
  readonly customerId?: string;
}

export function ApiKeyTable({ onCreate, customerId: customerIdProp }: ApiKeyTableProps) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const customerId = customerIdProp ?? searchParams.get('customerId') ?? '';

  const query = useApiKeysQuery(customerId || undefined);
  const revokeMutation = useRevokeApiKeyMutation();
  const { requestStepUp } = useStepUp();

  if (!customerId) {
    return (
      <EmptyState
        illustration="apiKeys"
        titleKey="admin:apiKeys.empty.title"
        subtitleKey="admin:apiKeys.empty.selectCustomer"
      />
    );
  }

  if (query.isLoading) {return <LoadingState variant="skeleton" />;}
  if (query.isError) {return <ErrorState error={query.error} onRetry={() => query.refetch()} />;}

  const keys = query.data ?? [];

  if (keys.length === 0) {
    return (
      <EmptyState
        illustration="apiKeys"
        titleKey="admin:apiKeys.empty.title"
        subtitleKey="admin:apiKeys.empty.subtitle"
        actions={
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={onCreate}
            data-tour="admin.apiKeys.create"
          >
            {t('admin:apiKeys.create')}
          </Button>
        }
      />
    );
  }

  const handleRevoke = (id: string): void => {
    if (!window.confirm(t('admin:apiKeys.revoke.confirm'))) {return;}
    // Step-up auth required for API key revocation.
    requestStepUp(
      async () => {
        try {
          await revokeMutation.mutateAsync({ id, customerId });
          notifications.show({
            title: t('common:toast.success.title'),
            message: t('common:toast.deleted'),
            color: 'success',
          });
        } catch {
          // Error surfaced by the API client.
        }
      },
      {
        titleKey: 'admin:stepUp.revokeApiKey.title',
        descriptionKey: 'admin:stepUp.revokeApiKey.subtitle',
      },
    );
  };

  return (
    <Box data-tour="admin.apiKeys.table">
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
          data-tour="admin.apiKeys.create"
        >
          {t('admin:apiKeys.create')}
        </Button>
      </Group>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('admin:apiKeys.column.name')}</Table.Th>
            <Table.Th>{t('admin:apiKeys.column.prefix')}</Table.Th>
            <Table.Th>{t('admin:apiKeys.column.scopes')}</Table.Th>
            <Table.Th>{t('admin:apiKeys.column.lastUsed')}</Table.Th>
            <Table.Th>{t('admin:apiKeys.column.expires')}</Table.Th>
            <Table.Th>{t('admin:apiKeys.column.status')}</Table.Th>
            <Table.Th>{t('common:label.actions')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {keys.map((k) => {
            // The keyHash is sha256-hex of the raw key. The raw key prefix
            // is conventionally `sedms_<first8>…`. We display the first
            // 8 chars of the hash as the prefix indicator (the raw key
            // itself is never retrievable).
            const prefix = `sedms_${k.keyHash.slice(0, 8)}…`;
            const isRevoked = !!k.revokedAt;
            const isExpired = k.expiresAt ? new Date(k.expiresAt) < new Date() : false;
            return (
              <Table.Tr key={k.id}>
                <Table.Td>{k.name}</Table.Td>
                <Table.Td>
                  <Code style={{ fontSize: 12 }}>{prefix}</Code>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {k.scopes.slice(0, 3).map((s) => (
                      <Badge key={s} size="xs" variant="light">{s}</Badge>
                    ))}
                    {k.scopes.length > 3 && (
                      <Badge size="xs" variant="light" color="gray">+{k.scopes.length - 3}</Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>{k.lastUsedAt ? <LocaleAwareDate value={k.lastUsedAt} variant="relative" /> : '—'}</Table.Td>
                <Table.Td>{k.expiresAt ? <LocaleAwareDate value={k.expiresAt} variant="date" /> : '∞'}</Table.Td>
                <Table.Td>
                  {isRevoked ? (
                    <Badge color="error" size="sm">{t('admin:apiKeys.status.revoked')}</Badge>
                  ) : isExpired ? (
                    <Badge color="error" size="sm">{t('admin:apiKeys.status.expired')}</Badge>
                  ) : (
                    <Badge color="success" size="sm">{t('common:status.active')}</Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="error"
                    leftSection={<Trash2 size={12} aria-hidden="true" />}
                    onClick={() => handleRevoke(k.id)}
                    loading={revokeMutation.isPending}
                    disabled={isRevoked}
                  >
                    {t('admin:apiKeys.revoke')}
                  </Button>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
