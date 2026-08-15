/**
 * Signing keys page.
 */
import { Stack } from '@mantine/core';
import { PageHeader } from '../components/common/PageHeader';
import { SigningKeyList } from '../components/signing-keys/SigningKeyList';

export function SigningKeysPage() {
  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:signingKeys.title"
        subtitleKey="admin:signingKeys.subtitle"
        tour="admin.signingKeys.page"
      />
      <SigningKeyList />
    </Stack>
  );
}
