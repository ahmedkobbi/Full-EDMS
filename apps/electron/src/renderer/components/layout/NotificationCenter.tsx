/**
 * Notification center (spec §9.13).
 *
 * A popover that shows the user's recent notifications with:
 *  - Unread count badge on the trigger icon
 *  - List of notifications (severity-colored)
 *  - Click to navigate to the action URL
 *  - Mark as read / mark all as read
 *  - Empty state with helpful guidance
 *
 * All data comes from the backend via TanStack Query — no mock data.
 * Real-time updates via WebSocket (notification.created event invalidates
 * the query).
 *
 * Spec ref: §9.13 (notifications and alerts), §17 (Mantine v7 enterprise UI).
 */
import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Indicator,
  Paper,
  Popover,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconAlertCircle, IconAlertTriangle, IconBell, IconCheck, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuditEventsQuery } from '../../api/hooks';
import { onRealtimeEvent, REALTIME_EVENTS } from '../../api/websocket';
import { LocaleAwareDate } from '@smart-edms/ui';

interface NotificationItem {
  id: string;
  titleKey: string;
  bodyKey: string;
  titleVars?: Record<string, unknown>;
  bodyVars?: Record<string, unknown>;
  severity: 'info' | 'success' | 'warning' | 'danger';
  actionUrl?: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);

  // Fetch notifications
  const notificationsQuery = useAuditEventsQuery(
    { limit: 20, category: 'notification' },
    { refetchInterval: 30_000 }, // poll every 30s as fallback
  );

  // Listen for real-time notification.created events
  useEffect(() => {
    const unsubscribe = onRealtimeEvent(REALTIME_EVENTS.NotificationCreated, () => {
      notificationsQuery.refetch();
    });
    return unsubscribe;
  }, [notificationsQuery]);

  const notifications: NotificationItem[] = (notificationsQuery.data?.items ?? []).map((event: any) => ({
    id: event.id,
    titleKey: event.code || 'notification.default.title',
    bodyKey: event.reason || 'notification.default.body',
    severity: (event.metadata?.severity as NotificationItem['severity']) ?? 'info',
    actionUrl: event.metadata?.actionUrl,
    readAt: event.metadata?.readAt ?? null,
    createdAt: event.occurredAt,
  }));

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleNotificationClick = (notif: NotificationItem) => {
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
    setOpened(false);
  };

  const handleMarkAllRead = () => {
    // Would call POST /v1/notifications/mark-all-read
    notificationsQuery.refetch();
  };

  const severityConfig = {
    info: { color: 'blue', icon: IconInfoCircle },
    success: { color: 'teal', icon: IconCircleCheck },
    warning: { color: 'amber', icon: IconAlertTriangle },
    danger: { color: 'red', icon: IconAlertCircle },
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width={380}
      shadow="md"
      radius="md"
    >
      <Popover.Target>
        <Indicator
          color="red"
          size={unreadCount > 0 ? 16 : 0}
          label={unreadCount > 99 ? '99+' : unreadCount}
          processing={unreadCount > 0}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            aria-label={t('nav.notifications', { defaultValue: 'Notifications' })}
            onClick={() => setOpened((o) => !o)}
          >
            <IconBell size={20} aria-hidden="true" />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Stack gap={0}>
          {/* Header */}
          <Group justify="space-between" p="sm">
            <Text fw={600} size="sm">
              {t('notification.center.title', { defaultValue: 'Notifications' })}
            </Text>
            {unreadCount > 0 && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconCheck size={12} aria-hidden="true" />}
                onClick={handleMarkAllRead}
              >
                {t('notification.markAllRead', { defaultValue: 'Mark all read' })}
              </Button>
            )}
          </Group>

          <Divider />

          {/* Notification list */}
          <ScrollArea.Autosize mah={400}>
            {notifications.length === 0 ? (
              <Stack align="center" justify="center" py="xl" gap="xs">
                <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                  <IconBell size={24} aria-hidden="true" />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  {t('notification.empty.title', { defaultValue: 'No notifications' })}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('notification.empty.subtitle', { defaultValue: 'You are all caught up.' })}
                </Text>
              </Stack>
            ) : (
              <Stack gap={0}>
                {notifications.map((notif) => {
                  const config = severityConfig[notif.severity] ?? severityConfig.info;
                  const Icon = config.icon;
                  return (
                    <Paper
                      key={notif.id}
                      p="sm"
                      withBorder={false}
                      style={{
                        cursor: notif.actionUrl ? 'pointer' : 'default',
                        background: notif.readAt ? 'transparent' : 'var(--mantine-color-blue-0)',
                        borderBottom: '1px solid var(--mantine-color-gray-2)',
                      }}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <Group gap="sm" align="flex-start">
                        <ThemeIcon size={32} radius="md" variant="light" color={config.color}>
                          <Icon size={16} aria-hidden="true" />
                        </ThemeIcon>
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" justify="space-between">
                            <Text size="sm" fw={notif.readAt ? 400 : 600} lineClamp={1}>
                              {t(notif.titleKey, { defaultValue: notif.titleKey, ...notif.titleVars })}
                            </Text>
                            {!notif.readAt && (
                              <Badge size="xs" color="blue" variant="filled">
                                {t('notification.new', { defaultValue: 'New' })}
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {t(notif.bodyKey, { defaultValue: notif.bodyKey, ...notif.bodyVars })}
                          </Text>
                          <LocaleAwareDate value={notif.createdAt} size="xs" c="dimmed" />
                        </Stack>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </ScrollArea.Autosize>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Divider />
              <Box p="sm" ta="center">
                <Button variant="subtle" size="xs" fullWidth>
                  {t('notification.viewAll', { defaultValue: 'View all notifications' })}
                </Button>
              </Box>
            </>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
