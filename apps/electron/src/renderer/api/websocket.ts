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

/**
 * Realtime event names — must match the backend's emitted event names exactly.
 *
 * The backend uses dot.notation (e.g., 'document.updated', 'workflow.approval.completed').
 * Spec ref: §13.4 (WebSocket event catalogue).
 */
export const REALTIME_EVENTS = {
  // Document events (§9.3)
  DocumentCreated: 'document.created',
  DocumentUpdated: 'document.updated',
  DocumentDeleted: 'document.deleted',
  DocumentVersionCreated: 'document.version.created',
  DocumentClassificationChanged: 'document.classification.changed',
  // Workflow events (§9.8)
  WorkflowStepUpdated: 'workflow.step.updated',
  WorkflowApprovalRequested: 'workflow.approval.requested',
  WorkflowApprovalCompleted: 'workflow.approval.completed',
  // Audit events (§9.12)
  AuditAlert: 'audit.alert',
  // Notification events (§9.13)
  NotificationCreated: 'notification.created',
  // Sharing events (§9.11)
  ShareLinkUpdated: 'share.link.updated',
  // Legal hold events (§9.7)
  LegalHoldChanged: 'legalHold.changed',
  // Retention events (§9.7)
  RetentionChanged: 'retention.changed',
  // License events (§12)
  LicenseStatusChanged: 'license.status.changed',
  // Presence events (§9.11)
  PresenceUpdated: 'presence.updated',
  // Crisis room events (§9.11)
  CrisisRoomSync: 'crisisRoom.sync',
  // Search events (§9.10)
  SearchIndexUpdated: 'search.index.updated',
  // Job events (§22.2)
  JobProgressUpdated: 'job.progress.updated',
  // Scanner events (§9.16)
  ScannerJobStarted: 'scanner.job.started',
  ScannerJobProgress: 'scanner.job.progress',
  ScannerJobCompleted: 'scanner.job.completed',
  ScannerJobFailed: 'scanner.job.failed',
  // Tour events (§10)
  TourUpdated: 'tour.updated',
  // AI events (§11)
  AiResponseChunk: 'ai.response.chunk',
  AiResponseCompleted: 'ai.response.completed',
  AiResponseFailed: 'ai.response.failed',
  // Security events (§27.3 — cracking/tampering detection)
  SecurityIncidentCreated: 'security.incident.created',
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
  if (socket?.connected) {return socket;}

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
  if (!socket) {return 'disconnected';}
  if (socket.connected) {return 'connected';}
  return 'connecting';
}
