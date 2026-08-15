# Smart EDMS — API Specification

> **Spec references:** §26.11 (API surface), §14 (REST API contract), §9.x
> (module-by-module functional scope), §12 (licensing system), §16
> (i18n), §21 (security), §27 (rules).
>
> **Cross-references:**
> - Real-time push (Socket.IO) → [`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md)
> - Database entities / Prisma schema → [`DATA_MODEL.md`](./DATA_MODEL.md)
> - Licensing artifact formats → [`LICENSE_FILE_SPEC.md`](./LICENSE_FILE_SPEC.md)
> - Threat model & security controls → [`SECURITY_CONTROLS.md`](./SECURITY_CONTROLS.md),
>   [`THREAT_MODEL.md`](./THREAT_MODEL.md)

This document is the canonical REST API catalog for the Smart EDMS platform.
It covers **two independently deployed services**:

1. **On-premise EDMS backend** (`apps/backend`, default port `3000`) — the
   multi-tenant document-management application.
2. **Licensing server** (`apps/license-server`, default port `4001`) — the
   vendor-side service that signs license artifacts, receives heartbeats,
   and serves the License Admin Panel API.

Both services speak the same envelope, error, and pagination dialects
defined in [`@smart-edms/types`](../packages/types/src/api.ts). They differ in
authentication model: the EDMS backend issues tenant-scoped user JWTs; the
licensing server issues admin JWTs plus optional API-key auth for
machine-to-machine activation/heartbeat calls.

---

## Table of contents

1. [Overview](#1-overview)
2. [Common patterns](#2-common-patterns)
3. [Endpoint catalog — EDMS backend](#3-endpoint-catalog--edms-backend)
   - 3.1 [Auth](#31-auth)
   - 3.2 [Users](#32-users)
   - 3.3 [Tenant](#33-tenant)
   - 3.4 [Documents](#34-documents)
   - 3.5 [Classification](#35-classification)
   - 3.6 [Workflows](#36-workflows)
   - 3.7 [Retention](#37-retention)
   - 3.8 [Legal Hold](#38-legal-hold)
   - 3.9 [Audit](#39-audit)
   - 3.10 [Search](#310-search)
   - 3.11 [Share](#311-share)
   - 3.12 [Notifications](#312-notifications)
   - 3.13 [License (local state)](#313-license-local-state)
   - 3.14 [Scanner](#314-scanner)
   - 3.15 [Tours](#315-tours)
   - 3.16 [AI Assistant](#316-ai-assistant)
   - 3.17 [Admin](#317-admin)
   - 3.18 [Health](#318-health)
4. [Endpoint catalog — License Server](#4-endpoint-catalog--license-server)
   - 4.1 [Admin auth](#41-admin-auth)
   - 4.2 [Customers](#42-customers)
   - 4.3 [Products & Plans](#43-products--plans)
   - 4.4 [Licenses](#44-licenses)
   - 4.5 [Activations (online + offline)](#45-activations-online--offline)
   - 4.6 [Devices](#46-devices)
   - 4.7 [Heartbeats](#47-heartbeats)
   - 4.8 [Trials](#48-trials)
   - 4.9 [Webhooks](#49-webhooks)
   - 4.10 [API Keys](#410-api-keys)
   - 4.11 [Signing Keys](#411-signing-keys)
   - 4.12 [Audit Logs](#412-audit-logs)
   - 4.13 [Revocation / CRL](#413-revocation--crl)
   - 4.14 [Public](#414-public)
5. [Error code reference](#5-error-code-reference)
6. [OpenAPI / Swagger generation](#6-openapi--swagger-generation)
7. [Changelog](#7-changelog)

---

## 1. Overview

### 1.1 Versioning

Every EDMS endpoint lives under the `/v1` prefix (spec §14.1). The licensing
server also uses `/v1`. Breaking changes require a new prefix (`/v2`); the old
prefix remains available for at least one major release cycle with a
`Sunset` header advertised on deprecation.

Non-breaking additions (new optional request fields, new response fields, new
endpoints) are shipped under the existing prefix. Clients MUST ignore unknown
response fields.

### 1.2 Base URLs

| Service            | Base URL                       | Default port |
| ------------------ | ------------------------------ | ------------ |
| EDMS backend       | `https://<host>/v1`            | 3000         |
| EDMS WebSocket     | `wss://<host>/realtime`        | 3000         |
| License server     | `https://<host>/v1`            | 4001         |
| License admin UI   | `https://<host>/`              | 5173 (dev)   |

Behind nginx (see [`infra/nginx/nginx.conf`](../infra/nginx/nginx.conf)) the
EDMS backend and the WebSocket gateway share port 443; nginx routes `/v1/*`
to the backend and `/realtime` to the WebSocket upgrade handler.

### 1.3 Content type

All request bodies and responses are `application/json; charset=utf-8` unless
otherwise noted. Multipart uploads (document chunks, scanner batches) use
`multipart/form-data` per the Fastify multipart parser. SSE streams
(`/v1/ai/assistant/chat?stream=true`) use `text/event-stream`.

### 1.4 Authentication

| Mechanism          | Where applied                                        | Lifetime                |
| ------------------ | ---------------------------------------------------- | ----------------------- |
| JWT Bearer (user)  | EDMS backend, every non-`@Public()` route            | access 15 min, refresh 30 d |
| JWT Bearer (admin) | License server admin routes                          | access 15 min, refresh 30 d |
| Step-up JWT        | License server destructive ops (`revoke`, `rotate`)  | 5 min                   |
| API key            | License server `POST /v1/activate/online`, `POST /v1/heartbeat` | rotated by customer |
| Activation code    | License server first-install activation              | single-use              |
| None (`@Public()`) | `/v1/auth/login`, `/v1/health/*`, `/v1/crl`           | n/a                     |

JWTs carry the following claims (see
[`apps/backend/src/modules/auth/jwt.strategy.ts`](../apps/backend/src/modules/auth/jwt.strategy.ts)
and
[`apps/license-server/src/modules/admin-auth/admin-jwt.strategy.ts`](../apps/license-server/src/modules/admin-auth/admin-jwt.strategy.ts)):

```jsonc
// EDMS user access token (HS256 / RS256 — configured via JWT_SECRET)
{
  "sub": "<uuid-user-id>",          // spec §15.4
  "tid": "<uuid-tenant-id>",        // multi-tenant scoping (§15.3)
  "roles": ["admin", "editor"],     // role codes (§9.2)
  "locale": "en",                   // preferred locale (§16)
  "type": "access",                 // access | refresh | step-up
  "iat": 1730000000,
  "exp": 1730000900                 // +15 min
}
```

Refresh tokens are opaque, hashed at rest in the `sessions` table (see
[`DATA_MODEL.md` §5.1](./DATA_MODEL.md#51-identity--tenancy)), and rotated
on every use. Revocation is enforced via the session table plus a Redis
revocation list keyed by `jti`.

### 1.5 Tenant scoping

Every EDMS request is scoped to the `tid` claim of the JWT (spec §15.3). The
[`TenantContextMiddleware`](../apps/backend/src/common/middleware/tenant-context.middleware.ts)
loads the tenant row once per request and stores it on `req.tenant`. The
[`TenantGuard`](../apps/backend/src/common/guards/tenant.guard.ts) refuses any
request whose JWT `tid` does not match an `ACTIVE` tenant.

The licensing server is **not** multi-tenant — it serves many *customers* but
every admin JWT is global. Tenant isolation for the EDMS backend is enforced
both at the Prisma query layer (every `where` clause includes `tenantId`) and
via PostgreSQL row-level security policies recommended in production (spec
§15.3). See [`DATA_MODEL.md` §2](./DATA_MODEL.md#2-multi-tenant-isolation-rules-153).

### 1.6 License enforcement

Every EDMS route that is not `@Public()` is wrapped by the
[`LicenseGuard`](../apps/backend/src/common/guards/license.guard.ts), which
runs the 6-state license state machine (spec §4.4):

| State                | Behaviour                                                       |
| -------------------- | --------------------------------------------------------------- |
| `valid`              | Request proceeds.                                               |
| `grace_period`       | Request proceeds; `X-License-Grace` header set.                 |
| `grace_exhausted`    | Mutating routes → `402 LICENSE_GRACE_EXHAUSTED`. Reads proceed. |
| `expired`            | Mutating routes → `402 LICENSE_EXPIRED`. Reads proceed.         |
| `revoked`            | All routes → `402 LICENSE_INVALID`.                             |
| `invalid` / `missing`| Fail-closed endpoints → `402 LICENSE_INVALID`; others proceed.  |

Routes decorated with `@LicenseRequired({ failClosed: true })` (notably the
AI assistant) refuse all traffic in any state other than `valid` or
`grace_period`. See [`SECURITY_CONTROLS.md`](./SECURITY_CONTROLS.md) and the
test suite at
[`apps/backend/test/license-enforcement.test.ts`](../apps/backend/test/license-enforcement.test.ts).

### 1.7 Audit

Every mutating endpoint is decorated with `@Audit({ category, code,
resourceType, resourceIdParam? })` (see
[`apps/backend/src/common/decorators/audit.decorator.ts`](../apps/backend/src/common/decorators/audit.decorator.ts)
and the
[`AuditInterceptor`](../apps/backend/src/common/interceptors/audit.interceptor.ts)).
The interceptor writes an `AuditEvent` row with a hash-chain link to the
previous event for the same tenant (spec §21.7, §27.3). Audit events are
**never soft-deleted** (spec §15.5).

---

## 2. Common patterns

### 2.1 Authentication flow

```text
┌──────────┐  POST /v1/auth/login        ┌──────────┐
│  Client  │ ─────────────────────────▶  │  Backend │
│          │ ◀──────────────────────────  │          │
│          │  200 { accessToken,          │          │
│          │       refreshToken,          │          │
│          │       user }                 │          │
│          │                              │          │
│          │  + 15 min: token expires      │          │
│          │  POST /v1/auth/refresh       │          │
│          │ ─────────────────────────▶  │          │
│          │ ◀──────────────────────────  │          │
│          │  200 { accessToken,          │          │
│          │       refreshToken }         │          │
│          │                              │          │
│          │  logout: POST /v1/auth/logout│          │
│          │ ─────────────────────────▶  │          │
│          │ ◀──────────────────────────  │          │
│          │  204 No Content              │          │
└──────────┘                              └──────────┘
```

The backend rotates the refresh token on every `/v1/auth/refresh` call
(detectable reuse → both tokens revoked, all sessions for the user
invalidated, security alert raised). See spec §21.4 and
[`AI_ASSISTANT.md`](./AI_ASSISTANT.md) for the AI-specific auth flow.

### 2.2 Pagination (cursor-based)

Every list endpoint accepts the same query shape (spec §14.3, defined in
[`@smart-edms/types` `CursorPaginationParams`](../packages/types/src/common.ts)):

| Param    | Type                | Default | Notes                                                    |
| -------- | ------------------- | ------- | -------------------------------------------------------- |
| `limit`  | integer `1..100`    | `50`    | Hard cap 100 — `> 100` → `400 VALIDATION_FAILED`.        |
| `cursor` | opaque string       | `null`  | Treat as opaque; do not construct client-side.           |
| `sort`   | enum (per endpoint) | `createdAt` or `updatedAt` | Sort field is whitelisted per endpoint.   |
| `order`  | `asc` \| `desc`     | `desc`  | —                                                        |

Response shape (`PaginatedResponse<T>` from
[`@smart-edms/types`](../packages/types/src/api.ts)):

```jsonc
{
  "items": [ /* T, T, T, … */ ],
  "nextCursor": "<opaque-base64>" ,   // null when end of result set reached
  "hasMore": true,
  "total": null                       // null unless countable cheaply
}
```

Unbounded queries are forbidden (spec §14.3, §27.3). The cursor encodes the
last seen sort key plus an internal salt so it cannot be tampered with to
skip ahead into inaccessible rows.

### 2.3 Error envelope

Every non-2xx response uses the canonical `ApiErrorEnvelope` shape (spec
§14.2, defined in
[`@smart-edms/types`](../packages/types/src/api.ts)):

```jsonc
{
  "ok": false,
  "error": {
    "code": "LICENSE_EXPIRED",
    "messageKey": "errors.license.expired",
    "messageVars": { "graceDaysLeft": 3 },
    "traceId": "01HE3A5K7N…",
    "details": {
      "licenseState": "expired",
      "deploymentId": "01HE3…"
    }
  }
}
```

The client renders user-facing text via `t(error.messageKey,
error.messageVars)` against the bundled i18n catalogs (spec §16). `traceId`
is the request correlation ID (see §2.5). The full vocabulary of stable
`code` values is enumerated in
[`@smart-edms/types` `ApiErrorCode`](../packages/types/src/common.ts) and
listed in [§5](#5-error-code-reference) below.

HTTP status mapping (spec §14.2):

| HTTP status | When used                                                                  |
| ----------- | -------------------------------------------------------------------------- |
| 400         | `VALIDATION_FAILED`, malformed body, bad cursor.                           |
| 401         | `UNAUTHORIZED` — missing/invalid JWT.                                      |
| 402         | License-related codes (`LICENSE_EXPIRED`, `LICENSE_INVALID`, …).            |
| 403         | `FORBIDDEN`, `TENANT_MISMATCH`, `LEGAL_HOLD_BLOCKS_ACTION`, feature-gated. |
| 404         | `NOT_FOUND`, `TOUR_NOT_FOUND`.                                             |
| 409         | `CONFLICT`, `WORKFLOW_INVALID_STATE`.                                      |
| 422         | Zod validation failure with field-level details.                           |
| 429         | `RATE_LIMITED`.                                                            |
| 500         | `INTERNAL_ERROR`.                                                          |
| 503         | `AI_UNAVAILABLE` (transient).                                              |

### 2.4 Rate limiting

Three independent rate-limit windows (spec §27.3). Limits are enforced via
Redis sliding-window counters keyed by `tenantId + userId + route-class`.

| Class   | Limit           | Window | Applies to                                                 |
| ------- | --------------- | ------ | ---------------------------------------------------------- |
| Global  | 200 requests    | 1 min  | Every authenticated EDMS route.                            |
| Auth    | 10 requests     | 1 min  | `POST /v1/auth/login`, `POST /v1/auth/refresh`.            |
| AI      | 20 requests     | 1 min  | `POST /v1/ai/assistant/chat` and admin AI mutation routes. |

Exceeded limits return `429 RATE_LIMITED` with `Retry-After` and the
IETF-draft rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`,
`RateLimit-Reset`) modelled by
[`RateLimitInfo`](../packages/types/src/api.ts).

### 2.5 Correlation ID

Every request should carry an `X-Request-Id` header (UUIDv4 or similar). If
absent, the backend mints one via Fastify's `req.id`. The ID is:

- Echoed back in the `X-Request-Id` response header.
- Embedded in every `AuditEvent.correlationId` written for that request.
- Embedded in every log line via the structured logger.
- Returned as `error.traceId` on failure envelopes.

Spec §21.7. Clients SHOULD propagate the same `X-Request-Id` across
WebSocket events initiated from a REST request for end-to-end tracing.

### 2.6 Localization

The EDMS backend supports six mandatory locales (spec §16.1): `en`, `fr`,
`ar` (RTL), `ru`, `zh-CN`, `de`. The locale used to render server-side
messages is resolved in this order:

1. `Accept-Language` header on `@Public()` routes (login, password reset).
2. `locale` claim of the JWT on authenticated routes.
3. `UserPreference.locale` for the user (if set).
4. `Tenant.defaultLocale`.
5. `en` (hard fallback).

See [`I18N.md`](./I18N.md) for the full locale-resolution matrix and the
catalog layout.

### 2.7 Common headers

| Header             | Direction | Required | Purpose                                              |
| ------------------ | --------- | -------- | ---------------------------------------------------- |
| `Authorization`    | in        | yes\*    | `Bearer <jwt>` for authenticated routes.             |
| `X-Request-Id`     | in        | no       | Client-provided correlation id.                      |
| `Accept-Language`  | in        | no       | Locale hint for `@Public()` routes.                  |
| `X-Api-Key`        | in        | alt      | API key for license-server machine routes.           |
| `X-Current-Route`  | in        | no       | SPA route hint used by AI assistant context.         |
| `X-Tenant-Id`      | out       | always   | Echoed back so clients can confirm scoping.          |
| `X-Request-Id`     | out       | always   | Echoed correlation id (see §2.5).                    |
| `X-RateLimit-*`    | out       | on 429   | Rate-limit info (see §2.4).                          |
| `X-License-State`  | out       | always   | Current license state (e.g. `valid`, `grace_period`).|
| `Sunset`           | out       | on deprecated routes | RFC 8594 deprecation.                    |

\* `Authorization` is required on every EDMS route except those decorated
with `@Public()` (login, refresh, health). The licensing server accepts
either `Authorization: Bearer <admin-jwt>` or `X-Api-Key: <key>` depending
on the route.

---

## 3. Endpoint catalog — EDMS backend

Each table below lists: HTTP method, path, required auth (None / JWT /
JWT+Role / Step-Up / API Key), purpose, and a short note on error codes.
Detailed request/response schemas follow each table.

> **Auth legend**
> - **None** — `@Public()` route, no JWT.
> - **JWT** — any authenticated user.
> - **JWT + role** — `@Roles('admin', …)` decorator enforced.
> - **JWT + license** — `@LicenseRequired({ failClosed })`.
> - **Step-Up** — admin JWT with recent MFA verification (license server only).
> - **API Key** — `X-Api-Key` header (license server only).

### 3.1 Auth

| Method | Path                  | Auth  | Purpose                              | Spec    |
| ------ | --------------------- | ----- | ------------------------------------ | ------- |
| POST   | `/v1/auth/login`      | None  | Email + password → access + refresh. | §9.2    |
| POST   | `/v1/auth/refresh`    | None  | Rotate refresh → new access + refresh. | §9.2  |
| POST   | `/v1/auth/logout`     | JWT   | Revoke access + refresh tokens.      | §9.2    |

#### 3.1.1 POST /v1/auth/login

**Request body**

```jsonc
{
  "email": "user@example.com",
  "password": "<plaintext-password>",
  "captchaToken": "<optional-recaptcha-token>",
  "deviceFingerprint": "<optional-fingerprint-hash>"
}
```

Zod schema: `LoginBodySchema` in
[`packages/schemas/src/auth.ts`](../packages/schemas/src/auth.ts).

**Response 200**

```jsonc
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "01HE3A5K7N…",
    "tenantId": "01HE3A5K7N…",
    "email": "user@example.com",
    "firstName": "…",
    "lastName": "…",
    "preferredLocale": "en",
    "roles": ["editor"],
    "mfaEnabled": false
  },
  "mfaRequired": false
}
```

If MFA is enabled for the user, the response is `200` with `mfaRequired:
true` and a short-lived `mfaTicket` instead of the tokens; the client then
calls `POST /v1/auth/mfa/verify` (planned — currently inline). Failed-login
counting and lockout are applied server-side: after 5 failed attempts in
15 minutes the account is locked for 15 minutes (spec §21.4).

**Error codes**

| Code                | When                                                |
| ------------------- | --------------------------------------------------- |
| `VALIDATION_FAILED` | Malformed body, invalid email.                      |
| `UNAUTHORIZED`      | Wrong credentials.                                  |
| `RATE_LIMITED`      | More than 10 attempts per minute per IP+email.      |

#### 3.1.2 POST /v1/auth/refresh

**Request body**

```jsonc
{ "refreshToken": "<opaque>" }
```

**Response 200** — same shape as `/v1/auth/login` minus the `user` object.

**Error codes**

| Code                | When                                                        |
| ------------------- | ----------------------------------------------------------- |
| `UNAUTHORIZED`      | Unknown refresh token, or token revoked, or token reused.   |
| `RATE_LIMITED`      | More than 10 refreshes per minute.                          |

Refresh-token rotation is enforced: presenting a previously-rotated refresh
token revokes the entire session chain (spec §21.4).

#### 3.1.3 POST /v1/auth/logout

**Auth:** `Authorization: Bearer <jwt>` (the access token whose session
should be revoked).

**Request body** — none.

**Response 204** — `No Content`.

Revokes both the access token (`jti` added to Redis revocation list) and
the matching refresh token (session row marked `REVOKED`).

---

### 3.2 Users

| Method | Path                       | Auth              | Purpose                              | Spec |
| ------ | -------------------------- | ----------------- | ------------------------------------ | ---- |
| GET    | `/v1/users`                | JWT + `admin` / `user-manager` | Paginated list of users.   | §9.2 |
| GET    | `/v1/users/:id`            | JWT + `admin` / `user-manager` | Get a single user.          | §9.2 |
| POST   | `/v1/users`                | JWT + `admin` / `user-manager` | Create a user (invite).     | §9.2 |
| PATCH  | `/v1/users/:id`            | JWT + `admin` / `user-manager` | Update user (roles, status).| §9.2 |
| DELETE | `/v1/users/:id`            | JWT + `admin`               | Soft-delete a user.            | §9.2 |
| GET    | `/v1/me`                   | JWT                | Current user profile.                | §9.2 |
| PATCH  | `/v1/me/preferences`       | JWT                | Update own preferences.              | §9.2 |

#### 3.2.1 GET /v1/users

**Query params** (Zod `UserListQuerySchema`)

| Param      | Type                                  | Default | Notes                              |
| ---------- | ------------------------------------- | ------- | ---------------------------------- |
| `limit`    | int `1..100`                          | 50      | Cursor pagination.                 |
| `cursor`   | opaque string                         | null    | —                                  |
| `sort`     | `createdAt` \| `lastName` \| `email`  | `lastName` | —                               |
| `order`    | `asc` \| `desc`                       | `asc`   | —                                  |
| `status`   | `ACTIVE` \| `SUSPENDED` \| `INVITED`  | —       | Optional filter.                   |
| `role`     | string                                | —       | Filter by role code.               |
| `q`        | string                                | —       | Full-text on name/email.           |

**Response 200** — `PaginatedResponse<UserSummary>` where:

```jsonc
{
  "items": [
    {
      "id": "01HE3A5K7N…",
      "email": "user@example.com",
      "firstName": "…",
      "lastName": "…",
      "status": "ACTIVE",
      "roles": ["editor"],
      "mfaEnabled": false,
      "lastLoginAt": "2025-01-31T08:30:00.000Z",
      "createdAt": "2024-12-01T10:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "total": 1
}
```

**Error codes** — `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_FAILED`.

#### 3.2.2 POST /v1/users

**Request body**

```jsonc
{
  "email": "new-user@example.com",
  "firstName": "…",
  "lastName": "…",
  "roleCodes": ["editor"],
  "preferredLocale": "en",
  "sendInviteEmail": true
}
```

**Response 201** — `User` object (without `passwordHash`).

The service creates a `User` row in status `INVITED`, generates a
single-use invite token, and (if `sendInviteEmail`) enqueues an invite
email via BullMQ. The invite token expires in 7 days.

**Error codes**

| Code                | When                                                |
| ------------------- | --------------------------------------------------- |
| `CONFLICT`          | Email already exists in this tenant.                |
| `VALIDATION_FAILED` | Unknown role code, invalid email.                   |

#### 3.2.3 PATCH /v1/users/:id

**Request body** (all fields optional)

```jsonc
{
  "firstName": "…",
  "lastName": "…",
  "status": "ACTIVE",
  "roleCodes": ["editor", "auditor"],
  "mfaEnabled": false,
  "lockedUntil": null
}
```

**Response 200** — updated `User`.

Mutating roles triggers an `user.update` audit event and a notification to
the affected user.

#### 3.2.4 DELETE /v1/users/:id

Soft-deletes the user: sets `status = DELETED` and `deletedAt = now()`.
Existing sessions are revoked. The user's documents and audit events
**remain** — they are re-attributed to a system user for provenance
(spec §15.5).

**Response 200** — `{ "ok": true }`.

#### 3.2.5 GET /v1/me

Returns the current user's profile, preferences, and active tenant
context (no pagination).

```jsonc
{
  "user": { "id": "…", "email": "…", "roles": ["editor"], "…" : "…" },
  "preferences": {
    "locale": "en",
    "theme": "system",
    "timezone": "UTC",
    "reducedMotion": false,
    "highContrast": false,
    "tourAutoStart": true,
    "aiAssistantEnabled": true
  },
  "tenant": {
    "id": "…",
    "name": "…",
    "defaultLocale": "en",
    "enabledLocales": ["en", "fr", "ar", "ru", "zh-CN", "de"],
    "quotaUsers": 50,
    "quotaStorageBytes": "10737418240"
  }
}
```

#### 3.2.6 PATCH /v1/me/preferences

**Request body** (partial update)

```jsonc
{
  "locale": "ar",
  "theme": "dark",
  "timezone": "Asia/Dubai",
  "reducedMotion": true,
  "tourAutoStart": false,
  "notificationPrefs": {
    "inApp": { "workflow.approval.requested": true },
    "email": { "audit.alert": false }
  }
}
```

**Response 200** — full updated `UserPreference` object. The `locale`
change is reflected in subsequent JWTs (the next `/v1/auth/refresh` picks
it up).

---

### 3.3 Tenant

| Method | Path            | Auth        | Purpose                       | Spec |
| ------ | --------------- | ----------- | ----------------------------- | ---- |
| GET    | `/v1/tenant`    | JWT         | Get current tenant profile.   | §9.1 |
| PATCH  | `/v1/tenant`    | JWT + `admin` | Update tenant branding, locales, flag config. | §9.1 |

#### 3.3.1 GET /v1/tenant

```jsonc
{
  "id": "01HE3A5K7N…",
  "code": "tenant-001",
  "name": "…",
  "slug": "…",
  "status": "ACTIVE",
  "defaultLocale": "en",
  "enabledLocales": ["en", "fr", "ar", "ru", "zh-CN", "de"],
  "defaultTheme": "system",
  "flagConfig": { "ar": "neutral" },
  "branding": { "primaryColor": "#…", "logoUrl": null },
  "dataResidency": "EU",
  "quotaUsers": 50,
  "quotaStorageBytes": "10737418240",
  "quotaDocuments": 100000,
  "createdAt": "2024-12-01T10:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

#### 3.3.2 PATCH /v1/tenant

**Request body** (partial)

```jsonc
{
  "name": "…",
  "defaultLocale": "fr",
  "enabledLocales": ["en", "fr"],
  "flagConfig": { "ar": "neutral" },
  "branding": { "primaryColor": "#1f67c9" },
  "dataResidency": "EU"
}
```

Removing a locale from `enabledLocales` does not delete existing
`LocaleResource` overrides; it only hides the locale switcher for that
locale in the UI (spec §16.3).

**Error codes** — `FORBIDDEN`, `VALIDATION_FAILED`.

---

### 3.4 Documents

| Method   | Path                                              | Auth                          | Purpose                                       | Spec |
| -------- | ------------------------------------------------- | ----------------------------- | --------------------------------------------- | ---- |
| POST     | `/v1/documents/upload-init`                       | JWT + role¹                  | Initialize a multipart upload.                 | §9.3 |
| POST     | `/v1/documents/upload-chunk`                      | JWT + role¹                  | Receive one chunk (`multipart/form-data`).     | §9.3 |
| POST     | `/v1/documents/upload-complete`                   | JWT + role¹                  | Finalize upload, compute checksum, emit WS.    | §9.3 |
| GET      | `/v1/documents`                                   | JWT                           | Paginated list (cursor).                       | §9.3 |
| GET      | `/v1/documents/:id`                               | JWT                           | Get document metadata.                         | §9.3 |
| GET      | `/v1/documents/:id/download`                      | JWT                           | Get a signed download URL or stream.           | §9.3 |
| GET      | `/v1/documents/:id/versions`                      | JWT                           | Version history (cursor).                      | §9.3 |
| POST     | `/v1/documents/:id/versions/:versionId/restore`   | JWT + role²                  | Restore a prior version.                        | §9.3 |
| PATCH    | `/v1/documents/:id`                               | JWT + role²                  | Update metadata / classification.               | §9.3 |
| POST     | `/v1/documents/:id/lock`                          | JWT + role²                  | Checkout (lock).                                | §9.3 |
| POST     | `/v1/documents/:id/unlock`                        | JWT + role²                  | Checkin (unlock).                               | §9.3 |
| DELETE   | `/v1/documents/:id`                               | JWT + role³                  | Soft delete (legal-hold guard).                 | §9.3 |
| POST     | `/v1/documents/:id/share`                         | JWT + role²                  | Create a share link (also `/v1/share`).         | §9.3 |

¹ `admin` / `records-manager` / `editor` / `contributor`
² `admin` / `records-manager` / `editor`
³ `admin` / `records-manager`

The document controller is in
[`apps/backend/src/modules/document/document.controller.ts`](../apps/backend/src/modules/document/document.controller.ts).
DTOs are Zod schemas in
[`apps/backend/src/modules/document/dto.ts`](../apps/backend/src/modules/document/dto.ts).

#### 3.4.1 POST /v1/documents/upload-init

**Request body**

```jsonc
{
  "title": "Q1 Report",
  "description": "Optional description",
  "documentType": "report",
  "folderId": "01HE3A5K7N…",
  "classificationId": "01HE3A5K7N…",
  "contentLanguage": "en",
  "textDirection": "ltr",
  "metadata": { "fieldCode": "value" },
  "retentionScheduleId": "01HE3A5K7N…",
  "filename": "report.pdf",
  "sizeBytes": 1234567,
  "checksum": "sha256-…"
}
```

**Response 200**

```jsonc
{
  "documentId": "01HE3A5K7N…",
  "uploadId": "<opaque>",
  "chunkSize": 5242880,
  "expectedParts": 1
}
```

The service creates a `Document` row in status `PROCESSING` and reserves
a storage multipart upload (S3-compatible or local volume — see
[`StorageService`](../apps/backend/src/common/storage.service.ts)).

#### 3.4.2 POST /v1/documents/upload-chunk

**Content-Type:** `multipart/form-data`

Form fields:

| Field          | Type    | Notes                                            |
| -------------- | ------- | ------------------------------------------------ |
| `uploadId`     | string  | From `upload-init` response.                     |
| `documentId`   | string  | UUID.                                            |
| `partNumber`   | integer | 1-based.                                         |
| `totalParts`   | integer | Total chunk count.                               |
| `partChecksum` | string  | `sha256-<hex>` of this chunk's bytes.            |
| `chunk`        | file    | The chunk bytes (last chunk may be smaller).     |

**Response 200**

```jsonc
{ "partNumber": 1, "etag": "<opaque>", "size": 5242880 }
```

#### 3.4.3 POST /v1/documents/upload-complete

**Request body**

```jsonc
{
  "documentId": "01HE3A5K7N…",
  "uploadId": "<opaque>",
  "parts": [
    { "partNumber": 1, "etag": "<opaque>" }
  ],
  "finalChecksum": "sha256-…"
}
```

The service verifies the assembled checksum against the
`upload-init`-declared checksum, commits the multipart upload, creates a
`DocumentVersion` row with `versionNumber = 1`, sets `Document.status =
ACTIVE`, emits the `document.created` and `document.version.created`
WebSocket events (spec §13.4 — see
[`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md)), and writes
an `document.upload` audit event.

**Response 200**

```jsonc
{
  "document": { "id": "…", "title": "…", "status": "ACTIVE", "…" : "…" },
  "version": { "id": "…", "versionNumber": 1, "sizeBytes": "1234567" }
}
```

**Error codes**

| Code                  | When                                                    |
| --------------------- | ------------------------------------------------------- |
| `VALIDATION_FAILED`   | Checksum mismatch, missing parts, unknown upload id.    |
| `LEGAL_HOLD_BLOCKS_ACTION` | Should not occur on upload but reserved.           |

#### 3.4.4 GET /v1/documents

**Query params** (Zod `DocumentListQuerySchema`)

| Param             | Type                 | Default      | Notes                              |
| ----------------- | -------------------- | ------------ | ---------------------------------- |
| `limit`           | int `1..100`         | 50           | —                                  |
| `cursor`          | opaque string        | null         | —                                  |
| `sort`            | `createdAt` \| `updatedAt` \| `title` | `updatedAt` | —        |
| `order`           | `asc` \| `desc`      | `desc`       | —                                  |
| `folderId`        | UUID                 | —            | Filter by folder.                  |
| `classificationId`| UUID                 | —            | Filter by classification label.    |
| `status`          | enum                 | —            | Filter by document status.         |
| `createdByUserId` | UUID                 | —            | —                                  |
| `documentType`    | string               | —            | —                                  |
| `includeDeleted`  | `true` \| `false`    | `false`      | Admin-only; stripped for non-admins.|

**Response 200** — `PaginatedResponse<DocumentSummary>`

```jsonc
{
  "items": [
    {
      "id": "01HE3A5K7N…",
      "title": "Q1 Report",
      "documentType": "report",
      "status": "ACTIVE",
      "classificationId": "01HE3A5K7N…",
      "sizeBytes": "1234567",
      "versionNumber": 1,
      "isLocked": false,
      "legalHoldActive": false,
      "createdByUserId": "01HE3A5K7N…",
      "createdAt": "2025-01-31T08:30:00.000Z",
      "updatedAt": "2025-01-31T08:30:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "total": null
}
```

#### 3.4.5 GET /v1/documents/:id

Returns the full `Document` object including current version metadata,
classification, retention schedule, legal-hold status, and the latest
provenance manifest (if any).

```jsonc
{
  "id": "01HE3A5K7N…",
  "title": "Q1 Report",
  "description": "…",
  "documentType": "report",
  "status": "ACTIVE",
  "classification": { "id": "…", "code": "internal", "sensitivityLevel": 2 },
  "currentVersion": {
    "id": "01HE3A5K7N…",
    "versionNumber": 1,
    "sizeBytes": "1234567",
    "checksum": "sha256-…",
    "mime": "application/pdf",
    "originalFilename": "report.pdf",
    "createdAt": "2025-01-31T08:30:00.000Z"
  },
  "retentionSchedule": { "id": "…", "code": "default-7y", "retentionDays": 2555 },
  "legalHoldActive": false,
  "isLocked": false,
  "lockedByUserId": null,
  "lockedAt": null,
  "createdByUserId": "01HE3A5K7N…",
  "createdAt": "2025-01-31T08:30:00.000Z",
  "updatedAt": "2025-01-31T08:30:00.000Z"
}
```

This call is audited as `document.read` (spec §27.3 — every read of a
sensitive resource is audited).

#### 3.4.6 GET /v1/documents/:id/download

Returns a short-lived signed URL (S3-compatible presigned GET, or a
backend-proxied stream for local storage). The signed URL is valid for
5 minutes.

```jsonc
{
  "url": "https://…/report.pdf?X-Amz-Signature=…",
  "expiresAt": "2025-01-31T08:35:00.000Z",
  "versionId": "01HE3A5K7N…",
  "versionNumber": 1
}
```

Audited as `document.downloaded`.

#### 3.4.7 GET /v1/documents/:id/versions

**Query params** — standard cursor pagination plus `sort=createdAt` and
`order=desc` defaults.

**Response 200** — `PaginatedResponse<DocumentVersion>`.

#### 3.4.8 POST /v1/documents/:id/versions/:versionId/restore

Creates a new `DocumentVersion` whose bytes reference the prior version's
storage key (no re-upload); the prior version's `isImmutable = true`
remains untouched (spec §15.5). Bumps `currentVersionId`.

**Request body**

```jsonc
{ "changeReason": "Reverting to pre-edit state" }
```

**Response 200** — the new `DocumentVersion` object.

**Error codes**

| Code                | When                                                  |
| ------------------- | ----------------------------------------------------- |
| `NOT_FOUND`         | Unknown document or version id.                       |
| `LEGAL_HOLD_BLOCKS_ACTION` | Document is under active legal hold.            |
| `WORKFLOW_INVALID_STATE` | Document is checked out by another user.         |

#### 3.4.9 PATCH /v1/documents/:id

**Request body** (all optional)

```jsonc
{
  "title": "…",
  "description": "…",
  "folderId": "01HE3A5K7N…",
  "classificationId": "01HE3A5K7N…",
  "retentionScheduleId": "01HE3A5K7N…",
  "metadata": { "fieldCode": "value" }
}
```

Changing `classificationId` triggers a `ClassificationHistory` row and
the `document.classification.changed` WebSocket event (spec §13.4). A
downgrade attempt (lower `sensitivityLevel`) requires the
`security-officer` role; otherwise → `403
CLASSIFICATION_DOWNGRADE_DENIED`.

#### 3.4.10 POST /v1/documents/:id/lock

Locks the document for editing (`isLocked = true`, `lockedByUserId` =
current user). Subsequent `PATCH`/`DELETE` from other users → `409
WORKFLOW_INVALID_STATE`.

**Request body**

```jsonc
{ "reason": "Editing metadata" }
```

#### 3.4.11 POST /v1/documents/:id/unlock

Unlocks the document. The owner or any admin can unlock; non-admins
unlocking another user's lock generate a `document.checkin` audit event
with reason `forced_unlock`.

#### 3.4.12 DELETE /v1/documents/:id

Soft-deletes the document (`status = DELETED`, `deletedAt = now()`).
Refuses with `403 LEGAL_HOLD_BLOCKS_ACTION` if `legalHoldActive = true`
(spec §9.7, §15.5). Hard delete is a separate admin-only operation
gated by retention policy (see [`DATA_MODEL.md` §4](./DATA_MODEL.md#4-soft-delete-and-immutability-155)).

#### 3.4.13 POST /v1/documents/:id/share

Convenience alias for `POST /v1/share` with `documentId` pre-filled. See
[§3.11](#311-share).

---

### 3.5 Classification

| Method | Path                                              | Auth                          | Purpose                              | Spec |
| ------ | ------------------------------------------------- | ----------------------------- | ------------------------------------ | ---- |
| GET    | `/v1/classification`                              | JWT                           | List classification labels.          | §9.4 |
| POST   | `/v1/classification`                              | JWT + `admin` / `security-officer` | Create a label.              | §9.4 |
| POST   | `/v1/classification/documents/:documentId/assign` | JWT + role¹                  | Assign label to document.            | §9.4 |
| GET    | `/v1/classification/documents/:documentId/history`| JWT                           | Classification history.              | §9.4 |

¹ `admin` / `security-officer` / `records-manager`

#### 3.5.1 GET /v1/classification

Returns the tenant's classification labels ordered by `sensitivityLevel`
ascending.

```jsonc
{
  "labels": [
    { "id": "01HE3A5K7N…", "code": "public",    "nameKey": "classification.public",    "sensitivityLevel": 0, "color": "#16a34a", "isSystem": true },
    { "id": "01HE3A5K7N…", "code": "internal",  "nameKey": "classification.internal",  "sensitivityLevel": 2, "color": "#1f67c9", "isSystem": true },
    { "id": "01HE3A5K7N…", "code": "confidential","nameKey": "classification.confidential","sensitivityLevel": 3, "color": "#f59e0b", "isSystem": true },
    { "id": "01HE3A5K7N…", "code": "restricted","nameKey": "classification.restricted","sensitivityLevel": 4, "color": "#dc2626", "isSystem": true }
  ]
}
```

#### 3.5.2 POST /v1/classification

**Request body**

```jsonc
{
  "code": "top-secret",
  "nameKey": "classification.topSecret",
  "descriptionKey": "classification.topSecret.description",
  "sensitivityLevel": 5,
  "color": "#7c1d6f",
  "bannerText": "TOP SECRET"
}
```

System labels (`isSystem = true`) cannot be deleted; only their `color`
and `bannerText` can be patched.

#### 3.5.3 POST /v1/classification/documents/:documentId/assign

**Request body**

```jsonc
{
  "labelId": "01HE3A5K7N…",
  "reason": "Promoted after legal review"
}
```

The service writes a `ClassificationHistory` row capturing
`fromLabelId` / `toLabelId`, updates the `Document.classificationId`,
and emits `document.classification.changed` (spec §13.4).

**Error codes**

| Code                            | When                                              |
| ------------------------------- | ------------------------------------------------- |
| `CLASSIFICATION_DOWNGRADE_DENIED` | Downgrade attempt without `security-officer` role. |
| `NOT_FOUND`                     | Unknown document or label.                        |

#### 3.5.4 GET /v1/classification/documents/:documentId/history

Returns the full classification history for the document, newest first.
Each entry includes the actor, timestamp, from/to labels, and the
reason.

---

### 3.6 Workflows

| Method | Path                                              | Auth                          | Purpose                              | Spec |
| ------ | ------------------------------------------------- | ----------------------------- | ------------------------------------ | ---- |
| POST   | `/v1/workflows`                                   | JWT + role¹ + license         | Create a workflow definition.        | §9.8 |
| GET    | `/v1/workflows`                                   | JWT + role¹                   | List definitions (paginated).        | §9.8 |
| GET    | `/v1/workflows/:id`                               | JWT + role¹                   | Get definition with XML + JSON.      | §9.8 |
| PATCH  | `/v1/workflows/:id`                               | JWT + role¹                   | Update draft.                        | §9.8 |
| POST   | `/v1/workflows/:id/publish`                       | JWT + `admin` / `workflow-designer` | Publish a draft.            | §9.8 |
| POST   | `/v1/workflows/:id/instantiate`                   | JWT + role¹                   | Start an instance.                   | §9.8 |
| GET    | `/v1/workflows/instances`                         | JWT + role¹                   | List instances (paginated).          | §9.8 |
| GET    | `/v1/workflows/instances/:id`                     | JWT + role¹                   | Get instance with steps + approvals. | §9.8 |
| POST   | `/v1/workflows/instances/:id/approve`             | JWT + role¹                   | Submit approval decision.            | §9.8 |
| POST   | `/v1/workflows/instances/:id/delegate`            | JWT + role¹                   | Delegate current step.               | §9.8 |
| POST   | `/v1/workflows/instances/:id/cancel`              | JWT + role¹                   | Cancel instance.                     | §9.8 |

¹ `admin` / `workflow-designer` / `records-manager` / `editor`

The BPMN/CMMN/DMN engine is in
[`apps/backend/src/modules/workflow/workflow-engine.ts`](../apps/backend/src/modules/workflow/workflow-engine.ts).
Mutations require the `bpmn` license module (decorated with
`@LicenseRequired({ module: 'bpmn', failClosed: false })`).

#### 3.6.1 POST /v1/workflows

**Request body**

```jsonc
{
  "code": "approval-2-step",
  "name": "Two-step approval",
  "description": "Optional description",
  "modelKind": "BPMN",
  "bpmnXml": "<?xml version=\"1.0\"?><bpmn:definitions …>…</bpmn:definitions>",
  "definitionJson": {
    "steps": [
      { "stepKey": "review", "name": "Review", "assigneeRole": "editor" },
      { "stepKey": "approve", "name": "Approve", "assigneeRole": "admin" }
    ]
  },
  "isAiDraft": false
}
```

**Response 200** — the created `WorkflowDefinition` with `status: DRAFT`,
`version: 1`.

AI-drafted definitions (`isAiDraft = true`) are only visible to
`admin` and `workflow-designer` roles.

#### 3.6.2 GET /v1/workflows

**Query params**

| Param             | Type            | Default | Notes                              |
| ----------------- | --------------- | ------- | ---------------------------------- |
| `limit`           | int `1..100`    | 50      | —                                  |
| `cursor`          | opaque string   | null    | —                                  |
| `sort`            | `createdAt` \| `updatedAt` \| `name` | `updatedAt` | —      |
| `order`           | `asc` \| `desc` | `desc`  | —                                  |
| `status`          | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` | — | —                       |
| `modelKind`       | `BPMN` \| `CMMN` \| `DMN` | —    | —                                  |
| `includeAiDrafts` | boolean         | `false` | Stripped for non-designers.        |

#### 3.6.3 POST /v1/workflows/:id/publish

Promotes a `DRAFT` definition to `PUBLISHED`, bumps `version`, and
freezes the prior version (it remains queryable but cannot be
instantiated). Audited as `workflow.step_updated`.

#### 3.6.4 POST /v1/workflows/:id/instantiate

**Request body**

```jsonc
{
  "documentId": "01HE3A5K7N…",
  "context": { "amount": 5000, "currency": "EUR" },
  "dueAt": "2025-02-07T00:00:00.000Z"
}
```

**Response 200** — the new `WorkflowInstance` with `status: RUNNING` and
the initial `WorkflowStep` rows.

Emits `workflow.step.updated` and (if the first step is an approval)
`workflow.approval.requested` (spec §13.4).

#### 3.6.5 POST /v1/workflows/instances/:id/approve

**Request body**

```jsonc
{
  "stepId": "01HE3A5K7N…",
  "decision": "approve",         // approve | reject | escalate
  "comment": "Looks good",
  "signature": "<optional-e-signature>"
}
```

The service validates that the current user is the step's `assigneeId`
(or a delegate), records an `Approval` row, advances the instance, and
emits `workflow.approval.completed` (spec §13.4). If the decision is
`reject`, the instance moves to `REJECTED` and downstream steps are
cancelled.

**Error codes**

| Code                      | When                                            |
| ------------------------- | ----------------------------------------------- |
| `WORKFLOW_INVALID_STATE`  | Step not pending, instance not running, etc.    |
| `FORBIDDEN`               | User is not the assignee.                       |

#### 3.6.6 POST /v1/workflows/instances/:id/delegate

**Request body**

```jsonc
{ "stepId": "01HE3A5K7N…", "delegateUserId": "01HE3A5K7N…", "reason": "OOO" }
```

Updates `WorkflowStep.delegateId` and re-emits
`workflow.approval.requested` for the delegate.

#### 3.6.7 POST /v1/workflows/instances/:id/cancel

**Request body**

```jsonc
{ "reason": "No longer needed" }
```

Sets `status = CANCELLED`, cancels pending steps, emits
`workflow.step.updated`.

---

### 3.7 Retention

| Method | Path                                | Auth                          | Purpose                              | Spec |
| ------ | ----------------------------------- | ----------------------------- | ------------------------------------ | ---- |
| POST   | `/v1/retention/schedules`           | JWT + `admin` / `records-manager` | Create schedule.            | §9.7 |
| GET    | `/v1/retention/schedules`           | JWT + role¹                   | List schedules.                      | §9.7 |
| PATCH  | `/v1/retention/schedules/:id`       | JWT + `admin` / `records-manager` | Update schedule.            | §9.7 |
| DELETE | `/v1/retention/schedules/:id`       | JWT + `admin` / `records-manager` | Soft-delete schedule.       | §9.7 |
| GET    | `/v1/retention/upcoming-expiry`     | JWT + role¹                   | Documents expiring in N days.        | §9.7 |
| POST   | `/v1/retention/evaluate`            | JWT + `admin`                 | Trigger cron evaluation immediately. | §9.7 |

¹ `admin` / `records-manager` / `auditor`

#### 3.7.1 POST /v1/retention/schedules

**Request body**

```jsonc
{
  "code": "default-7y",
  "name": "Default 7-year retention",
  "description": "Retention for general business records",
  "triggerKind": "createdAt",        // createdAt | updatedAt | custom
  "triggerDateField": "createdAt",   // when triggerKind = custom
  "retentionDays": 2555,
  "dispositionAction": "delete"      // delete | archive | review
}
```

#### 3.7.2 GET /v1/retention/upcoming-expiry

**Query params**

| Param  | Type    | Default | Notes                              |
| ------ | ------- | ------- | ---------------------------------- |
| `days` | int     | 30      | Window (1..365).                   |
| `limit`| int     | 50      | Cursor pagination.                 |
| `cursor` | opaque | null    | —                                  |

**Response 200** — `PaginatedResponse<DispositionRecord>`.

---

### 3.8 Legal Hold

| Method   | Path                                                  | Auth                          | Purpose                              | Spec |
| -------- | ----------------------------------------------------- | ----------------------------- | ------------------------------------ | ---- |
| POST     | `/v1/legal-holds`                                     | JWT + `admin` / `records-manager` | Create a hold.              | §9.7 |
| GET      | `/v1/legal-holds`                                     | JWT + role¹                   | List holds.                          | §9.7 |
| GET      | `/v1/legal-holds/:id`                                 | JWT + role¹                   | Get hold with attached documents.    | §9.7 |
| POST     | `/v1/legal-holds/:id/documents/:documentId`           | JWT + `admin` / `records-manager` | Attach a document.          | §9.7 |
| DELETE   | `/v1/legal-holds/:id/documents/:documentId`           | JWT + `admin` / `records-manager` | Detach a document.          | §9.7 |
| POST     | `/v1/legal-holds/:id/release`                         | JWT + `admin`                 | Release hold (requires reason).      | §9.7 |

¹ `admin` / `records-manager` / `compliance-officer`

#### 3.8.1 POST /v1/legal-holds

**Request body**

```jsonc
{
  "code": "litigation-2025-001",
  "name": "Litigation hold — Case 2025-001",
  "reason": "Pending litigation discovery",
  "caseReference": "CASE-2025-001",
  "documentIds": ["01HE3A5K7N…", "01HE3A5K7N…"]
}
```

The service creates the `LegalHold` row, attaches the listed documents
(setting `Document.legalHoldActive = true` on each), and emits
`legalHold.changed` (spec §13.4).

#### 3.8.2 POST /v1/legal-holds/:id/release

**Request body**

```jsonc
{
  "reasonKey": "legalHold.releaseReason.caseClosed",
  "reason": "Case 2025-001 closed"
}
```

Admin-only. Releases the hold, sets `isActive = false`, sets
`releasedAt` / `releasedByUserId`, and clears `legalHoldActive` on
attached documents (unless another active hold exists). Emits
`legalHold.changed`.

---

### 3.9 Audit

| Method | Path                    | Auth                                            | Purpose                              | Spec |
| ------ | ----------------------- | ----------------------------------------------- | ------------------------------------ | ---- |
| GET    | `/v1/audit/events`      | JWT + `admin` / `auditor` / `security-officer`  | Query audit events (paginated).      | §9.9 |
| GET    | `/v1/audit/verify-chain`| JWT + `admin` / `auditor`                       | Verify hash-chain integrity.         | §9.9 |
| POST   | `/v1/audit/export`      | JWT + `admin` / `auditor`                       | Request an export (CSV/JSON-LD).     | §9.9 |

#### 3.9.1 GET /v1/audit/events

**Query params**

| Param             | Type            | Default | Notes                              |
| ----------------- | --------------- | ------- | ---------------------------------- |
| `limit`           | int `1..100`    | 100     | —                                  |
| `cursor`          | opaque string   | null    | —                                  |
| `sort`            | `occurredAt`    | `occurredAt` | —                             |
| `order`           | `asc` \| `desc` | `desc`  | —                                  |
| `category`        | string          | —       | e.g. `auth`, `create`, `delete`.   |
| `code`            | string          | —       | e.g. `document.deleted`.           |
| `userId`          | UUID            | —       | —                                  |
| `resourceType`    | string          | —       | e.g. `document`, `user`.           |
| `resourceId`      | UUID            | —       | —                                  |
| `documentId`      | UUID            | —       | Convenience filter.                |
| `correlationId`   | string          | —       | —                                  |
| `result`          | `allow` \| `deny` | —     | —                                  |
| `from`            | ISO date        | —       | `occurredAt >=`                    |
| `to`              | ISO date        | —       | `occurredAt <=`                    |

**Response 200** — `PaginatedResponse<AuditEvent>`

```jsonc
{
  "items": [
    {
      "id": "01HE3A5K7N…",
      "tenantId": "01HE3A5K7N…",
      "userId": "01HE3A5K7N…",
      "actorKind": "user",
      "category": "delete",
      "code": "document.deleted",
      "result": "allow",
      "resourceType": "document",
      "resourceId": "01HE3A5K7N…",
      "documentId": "01HE3A5K7N…",
      "ipAddress": "10.0.0.1",
      "userAgent": "Mozilla/5.0…",
      "correlationId": "01HE3A5K7N…",
      "reason": "User-initiated delete",
      "metadata": { "softDelete": true },
      "sequenceNumber": "12345",
      "previousHash": "9f2c…",
      "eventHash": "b81e…",
      "occurredAt": "2025-01-31T08:30:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "total": null
}
```

#### 3.9.2 GET /v1/audit/verify-chain

Recomputes the hash chain across all events for the tenant and returns
the first broken sequence number (or `{ ok: true }` if intact). Used by
the compliance dashboard and the test suite at
[`apps/backend/test/audit-hash-chain.test.ts`](../apps/backend/test/audit-hash-chain.test.ts).

```jsonc
{ "ok": true, "verifiedAt": "2025-01-31T08:30:00.000Z", "eventsChecked": 12345 }
```

#### 3.9.3 POST /v1/audit/export

**Request body**

```jsonc
{
  "format": "csv",                  // csv | jsonld
  "from": "2025-01-01T00:00:00.000Z",
  "to":   "2025-01-31T23:59:59.999Z",
  "filters": { "category": "delete" }
}
```

**Response 202** — `{ "jobId": "01HE3A5K7N…", "status": "queued" }`.

The export runs as a BullMQ job (see
[`DATA_MODEL.md` §5.14](./DATA_MODEL.md#514-jobs)). When complete the
artifact is uploaded to object storage and a notification is sent to
the requesting user with a download URL.

---

### 3.10 Search

| Method | Path                       | Auth  | Purpose                              | Spec  |
| ------ | -------------------------- | ----- | ------------------------------------ | ----- |
| GET    | `/v1/search`               | JWT   | Full-text + metadata search.         | §9.10 |
| POST   | `/v1/search/flex`          | JWT   | Cross-dimensional flex search.       | §9.10 |
| POST   | `/v1/search/saved`         | JWT   | Save a search query.                 | §9.10 |
| GET    | `/v1/search/saved`         | JWT   | List saved searches (paginated).     | §9.10 |
| DELETE | `/v1/search/saved/:id`     | JWT   | Delete a saved search (owner/admin). | §9.10 |

#### 3.10.1 GET /v1/search

**Query params** (Zod `SearchQuerySchema`)

| Param             | Type            | Default      | Notes                              |
| ----------------- | --------------- | ------------ | ---------------------------------- |
| `q`               | string `1..2048`| —            | Full-text query.                   |
| `documentType`    | string          | —            | —                                  |
| `classificationId`| UUID            | —            | —                                  |
| `status`          | enum            | —            | `ACTIVE` / `ARCHIVED` / `RECORD` / `PROCESSING` / `QUARANTINED` |
| `createdByUserId` | UUID            | —            | —                                  |
| `folderId`        | UUID            | —            | —                                  |
| `createdAfter` / `createdBefore` | ISO date | —    | —                                  |
| `updatedAfter` / `updatedBefore` | ISO date | —    | —                                  |
| `limit`           | int `1..100`    | 50           | —                                  |
| `cursor`          | opaque          | null         | —                                  |
| `sort`            | `createdAt` \| `updatedAt` \| `title` \| `relevance` | `updatedAt` | —   |
| `order`           | `asc` \| `desc` | `desc`       | —                                  |
| `includeDeleted`  | boolean         | `false`      | Admin-only; stripped otherwise.    |

Permission-aware filtering is enforced in `SearchService` — inaccessible
documents are excluded **before** pagination so totals and cursors
never reveal their existence (spec §9.10 critical rule, §27.3).

**Response 200** — `PaginatedResponse<SearchResultHit>`

```jsonc
{
  "items": [
    {
      "documentId": "01HE3A5K7N…",
      "title": "Q1 Report",
      "snippet": "…matching <mark>query</mark> text…",
      "score": 12.5,
      "classificationId": "01HE3A5K7N…",
      "status": "ACTIVE",
      "updatedAt": "2025-01-31T08:30:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "total": 1
}
```

The OpenSearch index is initialized by
[`apps/backend/scripts/opensearch-init.ts`](../apps/backend/scripts/opensearch-init.ts)
which sets up an Arabic-aware analyzer with tashkeel removal and
alef/hamza/taa-marbuta normalization.

#### 3.10.2 POST /v1/search/flex

**Request body**

```jsonc
{
  "text": "contract renewal",
  "documentTypes": ["contract"],
  "classificationIds": ["01HE3A5K7N…"],
  "createdAfter": "2024-01-01T00:00:00.000Z",
  "createdBefore": "2025-01-31T00:00:00.000Z",
  "limit": 50,
  "cursor": null,
  "multimodal": false,
  "graphTraversal": false
}
```

Returns the same `PaginatedResponse<SearchResultHit>` shape as `/v1/search`.
`multimodal: true` triggers image-embedding similarity search (license-gated).
`graphTraversal: true` follows document→document relationships (license-gated).

#### 3.10.3 POST /v1/search/saved

**Request body**

```jsonc
{
  "name": "Active contracts",
  "query": { "q": "contract", "status": "ACTIVE", "sort": "updatedAt" },
  "alertEnabled": true,
  "alertInterval": "daily"          // hourly | daily | weekly
}
```

Stores a `SavedSearch` row (see
[`DATA_MODEL.md` §5.15](./DATA_MODEL.md#515-saved-searches)). When
`alertEnabled`, a cron job re-runs the query at the requested interval
and creates a `Notification` for new hits.

---

### 3.11 Share

| Method | Path                                  | Auth  | Purpose                              | Spec  |
| ------ | ------------------------------------- | ----- | ------------------------------------ | ----- |
| POST   | `/v1/share`                           | JWT   | Create a share link.                 | §9.5  |
| GET    | `/v1/share/documents/:documentId`     | JWT   | List share links for a document.     | §9.5  |
| DELETE | `/v1/share/:id`                       | JWT   | Revoke a share link.                 | §9.5  |

#### 3.11.1 POST /v1/share

**Request body**

```jsonc
{
  "documentId": "01HE3A5K7N…",
  "permission": "view",             // view | comment | download
  "password": "<optional>",
  "expiresAt": "2025-02-07T00:00:00.000Z",
  "maxViews": 100,
  "recipientEmail": "external@example.com"
}
```

**Response 201**

```jsonc
{
  "id": "01HE3A5K7N…",
  "url": "https://<host>/s/<token>",
  "token": "<opaque>",
  "expiresAt": "2025-02-07T00:00:00.000Z",
  "maxViews": 100,
  "permission": "view"
}
```

Emits `share.link.updated` (spec §13.4) so collaborators see the new
link in real time.

#### 3.11.2 DELETE /v1/share/:id

Revokes the link (`isActive = false`, `revokedAt = now()`). Audited as
`share.link.revoke`. Emits `share.link.updated`.

---

### 3.12 Notifications

| Method | Path                            | Auth  | Purpose                              | Spec  |
| ------ | ------------------------------- | ----- | ------------------------------------ | ----- |
| GET    | `/v1/notifications`             | JWT   | List notifications (paginated).      | §9.6  |
| POST   | `/v1/notifications/mark-read`   | JWT   | Mark one notification read.          | §9.6  |
| POST   | `/v1/notifications/mark-all-read`| JWT  | Mark all read.                       | §9.6  |

#### 3.12.1 GET /v1/notifications

**Query params** — standard cursor pagination plus `unreadOnly=true`
filter and `sort=createdAt`, `order=desc` defaults.

**Response 200** — `PaginatedResponse<Notification>`

```jsonc
{
  "items": [
    {
      "id": "01HE3A5K7N…",
      "channel": "in_app",
      "severity": "info",
      "titleKey": "notifications.workflow.approvalRequested.title",
      "bodyKey": "notifications.workflow.approvalRequested.body",
      "titleVars": { "instanceName": "Two-step approval" },
      "bodyVars": { "stepName": "Approve", "dueAt": "2025-02-07" },
      "actionUrl": "/workflows/instances/01HE3A5K7N…",
      "readAt": null,
      "createdAt": "2025-01-31T08:30:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "total": null
}
```

Real-time delivery uses the `notification.created` WebSocket event
(spec §13.4 — see [`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md)).

---

### 3.13 License (local state)

| Method | Path                       | Auth        | Purpose                              | Spec |
| ------ | -------------------------- | ----------- | ------------------------------------ | ---- |
| GET    | `/v1/license/status`       | JWT + `admin` | Current local license state + payload. | §4.4 / §12 |
| POST   | `/v1/license/import`       | JWT + `admin` | Import a `.sedmslic` file.         | §12.8 |
| POST   | `/v1/license/offline-request` | JWT + `admin` | Generate a `.sedmsreq` file.     | §12.6 |

#### 3.13.1 GET /v1/license/status

```jsonc
{
  "state": "valid",                // valid | grace_period | grace_exhausted | expired | revoked | invalid
  "payload": {
    "licenseId": "01HE3A5K7N…",
    "code": "SEDMS-PRO-2024-000123",
    "customerId": "01HE3A5K7N…",
    "productId": "01HE3A5K7N…",
    "planId": "01HE3A5K7N…",
    "type": "subscription",
    "environment": "production",
    "startDate": "2024-12-01T00:00:00.000Z",
    "endDate": "2025-12-01T00:00:00.000Z",
    "gracePeriodDays": 7,
    "maxUsers": 100,
    "maxDevices": 5,
    "maxStorageBytes": "107374182400",
    "maxDocuments": 1000000,
    "enabledModules": ["bpmn", "ai-assistant", "scanner"],
    "features": [ { "code": "ai-citations", "enabled": true } ],
    "limits": { "aiCallsPerMonth": 10000 }
  },
  "signature": "<jwt-like-signature>",
  "kid": "key-2025-01",
  "alg": "EdDSA",
  "importedAt": "2024-12-01T10:00:00.000Z",
  "lastHeartbeatAt": "2025-01-31T08:00:00.000Z",
  "heartbeatFailures": 0
}
```

When `payload` is `null` the deployment has no license imported; the
`state` is `invalid` and fail-closed routes refuse all traffic.

#### 3.13.2 POST /v1/license/import

Imports a `.sedmslic` artifact (offline activation flow, spec §12.8).
The service verifies the signature against the embedded public key,
checks the deployment fingerprint, persists the payload + signature to
`LicenseLocalState`, and transitions the state machine to `valid` (or
`grace_period` if `endDate` is in the past but within `gracePeriodDays`).

**Request body**

```jsonc
{
  "artifact": "<raw-.sedmslic-content>",
  "contactEmail": "admin@example.com"
}
```

**Response 200** — the updated `LicenseLocalState` row.

**Error codes**

| Code                | When                                                  |
| ------------------- | ----------------------------------------------------- |
| `LICENSE_INVALID`   | Bad signature, unknown kid, fingerprint mismatch.     |
| `LICENSE_EXPIRED`   | End date in the past and grace exhausted.             |

#### 3.13.3 POST /v1/license/offline-request

Generates a `.sedmsreq` file the operator sends to the vendor for
offline activation (spec §12.6).

**Query param** `productId` (UUID).

**Request body**

```jsonc
{ "contactEmail": "admin@example.com" }
```

**Response 200**

```jsonc
{
  "requestId": "01HE3A5K7N…",
  "artifact": "<raw-.sedmsreq-content>",
  "filename": "sedms-req-01HE3A5K7N.sedmsreq",
  "mimeType": "application/vnd.smart-edms.sedmsreq+json"
}
```

---

### 3.14 Scanner

| Method | Path                    | Auth  | Purpose                              | Spec  |
| ------ | ----------------------- | ----- | ------------------------------------ | ----- |
| GET    | `/v1/scanner/profiles`  | JWT   | List scanner profiles.               | §9.12 |
| POST   | `/v1/scanner/profiles`  | JWT   | Create a scanner profile.            | §9.12 |
| GET    | `/v1/scanner/jobs`      | JWT   | List scanner jobs (paginated).       | §9.12 |
| POST   | `/v1/scanner/jobs`      | JWT   | Create a scanner job.                | §9.12 |

#### 3.14.1 POST /v1/scanner/profiles

**Request body**

```jsonc
{
  "code": "office-printer",
  "name": "Office multifunction printer",
  "driverKind": "upload",           // upload | twain | sane | network
  "deviceId": "optional-device-id",
  "settings": {
    "dpi": 300,
    "colorMode": "color",           // color | grayscale | monochrome
    "duplex": true,
    "paperSize": "A4",
    "ocrLanguage": "eng+fra"
  }
}
```

#### 3.14.2 POST /v1/scanner/jobs

**Request body**

```jsonc
{
  "profileId": "01HE3A5K7N…",
  "documentId": "01HE3A5K7N…",     // optional target document
  "totalFiles": 1,
  "ocrLanguage": "eng+fra"
}
```

Creates a `ScannerJob` row in status `PENDING` and enqueues a BullMQ
job. Emits `scanner.job.started` when the worker picks it up, then
`scanner.job.progress` / `scanner.job.completed` / `scanner.job.failed`
(spec §13.4 — see
[`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md)).

---

### 3.15 Tours

| Method | Path                                  | Auth        | Purpose                              | Spec |
| ------ | ------------------------------------- | ----------- | ------------------------------------ | ---- |
| GET    | `/v1/tours`                           | JWT         | List tours visible to current user.  | §10  |
| GET    | `/v1/tours/:tourId`                   | JWT         | Get tour definition with steps.      | §10  |
| POST   | `/v1/tours/:tourId/start`             | JWT         | Mark tour as IN_PROGRESS.            | §10  |
| POST   | `/v1/tours/:tourId/complete`          | JWT         | Mark tour as COMPLETED.              | §10  |
| POST   | `/v1/tours/:tourId/skip`              | JWT         | Mark tour as SKIPPED.                | §10  |
| POST   | `/v1/tours/:tourId/dismiss`           | JWT         | Mark tour as DISMISSED + doNotShowAgain. | §10 |
| POST   | `/v1/tours/:tourId/progress`          | JWT         | Update current step.                 | §10  |
| GET    | `/v1/tours/user-state`                | JWT         | All tour states for current user.    | §10  |
| GET    | `/v1/tours/checklist`                 | JWT         | Interactive onboarding checklist.    | §10  |
| GET    | `/v1/admin/tours`                     | JWT + `admin` | All tour definitions.             | §10  |
| PATCH  | `/v1/admin/tours/:tourId`             | JWT + `admin` | Enable/disable, configure triggers. | §10 |
| GET    | `/v1/admin/tours/analytics`           | JWT + `admin` | Privacy-safe aggregated analytics. | §10  |

#### 3.15.1 GET /v1/tours

Returns the tours visible to the current user filtered by role,
audience, license module, and `enabled = true`. Includes the user's
`TourUserState` for each tour (if any).

```jsonc
{
  "tours": [
    {
      "id": "01HE3A5K7N…",
      "code": "welcome",
      "module": "welcome",
      "audience": ["all"],
      "priority": 100,
      "version": 1,
      "triggerType": "on_login",
      "enabled": true,
      "licenseModuleRequired": null,
      "userState": {
        "status": "IN_PROGRESS",
        "currentStepOrder": 2,
        "startedAt": "2025-01-31T08:00:00.000Z"
      }
    }
  ]
}
```

#### 3.15.2 GET /v1/tours/:tourId

Returns the tour definition with its `TourStep[]` ordered by
`stepOrder`.

```jsonc
{
  "id": "01HE3A5K7N…",
  "code": "welcome",
  "module": "welcome",
  "steps": [
    {
      "id": "01HE3A5K7N…",
      "stepOrder": 1,
      "targetSelector": "[data-tour='welcome-card']",
      "titleKey": "tour.welcome.step1.title",
      "bodyKey": "tour.welcome.step1.body",
      "placement": "auto",
      "requiresPermission": null,
      "requiresLicenseModule": null,
      "actionType": "next",
      "waitForEvent": null,
      "enabled": true
    }
  ]
}
```

#### 3.15.3 POST /v1/tours/:tourId/start

**Request body**

```jsonc
{ "context": { "route": "/documents", "referrer": "dashboard" } }
```

Creates or updates the `TourUserState` row, sets `status = IN_PROGRESS`,
`startedAt = now()`. Emits `tour.updated` (spec §13.4).

#### 3.15.4 POST /v1/tours/:tourId/progress

**Request body**

```jsonc
{ "currentStepId": "01HE3A5K7N…", "currentStepOrder": 3 }
```

Updates `TourUserState.currentStepId` / `currentStepOrder`. Not
audited (high frequency).

#### 3.15.5 POST /v1/tours/:tourId/complete

Marks the tour as `COMPLETED`, sets `completedAt`. Triggers an audit
event `tour.completed`.

#### 3.15.6 POST /v1/tours/:tourId/skip

**Request body**

```jsonc
{ "reasonKey": "tour.skipReason.notRelevant" }
```

Marks `SKIPPED` with optional reason.

#### 3.15.7 POST /v1/tours/:tourId/dismiss

Same as skip but also sets `doNotShowAgain = true`. The tour will not
be suggested again to this user.

#### 3.15.8 GET /v1/tours/checklist

Returns the interactive onboarding checklist — a derived view that
combines multiple tours and module-activation state into a single
progress tracker. See
[`apps/backend/src/modules/tour/tour-checklist.ts`](../apps/backend/src/modules/tour/tour-checklist.ts).

#### 3.15.9 GET /v1/admin/tours/analytics

Privacy-safe aggregated metrics: completion rate, average steps
completed, skip rate — broken down by tour code. No per-user data.

---

### 3.16 AI Assistant

| Method | Path                                              | Auth                          | Purpose                              | Spec |
| ------ | ------------------------------------------------- | ----------------------------- | ------------------------------------ | ---- |
| POST   | `/v1/ai/assistant/chat`                           | JWT + license (fail-closed)   | Main chat (SSE when `?stream=true`). | §11  |
| GET    | `/v1/ai/assistant/sessions`                       | JWT + license (fail-closed)   | List user sessions (paginated).      | §11  |
| GET    | `/v1/ai/assistant/sessions/:id`                   | JWT + license (fail-closed)   | Get session with messages.           | §11  |
| POST   | `/v1/ai/assistant/sessions/:id/feedback`          | JWT + license (fail-closed)   | Thumbs up / down.                    | §11  |
| POST   | `/v1/ai/assistant/sessions/:id/clear`             | JWT + license (fail-closed)   | Clear session (audited).             | §11  |
| GET    | `/v1/ai/assistant/tools`                          | JWT + license (fail-closed)   | List available tools for current user. | §11 |
| POST   | `/v1/ai/assistant/actions/:id/confirm`            | JWT + license (fail-closed)   | Confirm a suggested action.          | §11  |
| POST   | `/v1/ai/assistant/actions/:id/cancel`             | JWT + license (fail-closed)   | Cancel a suggested action.           | §11  |
| GET    | `/v1/admin/ai/settings`                           | JWT + `admin`                 | Tenant AI settings.                  | §11  |
| PATCH  | `/v1/admin/ai/settings`                           | JWT + `admin`                 | Update tenant AI settings.           | §11  |
| GET    | `/v1/admin/ai/audit`                              | JWT + `admin`                 | Paginated AI audit events.           | §11  |
| GET    | `/v1/admin/ai/usage`                              | JWT + `admin`                 | Usage metrics.                       | §11  |

The whole `/v1/ai/assistant/*` namespace is decorated with
`@LicenseRequired({ module: 'ai-assistant', failClosed: true })` — if the
license is not `valid` or `grace_period`, every endpoint returns `402
AI_NOT_LICENSED` immediately.

#### 3.16.1 POST /v1/ai/assistant/chat

**Request body** (Zod `AssistantChatRequestSchema` from
[`packages/schemas/src/ai.ts`](../packages/schemas/src/ai.ts))

```jsonc
{
  "message": "Summarize the latest version of the Q1 report",
  "sessionId": "01HE3A5K7N…",          // optional — created if absent
  "locale": "en",                       // optional — falls back to JWT locale
  "context": {
    "currentRoute": "/documents/01HE3A5K7N…",
    "selectedDocumentIds": ["01HE3A5K7N…"]
  },
  "preInjectionCheck": true             // run prompt-injection filter
}
```

**Non-streaming response 200**

```jsonc
{
  "sessionId": "01HE3A5K7N…",
  "messageId": "01HE3A5K7N…",
  "role": "assistant",
  "content": "The Q1 report…",
  "citations": [
    { "documentId": "01HE3A5K7N…", "versionId": "01HE3A5K7N…", "snippet": "…", "page": 3 }
  ],
  "suggestedActions": [
    {
      "id": "01HE3A5K7N…",
      "actionType": "navigate",
      "targetType": "document",
      "targetId": "01HE3A5K7N…",
      "labelKey": "ai.actions.openDocument",
      "confirmationRequired": false
    }
  ],
  "disclaimerKey": "ai.disclaimer.localOnly",
  "toolInvocations": [
    {
      "toolName": "documents-summary",
      "status": "ok",
      "authorized": true,
      "inputSummary": "documentId=01HE3A5K7N…",
      "outputSummary": "summary len=512"
    }
  ]
}
```

**Streaming response** (`?stream=true`)

`Content-Type: text/event-stream`. The server emits `chunk` events as
the model streams tokens, then a single `final` event with the full
response object:

```text
event: chunk
data: {"delta":"The","sequence":1,"final":false}

event: chunk
data: {"delta":" Q1","sequence":2,"final":false}

event: final
data: { /* full response object, same shape as non-streaming */ }
```

The same `chunk` / `final` payloads are also emitted as `ai.response.chunk`
and `ai.response.completed` WebSocket events (spec §13.4 — see
[`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md)) so other
tabs of the same user see the streaming response.

**Error codes**

| Code                              | When                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `AI_NOT_LICENSED`                 | License missing or in `invalid` / `revoked` state.    |
| `AI_UNAVAILABLE`                  | Upstream model provider down or rate-limited.         |
| `AI_PROMPT_INJECTION_DETECTED`    | Pre-injection check matched a signature.              |
| `AI_ACTION_REQUIRES_CONFIRMATION` | Suggested action is destructive; needs `/confirm`.    |
| `EXTERNAL_AI_DISABLED`            | Request tried to use external AI but tenant forbids.  |
| `RATE_LIMITED`                    | More than 20 calls per minute.                        |

The prompt-injection filter is in
[`apps/backend/src/modules/ai/prompt-injection.ts`](../apps/backend/src/modules/ai/prompt-injection.ts);
the security test suite is at
[`apps/backend/test/ai-security.test.ts`](../apps/backend/test/ai-security.test.ts).

#### 3.16.2 POST /v1/ai/assistant/actions/:id/confirm

Confirms a suggested action. **Destructive actions are never executed
here** — the response returns a redirect URL the client must follow to
the appropriate admin UI (spec §11.4, §27.7). Sensitive (but
non-destructive) actions like `navigate` execute immediately.

**Response 200**

```jsonc
{
  "actionId": "01HE3A5K7N…",
  "status": "executed",            // executed | requires_redirect | cancelled
  "executedAt": "2025-01-31T08:30:00.000Z",
  "redirectUrl": null,             // set when status = requires_redirect
  "result": { /* action-specific */ }
}
```

#### 3.16.3 PATCH /v1/admin/ai/settings

**Request body**

```jsonc
{
  "enabled": true,
  "allowedRoles": ["admin", "editor"],
  "allowedTools": ["documents-summary", "documents-search", "ui-navigate"],
  "externalAiAllowed": false,
  "localOnlyMode": true,
  "chatRetentionDays": 30,
  "showCitations": true,
  "allowNavigationActions": true,
  "allowSuggestedActions": true,
  "requireDisclaimer": true,
  "rateLimitPerMinute": 20,
  "usageQuotaPerDay": 200,
  "privacyNotice": "We do not send your data to external AI providers."
}
```

Audited as `admin.policy_changed` and reflected in the next chat
request via the `AssistantSettings` cache.

---

### 3.17 Admin

| Method | Path                       | Auth                          | Purpose                              | Spec |
| ------ | -------------------------- | ----------------------------- | ------------------------------------ | ---- |
| GET    | `/v1/admin/dashboard`      | JWT + `admin`                 | Aggregate counts + recent activity.  | §9.13|
| GET    | `/v1/admin/system-usage`   | JWT + `admin` / `it-administrator` | Quota + storage usage.       | §9.13|
| GET    | `/v1/admin/health`         | JWT + `admin` / `it-administrator` | Aggregated health of dependencies. | §22  |

#### 3.17.1 GET /v1/admin/dashboard

```jsonc
{
  "counts": {
    "users": 42,
    "documents": 12345,
    "workflows": 67,
    "legalHolds": 3
  },
  "recentActivity": [
    { "code": "document.upload", "occurredAt": "2025-01-31T08:30:00.000Z", "userId": "01HE3A5K7N…" }
  ],
  "licenseState": "valid",
  "licenseEndDate": "2025-12-01T00:00:00.000Z"
}
```

No PII in `recentActivity` — only user IDs (clients resolve to display
names via a separate `/v1/users` lookup, cached).

#### 3.17.2 GET /v1/admin/system-usage

```jsonc
{
  "quotas": {
    "users": { "used": 42, "max": 100 },
    "storage": { "usedBytes": "5368709120", "maxBytes": "10737418240" },
    "documents": { "used": 12345, "max": 1000000 }
  },
  "ai": {
    "callsToday": 152,
    "callsThisMonth": 3120,
    "monthlyAllowance": 10000
  }
}
```

---

### 3.18 Health

| Method | Path                | Auth  | Purpose                              | Spec |
| ------ | ------------------- | ----- | ------------------------------------ | ---- |
| GET    | `/v1/health/live`   | None  | Liveness probe.                      | §22.2|
| GET    | `/v1/health/ready`  | None  | Readiness probe (DB + Redis).        | §22.2|

#### 3.18.1 GET /v1/health/live

Always returns `200` if the process is up.

```jsonc
{ "status": "ok", "timestamp": "2025-01-31T08:30:00.000Z" }
```

#### 3.18.2 GET /v1/health/ready

Returns `200` only if PostgreSQL and Redis are reachable.

```jsonc
{
  "status": "ready",                  // ready | not_ready
  "checks": { "db": true, "redis": true },
  "timestamp": "2025-01-31T08:30:00.000Z"
}
```

Kubernetes liveness/readiness probes should point at these endpoints
(spec §22.2, §27.8 — deploy without health checks is forbidden).

---

## 4. Endpoint catalog — License Server

The license server (`apps/license-server`, port 4001) is a **separate
service** run by the vendor. It signs license artifacts, receives
heartbeats, serves the License Admin Panel API, and exposes the public
CRL endpoint. Its data model is in
[`DATA_MODEL.md` §6](./DATA_MODEL.md#6-licensing-server-entities-separate-database-152).

The license server uses three authentication mechanisms (spec §12.10):

1. **Admin JWT** — issued by `POST /v1/auth/admin/login` + `POST
   /v1/auth/admin/mfa/verify`. Required by every admin-panel route.
2. **Step-up JWT** — short-lived (5 min) JWT issued by `POST /v1/auth/admin/mfa/step-up`
   after recent MFA verification. Required for destructive operations
   (`POST /v1/licenses/:id/revoke`, `POST /v1/signing-keys/rotate`).
3. **API Key** — `X-Api-Key` header, scoped per customer. Required for
   machine-to-machine activation/heartbeat calls.

### 4.1 Admin auth

| Method | Path                            | Auth     | Purpose                              | Spec  |
| ------ | ------------------------------- | -------- | ------------------------------------ | ----- |
| POST   | `/v1/auth/admin/login`          | None     | Email + password → MFA ticket.       | §12.10|
| POST   | `/v1/auth/admin/mfa/verify`     | None     | Verify TOTP → access + refresh.      | §12.10|
| POST   | `/v1/auth/admin/mfa/step-up`    | Admin JWT| Re-verify TOTP → 5-min step-up JWT.  | §12.10|
| POST   | `/v1/auth/admin/refresh`        | None     | Rotate refresh → new access.         | §12.10|
| POST   | `/v1/auth/admin/logout`         | Admin JWT| Revoke access.                       | §12.10|

#### 4.1.1 POST /v1/auth/admin/login

**Request body**

```jsonc
{
  "email": "admin@example.com",
  "password": "<plaintext>"
}
```

**Response 200** (MFA required)

```jsonc
{
  "mfaRequired": true,
  "mfaTicket": "<opaque-5min>",
  "mfaTicketExpiresAt": "2025-01-31T08:35:00.000Z"
}
```

If MFA is not enrolled, returns tokens directly. Failed-login lockout
applies (5 attempts / 15 min → 15 min lock).

#### 4.1.2 POST /v1/auth/admin/mfa/verify

**Request body**

```jsonc
{ "mfaTicket": "<opaque>", "code": "123456" }
```

**Response 200**

```jsonc
{
  "accessToken": "<admin-jwt>",
  "refreshToken": "<opaque>",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "admin": {
    "id": "01HE3A5K7N…",
    "email": "admin@example.com",
    "firstName": "…",
    "lastName": "…",
    "roles": ["admin"]
  }
}
```

Backup codes are accepted as an alternative to TOTP (one-time use; the
service burns the code on success).

#### 4.1.3 POST /v1/auth/admin/mfa/step-up

Requires a valid admin JWT. Re-verifies TOTP and returns a 5-minute
step-up JWT used for destructive operations.

**Request body**

```jsonc
{ "code": "123456" }
```

**Response 200**

```jsonc
{
  "stepUpToken": "<jwt-5min>",
  "expiresAt": "2025-01-31T08:35:00.000Z"
}
```

### 4.2 Customers

| Method | Path                          | Auth      | Purpose                              | Spec |
| ------ | ----------------------------- | --------- | ------------------------------------ | ---- |
| POST   | `/v1/customers`               | Admin JWT | Create a customer.                   | §12.1|
| GET    | `/v1/customers`               | Admin JWT | List customers (paginated).          | §12.1|
| GET    | `/v1/customers/:id`           | Admin JWT | Get a customer.                      | §12.1|
| PATCH  | `/v1/customers/:id`           | Admin JWT | Update a customer.                   | §12.1|
| DELETE | `/v1/customers/:id`           | Admin JWT | Soft-delete a customer.              | §12.1|
| POST   | `/v1/customers/:id/contacts`  | Admin JWT | Add a contact.                       | §12.1|
| GET    | `/v1/customers/:id/contacts`  | Admin JWT | List contacts for a customer.        | §12.1|

#### 4.2.1 POST /v1/customers

**Request body**

```jsonc
{
  "name": "Acme Corp",
  "email": "billing@acme.example",
  "industry": "Manufacturing",
  "website": "https://acme.example",
  "metadata": { "crmId": "CRM-12345", "region": "EU" }
}
```

**Response 201** — the created `Customer` object.

### 4.3 Products & Plans

| Method | Path                          | Auth      | Purpose                              | Spec |
| ------ | ----------------------------- | --------- | ------------------------------------ | ---- |
| POST   | `/v1/products`                | Admin JWT | Create a product.                    | §12.1|
| GET    | `/v1/products`                | Admin JWT | List products with plans.            | §12.1|
| GET    | `/v1/products/:id`            | Admin JWT | Get a product.                       | §12.1|
| POST   | `/v1/plans`                   | Admin JWT | Create a plan within a product.      | §12.1|
| GET    | `/v1/products/:id/plans`      | Admin JWT | List plans for a product.            | §12.1|

#### 4.3.1 POST /v1/products

**Request body**

```jsonc
{
  "code": "smart-edms",
  "name": "Smart EDMS",
  "description": "Enterprise Document Management System",
  "currentVersion": "1.0.0"
}
```

#### 4.3.2 POST /v1/plans

**Request body**

```jsonc
{
  "productId": "01HE3A5K7N…",
  "code": "business",
  "name": "Business",
  "description": "Mid-size org plan",
  "features": [
    { "code": "bpmn", "enabled": true },
    { "code": "ai-assistant", "enabled": true }
  ],
  "limits": {
    "maxUsers": 100,
    "maxDevices": 5,
    "maxStorageBytes": 107374182400,
    "maxDocuments": 1000000,
    "aiUsageAllowance": 10000
  }
}
```

### 4.4 Licenses

| Method | Path                          | Auth                  | Purpose                              | Spec |
| ------ | ----------------------------- | --------------------- | ------------------------------------ | ---- |
| POST   | `/v1/licenses`                | Admin JWT             | Issue a new license.                 | §12.5|
| GET    | `/v1/licenses`                | Admin JWT             | List licenses (paginated).           | §12.5|
| GET    | `/v1/licenses/:id`            | Admin JWT             | Get a license.                       | §12.5|
| PATCH  | `/v1/licenses/:id/renew`      | Admin JWT             | Renew a license.                     | §12.5|
| POST   | `/v1/licenses/:id/revoke`     | Admin JWT + Step-Up   | Revoke a license.                    | §12.5|

#### 4.4.1 POST /v1/licenses

**Request body**

```jsonc
{
  "customerId": "01HE3A5K7N…",
  "productId": "01HE3A5K7N…",
  "planId": "01HE3A5K7N…",
  "type": "subscription",          // trial | subscription | perpetual | enterprise | evaluation | partner
  "environment": "production",     // production | staging | development
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2026-01-01T00:00:00.000Z",
  "gracePeriodDays": 7,
  "maxUsers": 100,
  "maxDevices": 5,
  "maxStorageBytes": 107374182400,
  "maxDocuments": 1000000,
  "aiUsageAllowance": 10000,
  "enabledModules": ["bpmn", "ai-assistant", "scanner"],
  "enabledIntegrations": ["opensearch"],
  "offlineMode": true,
  "hybridSync": false,
  "supportLevel": "standard"
}
```

**Response 201**

```jsonc
{
  "id": "01HE3A5K7N…",
  "code": "SEDMS-PRO-2025-000123",
  "activationCode": "<one-time-shown-plaintext>",
  "activationCodePrefix": "SEDMS-AB",
  "status": "pending_activation",
  "signingKeyId": "01HE3A5K7N…",
  "version": 1,
  "createdAt": "2025-01-31T08:30:00.000Z"
}
```

The plaintext `activationCode` is **shown once**. Its hash is stored in
`License.activationCodeHash`. The customer receives the code via a
secure channel (out-of-band) and enters it on first install.

#### 4.4.2 POST /v1/licenses/:id/revoke

Step-up auth required. Adds a `Revocation` row, marks the license
`revoked`, and includes the license id in the next CRL version (spec
§12.4 — see [`LICENSE_FILE_SPEC.md`](./LICENSE_FILE_SPEC.md)).

**Request body**

```jsonc
{ "reason": "Customer cancelled subscription" }
```

### 4.5 Activations (online + offline)

| Method | Path                                       | Auth                | Purpose                              | Spec  |
| ------ | ------------------------------------------ | ------------------- | ------------------------------------ | ----- |
| POST   | `/v1/activate/online`                      | API Key OR Activation Code | Online activation.       | §12.7 |
| POST   | `/v1/activate/offline-request`             | Admin JWT           | Intake a `.sedmsreq` file.           | §12.8 |
| POST   | `/v1/activate/offline-issue`               | Admin JWT           | Issue a `.sedmslic` artifact.        | §12.8 |
| POST   | `/v1/activate/offline-reject/:id`          | Admin JWT           | Reject an offline request.           | §12.8 |
| GET    | `/v1/activate/offline-requests`            | Admin JWT           | List pending offline requests.       | §12.8 |
| GET    | `/v1/activate/offline-requests/:id`        | Admin JWT           | Get a single offline request.        | §12.8 |

#### 4.5.1 POST /v1/activate/online

Accepts either an API key (`X-Api-Key` header) **or** an activation code
in the body. The on-prem backend calls this on first install and on
re-activation after a fingerprint change.

**Request body**

```jsonc
{
  "activationCode": "<plaintext>",       // when no API key
  "productId": "01HE3A5K7N…",
  "deploymentId": "01HE3A5K7N…",
  "fingerprint": {
    "hostname": "prod-edms-01",
    "os": "linux",
    "arch": "x64",
    "cpus": 8,
    "macs": ["…"]
  },
  "appVersion": "1.0.0",
  "environment": "production",
  "contactEmail": "admin@acme.example"
}
```

**Response 200**

```jsonc
{
  "licenseId": "01HE3A5K7N…",
  "activationId": "01HE3A5K7N…",
  "licenseArtifact": "<raw-.sedmslic-content>",
  "kid": "key-2025-01",
  "alg": "EdDSA",
  "expiresAt": "2026-01-01T00:00:00.000Z"
}
```

The `licenseArtifact` is the signed `.sedmslic` file the on-prem
backend persists to `LicenseLocalState` (see [§3.13.2](#3132-post-v1licenseimport)).

### 4.6 Devices

Device management is implicit via activations and heartbeats. There is
no separate admin-facing device list endpoint in the current
implementation; the License Admin Panel reads devices via `GET
/v1/licenses/:id` which includes the related `Device[]` rows. A
dedicated `DELETE /v1/devices/:id` endpoint is planned for v1.1 (will
revoke a specific fingerprint).

### 4.7 Heartbeats

| Method | Path              | Auth                | Purpose                              | Spec  |
| ------ | ----------------- | ------------------- | ------------------------------------ | ----- |
| POST   | `/v1/heartbeat`   | API Key OR Activation Code | Receive a heartbeat.        | §12.9 |

#### 4.7.1 POST /v1/heartbeat

**Request body** (`HeartbeatRequest` from
[`@smart-edms/license-core`](../packages/license-core/src/heartbeat.ts))

```jsonc
{
  "licenseId": "01HE3A5K7N…",
  "activationId": "01HE3A5K7N…",
  "deploymentId": "01HE3A5K7N…",
  "appVersion": "1.0.0",
  "fingerprintHash": "sha256-…",
  "usageSummary": {
    "users": 42,
    "storageBytes": 5368709120,
    "documents": 12345,
    "aiCallsThisMonth": 3120
  },
  "sentAt": "2025-01-31T08:30:00.000Z",
  "nonce": "01HE3A5K7N…"
}
```

**Response 200**

```jsonc
{
  "status": "healthy",            // healthy | degraded | offline_grace | revoked | unknown
  "receivedAt": "2025-01-31T08:30:00.000Z",
  "nextHeartbeatDueAt": "2025-01-31T09:30:00.000Z",
  "signature": "<signed-response>",
  "kid": "key-2025-01"
}
```

The on-prem backend verifies `signature` against its embedded public
key. A `revoked` response triggers immediate license-state transition
to `revoked` (spec §12.9).

### 4.8 Trials

| Method | Path                       | Auth      | Purpose                              | Spec  |
| ------ | -------------------------- | --------- | ------------------------------------ | ----- |
| POST   | `/v1/trials`               | Admin JWT | Create a trial.                      | §12.10|
| GET    | `/v1/trials`               | Admin JWT | List trials.                         | §12.10|
| GET    | `/v1/trials/:id`           | Admin JWT | Get a trial.                         | §12.10|
| POST   | `/v1/trials/:id/convert`   | Admin JWT | Convert trial → full license.        | §12.10|
| POST   | `/v1/trials/:id/cancel`    | Admin JWT | Cancel a trial.                      | §12.10|

#### 4.8.1 POST /v1/trials

**Request body**

```jsonc
{
  "customerId": "01HE3A5K7N…",
  "productId": "01HE3A5K7N…",
  "contactEmail": "eval@example.com",
  "maxDurationDays": 14,
  "featureLimits": {
    "maxUsers": 10,
    "maxDocuments": 1000,
    "aiUsageAllowance": 100
  }
}
```

**Response 201** — the created `Trial` with its one-time `activationCode`.

#### 4.8.2 POST /v1/trials/:id/convert

**Request body**

```jsonc
{ "planId": "01HE3A5K7N…", "type": "subscription", "durationDays": 365 }
```

Creates a new `License` from the trial's customer + product, marks the
trial `converted`, sets `convertedToLicenseId`.

### 4.9 Webhooks

| Method | Path                                       | Auth      | Purpose                              | Spec |
| ------ | ------------------------------------------ | --------- | ------------------------------------ | ---- |
| POST   | `/v1/webhooks`                             | Admin JWT | Create a webhook.                    | §12  |
| GET    | `/v1/webhooks?customerId=`                 | Admin JWT | List webhooks for a customer.        | §12  |
| DELETE | `/v1/webhooks/:id`                         | Admin JWT | Delete a webhook.                    | §12  |
| GET    | `/v1/webhooks/:id/deliveries`              | Admin JWT | List delivery attempts.              | §12  |
| POST   | `/v1/webhooks/deliveries/:id/replay`       | Admin JWT | Manually replay a delivery.          | §12  |

#### 4.9.1 POST /v1/webhooks

**Request body**

```jsonc
{
  "customerId": "01HE3A5K7N…",
  "url": "https://acme.example/webhooks/smart-edms",
  "events": ["license.issued", "license.revoked", "license.renewed", "heartbeat.failed"]
}
```

**Response 201**

```jsonc
{
  "id": "01HE3A5K7N…",
  "secret": "<one-time-shown-hmac-secret>",
  "url": "https://acme.example/webhooks/smart-edms",
  "events": ["license.issued", "license.revoked", "license.renewed", "heartbeat.failed"]
}
```

The HMAC secret is **shown once**. The server signs every delivery with
`X-Smart-Edms-Signature: t=<timestamp>,v1=<hmac-sha256-hex>`.

### 4.10 API Keys

| Method | Path                          | Auth      | Purpose                              | Spec |
| ------ | ----------------------------- | --------- | ------------------------------------ | ---- |
| POST   | `/v1/api-keys`                | Admin JWT | Create an API key for a customer.    | §12  |
| GET    | `/v1/api-keys?customerId=`    | Admin JWT | List API keys for a customer.        | §12  |
| DELETE | `/v1/api-keys/:id`            | Admin JWT | Revoke an API key.                   | §12  |

#### 4.10.1 POST /v1/api-keys

**Request body**

```jsonc
{
  "customerId": "01HE3A5K7N…",
  "name": "Production activation key",
  "scopes": ["activation:online", "heartbeat:write"],
  "expiresAt": "2026-01-01T00:00:00.000Z"
}
```

**Response 201**

```jsonc
{
  "id": "01HE3A5K7N…",
  "key": "<one-time-shown-seedms-…-key>",
  "keyPrefix": "seedms-AB",
  "scopes": ["activation:online", "heartbeat:write"],
  "expiresAt": "2026-01-01T00:00:00.000Z"
}
```

### 4.11 Signing Keys

| Method | Path                       | Auth                  | Purpose                              | Spec  |
| ------ | -------------------------- | --------------------- | ------------------------------------ | ----- |
| GET    | `/v1/signing-keys/active`  | Admin JWT             | Get active signing key (public).     | §12.4 |
| GET    | `/v1/signing-keys`         | Admin JWT             | List all signing keys (public).      | §12.4 |
| POST   | `/v1/signing-keys/rotate`  | Admin JWT + Step-Up   | Generate a new keypair for rotation. | §12.4 |

The **private key is never exposed** via these endpoints — only public
metadata (`kid`, `alg`, `publicKeyPem`, `status`). The private key is
loaded at startup from `LICENSE_SIGNING_KEY_PATH` (chmod 600) or
referenced via `kmsKeyId` for KMS/HSM deployments (spec §12.4).

#### 4.11.1 POST /v1/signing-keys/rotate

**Request body**

```jsonc
{ "targetKeyPath": "/etc/smart-edms/keys/key-2026-01.pem", "alg": "EdDSA" }
```

**Response 200**

```jsonc
{
  "kid": "key-2026-01",
  "alg": "EdDSA",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----",
  "status": "retiring",           // current key transitioned to retiring
  "createdAt": "2025-01-31T08:30:00.000Z"
}
```

The new key becomes active on the next server restart. Old licenses
continue to verify against the retiring key until all deployments have
re-activated.

### 4.12 Audit Logs

| Method | Path                | Auth      | Purpose                              | Spec  |
| ------ | ------------------- | --------- | ------------------------------------ | ----- |
| GET    | `/v1/audit`         | Admin JWT | List audit log entries (paginated).  | §21.7 |
| GET    | `/v1/audit/verify`  | Admin JWT | Verify audit hash-chain integrity.   | §21.7 |

#### 4.12.1 GET /v1/audit

**Query params**

| Param        | Type            | Default | Notes                              |
| ------------ | --------------- | ------- | ---------------------------------- |
| `limit`      | int             | 100     | Max 500.                           |
| `cursor`     | opaque int      | null    | `sequenceNumber`-based.            |
| `action`     | string          | —       | e.g. `license.issue`, `license.revoke`. |
| `customerId` | UUID            | —       | —                                  |

**Response 200** — `PaginatedResponse<LicenseAuditLog>`

```jsonc
{
  "items": [
    {
      "id": "01HE3A5K7N…",
      "adminId": "01HE3A5K7N…",
      "action": "license.issue",
      "target": "01HE3A5K7N…",
      "metadata": { "code": "SEDMS-PRO-2025-000123" },
      "ipAddress": "10.0.0.1",
      "userAgent": "Mozilla/5.0…",
      "occurredAt": "2025-01-31T08:30:00.000Z",
      "sequenceNumber": 12345,
      "previousHash": "9f2c…",
      "eventHash": "b81e…",
      "customerId": "01HE3A5K7N…"
    }
  ],
  "nextCursor": "12346",
  "hasMore": true,
  "total": null
}
```

### 4.13 Revocation / CRL

| Method | Path                          | Auth      | Purpose                              | Spec  |
| ------ | ----------------------------- | --------- | ------------------------------------ | ----- |
| GET    | `/v1/crl`                     | None      | Fetch the latest `.sedmscrl`.        | §12.4 |
| POST   | `/v1/revocations/refresh`     | Admin JWT | Manually rebuild + sign the CRL.     | §12.4 |

#### 4.13.1 GET /v1/crl

`@Public()` endpoint. On-prem backends fetch this periodically when
online to immediately invalidate revoked licenses (spec §12.4). Offline
deployments must import the CRL manually via the admin panel.

```jsonc
{
  "version": 7,
  "generatedAt": "2025-01-31T08:30:00.000Z",
  "kid": "key-2025-01",
  "alg": "EdDSA",
  "revokedLicenseIds": ["01HE3A5K7N…", "01HE3A5K7N…"],
  "revokedFingerprints": ["sha256-…"],
  "signature": "<signed-crl-payload>"
}
```

The on-prem backend verifies `signature` against the embedded public
key and stores the CRL locally for offline use.

### 4.14 Public

| Method | Path                | Auth  | Purpose                              | Spec |
| ------ | ------------------- | ----- | ------------------------------------ | ---- |
| GET    | `/v1/health`        | None  | Liveness probe.                      | §22  |
| GET    | `/v1/health/ready`  | None  | Readiness probe (DB + Redis + key).  | §22  |
| GET    | `/v1/crl`           | None  | Latest CRL (see §4.13.1 above).      | §12.4|

---

## 5. Error code reference

The full `ApiErrorCode` vocabulary from
[`@smart-edms/types`](../packages/types/src/common.ts) (spec §14.2). Codes
are **extensible but stable** — existing codes never change meaning
across releases.

| Code                              | HTTP | Meaning                                                                  |
| --------------------------------- | ---- | ------------------------------------------------------------------------ |
| `UNAUTHORIZED`                    | 401  | Missing or invalid JWT.                                                  |
| `FORBIDDEN`                       | 403  | Authenticated but role/permission insufficient.                          |
| `NOT_FOUND`                       | 404  | Resource does not exist or tenant-scoped query returned nothing.         |
| `VALIDATION_FAILED`               | 400  | Zod validation failure (field-level details in `details`).               |
| `CONFLICT`                        | 409  | Unique-constraint violation or optimistic-concurrency mismatch.          |
| `RATE_LIMITED`                    | 429  | Rate-limit window exceeded.                                              |
| `TENANT_MISMATCH`                 | 403  | JWT `tid` does not match an `ACTIVE` tenant (spec §15.3).                |
| `LICENSE_INVALID`                 | 402  | License signature failed, kid unknown, or state = `invalid` / `revoked`. |
| `LICENSE_EXPIRED`                 | 402  | License past `endDate` and grace exhausted.                              |
| `LICENSE_GRACE_EXHAUSTED`         | 402  | Mutating call while in `grace_exhausted` state.                          |
| `LICENSE_FEATURE_NOT_ENTITLED`    | 403  | License does not include the required module (e.g. `ai-assistant`).      |
| `LEGAL_HOLD_BLOCKS_ACTION`        | 403  | Document under active legal hold (spec §9.7, §15.5).                     |
| `RETENTION_BLOCKS_ACTION`         | 403  | Document is a record and retention policy forbids the action.            |
| `CLASSIFICATION_DOWNGRADE_DENIED` | 403  | Downgrade attempt without `security-officer` role.                       |
| `WORKFLOW_INVALID_STATE`          | 409  | Workflow instance not in expected state for the operation.               |
| `AI_UNAVAILABLE`                  | 503  | Upstream AI provider down or rate-limited.                               |
| `AI_NOT_LICENSED`                 | 402  | `ai-assistant` module not in license or license invalid.                 |
| `AI_ACTION_REQUIRES_CONFIRMATION` | 422  | Suggested action requires explicit `/confirm`.                           |
| `AI_PROMPT_INJECTION_DETECTED`    | 400  | Pre-injection filter matched.                                            |
| `EXTERNAL_AI_DISABLED`            | 403  | Tenant `externalAiAllowed = false` but request routed externally.        |
| `TOUR_NOT_FOUND`                  | 404  | Unknown tour id.                                                         |
| `TOUR_NOT_LICENSED`               | 403  | Tour requires a license module not present.                              |
| `INTERNAL_ERROR`                  | 500  | Unexpected server error (logged with `traceId`).                         |

### 5.1 Error envelope examples

**Validation failure (422)**

```jsonc
{
  "ok": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "messageKey": "errors.validation.failed",
    "messageVars": { "count": 2 },
    "traceId": "01HE3A5K7N…",
    "details": {
      "issues": [
        { "path": ["email"], "message": "Invalid email" },
        { "path": ["roleCodes", 0], "message": "Unknown role code 'superuser'" }
      ]
    }
  }
}
```

**License-related (402)**

```jsonc
{
  "ok": false,
  "error": {
    "code": "LICENSE_EXPIRED",
    "messageKey": "errors.license.expired",
    "messageVars": { "endDate": "2025-01-01", "graceDaysLeft": 0 },
    "traceId": "01HE3A5K7N…",
    "details": { "licenseState": "expired", "licenseId": "01HE3A5K7N…" }
  }
}
```

**Legal hold (403)**

```jsonc
{
  "ok": false,
  "error": {
    "code": "LEGAL_HOLD_BLOCKS_ACTION",
    "messageKey": "errors.legalHold.blocksDelete",
    "messageVars": { "holdCode": "litigation-2025-001" },
    "traceId": "01HE3A5K7N…",
    "details": { "documentId": "01HE3A5K7N…", "holdIds": ["01HE3A5K7N…"] }
  }
}
```

---

## 6. OpenAPI / Swagger generation

The on-prem backend does not currently ship a generated OpenAPI document;
endpoints are documented in this file and validated by Zod schemas at
runtime (spec §14.1 — Zod is the source of truth, not TypeScript
interfaces). The license-server controllers carry `@nestjs/swagger`
decorators (`@ApiTags`, `@ApiOperation`) for admin-panel code generation
but a full OpenAPI export is planned for v1.1.

In the interim, clients should:

1. Use this document as the canonical reference.
2. Import Zod schemas from `@smart-edms/schemas` for runtime validation
   of request bodies on the client side.
3. Import TypeScript types from `@smart-edms/types` for compile-time
   safety.

A future task will add `zod-to-openapi` to emit a `openapi.json` from
the Zod schemas for both services.

---

## 7. Changelog

| Date       | Change                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| 2025-01-31 | Initial creation. Cataloged all EDMS backend modules and license-server endpoints.      |

---

**Related documents**

- [`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md) — the 26
  real-time events emitted alongside these REST endpoints.
- [`DATA_MODEL.md`](./DATA_MODEL.md) — the Prisma entities backing every
  endpoint in this catalog.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — service topology, deployment
  diagram.
- [`SECURITY_CONTROLS.md`](./SECURITY_CONTROLS.md) — the security control
  matrix that every endpoint in this catalog must satisfy.
- [`LICENSE_FILE_SPEC.md`](./LICENSE_FILE_SPEC.md) — the on-disk format
  of `.sedmslic`, `.sedmsreq`, `.sedmscrl` artifacts referenced in §3.13
  and §4.5.
- [`I18N.md`](./I18N.md) — locale resolution for `messageKey` values
  returned by the error envelope.
