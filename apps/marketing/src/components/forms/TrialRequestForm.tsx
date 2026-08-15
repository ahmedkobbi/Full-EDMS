'use client';

/**
 * Smart EDMS marketing site — Trial request form (spec §7.5, §12.11).
 *
 * Submits a trial request to `POST /api/trial`. The API route validates input
 * with zod and returns a 200 on success — in production it would enqueue an
 * email to the Smart EDMS sales team via the licensing server's webhook
 * infrastructure and create a trial tenant record.
 *
 * Form fields:
 *   - Full name (required)
 *   - Work email (required, validated)
 *   - Company (required)
 *   - Team size (select, required)
 *   - Country (optional)
 *   - Use case (textarea, optional)
 *   - Accept terms (required checkbox)
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
  Checkbox,
} from '@mantine/core';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { LocaleLink } from '../common/LocaleLink';

interface TrialRequestFormProps {
  readonly locale: MandatoryLocaleCode;
}

interface FormState {
  readonly name: string;
  readonly workEmail: string;
  readonly company: string;
  readonly size: string;
  readonly country: string;
  readonly useCase: string;
  readonly acceptTerms: boolean;
}

const INITIAL_STATE: FormState = {
  name: '',
  workEmail: '',
  company: '',
  size: '',
  country: '',
  useCase: '',
  acceptTerms: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TrialRequestForm({ locale }: TrialRequestFormProps): ReactNode {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = t('trial.error.required');
    if (!form.workEmail.trim()) {
      nextErrors.workEmail = t('trial.error.required');
    } else if (!EMAIL_RE.test(form.workEmail)) {
      nextErrors.workEmail = t('trial.error.email');
    }
    if (!form.company.trim()) nextErrors.company = t('trial.error.required');
    if (!form.size) nextErrors.size = t('trial.error.required');
    if (!form.acceptTerms) nextErrors.acceptTerms = t('trial.error.acceptTerms');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          workEmail: form.workEmail,
          company: form.company,
          size: form.size,
          country: form.country,
          useCase: form.useCase,
          locale,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'request failed');
      }
      setSuccess(true);
      setForm(INITIAL_STATE);
    } catch {
      setApiError(t('trial.error.api'));
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
          {t('trial.success')}
        </Text>
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <TextInput
          label={t('trial.field.name')}
          required
          value={form.name}
          onChange={(e) => update('name', e.currentTarget.value)}
          error={errors.name}
          autoComplete="name"
        />
        <TextInput
          label={t('trial.field.workEmail')}
          required
          type="email"
          value={form.workEmail}
          onChange={(e) => update('workEmail', e.currentTarget.value)}
          error={errors.workEmail}
          autoComplete="email"
        />
        <TextInput
          label={t('trial.field.company')}
          required
          value={form.company}
          onChange={(e) => update('company', e.currentTarget.value)}
          error={errors.company}
          autoComplete="organization"
        />
        <Select
          label={t('trial.field.size')}
          required
          value={form.size || null}
          onChange={(v) => update('size', v ?? '')}
          error={errors.size}
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
          label={t('trial.field.country')}
          value={form.country}
          onChange={(e) => update('country', e.currentTarget.value)}
          autoComplete="country-name"
        />
        <Textarea
          label={t('trial.field.useCase')}
          placeholder={t('trial.field.useCase.placeholder')}
          value={form.useCase}
          onChange={(e) => update('useCase', e.currentTarget.value)}
          minRows={3}
        />
        <Checkbox
          label={
            <Text size="sm" c="neutral.7">
              {t('trial.field.acceptTerms')}{' '}
              (
              <LocaleLink href="/terms" locale={locale} style={{ color: 'inherit', textDecoration: 'underline' }}>
                {t('footer.legal.terms')}
              </LocaleLink>
              {' '}&{' '}
              <LocaleLink href="/privacy" locale={locale} style={{ color: 'inherit', textDecoration: 'underline' }}>
                {t('footer.legal.privacy')}
              </LocaleLink>
              )
            </Text>
          }
          checked={form.acceptTerms}
          onChange={(e) => update('acceptTerms', e.currentTarget.checked)}
          error={errors.acceptTerms}
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
          {t('trial.submit')}
        </Button>
      </Stack>
    </Box>
  );
}
