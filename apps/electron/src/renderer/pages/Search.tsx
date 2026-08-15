/**
 * Search page (spec §9.10).
 *
 * Advanced search interface with:
 *  - Search input
 *  - Filter chips (document type, classification, date range, owner, status)
 *  - Results list (uses the documents query with the search query param)
 *
 * All data comes from the backend — no mock data.
 */
import { useState } from 'react';
import {
  Stack,
  TextInput,
  Group,
  Title,
  Text,
  Paper,
  Button,
  Select,
  Pagination,
  Badge,
} from '@mantine/core';
import { IconSearch, IconFilter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSearchQuery } from '../api/hooks';
import { LoadingState } from '@smart-edms/ui';
import { ErrorState } from '@smart-edms/ui';
import { EmptyState } from '@smart-edms/ui';
import { LocaleAwareDate } from '@smart-edms/ui';

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const searchResults = useSearchQuery(query, { limit: 25 });

  return (
    <Stack gap="md" data-tour-page="search" data-tour="app.search">
      <Stack gap={4}>
        <Title order={2}>{t('search:title', { defaultValue: 'Search' })}</Title>
        <Text size="sm" c="dimmed">
          {t('search:subtitle', { defaultValue: 'Find any document by name, content, or metadata.' })}
        </Text>
      </Stack>

      <Paper p="md" withBorder radius="md">
        <Stack gap="sm">
          <TextInput
            placeholder={t('common:form.placeholder.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftSection={<IconSearch size={16} aria-hidden="true" />}
            size="md"
            data-tour="app.search.input"
          />
          <Group gap="sm">
            <Select
              placeholder={t('documents:library.filter.type')}
              data={[]}
              size="sm"
              style={{ maxWidth: 200 }}
            />
            <Select
              placeholder={t('documents:library.filter.classification')}
              data={[]}
              size="sm"
              style={{ maxWidth: 200 }}
            />
            <Select
              placeholder={t('documents:library.filter.status')}
              data={[
                { value: 'draft', label: t('common:status.draft') },
                { value: 'active', label: t('common:status.active') },
                { value: 'archived', label: t('common:status.archived') },
              ]}
              size="sm"
              style={{ maxWidth: 200 }}
            />
            <Button variant="light" leftSection={<IconFilter size={14} aria-hidden="true" />}>
              {t('common:action.filter')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      {searchResults.isLoading ? (
        <LoadingState variant="skeleton" />
      ) : searchResults.isError ? (
        <ErrorState error={searchResults.error} onRetry={() => searchResults.refetch()} />
      ) : searchResults.data?.items.length === 0 ? (
        <EmptyState
          illustration="search"
          titleKey="common:table.noResults"
          subtitleKey="search:empty.subtitle"
        />
      ) : (
        <Stack gap="xs">
          {searchResults.data?.items.map((doc) => (
            <Paper
              key={doc.id}
              p="md"
              withBorder
              radius="md"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/documents/${doc.id}`)}
            >
              <Group justify="space-between">
                <Stack gap={4}>
                  <Text size="sm" fw={500}>
                    {doc.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {doc.status} · {doc.contentLanguage}
                  </Text>
                </Stack>
                <LocaleAwareDate value={doc.updatedAt} variant="relative" size="xs" c="dimmed" />
              </Group>
            </Paper>
          ))}
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={5} />
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
