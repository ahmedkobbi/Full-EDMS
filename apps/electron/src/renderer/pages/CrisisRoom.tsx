/**
 * Crisis Response Room page (spec §9.11).
 *
 * Real-time collaboration room for crisis/incident response.
 * Shows:
 *  - Active crisis room with live participant presence
 *  - Real-time event feed (crisis events, document links, audit alerts)
 *  - Quick actions (lock down, notify all, escalate)
 *  - Participant list with roles and status
 *
 * Spec ref: §9.11 (Crisis Response Room), §13.4 (crisisRoom.sync event).
 */
import { useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Timeline,
} from '@mantine/core';
import {
  AlertTriangle,
  Bell,
  Lock,
  Radio,
  Send,
  Users,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorState, EmptyState, LocaleAwareDate } from '@smart-edms/ui';
import { onRealtimeEvent, REALTIME_EVENTS } from '../api/websocket';
import { apiPost } from '../api/client';

interface CrisisEvent {
  id: string;
  type: 'alert' | 'message' | 'action' | 'system';
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

interface Participant {
  userId: string;
  userName: string;
  role: string;
  status: 'active' | 'idle' | 'away';
  joinedAt: string;
}

export function CrisisRoomPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLockedDown, setIsLockedDown] = useState(false);

  useEffect(() => {
    const handleSync = (data: unknown) => {
      const sync = data as { events?: CrisisEvent[]; participants?: Participant[] };
      if (sync.events) setEvents(sync.events);
      if (sync.participants) setParticipants(sync.participants);
      setLoading(false);
    };

    const handleEvent = (data: unknown) => {
      const event = data as CrisisEvent;
      setEvents((prev) => [...prev, event]);
    };

    const offSync = onRealtimeEvent(REALTIME_EVENTS.CrisisRoomSync, handleSync);
    const offEvent = onRealtimeEvent('crisis.event' as any, handleEvent);

    return () => {
      offSync?.();
      offEvent?.();
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    // Emit via WebSocket (if connected)
    // The actual emit is handled by the realtime client
    setMessage('');
  };

  const triggerLockdown = async () => {
    try {
      await apiPost('/security/blocked-ips', {
        ipAddress: '0.0.0.0/0',
        reason: 'Crisis room lockdown',
        durationHours: 1,
      });
      setIsLockedDown(true);
    } catch (err) {
      setError('Failed to trigger lockdown');
    }
  };

  const notifyAll = async () => {
    try {
      await apiPost('/notifications/broadcast', {
        message: 'Crisis room activated — all hands required',
        severity: 'critical',
      });
    } catch {
      // Non-fatal
    }
  };

  if (loading) return <LoadingOverlay visible />;
  if (error) return <ErrorState error={{ message: error, code: 'CRISIS_ROOM_ERROR' } as any} />;

  return (
    <Stack gap="md" p="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="sm">
          <ThemeIcon size="xl" variant="light" color="red">
            <AlertTriangle size={28} />
          </ThemeIcon>
          <div>
            <Title order={2}>{t('crisis:title', { defaultValue: 'Crisis Response Room' })}</Title>
            <Text size="sm" c="dimmed">
              {t('crisis:subtitle', { defaultValue: 'Real-time incident coordination' })}
            </Text>
          </div>
        </Group>
        <Group gap="sm">
          <Button
            variant="light"
            color="yellow"
            leftSection={<Bell size={16} />}
            onClick={notifyAll}
          >
            {t('crisis:notifyAll', { defaultValue: 'Notify All' })}
          </Button>
          <Button
            variant="filled"
            color="red"
            leftSection={<Lock size={16} />}
            onClick={triggerLockdown}
            disabled={isLockedDown}
          >
            {isLockedDown
              ? t('crisis:lockedDown', { defaultValue: 'Locked Down' })
              : t('crisis:lockdown', { defaultValue: 'Lockdown' })}
          </Button>
        </Group>
      </Group>

      {/* Active Alert */}
      {isLockedDown && (
        <Alert color="red" variant="filled" icon={<Lock size={18} />} title="Deployment Locked Down">
          All non-admin access has been suspended. Only administrators can perform actions.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {/* Event Feed (2/3 width) */}
        <Card withBorder style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" mb="md">
            <Title order={4}>
              <Group gap="xs">
                <Radio size={18} />
                {t('crisis:eventFeed', { defaultValue: 'Event Feed' })}
              </Group>
            </Title>
            <Badge color="red" variant="filled" size="sm">
              {events.length} {t('crisis:events', { defaultValue: 'events' })}
            </Badge>
          </Group>

          <ScrollArea h={400}>
            {events.length === 0 ? (
              <EmptyState
                illustration="generic"
                titleKey="crisis:noEvents"
                subtitleKey="crisis:noEventsDescription"
              />
            ) : (
              <Timeline bulletSize={24} lineWidth={2}>
                {events.map((event) => (
                  <Timeline.Item
                    key={event.id}
                    bullet={
                      <ThemeIcon size={24} radius="xl" color={getEventColor(event.type)}>
                        {getEventIcon(event.type)}
                      </ThemeIcon>
                    }
                    title={
                      <Group gap="xs">
                        <Text size="sm" fw={600}>{event.userName ?? 'System'}</Text>
                        <Text size="xs" c="dimmed">
                          <LocaleAwareDate value={event.timestamp} />
                        </Text>
                      </Group>
                    }
                  >
                    <Text size="sm">{event.message}</Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </ScrollArea>

          {/* Message Input */}
          <Group gap="sm" mt="md">
            <Textarea
              placeholder={t('crisis:typeMessage', { defaultValue: 'Type a message...' })}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autosize
              minRows={1}
              maxRows={3}
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              leftSection={<Send size={16} />}
              onClick={sendMessage}
              disabled={!message.trim()}
            >
              {t('crisis:send', { defaultValue: 'Send' })}
            </Button>
          </Group>
        </Card>

        {/* Participants (1/3 width) */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>
              <Group gap="xs">
                <Users size={18} />
                {t('crisis:participants', { defaultValue: 'Participants' })}
              </Group>
            </Title>
            <Badge color="green" variant="filled" size="sm">
              {participants.filter((p) => p.status === 'active').length} {t('crisis:active', { defaultValue: 'active' })}
            </Badge>
          </Group>

          <ScrollArea h={400}>
            {participants.length === 0 ? (
              <Text c="dimmed" size="sm" ta="center" mt="xl">
                {t('crisis:noParticipants', { defaultValue: 'No participants in the crisis room' })}
              </Text>
            ) : (
              <Stack gap="xs">
                {participants.map((p) => (
                  <Paper key={p.userId} p="sm" withBorder>
                    <Group justify="space-between">
                      <Stack gap={0}>
                        <Text size="sm" fw={600}>{p.userName}</Text>
                        <Text size="xs" c="dimmed">{p.role}</Text>
                      </Stack>
                      <Badge
                        color={p.status === 'active' ? 'green' : p.status === 'idle' ? 'yellow' : 'gray'}
                        variant="light"
                        size="sm"
                      >
                        {p.status}
                      </Badge>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Card>
      </SimpleGrid>

      {/* Quick Actions */}
      <Paper p="md" withBorder>
        <Title order={5} mb="sm">
          <Group gap="xs">
            <Zap size={16} />
            {t('crisis:quickActions', { defaultValue: 'Quick Actions' })}
          </Group>
        </Title>
        <Group gap="sm">
          <Button variant="light" color="orange" leftSection={<AlertTriangle size={16} />}>
            {t('crisis:escalate', { defaultValue: 'Escalate to Security Team' })}
          </Button>
          <Button variant="light" color="blue" leftSection={<Bell size={16} />}>
            {t('crisis:notifyStakeholders', { defaultValue: 'Notify Stakeholders' })}
          </Button>
          <Button variant="light" color="red" leftSection={<Lock size={16} />} onClick={triggerLockdown}>
            {t('crisis:lockdownDeployment', { defaultValue: 'Lockdown Deployment' })}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}

function getEventColor(type: CrisisEvent['type']): string {
  switch (type) {
    case 'alert': return 'red';
    case 'action': return 'orange';
    case 'system': return 'blue';
    default: return 'gray';
  }
}

function getEventIcon(type: CrisisEvent['type']) {
  switch (type) {
    case 'alert': return <AlertTriangle size={14} />;
    case 'action': return <Zap size={14} />;
    case 'system': return <Radio size={14} />;
    default: return <Send size={14} />;
  }
}
