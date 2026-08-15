/**
 * Products page — table + create drawer.
 */
import { useState } from 'react';
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { ProductTable } from '../components/products/ProductTable';
import { ProductDrawer } from '../components/products/ProductDrawer';

export function ProductsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:products.title"
        subtitleKey="admin:products.subtitle"
        tour="admin.products.page"
      />
      <ProductTable onCreate={() => setDrawerOpen(true)} />
      <ProductDrawer opened={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Stack>
  );
}
