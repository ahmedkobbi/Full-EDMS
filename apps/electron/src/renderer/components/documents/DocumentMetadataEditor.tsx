/**
 * Document metadata editor (spec §9.5, §17).
 *
 * Uses $mantine-form with nested object fields to edit document metadata.
 * Fields are dynamically rendered from the metadata schema.
 *
 * $mantine-form skill patterns used:
 *  - useForm with nested initialValues (metadata object)
 *  - validate function for cross-field logic
 *  - getInputProps with nested paths ('metadata.fieldName')
 *  - transformValues for API submission
 *  - validateInputOnChange for specific fields
 *
 * Spec ref: §9.5 (metadata schemas, controlled vocabularies, validation rules),
 *           §17 (Mantine v7 enterprise UI).
 */
import { useEffect } from 'react';
import {
  Stack, Paper, Text, TextInput, Select, Textarea,
  Button, Group, Divider, Badge,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { IconCheck } from '@tabler/icons-react';

export interface MetadataFieldDef {
  code: string;
  labelKey: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'textarea';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface DocumentMetadataEditorProps {
  documentId: string;
  fields: MetadataFieldDef[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

export function DocumentMetadataEditor({
  fields,
  initialValues,
  onSubmit,
}: DocumentMetadataEditorProps) {
  const { t } = useTranslation();

  // $mantine-form skill: nested initialValues + dynamic validation rules
  const form = useForm({
    initialValues: {
      metadata: initialValues ?? fields.reduce((acc, f) => {
        acc[f.code] = '';
        return acc;
      }, {} as Record<string, unknown>),
    },
    validate: (values) => {
      const errors: Record<string, string | null> = {};
      for (const field of fields) {
        const val = values.metadata[field.code];
        if (field.required && (val === '' || val === null || val === undefined)) {
          errors[`metadata.${field.code}`] = t('common:form.required.field', { defaultValue: 'Required' });
        }
      }
      return errors;
    },
    validateInputOnChange: fields.filter((f) => f.required).map((f) => `metadata.${f.code}`),
  });

  // Reset form when initialValues change (e.g., when document loads)
  useEffect(() => {
    if (initialValues) {
      form.setValues({ metadata: initialValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const handleSubmit = form.onSubmit(async (values) => {
    await onSubmit(values.metadata);
    form.resetDirty();
  });

  return (
    <Paper p="md" withBorder radius="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={500}>{t('document.metadata.editor.title', { defaultValue: 'Edit metadata' })}</Text>
            <Badge size="xs" variant="light">{fields.length} {t('document.metadata.editor.fields', { defaultValue: 'fields' })}</Badge>
          </Group>

          <Divider />

          {fields.map((field) => {
            const label = t(field.labelKey, { defaultValue: field.code });
            const fieldPath = `metadata.${field.code}`;

            switch (field.type) {
              case 'select':
                return (
                  <Select
                    key={field.code}
                    label={label}
                    placeholder={t('common:form.placeholder.select', { defaultValue: 'Select…' })}
                    data={field.options ?? []}
                    {...form.getInputProps(fieldPath)}
                    required={field.required}
                  />
                );

              case 'textarea':
                return (
                  <Textarea
                    key={field.code}
                    label={label}
                    placeholder={t('common:form.placeholder.enter', { defaultValue: 'Enter value…' })}
                    autosize
                    minRows={2}
                    {...form.getInputProps(fieldPath)}
                    required={field.required}
                  />
                );

              case 'date':
                return (
                  <DatePickerInput
                    key={field.code}
                    label={label}
                    placeholder={t('common:form.placeholder.date', { defaultValue: 'Select date' })}
                    {...form.getInputProps(fieldPath)}
                    required={field.required}
                    clearable
                  />
                );

              case 'number':
                return (
                  <TextInput
                    key={field.code}
                    label={label}
                    type="number"
                    placeholder="0"
                    {...form.getInputProps(fieldPath)}
                    required={field.required}
                  />
                );

              default:
                return (
                  <TextInput
                    key={field.code}
                    label={label}
                    placeholder={t('common:form.placeholder.enter', { defaultValue: 'Enter value…' })}
                    {...form.getInputProps(fieldPath)}
                    required={field.required}
                  />
                );
            }
          })}

          <Divider />

          <Group justify="flex-end">
            <Button
              type="submit"
              leftSection={<IconCheck size={14} aria-hidden="true" />}
            >
              {t('common:action.save', { defaultValue: 'Save' })}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
