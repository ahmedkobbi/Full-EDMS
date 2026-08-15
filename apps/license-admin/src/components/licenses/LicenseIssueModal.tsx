/**
 * License issue modal — issue a new license via the licensing server.
 *
 * The admin picks a customer, product, plan, type, environment, validity
 * window, and entitlements. On submit, the licensing server signs and
 * persists the license; the new license appears in the table.
 *
 * Note: signing happens server-side (the private key never leaves the
 * KMS/HSM, spec §12.4). The admin panel only sends the license parameters.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Stack,
  Select,
  NumberInput,
  MultiSelect,
  Button,
  Group,
  Text,
  Switch,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { LicenseType, LicenseEnvironment, EntitlementModule } from '@smart-edms/types';
import {
  useCustomersQuery,
  useProductsQuery,
  useProductPlansQuery,
  useIssueLicenseMutation,
} from '../../api/hooks';

const LICENSE_TYPES: LicenseType[] = [
  'trial',
  'subscription',
  'perpetual_with_maintenance',
  'enterprise_on_premise',
  'offline_air_gapped',
  'evaluation',
  'partner_reseller',
];

const ENVIRONMENTS: LicenseEnvironment[] = ['production', 'staging', 'trial'];

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
  { value: 'electron-desktop', label: 'Electron Desktop' },
  { value: 'mobile-access', label: 'Mobile Access' },
  { value: 'scanner-agent', label: 'Scanner Agent' },
];

interface LicenseIssueModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  /** Pre-fill the customer when opened from a customer detail page. */
  readonly defaultCustomerId?: string;
  /** Pre-fill the product when opened from a product detail page. */
  readonly defaultProductId?: string;
}

