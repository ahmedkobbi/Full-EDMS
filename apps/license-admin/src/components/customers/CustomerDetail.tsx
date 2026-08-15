/**
 * Customer detail panel — shows the customer record, contacts, and links
 * to its licenses / activations / trials / webhooks / API keys.
 *
 * Contacts are listed inline with an "add contact" affordance.
 */
import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  SimpleGrid,
  Divider,
  ActionIcon,
  Table,
  Anchor,
} from '@mantine/core';
import { Plus, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Customer, Contact } from '@smart-edms/types';
import {
  useCustomerContactsQuery,
  useAddContactMutation,
} from '../../api/hooks';
import { LocaleAwareDate } from '../common/LocaleAwareDate';

interface CustomerDetailProps {
  readonly customer: Customer;
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const contactsQuery = useCustomerContactsQuery(customer.id);
  const addContactMutation = useAddContactMutation();

  const contacts: Contact[] = contactsQuery.data ?? [];

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>{t('admin:customers.field.legalName')}</Text>
          <Text size="sm">{customer.legalName}</Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>{t('admin:customers.field.displayName')}</Text>
          <Text size="sm">{customer.displayName}</Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>{t('admin:customers.field.industry')}</Text>
          <Text size="sm">{customer.industry ?? '—'}</Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>{t('admin:customers.field.website')}</Text>
          {customer.website ? (
            <Anchor href={customer.website} target="_blank" rel="noreferrer noopener" size="sm">
              {customer.website}
            </Anchor>
          ) : (
            <Text size="sm">—</Text>
          )}
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>{t('common:label.created')}</Text>
          <Text size="sm">
            <LocaleAwareDate value={customer.createdAt} variant="datetime" />
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>{t('common:label.updated')}</Text>
          <Text size="sm">
            <LocaleAwareDate value={customer.updatedAt} variant="datetime" />
          </Text>
        </Stack>
      </SimpleGrid>

      <Divider label={t('admin:customers.related')} labelPosition="center" />

      <Group gap="sm">
        <Button variant="light" onClick={() => navigate(`/licenses?customerId=${customer.id}`)}>
          {t('admin:nav.licenses')}
        </Button>
        <Button variant="light" onClick={() => navigate(`/trials?customerId=${customer.id}`)}>
          {t('admin:nav.trials')}
        </Button>
        <Button variant="light" onClick={() => navigate(`/webhooks?customerId=${customer.id}`)}>
          {t('admin:nav.webhooks')}
        </Button>
        <Button variant="light" onClick={() => navigate(`/api-keys?customerId=${customer.id}`)}>
          {t('admin:nav.apiKeys')}
        </Button>
      </Group>

      <Divider label={t('admin:customers.contacts.title')} labelPosition="center" />

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {t('admin:customers.contacts.count', { count: contacts.length })}
        </Text>
        <Button
          size="xs"
          variant="light"
          leftSection={<Plus size={14} aria-hidden="true" />}
          onClick={() => setAdding(true)}
        >
          {t('admin:customers.contacts.add')}
        </Button>
      </Group>

      {adding && (
        <AddContactInline
          customerId={customer.id}
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
          saving={addContactMutation.isPending}
          onSave={async (body) => {
            await addContactMutation.mutateAsync({ customerId: customer.id, body });
          }}
        />
      )}

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('admin:customers.contacts.column.name')}</Table.Th>
            <Table.Th>{t('admin:customers.contacts.column.email')}</Table.Th>
            <Table.Th>{t('admin:customers.contacts.column.phone')}</Table.Th>
            <Table.Th>{t('admin:customers.contacts.column.role')}</Table.Th>
            <Table.Th>{t('admin:customers.contacts.column.primary')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {contacts.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5} style={{ textAlign: 'center', opacity: 0.6 }}>
                {t('admin:customers.contacts.empty')}
              </Table.Td>
            </Table.Tr>
          )}
          {contacts.map((c) => (
            <Table.Tr key={c.id}>
              <Table.Td>{c.fullName}</Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <Mail size={12} aria-hidden="true" />
                  <Anchor href={`mailto:${c.email}`} size="sm">{c.email}</Anchor>
                </Group>
              </Table.Td>
              <Table.Td>
                {c.phone ? (
                  <Group gap={4}>
                    <Phone size={12} aria-hidden="true" />
                    <Text size="sm">{c.phone}</Text>
                  </Group>
                ) : '—'}
              </Table.Td>
              <Table.Td>{c.role ?? '—'}</Table.Td>
              <Table.Td>{c.primary ? <Text size="sm" c="success" fw={500}>✓</Text> : '—'}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

interface AddContactInlineProps {
  readonly customerId: string;
  readonly onCancel: () => void;
  readonly onSaved: () => void;
  readonly saving: boolean;
  readonly onSave: (body: { fullName: string; email: string; phone?: string | null; role?: string | null; primary?: boolean }) => Promise<void>;
}

function AddContactInline({ onCancel, onSaved, saving, onSave }: AddContactInlineProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [primary, setPrimary] = useState(false);

  return (
    <Stack gap="sm" p="md" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)' }}>
      <Group gap="sm" grow>
        <input
          placeholder={t('admin:customers.contacts.field.name')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder={t('admin:customers.contacts.field.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder={t('admin:customers.contacts.field.phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder={t('admin:customers.contacts.field.role')}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={inputStyle}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
          {t('admin:customers.contacts.column.primary')}
        </label>
      </Group>
      <Group justify="flex-end">
        <ActionIcon variant="subtle" color="gray" onClick={onCancel} aria-label={t('common:action.cancel')}>
          {t('common:action.cancel')}
        </ActionIcon>
        <Button
          size="xs"
          loading={saving}
          disabled={!fullName || !email}
          onClick={async () => {
            await onSave({
              fullName,
              email,
              phone: phone || null,
              role: role || null,
              primary,
            });
            onSaved();
          }}
        >
          {t('common:action.save')}
        </Button>
      </Group>
    </Stack>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 'var(--mantine-radius-sm)',
  border: '1px solid var(--mantine-color-default-border)',
  fontSize: 13,
  background: 'var(--mantine-color-body)',
  color: 'var(--mantine-color-text)',
};
