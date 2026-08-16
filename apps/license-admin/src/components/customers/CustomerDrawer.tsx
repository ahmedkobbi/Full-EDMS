/**
 * Customer drawer — create / edit a customer record.
 *
 * Uses Mantine's form hook for validation. Fields: legalName (required),
 * displayName (required), industry, website.
 */
import { useEffect } from 'react';
import { Button, Drawer, Group, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import type { Customer } from '@smart-edms/types';
import {
  type CustomerInput,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '../../api/hooks';

interface CustomerDrawerProps {
  readonly opened: boolean;
  readonly onClose: () => void;
  /** When set, the drawer is in "edit" mode; otherwise "create". */
  readonly customer?: Customer | null;
}

export function CustomerDrawer({ opened, onClose, customer }: CustomerDrawerProps) {
  const { t } = useTranslation();
  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();

  const form = useForm<CustomerInput>({
    initialValues: {
      legalName: '',
      displayName: '',
      industry: '',
      website: '',
    },
    validate: {
      legalName: (v) => ((v ?? '').trim().length < 2 ? t('common:form.minLength', { min: 2 }) : null),
      displayName: (v) => ((v ?? '').trim().length < 2 ? t('common:form.minLength', { min: 2 }) : null),
      website: (v) => {
        if (!v) {return null;}
        try {
           
          new URL(v);
          return null;
        } catch {
          return t('common:form.url');
        }
      },
    },
  });

  useEffect(() => {
    if (opened) {
      form.setValues({
        legalName: customer?.legalName ?? '',
        displayName: customer?.displayName ?? '',
        industry: customer?.industry ?? '',
        website: customer?.website ?? '',
      });
      form.resetDirty();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, [opened, customer]);

  const handleSubmit = async (values: CustomerInput): Promise<void> => {
    const payload: CustomerInput = {
      ...values,
      industry: values.industry?.trim() || null,
      website: values.website?.trim() || null,
    };
    try {
      if (customer) {
        await updateMutation.mutateAsync({ id: customer.id, body: payload });
        notifications.show({
          title: t('common:toast.success.title'),
          message: t('common:toast.updated'),
          color: 'success',
        });
      } else {
        await createMutation.mutateAsync(payload);
        notifications.show({
          title: t('common:toast.success.title'),
          message: t('common:toast.created'),
          color: 'success',
        });
      }
      onClose();
    } catch {
      // Error surfaced by the API client's interceptor.
    }
  };

  const isEdit = !!customer;
  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t(isEdit ? 'admin:customers.edit.title' : 'admin:customers.create.title')}
      position="right"
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t('admin:customers.field.legalName')}
            placeholder={t('admin:customers.field.legalName.placeholder')}
            required
            data-tour="admin.customers.field.legalName"
            {...form.getInputProps('legalName')}
          />
          <TextInput
            label={t('admin:customers.field.displayName')}
            placeholder={t('admin:customers.field.displayName.placeholder')}
            required
            {...form.getInputProps('displayName')}
          />
          <TextInput
            label={t('admin:customers.field.industry')}
            placeholder={t('admin:customers.field.industry.placeholder')}
            {...form.getInputProps('industry')}
          />
          <TextInput
            label={t('admin:customers.field.website')}
            placeholder="https://example.com"
            {...form.getInputProps('website')}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              {t('common:action.cancel')}
            </Button>
            <Button type="submit" loading={pending} data-tour="admin.customers.submit">
              {t(isEdit ? 'common:action.update' : 'common:action.create')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
