'use client';

/**
 * Smart EDMS marketing site — Demo request form (spec §7.5, §12.11).
 *
 * Submits a demo request to `POST /api/demo`. The API route validates input
 * with zod and returns a 200 on success — in production it would also enqueue
 * an email to the Smart EDMS sales team via the licensing server's webhook
 * infrastructure, but that wiring is out of scope for this task.
 *
 * Form fields:
 *   - Full name (required)
 *   - Work email (required, validated)
 *   - Company (required)
 *   - Role (optional)
 *   - Company size (select)
 *   - Country (optional)
 *   - Use case (textarea, optional)
 *   - Phone (optional)
 *
 * Client component because form state requires interactivity.
 */

import { useState, type ReactNode, type FormEvent } from 'react';
import {
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Alert,
  Text,
  Box,
} from '@mantine/core';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';

interface DemoRequestFormProps {
  readonly locale: MandatoryLocaleCode;
}

interface FormState {
  readonly name: string;
  readonly workEmail: string;
  readonly company: string;
  readonly role: string;
  readonly size: string;
  readonly country: string;
  readonly useCase: string;
  readonly phone: string;
}

const INITIAL_STATE: FormState = {
  name: '',
  workEmail: '',
  company: '',
  role: '',
  size: '',
  country: '',
  useCase: '',
  phone: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DemoRequestForm({ locale }: DemoRequestFormProps): ReactNode {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = t('demo.error.required');
    if (!form.workEmail.trim()) {
      nextErrors.workEmail = t('demo.error.required');
    } else if (!EMAIL_RE.test(form.workEmail)) {
      nextErrors.workEmail = t('demo.error.email');
    }
    if (!form.company.trim()) nextErrors.company = t('demo.error.required');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, locale }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'request failed');
      }
      setSuccess(true);
      setForm(INITIAL_STATE);
    } catch {
      setApiError(t('demo.error.api'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Alert
        icon={<CheckCircle2 size={20} />}
        color="success"
        variant="light"
        radius="md"
        style={{ marginTop: '1rem' }}
      >
        <Text size="md" fw={600} c="success.8">
          {t('demo.success')}
        </Text>
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <TextInput
          label={t('demo.field.name')}
          required
          value={form.name}
          onChange={(e) => update('name', e.currentTarget.value)}
          error={errors.name}
          autoComplete="name"
        />
        <TextInput
          label={t('demo.field.workEmail')}
          required
          type="email"
          value={form.workEmail}
          onChange={(e) => update('workEmail', e.currentTarget.value)}
          error={errors.workEmail}
          autoComplete="email"
        />
        <TextInput
          label={t('demo.field.company')}
          required
          value={form.company}
          onChange={(e) => update('company', e.currentTarget.value)}
          error={errors.company}
          autoComplete="organization"
        />
        <TextInput
          label={t('demo.field.role')}
          value={form.role}
          onChange={(e) => update('role', e.currentTarget.value)}
          autoComplete="organization-title"
        />
        <Select
          label={t('demo.field.size')}
          value={form.size || null}
          onChange={(v) => update('size', v ?? '')}
          data={[
            { value: '1-10', label: t('demo.size.1to10') },
            { value: '11-50', label: t('demo.size.11to50') },
            { value: '51-200', label: t('demo.size.51to200') },
            { value: '201-1000', label: t('demo.size.201to1000') },
            { value: '1000+', label: t('demo.size.1000plus') },
          ]}
          searchable={false}
        />
        <TextInput
          label={t('demo.field.country')}
          value={form.country}
          onChange={(e) => update('country', e.currentTarget.value)}
          autoComplete="country-name"
        />
        <TextInput
          label={t('demo.field.phone')}
          value={form.phone}
          onChange={(e) => update('phone', e.currentTarget.value)}
          type="tel"
          autoComplete="tel"
        />
        <Textarea
          label={t('demo.field.useCase')}
          placeholder={t('demo.field.useCase.placeholder')}
          value={form.useCase}
          onChange={(e) => update('useCase', e.currentTarget.value)}
          minRows={3}
        />

        {apiError && (
          <Alert
            icon={<AlertCircle size={18} />}
            color="error"
            variant="light"
            radius="md"
          >
            {apiError}
          </Alert>
        )}

        <Button
          type="submit"
          size="lg"
          variant="filled"
          color="brand"
          loading={submitting}
          fullWidth
        >
          {t('demo.submit')}
        </Button>
      </Stack>
    </Box>
  );
}
