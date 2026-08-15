# Smart EDMS — Architecture

> Spec reference: §8 (System Architecture), §4 (Locked Architecture Decisions).

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Electron Desktop Client                            │
│  (React + Mantine v7 + i18next + Zustand + TanStack Query + Socket.IO)   │
└──────────────────────────────────────────────────────────────────────────┘
                     │ REST (HTTPS)         │ WebSocket (WSS)
                     ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Reverse Proxy (Nginx / Traefik)                         │
│           TLS termination, rate limit, security headers, WS upgrade       │
└──────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              NestJS On-Premise Backend (Fastify adapter)                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Auth │ Tenant │ Users │ Documents │ Classification │ Workflow      │  │
│  │ Retention │ LegalHold │ Audit │ Search │ Share │ Notifications    │  │
│  │ License │ Scanner │ Tour │ AI Assistant │ Admin │ Health          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│              Guards: JWT → Tenant → License (per request)                 │
└──────────────────────────────────────────────────────────────────────────┘
        │            │            │            │             │
        ▼            ▼            ▼            ▼             ▼
   PostgreSQL     Redis      OpenSearch    MinIO/S3     BullMQ Workers
                                                                │
                                                  ┌─────────────────────────┐
                                                  │ Document processing    │
                                                  │ Audit export           │
                                                  │ Retention evaluation   │
                                                  │ Search indexing        │
                                                  │ Scanner OCR pipeline   │
                                                  │ Webhook delivery       │
                                                  └─────────────────────────┘

                     ── Connected (when online) ──
                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              Licensing Server (vendor-hosted, separate NestJS app)        │
│  Customer / Product / Plan / License / Activation / Device / Heartbeat    │
│  Trial / Webhook / API Key / Audit Log / SigningKey                       │
│  Signs .sedmslic / processes .sedmsreq / issues .sedmscrl                 │
└──────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              License Admin Panel (React + Mantine v7)                     │
│  MFA login + step-up auth for sensitive operations                       │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│              Marketing Public Page (Next.js 14)                           │
│  Multilingual (6 locales), SEO, hreflang, RTL                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Electron Desktop Client
- Premium UI (Mantine v7 enterprise UX)
- i18n + RTL (Arabic)
- System theme support
- Authenticated REST calls
- WebSocket real-time client
- Native file upload (drag-and-drop, multi-file, resumable)
- Guided Tour rendering (custom engine using Mantine Popover)
- AI Assistant Bubble UI
- License import UX (`.sedmslic` files)
- Future scan agent coordination
- Secure local preferences (Electron safeStorage for JWT)

### NestJS On-Premise Backend (authoritative for)
- Authentication verification
- Authorization (RBAC + ABAC)
- Tenant isolation (server-enforced, row-level scoping)
- Document access + lifecycle
- Workflows (BPMN/CMMN/DMN)
- Audit logs (append-only, hash-chained, tamper-evident)
- Retention + legal hold
- License enforcement (fail-closed)
- Search permissions (no existence leakage)
- WebSocket authorization
- AI tool authorization
- Tour configuration + progress persistence
- Scanner orchestration

### Licensing Server (authoritative for)
- Customers, products, plans
- License issuance, renewal, revocation
- Activations + device binding
- Heartbeat ingestion
- Usage metering
- Trials
- Offline activation request processing
- Offline license certificate issuance
- Signed revocation lists (`.sedmscrl`)
- Webhook delivery
- License audit logs
- Signing key management (private keys NEVER leave this server)

## Locked Architecture Decisions (§4)

| Decision | Locked Choice |
|----------|---------------|
| Electron deployment model | Desktop client connecting to remote on-premise backend |
| Licensing server model | Cloud/hosted control plane + offline/air-gap signed license support |
| License file extensions | `.sedmslic`, `.sedmsreq`, `.sedmscrl` |
| License failure behavior | 6-state machine: valid → expiring_soon → expired_grace → grace_exhausted → extended_remediation → invalid |
| Arabic flag representation | Configurable per tenant (neutral by default) |
| Scanner integration | Phase 1: upload; Phase 2: TWAIN/WIA/ISIS/network agent |
| Theme strategy | System default; light + dark both premium |
| Branding | Full modern premium branding across all surfaces |

## Request Flow

Every non-public REST request passes through:

```
1. Helmet (CSP, HSTS, X-Frame-Options)
2. Rate limiter (global 200/min, auth 10/min, AI 20/min)
3. TenantContextMiddleware (correlation ID, tenant propagation)
4. ValidationPipe (Zod schemas, whitelist, transform)
5. JwtAuthGuard (verify access token, populate req.user)
6. TenantGuard (verify tenant scoping, optional role check)
7. LicenseGuard (check license state, fail-closed for invalid)
8. Controller (audit decorator captures the call)
9. AuditInterceptor (records audit event on success or failure)
10. Service (business logic, Prisma transaction)
11. AllExceptionsFilter (normalized error envelope on throw)
```

## Multi-Tenant Isolation

