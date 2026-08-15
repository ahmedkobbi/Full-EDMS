# ADR-0001: Use Electron as desktop client connecting to remote on-premise backend

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §4.1 (Electron Deployment Model)

## Context

Smart EDMS is an enterprise-grade EDMS targeting regulated industries (legal, finance, healthcare, government) that require on-premise deployment. The product needs a premium desktop experience while keeping authoritative data and business logic on a controlled backend.

Two deployment models were considered:

1. **Electron as both client and backend host** (local sidecar)
2. **Electron as desktop client connecting to a remote on-premise backend**

## Decision

Use **Electron as desktop client connecting to a remote on-premise NestJS backend**.

The Electron app is the premium desktop experience. It is NOT the primary backend host in the standard enterprise deployment.

The Electron client is responsible for:
- Rendering the Smart EDMS UI (Mantine v7)
- i18n and `t()`
- RTL support for Arabic
- Authenticated REST calls to the on-premise backend
- WebSocket real-time connection
- Native file upload (drag-and-drop, multi-file)
- Guided Tour rendering
- AI Assistant Bubble UI
- License import UX

The NestJS on-premise backend remains authoritative for:
- Authentication verification
- Authorization
- Tenant isolation
- Document access + lifecycle
- Workflows
- Audit logs
- License enforcement
- AI tool authorization

## Consequences

### Positive

- Centralized data control (single backend, easier to secure + audit)
- Multi-user collaboration (multiple Electron clients connect to one backend)
- Enterprise deployment flexibility (backend can be scaled independently)
- License enforcement is server-side (tamper-resistant)
- Electron app stays lightweight (no database, no queues, no object storage)

### Negative

- Requires network connectivity to the backend (offline mode requires explicit license support)
- Backend must be deployed separately (more infrastructure)
- Latency for users far from the backend (mitigated by WebSocket + caching)

### Neutral

- Electron app is still a sizable download (~150MB)
- Auto-update infrastructure needed for the Electron app

## Alternatives Considered

### Electron with local sidecar backend

- **Pros**: Works offline by default; no network dependency
- **Cons**: Data scattered across user devices; hard to secure; no multi-user collaboration; license enforcement is client-side (easily bypassed); audit integrity compromised
- **Rejected because**: Enterprise customers require centralized data control and auditability. Client-side licensing is not tamper-resistant.

### Pure web app (no Electron)

- **Pros**: Simpler deployment; no installer
- **Cons**: No native file dialogs; no OS keychain for JWT; no drag-and-drop with the same fidelity; no auto-update; less "premium" feel
- **Rejected because**: Spec §4.1 explicitly requires an Electron desktop experience. Premium enterprise customers expect a native-feeling app.

### Mobile-first (React Native / Flutter)

- **Pros**: Mobile access
- **Cons**: Not the target use case (EDMS is primarily desktop); mobile access is a future enhancement (spec §12.3 — `mobile-access` entitlement)
- **Rejected because**: Out of scope for MVP.