export function LicenseIssueModal({
  opened,
  onClose,
  defaultCustomerId,
  defaultProductId,
}: LicenseIssueModalProps) {
  const { t } = useTranslation();
  const issueMutation = useIssueLicenseMutation();

  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId ?? null);
  const [productId, setProductId] = useState<string | null>(defaultProductId ?? null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [type, setType] = useState<LicenseType>('subscription');
  const [environment, setEnvironment] = useState<LicenseEnvironment>('production');
  const [startsAt, setStartsAt] = useState<Date | null>(new Date());
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [gracePeriodDays, setGracePeriodDays] = useState<number | ''>(14);
  const [entitlements, setEntitlements] = useState<EntitlementModule[]>([]);
  const [maxUsers, setMaxUsers] = useState<number | ''>(50);
  const [maxDevices, setMaxDevices] = useState<number | ''>(10);
  const [maxDocuments, setMaxDocuments] = useState<number | ''>(100000);
  const [offlineAllowed, setOfflineAllowed] = useState(true);
  const [maxOfflineDays, setMaxOfflineDays] = useState<number | ''>(30);

  const customersQuery = useCustomersQuery({ limit: 100 });
  const productsQuery = useProductsQuery();
  const plansQuery = useProductPlansQuery(productId ?? undefined);

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (opened) {
      setCustomerId(defaultCustomerId ?? null);
      setProductId(defaultProductId ?? null);
      setPlanId(null);
      setType('subscription');
      setEnvironment('production');
      setStartsAt(new Date());
      setExpiresAt(null);
      setGracePeriodDays(14);
      setEntitlements([]);
      setMaxUsers(50);
      setMaxDevices(10);
      setMaxDocuments(100000);
      setOfflineAllowed(true);
      setMaxOfflineDays(30);
    }
  }, [opened, defaultCustomerId, defaultProductId]);

  // When the plan changes, copy its default entitlements into the form.
  const selectedPlan = useMemo(
    () => plansQuery.data?.find((p) => p.id === planId),
    [plansQuery.data, planId],
  );

  useEffect(() => {
    if (selectedPlan) {
      setEntitlements([...selectedPlan.defaultEntitlements] as EntitlementModule[]);
    }
  }, [selectedPlan]);

  const handleSubmit = async (): Promise<void> => {
    if (!customerId || !productId || !planId || !startsAt) return;
    try {
      await issueMutation.mutateAsync({
        customerId,
        productId,
        planId,
        type,
        environment,
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        gracePeriodDays: gracePeriodDays === '' ? 14 : gracePeriodDays,
        entitlements,
        limits: {
          maxUsers: maxUsers === '' ? null : maxUsers,
          maxDevices: maxDevices === '' ? null : maxDevices,
          maxStorageBytes: null,
          maxDocuments: maxDocuments === '' ? null : maxDocuments,
          aiMonthlyQuota: null,
          aiDailyQuotaPerUser: null,
        },
        offline: {
          offlineAllowed,
          maxOfflineDays: maxOfflineDays === '' ? 30 : maxOfflineDays,
          hybridSyncAllowed: true,
        },
        supportLevel: 'standard',
      });
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('admin:licenses.issue.success'),
        color: 'success',
      });
      onClose();
    } catch {
      // Error surfaced by the API client.
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('admin:licenses.issue.title')}
      size="xl"
      centered
      data-tour="admin.licenses.issueModal"
    >
      <Stack gap="md">
        <Group grow>
          <Select
            label={t('admin:licenses.field.customer')}
            data={(customersQuery.data?.items ?? []).map((c) => ({ value: c.id, label: c.displayName }))}
            value={customerId}
            onChange={setCustomerId}
            searchable
            required
          />
          <Select
            label={t('admin:licenses.field.product')}
            data={(productsQuery.data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            value={productId}
            onChange={setProductId}
            searchable
            required
          />
        </Group>
        <Group grow>
          <Select
            label={t('admin:licenses.field.plan')}
            data={(plansQuery.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
            value={planId}
            onChange={setPlanId}
            searchable
            required
          />
          <Select
            label={t('admin:licenses.field.type')}
            data={LICENSE_TYPES.map((tp) => ({ value: tp, label: t(`admin:licenses.type.${tp}`) }))}
            value={type}
            onChange={(v) => v && setType(v as LicenseType)}
            required
          />
        </Group>
        <Group grow>
          <Select
            label={t('admin:licenses.field.environment')}
            data={ENVIRONMENTS.map((e) => ({ value: e, label: t(`license:overview.environment.${e === 'production' ? 'production' : e === 'staging' ? 'staging' : 'development'}`) }))}
            value={environment}
            onChange={(v) => v && setEnvironment(v as LicenseEnvironment)}
            required
          />
          <NumberInput
            label={t('admin:licenses.field.gracePeriodDays')}
            value={gracePeriodDays}
            onChange={(v) => setGracePeriodDays(typeof v === 'number' ? v : '')}
            min={0}
            max={365}
          />
        </Group>
        <Group grow>
          <DateTimePicker
            label={t('admin:licenses.field.startsAt')}
            value={startsAt}
            onChange={setStartsAt}
            required
          />
          <DateTimePicker
            label={t('admin:licenses.field.expiresAt')}
            value={expiresAt}
            onChange={setExpiresAt}
            clearable
            description={t('admin:licenses.field.expiresAt.description')}
          />
        </Group>
        <MultiSelect
          label={t('admin:licenses.field.entitlements')}
          data={ENTITLEMENT_OPTIONS}
          value={entitlements}
          onChange={(v) => setEntitlements(v as EntitlementModule[])}
          searchable
          clearable
        />
        <Group grow>
          <NumberInput label={t('admin:licenses.field.maxUsers')} value={maxUsers} onChange={(v) => setMaxUsers(typeof v === 'number' ? v : '')} />
          <NumberInput label={t('admin:licenses.field.maxDevices')} value={maxDevices} onChange={(v) => setMaxDevices(typeof v === 'number' ? v : '')} />
          <NumberInput label={t('admin:licenses.field.maxDocuments')} value={maxDocuments} onChange={(v) => setMaxDocuments(typeof v === 'number' ? v : '')} />
        </Group>
        <Group grow align="flex-end">
          <Switch
            label={t('admin:licenses.field.offlineAllowed')}
            checked={offlineAllowed}
            onChange={(e) => setOfflineAllowed(e.currentTarget.checked)}
          />
          <NumberInput
            label={t('admin:licenses.field.maxOfflineDays')}
            value={maxOfflineDays}
            onChange={(v) => setMaxOfflineDays(typeof v === 'number' ? v : '')}
            disabled={!offlineAllowed}
            min={0}
            max={365}
          />
        </Group>
        <Text size="xs" c="dimmed">
          {t('admin:licenses.issue.disclaimer')}
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={issueMutation.isPending}
            disabled={!customerId || !productId || !planId || !startsAt}
            data-tour="admin.licenses.submit"
          >
            {t('admin:licenses.issue')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
