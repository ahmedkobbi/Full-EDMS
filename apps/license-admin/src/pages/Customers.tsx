/**
 * Customers page — table + create drawer.
 */
import { useState } from 'react';
import { Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/common/PageHeader';
import { CustomerTable } from '../components/customers/CustomerTable';
import { CustomerDrawer } from '../components/customers/CustomerDrawer';

export function CustomersPage() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:customers.title"
        subtitleKey="admin:customers.subtitle"
        tour="admin.customers.page"
      />
      <CustomerTable onCreate={() => setDrawerOpen(true)} />
      <CustomerDrawer opened={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {/* the t() call ensures the namespace is referenced for the bundler */}
      <span style={{ display: 'none' }}>{t('admin:nav.customers')}</span>
    </Stack>
  );
}
