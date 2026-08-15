/**
 * Smart EDMS WebSocket client (spec §13, §13.4).
 *
 * Manages a single Socket.IO connection to the backend's `/realtime`
 * namespace. The connection is established lazily when the user logs in
 * and torn down on logout.
 *
 * The client supports:
 *  - Auto-reconnection with exponential backoff (Socket.IO default).
 *  - JWT auth via the `auth` option (sent on the initial handshake).
 *  - Tenant-scoped room join on connect.
 *  - Typed event handlers for every spec §13.4 event.
 *  - Graceful degradation: if the backend is unreachable, the app continues
 *    to function (just without live updates). The UI surfaces a "connecting"
 *    indicator.
 */
import { io, type Socket } from 'socket.io-client';
import { BACKEND_BASE_URL } from './client';

/** Realtime event names (spec §13.4). */
export const REALTIME_EVENTS = {
  DocumentUpdated: 'document.updated',
  DocumentDeleted: 'document.deleted',
  DocumentLocked: 'document.locked',
  DocumentUnlocked: 'document.unlocked',
  WorkflowStepUpdated: 'workflow.step_updated',
  WorkflowCompleted: 'workflow.completed',
  ApprovalRequired: 'approval.required',
  ApprovalCompleted: 'approval.completed',
  AuditEventRecorded: 'audit.event_recorded',
  NotificationCreated: 'notification.created',
  AiResponseChunk: 'ai.response.chunk',
  AiActionSuggested: 'ai.action.suggested',
  LicenseStateChanged: 'license.state_changed',
  TourProgressSynced: 'tour.progress_synced',
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

let socket: Socket | null = null;

/**
 * Connect to the backend's realtime namespace. Returns the connected socket.
 * If a socket already exists, it is reused.
 *
 * @param accessToken JWT access token for authentication.
 * @param tenantId    Tenant id for room join.
 */
export function connectRealtime(accessToken: string, tenantId: string): Socket {
  if (socket?.connected) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(`${BACKEND_BASE_URL}/realtime`, {
    transports: ['websocket'],
    auth: { token: accessToken, tenantId },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
    timeout: 20_000,
  });

  socket.on('connect', () => {
    // Join the tenant-scoped room so we receive tenant-wide events.
    socket?.emit('room:join', `tenant:${tenantId}`);
  });

  socket.on('connect_error', () => {
    // Network error — Socket.IO will retry automatically.
    // The UI can show a "Reconnecting..." indicator by listening to the
    // connection state via `getRealtimeState()`.
  });

  return socket;
}

/**
 * Disconnect the realtime socket and discard it. Called on logout.
 */
export function disconnectRealtime(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to a realtime event. Returns an unsubscribe function.
 *
 * @example
 *   const off = onRealtimeEvent('document.updated', (payload) => {
 *     queryClient.invalidateQueries({ queryKey: ['documents'] });
 *   });
 *   // later:
 *   off();
 */
export function onRealtimeEvent<T = unknown>(
  event: RealtimeEventName,
  handler: (payload: T) => void,
): () => void {
  if (!socket) {
    // Not connected yet — no-op. The caller can re-subscribe later.
    return () => undefined;
  }
  socket.on(event, handler as (payload: unknown) => void);
  return () => {
    socket?.off(event, handler as (payload: unknown) => void);
  };
}

/**
 * Current realtime connection state. Used by the UI to show a "connecting"
 * indicator.
 */
export function getRealtimeState(): 'connected' | 'connecting' | 'disconnected' {
  if (!socket) return 'disconnected';
  if (socket.connected) return 'connected';
  return 'connecting';
}
