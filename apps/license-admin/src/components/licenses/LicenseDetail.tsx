/**
 * License detail panel — full detail of a license: entitlements,
 * activations, devices, heartbeats, and the issue/renew/revoke actions.
 *
 * Tabs:
 *  - Overview — payload metadata, status, validity window
 *  - Entitlements — list of entitlement modules + AI entitlements + features
 *  - Activations — table of activation records
 *  - Devices — table of devices bound to the license
 *  - Heartbeats — recent heartbeat records
 */
import { useState } from 'react';
import {
  Badge,
  Button,
  Code,
  Divider,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
} from '@mantine/core';
import { Activity, Ban, CalendarPlus, Key, MonitorSmartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { License } from '@smart-edms/types';
import {
  useLicenseActivationsQuery,
  useLicenseDevicesQuery,
  useLicenseHeartbeatsQuery,
} from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { LicenseRevokeModal } from './LicenseRevokeModal';
import { LicenseRenewModal } from './LicenseRenewModal';

interface LicenseDetailProps {
  readonly license: License;
}

export function LicenseDetail({ license }: LicenseDetailProps) {
  const { t } = useTranslation();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);

  const activationsQuery = useLicenseActivationsQuery(license.id);
  const devicesQuery = useLicenseDevicesQuery(license.id);
  const heartbeatsQuery = useLicenseHeartbeatsQuery(license.id);

  return (
    <Stack gap="lg">
      <Group justify="flex-end">
        <Button
          variant="light"
          leftSection={<CalendarPlus size={14} aria-hidden="true" />}
          onClick={() => setRenewOpen(true)}
          data-tour="admin.licenses.renew"
        >
          {t('license:action.renew')}
        </Button>
        <Button
          color="error"
          variant="light"
          leftSection={<Ban size={14} aria-hidden="true" />}
          onClick={() => setRevokeOpen(true)}
          data-tour="admin.licenses.revoke"
          disabled={license.status === 'revoked'}
        >
          {t('admin:licenses.revoke.title')}
        </Button>
      </Group>

      <Tabs defaultValue="overview" data-tour="admin.licenses.detail.tabs">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<Key size={14} aria-hidden="true" />}>
            {t('license:tab.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="entitlements">
            {t('license:overview.modules')}
          </Tabs.Tab>
          <Tabs.Tab value="activations" leftSection={<Activity size={14} aria-hidden="true" />}>
            {t('license:tab.activation')}
          </Tabs.Tab>
          <Tabs.Tab value="devices" leftSection={<MonitorSmartphone size={14} aria-hidden="true" />}>
            {t('admin:licenses.tab.devices')}
          </Tabs.Tab>
          <Tabs.Tab value="heartbeats">
            {t('license:tab.heartbeat')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Field label={t('admin:licenses.column.licenseId')} value={<Code>{license.id}</Code>} />
            <Field label={t('admin:licenses.column.status')} value={
              <Badge color={statusColor(license.status)}>
                {t(`admin:licenses.status.${license.status}`)}
              </Badge>
            } />
            <Field label={t('admin:licenses.column.type')} value={
              <Badge variant="light">{t(`admin:licenses.type.${license.type}`)}</Badge>
            } />
            <Field label={t('admin:licenses.column.environment')} value={license.environment} />
            <Field label={t('license:overview.issuedAt')} value={<LocaleAwareDate value={license.issuedAt} variant="datetime" />} />
            <Field label={t('admin:licenses.field.startsAt')} value={<LocaleAwareDate value={license.startsAt} variant="datetime" />} />
            <Field label={t('license:overview.expiresAt')} value={
              license.expiresAt ? <LocaleAwareDate value={license.expiresAt} variant="date" /> : '∞'
            } />
            <Field label={t('admin:licenses.field.gracePeriodDays')} value={`${license.gracePeriodDays}`} />
            <Field label={t('admin:licenses.column.renewalCounter')} value={`${license.renewalCounter}`} />
            <Field label={t('admin:licenses.column.signingKey')} value={<Code>{license.signingKeyId}</Code>} />
            <Field label={t('admin:licenses.column.offline')} value={
              license.offline.offlineAllowed
                ? t('admin:licenses.offline.allowed', { days: license.offline.maxOfflineDays })
                : t('admin:licenses.offline.notAllowed')
            } />
            <Field label={t('admin:licenses.column.supportLevel')} value={license.supportLevel} />
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="entitlements" pt="md">
          <Stack gap="md">
            <Divider label={t('license:overview.modules')} labelPosition="center" />
            <Group gap="xs">
              {license.entitlements.length === 0 ? (
                <Text size="sm" c="dimmed">{t('admin:licenses.entitlements.empty')}</Text>
              ) : (
                license.entitlements.map((e) => (
                  <Badge key={e} variant="light">{e}</Badge>
                ))
              )}
            </Group>
            {license.aiEntitlements.length > 0 && (
              <>
                <Divider label={t('license:entitlement.ai.title')} labelPosition="center" />
                <Group gap="xs">
                  {license.aiEntitlements.map((e) => (
                    <Badge key={e} variant="light" color="info">{e}</Badge>
                  ))}
                </Group>
              </>
            )}
            {license.features.length > 0 && (
              <>
                <Divider label={t('license:overview.features')} labelPosition="center" />
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('admin:licenses.feature.code')}</Table.Th>
                      <Table.Th>{t('admin:licenses.feature.value')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {license.features.map((f) => (
                      <Table.Tr key={f.code}>
                        <Table.Td><Code>{f.code}</Code></Table.Td>
                        <Table.Td>{String(f.value)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="activations" pt="md">
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('admin:activations.column.code')}</Table.Th>
                  <Table.Th>{t('admin:activations.column.status')}</Table.Th>
                  <Table.Th>{t('admin:activations.column.fingerprint')}</Table.Th>
                  <Table.Th>{t('admin:activations.column.activatedAt')}</Table.Th>
                  <Table.Th>{t('admin:activations.column.lastHeartbeat')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(activationsQuery.data ?? []).length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', opacity: 0.6 }}>
                      {t('admin:activations.empty')}
                    </Table.Td>
                  </Table.Tr>
                )}
                {(activationsQuery.data ?? []).map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td><Code>{a.activationCode}</Code></Table.Td>
                    <Table.Td><Badge size="sm" variant="light">{a.status}</Badge></Table.Td>
                    <Table.Td><Code>{a.fingerprint.fingerprintHash.slice(0, 16)}…</Code></Table.Td>
                    <Table.Td><LocaleAwareDate value={a.activatedAt} variant="datetime" /></Table.Td>
                    <Table.Td>{a.lastHeartbeatAt ? <LocaleAwareDate value={a.lastHeartbeatAt} variant="relative" /> : '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="devices" pt="md">
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('admin:devices.column.name')}</Table.Th>
                  <Table.Th>{t('admin:devices.column.fingerprint')}</Table.Th>
                  <Table.Th>{t('admin:devices.column.appVersion')}</Table.Th>
                  <Table.Th>{t('admin:devices.column.lastSeen')}</Table.Th>
                  <Table.Th>{t('admin:devices.column.status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(devicesQuery.data ?? []).length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', opacity: 0.6 }}>
                      {t('admin:devices.empty')}
                    </Table.Td>
                  </Table.Tr>
                )}
                {(devicesQuery.data ?? []).map((d) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>{d.displayName}</Table.Td>
                    <Table.Td><Code>{d.fingerprint.fingerprintHash.slice(0, 16)}…</Code></Table.Td>
                    <Table.Td>{d.appVersion}</Table.Td>
                    <Table.Td><LocaleAwareDate value={d.lastSeenAt} variant="relative" /></Table.Td>
                    <Table.Td>{d.revokedAt
                      ? <Badge color="error" size="sm">{t('admin:devices.status.revoked')}</Badge>
                      : <Badge color="success" size="sm">{t('common:status.active')}</Badge>}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="heartbeats" pt="md">
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('admin:heartbeats.column.timestamp')}</Table.Th>
                  <Table.Th>{t('admin:heartbeats.column.status')}</Table.Th>
                  <Table.Th>{t('admin:heartbeats.column.appVersion')}</Table.Th>
                  <Table.Th>{t('admin:heartbeats.column.activeUsers')}</Table.Th>
                  <Table.Th>{t('admin:heartbeats.column.storageUsed')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(heartbeatsQuery.data ?? []).length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', opacity: 0.6 }}>
                      {t('admin:heartbeats.empty')}
                    </Table.Td>
                  </Table.Tr>
                )}
                {(heartbeatsQuery.data ?? []).map((h) => (
                  <Table.Tr key={h.id}>
                    <Table.Td><LocaleAwareDate value={h.timestamp} variant="datetime" /></Table.Td>
                    <Table.Td><Badge color={heartbeatColor(h.status)} size="sm">{h.status}</Badge></Table.Td>
                    <Table.Td>{h.appVersion}</Table.Td>
                    <Table.Td>{h.usageSummary.activeUsers}</Table.Td>
                    <Table.Td>{formatBytes(h.usageSummary.storageUsedBytes)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>

      <LicenseRevokeModal
        opened={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        license={license}
      />
      <LicenseRenewModal
        opened={renewOpen}
        onClose={() => setRenewOpen(false)}
        license={license}
      />
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

function statusColor(status: License['status']): string {
  const colors: Record<License['status'], string> = {
    draft: 'gray',
    pending_activation: 'warning',
    active: 'success',
    suspended: 'warning',
    revoked: 'error',
    expired: 'error',
    cancelled: 'gray',
  };
  return colors[status] ?? 'gray';
}

function heartbeatColor(status: string): string {
  if (status === 'healthy') {return 'success';}
  if (status === 'degraded') {return 'warning';}
  if (status === 'revoked') {return 'error';}
  return 'gray';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
