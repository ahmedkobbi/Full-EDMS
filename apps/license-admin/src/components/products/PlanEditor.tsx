/**
 * Plan editor — list + create plans for a single product.
 *
 * Rendered inside the product table's expanding detail panel. The list
 * shows each plan's code, name, default entitlements, and default limits.
 * The "create plan" affordance opens an inline form.
 */
import { useState } from 'react';
import {
  Badge,
  Button,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { EntitlementModule } from '@smart-edms/types';
import {
  useCreatePlanMutation,
  useProductPlansQuery,
} from '../../api/hooks';

const ENTITLEMENT_OPTIONS: { value: EntitlementModule; label: string }[] = [
  { value: 'core-edms', label: 'Core EDMS' },
  { value: 'ocr', label: 'OCR' },
  { value: 'omr', label: 'OMR' },
  { value: 'icr', label: 'ICR' },
  { value: 'bpmn', label: 'BPMN' },
  { value: 'cmmn', label: 'CMMN' },
  { value: 'dmn', label: 'DMN' },
  { value: 'ai-assist', label: 'AI Assist' },
  { value: 'ai-assistant', label: 'AI Assistant' },
  { value: 'c2pa-provenance', label: 'C2PA Provenance' },
  { value: 'dlp', label: 'DLP' },
  { value: 'advanced-search', label: 'Advanced Search' },
  { value: 'hybrid-sync', label: 'Hybrid Sync' },
  { value: 'crisis-room', label: 'Crisis Room' },
  { value: 'physical-digital-twin', label: 'Physical-Digital Twin' },
  { value: '3d-knowledge-graph', label: '3D Knowledge Graph' },
  { value: 'electron-desktop', label: 'Electron Desktop' },
  { value: 'mobile-access', label: 'Mobile Access' },
  { value: 'audit-export', label: 'Audit Export' },
  { value: 'compliance-export', label: 'Compliance Export' },
  { value: 'scanner-agent', label: 'Scanner Agent' },
  { value: 'guided-tour-analytics', label: 'Guided Tour Analytics' },
];

interface PlanEditorProps {
  readonly productId: string;
}

export function PlanEditor({ productId }: PlanEditorProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const plansQuery = useProductPlansQuery(productId);
  const createMutation = useCreatePlanMutation();

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entitlements, setEntitlements] = useState<EntitlementModule[]>([]);
  const [maxUsers, setMaxUsers] = useState<number | ''>(10);
  const [maxDevices, setMaxDevices] = useState<number | ''>(5);
  const [maxDocuments, setMaxDocuments] = useState<number | ''>(100000);
  const [aiMonthlyQuota, setAiMonthlyQuota] = useState<number | ''>(1000);
  const [unlimitedStorage, setUnlimitedStorage] = useState(false);

  const plans = plansQuery.data ?? [];

  const reset = (): void => {
    setCode('');
    setName('');
    setDescription('');
    setEntitlements([]);
    setMaxUsers(10);
    setMaxDevices(5);
    setMaxDocuments(100000);
    setAiMonthlyQuota(1000);
    setUnlimitedStorage(false);
  };

  const handleCreate = async (): Promise<void> => {
    if (!code || !name) {return;}
    try {
      await createMutation.mutateAsync({
        productId,
        code,
        name,
        description: description || null,
        defaultEntitlements: entitlements,
        defaultLimits: {
          maxUsers: maxUsers === '' ? null : maxUsers,
          maxDevices: maxDevices === '' ? null : maxDevices,
          maxStorageBytes: unlimitedStorage ? null : 1024 * 1024 * 1024 * 100, // 100 GB default
          maxDocuments: maxDocuments === '' ? null : maxDocuments,
          aiMonthlyQuota: aiMonthlyQuota === '' ? null : aiMonthlyQuota,
          aiDailyQuotaPerUser: null,
        },
      });
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('common:toast.created'),
        color: 'success',
      });
      reset();
      setCreating(false);
    } catch {
      // Error surfaced by the API client.
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {t('admin:plans.count', { count: plans.length })}
        </Text>
        <Button
          size="xs"
          variant="light"
          leftSection={<Plus size={14} aria-hidden="true" />}
          onClick={() => setCreating((v) => !v)}
        >
          {t('admin:plans.create')}
        </Button>
      </Group>

      {creating && (
        <Stack gap="sm" p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)' }}>
          <Group grow>
            <TextInput label={t('admin:plans.field.code')} value={code} onChange={(e) => setCode(e.target.value)} />
            <TextInput label={t('admin:plans.field.name')} value={name} onChange={(e) => setName(e.target.value)} />
          </Group>
          <Textarea
            label={t('admin:plans.field.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autosize
            minRows={2}
          />
          <MultiSelect
            label={t('admin:plans.field.entitlements')}
            data={ENTITLEMENT_OPTIONS}
            value={entitlements}
            onChange={(v) => setEntitlements(v as EntitlementModule[])}
            searchable
            clearable
          />
          <Divider label={t('admin:plans.field.limits')} labelPosition="center" />
          <Group grow>
            <NumberInput label={t('admin:plans.field.maxUsers')} value={maxUsers} onChange={(v) => setMaxUsers(typeof v === 'number' ? v : '')} />
            <NumberInput label={t('admin:plans.field.maxDevices')} value={maxDevices} onChange={(v) => setMaxDevices(typeof v === 'number' ? v : '')} />
            <NumberInput label={t('admin:plans.field.maxDocuments')} value={maxDocuments} onChange={(v) => setMaxDocuments(typeof v === 'number' ? v : '')} />
          </Group>
          <Group grow>
            <NumberInput label={t('admin:plans.field.aiMonthlyQuota')} value={aiMonthlyQuota} onChange={(v) => setAiMonthlyQuota(typeof v === 'number' ? v : '')} />
            <Switch
              label={t('admin:plans.field.unlimitedStorage')}
              checked={unlimitedStorage}
              onChange={(e) => setUnlimitedStorage(e.currentTarget.checked)}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCreating(false)}>
              {t('common:action.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} loading={createMutation.isPending} disabled={!code || !name}>
              {t('common:action.create')}
            </Button>
          </Group>
        </Stack>
      )}

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('admin:plans.column.code')}</Table.Th>
            <Table.Th>{t('admin:plans.column.name')}</Table.Th>
            <Table.Th>{t('admin:plans.column.entitlements')}</Table.Th>
            <Table.Th>{t('admin:plans.column.limits')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {plans.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={4} style={{ textAlign: 'center', opacity: 0.6 }}>
                {t('admin:plans.empty')}
              </Table.Td>
            </Table.Tr>
          )}
          {plans.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td style={{ fontFamily: 'var(--mantine-font-family-monospace)' }}>{p.code}</Table.Td>
              <Table.Td>{p.name}</Table.Td>
              <Table.Td>
                <Group gap={4}>
                  {p.defaultEntitlements.slice(0, 3).map((e) => (
                    <Badge key={e} size="xs" variant="light">{e}</Badge>
                  ))}
                  {p.defaultEntitlements.length > 3 && (
                    <Badge size="xs" variant="light" color="gray">
                      +{p.defaultEntitlements.length - 3}
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="dimmed">
                  {t('admin:plans.limits.summary', {
                    users: p.defaultLimits.maxUsers ?? '∞',
                    devices: p.defaultLimits.maxDevices ?? '∞',
                  })}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
