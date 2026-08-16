'use client';

/**
 * Smart EDMS marketing site — Demo request form (spec §7.5, §12.11).
 *
 * Uses $mantine-form skill patterns: useForm with isEmail, isNotEmpty,
 * hasLength validators + getInputProps + onSubmit.
 *
 * Submits to POST /api/demo. The API route validates with zod and returns 200.
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
 */

import { type ReactNode } from 'react';
import {
  Alert, Box, Button, Select, Stack, Text, Textarea, TextInput,
} from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';

interface DemoRequestFormProps {
  readonly locale: MandatoryLocaleCode;
}

export function DemoRequestForm({ locale }: DemoRequestFormProps): ReactNode {
  const { t } = useTranslation();

  // $mantine-form skill: useForm with built-in validators
  const form = useForm({
    initialValues: {
      name: '',
      workEmail: '',
      company: '',
      role: '',
      size: '',
      country: '',
      useCase: '',
      phone: '',
    },
    validate: {
      name: isNotEmpty(t('demo.error.required', { defaultValue: 'Required' })),
      workEmail: isEmail(t('demo.error.email', { defaultValue: 'Invalid email' })),
      company: isNotEmpty(t('demo.error.required', { defaultValue: 'Required' })),
    },
    validateInputOnChange: ['workEmail'],
  });

  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = form.onSubmit(async (values) => {
    setApiError(null);
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, locale }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'request failed');
      }
      setSuccess(true);
      form.reset();
    } catch {
      setApiError(t('demo.error.api', { defaultValue: 'Failed to submit. Please try again.' }));
    }
  });

  if (success) {
    return (
      <Alert icon={<CheckCircle2 size={20} />} color="teal" variant="light" radius="md">
        <Text size="md" fw={600}>{t('demo.success', { defaultValue: 'Thank you! We will contact you shortly.' })}</Text>
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <TextInput label={t('demo.field.name', { defaultValue: 'Full name' })} required {...form.getInputProps('name')} autoComplete="name" />
        <TextInput label={t('demo.field.workEmail', { defaultValue: 'Work email' })} required type="email" {...form.getInputProps('workEmail')} autoComplete="email" />
        <TextInput label={t('demo.field.company', { defaultValue: 'Company' })} required {...form.getInputProps('company')} autoComplete="organization" />
        <TextInput label={t('demo.field.role', { defaultValue: 'Role' })} {...form.getInputProps('role')} autoComplete="organization-title" />
        <Select
          label={t('demo.field.size', { defaultValue: 'Company size' })}
          {...form.getInputProps('size')}
          data={[
            { value: '1-10', label: '1-10' },
            { value: '11-50', label: '11-50' },
            { value: '51-200', label: '51-200' },
            { value: '201-1000', label: '201-1000' },
            { value: '1000+', label: '1000+' },
          ]}
        />
        <TextInput label={t('demo.field.country', { defaultValue: 'Country' })} {...form.getInputProps('country')} autoComplete="country-name" />
        <TextInput label={t('demo.field.phone', { defaultValue: 'Phone (optional)' })} type="tel" {...form.getInputProps('phone')} autoComplete="tel" />
        <Textarea label={t('demo.field.useCase', { defaultValue: 'Use case' })} placeholder={t('demo.field.useCase.placeholder', { defaultValue: 'Tell us about your needs…' })} {...form.getInputProps('useCase')} minRows={3} />
        {apiError && (
          <Alert icon={<AlertCircle size={18} />} color="red" variant="light" radius="md">{apiError}</Alert>
        )}
        <Button type="submit" size="lg" variant="filled" loading={form.submitting} fullWidth>
          {t('demo.submit', { defaultValue: 'Request demo' })}
        </Button>
      </Stack>
    </Box>
  );
}

import { useState } from 'react';
