/**
 * Signing key list — shows all signing keys (active + retired + revoked)
 * with their kid, algorithm, status, created/retired timestamps, and
 * public key. The active key is highlighted at the top.
 *
 * Spec ref: §12.4 (signing keys), §27.3 (security rules — rotation
 * requires step-up auth).
 */
import { useState } from 'react';
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { Key, Plus, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useActiveSigningKeyQuery,
  useSigningKeysQuery,
} from '../../api/hooks';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { EmptyState } from '../common/EmptyState';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { KeyRotationModal } from './KeyRotationModal';

export function SigningKeyList() {
  const { t } = useTranslation();
  const [rotateOpen, setRotateOpen] = useState(false);
  const listQuery = useSigningKeysQuery();
  const activeQuery = useActiveSigningKeyQuery();

  if (listQuery.isLoading || activeQuery.isLoading) {return <LoadingState variant="skeleton" />;}
  if (listQuery.isError) {return <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />;}

  const keys = listQuery.data?.keys ?? [];
  const active = activeQuery.data;

  if (keys.length === 0 && !active?.loaded) {
    return (
      <EmptyState
        illustration="signingKeys"
        titleKey="admin:signingKeys.empty.title"
        subtitleKey="admin:signingKeys.empty.subtitle"
        actions={
          <Button
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={() => setRotateOpen(true)}
            data-tour="admin.signingKeys.rotate"
          >
            {t('admin:signingKeys.rotate')}
          </Button>
        }
      />
    );
  }

  return (
    <Stack gap="lg">
      {/* Active key card */}
      {active?.loaded && (
        <Card withBorder padding="lg" data-tour="admin.signingKeys.active">
          <Group justify="space-between" mb="sm">
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" color="success" variant="light">
                <ShieldCheck size={20} aria-hidden="true" />
              </ThemeIcon>
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={600}>{t('admin:signingKeys.active')}</Text>
                <Text size="lg" fw={700} style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
                  kid: {active.kid}
                </Text>
              </Stack>
            </Group>
            <Badge color="success" size="lg" variant="light">
              {t('common:status.active')}
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <Field label={t('admin:signingKeys.column.algorithm')} value={active.algorithm ?? '—'} />
            <Field label={t('admin:signingKeys.column.status')} value={active.status ?? '—'} />
            {active.createdAt && (
              <Field label={t('common:label.created')} value={<LocaleAwareDate value={active.createdAt} variant="datetime" />} />
            )}
          </SimpleGrid>
          {active.publicKey && (
            <Box mt="sm">
              <Text size="xs" c="dimmed" fw={600} mb={4}>{t('admin:signingKeys.column.publicKey')}</Text>
              <Code block style={{ fontSize: 11, maxHeight: 120, overflow: 'auto' }}>
                {active.publicKey}
              </Code>
            </Box>
          )}
        </Card>
      )}

      <Alert color="warning" variant="light" icon={<TriangleAlert size={16} />}>
        {t('admin:signingKeys.warning')}
      </Alert>

      <Group justify="flex-end">
        <Button
          leftSection={<Key size={14} aria-hidden="true" />}
          onClick={() => setRotateOpen(true)}
          data-tour="admin.signingKeys.rotate"
        >
          {t('admin:signingKeys.rotate')}
        </Button>
      </Group>

      <Accordion chevronPosition="right" variant="separated">
        <Accordion.Item value="history">
          <Accordion.Control>
            {t('admin:signingKeys.history.title')} ({keys.length})
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              {keys.length === 0 && (
                <Text size="sm" c="dimmed">{t('admin:signingKeys.history.empty')}</Text>
              )}
              {keys.map((k) => (
                <Card key={k.id} withBorder padding="sm">
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Text size="sm" fw={600} style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>
                        kid: {k.kid}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {k.algorithm} · <LocaleAwareDate value={k.createdAt} variant="date" />
                        {k.retiredAt && ` · ${t('admin:signingKeys.retired')}: `}
                        {k.retiredAt && <LocaleAwareDate value={k.retiredAt} variant="date" />}
                      </Text>
                    </Stack>
                    <Badge
                      color={
                        k.status === 'active' ? 'success' :
                        k.status === 'rotating' ? 'warning' :
                        k.status === 'retired' ? 'gray' : 'error'
                      }
                      variant="light"
                    >
                      {k.status}
                    </Badge>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <KeyRotationModal opened={rotateOpen} onClose={() => setRotateOpen(false)} />
    </Stack>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" fw={600}>{label}</Text>
      <Text size="sm">{value}</Text>
    </Stack>
  );
}
