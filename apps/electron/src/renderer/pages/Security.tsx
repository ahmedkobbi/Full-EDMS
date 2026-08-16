/**
 * Security Dashboard page (spec §27.3).
 *
 * Real-time security incident monitoring for admins. Shows:
 *  - Dashboard stats (total/active/critical/blocked incidents)
 *  - Incident list with severity filtering
 *  - Incident detail drawer with full attacker profile + forensic evidence
 *  - IP blocklist management
 *  - Acknowledge / resolve actions
 *
 * Spec ref: §27.3 (security rules), §9.12 (audit, evidence),
 *           §12.4 (licensing enforcement).
 */
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Drawer,
  Group,
  JsonInput,
  LoadingOverlay,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  AlertTriangle,
  Ban,
  Check,
  Clock,
  Cpu,
  Globe,
  Monitor,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  type SecurityIncident,
  useAcknowledgeIncidentMutation,
  useBlockedIpsQuery,
  useResolveIncidentMutation,
  useSecurityDashboardQuery,
  useSecurityIncidentQuery,
  useSecurityIncidentsQuery,
  useUnblockIpMutation,
} from '../api/hooks';
import { ErrorState } from '@smart-edms/ui';
import { EmptyState } from '@smart-edms/ui';
import { LocaleAwareDate } from '@smart-edms/ui';

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'blue',
  WARNING: 'yellow',
  CRITICAL: 'orange',
  BLOCKED: 'red',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'red',
  ACKNOWLEDGED: 'yellow',
  RESOLVED: 'green',
  FALSE_POSITIVE: 'gray',
};

