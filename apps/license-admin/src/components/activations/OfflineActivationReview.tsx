/**
 * Offline activation review — admin uploads a `.sedmsreq` file, reviews
 * the parsed request, picks a customer + plan, then issues a `.sedmslic`
 * artifact that the admin downloads and ships back to the customer.
 *
 * Spec ref: §12.6 (offline activation request format), §12.8 (offline
 * activation flow), §12.5 (signed license artifact).
 *
 * Flow:
 *   1. Admin drags / selects a `.sedmsreq` file.
 *   2. The panel parses the JSON inside the file (parseOfflineRequest from
 *      @smart-edms/license-core would do cryptographic validation; here
 *      we just parse the JSON so the panel has no dependency on the
 *      license-core package).
 *   3. The panel POSTs the raw request to `/v1/activate/offline-request`
 *      (intake). The server stores it as `pending` and returns the
 *      persisted record with its `id`.
 *   4. The admin picks a customer + plan, optionally a license type and
 *      validity window.
 *   5. The admin clicks "Issue license" — the panel calls
 *      `/v1/activate/offline-issue` with the request id + license params.
 *      The server signs the license and returns a
 *      `OfflineActivationCertificate` containing the `.sedmslic` artifact.
 *   6. The panel offers a "Download .sedmslic" button that downloads the
 *      artifact as a file.
 *   7. The admin can also "Reject" the request — calls
 *      `/v1/activate/offline-reject/:id` with a reason.
 */
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

