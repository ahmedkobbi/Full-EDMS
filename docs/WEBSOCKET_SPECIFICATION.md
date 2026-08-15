# Smart EDMS — WebSocket Specification

> **Spec references:** §26.8 (real-time surface), §13 (WebSocket Real-Time
> Requirements), §9.11 (crisis response room), §22.3 (Redis adapter),
> §27.3 (security rules).
>
> **Cross-references:**
> - REST endpoints that trigger these events → [`API_SPECIFICATION.md`](./API_SPECIFICATION.md)
> - Entities referenced in payloads → [`DATA_MODEL.md`](./DATA_MODEL.md)
> - Threat model for socket auth → [`THREAT_MODEL.md`](./THREAT_MODEL.md)
> - Architecture (Socket.IO Redis adapter) → [`ARCHITECTURE.md`](./ARCHITECTURE.md)

This document is the canonical specification for the Smart EDMS real-time
channel. It covers connection lifecycle, authentication, authorization,
the 26 server→client events (spec §13.4), the 3 client→server events,
rate limiting, and reliability guarantees.

---

## Table of contents

1. [Overview](#1-overview)
2. [Connection](#2-connection)
3. [Authorization](#3-authorization)
4. [Server → client events (26)](#4-server--client-events-26)
5. [Client → server events (3)](#5-client--server-events-3)
6. [Rate limiting](#6-rate-limiting)
7. [Reliability](#7-reliability)
8. [Client SDK reference](#8-client-sdk-reference)
9. [Changelog](#9-changelog)

---

## 1. Overview

Smart EDMS uses **Socket.IO** as its real-time transport, mounted at the
namespace `/realtime` on the on-premise backend (spec §13.1). The
namespace is served from the same Fastify HTTP port (`3000` in dev,
`443` behind nginx in production). The nginx config at
[`infra/nginx/nginx.conf`](../infra/nginx/nginx.conf) handles the
WebSocket upgrade for `/realtime`.

| Property              | Value                                                |
| --------------------- | ---------------------------------------------------- |
| Transport             | Socket.IO (Engine.IO) — WebSocket only (no polling) |
| Namespace             | `/realtime`                                          |
| URL                   | `wss://<host>/realtime` (TLS) / `ws://<host>/realtime` (dev) |
| Adapter               | `@socket.io/redis-adapter` (Redis pub/sub)           |
| Auth                  | JWT in `handshake.auth.token`                        |
| Heartbeat             | Socket.IO ping/pong (25 s ping, 20 s timeout)        |
| Reconnection          | Client-side exponential backoff (1 s → 5 s → 30 s)   |
| Compression           | `permessage-deflate` enabled at the proxy layer      |

### 1.1 Why Socket.IO (not raw WebSocket)

Socket.IO provides:
- **Adapter for horizontal scaling** — the Redis adapter fans events out
  across multiple backend instances (spec §22.3). A socket connected to
  instance A receives events published by instance B.
- **Automatic reconnection** with exponential backoff.
- **Room-based broadcasting** — `tenant:{tid}`, `user:{uid}`,
  `document:{docId}`, `crisis_room:{code}`.
- **Acknowledgements** — client→server events can return ack callbacks.
- **Fallback to HTTP long-polling** if the WebSocket upgrade fails
  (disabled in production — we require WebSocket).

### 1.2 Source of truth

The TypeScript discriminated union `WebSocketEvent` in
[`packages/types/src/websocket.ts`](../packages/types/src/websocket.ts)
is the canonical model for event payloads. The Zod schemas in
[`packages/schemas/src/websocket.ts`](../packages/schemas/src/websocket.ts)
validate every event before it is emitted. **Never construct event
payloads ad-hoc on the server side** — always go through the typed
helper in
[`apps/backend/src/websocket/gateway.service.ts`](../apps/backend/src/websocket/gateway.service.ts)
which calls `EventSchema.parse(...)`.

---

## 2. Connection

### 2.1 Connection URL

```text
wss://smart-edms.example.com/realtime
```

Behind nginx, the same host serves `/v1/*` (REST) and `/realtime`
(WebSocket). The nginx `proxy_set_header Upgrade $http_upgrade` and
`proxy_set_header Connection "upgrade"` directives are required (spec
§23.2 — proxy must support WebSocket upgrade).

### 2.2 Handshake authentication

The client passes the JWT in the `auth` field of the Socket.IO
handshake:

```typescript
import { io } from 'socket.io-client';

const socket = io('https://smart-edms.example.com/realtime', {
  auth: { token: '<access-jwt>' },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});
```

The server verifies the JWT via the same `JwtService` used for REST
requests (see
[`apps/backend/src/websocket/gateway.service.ts`](../apps/backend/src/websocket/gateway.service.ts),
`authenticateSocket`). On failure, the server emits an `error` event
with `{ messageKey: 'errors.UNAUTHENTICATED' }` and disconnects the
socket with `socket.disconnect(true)` (spec §13.2).

```typescript
// Server-side connection handler (simplified)
async handleConnection(socket: Socket): Promise<void> {
  const payload = await this.gatewayService.authenticateSocket(socket);
  if (!payload) {
    socket.emit('error', { messageKey: 'errors.UNAUTHENTICATED' });
    socket.disconnect(true);
    return;
  }
  socket.data.user = payload;
  await socket.join(`tenant:${payload.tid}`);
  await socket.join(`user:${payload.sub}`);
}
```

### 2.3 Reconnection strategy

The client SDK uses exponential backoff with jitter:

| Attempt | Delay        |
| ------- | ------------ |
| 1       | 1 s          |
| 2       | 2 s          |
| 3       | 4 s          |
| 4       | 8 s          |
| 5       | 16 s         |
| 6+      | 30 s (cap)   |

After reconnection, the client MUST call `GET /v1/notifications` and
`GET /v1/me` to resync state (spec §13.5 — missed-event recovery).
Server-side, the gateway re-joins the socket to its `tenant:` and
`user:` rooms automatically; document subscriptions require the client
to re-emit `document:subscribe` for each document it was watching.

### 2.4 Heartbeat

Socket.IO's built-in ping/pong mechanism is used (spec §13.1):

| Setting        | Default | Notes                                                        |
| -------------- | ------- | ------------------------------------------------------------ |
| `pingInterval` | 25 s    | Server sends ping every 25 s.                                |
| `pingTimeout`  | 20 s    | If no pong within 20 s, the socket is considered dead.       |

The nginx `proxy_read_timeout` MUST be set to at least 60 s to avoid
the proxy closing idle WebSocket connections between pings (spec §23.2).
See
[`infra/nginx/nginx.conf`](../infra/nginx/nginx.conf):

```nginx
location /realtime {
  proxy_pass http://backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 60s;
  proxy_send_timeout 60s;
}
```

### 2.5 Connection lifecycle

```text
┌──────────┐  connect with auth.token          ┌──────────┐
│  Client  │ ──────────────────────────────▶   │  Server  │
│          │ ◀────────────────────────────────  │          │
│          │  connected (socket.id)              │          │
│          │                                    │          │
│          │  server joins socket to             │          │
│          │  tenant:<tid> + user:<uid> rooms    │          │
│          │                                    │          │
│          │  document:subscribe { documentId }  │          │
│          │ ──────────────────────────────▶   │          │
│          │ ◀────────────────────────────────  │          │
│          │  ack { ok: true }                  │          │
│          │                                    │          │
│          │  (events flow here)                │          │
│          │ ◀────────────────────────────────  │          │
│          │  document.updated { … }             │          │
│          │                                    │          │
│          │  disconnect (network drop)          │          │
│          │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▶  │          │
│          │                                    │          │
│          │  reconnect with same auth.token    │          │
│          │ ──────────────────────────────▶   │          │
│          │ ◀────────────────────────────────  │          │
│          │  connected (new socket.id)          │          │
│          │                                    │          │
│          │  resync: re-subscribe to documents │          │
│          │  + GET /v1/notifications           │          │
└──────────┘                                    └──────────┘
```

---

## 3. Authorization

### 3.1 Handshake-level auth

Every socket MUST present a valid JWT in `handshake.auth.token`. The
JWT carries the same `sub`, `tid`, `roles`, `locale` claims as REST
JWTs (see [`API_SPECIFICATION.md` §1.4](./API_SPECIFICATION.md#14-authentication)).
Expired or revoked tokens result in immediate disconnect.

### 3.2 Per-event authorization

Even after handshake auth, every server→client event is re-authorized
server-side before being delivered to a specific socket (spec §13.3).
This prevents, for example, a user who has lost access to a document
from continuing to receive `document.updated` events for it.

The authorization matrix:

| Room                       | Join condition                                                 |
| -------------------------- | -------------------------------------------------------------- |
| `tenant:{tid}`             | JWT `tid == {tid}` and tenant `ACTIVE`.                        |
| `user:{uid}`               | JWT `sub == {uid}` (always joined on connection).             |
| `document:{docId}`         | User passes `DocumentService.canAccess(tenantId, userId, docId)`. |
| `workflow:{instanceId}`    | User is the assignee or a workflow admin.                      |
| `crisis_room:{code}`       | User has `crisis-responder` role and the room code is valid.   |

The `document:subscribe` handler (see [§5.1](#51-documentsubscribe))
runs `DocumentService.canAccess(...)` before joining the socket to the
`document:{docId}` room. If access is later revoked, the gateway
proactively kicks the socket from the room (via a background
audit-event subscriber).

### 3.3 Tenant scoping

Every event payload includes a `tenantId` field (spec §13.3). The
gateway enforces that the payload's `tenantId` matches the socket's
JWT `tid` before delivering — a bug that broadcasts across tenants is
treated as a P0 security incident (spec §15.3, §27.3).

```typescript
// Server-side fan-out (simplified from gateway.service.ts)
this.subClient.on('pmessage', (_pattern, channel, message) => {
  const event = JSON.parse(message) as WebSocketEvent;
  const tenantId = channel.split(':').pop();
  if (!tenantId) return;
  // Broadcast to the tenant room. Sockets outside this tenant
  // are NOT in this room, so cross-tenant leakage is impossible
  // at the room-membership layer.
  this.io?.to(`tenant:${tenantId}`).emit(event.name, event);
});
```

### 3.4 Roles and event eligibility

Some events are scoped to specific roles even within the same tenant.
For example, `audit.alert` (severity `critical`) is only delivered to
sockets whose JWT `roles` array contains `admin`, `auditor`, or
`security-officer`. This is enforced by emitting to a sub-room such as
`tenant:{tid}:role:admin`. The gateway maintains these sub-rooms
dynamically as sockets connect.

| Event                            | Eligible roles                                                |
| -------------------------------- | ------------------------------------------------------------- |
| `audit.alert`                    | `admin`, `auditor`, `security-officer` (severity-gated).      |
| `license.status.changed`         | `admin`, `it-administrator`.                                  |
| `legalHold.changed`              | `admin`, `records-manager`, `compliance-officer`, `auditor`.  |
| `retention.changed`              | `admin`, `records-manager`, `auditor`.                        |
| `crisisRoom.sync`                | `admin`, `crisis-responder`, `security-officer`.              |
| `job.progress.updated`           | Job owner + `admin`, `it-administrator`.                      |
| All other events                 | All sockets in the tenant room.                               |

### 3.5 Crisis-room authorization

Crisis rooms (spec §9.11) are a special authorization domain. A
`crisis_room:{code}` room is created on demand when an authorized user
emits `presence:announce` with `room: 'crisis_room:{code}'`. The
gateway:

1. Verifies the user has the `crisis-responder` role.
2. Verifies the room code exists and is active (Redis lookup).
3. Verifies the user is on the room's cleared-users list.
4. Joins the socket to the room and broadcasts `crisisRoom.sync` with
   `kind: 'document_link'` for every document currently linked to the
   room.

Leaving a crisis room (`crisis_room:leave`) clears presence and
removes the socket from the room. The room itself persists in Redis
for 24 h after the last participant leaves, so rejoining users see
the prior state.

---

## 4. Server → client events (26)

All 26 events defined in spec §13.4 and modelled in
[`packages/types/src/websocket.ts`](../packages/types/src/websocket.ts)
as the `WebSocketEvent` discriminated union. Each event carries:

- `name` — the Socket.IO event name (stable string).
- `tenantId` — for tenant scoping.
- `occurredAt` — ISO 8601 UTC timestamp.
- Event-specific fields.

The full payload union is reproduced below; per-event details follow
in the tables.

```typescript
export type WebSocketEvent =
  | { name: 'document.created'; tenantId: TenantId; documentId: DocumentId; occurredAt: ISODateString }
  | { name: 'document.updated'; tenantId: TenantId; documentId: DocumentId; occurredAt: ISODateString }
  | { name: 'document.deleted'; tenantId: TenantId; documentId: DocumentId; occurredAt: ISODateString }
  | { name: 'document.version.created'; tenantId: TenantId; documentId: DocumentId;
      versionId: DocumentVersionId; versionNumber: number; occurredAt: ISODateString }
  | { name: 'document.classification.changed'; tenantId: TenantId; documentId: DocumentId;
      fromLabelId: ClassificationLabelId | null; toLabelId: ClassificationLabelId;
      occurredAt: ISODateString }
  | { name: 'workflow.step.updated'; tenantId: TenantId; instanceId: WorkflowInstanceId;
      stepId: WorkflowStepId; status: string; occurredAt: ISODateString }
  | { name: 'workflow.approval.requested'; tenantId: TenantId; instanceId: WorkflowInstanceId;
      stepId: WorkflowStepId; approverUserId: UserId; occurredAt: ISODateString }
  | { name: 'workflow.approval.completed'; tenantId: TenantId; instanceId: WorkflowInstanceId;
      stepId: WorkflowStepId; decision: 'approve' | 'reject' | 'delegate' | 'escalate';
      occurredAt: ISODateString }
  | { name: 'audit.alert'; tenantId: TenantId; auditEventId: UUID; severity: string;
      occurredAt: ISODateString }
  | { name: 'notification.created'; tenantId: TenantId; notificationId: UUID;
      occurredAt: ISODateString }
  | { name: 'share.link.updated'; tenantId: TenantId; shareLinkId: ShareLinkId;
      occurredAt: ISODateString }
  | { name: 'legalHold.changed'; tenantId: TenantId; legalHoldId: LegalHoldId;
      status: string; occurredAt: ISODateString }
  | { name: 'retention.changed'; tenantId: TenantId; documentId: DocumentId;
      occurredAt: ISODateString }
  | { name: 'license.status.changed'; tenantId: TenantId; state: LicenseState;
      occurredAt: ISODateString }
  | { name: 'presence.updated'; tenantId: TenantId; presence: PresenceState;
      occurredAt: ISODateString }
  | { name: 'crisisRoom.sync'; tenantId: TenantId; room: CrisisRoomEvent;
      occurredAt: ISODateString }
  | { name: 'search.index.updated'; tenantId: TenantId; documentId: DocumentId;
      occurredAt: ISODateString }
  | { name: 'job.progress.updated'; tenantId: TenantId; jobId: UUID;
      progress: number; status: string; occurredAt: ISODateString }
  | { name: 'scanner.job.started'; tenantId: TenantId; jobId: ScannerJobId;
      occurredAt: ISODateString }
  | { name: 'scanner.job.progress'; tenantId: TenantId; jobId: ScannerJobId;
      pagesProcessed: number; pagesAcquired: number; occurredAt: ISODateString }
  | { name: 'scanner.job.completed'; tenantId: TenantId; jobId: ScannerJobId;
      occurredAt: ISODateString }
  | { name: 'scanner.job.failed'; tenantId: TenantId; jobId: ScannerJobId;
      failureReasonKey: string; occurredAt: ISODateString }
  | { name: 'tour.updated'; tenantId: TenantId; tourId: TourDefinitionId;
      userId: UserId; status: string; occurredAt: ISODateString }
  | { name: 'ai.response.chunk'; tenantId: TenantId; sessionId: AssistantSessionId;
      messageId: AssistantMessageId; delta: string; sequence: number; final: boolean;
      occurredAt: ISODateString }
  | { name: 'ai.response.completed'; tenantId: TenantId; sessionId: AssistantSessionId;
      messageId: AssistantMessageId; occurredAt: ISODateString }
  | { name: 'ai.response.failed'; tenantId: TenantId; sessionId: AssistantSessionId;
      failureReasonKey: string; occurredAt: ISODateString };
```

### 4.1 Quick reference table

| #  | Event name                          | Direction | Triggering REST endpoint                              | Spec |
| -- | ----------------------------------- | --------- | ----------------------------------------------------- | ---- |
| 1  | `document.created`                  | S→C       | `POST /v1/documents/upload-complete`                  | §9.3 |
| 2  | `document.updated`                  | S→C       | `PATCH /v1/documents/:id`                             | §9.3 |
| 3  | `document.deleted`                  | S→C       | `DELETE /v1/documents/:id`                            | §9.3 |
| 4  | `document.version.created`          | S→C       | `POST /v1/documents/:id/versions/:versionId/restore` | §9.3 |
| 5  | `document.classification.changed`   | S→C       | `POST /v1/classification/documents/:documentId/assign`| §9.4 |
| 6  | `workflow.step.updated`             | S→C       | `POST /v1/workflows/instances/:id/approve`            | §9.8 |
| 7  | `workflow.approval.requested`       | S→C       | `POST /v1/workflows/:id/instantiate`                  | §9.8 |
| 8  | `workflow.approval.completed`       | S→C       | `POST /v1/workflows/instances/:id/approve`            | §9.8 |
| 9  | `audit.alert`                       | S→C       | (internal — high-severity audit events)               | §9.9 |
| 10 | `notification.created`              | S→C       | (internal — any notification-creating action)         | §9.6 |
| 11 | `share.link.updated`                | S→C       | `POST /v1/share`, `DELETE /v1/share/:id`              | §9.5 |
| 12 | `legalHold.changed`                 | S→C       | `POST /v1/legal-holds`, `POST /v1/legal-holds/:id/release` | §9.7 |
| 13 | `retention.changed`                 | S→C       | `POST /v1/retention/evaluate`                         | §9.7 |
| 14 | `license.status.changed`            | S→C       | `POST /v1/license/import`, heartbeat response         | §4.4 |
| 15 | `presence.updated`                  | S→C       | (internal — `presence:announce` from another socket)  | §9.11|
| 16 | `crisisRoom.sync`                   | S→C       | (internal — crisis-room actions)                      | §9.11|
| 17 | `search.index.updated`              | S→C       | (internal — OpenSearch indexer)                       | §9.10|
| 18 | `job.progress.updated`              | S→C       | (internal — BullMQ job progress)                      | §9.13|
| 19 | `scanner.job.started`               | S→C       | (internal — scanner worker)                           | §9.12|
| 20 | `scanner.job.progress`              | S→C       | (internal — scanner worker)                           | §9.12|
| 21 | `scanner.job.completed`             | S→C       | (internal — scanner worker)                           | §9.12|
| 22 | `scanner.job.failed`                | S→C       | (internal — scanner worker)                           | §9.12|
| 23 | `tour.updated`                      | S→C       | `POST /v1/tours/:tourId/*`                            | §10  |
| 24 | `ai.response.chunk`                 | S→C       | `POST /v1/ai/assistant/chat?stream=true`              | §11  |
| 25 | `ai.response.completed`             | S→C       | (terminal event after streaming completes)            | §11  |
| 26 | `ai.response.failed`                | S→C       | (terminal event after streaming fails)                | §11  |

### 4.2 Document events

#### 4.2.1 `document.created`

Emitted by `DocumentService.uploadComplete()` after the multipart
upload is finalized, the checksum is verified, and the first
`DocumentVersion` row is committed (spec §9.3). Delivered to every
socket in `tenant:{tid}` (so the document list updates in real time
across all open tabs).

**Payload schema** (Zod: `DocumentCreatedEventSchema`)

```typescript
{
  name: 'document.created',
  tenantId: string,        // UUID
  documentId: string,      // UUID
  occurredAt: string       // ISO 8601 UTC
}
```

**Example payload**

```json
{
  "name": "document.created",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
  "occurredAt": "2025-01-31T08:30:00.000Z"
}
```

**Authorization** — every socket in `tenant:{tid}`.

**Client action** — refresh the document list (or insert a placeholder
card with a loading spinner, then call `GET /v1/documents/:id` for the
full metadata).

**Spec ref** — §9.3 (document lifecycle), §13.4.

---

#### 4.2.2 `document.updated`

Emitted by `DocumentService.updateDocument()` after a successful
`PATCH /v1/documents/:id` (spec §9.3). Delivered to sockets in
`tenant:{tid}` that have not narrowed their subscription (i.e. open
list views) and to sockets in `document:{docId}` (detail views).

**Payload schema**

```typescript
{
  name: 'document.updated',
  tenantId: string,
  documentId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "document.updated",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
  "occurredAt": "2025-01-31T08:31:00.000Z"
}
```

**Client action** — re-fetch the document via `GET /v1/documents/:id`
if the user is viewing it; otherwise update the list row.

---

#### 4.2.3 `document.deleted`

Emitted by `DocumentService.deleteDocument()` after the soft-delete
commits (spec §9.3, §15.5). Delivered to `tenant:{tid}` and
`document:{docId}`.

**Payload schema**

```typescript
{
  name: 'document.deleted',
  tenantId: string,
  documentId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "document.deleted",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
  "occurredAt": "2025-01-31T08:32:00.000Z"
}
```

**Client action** — remove the document from the list; if the user is
viewing it, redirect to the list view with a toast
`t('documents.deleted')`.

---

#### 4.2.4 `document.version.created`

Emitted when a new `DocumentVersion` is created — either by
`upload-complete` (version 1), `restore` (creates a new version that
references a prior version's bytes), or a subsequent upload to an
existing document (spec §9.3, §15.5).

**Payload schema**

```typescript
{
  name: 'document.version.created',
  tenantId: string,
  documentId: string,
  versionId: string,
  versionNumber: number,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "document.version.created",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
  "versionId": "01HE3A5K7NV2W3X4Y5Z6A7B8C9",
  "versionNumber": 3,
  "occurredAt": "2025-01-31T08:33:00.000Z"
}
```

**Client action** — refresh the version history panel; show a
"new version available" badge on the document detail view.

---

#### 4.2.5 `document.classification.changed`

Emitted by `ClassificationService.assign()` after a successful label
change (spec §9.4). Delivered to `tenant:{tid}` and `document:{docId}`.

**Payload schema**

```typescript
{
  name: 'document.classification.changed',
  tenantId: string,
  documentId: string,
  fromLabelId: string | null,
  toLabelId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "document.classification.changed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
  "fromLabelId": "01HE3A5K7NL1A2B3C4D5E6F7G8",
  "toLabelId": "01HE3A5K7NL9H0I1J2K3L4M5N6",
  "occurredAt": "2025-01-31T08:34:00.000Z"
}
```

**Client action** — update the classification banner on the document;
if the new classification is more sensitive than the user can view,
the server will have already removed them from the document room
(via the audit-event subscriber) and the client will receive a
`document:unsubscribe` ack before this event lands.

---

### 4.3 Workflow events

#### 4.3.1 `workflow.step.updated`

Emitted by the workflow engine whenever a step's `status` changes —
`pending` → `running` → `completed` (or `cancelled`, `skipped`)
(spec §9.8). Delivered to `tenant:{tid}` and (if the user is on the
instance) `workflow:{instanceId}`.

**Payload schema**

```typescript
{
  name: 'workflow.step.updated',
  tenantId: string,
  instanceId: string,
  stepId: string,
  status: string,            // pending | running | completed | cancelled | skipped | failed
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "workflow.step.updated",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "instanceId": "01HE3A5K7NW1I2J3K4L5M6N7O8",
  "stepId": "01HE3A5K7NS9P0Q1R2S3T4U5V6",
  "status": "running",
  "occurredAt": "2025-01-31T08:35:00.000Z"
}
```

---

#### 4.3.2 `workflow.approval.requested`

Emitted when a workflow step that requires approval becomes active —
the assignee receives this event as a real-time notification (spec
§9.8, §9.6 — a `Notification` row is also created and
`notification.created` is emitted).

**Payload schema**

```typescript
{
  name: 'workflow.approval.requested',
  tenantId: string,
  instanceId: string,
  stepId: string,
  approverUserId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "workflow.approval.requested",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "instanceId": "01HE3A5K7NW1I2J3K4L5M6N7O8",
  "stepId": "01HE3A5K7NS9P0Q1R2S3T4U5V6",
  "approverUserId": "01HE3A5K7NU7V8W9X0Y1Z2A3B4",
  "occurredAt": "2025-01-31T08:36:00.000Z"
}
```

**Authorization** — delivered to `user:{approverUserId}` (the assignee)
plus `tenant:{tid}:role:admin` (so admins can monitor).

---

#### 4.3.3 `workflow.approval.completed`

Emitted after an approval decision is recorded (spec §9.8). Delivered
to `tenant:{tid}` and `workflow:{instanceId}`.

**Payload schema**

```typescript
{
  name: 'workflow.approval.completed',
  tenantId: string,
  instanceId: string,
  stepId: string,
  decision: 'approve' | 'reject' | 'delegate' | 'escalate',
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "workflow.approval.completed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "instanceId": "01HE3A5K7NW1I2J3K4L5M6N7O8",
  "stepId": "01HE3A5K7NS9P0Q1R2S3T4U5V6",
  "decision": "approve",
  "occurredAt": "2025-01-31T08:37:00.000Z"
}
```

---

### 4.4 Audit & alert events

#### 4.4.1 `audit.alert`

Emitted when an `AuditEvent` is written with severity `critical` or
`high` (spec §9.9, §21.7). Examples: failed login lockout, tenant
isolation violation detected, license revocation detected,
prompt-injection attempt blocked.

**Payload schema**

```typescript
{
  name: 'audit.alert',
  tenantId: string,
  auditEventId: string,
  severity: string,          // critical | high | medium | low
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "audit.alert",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "auditEventId": "01HE3A5K7NA1B2C3D4E5F6G7H8",
  "severity": "critical",
  "occurredAt": "2025-01-31T08:38:00.000Z"
}
```

**Authorization** — delivered only to `tenant:{tid}:role:admin`,
`tenant:{tid}:role:auditor`, and `tenant:{tid}:role:security-officer`.

**Client action** — open the security dashboard; show a modal alert
for `critical` severity; play the alert sound (configurable in user
preferences).

---

### 4.5 Notification events

#### 4.5.1 `notification.created`

Emitted when a `Notification` row is created for a user (spec §9.6).
Delivered to `user:{uid}` only (not the whole tenant — notifications
are private).

**Payload schema**

```typescript
{
  name: 'notification.created',
  tenantId: string,
  notificationId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "notification.created",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "notificationId": "01HE3A5K7NN1O2P3Q4R5S6T7U8",
  "occurredAt": "2025-01-31T08:39:00.000Z"
}
```

**Client action** — increment the unread badge; fetch the full
notification via `GET /v1/notifications` (or use the embedded
`notificationId` to fetch a single notification, planned endpoint
`GET /v1/notifications/:id`).

---

### 4.6 Share link events

#### 4.6.1 `share.link.updated`

Emitted when a `ShareLink` is created, revoked, or its `viewCount`
changes (spec §9.5). Delivered to `tenant:{tid}` and
`document:{docId}`.

**Payload schema**

```typescript
{
  name: 'share.link.updated',
  tenantId: string,
  shareLinkId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "share.link.updated",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "shareLinkId": "01HE3A5K7NS1H2I3J4K5L6M7N8",
  "occurredAt": "2025-01-31T08:40:00.000Z"
}
```

---

### 4.7 Legal hold & retention events

#### 4.7.1 `legalHold.changed`

Emitted when a `LegalHold` is created, released, or when a document is
attached/detached (spec §9.7). Delivered to `tenant:{tid}:role:admin`,
`tenant:{tid}:role:records-manager`, `tenant:{tid}:role:compliance-officer`,
and `tenant:{tid}:role:auditor`.

**Payload schema**

```typescript
{
  name: 'legalHold.changed',
  tenantId: string,
  legalHoldId: string,
  status: string,            // applied | released | document_attached | document_detached
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "legalHold.changed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "legalHoldId": "01HE3A5K7NH1L2M3N4O5P6Q7R8",
  "status": "applied",
  "occurredAt": "2025-01-31T08:41:00.000Z"
}
```

---

#### 4.7.2 `retention.changed`

Emitted when a document's retention schedule changes — either because
the schedule was updated, the disposition action was executed, or a
new schedule was assigned (spec §9.7). Delivered to `tenant:{tid}` and
`document:{docId}`.

**Payload schema**

```typescript
{
  name: 'retention.changed',
  tenantId: string,
  documentId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "retention.changed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
  "occurredAt": "2025-01-31T08:42:00.000Z"
}
```

---

### 4.8 License events

#### 4.8.1 `license.status.changed`

Emitted when the local license state machine transitions — on
`POST /v1/license/import`, on a heartbeat response that indicates
revocation, or on grace-period exhaustion (spec §4.4). Delivered to
`tenant:{tid}:role:admin` and `tenant:{tid}:role:it-administrator`.

**Payload schema**

```typescript
{
  name: 'license.status.changed',
  tenantId: string,
  state: LicenseState,        // valid | grace_period | grace_exhausted | expired | revoked | invalid
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "license.status.changed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "state": "grace_period",
  "occurredAt": "2025-01-31T08:43:00.000Z"
}
```

**Client action** — show a non-dismissable banner indicating the
license state; for `revoked`, redirect to a read-only mode page and
disable all mutating controls.

---

### 4.9 Presence & collaboration events

#### 4.9.1 `presence.updated`

Emitted when a user's presence in a room changes — they joined, left,
or updated their cursor (spec §9.11). Delivered to all sockets in the
affected room (typically `document:{docId}`).

**Payload schema**

```typescript
{
  name: 'presence.updated',
  tenantId: string,
  presence: PresenceState,    // see below
  occurredAt: string
}

interface PresenceState {
  tenantId: string;
  room: RoomIdentifier;       // { kind, ... }
  presentUsers: Array<{
    userId: string;
    displayName: string;
    lastActiveAt: string;
    cursor: { x: number; y: number; page: number } | null;
  }>;
}
```

**Example payload**

```json
{
  "name": "presence.updated",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "presence": {
    "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
    "room": {
      "kind": "document",
      "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
      "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2"
    },
    "presentUsers": [
      {
        "userId": "01HE3A5K7NU7V8W9X0Y1Z2A3B4",
        "displayName": "…",
        "lastActiveAt": "2025-01-31T08:44:00.000Z",
        "cursor": { "x": 120, "y": 340, "page": 3 }
      }
    ]
  },
  "occurredAt": "2025-01-31T08:44:00.000Z"
}
```

**Client action** — render presence avatars in the document toolbar;
show remote cursors with the user's color and display name.

---

#### 4.9.2 `crisisRoom.sync`

Emitted when a crisis-room action occurs — a redaction is applied,
an annotation is added, a document is linked, or a voice-channel
join/leave happens (spec §9.11). Delivered to `crisis_room:{code}`.

**Payload schema**

```typescript
{
  name: 'crisisRoom.sync',
  tenantId: string,
  room: CrisisRoomEvent,      // discriminated union — see below
  occurredAt: string
}

type CrisisRoomEvent =
  | { kind: 'redaction'; documentId: string; page: number;
      boundingBox: { x: number; y: number; w: number; h: number };
      actorUserId: string }
  | { kind: 'annotation'; documentId: string; page: number;
      text: string; actorUserId: string }
  | { kind: 'document_link'; documentId: string; actorUserId: string }
  | { kind: 'voice_channel'; channel: string;
      action: 'join' | 'leave'; actorUserId: string };
```

**Example payload** (redaction)

```json
{
  "name": "crisisRoom.sync",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "room": {
    "kind": "redaction",
    "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
    "page": 5,
    "boundingBox": { "x": 120, "y": 340, "w": 200, "h": 80 },
    "actorUserId": "01HE3A5K7NU7V8W9X0Y1Z2A3B4"
  },
  "occurredAt": "2025-01-31T08:45:00.000Z"
}
```

**Authorization** — only sockets in `crisis_room:{code}`. The room
join requires `crisis-responder` role and explicit clearance (see
[§3.5](#35-crisis-room-authorization)).

**Client action** — apply the redaction/annotation in real time on the
shared document view; for `voice_channel`, join/leave the WebRTC
channel.

---

### 4.10 Search events

#### 4.10.1 `search.index.updated`

Emitted when the OpenSearch indexer finishes indexing a document
(spec §9.10). Delivered to `tenant:{tid}`. Useful for "search index
lag" indicators in the UI.

**Payload schema**

```typescript
{
  name: 'search.index.updated',
  tenantId: string,
  documentId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "search.index.updated",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "documentId": "01HE3A5K7NP9Q8R7S6T5U4V3W2",
  "occurredAt": "2025-01-31T08:46:00.000Z"
}
```

---

### 4.11 Job progress events

#### 4.11.1 `job.progress.updated`

Emitted by BullMQ workers when a long-running job (audit export,
document OCR, search reindex, etc.) reports progress (spec §9.13).
Delivered to the job owner's `user:{uid}` room and to
`tenant:{tid}:role:admin`.

**Payload schema**

```typescript
{
  name: 'job.progress.updated',
  tenantId: string,
  jobId: string,
  progress: number,          // 0..100
  status: string,            // queued | running | completed | failed | cancelled
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "job.progress.updated",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "jobId": "01HE3A5K7NJ1O2P3Q4R5S6T7U8",
  "progress": 65,
  "status": "running",
  "occurredAt": "2025-01-31T08:47:00.000Z"
}
```

---

### 4.12 Scanner events

#### 4.12.1 `scanner.job.started`

Emitted when the scanner worker picks up a `ScannerJob` from the
queue (spec §9.12). Delivered to `user:{createdByUserId}` and
`tenant:{tid}:role:admin`.

**Payload schema**

```typescript
{
  name: 'scanner.job.started',
  tenantId: string,
  jobId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "scanner.job.started",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "jobId": "01HE3A5K7NS1C2D3E4F5G6H7I8",
  "occurredAt": "2025-01-31T08:48:00.000Z"
}
```

---

#### 4.12.2 `scanner.job.progress`

Emitted on each page processed (spec §9.12). High-frequency — see
[§6](#6-rate-limiting) for throttling rules.

**Payload schema**

```typescript
{
  name: 'scanner.job.progress',
  tenantId: string,
  jobId: string,
  pagesProcessed: number,
  pagesAcquired: number,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "scanner.job.progress",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "jobId": "01HE3A5K7NS1C2D3E4F5G6H7I8",
  "pagesProcessed": 12,
  "pagesAcquired": 15,
  "occurredAt": "2025-01-31T08:48:30.000Z"
}
```

---

#### 4.12.3 `scanner.job.completed`

Emitted when the scanner job finishes successfully (spec §9.12).

**Payload schema**

```typescript
{
  name: 'scanner.job.completed',
  tenantId: string,
  jobId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "scanner.job.completed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "jobId": "01HE3A5K7NS1C2D3E4F5G6H7I8",
  "occurredAt": "2025-01-31T08:49:00.000Z"
}
```

---

#### 4.12.4 `scanner.job.failed`

Emitted when the scanner job fails (spec §9.12). The
`failureReasonKey` is a stable i18n key the client renders via
`t(failureReasonKey)`.

**Payload schema**

```typescript
{
  name: 'scanner.job.failed',
  tenantId: string,
  jobId: string,
  failureReasonKey: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "scanner.job.failed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "jobId": "01HE3A5K7NS1C2D3E4F5G6H7I8",
  "failureReasonKey": "scanner.errors.paperJam",
  "occurredAt": "2025-01-31T08:49:30.000Z"
}
```

---

### 4.13 Tour events

#### 4.13.1 `tour.updated`

Emitted when a user's tour state changes (spec §10). Delivered to
`user:{uid}` (the user whose state changed) so other tabs of the same
user stay in sync.

**Payload schema**

```typescript
{
  name: 'tour.updated',
  tenantId: string,
  tourId: string,
  userId: string,
  status: string,            // NOT_STARTED | IN_PROGRESS | COMPLETED | SKIPPED | DISMISSED
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "tour.updated",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "tourId": "01HE3A5K7NT1D2E3F4G5H6I7J8",
  "userId": "01HE3A5K7NU7V8W9X0Y1Z2A3B4",
  "status": "IN_PROGRESS",
  "occurredAt": "2025-01-31T08:50:00.000Z"
}
```

---

### 4.14 AI assistant events

#### 4.14.1 `ai.response.chunk`

Emitted as the AI assistant streams tokens (spec §11). Delivered to
`user:{uid}` so all tabs of the same user see the streaming response.
Also delivered to `tenant:{tid}:role:admin` if the tenant's
`AssistantSettings.showCitations` is enabled and the admin has opted
into "monitor AI sessions" (default off).

**Payload schema**

```typescript
{
  name: 'ai.response.chunk',
  tenantId: string,
  sessionId: string,
  messageId: string,
  delta: string,             // the token(s) being streamed
  sequence: number,          // monotonically increasing within the message
  final: boolean,            // true on the last chunk before ai.response.completed
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "ai.response.chunk",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "sessionId": "01HE3A5K7NA1S2S3T4U5V6W7X8",
  "messageId": "01HE3A5K7NM1E2F3G4H5I6J7K8",
  "delta": "The",
  "sequence": 1,
  "final": false,
  "occurredAt": "2025-01-31T08:51:00.000Z"
}
```

**Client action** — append `delta` to the assistant bubble; reorder
chunks by `sequence` if they arrive out of order (possible across
reconnections).

---

#### 4.14.2 `ai.response.completed`

Emitted after the streaming response is fully generated (spec §11).
Carries the final `messageId` so the client can fetch the full message
(via `GET /v1/ai/assistant/sessions/:id`) including citations,
suggested actions, and the disclaimer.

**Payload schema**

```typescript
{
  name: 'ai.response.completed',
  tenantId: string,
  sessionId: string,
  messageId: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "ai.response.completed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "sessionId": "01HE3A5K7NA1S2S3T4U5V6W7X8",
  "messageId": "01HE3A5K7NM1E2F3G4H5I6J7K8",
  "occurredAt": "2025-01-31T08:51:30.000Z"
}
```

---

#### 4.14.3 `ai.response.failed`

Emitted when the AI request fails — upstream provider error,
prompt-injection detected, license revoked mid-stream, etc. (spec
§11, §27.7).

**Payload schema**

```typescript
{
  name: 'ai.response.failed',
  tenantId: string,
  sessionId: string,
  failureReasonKey: string,
  occurredAt: string
}
```

**Example payload**

```json
{
  "name": "ai.response.failed",
  "tenantId": "01HE3A5K7N8QX1Y2Z3W4V5S6R7",
  "sessionId": "01HE3A5K7NA1S2S3T4U5V6W7X8",
  "failureReasonKey": "ai.errors.unavailable",
  "occurredAt": "2025-01-31T08:52:00.000Z"
}
```

**Client action** — show the failure reason in the assistant bubble;
offer a "retry" button.

---

## 5. Client → server events (3)

The three client→server events manage document subscription and
presence (spec §13.4). All three are validated with Zod; malformed
payloads return an ack `{ ok: false, messageKey: 'errors.VALIDATION_FAILED' }`.

### 5.1 `document:subscribe`

Joins the socket to the `document:{docId}` room after verifying the
user can access the document.

**Payload**

```typescript
{ documentId: string }       // UUID
```

**Example**

```typescript
socket.emit('document:subscribe', { documentId: '01HE3A5K7NP9Q8R7S6T5U4V3W2' },
  (ack: { ok: boolean; messageKey?: string }) => {
    if (!ack.ok) {
      console.error('Subscribe failed:', ack.messageKey);
    }
  });
```

**Server-side handler** (simplified from
[`apps/backend/src/websocket/realtime.gateway.ts`](../apps/backend/src/websocket/realtime.gateway.ts)):

```typescript
@SubscribeMessage('document:subscribe')
async onSubscribeDocument(
  @ConnectedSocket() socket: Socket,
  @MessageBody() data: { documentId: string },
): Promise<{ ok: boolean; messageKey?: string }> {
  const user = socket.data.user;
  if (!user) return { ok: false, messageKey: 'errors.UNAUTHENTICATED' };
  // DocumentService.canAccess(...) check goes here.
  await socket.join(`document:${data.documentId}`);
  return { ok: true };
}
```

**Ack**

```typescript
{ ok: true } | { ok: false, messageKey: 'errors.UNAUTHENTICATED' | 'errors.FORBIDDEN' | 'errors.VALIDATION_FAILED' }
```

---

### 5.2 `document:unsubscribe`

Leaves the `document:{docId}` room.

**Payload**

```typescript
{ documentId: string }
```

**Example**

```typescript
socket.emit('document:unsubscribe',
  { documentId: '01HE3A5K7NP9Q8R7S6T5U4V3W2' },
  (ack: { ok: boolean }) => { /* … */ });
```

**Ack** — `{ ok: true }`.

The server also clears the user's presence for that document and
broadcasts `presence.updated` to remaining watchers.

---

### 5.3 `presence:announce`

Announces the user's presence (viewing/idle/editing) and optional
cursor position for the document currently open. Triggers a
`presence.updated` broadcast to other watchers of the same document
(spec §9.11).

**Payload**

```typescript
{
  documentId: string,
  action: 'viewing' | 'idle' | 'editing',
  cursor?: { x: number; y: number; page: number }
}
```

**Example**

```typescript
socket.emit('presence:announce', {
  documentId: '01HE3A5K7NP9Q8R7S6T5U4V3W2',
  action: 'editing',
  cursor: { x: 340, y: 220, page: 2 }
}, (ack: { ok: boolean }) => { /* … */ });
```

**Server-side handler** broadcasts to the `document:{docId}` room
(excluding the sender — `socket.to(...)`):

```typescript
socket.to(`document:${data.documentId}`).emit('presence.updated', {
  userId: user.sub,
  documentId: data.documentId,
  action: data.action,
  cursor: data.cursor,
  timestamp: new Date().toISOString(),
});
```

**Ack** — `{ ok: true }`.

**Rate limit** — high-frequency event. See [§6](#6-rate-limiting).

---

## 6. Rate limiting

### 6.1 Per-socket throttling

Each socket is rate-limited on **outbound (client→server) events**
(spec §27.3). Limits are enforced via a token-bucket per socket,
keyed by `socket.id`:

| Event                    | Limit             | Window | Notes                                            |
| ------------------------ | ----------------- | ------ | ------------------------------------------------ |
| `document:subscribe`     | 30 events         | 1 min  | Spammed by users navigating list → detail.       |
| `document:unsubscribe`   | 30 events         | 1 min  | —                                                |
| `presence:announce`      | 60 events         | 1 min  | Capped at 1/sec to coalesce rapid cursor moves.  |

When a client exceeds the limit, the server returns an ack
`{ ok: false, messageKey: 'errors.RATE_LIMITED' }` and does not
process the event. Repeated abuse triggers a forced disconnect.

### 6.2 Inbound (server→client) throttling

High-frequency server→client events are coalesced before delivery
(spec §13.3, §27.3):

| Event                    | Coalescing strategy                                                |
| ------------------------ | ----------------------------------------------------------------- |
| `presence.updated`       | One event per (room, user) per 500 ms — last-write-wins.           |
| `scanner.job.progress`   | Throttled to 1 event / 2 s — the UI shows a progress bar regardless.|
| `ai.response.chunk`      | Not throttled (token streaming is the point).                      |
| `job.progress.updated`   | Throttled to 1 event / 5 s.                                        |

Coalescing happens in the
[`WebSocketGatewayService`](../apps/backend/src/websocket/gateway.service.ts)
before the Redis pub/sub publish. The principle: the client UX must
remain smooth even under bursty event sources.

### 6.3 Tenant-wide circuit breaker

If a tenant generates more than 10 000 events per minute (indicative
of a runaway loop or attack), the gateway switches the tenant to
**degraded mode**: only critical-severity events (`audit.alert`,
`license.status.changed`, `ai.response.failed`) are delivered. The
admin is notified via a `notification.created` event. Degraded mode
auto-clears after 5 minutes of normal volume.

---

## 7. Reliability

### 7.1 Reconnection semantics

Socket.IO's reconnection is enabled by default in the client SDK.
After reconnect:

1. The server re-joins the socket to `tenant:{tid}` and `user:{uid}`
   automatically.
2. Document subscriptions (`document:{docId}`) MUST be re-issued by
   the client (the gateway does not persist subscriptions across
   disconnects — they live in the socket's room membership).
3. The client SHOULD call `GET /v1/notifications?unreadOnly=true` to
   fetch any notifications that were emitted while disconnected.

### 7.2 Missed event recovery

Smart EDMS does **not** implement per-event ACK/replay for
server→client events (spec §13.5). The reliability model is:

- **Soft-realtime delivery**: events are best-effort. If a socket is
  disconnected when an event is emitted, the socket does not receive
  it on reconnect.
- **REST fallback**: clients re-fetch authoritative state via REST
  after reconnect. The events are signals ("something changed; go
  refresh") rather than data carriers.
- **Critical events**: `audit.alert`, `license.status.changed`, and
  `ai.response.failed` are also persisted (to `AuditEvent`,
  `LicenseLocalState`, and `AssistantAuditEvent` respectively) so the
  client can poll for them via REST if the WebSocket was missed.

This trade-off keeps the gateway simple and avoids the complexity of
a per-socket event log. The payload schema intentionally carries only
IDs (`documentId`, `instanceId`, …), not full resource snapshots, to
make REST re-fetch the obvious recovery path.

### 7.3 Deduplication

The client SDK deduplicates events using a composite key
`{name, occurredAt, resourceId}`. Events with the same key arriving
within a 10-second window are dropped. This handles the rare case
where Redis pub/sub delivers a message twice (e.g. during a Redis
failover).

```typescript
const seen = new Map<string, number>();

socket.onAny((name, payload) => {
  const key = `${name}:${payload.occurredAt}:${payload.documentId ?? payload.instanceId ?? payload.jobId ?? ''}`;
  const now = Date.now();
  if (seen.has(key) && now - seen.get(key)! < 10_000) return;
  seen.set(key, now);
  // Dispatch to handler.
});
```

### 7.4 Ordering guarantees

- **Per-resource ordering**: events for the same resource (same
  `documentId`, `instanceId`, etc.) are delivered in `occurredAt`
  order. The Redis adapter preserves order for messages published to
  the same channel by the same publisher.
- **Cross-resource ordering**: no ordering guarantee. The client must
  handle out-of-order arrival for unrelated resources.
- **AI streaming**: `ai.response.chunk` events carry a `sequence`
  number; the client must reorder by `sequence` if they arrive out of
  order (possible after a reconnection).

### 7.5 Backpressure

If a client's network cannot keep up with the event rate, Socket.IO's
buffer fills and the server eventually disconnects the socket with
`transport close`. The client SDK uses `socket.io-client`'s built-in
buffer-management which drops the oldest unacknowledged events after
64 KB and triggers a reconnect. This is acceptable because of the
REST-fallback reliability model in [§7.2](#72-missed-event-recovery).

### 7.6 Redis adapter failover

The Redis adapter uses two Redis connections (pub and sub) per backend
instance. If Redis becomes unavailable:

1. Events emitted by the local instance are still delivered to
   locally-connected sockets (the adapter falls back to in-process
   broadcast).
2. Events emitted by other instances are NOT delivered until Redis
   recovers.
3. The health endpoint `GET /v1/health/ready` reports Redis as
   `down` and Kubernetes stops routing traffic to the instance.

This is a known degradation; the operational runbook at
[`DEPLOYMENT.md`](./DEPLOYMENT.md) covers recovery.

---

## 8. Client SDK reference

### 8.1 Minimal TypeScript client

```typescript
import { io, type Socket } from 'socket.io-client';
import type { WebSocketEvent } from '@smart-edms/types';

export class EdmsRealtimeClient {
  private readonly socket: Socket;
  private readonly seen = new Map<string, number>();
  private readonly handlers = new Map<string, (payload: any) => void>();

  constructor(url: string, getToken: () => string | null) {
    this.socket = io(url, {
      auth: (cb) => cb({ token: getToken() }),
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    this.socket.on('connect', () => {
      console.log('[ws] connected', this.socket.id);
      // Re-subscribe to documents the user was viewing.
      for (const docId of this.subscribedDocuments) {
        this.socket.emit('document:subscribe', { documentId: docId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[ws] disconnected', reason);
    });

    this.socket.on('error', (err) => {
      console.error('[ws] error', err);
    });

    // Dispatch all events through the dedup layer.
    this.socket.onAny((name, payload) => this.dispatch(name, payload));
  }

  private subscribedDocuments = new Set<string>();

  subscribeToDocument(documentId: string): void {
    this.subscribedDocuments.add(documentId);
    this.socket.emit('document:subscribe', { documentId }, (ack: any) => {
      if (!ack?.ok) console.warn('subscribe failed', ack);
    });
  }

  unsubscribeFromDocument(documentId: string): void {
    this.subscribedDocuments.delete(documentId);
    this.socket.emit('document:unsubscribe', { documentId });
  }

  announcePresence(documentId: string, action: 'viewing' | 'idle' | 'editing',
                   cursor?: { x: number; y: number; page: number }): void {
    this.socket.emit('presence:announce', { documentId, action, cursor });
  }

  on<K extends WebSocketEvent['name']>(
    name: K,
    handler: (payload: Extract<WebSocketEvent, { name: K }>) => void,
  ): () => void {
    this.handlers.set(name, handler as (p: any) => void);
    return () => this.handlers.delete(name);
  }

  private dispatch(name: string, payload: any): void {
    const key = `${name}:${payload.occurredAt}:${payload.documentId ?? payload.instanceId ?? payload.jobId ?? ''}`;
    const now = Date.now();
    if (this.seen.has(key) && now - this.seen.get(key)! < 10_000) return;
    this.seen.set(key, now);
    const handler = this.handlers.get(name);
    if (handler) handler(payload);
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}
```

### 8.2 React hook (sketch)

```typescript
import { useEffect, useRef, useState } from 'react';
import { EdmsRealtimeClient } from './realtime-client';

export function useRealtime(token: string | null) {
  const clientRef = useRef<EdmsRealtimeClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const client = new EdmsRealtimeClient(
      `${window.location.origin}/realtime`,
      () => token,
    );
    clientRef.current = client;
    client.on('__connect', () => setConnected(true));
    client.on('__disconnect', () => setConnected(false));
    return () => client.disconnect();
  }, [token]);

  return { client: clientRef.current, connected };
}
```

### 8.3 Electron client

The Electron app at
[`apps/electron/src/renderer/api/websocket.ts`](../apps/electron/src/renderer/api/websocket.ts)
ships a production-ready client that handles all 26 events, retry,
and presence. See that file for the reference implementation.

---

## 9. Changelog

| Date       | Change                                                                              |
| ---------- | ----------------------------------------------------------------------------------- |
| 2025-01-31 | Initial creation. Documented all 26 server→client + 3 client→server events.         |

---

**Related documents**

- [`API_SPECIFICATION.md`](./API_SPECIFICATION.md) — the REST endpoints
  that trigger the events in §4.
- [`DATA_MODEL.md`](./DATA_MODEL.md) — the entities referenced in event
  payloads (`Document`, `WorkflowInstance`, `AssistantSession`, …).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the Socket.IO Redis adapter
  topology and horizontal-scaling notes.
- [`SECURITY_CONTROLS.md`](./SECURITY_CONTROLS.md) — the security
  controls covering handshake auth, per-event auth, and tenant scoping.
- [`THREAT_MODEL.md`](./THREAT_MODEL.md) — threats specific to the
  real-time channel (token theft, cross-tenant leakage, DoS).
