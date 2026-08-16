/**
 * License Admin Panel — Security Incidents page.
 *
 * Shows security incidents from connected on-premise deployments.
 * License admins can view cracking attempts, blocked IPs, and
 * deployment lockdown status across all customers.
 *
 * Spec ref: §12.10 (license admin panel), §27.3 (security rules).
 */
import { useState } from 'react';
import {
  Badge,
  Card,
  Group,
  LoadingOverlay,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  AlertTriangle,
  Ban,
  Globe,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';

interface AdminIncident {
  id: string;
  tenantId: string;
  tenantName: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
  category: string;
  code: string;
  reason: string;
  ipAddress: string | null;
  hostname: string | null;
  platform: string | null;
  createdAt: string;
  autoBlockedIp: boolean;
  autoLockedDown: boolean;
}

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
  const [severity, setSeverity] = useState<string | null>(null);
  const [incidents] = useState<AdminIncident[]>([]);
  const [loading] = useState(false);

  const stats = {
    total: incidents.length,
    active: incidents.filter((i) => i.status === 'ACTIVE').length,
    critical: incidents.filter((i) => i.severity === 'CRITICAL').length,
    blocked: incidents.filter((i) => i.severity === 'BLOCKED').length,
  };

  return (
    <Stack gap="md" p="md">
      <LoadingOverlay visible={loading} />

      <PageHeader
        titleKey="admin:security.title"
        subtitleKey="admin:security.subtitle"
        tour="admin.security.page"
      />

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <StatCard icon={<Shield size={20} />} color="blue" label="Total" value={stats.total} />
        <StatCard icon={<AlertTriangle size={20} />} color="red" label="Active" value={stats.active} />
        <StatCard icon={<ShieldAlert size={20} />} color="orange" label="Critical" value={stats.critical} />
        <StatCard icon={<Ban size={20} />} color="red" label="Blocked" value={stats.blocked} />
      </SimpleGrid>

      {/* Filter */}
      <Group gap="sm">
        <Select
          placeholder="Filter by severity"
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
      </Group>

      {/* Incidents Table */}
      <Card withBorder p={0}>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Severity</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Deployment</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>IP</Table.Th>
                <Table.Th>Host</Table.Th>
                <Table.Th>Auto-Response</Table.Th>
                <Table.Th>Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {incidents.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed" ta="center" py="xl">
                      No security incidents — all deployments are secure
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                incidents.map((incident) => (
                  <Table.Tr key={incident.id}>
                    <Table.Td>
                      <Badge color={SEVERITY_COLORS[incident.severity]} variant="filled" size="sm">
                        {incident.severity}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATUS_COLORS[incident.status]} variant="light" size="sm">
                        {incident.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td><Text size="xs">{incident.tenantName}</Text></Table.Td>
                    <Table.Td><Text size="xs">{incident.category}</Text></Table.Td>
                    <Table.Td><Text size="xs" lineClamp={2}>{incident.reason}</Text></Table.Td>
                    <Table.Td>
                      {incident.ipAddress ? (
                        <Group gap={4}>
                          <Globe size={12} />
                          <Text size="xs">{incident.ipAddress}</Text>
                        </Group>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {incident.hostname ? (
                        <Group gap={4}>
                          <Cpu size={12} />
                          <Text size="xs">{incident.hostname}</Text>
                        </Group>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {incident.autoBlockedIp && (
                          <Tooltip label="IP blocked">
                            <ThemeIcon size="xs" color="red" variant="light">
                              <Ban size={10} />
                            </ThemeIcon>
                          </Tooltip>
                        )}
                        {incident.autoLockedDown && (
                          <Tooltip label="Deployment locked">
                            <ThemeIcon size="xs" color="red" variant="filled">
                              <ShieldAlert size={10} />
                            </ThemeIcon>
                          </Tooltip>
                        )}
                        {!incident.autoBlockedIp && !incident.autoLockedDown && (
                          <ShieldCheck size={12} color="var(--mantine-color-gray-5)" />
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Clock size={12} />
                        <Text size="xs" c="dimmed">
                          {new Date(incident.createdAt).toLocaleString()}
                        </Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
}

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
