# Smart EDMS — Data Model

> **Spec references:** §26.10 (data model surface), §15 (Data Model),
> §9.x (entity scope per module), §12 (licensing server entities),
> §21.7 (audit immutability), §27.3 (security rules).
>
> **Cross-references:**
> - REST endpoints that read/write these entities → [`API_SPECIFICATION.md`](./API_SPECIFICATION.md)
> - WebSocket events carrying these entity IDs → [`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md)
> - Audit hash-chain verification tests → [`apps/backend/test/audit-hash-chain.test.ts`](../apps/backend/test/audit-hash-chain.test.ts)
> - Tenant-isolation tests → [`apps/backend/test/tenant-isolation.test.ts`](../apps/backend/test/tenant-isolation.test.ts)
> - License file artifact formats → [`LICENSE_FILE_SPEC.md`](./LICENSE_FILE_SPEC.md)

This document is the canonical entity reference for the Smart EDMS
platform. It covers **two Prisma schemas** living in **two separate
PostgreSQL databases**:

1. **On-premise EDMS backend** — schema at
   [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma),
   ~40 entities organized into 13 domains (spec §15.1).
2. **Licensing server** — schema at
   [`apps/license-server/prisma/schema.prisma`](../apps/license-server/prisma/schema.prisma),
   ~20 entities prefixed with `lic_` (spec §15.2).

The two schemas share no foreign keys. The on-prem backend's
`LicenseLocalState` table is the only place where a license-server
artifact (the signed `.sedmslic`) lives on the on-prem side — and even
there, it is stored as an opaque signed payload, not as a foreign-key
reference to the licensing server's `License` row.

---

## Table of contents

1. [Overview](#1-overview)
2. [Multi-tenant isolation rules (§15.3)](#2-multi-tenant-isolation-rules-153)
3. [Identifiers and timestamps (§15.4)](#3-identifiers-and-timestamps-154)
4. [Soft delete and immutability (§15.5)](#4-soft-delete-and-immutability-155)
5. [EDMS backend entities by domain](#5-edms-backend-entities-by-domain)
   - 5.1 [Identity & Tenancy](#51-identity--tenancy)
   - 5.2 [Documents](#52-documents)
   - 5.3 [Workflows](#53-workflows)
   - 5.4 [Retention](#54-retention)
   - 5.5 [Audit & Provenance](#55-audit--provenance)
   - 5.6 [Sharing](#56-sharing)
   - 5.7 [Notifications](#57-notifications)
   - 5.8 [License local state](#58-license-local-state)
   - 5.9 [Scanner](#59-scanner)
   - 5.10 [Tours](#510-tours)
   - 5.11 [AI Assistant](#511-ai-assistant)
   - 5.12 [API Keys & Webhooks](#512-api-keys--webhooks)
   - 5.13 [Jobs](#513-jobs)
   - 5.14 [Locale Resources](#514-locale-resources)
   - 5.15 [Saved Searches](#515-saved-searches)
6. [Licensing server entities (§15.2)](#6-licensing-server-entities-separate-database-152)
   - 6.1 [Customer & Contact](#61-customer--contact)
   - 6.2 [Product & Plan](#62-product--plan)
   - 6.3 [License, Feature, Limit](#63-license-feature-limit)
   - 6.4 [Signing Keys](#64-signing-keys)
   - 6.5 [Activation & Device](#65-activation--device)
   - 6.6 [Heartbeat & Usage](#66-heartbeat--usage)
   - 6.7 [Revocation](#67-revocation)
   - 6.8 [Trials](#68-trials)
   - 6.9 [Webhooks](#69-webhooks)
   - 6.10 [API Keys](#610-api-keys)
   - 6.11 [Audit Log](#611-audit-log)
   - 6.12 [Offline Activation](#612-offline-activation)
   - 6.13 [Admin Users](#613-admin-users)
7. [Enums reference](#7-enums-reference)
8. [Indexing strategy](#8-indexing-strategy)
9. [Migration policy](#9-migration-policy)
10. [Changelog](#10-changelog)

---

## 1. Overview

### 1.1 Database & ORM

| Property          | Value                                                                |
| ----------------- | -------------------------------------------------------------------- |
| Database          | PostgreSQL 14+ (on-prem) and 14+ (license server)                    |
| ORM               | Prisma 5.x (`prisma-client-js`)                                      |
| ID generation     | PostgreSQL `gen_random_uuid()` (UUID v4) via `@default(uuid())`      |
| Timestamp type    | `@db.Timestamptz(3)` — UTC, microsecond precision                    |
| Soft-delete field | `deletedAt DateTime? @db.Timestamptz(3)` on tenant-owned tables      |
| JSON columns      | `Json` (PostgreSQL `jsonb`) for structured, schema-on-read data     |
| BigInt columns    | `BigInt` for byte sizes and audit sequence numbers                  |
| Arrays            | `String[]` for tag-like fields (roles, scopes, locales, events)      |

Prisma schema files:

- [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma)
- [`apps/license-server/prisma/schema.prisma`](../apps/license-server/prisma/schema.prisma)

The initial migration for each schema is at:

- [`apps/backend/prisma/migrations/0001_init/migration.sql`](../apps/backend/prisma/migrations/0001_init/migration.sql)
- [`apps/license-server/prisma/migrations/0001_init/migration.sql`](../apps/license-server/prisma/migrations/0001_init/migration.sql)

### 1.2 Generator configuration

Both schemas use the same generator block to enable musl/openssl-3.0.x
binary targets (production Docker images are Alpine-based):

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

### 1.3 Connection pooling

The backend uses Prisma's built-in connection pool with a configurable
`DATABASE_URL` (typically `?connection_limit=10&pool_timeout=10`).
For serverless deployments a PgBouncer sidecar is recommended (spec
§22.4). The licensing server uses a smaller pool (default 5
connections) since its workload is bursty but low-QPS.

### 1.4 Naming conventions

| Convention             | Rule                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| Table names            | `snake_case` plural (e.g. `audit_events`, `lic_licenses`).            |
| Column names           | `camelCase` in Prisma schema, mapped to `snake_case` via `@map`.      |
| Foreign keys           | `<entity>_id` (e.g. `tenant_id`, `document_id`).                      |
| Join tables            | `<a>_<b>` (e.g. `group_members`, `user_role_assignments`).            |
| Timestamps             | `createdAt`, `updatedAt`, `deletedAt` (`@db.Timestamptz(3)`).         |
| Boolean flags          | `isXxx` (e.g. `isActive`, `isLocked`, `isImmutable`).                 |
| License-server tables  | All prefixed with `lic_` to keep schemas visually distinct.           |

---

## 2. Multi-tenant isolation rules (§15.3)

### 2.1 The `tenant_id` rule

Every tenant-owned record carries a `tenant_id` column of type
`@db.Uuid`. This is enforced at three layers (spec §15.3, §27.3):

1. **Schema layer** — the Prisma model has `tenantId String @db.Uuid`
   with `@@index([tenantId, ...])` on every read path.
2. **Query layer** — every Prisma `findMany` / `findUnique` /
   `update` / `delete` includes `where: { tenantId, ... }`. The
   service layer never constructs a query without the tenant filter.
3. **Database layer** — production deployments SHOULD enable
   PostgreSQL Row-Level Security (RLS) policies that default-deny
   rows unless the current session's `app.tenant_id` setting matches
   the row's `tenant_id`.

The middleware at
[`apps/backend/src/common/middleware/tenant-context.middleware.ts`](../apps/backend/src/common/middleware/tenant-context.middleware.ts)
sets the `app.tenant_id` session variable via `SET LOCAL` at the
start of each request. The RLS policy on each table is:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### 2.2 Cross-tenant join prevention

Prisma relations that cross tenants are not modeled. For example, a
`Document` belongs to a `Tenant` and a `User` belongs to a `Tenant`,
but there is no direct Prisma relation from `Document` to `User`
across tenants — the `createdByUserId` field is a plain UUID column
with a relation to `User` only valid because `User.tenantId ==
Document.tenantId` is enforced at query time.

The tenant-isolation test suite at
[`apps/backend/test/tenant-isolation.test.ts`](../apps/backend/test/tenant-isolation.test.ts)
exercises every endpoint with two tenants and asserts that:

- Tenant A cannot read, update, or delete tenant B's resources.
- A cross-tenant access attempt is audited as a `TENANT_MISMATCH`
  event with `result: 'deny'`.

### 2.3 Tables without `tenant_id`

A small number of tables are intentionally **not** tenant-scoped:

| Table             | Reason                                                            |
| ----------------- | ----------------------------------------------------------------- |
| `Tenant`          | The tenant itself (root entity).                                  |
| `LicenseLocalState` | One row per deployment (not per tenant — a deployment hosts one tenant by default, but the table is keyed on `deploymentId`). |
| `LocaleResource`  | Carries `tenant_id` because it stores per-tenant overrides. (Contradiction with the rule? No — it IS tenant-scoped; the locale catalog itself lives in code, the table only stores overrides.) |

All other tables in the EDMS backend schema carry `tenant_id`.

### 2.4 Licensing server is single-tenant-by-customer

The licensing server serves many **customers** but is not multi-tenant
in the same sense. Every `License`, `Activation`, `Heartbeat`,
`Webhook`, `ApiKey`, and `LicenseAuditLog` row carries a
`customerId` foreign key, and admin endpoints accept a `customerId`
query parameter to scope the response. There is no RLS on the
licensing server because the admin JWT is global — access control is
enforced at the application layer by the
[`AdminJwtGuard`](../apps/license-server/src/security/admin-jwt.guard.ts)
and the `@AdminRoles(...)` decorator.

---

## 3. Identifiers and timestamps (§15.4)

### 3.1 UUID generation

All primary keys use PostgreSQL's `gen_random_uuid()` function
(exposed in Prisma as `@default(uuid())`). The UUIDs are v4 (random),
not v7 (sortable). Sortable IDs were considered but rejected because:

- Prisma does not yet support UUIDv7 natively (planned for v6).
- The sort order for list endpoints is explicit (`createdAt`,
  `updatedAt`, etc.) and indexed — UUIDv7 would not change query
  plans.
- ULID was considered but adds a dependency and a custom Prisma type.

The string form is canonical lower-case: `01he3a5k7n8q-x1y2z3w4v5s6r7`
is invalid; `01he3a5k7n8qx1y2z3w4v5s6r7` is valid.

### 3.2 Timestamp type

All timestamps use `@db.Timestamptz(3)` — PostgreSQL's
`timestamp with time zone` with millisecond precision (3 fractional
digits). The application layer serializes them as ISO 8601 UTC strings
(`2025-01-31T08:30:00.000Z`) via the `ISODateString` branded type in
[`@smart-edms/types`](../packages/types/src/common.ts).

The three standard timestamp columns:

| Column      | Prisma directive                              | Meaning                                |
| ----------- | --------------------------------------------- | -------------------------------------- |
| `createdAt` | `@default(now()) @db.Timestamptz(3)`          | Row creation time (UTC, set by DB).    |
| `updatedAt` | `@updatedAt @db.Timestamptz(3)`               | Last update time (UTC, set by Prisma). |
| `deletedAt` | `DateTime? @db.Timestamptz(3)`                | Soft-delete time (UTC, null if alive). |

`@updatedAt` is a Prisma-managed field — every `update` operation
bumps it automatically. Do not set it manually.

### 3.3 Audit-specific timestamps

The `AuditEvent` table (spec §15.5, §21.7) uses an **immutable**
timestamp scheme:

| Column             | Type                  | Purpose                                            |
| ------------------ | --------------------- | -------------------------------------------------- |
| `occurredAt`       | `@db.Timestamptz(3)`  | When the event happened (UTC). Never updated.      |
| `sequenceNumber`   | `BigInt`              | Monotonic per-tenant counter (1, 2, 3, …).         |
| `previousHash`     | `String? @db.VarChar(128)` | SHA-256 of the prior event's canonical form.  |
| `eventHash`        | `String @db.VarChar(128)`  | SHA-256 of this event's canonical form.       |

The `AuditEvent` table has **no `updatedAt`** and **no `deletedAt`**
— it is append-only. Once a row is written, it can never be modified
or deleted (spec §15.5, §21.7). The hash chain is verified by `GET
/v1/audit/verify-chain` (see
[`API_SPECIFICATION.md` §3.9.2](./API_SPECIFICATION.md#392-get-v1auditverify-chain)).

### 3.4 BigInt for byte sizes

Storage sizes and quotas use `BigInt` to avoid JavaScript's 2^53
number-precision limit (a 10-GB quota in bytes is `10737418240`,
which is fine for `number`, but a 16-EB quota would overflow). Prisma
serializes `BigInt` to a string in JSON responses; the client parses
it back with `BigInt(value)` or treats it as a string for display.

```typescript
// In API responses:
{ "sizeBytes": "1234567", "quotaStorageBytes": "10737418240" }
```

---

## 4. Soft delete and immutability (§15.5)

### 4.1 Soft-delete pattern

User-facing deletion is **soft delete first** (spec §15.5). The
service layer sets `deletedAt = now()` and (where applicable)
`status = DELETED`. The row remains in the database and can be
recovered for a configurable retention window (default 30 days,
configurable per tenant).

The Prisma query layer automatically filters out soft-deleted rows
unless the caller explicitly passes `includeDeleted: true` (admin
only — see [`API_SPECIFICATION.md` §3.4.4](./API_SPECIFICATION.md#344-get-v1documents)).

Tables that support soft delete:

| Table          | Soft-delete column | Status column (if any)                |
| -------------- | ------------------ | ------------------------------------- |
| `Tenant`       | `deletedAt`        | `status` (`ACTIVE` / `SUSPENDED` / `DELETED`) |
| `User`         | `deletedAt`        | `status` (`ACTIVE` / `SUSPENDED` / `INVITED` / `DELETED`) |
| `Folder`       | `deletedAt`        | —                                     |
| `Document`     | `deletedAt`        | `status` (see §5.2.2)                 |
| `Customer`     | `deletedAt`        | `status` (licensing server)           |
| `Product`      | `deletedAt`        | —                                     |
| `AdminUser`    | `deletedAt`        | `isActive`                            |

### 4.2 Hard delete

Hard delete is **policy-controlled and audited** (spec §15.5). It is
never performed automatically by the application; it requires an
explicit admin action via a planned admin endpoint (not yet
implemented — tracked as a v1.1 task). The hard-delete flow:

1. Verify the row is past its soft-delete retention window.
2. Verify no `LegalHold` is active on the resource (for documents).
3. Verify no `WorkflowInstance` references it as `documentId` (for
   documents).
4. Write a hard-delete audit event (`resource.purged`).
5. Execute `DELETE FROM ... WHERE id = ...`.
6. Cascade-delete related rows (e.g. `DocumentVersion`,
   `MetadataValue`, `DocumentComment`) — these are also audited.

### 4.3 Audit log immutability

The `AuditEvent` table is **append-only** (spec §15.5, §21.7). It
has:

- No `updatedAt` column.
- No `deletedAt` column.
- No Prisma `update` or `delete` operations in the codebase (the
  service layer only calls `create` and `findMany` / `findUnique` / `count`).

The hash chain (`previousHash` / `eventHash`) provides cryptographic
proof of immutability — any modification would break the chain,
detectable via `GET /v1/audit/verify-chain`. The test suite at
[`apps/backend/test/audit-hash-chain.test.ts`](../apps/backend/test/audit-hash-chain.test.ts)
verifies that tampering with a row is detected.

### 4.4 Legal hold blocks destructive deletion

A `Document` with `legalHoldActive = true` cannot be deleted (soft or
hard) — the service layer refuses with `403 LEGAL_HOLD_BLOCKS_ACTION`
(spec §9.7, §15.5). The `legalHoldActive` flag is a denormalized
boolean maintained by a trigger on the `LegalHold` ↔ `Document` join
table (or by the `LegalHoldService` in application code).

### 4.5 Document version immutability

Once a `DocumentVersion` row is committed, its `storageKey`,
`checksum`, `sizeBytes`, `mime`, and `originalFilename` are
**immutable** (the `isImmutable` column is `true` by default and
should never be flipped). Restoring a prior version creates a **new**
`DocumentVersion` row that references the prior version's `storageKey`
— it does not modify the prior row (spec §15.5).

This guarantee is critical for legal-defensibility: a document
produced in discovery can be cryptographically verified to be
identical to the version that was stored at a given point in time.

---

## 5. EDMS backend entities by domain

The on-premise backend schema is organized into 13 domains. Each
domain is a section of the Prisma schema and corresponds to one or
more REST modules (see [`API_SPECIFICATION.md` §3](./API_SPECIFICATION.md#3-endpoint-catalog--edms-backend)).

### 5.1 Identity & Tenancy

#### 5.1.1 `Tenant`

**Purpose** — the root entity representing a customer organization.
Every other tenant-owned row references `Tenant.id` via `tenantId`.

| Field                 | Type                   | Notes                                                     |
| --------------------- | ---------------------- | --------------------------------------------------------- |
| `id`                  | `String @id` UUID      | Primary key.                                              |
| `code`                | `String @unique`       | Human-readable code (e.g. `tenant-001`).                  |
| `name`                | `String`               | Display name.                                             |
| `slug`                | `String @unique`       | URL-safe slug.                                            |
| `status`              | `TenantStatus` enum    | `ACTIVE` / `SUSPENDED` / `DELETED`.                       |
| `defaultLocale`       | `String @db.VarChar(16)` | Default UI locale (BCP 47).                              |
| `enabledLocales`      | `String[]`             | Subset of the 6 mandatory locales.                        |
| `defaultTheme`        | `String @db.VarChar(16)` | `system` / `light` / `dark`.                             |
| `flagConfig`          | `Json`                 | Per-locale flag overrides (e.g. `{ "ar": "neutral" }`).   |
| `branding`            | `Json?`                | Logo URL, primary color, etc.                             |
| `dataResidency`       | `String? @db.VarChar(64)` | Geo-residency tag (e.g. `EU`, `US`, `ME`).             |
| `quotaUsers`          | `Int`                  | Max users.                                                |
| `quotaStorageBytes`   | `BigInt`               | Max storage.                                              |
| `quotaDocuments`      | `Int`                  | Max documents.                                            |
| `createdAt`           | `DateTime` timestamptz | —                                                         |
| `updatedAt`           | `DateTime` timestamptz | —                                                         |
| `deletedAt`           | `DateTime?` timestamptz| Soft delete.                                              |

**Indexes** — `@@index([status])`.

**Relationships** — has many: `User`, `Group`, `Role`, `Document`,
`Folder`, `ClassificationLabel`, `MetadataSchema`, `WorkflowDefinition`,
`RetentionSchedule`, `LegalHold`, `ShareLink`, `AuditEvent`,
`Notification`, `ScannerProfile`, `ScannerJob`, `TourDefinition`,
`TourUserState`, `AssistantSession`, `ApiKey`, `Webhook`, `Job`,
`LocaleResource`, `SavedSearch`. Has one: `AssistantSettings`.

**Spec ref** — §9.1 (tenant scope), §15.1 (entity), §15.3 (isolation).

---

#### 5.1.2 `User`

**Purpose** — a person or service account that can authenticate and
perform actions within a tenant.

| Field                 | Type                     | Notes                                                    |
| --------------------- | ------------------------ | -------------------------------------------------------- |
| `id`                  | `String @id` UUID        | Primary key.                                             |
| `tenantId`            | `String @db.Uuid`        | FK to `Tenant`.                                          |
| `email`               | `String`                 | Unique per tenant (`@@unique([tenantId, email])`).       |
| `emailVerified`       | `Boolean`                | —                                                        |
| `passwordHash`        | `String?`                | Argon2id hash; `null` for SSO-only users.                |
| `firstName`           | `String`                 | —                                                        |
| `lastName`            | `String`                 | —                                                        |
| `preferredName`       | `String?`                | —                                                        |
| `status`              | `UserStatus` enum        | `ACTIVE` / `SUSPENDED` / `INVITED` / `DELETED`.          |
| `mfaEnabled`          | `Boolean`                | —                                                        |
| `mfaSecret`           | `String? @db.VarChar(64)`| TOTP secret (encrypted at rest).                         |
| `mfaBackupCodes`      | `String[]`               | Hashed backup codes.                                     |
| `preferredLocale`     | `String? @db.VarChar(16)`| Per-user override.                                       |
| `preferredTheme`      | `String? @db.VarChar(16)`| `system` / `light` / `dark`.                             |
| `preferredTimezone`   | `String? @db.VarChar(64)`| IANA tz.                                                |
| `failedLoginCount`    | `Int`                    | Reset on successful login.                               |
| `lockedUntil`         | `DateTime?` timestamptz  | Lockout expiry.                                          |
| `lastLoginAt`         | `DateTime?` timestamptz  | —                                                        |
| `lastLoginIp`         | `String? @db.VarChar(64)`| —                                                        |
| `createdAt`           | `DateTime` timestamptz   | —                                                        |
| `updatedAt`           | `DateTime` timestamptz   | —                                                        |
| `deletedAt`           | `DateTime?` timestamptz  | Soft delete.                                             |

**Indexes** — `@@unique([tenantId, email])`, `@@index([tenantId, status])`,
`@@index([email])`.

**Relationships** — belongs to `Tenant`. Has many: `Session`,
`GroupMember`, `UserRoleAssignment`, `Document` (as creator),
`AuditEvent`, `Notification`, `TourUserState`, `AssistantSession`,
`AssistantAuditEvent`. Has one: `UserPreference`, `DeviceTrust`.

**Spec ref** — §9.2 (user management), §15.1, §21.4 (auth security).

---

#### 5.1.3 `UserPreference`

**Purpose** — per-user UI and behavior preferences. Separate table to
avoid bloating the `User` row and to allow preferences to be lazy-loaded.

| Field                  | Type                     | Notes                                              |
| ---------------------- | ------------------------ | -------------------------------------------------- |
| `id`                   | `String @id` UUID        | —                                                  |
| `userId`               | `String @id` UUID        | FK to `User` (one-to-one).                         |
| `tenantId`             | `String @db.Uuid`        | For tenant-scoped queries.                         |
| `locale`               | `String @db.VarChar(16)` | —                                                  |
| `theme`                | `String @db.VarChar(16)` | —                                                  |
| `timezone`             | `String @db.VarChar(64)` | —                                                  |
| `numbering`            | `String? @db.VarChar(16)`| Numbering system (e.g. `arab-ext`).                |
| `direction`            | `String? @db.VarChar(8)` | `ltr` / `rtl` override.                            |
| `reducedMotion`        | `Boolean`                | —                                                  |
| `highContrast`         | `Boolean`                | —                                                  |
| `tourAutoStart`        | `Boolean`                | —                                                  |
| `aiAssistantEnabled`   | `Boolean`                | Per-user AI opt-out.                               |
| `notificationPrefs`    | `Json`                   | Per-channel + per-event-type preferences.          |
| `createdAt`            | `DateTime` timestamptz   | —                                                  |
| `updatedAt`            | `DateTime` timestamptz   | —                                                  |

**Spec ref** — §9.2, §16 (i18n), §10 (tour auto-start).

---

#### 5.1.4 `Session`

**Purpose** — tracks active user sessions for revocation and audit.
Refresh tokens are hashed at rest.

| Field                 | Type                     | Notes                                              |
| --------------------- | ------------------------ | -------------------------------------------------- |
| `id`                  | `String @id` UUID        | —                                                  |
| `userId`              | `String @db.Uuid`        | FK to `User`.                                      |
| `tenantId`            | `String @db.Uuid`        | —                                                  |
| `tokenHash`           | `String @unique`         | SHA-256 of access token `jti`.                     |
| `refreshTokenHash`    | `String? @unique`        | SHA-256 of refresh token.                          |
| `ipAddress`           | `String? @db.VarChar(64)`| —                                                  |
| `userAgent`           | `String? @db.Text`       | —                                                  |
| `deviceFingerprint`   | `String? @db.VarChar(128)`| —                                                 |
| `status`              | `SessionStatus` enum     | `ACTIVE` / `REVOKED` / `EXPIRED`.                  |
| `expiresAt`           | `DateTime` timestamptz   | —                                                  |
| `revokedAt`           | `DateTime?` timestamptz  | —                                                  |
| `createdAt`           | `DateTime` timestamptz   | —                                                  |
| `updatedAt`           | `DateTime` timestamptz   | —                                                  |

**Indexes** — `@@index([tenantId, userId])`, `@@index([expiresAt])` for
sweeper cron.

**Spec ref** — §9.2, §21.4 (token rotation, reuse detection).

---

#### 5.1.5 `DeviceTrust`

**Purpose** — tracks trusted device fingerprints for risk-based auth
(signals for step-up challenges).

| Field               | Type                     | Notes                                       |
| ------------------- | ------------------------ | ------------------------------------------- |
| `id`                | `String @id` UUID        | —                                           |
| `userId`            | `String @db.Uuid`        | FK to `User`.                               |
| `tenantId`          | `String @db.Uuid`        | —                                           |
| `fingerprint`       | `String @db.VarChar(128)`| SHA-256 of device attributes.               |
| `trusted`           | `Boolean`                | User-marked or admin-marked trusted.        |
| `firstSeenAt`       | `DateTime` timestamptz   | —                                           |
| `lastSeenAt`        | `DateTime` timestamptz   | —                                           |
| `metadata`          | `Json?`                  | OS, browser, etc.                           |

**Indexes** — `@@unique([userId, fingerprint])`, `@@index([tenantId])`.

**Spec ref** — §21.4 (auth security).

---

#### 5.1.6 `Group` & `GroupMember`

**Purpose** — user groups for permission assignment and notification
targeting.

`Group`:

| Field       | Type                   | Notes                              |
| ----------- | ---------------------- | ---------------------------------- |
| `id`        | `String @id` UUID      | —                                  |
| `tenantId`  | `String @db.Uuid`      | —                                  |
| `name`      | `String`               | Unique per tenant.                 |
| `description`| `String?`             | —                                  |
| `createdAt` | `DateTime` timestamptz | —                                  |
| `updatedAt` | `DateTime` timestamptz | —                                  |

`GroupMember`:

| Field       | Type                   | Notes                                |
| ----------- | ---------------------- | ------------------------------------ |
| `id`        | `String @id` UUID      | —                                    |
| `groupId`   | `String @db.Uuid`      | FK to `Group`.                       |
| `userId`    | `String @db.Uuid`      | FK to `User`.                        |
| `tenantId`  | `String @db.Uuid`      | —                                    |
| `role`      | `String @db.VarChar(32)`| `member` / `manager`.               |
| `createdAt` | `DateTime` timestamptz | —                                    |

**Indexes** — `Group`: `@@unique([tenantId, name])`, `@@index([tenantId])`.
`GroupMember`: `@@unique([groupId, userId])`, `@@index([tenantId, userId])`.

**Spec ref** — §9.2.

---

#### 5.1.7 `Role` & `UserRoleAssignment`

**Purpose** — role-based access control. Roles are tenant-scoped;
system roles (`admin`, `editor`, `auditor`, etc.) are seeded with
`isSystem = true` and cannot be deleted.

`Role`:

| Field         | Type                   | Notes                                  |
| ------------- | ---------------------- | -------------------------------------- |
| `id`          | `String @id` UUID      | —                                      |
| `tenantId`    | `String @db.Uuid`      | —                                      |
| `code`        | `String @db.VarChar(64)`| Unique per tenant.                    |
| `name`        | `String`               | Display name.                          |
| `description` | `String?`              | —                                      |
| `permissions` | `String[]`             | Permission codes (e.g. `document.read`).|
| `isSystem`    | `Boolean`              | Seeded role; cannot delete.            |
| `createdAt`   | `DateTime` timestamptz | —                                      |
| `updatedAt`   | `DateTime` timestamptz | —                                      |

`UserRoleAssignment`:

| Field       | Type                   | Notes                              |
| ----------- | ---------------------- | ---------------------------------- |
| `id`        | `String @id` UUID      | —                                  |
| `userId`    | `String @db.Uuid`      | FK to `User`.                      |
| `roleId`    | `String @db.Uuid`      | FK to `Role`.                      |
| `tenantId`  | `String @db.Uuid`      | —                                  |
| `createdAt` | `DateTime` timestamptz | —                                  |

**Spec ref** — §9.2 (RBAC), §27.3.

---

### 5.2 Documents

#### 5.2.1 `Folder`

**Purpose** — hierarchical folder tree for organizing documents. Path
is materialized as a `ltree`-style string for efficient subtree
queries.

| Field       | Type                   | Notes                                  |
| ----------- | ---------------------- | -------------------------------------- |
| `id`        | `String @id` UUID      | —                                      |
| `tenantId`  | `String @db.Uuid`      | —                                      |
| `parentId`  | `String? @db.Uuid`     | Self-FK; null for root folders.        |
| `name`      | `String`               | —                                      |
| `path`      | `String`               | Materialized path (`/root/sub/leaf`).  |
| `createdAt` | `DateTime` timestamptz | —                                      |
| `updatedAt` | `DateTime` timestamptz | —                                      |
| `deletedAt` | `DateTime?` timestamptz| Soft delete.                           |

**Indexes** — `@@index([tenantId, parentId])`, `@@index([tenantId, path])`.

**Spec ref** — §9.3.

---

#### 5.2.2 `Document`

**Purpose** — the core entity. A document is a logical record with one
or more immutable versions (spec §9.3, §15.5).

| Field                  | Type                       | Notes                                              |
| ---------------------- | -------------------------- | -------------------------------------------------- |
| `id`                   | `String @id` UUID          | —                                                  |
| `tenantId`             | `String @db.Uuid`          | —                                                  |
| `folderId`             | `String? @db.Uuid`         | FK to `Folder`.                                    |
| `title`                | `String`                   | —                                                  |
| `description`          | `String?`                  | —                                                  |
| `documentType`         | `String? @db.VarChar(64)`  | Free-form type tag.                                |
| `sourceSystem`         | `String? @db.VarChar(128)` | Origin (e.g. `scanner`, `import`, `api`).          |
| `contentLanguage`      | `String? @db.VarChar(16)`  | BCP 47 — may differ from UI locale.                |
| `textDirection`        | `String? @db.VarChar(8)`   | `ltr` / `rtl`.                                     |
| `classificationId`     | `String? @db.Uuid`         | FK to `ClassificationLabel`.                       |
| `sensitivityLevel`     | `Int`                      | 0..5 (denormalized from classification).           |
| `status`               | `DocumentStatus` enum      | see below.                                         |
| `isRecord`             | `Boolean`                  | True if declared a record (retention locked).      |
| `isLocked`             | `Boolean`                  | Checkout lock.                                     |
| `lockedByUserId`       | `String? @db.Uuid`         | FK to `User`.                                      |
| `lockedAt`             | `DateTime?` timestamptz    | —                                                  |
| `checksumAlgorithm`    | `String @db.VarChar(16)`   | Default `sha256`.                                  |
| `checksum`             | `String? @db.VarChar(128)` | Hex digest of current version's bytes.             |
| `sizeBytes`            | `BigInt`                   | Current version size.                              |
| `currentVersionId`     | `String? @db.Uuid`         | FK to `DocumentVersion`.                           |
| `retentionScheduleId`  | `String? @db.Uuid`         | FK to `RetentionSchedule`.                         |
| `legalHoldActive`      | `Boolean`                  | Denormalized: any active hold attached?            |
| `createdByUserId`      | `String @db.Uuid`          | FK to `User`.                                      |
| `createdAt`            | `DateTime` timestamptz     | —                                                  |
| `updatedAt`            | `DateTime` timestamptz     | —                                                  |
| `deletedAt`            | `DateTime?` timestamptz    | Soft delete.                                       |

`DocumentStatus` enum (spec §9.3):

| Value         | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| `ACTIVE`      | Normal state.                                                 |
| `ARCHIVED`    | Read-only, moved to cold storage.                             |
| `RECORD`      | Declared a record — retention locked, cannot be edited.       |
| `DELETED`     | Soft-deleted.                                                 |
| `PROCESSING`  | Upload in progress.                                           |
| `QUARANTINED` | Held for malware/forgery review.                              |

**Indexes** — `@@index([tenantId, status])`, `@@index([tenantId, classificationId])`,
`@@index([tenantId, createdByUserId])`, `@@index([tenantId, updatedAt])`,
`@@index([tenantId, isRecord])`, `@@index([tenantId, legalHoldActive])`.

**Relationships** — belongs to `Tenant`, `Folder`, `ClassificationLabel`,
`RetentionSchedule`, `User` (creator). Has many: `DocumentVersion`,
`MetadataValue`, `ShareLink`, `AuditEvent`, `WorkflowInstance`,
`DocumentComment`, `ProvenanceManifest`, `ScannerJob`, `LegalHold`
(many-to-many via `LegalHoldDocuments` relation).

**Spec ref** — §9.3, §15.1, §15.5 (immutability of versions).

---

#### 5.2.3 `DocumentVersion`

**Purpose** — immutable snapshot of a document's bytes at a point in
time. Each upload (including restore) creates a new version.

| Field                 | Type                       | Notes                                          |
| --------------------- | -------------------------- | ---------------------------------------------- |
| `id`                  | `String @id` UUID          | —                                              |
| `documentId`          | `String @db.Uuid`          | FK to `Document`.                              |
| `tenantId`            | `String @db.Uuid`          | —                                              |
| `versionNumber`       | `Int`                      | 1-based, unique per document.                  |
| `storageKey`          | `String @db.VarChar(512)`  | Object-storage key (S3-compatible).            |
| `sizeBytes`           | `BigInt`                   | —                                              |
| `checksumAlgorithm`   | `String @db.VarChar(16)`   | Default `sha256`.                              |
| `checksum`            | `String @db.VarChar(128)`  | Hex digest.                                    |
| `mime`                | `String @db.VarChar(128)`  | MIME type.                                     |
| `originalFilename`    | `String`                   | Upload-time filename.                          |
| `createdByUserId`     | `String? @db.Uuid`         | FK to `User` (null for system imports).        |
| `changeReason`        | `String?`                  | Free-text reason for the new version.          |
| `isImmutable`         | `Boolean`                  | Always `true`; field exists for explicitness.  |
| `encryptionKeyRef`    | `String? @db.VarChar(128)` | KMS key ref if encrypted at rest.              |
| `createdAt`           | `DateTime` timestamptz     | —                                              |

**Indexes** — `@@unique([documentId, versionNumber])`,
`@@index([tenantId, documentId])`, `@@index([tenantId, createdAt])`.

**Spec ref** — §9.3, §15.5 (immutability).

---

#### 5.2.4 `DocumentComment`

**Purpose** — inline comments on a document, optionally anchored to a
page/region.

| Field       | Type                   | Notes                              |
| ----------- | ---------------------- | ---------------------------------- |
| `id`        | `String @id` UUID      | —                                  |
| `documentId`| `String @db.Uuid`      | FK to `Document`.                  |
| `tenantId`  | `String @db.Uuid`      | —                                  |
| `userId`    | `String @db.Uuid`      | FK to `User`.                      |
| `body`      | `String @db.Text`      | Markdown.                          |
| `anchor`    | `String?`              | Opaque anchor (page + bbox).       |
| `resolved`  | `Boolean`              | —                                  |
| `createdAt` | `DateTime` timestamptz | —                                  |
| `updatedAt` | `DateTime` timestamptz | —                                  |

**Spec ref** — §9.3.

---

#### 5.2.5 `MetadataSchema` & `MetadataValue`

**Purpose** — tenant-defined metadata schemas applied to documents of
a given type. The schema's `fields` JSON defines the field codes,
types, and validation rules.

`MetadataSchema`:

| Field          | Type                   | Notes                                  |
| -------------- | ---------------------- | -------------------------------------- |
| `id`           | `String @id` UUID      | —                                      |
| `tenantId`     | `String @db.Uuid`      | —                                      |
| `code`         | `String @db.VarChar(64)`| Unique per tenant.                    |
| `name`         | `String`               | —                                      |
| `documentType` | `String? @db.VarChar(64)`| Applies to this document type only.  |
| `fields`       | `Json`                 | Array of field definitions.            |
| `isActive`     | `Boolean`              | —                                      |
| `createdAt`    | `DateTime` timestamptz | —                                      |
| `updatedAt`    | `DateTime` timestamptz | —                                      |

`MetadataValue`:

| Field        | Type                   | Notes                                |
| ------------ | ---------------------- | ------------------------------------ |
| `id`         | `String @id` UUID      | —                                    |
| `documentId` | `String @db.Uuid`      | FK to `Document`.                    |
| `tenantId`   | `String @db.Uuid`      | —                                    |
| `schemaId`   | `String? @db.Uuid`     | FK to `MetadataSchema` (optional).   |
| `fieldCode`  | `String @db.VarChar(64)`| —                                  |
| `value`      | `Json`                 | Typed value per schema.              |
| `createdAt`  | `DateTime` timestamptz | —                                    |
| `updatedAt`  | `DateTime` timestamptz | —                                    |

**Indexes** — `MetadataValue`: `@@unique([documentId, fieldCode])`,
`@@index([tenantId, fieldCode])`.

**Spec ref** — §9.3 (metadata), §9.10 (search uses metadata).

---

#### 5.2.6 `ClassificationLabel` & `ClassificationHistory`

**Purpose** — taxonomy of sensitivity labels. System labels
(`public`, `internal`, `confidential`, `restricted`) are seeded.

`ClassificationLabel`:

| Field              | Type                   | Notes                                       |
| ------------------ | ---------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID      | —                                           |
| `tenantId`         | `String @db.Uuid`      | —                                           |
| `code`             | `String @db.VarChar(64)`| Unique per tenant.                         |
| `nameKey`          | `String`               | i18n message key.                           |
| `descriptionKey`   | `String?`              | i18n message key.                           |
| `sensitivityLevel` | `Int`                  | 0..5.                                       |
| `color`            | `String? @db.VarChar(16)`| Hex color.                                |
| `bannerText`       | `String? @db.Text`     | Banner shown above classified content.      |
| `isSystem`         | `Boolean`              | Seeded; cannot delete.                      |
| `createdAt`        | `DateTime` timestamptz | —                                           |
| `updatedAt`        | `DateTime` timestamptz | —                                           |

`ClassificationHistory` (append-only):

| Field              | Type                   | Notes                                       |
| ------------------ | ---------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID      | —                                           |
| `documentId`       | `String @db.Uuid`      | FK to `Document`.                           |
| `tenantId`         | `String @db.Uuid`      | —                                           |
| `fromLabelId`      | `String? @db.Uuid`     | Previous label.                             |
| `toLabelId`        | `String? @db.Uuid`     | New label.                                  |
| `reason`           | `String?`              | Free-text reason.                           |
| `changedByUserId`  | `String @db.Uuid`      | FK to `User`.                               |
| `createdAt`        | `DateTime` timestamptz | —                                           |

**Indexes** — `ClassificationHistory`: `@@index([tenantId, documentId, createdAt])`.

**Spec ref** — §9.4, §15.5 (history is append-only).

---

### 5.3 Workflows

#### 5.3.1 `WorkflowDefinition`

**Purpose** — BPMN / CMMN / DMN workflow definition. Versioned; only
`PUBLISHED` definitions can be instantiated.

| Field              | Type                            | Notes                                     |
| ------------------ | ------------------------------- | ----------------------------------------- |
| `id`               | `String @id` UUID               | —                                         |
| `tenantId`         | `String @db.Uuid`               | —                                         |
| `code`             | `String @db.VarChar(64)`        | Unique per tenant+version.                |
| `name`             | `String`                        | —                                         |
| `description`      | `String?`                       | —                                         |
| `modelKind`        | `WorkflowModelKind` enum        | `BPMN` / `CMMN` / `DMN`.                  |
| `bpmnXml`          | `String? @db.Text`              | Raw BPMN 2.0 XML.                         |
| `dmnTableXml`      | `String? @db.Text`              | Raw DMN XML.                              |
| `cmmnXml`          | `String? @db.Text`              | Raw CMMN XML.                             |
| `definitionJson`   | `Json`                          | Normalized step graph.                    |
| `version`          | `Int`                           | Auto-incremented per code.                |
| `status`           | `WorkflowDefinitionStatus` enum | `DRAFT` / `PUBLISHED` / `ARCHIVED`.       |
| `isAiDraft`        | `Boolean`                       | AI-suggested; only visible to designers.  |
| `createdByUserId`  | `String @db.Uuid`               | FK to `User`.                             |
| `createdAt`        | `DateTime` timestamptz          | —                                         |
| `updatedAt`        | `DateTime` timestamptz          | —                                         |

**Indexes** — `@@unique([tenantId, code, version])`, `@@index([tenantId, status])`.

**Spec ref** — §9.8 (workflows).

---

#### 5.3.2 `WorkflowInstance`

**Purpose** — a running (or completed) instance of a published
definition. Optionally bound to a document.

| Field              | Type                       | Notes                                       |
| ------------------ | -------------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID          | —                                           |
| `definitionId`     | `String @db.Uuid`          | FK to `WorkflowDefinition`.                 |
| `documentId`       | `String? @db.Uuid`         | FK to `Document` (optional).                |
| `tenantId`         | `String @db.Uuid`          | —                                           |
| `status`           | `WorkflowStatus` enum      | see below.                                  |
| `context`          | `Json`                     | Instance variables.                         |
| `startedByUserId`  | `String @db.Uuid`          | FK to `User`.                               |
| `startedAt`        | `DateTime` timestamptz     | —                                           |
| `completedAt`      | `DateTime?` timestamptz    | —                                           |
| `dueAt`            | `DateTime?` timestamptz    | —                                           |
| `createdAt`        | `DateTime` timestamptz     | —                                           |
| `updatedAt`        | `DateTime` timestamptz     | —                                           |

`WorkflowStatus` enum (spec §9.8):

| Value       | Meaning                                            |
| ----------- | -------------------------------------------------- |
| `PENDING`   | Created but not started.                           |
| `RUNNING`   | Active.                                            |
| `APPROVED`  | All approvals granted.                             |
| `REJECTED`  | A required approval was rejected.                  |
| `CANCELLED` | Cancelled by user or admin.                        |
| `FAILED`    | Engine error.                                      |
| `COMPLETED` | Successfully finished.                             |

**Indexes** — `@@index([tenantId, status])`, `@@index([tenantId, documentId])`,
`@@index([tenantId, startedByUserId])`.

**Spec ref** — §9.8.

---

#### 5.3.3 `WorkflowStep` & `Approval`

`WorkflowStep`:

| Field         | Type                     | Notes                                        |
| ------------- | ------------------------ | -------------------------------------------- |
| `id`          | `String @id` UUID        | —                                            |
| `instanceId`  | `String @db.Uuid`        | FK to `WorkflowInstance`.                    |
| `tenantId`    | `String @db.Uuid`        | —                                            |
| `stepKey`     | `String @db.VarChar(64)` | Matches the step key in `definitionJson`.    |
| `name`        | `String`                 | Display name.                                |
| `status`      | `String @db.VarChar(32)` | `pending` / `running` / `completed` / etc.   |
| `assigneeId`  | `String? @db.Uuid`       | FK to `User`.                                |
| `delegateId`  | `String? @db.Uuid`       | FK to `User` (delegated assignee).           |
| `startedAt`   | `DateTime?` timestamptz  | —                                            |
| `completedAt` | `DateTime?` timestamptz  | —                                            |
| `dueAt`       | `DateTime?` timestamptz  | —                                            |
| `metadata`    | `Json?`                  | Step-specific data.                          |

`Approval`:

| Field         | Type                       | Notes                                       |
| ------------- | -------------------------- | ------------------------------------------- |
| `id`          | `String @id` UUID          | —                                           |
| `instanceId`  | `String @db.Uuid`          | FK to `WorkflowInstance`.                   |
| `tenantId`    | `String @db.Uuid`          | —                                           |
| `approverId`  | `String @db.Uuid`          | FK to `User`.                               |
| `decision`    | `ApprovalDecision?` enum   | `APPROVED` / `REJECTED` / `DELEGATED` / `ESCALATED`. |
| `comment`     | `String?`                  | —                                           |
| `signature`   | `String? @db.Text`         | E-signature payload (if applicable).        |
| `decidedAt`   | `DateTime?` timestamptz    | —                                           |
| `createdAt`   | `DateTime` timestamptz     | —                                           |

**Spec ref** — §9.8.

---

### 5.4 Retention

#### 5.4.1 `RetentionSchedule`

**Purpose** — defines how long documents of a given type are kept and
what happens at expiry.

| Field                | Type                   | Notes                                          |
| -------------------- | ---------------------- | ---------------------------------------------- |
| `id`                 | `String @id` UUID      | —                                              |
| `tenantId`           | `String @db.Uuid`      | —                                              |
| `code`               | `String @db.VarChar(64)`| Unique per tenant.                            |
| `name`               | `String`               | —                                              |
| `description`        | `String?`              | —                                              |
| `triggerKind`        | `String @db.VarChar(32)`| `createdAt` / `updatedAt` / `custom`.         |
| `triggerDateField`   | `String? @db.VarChar(64)`| When `triggerKind = custom`.                 |
| `retentionDays`      | `Int`                  | Duration.                                      |
| `dispositionAction`  | `String @db.VarChar(32)`| `delete` / `archive` / `review`.              |
| `isActive`           | `Boolean`              | —                                              |
| `createdAt`          | `DateTime` timestamptz | —                                              |
| `updatedAt`          | `DateTime` timestamptz | —                                              |

**Spec ref** — §9.7.

---

#### 5.4.2 `LegalHold`

**Purpose** — indefinite hold that blocks document destruction
regardless of retention schedule (spec §9.7, §15.5).

| Field              | Type                   | Notes                                       |
| ------------------ | ---------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID      | —                                           |
| `tenantId`         | `String @db.Uuid`      | —                                           |
| `code`             | `String @db.VarChar(64)`| Unique per tenant.                          |
| `name`             | `String`               | —                                           |
| `reason`           | `String @db.Text`      | Required.                                   |
| `caseReference`    | `String? @db.VarChar(128)`| External case ID.                        |
| `placedByUserId`   | `String @db.Uuid`      | FK to `User`.                               |
| `releasedByUserId` | `String? @db.Uuid`     | FK to `User`.                               |
| `releasedAt`       | `DateTime?` timestamptz| —                                           |
| `isActive`         | `Boolean`              | —                                           |
| `createdAt`        | `DateTime` timestamptz | —                                           |
| `updatedAt`        | `DateTime` timestamptz | —                                           |

**Relationships** — many-to-many with `Document` via the
`LegalHoldDocuments` relation (Prisma implicit m-n). Attaching a
document sets `Document.legalHoldActive = true`.

**Spec ref** — §9.7, §15.5 (blocks destructive deletion).

---

#### 5.4.3 `DispositionRecord`

**Purpose** — tracks the lifecycle of a disposition decision: scheduled,
approved, executed, or blocked by legal hold.

| Field                  | Type                       | Notes                                       |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `id`                   | `String @id` UUID          | —                                           |
| `tenantId`             | `String @db.Uuid`          | —                                           |
| `documentId`           | `String @db.Uuid`          | FK to `Document`.                           |
| `retentionScheduleId`  | `String @db.Uuid`          | FK to `RetentionSchedule`.                  |
| `legalHoldId`          | `String? @db.Uuid`         | FK to `LegalHold` (if blocked).             |
| `status`               | `DispositionStatus` enum   | see below.                                  |
| `scheduledAt`          | `DateTime` timestamptz     | —                                           |
| `approvedByUserId`     | `String? @db.Uuid`         | FK to `User`.                               |
| `approvedAt`           | `DateTime?` timestamptz    | —                                           |
| `executedAt`           | `DateTime?` timestamptz    | —                                           |
| `certificateKey`       | `String? @db.VarChar(512)` | Storage key for the disposition certificate.|
| `createdAt`            | `DateTime` timestamptz     | —                                           |
| `updatedAt`            | `DateTime` timestamptz     | —                                           |

`DispositionStatus` enum:

| Value                  | Meaning                                            |
| ---------------------- | -------------------------------------------------- |
| `PENDING`              | Scheduled, awaiting approval.                      |
| `APPROVED`             | Approved, awaiting execution.                      |
| `EXECUTED`             | Executed (delete/archive).                         |
| `CANCELLED`            | Cancelled by admin.                                |
| `BLOCKED_LEGAL_HOLD`   | Blocked by an active legal hold.                   |

**Spec ref** — §9.7.

---

### 5.5 Audit & Provenance

#### 5.5.1 `AuditEvent`

**Purpose** — append-only, hash-chained audit log. The single source
of truth for "who did what, when, and why" (spec §21.7, §15.5).

| Field              | Type                       | Notes                                              |
| ------------------ | -------------------------- | -------------------------------------------------- |
| `id`               | `String @id` UUID          | —                                                  |
| `tenantId`         | `String @db.Uuid`          | —                                                  |
| `userId`           | `String? @db.Uuid`         | FK to `User` (null for system events).             |
| `actorKind`        | `String @db.VarChar(32)`   | `user` / `service_account` / `system` / `ai_assistant` / `license_server`. |
| `category`         | `String @db.VarChar(64)`   | `auth` / `create` / `update` / `delete` / etc.    |
| `code`             | `String @db.VarChar(64)`   | Stable event code (e.g. `document.deleted`).       |
| `result`           | `String @db.VarChar(16)`   | `allow` / `deny`.                                  |
| `resourceType`     | `String? @db.VarChar(64)`  | —                                                  |
| `resourceId`       | `String? @db.Uuid`         | —                                                  |
| `documentId`       | `String? @db.Uuid`         | Convenience FK to `Document`.                      |
| `ipAddress`        | `String? @db.VarChar(64)`  | —                                                  |
| `userAgent`        | `String? @db.Text`         | —                                                  |
| `correlationId`    | `String? @db.VarChar(64)`  | `X-Request-Id` from the triggering request.        |
| `reason`           | `String? @db.Text`         | Free-text reason.                                  |
| `metadata`         | `Json?`                    | Structured, event-specific payload.                |
| `sequenceNumber`   | `BigInt`                   | Per-tenant monotonic counter.                      |
| `previousHash`     | `String? @db.VarChar(128)` | SHA-256 of prior event's canonical form.           |
| `eventHash`        | `String @db.VarChar(128)`  | SHA-256 of this event's canonical form.            |
| `occurredAt`       | `DateTime` timestamptz     | Immutable; no `updatedAt`.                         |

**Indexes** — `@@index([tenantId, occurredAt])`, `@@index([tenantId, code])`,
`@@index([tenantId, userId])`, `@@index([tenantId, resourceType, resourceId])`,
`@@index([tenantId, correlationId])`.

**Hash-chain construction** (spec §21.7):

```text
eventHash = sha256(`${previousHash}|${canonicalEvent}`)
```

Where `canonicalEvent` is the JSON canonicalization of the event
fields (excluding `eventHash` itself) using the
[JCS (JSON Canonicalization Scheme)](https://www.rfc-editor.org/rfc/rfc8785).
The test suite at
[`apps/backend/test/audit-hash-chain.test.ts`](../apps/backend/test/audit-hash-chain.test.ts)
verifies that:

1. A freshly-written chain verifies as intact.
2. Tampering with any field (e.g. `result`) breaks the chain at the
   next event.
3. Inserting a forged event mid-chain breaks the chain.

**Spec ref** — §9.9, §15.5 (immutability), §21.7, §27.3.

---

#### 5.5.2 `ProvenanceManifest`

**Purpose** — C2PA / chain-of-custody / forgery-detection manifests
attached to documents (spec §9.5).

| Field              | Type                       | Notes                                       |
| ------------------ | -------------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID          | —                                           |
| `documentId`       | `String @db.Uuid`          | FK to `Document`.                           |
| `tenantId`         | `String @db.Uuid`          | —                                           |
| `manifestKind`     | `String @db.VarChar(32)`   | `c2pa` / `chain_of_custody` / `forgery`.    |
| `c2paManifest`     | `Json?`                    | Parsed C2PA manifest.                       |
| `chainOfCustody`   | `Json?`                    | Array of custody-transfer events.           |
| `forgeryVerdict`   | `String? @db.VarChar(32)`  | `clean` / `suspicious` / `tampered`.        |
| `forgeryScore`     | `Float?`                   | 0..1 confidence.                            |
| `signedAt`         | `DateTime?` timestamptz    | When the manifest was signed.               |
| `createdAt`        | `DateTime` timestamptz     | —                                           |

**Spec ref** — §9.5 (provenance), §9.10 (forgery detection in search).

---

### 5.6 Sharing

#### 5.6.1 `ShareLink`

**Purpose** — time-limited, optionally password-protected share links
for external recipients (spec §9.5).

| Field              | Type                       | Notes                                       |
| ------------------ | -------------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID          | —                                           |
| `tenantId`         | `String @db.Uuid`          | —                                           |
| `documentId`       | `String @db.Uuid`          | FK to `Document`.                           |
| `createdByUserId`  | `String @db.Uuid`          | FK to `User`.                               |
| `token`            | `String @unique @db.VarChar(64)` | Opaque URL token.                    |
| `passwordHash`     | `String? @db.VarChar(128)` | Argon2id hash of optional password.         |
| `permission`       | `String @db.VarChar(32)`   | `view` / `comment` / `download`.            |
| `expiresAt`        | `DateTime?` timestamptz    | —                                           |
| `maxViews`         | `Int?`                     | —                                           |
| `viewCount`        | `Int`                      | —                                           |
| `isActive`         | `Boolean`                  | —                                           |
| `revokedAt`        | `DateTime?` timestamptz    | —                                           |
| `recipientEmail`   | `String? @db.VarChar(256)` | —                                           |
| `createdAt`        | `DateTime` timestamptz     | —                                           |
| `updatedAt`        | `DateTime` timestamptz     | —                                           |

**Spec ref** — §9.5.

---

### 5.7 Notifications

#### 5.7.1 `Notification`

**Purpose** — in-app notifications. Real-time delivery is via the
`notification.created` WebSocket event (see
[`WEBSOCKET_SPECIFICATION.md` §4.5](./WEBSOCKET_SPECIFICATION.md#45-notification-events)).

| Field          | Type                     | Notes                                       |
| -------------- | ------------------------ | ------------------------------------------- |
| `id`           | `String @id` UUID        | —                                           |
| `tenantId`     | `String @db.Uuid`        | —                                           |
| `userId`       | `String @db.Uuid`        | FK to `User` (recipient).                   |
| `channel`      | `String @db.VarChar(32)` | `in_app` / `email` / `sms` (planned).       |
| `severity`     | `String @db.VarChar(16)` | `info` / `warning` / `error` / `critical`.  |
| `titleKey`     | `String`                 | i18n message key.                           |
| `bodyKey`      | `String`                 | i18n message key.                           |
| `titleVars`    | `Json?`                  | Interpolation vars for `titleKey`.          |
| `bodyVars`     | `Json?`                  | Interpolation vars for `bodyKey`.           |
| `actionUrl`    | `String?`                | Deep-link URL.                              |
| `readAt`       | `DateTime?` timestamptz  | —                                           |
| `createdAt`    | `DateTime` timestamptz   | —                                           |

**Indexes** — `@@index([tenantId, userId, readAt])`, `@@index([tenantId, createdAt])`.

**Spec ref** — §9.6, §16 (i18n keys).

---

### 5.8 License local state

#### 5.8.1 `LicenseLocalState`

**Purpose** — the on-prem side of the licensing system. Stores the
signed `.sedmslic` payload, current state-machine state, and
heartbeat bookkeeping. Single row per deployment (keyed on
`deploymentId`).

| Field                  | Type                       | Notes                                       |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `id`                   | `String @id` UUID          | —                                           |
| `tenantId`             | `String @unique @db.Uuid`  | One per tenant.                             |
| `licenseId`            | `String? @db.Uuid`         | From the license payload (no FK — different DB). |
| `deploymentId`         | `String @unique @db.VarChar(128)` | Generated on first install.          |
| `environment`          | `String @db.VarChar(32)`   | `production` / `staging` / `development`.   |
| `state`                | `String @db.VarChar(32)`   | 6-state machine (see below).                |
| `kid`                  | `String? @db.VarChar(64)`  | Signing key ID.                             |
| `alg`                  | `String? @db.VarChar(16)`  | `EdDSA` / `ES256`.                          |
| `payloadJson`          | `Json?`                    | Parsed license payload.                     |
| `signature`            | `String? @db.Text`         | Raw signature.                              |
| `fingerprintHash`      | `String? @db.VarChar(128)` | SHA-256 of deployment fingerprint.          |
| `lastHeartbeatAt`      | `DateTime?` timestamptz    | —                                           |
| `heartbeatFailures`    | `Int`                      | Consecutive failure count.                  |
| `graceExhaustedAt`     | `DateTime?` timestamptz    | When grace period lapsed.                   |
| `importedAt`           | `DateTime?` timestamptz    | —                                           |
| `importedByUserId`     | `String? @db.Uuid`         | FK to `User`.                               |
| `createdAt`            | `DateTime` timestamptz     | —                                           |
| `updatedAt`            | `DateTime` timestamptz     | —                                           |

**State machine** (spec §4.4) — see [`API_SPECIFICATION.md` §1.6](./API_SPECIFICATION.md#16-license-enforcement).

**Spec ref** — §4.4, §12 (licensing system), §15.1.

---

### 5.9 Scanner

#### 5.9.1 `ScannerProfile` & `ScannerJob`

`ScannerProfile`:

| Field          | Type                   | Notes                                       |
| -------------- | ---------------------- | ------------------------------------------- |
| `id`           | `String @id` UUID      | —                                           |
| `tenantId`     | `String @db.Uuid`      | —                                           |
| `code`         | `String @db.VarChar(64)`| Unique per tenant.                          |
| `name`         | `String`               | —                                           |
| `driverKind`   | `String @db.VarChar(32)`| `upload` / `twain` / `sane` / `network`.    |
| `deviceId`     | `String? @db.VarChar(128)`| —                                        |
| `settings`     | `Json`                 | DPI, colorMode, duplex, paperSize, etc.     |
| `isActive`     | `Boolean`              | —                                           |
| `createdAt`    | `DateTime` timestamptz | —                                           |
| `updatedAt`    | `DateTime` timestamptz | —                                           |

`ScannerJob`:

| Field              | Type                       | Notes                                       |
| ------------------ | -------------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID          | —                                           |
| `tenantId`         | `String @db.Uuid`          | —                                           |
| `profileId`        | `String? @db.Uuid`         | FK to `ScannerProfile`.                     |
| `documentId`       | `String? @db.Uuid`         | FK to `Document` (output target).           |
| `status`           | `ScannerJobStatus` enum    | see below.                                  |
| `totalFiles`       | `Int`                      | —                                           |
| `processedFiles`   | `Int`                      | —                                           |
| `failedFiles`      | `Int`                      | —                                           |
| `ocrLanguage`      | `String? @db.VarChar(32)`  | Tesseract language codes.                   |
| `confidenceScore`  | `Float?`                   | OCR/OMR/ICR confidence (0..1).              |
| `errorMessage`     | `String? @db.Text`         | —                                           |
| `startedAt`        | `DateTime?` timestamptz    | —                                           |
| `completedAt`      | `DateTime?` timestamptz    | —                                           |
| `createdByUserId`  | `String @db.Uuid`          | FK to `User`.                               |
| `createdAt`        | `DateTime` timestamptz     | —                                           |
| `updatedAt`        | `DateTime` timestamptz     | —                                           |

`ScannerJobStatus` enum:

| Value        | Meaning                                            |
| ------------ | -------------------------------------------------- |
| `PENDING`    | Queued.                                            |
| `RUNNING`    | Worker picked up.                                  |
| `COMPLETED`  | All files processed.                               |
| `FAILED`     | Fatal error.                                       |
| `CANCELLED`  | User cancelled.                                    |
| `QUARANTINED`| Held for review (low OCR confidence, suspected forgery). |

**Spec ref** — §9.12 (digitization).

---

### 5.10 Tours

#### 5.10.1 `TourDefinition`

**Purpose** — a guided tour's definition. Steps live in `TourStep`.

| Field                  | Type                       | Notes                                       |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `id`                   | `String @id` UUID          | —                                           |
| `tenantId`             | `String @db.Uuid`          | —                                           |
| `code`                 | `String @db.VarChar(64)`   | Unique per tenant.                          |
| `module`               | `String @db.VarChar(64)`   | `welcome` / `documents` / `workflows` / etc.|
| `audience`             | `String[]`                 | Role codes; `["all"]` for everyone.         |
| `priority`             | `Int`                      | Lower = higher priority.                    |
| `version`              | `Int`                      | —                                           |
| `triggerType`          | `String @db.VarChar(32)`   | `on_login` / `on_first_visit` / `manual`.   |
| `enabled`              | `Boolean`                  | —                                           |
| `licenseModuleRequired`| `String? @db.VarChar(64)`  | Tour only shown if module enabled.          |
| `createdAt`            | `DateTime` timestamptz     | —                                           |
| `updatedAt`            | `DateTime` timestamptz     | —                                           |

**Spec ref** — §10 (guided tour).

---

#### 5.10.2 `TourStep`

| Field                  | Type                       | Notes                                       |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `id`                   | `String @id` UUID          | —                                           |
| `tourId`               | `String @id @db.Uuid`      | FK to `TourDefinition` (composite PK).      |
| `stepOrder`            | `Int`                      | 1-based.                                    |
| `targetSelector`       | `String @db.VarChar(128)`  | CSS selector for the target element.        |
| `titleKey`             | `String`                   | i18n key.                                   |
| `bodyKey`              | `String`                   | i18n key.                                   |
| `placement`            | `String @db.VarChar(16)`   | `auto` / `top` / `bottom` / `left` / `right`.|
| `requiresPermission`   | `String? @db.VarChar(128)` | Skip step if user lacks permission.         |
| `requiresLicenseModule`| `String? @db.VarChar(64)`  | Skip step if module not enabled.            |
| `actionType`           | `String? @db.VarChar(32)`  | `next` / `click` / `wait` / `external`.     |
| `waitForEvent`         | `String? @db.VarChar(64)`  | Wait for client event before enabling Next. |
| `enabled`              | `Boolean`                  | —                                           |

**Spec ref** — §10.

---

#### 5.10.3 `TourUserState`

**Purpose** — per-user progress through a tour.

| Field                | Type                       | Notes                                       |
| -------------------- | -------------------------- | ------------------------------------------- |
| `id`                 | `String @id` UUID          | —                                           |
| `tourId`             | `String @db.Uuid`          | FK to `TourDefinition`.                     |
| `userId`             | `String @db.Uuid`          | FK to `User`.                               |
| `tenantId`           | `String @db.Uuid`          | —                                           |
| `status`             | `TourUserStatus` enum      | see below.                                  |
| `currentStepId`      | `String? @db.Uuid`         | FK to `TourStep`.                           |
| `currentStepOrder`   | `Int`                      | —                                           |
| `startedAt`          | `DateTime?` timestamptz    | —                                           |
| `completedAt`        | `DateTime?` timestamptz    | —                                           |
| `skippedAt`          | `DateTime?` timestamptz    | —                                           |
| `doNotShowAgain`     | `Boolean`                  | —                                           |
| `createdAt`          | `DateTime` timestamptz     | —                                           |
| `updatedAt`          | `DateTime` timestamptz     | —                                           |

`TourUserStatus` enum:

| Value          | Meaning                                            |
| -------------- | -------------------------------------------------- |
| `NOT_STARTED`  | Default.                                           |
| `IN_PROGRESS`  | User started.                                      |
| `COMPLETED`    | User finished.                                     |
| `SKIPPED`      | User skipped.                                      |
| `DISMISSED`    | User dismissed + doNotShowAgain.                   |

**Spec ref** — §10.

---

### 5.11 AI Assistant

#### 5.11.1 `AssistantSettings`

**Purpose** — per-tenant AI assistant configuration. One row per
tenant.

| Field                       | Type           | Notes                                       |
| --------------------------- | -------------- | ------------------------------------------- |
| `id`                        | `String @id` UUID | —                                        |
| `tenantId`                  | `String @unique @db.Uuid` | One per tenant.                  |
| `enabled`                   | `Boolean`      | Master switch.                              |
| `allowedRoles`              | `String[]`     | Roles that can use the assistant.           |
| `allowedTools`              | `String[]`     | Tool names permitted.                       |
| `externalAiAllowed`         | `Boolean`      | Allow routing to external LLM provider.     |
| `localOnlyMode`             | `Boolean`      | Force local-only inference.                 |
| `modelProvider`             | `String? @db.VarChar(64)` | —                                 |
| `chatRetentionDays`         | `Int`          | —                                           |
| `showCitations`             | `Boolean`      | —                                           |
| `allowNavigationActions`    | `Boolean`      | Allow `ui-navigate` tool.                   |
| `allowSuggestedActions`     | `Boolean`      | —                                           |
| `requireDisclaimer`         | `Boolean`      | —                                           |
| `rateLimitPerMinute`        | `Int`          | —                                           |
| `usageQuotaPerDay`          | `Int`          | —                                           |
| `privacyNotice`             | `String? @db.Text` | —                                       |
| `createdAt`                 | `DateTime` timestamptz | —                                    |
| `updatedAt`                 | `DateTime` timestamptz | —                                    |

**Spec ref** — §11 (AI assistant), §27.7 (AI rules).

---

#### 5.11.2 `AssistantSession` & `AssistantMessage`

`AssistantSession`:

| Field          | Type                     | Notes                                       |
| -------------- | ------------------------ | ------------------------------------------- |
| `id`           | `String @id` UUID        | —                                           |
| `tenantId`     | `String @db.Uuid`        | —                                           |
| `userId`       | `String @db.Uuid`        | FK to `User`.                               |
| `locale`       | `String @db.VarChar(16)` | Session locale.                             |
| `status`       | `String @db.VarChar(16)` | `active` / `archived`.                      |
| `modelProvider`| `String? @db.VarChar(64)`| —                                           |
| `createdAt`    | `DateTime` timestamptz   | —                                           |
| `updatedAt`    | `DateTime` timestamptz   | —                                           |

`AssistantMessage`:

| Field              | Type                     | Notes                                       |
| ------------------ | ------------------------ | ------------------------------------------- |
| `id`               | `String @id` UUID        | —                                           |
| `sessionId`        | `String @db.Uuid`        | FK to `AssistantSession`.                   |
| `tenantId`         | `String @db.Uuid`        | —                                           |
| `userId`           | `String @db.Uuid`        | FK to `User`.                               |
| `role`             | `String @db.VarChar(16)` | `user` / `assistant` / `system`.            |
| `contentSummary`   | `String @db.Text`        | Truncated for list views.                   |
| `contentHash`      | `String @db.VarChar(128)`| SHA-256 of full content (PII not stored in clear). |
| `modelProvider`    | `String? @db.VarChar(64)`| —                                           |
| `citationsJson`    | `Json?`                  | Array of citation objects.                  |
| `suggestedActions` | `Json?`                  | Array of suggested-action objects.          |
| `disclaimerKey`    | `String?`                | i18n key for the displayed disclaimer.      |
| `createdAt`        | `DateTime` timestamptz   | —                                           |

**Indexes** — `AssistantMessage`: `@@index([tenantId, sessionId])`,
`@@index([tenantId, createdAt])`.

**Note on PII** — the full message content is NOT stored in the
database; only `contentSummary` (truncated to ~256 chars) and
`contentHash` (for tamper detection). The streaming chunks are
ephemeral — once the response completes, only the summary is
persisted. This is a privacy-by-design choice (spec §11.5, §27.7).

**Spec ref** — §11.

---

#### 5.11.3 `AssistantToolInvocation`

**Purpose** — audit record of each tool call made by the assistant.

| Field           | Type                     | Notes                                       |
| --------------- | ------------------------ | ------------------------------------------- |
| `id`            | `String @id` UUID        | —                                           |
| `messageId`     | `String @db.Uuid`        | FK to `AssistantMessage`.                   |
| `sessionId`     | `String @db.Uuid`        | —                                           |
| `tenantId`      | `String @db.Uuid`        | —                                           |
| `toolName`      | `String @db.VarChar(64)` | e.g. `documents-summary`.                   |
| `inputSummary`  | `String @db.Text`        | Truncated input.                            |
| `outputSummary` | `String @db.Text`        | Truncated output.                           |
| `status`        | `String @db.VarChar(16)` | `ok` / `error` / `denied`.                  |
| `authorized`    | `Boolean`                | Whether the user was authorized for the tool.|
| `occurredAt`    | `DateTime` timestamptz   | —                                           |

**Spec ref** — §11.4 (tools).

---

#### 5.11.4 `AssistantAction`

**Purpose** — suggested actions surfaced to the user. Destructive
actions require explicit confirmation via
`POST /v1/ai/assistant/actions/:id/confirm` (spec §11.4).

| Field                  | Type                       | Notes                                       |
| ---------------------- | -------------------------- | ------------------------------------------- |
| `id`                   | `String @id` UUID          | —                                           |
| `messageId`            | `String @db.Uuid`          | FK to `AssistantMessage`.                   |
| `sessionId`            | `String @db.Uuid`          | —                                           |
| `tenantId`             | `String @db.Uuid`          | —                                           |
| `actionType`           | `String @db.VarChar(32)`   | `navigate` / `create` / `update` / `delete`.|
| `targetType`           | `String @db.VarChar(32)`   | `document` / `workflow` / `tour` / etc.     |
| `targetId`             | `String? @db.Uuid`         | —                                           |
| `confirmationRequired` | `Boolean`                  | —                                           |
| `confirmedAt`          | `DateTime?` timestamptz    | —                                           |
| `executedAt`           | `DateTime?` timestamptz    | —                                           |
| `status`               | `String @db.VarChar(16)`   | `suggested` / `confirmed` / `executed` / `cancelled` / `blocked`. |

**Spec ref** — §11.4 (action confirmation), §27.7.

---

#### 5.11.5 `AssistantAuditEvent`

**Purpose** — separate audit log for AI-specific events (prompt
injection detected, action blocked, model fallback, etc.). Distinct
from the main `AuditEvent` table because AI events have different
retention and access policies (spec §11.6, §27.7).

| Field          | Type                     | Notes                                       |
| -------------- | ------------------------ | ------------------------------------------- |
| `id`           | `String @id` UUID        | —                                           |
| `tenantId`     | `String @db.Uuid`        | —                                           |
| `userId`       | `String @db.Uuid`        | FK to `User`.                               |
| `sessionId`    | `String? @db.Uuid`       | FK to `AssistantSession`.                   |
| `messageId`    | `String? @db.Uuid`       | FK to `AssistantMessage`.                   |
| `category`     | `String @db.VarChar(64)` | —                                           |
| `code`         | `String @db.VarChar(64)` | e.g. `ai.prompt_injection_detected`.         |
| `result`       | `String @db.VarChar(16)` | `allow` / `deny` / `block`.                 |
| `metadata`     | `Json?`                  | —                                           |
| `occurredAt`   | `DateTime` timestamptz   | —                                           |

**Spec ref** — §11.6 (AI audit), §21.7.

---

### 5.12 API Keys & Webhooks

#### 5.12.1 `ApiKey`

**Purpose** — tenant-scoped API keys for programmatic access to the
EDMS REST API. The plaintext is shown once at creation; only the hash
is stored.

| Field             | Type                     | Notes                                       |
| ----------------- | ------------------------ | ------------------------------------------- |
| `id`              | `String @id` UUID        | —                                           |
| `tenantId`        | `String @db.Uuid`        | —                                           |
| `name`            | `String`                 | —                                           |
| `keyHash`         | `String @unique @db.VarChar(128)` | SHA-256 of the plaintext key.       |
| `keyPrefix`       | `String @db.VarChar(16)` | First 8 chars; shown in UI for identification.|
| `scopes`          | `String[]`               | Permission scopes.                          |
| `lastUsedAt`      | `DateTime?` timestamptz  | —                                           |
| `expiresAt`       | `DateTime?` timestamptz  | —                                           |
| `isActive`        | `Boolean`                | —                                           |
| `createdByUserId` | `String @db.Uuid`        | FK to `User`.                               |
| `createdAt`       | `DateTime` timestamptz   | —                                           |
| `updatedAt`       | `DateTime` timestamptz   | —                                           |

**Spec ref** — §14 (API contract), §21.4 (auth).

---

#### 5.12.2 `Webhook`

**Purpose** — tenant-configured outbound webhooks for EDMS events
(document created, workflow completed, etc.). Distinct from the
licensing-server webhooks (see §6.9).

| Field                | Type                     | Notes                                       |
| -------------------- | ------------------------ | ------------------------------------------- |
| `id`                 | `String @id` UUID        | —                                           |
| `tenantId`           | `String @db.Uuid`        | —                                           |
| `url`                | `String`                 | HTTPS URL.                                  |
| `secretHash`         | `String? @db.VarChar(128)` | HMAC secret hash.                         |
| `events`             | `String[]`               | Subscribed event codes.                     |
| `isActive`           | `Boolean`                | —                                           |
| `lastDeliveryAt`     | `DateTime?` timestamptz  | —                                           |
| `lastDeliveryStatus` | `String? @db.VarChar(16)`| `success` / `retrying` / `failed`.          |
| `createdAt`          | `DateTime` timestamptz   | —                                           |
| `updatedAt`          | `DateTime` timestamptz   | —                                           |

**Spec ref** — §14 (webhooks).

---

### 5.13 Jobs

#### 5.13.1 `Job`

**Purpose** — durable record of BullMQ jobs (audit exports, bulk
imports, search reindex, etc.). Used for the admin jobs dashboard
and for retry tracking.

| Field          | Type                     | Notes                                       |
| -------------- | ------------------------ | ------------------------------------------- |
| `id`           | `String @id` UUID        | —                                           |
| `tenantId`     | `String @db.Uuid`        | —                                           |
| `kind`         | `String @db.VarChar(64)` | e.g. `audit.export`, `search.reindex`.      |
| `status`       | `String @db.VarChar(16)` | `queued` / `running` / `completed` / `failed` / `cancelled`. |
| `payload`      | `Json`                   | Job input.                                  |
| `result`       | `Json?`                  | Job output (on success).                    |
| `errorMessage` | `String? @db.Text`       | —                                           |
| `attempts`     | `Int`                    | —                                           |
| `maxAttempts`  | `Int`                    | Default 3.                                  |
| `scheduledAt`  | `DateTime` timestamptz   | —                                           |
| `startedAt`    | `DateTime?` timestamptz  | —                                           |
| `completedAt`  | `DateTime?` timestamptz  | —                                           |
| `createdAt`    | `DateTime` timestamptz   | —                                           |
| `updatedAt`    | `DateTime` timestamptz   | —                                           |

**Spec ref** — §9.13 (admin), §22 (operations).

---

### 5.14 Locale Resources

#### 5.14.1 `LocaleResource`

**Purpose** — per-tenant overrides of the bundled i18n catalog. The
base catalog lives in
[`packages/i18n/resources/<locale>/`](../packages/i18n/resources/);
this table stores only the diffs.

| Field        | Type                     | Notes                                       |
| ------------ | ------------------------ | ------------------------------------------- |
| `id`         | `String @id` UUID        | —                                           |
| `tenantId`   | `String @db.Uuid`        | —                                           |
| `locale`     | `String @db.VarChar(16)` | —                                           |
| `namespace`  | `String @db.VarChar(64)` | e.g. `documents`, `audit`.                  |
| `key`        | `String @db.VarChar(128)`| —                                           |
| `value`      | `String @db.Text`        | Override value.                             |
| `isOverride` | `Boolean`                | Always `true` for rows in this table.       |
| `createdAt`  | `DateTime` timestamptz   | —                                           |
| `updatedAt`  | `DateTime` timestamptz   | —                                           |

**Indexes** — `@@unique([tenantId, locale, namespace, key])`,
`@@index([tenantId, locale])`.

**Spec ref** — §16 (i18n).

---

### 5.15 Saved Searches

#### 5.15.1 `SavedSearch`

**Purpose** — user-saved search queries with optional alert
subscription (spec §9.10).

| Field             | Type                     | Notes                                       |
| ----------------- | ------------------------ | ------------------------------------------- |
| `id`              | `String @id` UUID        | —                                           |
| `tenantId`        | `String @db.Uuid`        | —                                           |
| `ownerUserId`     | `String @db.Uuid`        | FK to `User`.                               |
| `name`            | `String @db.VarChar(200)`| —                                           |
| `query`           | `Json`                   | `SearchQuery` shape.                        |
| `alertEnabled`    | `Boolean`                | —                                           |
| `alertInterval`   | `String? @db.VarChar(16)`| `hourly` / `daily` / `weekly`.              |
| `lastNotifiedAt`  | `DateTime?` timestamptz  | —                                           |
| `createdAt`       | `DateTime` timestamptz   | —                                           |
| `updatedAt`       | `DateTime` timestamptz   | —                                           |

**Spec ref** — §9.10 (search).

---

## 6. Licensing server entities (separate database, §15.2)

The licensing server has its own PostgreSQL database (or its own
schema in a shared cluster). All tables are prefixed with `lic_` to
keep them visually distinct from any other service that might share
the cluster. The full schema is at
[`apps/license-server/prisma/schema.prisma`](../apps/license-server/prisma/schema.prisma).

### 6.1 Customer & Contact

#### 6.1.1 `Customer`

**Purpose** — the vendor's customer organization. One customer can
have many licenses, trials, webhooks, and API keys.

| Field        | Type                   | Notes                                       |
| ------------ | ---------------------- | ------------------------------------------- |
| `id`         | `String @id` UUID      | —                                           |
| `name`       | `String`               | —                                           |
| `email`      | `String @unique`       | Primary contact email.                      |
| `industry`   | `String? @db.VarChar(128)` | —                                       |
| `website`    | `String? @db.VarChar(512)` | —                                       |
| `status`     | `String @db.VarChar(32)`| `active` / `suspended` / `deleted`.        |
| `metadata`   | `Json?`                | Free-form (CRM ID, region, etc.).           |
| `createdAt`  | `DateTime` timestamptz | —                                           |
| `updatedAt`  | `DateTime` timestamptz | —                                           |
| `deletedAt`  | `DateTime?` timestamptz| Soft delete.                                |

**Spec ref** — §12.1, §15.2.

---

#### 6.1.2 `Contact`

| Field        | Type                   | Notes                              |
| ------------ | ---------------------- | ---------------------------------- |
| `id`         | `String @id` UUID      | —                                  |
| `customerId` | `String @db.Uuid`      | FK to `Customer`.                  |
| `name`       | `String`               | —                                  |
| `email`      | `String`               | —                                  |
| `role`       | `String? @db.VarChar(128)` | —                              |
| `isPrimary`  | `Boolean`              | —                                  |
| `phone`      | `String? @db.VarChar(64)` | —                               |
| `createdAt`  | `DateTime` timestamptz | —                                  |
| `updatedAt`  | `DateTime` timestamptz | —                                  |

**Spec ref** — §12.1.

---

### 6.2 Product & Plan

#### 6.2.1 `Product`

| Field             | Type                   | Notes                              |
| ----------------- | ---------------------- | ---------------------------------- |
| `id`              | `String @id` UUID      | —                                  |
| `code`            | `String @unique @db.VarChar(64)` | e.g. `smart-edms`.    |
| `name`            | `String`               | —                                  |
| `description`     | `String?`              | —                                  |
| `currentVersion`  | `String @db.VarChar(64)` | —                                |
| `createdAt`       | `DateTime` timestamptz | —                                  |
| `updatedAt`       | `DateTime` timestamptz | —                                  |
| `deletedAt`       | `DateTime?` timestamptz| Soft delete.                       |

**Spec ref** — §12.1.

---

#### 6.2.2 `Plan`

| Field        | Type                   | Notes                                       |
| ------------ | ---------------------- | ------------------------------------------- |
| `id`         | `String @id` UUID      | —                                           |
| `productId`  | `String @db.Uuid`      | FK to `Product`.                            |
| `code`       | `String @unique @db.VarChar(64)` | e.g. `business`.                |
| `name`       | `String`               | —                                           |
| `description`| `String?`              | —                                           |
| `features`   | `Json`                 | Default feature flags (array).              |
| `limits`     | `Json`                 | Default numeric limits.                     |
| `createdAt`  | `DateTime` timestamptz | —                                           |
| `updatedAt`  | `DateTime` timestamptz | —                                           |

**Spec ref** — §12.1.

---

### 6.3 License, Feature, Limit

#### 6.3.1 `License`

**Purpose** — the central entity. A license is issued, signed,
activated, and optionally revoked. The signed `.sedmslic` artifact
is generated from this row + its `LicenseFeature` and `LicenseLimit`
children.

| Field                    | Type                          | Notes                                       |
| ------------------------ | ----------------------------- | ------------------------------------------- |
| `id`                     | `String @id` UUID             | —                                           |
| `customerId`             | `String @db.Uuid`             | FK to `Customer`.                           |
| `productId`              | `String @db.Uuid`             | FK to `Product`.                            |
| `planId`                 | `String @db.Uuid`             | FK to `Plan`.                               |
| `code`                   | `String @unique @db.VarChar(128)` | Human-readable (e.g. `SEDMS-PRO-2025-000123`). |
| `activationCodeHash`     | `String @db.VarChar(128)`     | Argon2id hash.                              |
| `activationCodePrefix`   | `String @db.VarChar(16)`      | First 8 chars (for UI).                     |
| `status`                 | `String @db.VarChar(32)`      | `pending_activation` / `active` / `suspended` / `revoked` / `expired`. |
| `type`                   | `String @db.VarChar(32)`      | `trial` / `subscription` / `perpetual` / `enterprise` / `evaluation` / `partner`. |
| `environment`            | `String @db.VarChar(16)`      | `production` / `staging` / `development`.   |
| `signingKeyId`           | `String @db.Uuid`             | FK to `SigningKey`.                         |
| `version`                | `Int`                         | Payload version (bumped on entitlement change). |
| `startDate`              | `DateTime` timestamptz        | —                                           |
| `endDate`                | `DateTime?` timestamptz       | —                                           |
| `gracePeriodDays`        | `Int`                         | Default 7.                                  |
| `maxUsers`               | `Int?`                        | Denormalized from plan.                     |
| `maxDevices`             | `Int?`                        | —                                           |
| `maxStorageBytes`        | `BigInt?`                     | —                                           |
| `maxDocuments`           | `Int?`                        | —                                           |
| `aiUsageAllowance`       | `Int?`                        | Monthly AI call allowance.                  |
| `enabledModules`         | `String[]`                    | —                                           |
| `enabledIntegrations`    | `String[]`                    | —                                           |
| `featuresJson`           | `Json`                        | Denormalized feature flags.                 |
| `limitsJson`             | `Json`                        | Denormalized limits.                        |
| `offlineMode`            | `Boolean`                     | —                                           |
| `hybridSync`             | `Boolean`                     | —                                           |
| `supportLevel`           | `String @db.VarChar(32)`      | `standard` / `premium` / `enterprise`.      |
| `renewalCounter`         | `Int`                         | Monotonic; bumped on each renewal.          |
| `createdAt`              | `DateTime` timestamptz        | —                                           |
| `updatedAt`              | `DateTime` timestamptz        | —                                           |
| `revokedAt`              | `DateTime?` timestamptz       | —                                           |

**Indexes** — `@@index([customerId])`, `@@index([productId])`,
`@@index([status])`, `@@index([code])`.

**Spec ref** — §12.5 (license payload), §15.2.

---

#### 6.3.2 `LicenseFeature` & `LicenseLimit`

`LicenseFeature`:

| Field       | Type                   | Notes                                       |
| ----------- | ---------------------- | ------------------------------------------- |
| `id`        | `String @id` UUID      | —                                           |
| `licenseId` | `String @db.Uuid`      | FK to `License`.                            |
| `code`      | `String @db.VarChar(64)`| e.g. `ai-citations`.                       |
| `enabled`   | `Boolean`              | —                                           |
| `limits`    | `Json?`                | Per-feature limits.                         |
| `createdAt` | `DateTime` timestamptz | —                                           |

`LicenseLimit`:

| Field       | Type                   | Notes                                       |
| ----------- | ---------------------- | ------------------------------------------- |
| `id`        | `String @id` UUID      | —                                           |
| `licenseId` | `String @db.Uuid`      | FK to `License`.                            |
| `code`      | `String @db.VarChar(64)`| e.g. `maxUsers`, `maxStorageBytes`.        |
| `value`     | `Int`                  | Numeric limit value.                        |
| `createdAt` | `DateTime` timestamptz | —                                           |

**Spec ref** — §12.5.

---

### 6.4 Signing Keys

#### 6.4.1 `SigningKey`

**Purpose** — public metadata for the license-signing keypair. The
PRIVATE KEY IS NEVER STORED IN THE DATABASE (spec §12.4, §27.3).

| Field          | Type                   | Notes                                       |
| -------------- | ---------------------- | ------------------------------------------- |
| `id`           | `String @id` UUID      | —                                           |
| `kid`          | `String @unique @db.VarChar(64)` | Key ID embedded in signed artifacts.|
| `alg`          | `String @db.VarChar(32)`| `EdDSA` / `ES256`.                         |
| `publicKeyPem` | `String @db.Text`      | SPKI PEM form.                              |
| `kmsKeyId`     | `String? @db.VarChar(512)` | KMS/HSM key ID (when not on disk).      |
| `status`       | `String @db.VarChar(16)`| `active` / `rotating` / `retired` / `revoked`. |
| `createdAt`    | `DateTime` timestamptz | —                                           |
| `rotatedAt`    | `DateTime?` timestamptz| —                                           |
| `retiredAt`    | `DateTime?` timestamptz| —                                           |

The private key is loaded at startup from
`LICENSE_SIGNING_KEY_PATH` (a file with `chmod 600`) or referenced
via `kmsKeyId` for KMS/HSM deployments. See
[`apps/license-server/src/modules/signing-key/signing-key.service.ts`](../apps/license-server/src/modules/signing-key/signing-key.service.ts).

**Spec ref** — §12.4, §27.3.

---

### 6.5 Activation & Device

#### 6.5.1 `Activation`

**Purpose** — records each activation of a license against a
deployment. Multiple activations against the same license but
different `deploymentId`s are allowed up to `License.maxDevices`.

| Field                | Type                   | Notes                                       |
| -------------------- | ---------------------- | ------------------------------------------- |
| `id`                 | `String @id` UUID      | —                                           |
| `licenseId`          | `String @db.Uuid`      | FK to `License`.                            |
| `deploymentId`       | `String @db.Uuid`      | From the on-prem backend.                   |
| `fingerprintHash`    | `String @db.VarChar(128)` | SHA-256 of the deployment fingerprint.   |
| `appVersion`         | `String @db.VarChar(64)` | —                                         |
| `environment`        | `String @db.VarChar(16)`| —                                          |
| `ipAddress`          | `String? @db.VarChar(64)`| —                                         |
| `status`             | `String @db.VarChar(16)`| `pending` / `active` / `suspended` / `revoked` / `expired`. |
| `firstActivatedAt`   | `DateTime` timestamptz | —                                           |
| `lastHeartbeatAt`    | `DateTime?` timestamptz| —                                           |
| `deactivatedAt`      | `DateTime?` timestamptz| —                                           |
| `createdAt`          | `DateTime` timestamptz | —                                           |
| `updatedAt`          | `DateTime` timestamptz | —                                           |

**Indexes** — `@@index([licenseId])`, `@@index([deploymentId])`,
`@@index([fingerprintHash])`, `@@unique([licenseId, deploymentId])`.

**Spec ref** — §12.7 (online activation).

---

#### 6.5.2 `Device`

**Purpose** — individual devices (hostnames / fingerprints) under an
activation. Used for max-device enforcement.

| Field            | Type                   | Notes                              |
| ---------------- | ---------------------- | ---------------------------------- |
| `id`             | `String @id` UUID      | —                                  |
| `activationId`   | `String @db.Uuid`      | FK to `Activation`.                |
| `licenseId`      | `String @db.Uuid`      | FK to `License`.                   |
| `fingerprintHash`| `String @db.VarChar(128)`| —                                |
| `hostname`       | `String? @db.VarChar(256)`| —                               |
| `os`             | `String @db.VarChar(64)`| —                                 |
| `arch`           | `String @db.VarChar(64)`| —                                 |
| `appVersion`     | `String @db.VarChar(64)`| —                                 |
| `firstSeenAt`    | `DateTime` timestamptz | —                                  |
| `lastSeenAt`     | `DateTime` timestamptz | —                                  |
| `revokedAt`      | `DateTime?` timestamptz| —                                  |

**Spec ref** — §12.7.

---

### 6.6 Heartbeat & Usage

#### 6.6.1 `Heartbeat`

**Purpose** — append-only log of every heartbeat received from an
on-prem deployment (spec §12.9). Used for the admin panel's
"heartbeat history" view and for grace-period calculation.

| Field                | Type                   | Notes                                       |
| -------------------- | ---------------------- | ------------------------------------------- |
| `id`                 | `String @id` UUID      | —                                           |
| `activationId`       | `String @db.Uuid`      | FK to `Activation`.                         |
| `licenseId`          | `String @db.Uuid`      | FK to `License`.                            |
| `receivedAt`         | `DateTime` timestamptz | —                                           |
| `status`             | `String @db.VarChar(16)`| `healthy` / `degraded` / `offline_grace` / `revoked` / `unknown`. |
| `appVersion`         | `String @db.VarChar(64)`| —                                         |
| `fingerprintHash`    | `String @db.VarChar(128)`| —                                        |
| `usageSummary`       | `Json`                 | Snapshot of usage metrics.                  |
| `responseSignature`  | `String? @db.Text`     | Signature of the response sent back.        |
| `createdAt`          | `DateTime` timestamptz | —                                           |

**Spec ref** — §12.9.

---

#### 6.6.2 `UsageMetric`

**Purpose** — time-series of usage metrics (users, storage,
documents, AI calls) for capacity planning and quota enforcement.

| Field         | Type                   | Notes                                       |
| ------------- | ---------------------- | ------------------------------------------- |
| `id`          | `String @id` UUID      | —                                           |
| `licenseId`   | `String @db.Uuid`      | FK to `License`.                            |
| `activationId`| `String @db.Uuid`      | FK to `Activation`.                         |
| `metric`      | `String @db.VarChar(32)`| `users` / `storage` / `documents` / `ai_calls`. |
| `value`       | `BigInt`               | —                                           |
| `recordedAt`  | `DateTime` timestamptz | —                                           |

**Spec ref** — §12.9.

---

### 6.7 Revocation

#### 6.7.1 `Revocation`

**Purpose** — records each license/device revocation. Drives the CRL
(Certificate Revocation List) that on-prem backends fetch
periodically.

| Field                | Type                   | Notes                                       |
| -------------------- | ---------------------- | ------------------------------------------- |
| `id`                 | `String @id` UUID      | —                                           |
| `licenseId`          | `String @db.Uuid`      | FK to `License`.                            |
| `reason`             | `String @db.Text`      | —                                           |
| `revokedByAdminId`   | `String? @db.Uuid`     | FK to `AdminUser`.                          |
| `revokedAt`          | `DateTime` timestamptz | —                                           |
| `crlVersion`         | `Int`                  | Sequential CRL version.                     |
| `propagated`         | `Boolean`              | Whether the CRL containing this revocation has been served. |
| `signingKeyId`       | `String @db.Uuid`      | FK to `SigningKey`.                         |
| `fingerprint`        | `String? @db.VarChar(128)` | Optional device fingerprint revocation. |
| `createdAt`          | `DateTime` timestamptz | —                                           |

**Spec ref** — §12.4 (CRL).

---

### 6.8 Trials

#### 6.8.1 `Trial`

**Purpose** — time-limited evaluation licenses (spec §12.10).

| Field                    | Type                   | Notes                                       |
| ------------------------ | ---------------------- | ------------------------------------------- |
| `id`                     | `String @id` UUID      | —                                           |
| `customerId`             | `String @db.Uuid`      | FK to `Customer`.                           |
| `productId`              | `String @db.Uuid`      | FK to `Product`.                            |
| `contactEmail`           | `String @db.VarChar(254)`| —                                         |
| `activationCode`         | `String @unique @db.VarChar(128)`| Single-use plaintext (kept for admin lookup).|
| `activationCodeHash`     | `String @db.VarChar(128)`| Hash for verification.                    |
| `startDate`              | `DateTime` timestamptz | —                                           |
| `endDate`                | `DateTime` timestamptz | —                                           |
| `maxDurationDays`        | `Int`                  | Default 14.                                 |
| `status`                 | `String @db.VarChar(16)`| `pending` / `active` / `expired` / `converted` / `cancelled`. |
| `convertedToLicenseId`   | `String? @db.Uuid`     | FK to `License` (when converted).           |
| `featureLimits`          | `Json`                 | Trial-specific limits.                      |
| `createdAt`              | `DateTime` timestamptz | —                                           |
| `updatedAt`              | `DateTime` timestamptz | —                                           |

**Spec ref** — §12.10.

---

### 6.9 Webhooks

#### 6.9.1 `Webhook` & `WebhookDelivery`

`Webhook`:

| Field                  | Type                   | Notes                                       |
| ---------------------- | ---------------------- | ------------------------------------------- |
| `id`                   | `String @id` UUID      | —                                           |
| `customerId`           | `String @db.Uuid`      | FK to `Customer`.                           |
| `url`                  | `String @db.VarChar(2048)`| HTTPS URL.                              |
| `secretHash`           | `String @db.VarChar(128)`| HMAC secret hash.                        |
| `events`               | `String[]`             | Subscribed event codes.                     |
| `isActive`             | `Boolean`              | —                                           |
| `lastDeliveryAt`       | `DateTime?` timestamptz| —                                           |
| `lastDeliveryStatus`   | `String? @db.VarChar(32)`| `success` / `retrying` / `failed`.       |
| `lastDeliveryCode`     | `Int?`                 | HTTP status code of last delivery.          |
| `createdAt`            | `DateTime` timestamptz | —                                           |
| `updatedAt`            | `DateTime` timestamptz | —                                           |

`WebhookDelivery`:

| Field              | Type                   | Notes                                       |
| ------------------ | ---------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID      | —                                           |
| `webhookId`        | `String @db.Uuid`      | FK to `Webhook`.                            |
| `event`            | `String @db.VarChar(64)`| Event code.                                |
| `payload`          | `Json`                 | Delivered payload.                          |
| `attempts`         | `Json`                 | Array of attempt records.                   |
| `status`           | `String @db.VarChar(16)`| `pending` / `delivered` / `retrying` / `dead_lettered`. |
| `attemptsCount`    | `Int`                  | —                                           |
| `nextRetryAt`      | `DateTime?` timestamptz| —                                           |
| `finalStatusCode`  | `Int?`                 | —                                           |
| `finalError`       | `String? @db.Text`     | —                                           |
| `createdAt`        | `DateTime` timestamptz | —                                           |
| `updatedAt`        | `DateTime` timestamptz | —                                           |

**Spec ref** — §12 (webhook events).

---

### 6.10 API Keys

#### 6.10.1 `ApiKey`

**Purpose** — customer-scoped API keys for machine-to-machine
activation/heartbeat calls. Different from the EDMS backend's
`ApiKey` table (§5.12.1) — these are for the licensing-server API.

| Field         | Type                   | Notes                                       |
| ------------- | ---------------------- | ------------------------------------------- |
| `id`          | `String @id` UUID      | —                                           |
| `customerId`  | `String @db.Uuid`      | FK to `Customer`.                           |
| `name`        | `String @db.VarChar(128)`| —                                         |
| `keyHash`     | `String @unique @db.VarChar(128)`| SHA-256 of plaintext.            |
| `keyPrefix`   | `String @db.VarChar(16)`| First 8 chars.                             |
| `scopes`      | `String[]`             | e.g. `["activation:online", "heartbeat:write"]`. |
| `isActive`    | `Boolean`              | —                                           |
| `lastUsedAt`  | `DateTime?` timestamptz| —                                           |
| `expiresAt`   | `DateTime?` timestamptz| —                                           |
| `revokedAt`   | `DateTime?` timestamptz| —                                           |
| `createdAt`   | `DateTime` timestamptz | —                                           |

**Spec ref** — §12 (licensing system), §21.4 (auth).

---

### 6.11 Audit Log

#### 6.11.1 `LicenseAuditLog`

**Purpose** — the licensing server's own append-only, hash-chained
audit log. Distinct from the on-prem `AuditEvent` because it's a
separate service (spec §21.7, §15.2).

| Field             | Type                   | Notes                                       |
| ----------------- | ---------------------- | ------------------------------------------- |
| `id`              | `String @id` UUID      | —                                           |
| `adminId`         | `String? @db.VarChar(128)`| Admin user ID or `system`.              |
| `action`          | `String @db.VarChar(64)`| e.g. `customer.create`, `license.issue`, `license.revoke`. |
| `target`          | `String? @db.VarChar(256)`| Resource ID (no FK — any entity type).  |
| `metadata`        | `Json`                 | —                                           |
| `ipAddress`       | `String? @db.VarChar(64)`| —                                         |
| `userAgent`       | `String? @db.VarChar(512)`| —                                        |
| `occurredAt`      | `DateTime` timestamptz | —                                           |
| `sequenceNumber`  | `Int`                  | Global monotonic counter.                   |
| `previousHash`    | `String? @db.VarChar(64)`| —                                         |
| `eventHash`       | `String @db.VarChar(64)`| —                                         |
| `customerId`      | `String? @db.Uuid`     | FK to `Customer` (optional).                |

**Spec ref** — §12.1, §21.7, §24.2 (compliance).

---

### 6.12 Offline Activation

#### 6.12.1 `OfflineActivationRequest` & `OfflineActivationCertificate`

`OfflineActivationRequest`:

| Field                    | Type                   | Notes                                       |
| ------------------------ | ---------------------- | ------------------------------------------- |
| `id`                     | `String @id` UUID      | —                                           |
| `requestId`              | `String @unique @db.Uuid`| Embedded in the `.sedmsreq` file.        |
| `productId`              | `String @db.Uuid`      | FK to `Product`.                            |
| `deploymentId`           | `String @db.Uuid`      | From on-prem.                               |
| `appVersion`             | `String @db.VarChar(64)`| —                                         |
| `machineFingerprint`    | `Json`                 | Hardware fingerprint.                       |
| `installationPublicKey`  | `String @db.Text`      | Public key generated on-prem.               |
| `os`                     | `String @db.VarChar(64)`| —                                         |
| `arch`                   | `String @db.VarChar(64)`| —                                         |
| `contactEmail`           | `String? @db.VarChar(254)`| —                                       |
| `nonceHash`              | `String @unique @db.VarChar(64)`| SHA-256 of single-use nonce.      |
| `rawContent`             | `String @db.Text`      | Raw `.sedmsreq` file content.               |
| `status`                 | `String @db.VarChar(16)`| `pending` / `fulfilled` / `rejected` / `expired`. |
| `reviewedByAdminId`      | `String? @db.Uuid`     | FK to `AdminUser`.                          |
| `reviewedAt`             | `DateTime?` timestamptz| —                                           |
| `reviewNotes`            | `String? @db.Text`     | —                                           |
| `fulfilledLicenseId`     | `String? @db.Uuid`     | FK to `License`.                            |
| `fulfilledArtifact`      | `String? @db.Text`     | Raw `.sedmslic` content.                    |
| `fulfilledAt`            | `DateTime?` timestamptz| —                                           |
| `createdAt`              | `DateTime` timestamptz | —                                           |

`OfflineActivationCertificate`:

| Field              | Type                   | Notes                                       |
| ------------------ | ---------------------- | ------------------------------------------- |
| `id`               | `String @id` UUID      | —                                           |
| `requestId`        | `String @unique @db.Uuid`| —                                         |
| `offlineRequestId` | `String @unique @db.Uuid`| FK to `OfflineActivationRequest`.        |
| `licenseId`        | `String @db.Uuid`      | FK to `License`.                            |
| `signingKeyId`     | `String @db.Uuid`      | FK to `SigningKey`.                         |
| `artifactContent`  | `String @db.Text`      | Signed `.sedmslic` content.                 |
| `signedAt`         | `DateTime` timestamptz | —                                           |
| `signedByAdminId`  | `String? @db.Uuid`     | FK to `AdminUser`.                          |
| `downloadedAt`     | `DateTime?` timestamptz| —                                           |

**Spec ref** — §12.6 (offline request), §12.8 (offline issue).

---

### 6.13 Admin Users

#### 6.13.1 `AdminUser`

**Purpose** — login accounts for the License Admin Panel (spec
§12.10). MFA is required; the panel refuses to load without a valid
admin JWT.

| Field                | Type                   | Notes                                       |
| -------------------- | ---------------------- | ------------------------------------------- |
| `id`                 | `String @id` UUID      | —                                           |
| `email`              | `String @unique`       | —                                           |
| `firstName`          | `String`               | —                                           |
| `lastName`           | `String`               | —                                           |
| `passwordHash`       | `String?`              | Argon2id.                                   |
| `roles`              | `String[]`             | `super_admin` / `admin` / `support` / `read_only`. |
| `isActive`           | `Boolean`              | —                                           |
| `mfaSecret`          | `String? @db.VarChar(64)`| TOTP secret (encrypted).                  |
| `mfaBackupCodes`     | `String[]`             | Hashed.                                     |
| `mfaEnrolledAt`      | `DateTime?` timestamptz| —                                           |
| `failedLoginCount`   | `Int`                  | —                                           |
| `lockedUntil`        | `DateTime?` timestamptz| —                                           |
| `lastLoginAt`        | `DateTime?` timestamptz| —                                           |
| `lastLoginIp`        | `String? @db.VarChar(64)`| —                                         |
| `createdAt`          | `DateTime` timestamptz | —                                           |
| `updatedAt`          | `DateTime` timestamptz | —                                           |
| `deletedAt`          | `DateTime?` timestamptz| Soft delete.                                |

**Spec ref** — §12.10.

---

## 7. Enums reference

### 7.1 EDMS backend enums

| Enum                       | Values                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `TenantStatus`             | `ACTIVE` / `SUSPENDED` / `DELETED`                                                  |
| `UserStatus`               | `ACTIVE` / `SUSPENDED` / `INVITED` / `DELETED`                                     |
| `SessionStatus`            | `ACTIVE` / `REVOKED` / `EXPIRED`                                                    |
| `DocumentStatus`           | `ACTIVE` / `ARCHIVED` / `RECORD` / `DELETED` / `PROCESSING` / `QUARANTINED`        |
| `WorkflowModelKind`        | `BPMN` / `CMMN` / `DMN`                                                             |
| `WorkflowDefinitionStatus` | `DRAFT` / `PUBLISHED` / `ARCHIVED`                                                  |
| `WorkflowStatus`           | `PENDING` / `RUNNING` / `APPROVED` / `REJECTED` / `CANCELLED` / `FAILED` / `COMPLETED` |
| `ApprovalDecision`         | `APPROVED` / `REJECTED` / `DELEGATED` / `ESCALATED`                                 |
| `DispositionStatus`        | `PENDING` / `APPROVED` / `EXECUTED` / `CANCELLED` / `BLOCKED_LEGAL_HOLD`           |
| `ScannerJobStatus`         | `PENDING` / `RUNNING` / `COMPLETED` / `FAILED` / `CANCELLED` / `QUARANTINED`       |
| `TourUserStatus`           | `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` / `SKIPPED` / `DISMISSED`              |

### 7.2 Licensing server enums

The licensing server uses `String @db.VarChar(...)` columns with
documented value sets rather than Prisma enums (to allow adding new
statuses without a migration). The canonical value sets are:

| Column (table.field)             | Allowed values                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Customer.status`                | `active` / `suspended` / `deleted`                                                                   |
| `License.status`                 | `pending_activation` / `active` / `suspended` / `revoked` / `expired`                               |
| `License.type`                   | `trial` / `subscription` / `perpetual` / `enterprise` / `evaluation` / `partner`                    |
| `License.environment`            | `production` / `staging` / `development`                                                             |
| `License.supportLevel`           | `standard` / `premium` / `enterprise`                                                                |
| `Activation.status`              | `pending` / `active` / `suspended` / `revoked` / `expired`                                           |
| `Heartbeat.status`               | `healthy` / `degraded` / `offline_grace` / `revoked` / `unknown`                                     |
| `Trial.status`                   | `pending` / `active` / `expired` / `converted` / `cancelled`                                         |
| `OfflineActivationRequest.status`| `pending` / `fulfilled` / `rejected` / `expired`                                                     |
| `SigningKey.status`              | `active` / `rotating` / `retired` / `revoked`                                                        |
| `WebhookDelivery.status`         | `pending` / `delivered` / `retrying` / `dead_lettered`                                               |
| `AdminUser.roles[]`              | `super_admin` / `admin` / `support` / `read_only`                                                    |
| `UsageMetric.metric`             | `users` / `storage` / `documents` / `ai_calls`                                                       |

---

## 8. Indexing strategy

### 8.1 Tenant-first composite indexes

Every tenant-owned table has at least one composite index starting
with `tenantId`. This is critical because every query includes
`WHERE tenant_id = ?` — without the leading index column, PostgreSQL
would do a full table scan filtered by tenant (spec §15.3, §22.4).

The general pattern:

```prisma
@@index([tenantId, <most-filtered-column>])
@@index([tenantId, <most-sorted-column>])
```

For example, `Document` has:

- `@@index([tenantId, status])` — for "active documents in this tenant"
- `@@index([tenantId, classificationId])` — for "documents classified X"
- `@@index([tenantId, createdByUserId])` — for "my documents"
- `@@index([tenantId, updatedAt])` — for the default list sort
- `@@index([tenantId, isRecord])` — for the records view
- `@@index([tenantId, legalHoldActive])` — for the legal-hold view

### 8.2 Cursor pagination indexes

Cursor pagination uses `(tenantId, <sortField>)` indexes. The cursor
encodes the last seen sort key plus the row's `id` (for tie-breaking);
the query becomes:

```sql
WHERE tenant_id = $1
  AND (updated_at, id) < ($2, $3)
ORDER BY updated_at DESC, id DESC
LIMIT 50;
```

This requires a composite index on `(tenant_id, updated_at, id)`. The
Prisma `@@index([tenantId, updatedAt])` covers this since PostgreSQL
can use the index for the leading columns and the `id` is the primary
key (implicitly included).

### 8.3 Audit log indexes

`AuditEvent` has five tenant-first indexes (see §5.5.1) to support
the common query patterns:

- "Recent events in this tenant" — `@@index([tenantId, occurredAt])`
- "All events of code X" — `@@index([tenantId, code])`
- "All events by user Y" — `@@index([tenantId, userId])`
- "All events on resource Z" — `@@index([tenantId, resourceType, resourceId])`
- "All events for correlation ID C" — `@@index([tenantId, correlationId])`

### 8.4 Unique constraints

Unique constraints are tenant-scoped where applicable:

- `@@unique([tenantId, email])` on `User` — same email can exist in
  different tenants.
- `@@unique([tenantId, code])` on `Role`, `ClassificationLabel`,
  `RetentionSchedule`, `LegalHold`, `MetadataSchema`, `ScannerProfile`,
  `TourDefinition` — codes are unique per tenant.
- `@@unique([tenantId, code, version])` on `WorkflowDefinition` —
  versions are unique per (tenant, code).
- `@@unique([groupId, userId])` on `GroupMember` — a user is in a
  group at most once.
- `@@unique([userId, roleId])` on `UserRoleAssignment` — a user has
  a role at most once.
- `@@unique([userId, fingerprint])` on `DeviceTrust`.
- `@@unique([documentId, fieldCode])` on `MetadataValue`.
- `@@unique([documentId, versionNumber])` on `DocumentVersion`.
- `@@unique([licenseId, code])` on `LicenseFeature` and `LicenseLimit`.
- `@@unique([licenseId, deploymentId])` on `Activation`.
- `@@unique([activationId, fingerprintHash])` on `Device`.
- `@@unique([tourId, userId])` on `TourUserState`.

---

## 9. Migration policy

### 9.1 Prisma Migrate

Schema changes are managed via `prisma migrate` (spec §22.5). The
workflow:

1. Edit `schema.prisma`.
2. Run `pnpm prisma migrate dev --name <descriptive-name>` to generate
   a new migration in `prisma/migrations/<timestamp>_<name>/`.
3. Review the generated SQL — Prisma occasionally emits destructive
   operations (e.g. `DROP COLUMN`) that should be split into
   non-breaking + backfill + cleanup phases.
4. Run the test suite.
5. Commit the migration alongside the schema change.

### 9.2 Zero-downtime migrations

For migrations that would lock a heavily-written table (e.g. adding a
not-null column to `AuditEvent`):

1. Add the column as nullable (no lock).
2. Backfill in batches (`UPDATE ... WHERE id BETWEEN ... AND ...`).
3. Set `NOT NULL` in a follow-up migration once all rows are populated.
4. Add the index `CONCURRENTLY` (PostgreSQL supports this outside
   transactions).

### 9.3 Migration tests

The migration SQL files at
[`apps/backend/prisma/migrations/0001_init/migration.sql`](../apps/backend/prisma/migrations/0001_init/migration.sql)
and
[`apps/license-server/prisma/migrations/0001_init/migration.sql`](../apps/license-server/prisma/migrations/0001_init/migration.sql)
are the baseline. The CI pipeline applies them to a fresh PostgreSQL
container and runs the test suite (including the tenant-isolation and
audit-hash-chain tests) on every PR.

### 9.4 Seed data

The seed scripts at:

- [`apps/backend/prisma/seed.ts`](../apps/backend/prisma/seed.ts)
- [`apps/license-server/prisma/seed.ts`](../apps/license-server/prisma/seed.ts)

are idempotent and create:

- A default tenant + admin user.
- 8 system roles.
- 4 classification labels.
- A default metadata schema.
- 4 retention schedules.
- 14 tour definitions with steps.
- Default `AssistantSettings` row.
- (License server) A super-admin + MFA secret + 4 plans.

---

## 10. Changelog

| Date       | Change                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| 2025-01-31 | Initial creation. Documented all EDMS backend (40 entities) and license-server (20 entities) tables. |

---

**Related documents**

- [`API_SPECIFICATION.md`](./API_SPECIFICATION.md) — the REST endpoints
  that read and write the entities in §5 and §6.
- [`WEBSOCKET_SPECIFICATION.md`](./WEBSOCKET_SPECIFICATION.md) — the 26
  real-time events that carry the entity IDs defined here.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — service topology, database
  connection pooling, and the deployment diagram.
- [`SECURITY_CONTROLS.md`](./SECURITY_CONTROLS.md) — the security
  controls matrix including RLS, soft-delete, and audit immutability.
- [`LICENSE_FILE_SPEC.md`](./LICENSE_FILE_SPEC.md) — the on-disk format
  of `.sedmslic` artifacts, which are stored as opaque blobs in
  `LicenseLocalState.payloadJson` (§5.8.1).
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — database backup, restore, and
  migration procedures.
