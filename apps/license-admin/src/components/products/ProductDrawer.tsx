/**
 * Product drawer — create a new product.
 *
 * Fields: code (required, slug-style), name (required), version (defaults
 * to '1.0.0'), description (optional).
 */
import { useEffect } from 'react';
import { Button, Drawer, Group, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import {
  type ProductInput,
  useCreateProductMutation,
} from '../../api/hooks';

interface ProductDrawerProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function ProductDrawer({ opened, onClose }: ProductDrawerProps) {
  const { t } = useTranslation();
  const createMutation = useCreateProductMutation();

  const form = useForm<ProductInput>({
    initialValues: {
      code: '',
      name: '',
      description: '',
      version: '1.0.0',
    },
    validate: {
      code: (v) => ((v ?? '').trim().length < 2 ? t('common:form.minLength', { min: 2 }) : null),
      name: (v) => ((v ?? '').trim().length < 2 ? t('common:form.minLength', { min: 2 }) : null),
      version: (v) => ((v ?? '').trim().length < 1 ? t('common:form.required.field') : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
    }
     
  }, [opened]);

  const handleSubmit = async (values: ProductInput): Promise<void> => {
    const payload: ProductInput = {
      ...values,
      description: values.description?.trim() || null,
    };
    try {
      await createMutation.mutateAsync(payload);
      notifications.show({
        title: t('common:toast.success.title'),
        message: t('common:toast.created'),
        color: 'success',
      });
      onClose();
    } catch {
      // Error surfaced by the API client.
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t('admin:products.create.title')}
      position="right"
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t('admin:products.field.code')}
            placeholder="core-edms"
            required
            description={t('admin:products.field.code.description')}
            data-tour="admin.products.field.code"
            {...form.getInputProps('code')}
          />
          <TextInput
            label={t('admin:products.field.name')}
            placeholder={t('admin:products.field.name.placeholder')}
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label={t('admin:products.field.version')}
            placeholder="1.0.0"
            required
            {...form.getInputProps('version')}
          />
          <Textarea
            label={t('admin:products.field.description')}
            placeholder={t('admin:products.field.description.placeholder')}
            autosize
            minRows={2}
            {...form.getInputProps('description')}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              {t('common:action.cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending} data-tour="admin.products.submit">
              {t('common:action.create')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