- Every tenant-owned record carries `tenant_id`
- All Prisma queries scoped by `tenantId` from JWT (never from path or body)
- Path-supplied `tenantId` that differs from JWT `tid` → 403 FORBIDDEN
- Cross-tenant access attempts audited as `result: deny`
- Row-level security recommended at PostgreSQL level (optional)
- Negative tests must prove cross-tenant denial (spec §24.2)

## WebSocket Real-Time Layer

- Socket.IO with Redis adapter (horizontal scaling)
- Handshake auth via JWT (`auth: { token }`)
- Rooms: `tenant:{tid}`, `user:{uid}`, `document:{docId}`, `crisis_room:{roomId}`
- Every event authorized server-side
- Sensitive events don't leak existence of restricted resources
- Event payloads validated with Zod
- 26 event types (spec §13.4): document.*, workflow.*, audit.alert, notification.created, share.link.updated, legalHold.changed, retention.changed, license.status.changed, presence.updated, crisisRoom.sync, search.index.updated, job.progress.updated, scanner.job.*, tour.updated, ai.response.*

## AI Assistant Architecture

```
AI Bubble UI (Electron)
    │
    ▼
POST /v1/ai/assistant/chat
    │
    ▼
AiController (auth + license check)
    │
    ▼
AiService.chat():
    1. Validate tenant AI settings (enabled, allowed roles)
    2. Check license entitlement (ai-assistant module)
    3. Apply rate limit (per-user, configurable)
    4. Apply daily quota
    5. Build secure AiContextEnvelope (user, tenant, roles, locale, licensed modules)
    6. Detect prompt injection (heuristic patterns)
    7. Resolve or create session
    8. Persist user message (content hash only, not full content)
    9. Call model provider (external/local/hybrid/none)
    10. Dispatch tool calls through ToolCatalog (each tool re-validates authorization)
    11. Build citations (only accessible documents)
    12. Persist assistant message + tool invocations + suggested actions
    13. Emit audit event
    14. Stream response (SSE)
```

## License State Machine

The 6-state machine (spec §4.4):

```
                    ┌─────────────────────────────────┐
                    │                                 │
                    ▼                                 │
              ┌──────────┐    expiring soon    ┌──────────────┐
              │  valid   │ ──────────────────▶ │ expiring_soon│
              └──────────┘                     └──────────────┘
                    │                                  │
                    │     expires                      │ expires
                    ▼                                  ▼
              ┌──────────────────┐            ┌──────────────────┐
              │   expired_grace  │◀───────────│   expired_grace  │
              └──────────────────┘            └──────────────────┘
                    │                                  │
                    │     grace exhausted              │ grace exhausted
                    ▼                                  ▼
              ┌──────────────────┐            ┌──────────────────┐
              │ grace_exhausted  │  ────────▶ │ grace_exhausted  │
              │  (read-only)     │            │  (read-only)     │
              └──────────────────┘            └──────────────────┘
                    │
                    │     extended non-remediation
                    ▼
              ┌─────────────────────┐
              │ extended_remediation│  (admin-only)
              └─────────────────────┘

              ┌──────────┐
              │ invalid  │  ◀── signature invalid, revoked, or device mismatch
              └──────────┘
```

Each state is computed by `computeLicenseState()` in `@smart-edms/license-core` based on:
- Signature validity
- Revocation state
- Device fingerprint match
- Environment match
- Current time vs issuedAt/expiresAt/gracePeriodDays
- Heartbeat failures

## Brand System

The brand uses a refined indigo/blue primary with a cyan/teal accent, designed to feel premium, precise, trustworthy, intelligent, calm, enterprise-grade, modern, secure, multilingual, culturally aware, and non-hyperbolic (spec §19.1).

Both light and dark themes are first-class — neither is an afterthought. The light theme uses soft neutral gray/off-white backgrounds with deep slate text; the dark theme uses deep graphite/navy backgrounds with soft white text.

The product name "Smart EDMS" is consistent across all locales. Descriptive text translates; the product name does not (spec §19.2).

## Scalability

- Stateless API layer (any request can go to any instance)
- Redis adapter for Socket.IO (multi-instance WebSocket fan-out)
- BullMQ workers scale independently from API
- Cursor-based pagination on all list endpoints (no OFFSET performance cliffs)
- Heavy jobs (search indexing, audit export, OCR, redaction) queued, not inline
- Idempotent workers (safe retries, dead-letter handling)
- Per-tenant and per-user rate limits + quotas
- Connection pooling (Prisma + ioredis)
- ETag + Cache-Control where safe (never caches sensitive content)

## Observability

- Structured logging via Pino (JSON in production, pretty in dev)
- Correlation IDs on every request (X-Request-Id)
- Secrets redacted from logs (passwords, tokens, license private keys)
- Health checks: `/v1/health/live` (liveness), `/v1/health/ready` (readiness with DB + Redis checks)
- Audit events on every sensitive operation
- Hash-chain verification endpoint: `GET /v1/audit/verify-chain`
- OpenTelemetry hooks (ready to wire to a collector)
- Prometheus-compatible metrics (ready to expose via /metrics)