export function SecurityPage() {
  const { t } = useTranslation();
  const [severity, setSeverity] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBlockedIps, setShowBlockedIps] = useState(false);

  const dashboardQuery = useSecurityDashboardQuery();
  const incidentsQuery = useSecurityIncidentsQuery({
    severity: severity ?? undefined,
    status: status ?? undefined,
    limit: 50,
  });
  const blockedIpsQuery = useBlockedIpsQuery();
  const unblockMutation = useUnblockIpMutation();

  return (
    <Stack gap="md" p="md">
      <LoadingOverlay visible={incidentsQuery.isLoading} />

      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="xl" variant="light" color="red">
            <ShieldAlert size={28} />
          </ThemeIcon>
          <div>
            <Title order={2}>{t('security:title', { defaultValue: 'Security Center' })}</Title>
            <Text size="sm" c="dimmed">
              {t('security:subtitle', { defaultValue: 'Real-time cracking & tampering detection' })}
            </Text>
          </div>
        </Group>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<Ban size={16} />}
            onClick={() => setShowBlockedIps(true)}
          >
            {t('security:blockedIps', { defaultValue: 'Blocked IPs' })}
            {blockedIpsQuery.data && blockedIpsQuery.data.length > 0 && (
              <Badge ml="xs" color="red" size="sm">{blockedIpsQuery.data.length}</Badge>
            )}
          </Button>
          <Button
            variant="subtle"
            leftSection={<RefreshCw size={16} />}
            onClick={() => { incidentsQuery.refetch(); dashboardQuery.refetch(); }}
          >
            {t('common:action.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </Group>
      </Group>

      {/* Dashboard Stats */}
      {dashboardQuery.data && (
        <SimpleGrid cols={{ base: 2, md: 3, lg: 6 }} spacing="md">
          <StatCard
            icon={<Shield size={20} />}
            color="blue"
            label={t('security:totalIncidents', { defaultValue: 'Total' })}
            value={dashboardQuery.data.totalIncidents}
          />
          <StatCard
            icon={<AlertTriangle size={20} />}
            color="red"
            label={t('security:activeIncidents', { defaultValue: 'Active' })}
            value={dashboardQuery.data.activeIncidents}
          />
          <StatCard
            icon={<ShieldAlert size={20} />}
            color="orange"
            label={t('security:criticalIncidents', { defaultValue: 'Critical' })}
            value={dashboardQuery.data.criticalIncidents}
          />
          <StatCard
            icon={<Ban size={20} />}
            color="red"
            label={t('security:blockedIncidents', { defaultValue: 'Blocked' })}
            value={dashboardQuery.data.blockedIncidents}
          />
          <StatCard
            icon={<Clock size={20} />}
            color="yellow"
            label={t('security:today', { defaultValue: 'Today' })}
            value={dashboardQuery.data.incidentsToday}
          />
          <StatCard
            icon={<Globe size={20} />}
            color="gray"
            label={t('security:blockedIps', { defaultValue: 'Blocked IPs' })}
            value={dashboardQuery.data.blockedIpsActive}
          />
        </SimpleGrid>
      )}

      {/* Active Alert Banner */}
      {dashboardQuery.data && dashboardQuery.data.activeIncidents > 0 && (
        <Alert
          icon={<ShieldAlert size={20} />}
          color="red"
          variant="filled"
          title={`${dashboardQuery.data.activeIncidents} active security incident(s)`}
        >
          {dashboardQuery.data.criticalIncidents > 0 && (
            <Text size="sm">
              ⚠️ {dashboardQuery.data.criticalIncidents} CRITICAL — immediate action required
            </Text>
          )}
          {dashboardQuery.data.blockedIncidents > 0 && (
            <Text size="sm">
              🚫 {dashboardQuery.data.blockedIncidents} BLOCKED — cracking attempts detected and auto-blocked
            </Text>
          )}
        </Alert>
      )}

      {/* Filters */}
      <Group gap="sm">
        <Select
          placeholder={t('security:filterBySeverity', { defaultValue: 'Filter by severity' })}
          value={severity}
          onChange={setSeverity}
          clearable
          w={200}
          data={[
            { value: 'INFO', label: 'Info' },
            { value: 'WARNING', label: 'Warning' },
            { value: 'CRITICAL', label: 'Critical' },
            { value: 'BLOCKED', label: 'Blocked' },
          ]}
        />
        <Select
          placeholder={t('security:filterByStatus', { defaultValue: 'Filter by status' })}
          value={status}
          onChange={setStatus}
          clearable
          w={200}
          data={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'FALSE_POSITIVE', label: 'False Positive' },
          ]}
        />
      </Group>

      {/* Incidents List */}
      {incidentsQuery.error ? (
        <ErrorState error={incidentsQuery.error} />
      ) : incidentsQuery.data && incidentsQuery.data.items.length > 0 ? (
        <ScrollArea h={600}>
          <Stack gap="xs">
            {incidentsQuery.data.items.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onSelect={() => setSelectedId(incident.id)}
              />
            ))}
          </Stack>
        </ScrollArea>
      ) : (
        <EmptyState
          illustration="generic"
          titleKey="security:noIncidents"
          subtitleKey="security:noIncidentsDescription"
        />
      )}

      {/* Incident Detail Drawer */}
      <Drawer
        opened={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={
          <Group gap="sm">
            <ShieldAlert size={20} />
            <Text fw={600}>{t('security:incidentDetail', { defaultValue: 'Incident Detail' })}</Text>
          </Group>
        }
        position="right"
        size="xl"
      >
        {selectedId && <IncidentDetail id={selectedId} />}
      </Drawer>

      {/* Blocked IPs Modal */}
      <Modal
        opened={showBlockedIps}
        onClose={() => setShowBlockedIps(false)}
        title={
          <Group gap="sm">
            <Ban size={20} />
            <Text fw={600}>{t('security:blockedIps', { defaultValue: 'Blocked IPs' })}</Text>
          </Group>
        }
        size="lg"
      >
        {blockedIpsQuery.isLoading ? (
          <Text c="dimmed">Loading...</Text>
        ) : blockedIpsQuery.data && blockedIpsQuery.data.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>IP Address</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Blocked</Table.Th>
                <Table.Th>Expires</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {blockedIpsQuery.data.map((ip) => (
                <Table.Tr key={ip.id}>
                  <Table.Td><Code>{ip.ipAddress}</Code></Table.Td>
                  <Table.Td><Text size="xs" lineClamp={2}>{ip.reason}</Text></Table.Td>
                  <Table.Td><LocaleAwareDate value={ip.blockedAt} /></Table.Td>
                  <Table.Td>
                    {ip.expiresAt ? <LocaleAwareDate value={ip.expiresAt} /> : 'Permanent'}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      color="green"
                      leftSection={<Check size={14} />}
                      loading={unblockMutation.isPending}
                      onClick={() => unblockMutation.mutate(ip.ipAddress)}
                    >
                      Unblock
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed">No blocked IPs</Text>
        )}
      </Modal>
    </Stack>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────

function StatCard({ icon, color, label, value }: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <Paper p="md" withBorder>
      <Group gap="sm" align="flex-start">
        <ThemeIcon size="lg" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <Stack gap={0}>
          <Text size="xl" fw={700}>{value}</Text>
          <Text size="xs" c="dimmed">{label}</Text>
        </Stack>
      </Group>
    </Paper>
  );
}

// ── Incident Card ──────────────────────────────────────────────────

function IncidentCard({ incident, onSelect }: {
  incident: SecurityIncident;
  onSelect: () => void;
}) {
  return (
    <Paper
      p="md"
      withBorder
      onClick={onSelect}
      style={{ cursor: 'pointer', borderLeft: `4px solid var(--mantine-color-${SEVERITY_COLORS[incident.severity]}-6)` }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="sm">
            <Badge color={SEVERITY_COLORS[incident.severity]} variant="filled" size="sm">
              {incident.severity}
            </Badge>
            <Badge color={STATUS_COLORS[incident.status]} variant="light" size="sm">
              {incident.status}
            </Badge>
            <Text size="sm" fw={600} c="dimmed">{incident.category}/{incident.code}</Text>
          </Group>
          <Text size="sm" lineClamp={2}>{incident.reason}</Text>
          <Group gap="lg" mt={4}>
            {incident.ipAddress && (
              <Group gap={4}>
                <Globe size={14} />
                <Text size="xs" c="dimmed">{incident.ipAddress}</Text>
              </Group>
            )}
            {incident.userEmail && (
              <Group gap={4}>
                <User size={14} />
                <Text size="xs" c="dimmed">{incident.userEmail}</Text>
              </Group>
            )}
            {incident.hostname && (
              <Group gap={4}>
                <Monitor size={14} />
                <Text size="xs" c="dimmed">{incident.hostname}</Text>
              </Group>
            )}
            <Group gap={4}>
              <Clock size={14} />
              <Text size="xs" c="dimmed">
                <LocaleAwareDate value={incident.createdAt} />
              </Text>
            </Group>
          </Group>
        </Stack>
        <Group gap="xs">
          {incident.autoBlockedIp && (
            <Tooltip label="IP auto-blocked">
              <ThemeIcon size="sm" color="red" variant="light">
                <Ban size={14} />
              </ThemeIcon>
            </Tooltip>
          )}
          {incident.autoLockedDown && (
            <Tooltip label="Deployment locked down">
              <ThemeIcon size="sm" color="red" variant="filled">
                <ShieldAlert size={14} />
              </ThemeIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Paper>
  );
}

// ── Incident Detail ────────────────────────────────────────────────

function IncidentDetail({ id }: { id: string }) {
  const { t } = useTranslation();
  const [resolveNote, setResolveNote] = useState('');
  const [showResolve, setShowResolve] = useState(false);

  const query = useSecurityIncidentQuery(id);
  const ackMutation = useAcknowledgeIncidentMutation();
  const resolveMutation = useResolveIncidentMutation();

  if (query.isLoading) {return <Text c="dimmed">Loading...</Text>;}
  if (query.error) {return <ErrorState error={query.error} />;}
  if (!query.data) {return null;}

  const incident = query.data;

  return (
    <ScrollArea h="calc(100vh - 120px)">
      <Stack gap="md">
        {/* Header */}
        <Group gap="sm">
          <Badge color={SEVERITY_COLORS[incident.severity]} variant="filled" size="lg">
            {incident.severity}
          </Badge>
          <Badge color={STATUS_COLORS[incident.status]} variant="light" size="lg">
            {incident.status}
          </Badge>
        </Group>

        {/* Reason */}
        <Paper p="md" withBorder>
          <Text size="sm" fw={600} mb={4}>Reason</Text>
          <Text size="sm">{incident.reason}</Text>
          <Divider my="sm" />
          <Group gap="xs">
            <Text size="xs" c="dimmed">Category:</Text>
            <Code>{incident.category}</Code>
            <Text size="xs" c="dimmed">Code:</Text>
            <Code>{incident.code}</Code>
          </Group>
        </Paper>

        {/* Auto-Response */}
        {(incident.autoBlockedIp || incident.autoLockedDown || incident.autoSuspendedUser) && (
          <Alert color="red" variant="light" icon={<ShieldAlert size={18} />} title="Auto-Response Triggered">
            <Stack gap={4}>
              {incident.autoBlockedIp && <Text size="sm">🚫 IP address auto-blocked</Text>}
              {incident.autoSuspendedUser && <Text size="sm">⚠️ User account auto-suspended</Text>}
              {incident.autoLockedDown && <Text size="sm">🔒 Deployment auto-locked down</Text>}
            </Stack>
          </Alert>
        )}

        {/* Failed Layers */}
        {incident.failedLayers && (
          <Paper p="md" withBorder>
            <Text size="sm" fw={600} mb={8}>Failed Validation Layers</Text>
            <SimpleGrid cols={2} spacing="xs">
              {Object.entries(incident.failedLayers).map(([layer, ok]) => (
                <Group key={layer} gap="xs">
                  <ThemeIcon size="xs" color={ok ? 'green' : 'red'} variant="light">
                    {ok ? <Check size={10} /> : <AlertTriangle size={10} />}
                  </ThemeIcon>
                  <Text size="xs">{layer}</Text>
                </Group>
              ))}
            </SimpleGrid>
          </Paper>
        )}

        {/* Attacker Profile */}
        <Paper p="md" withBorder>
          <Text size="sm" fw={600} mb={8}>Attacker Profile</Text>
          <Stack gap={6}>
            {incident.ipAddress && (
              <ProfileRow icon={<Globe size={14} />} label="IP Address" value={incident.ipAddress} />
            )}
            {incident.userAgent && (
              <ProfileRow icon={<Monitor size={14} />} label="User Agent" value={incident.userAgent} />
            )}
            {incident.userEmail && (
              <ProfileRow icon={<User size={14} />} label="User Email" value={incident.userEmail} />
            )}
            {incident.hostname && (
              <ProfileRow icon={<Cpu size={14} />} label="Hostname" value={incident.hostname} />
            )}
            {incident.platform && (
              <ProfileRow icon={<Monitor size={14} />} label="Platform" value={`${incident.platform} / ${incident.arch ?? 'unknown'}`} />
            )}
            {incident.machineFingerprint && (
              <ProfileRow icon={<Shield size={14} />} label="Machine Fingerprint" value={incident.machineFingerprint} />
            )}
            {incident.processPid && (
              <ProfileRow icon={<Cpu size={14} />} label="Process PID" value={String(incident.processPid)} />
            )}
            {incident.nodeVersion && (
              <ProfileRow icon={<Cpu size={14} />} label="Node Version" value={incident.nodeVersion} />
            )}
          </Stack>
        </Paper>

        {/* Suspicious Environment Variables */}
        {incident.envFlags && Object.keys(incident.envFlags).length > 0 && (
          <Paper p="md" withBorder style={{ borderColor: 'var(--mantine-color-red-4)' }}>
            <Text size="sm" fw={600} mb={8} color="red">Suspicious Environment Variables</Text>
            <Stack gap={4}>
              {Object.entries(incident.envFlags).map(([key, value]) => (
                <Group key={key} gap="xs">
                  <Code color="red">{key}</Code>
                  <Text size="xs" c="dimmed">{value}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Request Context */}
        {incident.requestUrl && (
          <Paper p="md" withBorder>
            <Text size="sm" fw={600} mb={4}>Request Context</Text>
            <Group gap="xs" mb={4}>
              <Badge variant="light">{incident.requestMethod ?? 'GET'}</Badge>
              <Code>{incident.requestUrl}</Code>
            </Group>
          </Paper>
        )}

        {/* Call Stack */}
        {incident.callStack && (
          <Paper p="md" withBorder>
            <Text size="sm" fw={600} mb={4}>Call Stack (Forensic Evidence)</Text>
            <JsonInput
              value={incident.callStack}
              readOnly
              autosize
              minRows={4}
              maxRows={12}
              formatOnBlur
            />
          </Paper>
        )}

        {/* Hash Chain */}
        <Paper p="md" withBorder>
          <Text size="sm" fw={600} mb={4}>Hash Chain (Tamper-Evident)</Text>
          <Stack gap={4}>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Sequence:</Text>
              <Code>{incident.sequenceNumber}</Code>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Event Hash:</Text>
              <Code>{incident.eventHash.slice(0, 32)}...</Code>
            </Group>
          </Stack>
        </Paper>

        {/* Admin Actions */}
        {incident.status === 'ACTIVE' && (
          <Group gap="sm">
            <Button
              variant="light"
              color="yellow"
              leftSection={<Check size={16} />}
              loading={ackMutation.isPending}
              onClick={() => ackMutation.mutate({ id: incident.id })}
            >
              {t('security:acknowledge', { defaultValue: 'Acknowledge' })}
            </Button>
            <Button
              variant="light"
              color="green"
              leftSection={<ShieldCheck size={16} />}
              onClick={() => setShowResolve(!showResolve)}
            >
              {t('security:resolve', { defaultValue: 'Resolve' })}
            </Button>
          </Group>
        )}

        {showResolve && (
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Textarea
                label="Resolution note"
                placeholder="Describe what action was taken..."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                autosize
                minRows={2}
              />
              <Group gap="sm">
                <Button
                  color="green"
                  loading={resolveMutation.isPending}
                  onClick={() => {
                    resolveMutation.mutate(
                      { id: incident.id, note: resolveNote },
                      { onSuccess: () => setShowResolve(false) },
                    );
                  }}
                >
                  Resolve
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  loading={resolveMutation.isPending}
                  onClick={() => {
                    resolveMutation.mutate(
                      { id: incident.id, note: resolveNote, falsePositive: true },
                      { onSuccess: () => setShowResolve(false) },
                    );
                  }}
                >
                  Mark as False Positive
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}
      </Stack>
    </ScrollArea>
  );
}

function ProfileRow({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Group gap="sm">
      <ThemeIcon size="sm" variant="light" color="gray">
        {icon}
      </ThemeIcon>
      <Text size="xs" c="dimmed" style={{ minWidth: 130 }}>{label}:</Text>
      <Text size="xs" style={{ wordBreak: 'break-all' }}>{value}</Text>
    </Group>
  );
}
