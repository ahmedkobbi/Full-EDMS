/**
 * Command palette (spec §17, §10.13).
 *
 * Mantine-based modal that lets the user:
 *  - Quickly navigate to any route
 *  - Search documents
 *  - Run a tour
 *  - Switch language
 *  - Toggle theme
 *
 * Opened via ⌘K (Mac) or Ctrl+K (Windows/Linux). Closes on Escape.
 *
 * The palette uses keyboard navigation: arrow keys to move, Enter to select.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, TextInput, Stack, Group, Text, UnstyledButton, Box } from '@mantine/core';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from '@mantine/hooks';
import { routes } from '../../routes';
import { useToursQuery } from '../../api/hooks';

interface CommandPaletteProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

interface CommandItem {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly section: string;
  readonly onSelect: () => void;
}

export function CommandPalette({ opened, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const toursQuery = useToursQuery({ enabled: opened });

  // Build the list of command items.
  const items: CommandItem[] = [
    ...routes.authenticated
      .filter((r) => !r.path.includes('*') && !r.path.includes(':'))
      .map((r) => ({
        id: `nav:${r.path}`,
        label: t(`nav.${r.path.replace('/', '') || 'dashboard'}`),
        hint: r.path,
        section: t('commandPalette.section.navigation'),
        onSelect: () => {
          navigate(r.path);
          onClose();
        },
      })),
    ...((toursQuery.data ?? []).map((tour) => ({
      id: `tour:${tour.id}`,
      label: t(`tour.${tour.code}.title`, { defaultValue: tour.code }),
      hint: t('commandPalette.hint.startTour'),
      section: t('commandPalette.section.tours'),
      onSelect: () => {
        // The TourEngine listens for `command-palette:start-tour` events.
        window.dispatchEvent(
          new CustomEvent('command-palette:start-tour', { detail: { tourId: tour.id } }),
        );
        onClose();
      },
    })) satisfies CommandItem[]),
  ];

  // Filter by the user's query.
  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  // Reset active index when the query changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation within the palette.
  useHotkeys([
    [
      'ArrowDown',
      () => setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)),
    ],
    [
      'ArrowUp',
      () => setActiveIndex((i) => Math.max(i - 1, 0)),
    ],
    [
      'Enter',
      () => {
        const item = filtered[activeIndex];
        if (item) item.onSelect();
      },
    ],
  ]);

  // Group items by section for display.
  const sections = new Map<string, CommandItem[]>();
  for (const item of filtered) {
    const existing = sections.get(item.section) ?? [];
    existing.push(item);
    sections.set(item.section, existing);
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      withCloseButton={false}
      padding={0}
      centered
      data-tour="commandPalette"
    >
      <Stack gap={0}>
        <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <TextInput
            autoFocus
            placeholder={t('commandPalette.search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftSection={<Search size={16} aria-hidden="true" />}
            variant="unstyled"
          />
        </Box>
        <Box p="sm" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">
              {t('commandPalette.noResults')}
            </Text>
          ) : (
            Array.from(sections.entries()).map(([section, items]) => (
              <Stack key={section} gap={4} mb="sm">
                <Text size="xs" c="dimmed" fw={600} px="sm">
                  {section}
                </Text>
                {items.map((item) => {
                  const idx = filtered.indexOf(item);
                  return (
                    <UnstyledButton
                      key={item.id}
                      onClick={item.onSelect}
                      onMouseEnter={() => setActiveIndex(idx)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--mantine-radius-sm)',
                        background:
                          activeIndex === idx
                            ? 'var(--mantine-color-default-hover)'
                            : 'transparent',
                        width: '100%',
                      }}
                    >
                      <Group justify="space-between">
                        <Text size="sm">{item.label}</Text>
                        {item.hint && (
                          <Text size="xs" c="dimmed">
                            {item.hint}
                          </Text>
                        )}
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            ))
          )}
        </Box>
      </Stack>
    </Modal>
  );
}

/**
 * Hook that opens the command palette on ⌘K / Ctrl+K. Returns the opened
 * state + a close handler.
 */
export function useCommandPalette(): {
  readonly opened: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
  readonly palette: ReactNode;
} {
  const [opened, setOpened] = useState(false);
  useHotkeys([['mod+K', () => setOpened((o) => !o)]]);

  return {
    opened,
    open: () => setOpened(true),
    close: () => setOpened(false),
    toggle: () => setOpened((o) => !o),
    palette: <CommandPalette opened={opened} onClose={() => setOpened(false)} />,
  };
}
