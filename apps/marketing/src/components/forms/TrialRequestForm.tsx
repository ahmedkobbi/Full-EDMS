'use client';

/**
 * Smart EDMS marketing site — Trial request form (spec §7.5, §12.11).
 *
 * Uses $mantine-form skill patterns: useForm with isEmail, isNotEmpty,
 * matchesField for terms acceptance validation.
 *
 * Submits to POST /api/trial. The API route validates with zod and returns 200.
 *
 * Form fields:
 *   - Full name (required)
 *   - Work email (required, validated)
 *   - Company (required)
 *   - Team size (select, required)
 *   - Country (optional)
 *   - Use case (textarea, optional)
 *   - Accept terms (required checkbox)
 */

import { type ReactNode } from 'react';
import {
  Alert, Box, Button, Checkbox, Select, Stack, Text, Textarea, TextInput,
} from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { LocaleLink } from '../common/LocaleLink';

interface TrialRequestFormProps {
  readonly locale: MandatoryLocaleCode;
}

export function TrialRequestForm({ locale }: TrialRequestFormProps): ReactNode {
  const { t } = useTranslation();

  // $mantine-form skill: useForm with validators + checkbox via getInputProps
  const form = useForm({
    initialValues: {
      name: '',
      workEmail: '',
      company: '',
      size: '',
      country: '',
      useCase: '',
      acceptTerms: false,
    },
    validate: {
      name: isNotEmpty(t('trial.error.required', { defaultValue: 'Required' })),
      workEmail: isEmail(t('trial.error.email', { defaultValue: 'Invalid email' })),
      company: isNotEmpty(t('trial.error.required', { defaultValue: 'Required' })),
      size: isNotEmpty(t('trial.error.required', { defaultValue: 'Required' })),
      acceptTerms: (v) => (v ? null : t('trial.error.acceptTerms', { defaultValue: 'You must accept the terms' })),
    },
    validateInputOnChange: ['workEmail', 'acceptTerms'],
  });

  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = form.onSubmit(async (values) => {
    setApiError(null);
    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          workEmail: values.workEmail,
          company: values.company,
          size: values.size,
          country: values.country,
          useCase: values.useCase,
          locale,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'request failed');
      }
      setSuccess(true);
      form.reset();
    } catch {
      setApiError(t('trial.error.api', { defaultValue: 'Failed to submit. Please try again.' }));
    }
  });

  if (success) {
    return (
      <Alert icon={<CheckCircle2 size={20} />} color="teal" variant="light" radius="md">
        <Text size="md" fw={600}>{t('trial.success', { defaultValue: 'Thank you! Check your email for trial instructions.' })}</Text>
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <TextInput label={t('trial.field.name', { defaultValue: 'Full name' })} required {...form.getInputProps('name')} autoComplete="name" />
        <TextInput label={t('trial.field.workEmail', { defaultValue: 'Work email' })} required type="email" {...form.getInputProps('workEmail')} autoComplete="email" />
        <TextInput label={t('trial.field.company', { defaultValue: 'Company' })} required {...form.getInputProps('company')} autoComplete="organization" />
        <Select
          label={t('trial.field.size', { defaultValue: 'Team size' })}
          required
          {...form.getInputProps('size')}
          data={[
            { value: '1-10', label: '1-10' },
            { value: '11-50', label: '11-50' },
            { value: '51-200', label: '51-200' },
            { value: '201-1000', label: '201-1000' },
            { value: '1000+', label: '1000+' },
          ]}
        />
        <TextInput label={t('trial.field.country', { defaultValue: 'Country' })} {...form.getInputProps('country')} autoComplete="country-name" />
        <Textarea label={t('trial.field.useCase', { defaultValue: 'Use case' })} placeholder={t('trial.field.useCase.placeholder', { defaultValue: 'Tell us about your needs…' })} {...form.getInputProps('useCase')} minRows={3} />
        <Checkbox
          label={
            <Text size="sm" c="neutral.7">
              {t('trial.field.acceptTerms', { defaultValue: 'I accept the' })}{' '}
              (<LocaleLink href="/terms" locale={locale} style={{ color: 'inherit', textDecoration: 'underline' }}>{t('footer.legal.terms', { defaultValue: 'Terms' })}</LocaleLink>
              {' '}&{' '}
              <LocaleLink href="/privacy" locale={locale} style={{ color: 'inherit', textDecoration: 'underline' }}>{t('footer.legal.privacy', { defaultValue: 'Privacy' })}</LocaleLink>)
            </Text>
          }
          {...form.getInputProps('acceptTerms', { type: 'checkbox' })}
        />
        {apiError && (
          <Alert icon={<AlertCircle size={18} />} color="red" variant="light" radius="md">{apiError}</Alert>
        )}
        <Button type="submit" size="lg" variant="filled" loading={form.submitting} fullWidth>
          {t('trial.submit', { defaultValue: 'Start free trial' })}
        </Button>
      </Stack>
    </Box>
  );
}

import { useState } from 'react';
