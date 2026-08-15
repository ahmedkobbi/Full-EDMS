/**
 * Admin users page (spec §12.1, §12.10).
 *
 * Lists all admin users with their roles, MFA status, last login.
 * Super admins can create, suspend, and delete other admins.
 *
 * Spec ref: §12.10 (admin authentication with MFA, role-based access).
 */
import { useState } from 'react';
import { Stack, Table, Badge, Group, Button, Modal, TextInput, Select, ActionIcon, Text, Card } from '@mantine/core';
import { IconPlus, IconBan, IconTrash, IconShieldCheck, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  useAdminUsersQuery,
  useCreateAdminUserMutation,
  useSuspendAdminUserMutation,
  useDeleteAdminUserMutation,
  type AdminUser,
} from '../api/hooks';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingState } from '@smart-edms/ui';
import { ErrorState } from '@smart-edms/ui';
import { EmptyState } from '@smart-edms/ui';
import { LocaleAwareDate } from '@smart-edms/ui';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const query = useAdminUsersQuery();

  return (
    <Stack gap="lg">
      <PageHeader
        titleKey="admin:adminUsers.title"
        subtitleKey="admin:adminUsers.subtitle"
        tour="admin.adminUsers.page"
      />

      <Group justify="space-between">
        <Button
          variant="light"
          size="xs"
          leftSection={<IconRefresh size={14} aria-hidden="true" />}
          onClick={() => query.refetch()}
          loading={query.isFetching}
        >
          {t('common:action.refresh', { defaultValue: 'Refresh' })}
        </Button>
        <Button leftSection={<IconPlus size={14} aria-hidden="true" />} onClick={() => setCreateOpen(true)}>
          {t('admin:adminUsers.add', { defaultValue: 'Add admin user' })}
        </Button>
      </Group>

      {query.isLoading ? (
        <LoadingState variant="skeleton" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState
          illustration="generic"
          titleKey="admin:adminUsers.empty.title"
          subtitleKey="admin:adminUsers.empty.subtitle"
        />
      ) : (
        <Card withBorder padding={0} radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('admin:adminUsers.name', { defaultValue: 'Name' })}</Table.Th>
                <Table.Th>{t('admin:adminUsers.email', { defaultValue: 'Email' })}</Table.Th>
                <Table.Th>{t('admin:adminUsers.roles', { defaultValue: 'Roles' })}</Table.Th>
                <Table.Th>{t('admin:adminUsers.mfa', { defaultValue: 'MFA' })}</Table.Th>
                <Table.Th>{t('admin:adminUsers.status', { defaultValue: 'Status' })}</Table.Th>
                <Table.Th>{t('admin:adminUsers.lastLogin', { defaultValue: 'Last login' })}</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {query.data.map((user: AdminUser) => (
                <AdminUserRow key={user.id} user={user} />
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <CreateAdminUserModal opened={createOpen} onClose={() => setCreateOpen(false)} />
    </Stack>
  );
}

function AdminUserRow({ user }: { user: AdminUser }) {
  const { t } = useTranslation();
  const suspend = useSuspendAdminUserMutation();
  const deleteAdmin = useDeleteAdminUserMutation();

  const roleColors: Record<string, string> = {
    super_admin: 'red',
    admin: 'blue',
    support: 'teal',
    read_only: 'gray',
  };

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500}>{user.firstName} {user.lastName}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{user.email}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          {user.roles.map((role) => (
            <Badge key={role} size="xs" color={roleColors[role] ?? 'gray'} variant="light">
              {role}
            </Badge>
          ))}
        </Group>
      </Table.Td>
      <Table.Td>
        {user.mfaEnabled ? (
          <Badge size="xs" color="teal" variant="filled" leftSection={<IconShieldCheck size={10} />}>
            {t('common:status.enabled', { defaultValue: 'Enabled' })}
          </Badge>
        ) : (
          <Badge size="xs" color="red" variant="light">
            {t('common:status.disabled', { defaultValue: 'Disabled' })}
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Badge size="xs" color={user.isActive ? 'teal' : 'red'} variant={user.isActive ? 'filled' : 'light'}>
          {user.isActive ? t('common:status.active', { defaultValue: 'Active' }) : t('common:status.suspended', { defaultValue: 'Suspended' })}
        </Badge>
      </Table.Td>
      <Table.Td>
        {user.lastLoginAt ? (
          <LocaleAwareDate value={user.lastLoginAt} size="xs" c="dimmed" />
        ) : (
          <Text size="xs" c="dimmed">—</Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          {user.isActive && (
            <ActionIcon
              size="sm"
              color="orange"
              variant="subtle"
              onClick={() => suspend.mutate(user.id)}
              loading={suspend.isPending}
              title={t('admin:adminUsers.suspend', { defaultValue: 'Suspend' })}
            >
              <IconBan size={14} aria-hidden="true" />
            </ActionIcon>
          )}
          <ActionIcon
            size="sm"
            color="red"
            variant="subtle"
            onClick={() => {
              if (confirm(t('admin:adminUsers.confirmDelete', { defaultValue: 'Delete this admin user?' }))) {
                deleteAdmin.mutate(user.id);
              }
            }}
            loading={deleteAdmin.isPending}
            title={t('common:action.delete', { defaultValue: 'Delete' })}
          >
            <IconTrash size={14} aria-hidden="true" />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

function CreateAdminUserModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateAdminUserMutation();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string | null>('admin');

  const handleSubmit = () => {
    if (!email || !firstName || !lastName || !password || !role) return;
    create.mutate(
      { email, firstName, lastName, password, roles: [role] },
      {
        onSuccess: () => {
          setEmail(''); setFirstName(''); setLastName(''); setPassword(''); setRole('admin');
          onClose();
        },
      },
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('admin:adminUsers.create', { defaultValue: 'Create admin user' })} size="md">
      <Stack gap="md">
        <TextInput label={t('admin:adminUsers.field.email', { defaultValue: 'Email' })} required value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <Group grow>
          <TextInput label={t('admin:adminUsers.field.firstName', { defaultValue: 'First name' })} required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <TextInput label={t('admin:adminUsers.field.lastName', { defaultValue: 'Last name' })} required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Group>
        <TextInput label={t('admin:adminUsers.field.password', { defaultValue: 'Password (min 12 chars)' })} required type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={password.length > 0 && password.length < 12 ? t('admin:adminUsers.error.passwordLength', { defaultValue: 'Must be at least 12 characters' }) : null} />
        <Select label={t('admin:adminUsers.field.role', { defaultValue: 'Role' })} required value={role} onChange={setRole} data={[
          { value: 'super_admin', label: 'Super Admin' },
          { value: 'admin', label: 'Admin' },
          { value: 'support', label: 'Support' },
          { value: 'read_only', label: 'Read Only' },
        ]} />
        <Button onClick={handleSubmit} loading={create.isPending} disabled={!email || !firstName || !lastName || !password || password.length < 12 || !role}>
          {t('common:action.create', { defaultValue: 'Create' })}
        </Button>
      </Stack>
    </Modal>
  );
}