import {
  Download,
  FileCheck,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { OfflineActivationRequest, OfflineRequest } from '@smart-edms/types';
import {
  downloadOfflineLicense,
  useCustomersQuery,
  useIntakeOfflineRequestMutation,
  useIssueOfflineLicenseMutation,
  useOfflineRequestsQuery,
  useProductPlansQuery,
  useRejectOfflineRequestMutation,
} from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';
import { EmptyState } from '../common/EmptyState';

export function OfflineActivationReview() {
  const { t } = useTranslation();
  const [parsed, setParsed] = useState<OfflineRequest | null>(null);
  const [persisted, setPersisted] = useState<OfflineActivationRequest | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<{ id: string; artifact: unknown } | null>(null);

  // Issue form state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [gracePeriodDays, setGracePeriodDays] = useState<number | ''>(14);

  const intakeMutation = useIntakeOfflineRequestMutation();
  const issueMutation = useIssueOfflineLicenseMutation();
  const rejectMutation = useRejectOfflineRequestMutation();

  const customersQuery = useCustomersQuery({ limit: 100 });
  // The product is fixed by the request; we fetch its plans once we have
  // a persisted record (which carries the productId).
  const productId = persisted?.productId ?? parsed?.productId ?? null;
  const plansQuery = useProductPlansQuery(productId ?? undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File): Promise<void> => {
    setParseError(null);
    setParsed(null);
    setPersisted(null);
    setCertificate(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const obj = JSON.parse(text) as OfflineRequest;
      if (obj.type !== 'sedms.request') {
        setParseError(t('admin:offlineActivations.error.notSedmsreq'));
        return;
      }
      setParsed(obj);

      // Intake the request on the server. The server validates the
      // structure, persists it, and returns the record with an `id`.
      const record = await intakeMutation.mutateAsync({ rawRequest: obj });
      setPersisted(record);
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('admin:offlineActivations.intake.success'),
        color: 'success',
      });
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : t('admin:offlineActivations.error.parseFailed'),
      );
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {void handleFile(file);}
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {void handleFile(file);}
  };

  const handleIssue = async (): Promise<void> => {
    if (!persisted || !customerId || !planId) {return;}
    try {
      const cert = await issueMutation.mutateAsync({
        requestId: persisted.id,
        customerId,
        planId,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        gracePeriodDays: gracePeriodDays === '' ? 14 : gracePeriodDays,
      });
      setCertificate({ id: cert.id, artifact: cert.artifact });
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('admin:offlineActivations.issue.success'),
        color: 'success',
      });
    } catch {
      // Error surfaced by the API client.
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!persisted) {return;}
    try {
      await rejectMutation.mutateAsync({
        id: persisted.id,
        reason: t('admin:offlineActivations.reject.defaultReason'),
      });
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('admin:offlineActivations.reject.success'),
        color: 'success',
      });
      setPersisted(null);
      setParsed(null);
      setFileName('');
    } catch {
      // Error surfaced by the API client.
    }
  };

  const handleDownload = async (): Promise<void> => {
    if (!certificate) {return;}
    try {
      const blob = await downloadOfflineLicense(certificate.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `license-${certificate.id}.sedmslic`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // If the download endpoint is not yet available, fall back to
      // building the file from the in-memory artifact.
      if (certificate.artifact) {
        const blob = new Blob([JSON.stringify(certificate.artifact, null, 2)], {
          type: 'application/x-sedms-license',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `license-${certificate.id}.sedmslic`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const reset = (): void => {
    setParsed(null);
    setPersisted(null);
    setCertificate(null);
    setFileName('');
    setParseError(null);
    setCustomerId(null);
    setPlanId(null);
    setExpiresAt(null);
    setGracePeriodDays(14);
    if (fileInputRef.current) {fileInputRef.current.value = '';}
  };

  return (
    <Stack gap="lg">
      {/* Step 1 — Upload */}
      <Stack gap="sm">
        <Text size="sm" fw={600}>{t('admin:offlineActivations.step.upload')}</Text>
        <Box
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          data-tour="admin.offlineActivations.dropzone"
          style={{
            border: '2px dashed var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--mantine-color-body)',
            transition: 'border-color 0.15s ease',
          }}
        >
          <Group justify="center" gap="sm" style={{ pointerEvents: 'none' }}>
            <Upload size={32} aria-hidden="true" />
            <Stack gap={4}>
              <Text size="sm" inline fw={500}>
                {t('admin:offlineActivations.dropzone.title')}
              </Text>
              <Text size="xs" c="dimmed" inline>
                {t('admin:offlineActivations.dropzone.subtitle')}
              </Text>
            </Stack>
          </Group>
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sedmsreq,.json,application/json,application/x-sedms-request"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        {fileName && (
          <Text size="xs" c="dimmed">
            {t('admin:offlineActivations.fileSelected')}: <Code>{fileName}</Code>
          </Text>
        )}
        {parseError && (
          <Alert color="error" variant="light" icon={<X size={16} />}>
            {parseError}
          </Alert>
        )}
      </Stack>

      {/* Step 2 — Review the parsed request */}
      {parsed && (
        <>
          <Divider label={t('admin:offlineActivations.step.review')} labelPosition="center" />
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Field label={t('admin:offlineActivations.field.requestId')} value={<Code>{parsed.requestId}</Code>} />
            <Field label={t('admin:offlineActivations.field.productId')} value={<Code>{parsed.productId}</Code>} />
            <Field label={t('admin:offlineActivations.field.deploymentId')} value={<Code>{parsed.deploymentId}</Code>} />
            <Field label={t('admin:offlineActivations.field.appVersion')} value={parsed.appVersion} />
            <Field label={t('admin:offlineActivations.field.os')} value={parsed.os} />
            <Field label={t('admin:offlineActivations.field.arch')} value={parsed.arch} />
            <Field label={t('admin:offlineActivations.field.contactEmail')} value={parsed.contactEmail ?? '—'} />
            <Field label={t('admin:offlineActivations.field.generatedAt')} value={<LocaleAwareDate value={parsed.generatedAt} variant="datetime" />} />
            <Field label={t('admin:offlineActivations.field.fingerprint')} value={<Code>{parsed.machineFingerprint.fingerprintHash.slice(0, 24)}…</Code>} />
            <Field label={t('admin:offlineActivations.field.installationKey')} value={<Code>{parsed.installationPublicKey.slice(0, 24)}…</Code>} />
          </SimpleGrid>
        </>
      )}

      {/* Step 3 — Issue or reject */}
      {persisted && !certificate && (
        <>
          <Divider label={t('admin:offlineActivations.step.issue')} labelPosition="center" />
          <Alert color="info" variant="light" icon={<ShieldCheck size={16} />}>
            {t('admin:offlineActivations.issue.disclaimer')}
          </Alert>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Select
              label={t('admin:licenses.field.customer')}
              data={(customersQuery.data?.items ?? []).map((c) => ({ value: c.id, label: c.displayName }))}
              value={customerId}
              onChange={setCustomerId}
              searchable
              required
            />
            <Select
              label={t('admin:licenses.field.plan')}
              data={(plansQuery.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
              value={planId}
              onChange={setPlanId}
              searchable
              required
            />
            <DateTimePicker
              label={t('admin:licenses.field.expiresAt')}
              value={expiresAt}
              onChange={setExpiresAt}
              clearable
              description={t('admin:licenses.field.expiresAt.description')}
            />
            <NumberInput
              label={t('admin:licenses.field.gracePeriodDays')}
              value={gracePeriodDays}
              onChange={(v) => setGracePeriodDays(typeof v === 'number' ? v : '')}
              min={0}
              max={365}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="subtle" color="error" onClick={() => void handleReject()} loading={rejectMutation.isPending}>
              {t('admin:offlineActivations.reject.title')}
            </Button>
            <Button
              onClick={() => void handleIssue()}
              loading={issueMutation.isPending}
              disabled={!customerId || !planId}
              data-tour="admin.offlineActivations.issue"
              leftSection={<ShieldCheck size={14} aria-hidden="true" />}
            >
              {t('admin:offlineActivations.issue.title')}
            </Button>
          </Group>
        </>
      )}

      {/* Step 4 — Download */}
      {certificate && (
        <>
          <Divider label={t('admin:offlineActivations.step.download')} labelPosition="center" />
          <Alert color="success" variant="light" icon={<FileCheck size={16} />}>
            {t('admin:offlineActivations.download.ready')}
          </Alert>
          <Group justify="center">
            <ThemeIcon size={64} radius="xl" color="success" variant="light">
              <FileCheck size={32} aria-hidden="true" />
            </ThemeIcon>
          </Group>
          <Group justify="center">
            <Badge size="lg" variant="light" color="success">
              {t('admin:offlineActivations.download.artifactReady')}
            </Badge>
          </Group>
          <Group justify="center">
            <Button
              size="md"
              leftSection={<Download size={16} aria-hidden="true" />}
              onClick={() => void handleDownload()}
              data-tour="admin.offlineActivations.download"
            >
              {t('admin:offlineActivations.download.button')}
            </Button>
            <Button variant="subtle" onClick={reset}>
              {t('admin:offlineActivations.uploadAnother')}
            </Button>
          </Group>
        </>
      )}
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

// Used by the OfflineActivationsPage to list recent requests alongside the
// review panel. The list shows pending requests so the admin can pick up
// where they left off.
export function RecentOfflineRequests(): React.ReactElement {
  const { t } = useTranslation();
  const query = useOfflineRequestsQuery({ status: 'pending', limit: 10 });
  if (query.isLoading) {return <EmptyState illustration="offline" titleKey="common:status.loading" />;}
  const items = query.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        illustration="offline"
        titleKey="admin:offlineActivations.recent.empty"
        subtitleKey="admin:offlineActivations.recent.emptySubtitle"
      />
    );
  }
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>{t('admin:offlineActivations.recent.title')}</Text>
      {items.map((r) => (
        <Box
          key={r.id}
          p="sm"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <Group justify="space-between">
            <Stack gap={2}>
              <Text size="sm" fw={500}>{r.deploymentId.slice(0, 16)}…</Text>
              <Text size="xs" c="dimmed">
                {t('admin:offlineActivations.field.contactEmail')}: {r.contactEmail ?? '—'}
              </Text>
            </Stack>
            <Badge color="warning" variant="light">{r.status}</Badge>
          </Group>
        </Box>
      ))}
    </Stack>
  );
}
