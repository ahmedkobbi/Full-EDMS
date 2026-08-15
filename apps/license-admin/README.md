# @smart-edms/license-admin

Smart EDMS License Admin Panel — the control-plane UI used by licensing
administrators to manage customers, products, licenses, activations,
trials, webhooks, API keys, signing keys, and the audit log. Built per
spec §7.4 (license admin panel stack) and §12.10 (license admin panel
requirements).

## Stack

- **React 18 + TypeScript 5 + Vite 5** — fast HMR, strict TS,
  `tsconfig.base.json` extended.
- **Mantine v7.13** — UI library, light/dark themes, RTL support, dates,
  forms, modals, notifications.
- **TanStack Query v5** — server state (one `useQuery` / `useMutation` per
  licensing-server endpoint).
- **Zustand v4** — auth store (admin JWT + step-up JWT) + theme store.
- **react-i18next v15 + @smart-edms/i18n** — all six mandatory locales
  (en, fr, ar-RTL, ru, zh-CN, de) bundled inline; no HTTP backend.
- **mantine-react-table v2** — server-side paginated data tables.
- **react-router-dom v6** — nested routes + `useSearchParams` for filters.
- **lucide-react** — icon set (consistent with the Electron client).
- **axios v1** — API client with admin-JWT + step-up interceptors.

## Quick start

```bash
# From the monorepo root:
pnpm install
pnpm --filter @smart-edms/license-admin dev

# Or directly:
cd apps/license-admin
pnpm dev      # http://localhost:5175
pnpm build    # vite build + tsc --noEmit
pnpm typecheck
```

The dev server proxies `/v1` to the licensing server at
`http://localhost:4100` (override with the `LICENSE_SERVER_URL`
environment variable).

## Architecture

```
src/
├── main.tsx                  — app bootstrap (i18n, query client, theme)
├── App.tsx                   — root: login vs admin shell
├── routes.tsx                — public + authenticated route tables
├── theme/
│   ├── tokens.ts             — brand palette, typography, spacing
│   └── theme.ts              — Mantine v7 theme (light + dark)
├── i18n/
│   └── config.ts             — i18next init + Zustand locale store
├── api/
│   ├── client.ts             — axios + admin JWT + step-up JWT interceptors
│   └── hooks.ts              — TanStack Query hooks for all entities
├── store/
│   ├── auth.ts               — Zustand auth (session, step-up token)
│   └── theme.ts              — Zustand theme (system/light/dark)
├── components/
│   ├── layout/               — AdminShell, Sidebar, Topbar
│   ├── common/               — BrandedLogo, EmptyState, LoadingState,
│   │                           ErrorState, LocaleAwareDate, PageHeader,
│   │                           StepUpModal, StepUpProvider,
│   │                           LanguageSwitcherInline
│   ├── customers/            — CustomerTable, CustomerDrawer, CustomerDetail
│   ├── products/             — ProductTable, ProductDrawer, PlanEditor
│   ├── licenses/             — LicenseTable, LicenseIssueModal,
│   │                           LicenseDetail, LicenseRevokeModal,
│   │                           LicenseRenewModal
│   ├── activations/          — ActivationTable, OfflineActivationReview
│   ├── trials/               — TrialTable, TrialCreateModal
│   ├── webhooks/             — WebhookTable, WebhookDrawer
│   ├── api-keys/             — ApiKeyTable, ApiKeyCreateModal
│   ├── audit/                — AuditLogTable
│   ├── signing-keys/         — SigningKeyList, KeyRotationModal
│   └── tour/                 — GuidedTour
└── pages/                    — one page per route
```

## Authentication

### Admin login (MFA required)

1. Admin enters username + password → `POST /v1/auth/admin/login` returns
   a `mfaTicket` (the admin is NOT yet authenticated).
2. Admin enters their 6-digit TOTP code →
   `POST /v1/auth/admin/mfa/verify` verifies the code against the admin's
   registered TOTP secret and returns the access + refresh tokens + the
   admin profile.
3. The access + refresh tokens live in `sessionStorage` (scoped to the
   admin's tab — closed when the tab closes). The refresh token is used
   by the API client to silently renew the access token on 401.

### Step-up authentication (spec §27.3)

Sensitive operations — license revoke, signing-key rotation, API-key
revoke — require step-up authentication. The flow:

1. The admin clicks "Revoke license" (or "Rotate key", or "Revoke API key").
2. The `useStepUp()` hook checks the auth store for a valid step-up
   token (5-minute TTL). If one exists, the mutation fires immediately.
3. If no valid step-up token exists, the `StepUpModal` opens and prompts
   the admin for their current TOTP code.
4. `POST /v1/auth/admin/mfa/step-up` verifies the code and returns a
   step-up JWT (valid 5 minutes). The token is stored IN MEMORY ONLY
   (never persisted) so a page reload requires re-verification.
5. The API client attaches the step-up token as the `X-Step-Up-Token`
   header on every subsequent request. The licensing server's
   `StepUpGuard` verifies the token's `mfaVerifiedAt` claim is within
   the TTL.
6. The sensitive mutation fires; on success the step-up token remains
   valid for the remaining TTL (so the admin can perform multiple
   sensitive operations within 5 minutes without re-entering MFA).
7. The admin can manually clear the step-up session from the Topbar
   (shield badge → "Clear step-up") or from Settings.

The step-up badge in the Topbar shows the remaining minutes when a
step-up session is active.

## Server-side pagination

All list endpoints use cursor-based pagination: `?limit=50&cursor=...`
returns `{ items, hasMore, nextCursor }`. The mantine-react-table
instances render the items as a flat list and offer a "Load more"
affordance in the bottom toolbar that appends the next page to the
local rows list (so the admin can scroll through long lists without
losing already-loaded rows).

## Multilingual support

All UI strings come from `t()` calls against the `license`, `admin`,
`audit`, `auth`, `common`, `errors`, `settings`, and `tour.license`
namespaces of `@smart-edms/i18n`. The six mandatory locales (en, fr,
ar, ru, zh-CN, de) are bundled inline — no HTTP backend, no flicker on
locale change. RTL is engaged automatically when the locale is `ar`
(both `<html dir="rtl">` and Mantine's `theme.dir = 'rtl'`).

## Guided tour

First-time admins see an automatic tour of the panel's main sections
(dashboard, customers, licenses, offline activations, signing keys,
audit). The tour state is persisted to `localStorage` so it only shows
once; the admin can restart it from Settings → "Restart tour".

## Offline activation flow

The offline activation review (`/offline-activations`) walks the admin
through the four-step flow:

1. **Upload** — drag a `.sedmsreq` file (or click to select). The panel
   parses the JSON, validates the `type === 'sedms.request'`, and POSTs
   the raw request to `/v1/activate/offline-request` (intake). The
   server persists it as `pending` and returns the record.
2. **Review** — the panel shows the parsed request (productId,
   deploymentId, fingerprint, OS, arch, contact email, installation
   public key).
3. **Issue** — the admin picks a customer + plan + validity window and
   clicks "Issue license". The panel calls
   `/v1/activate/offline-issue`; the server signs the license and
   returns a `OfflineActivationCertificate` containing the `.sedmslic`
   artifact. The admin can also "Reject" the request.
4. **Download** — the panel offers a "Download .sedmslic" button that
   downloads the artifact as a file. The admin ships the file back to
   the customer out-of-band (e.g. via secure email).

## API key display-once

When an admin creates an API key, the licensing server returns the raw
key exactly once. The `ApiKeyCreateModal` shows the raw key with a
prominent "Copy" button + a warning that the key will not be shown
again. The admin must acknowledge they have saved the key before the
modal can be closed. After creation, only the key prefix
(`sedms_<first8>…`) is displayed in the table.

## Webhook test

The `WebhookTable` exposes a "Send test" action on each webhook row.
Clicking it calls `POST /v1/webhooks/:id/test`, which dispatches a
synthetic `webhook.test` event to the webhook's URL and records the
delivery attempt. The admin sees the result in the deliveries list
(expanded below each webhook row).

## Audit log viewer

The `AuditLogTable` supports:
- Free-text search (actor, action, IP)
- Filter by action (dropdown of known action codes)
- Filter by customer ID (free text)
- Server-side cursor pagination ("Load more")
- Hash-chain integrity verification banner (calls
  `/v1/audit/verify` — shows green when intact, red when broken with
  the first broken sequence number)
- Expandable rows showing the full payload + user agent

## Signing key rotation

The `SigningKeyList` shows the active key (kid, algorithm, public key,
created date) at the top, followed by an accordion with the history of
retired/revoked keys. The "Rotate" button opens the `KeyRotationModal`,
which requires step-up auth (the admin re-enters their TOTP code). The
admin specifies a `targetKeyPath` (filesystem path on the licensing
server) and optionally an algorithm. The server generates a new
keypair, writes the private key to the path (chmod 600), and marks the
current key as `retiring` (the new key becomes active on the next
server restart).

## Theme

- **System default** — the user preference defaults to `system`, which
  follows the OS preference. A `matchMedia` listener re-applies the
  resolved scheme when the OS preference changes.
- **No FOUC** — `index.html` sets `data-mantine-color-scheme`
  synchronously from `localStorage` before the React bundle loads.
- **Light + dark** — both themes are tuned for premium quality: solid
  surfaces (no glassmorphism), subtle borders, elevated shadows,
  high-contrast text (AA minimum), semantic status colors.

## Configuration

| Environment variable        | Default                  | Description |
|-----------------------------|--------------------------|-------------|
| `VITE_LICENSE_SERVER_URL`   | `http://localhost:4100`  | Licensing server base URL |
| `LICENSE_SERVER_URL`        | `http://localhost:4100`  | Vite dev proxy target |

## Assumed licensing-server endpoints

The admin panel assumes the following endpoints exist on the licensing
server (some are documented in the licensing-server controllers, others
are admin-panel integration endpoints noted as "out of scope for this
skeleton" in the existing license-server source):

| Endpoint | Status |
|----------|--------|
| `POST /v1/auth/admin/login` | assumed (returns `{ mfaTicket }`) |
| `POST /v1/auth/admin/mfa/verify` | assumed (returns tokens) |
| `POST /v1/auth/admin/mfa/step-up` | assumed (returns step-up token) |
| `POST /v1/auth/admin/refresh` | assumed |
| `GET /v1/auth/admin/me` | assumed |
| `GET/POST/PATCH/DELETE /v1/customers` | exists |
| `GET/POST /v1/customers/:id/contacts` | exists |
| `GET/POST /v1/products`, `GET /v1/products/:id` | exists |
| `GET /v1/products/:id/plans`, `POST /v1/plans` | exists |
| `GET/POST /v1/licenses`, `GET /v1/licenses/:id` | exists |
| `PATCH /v1/licenses/:id/renew` | exists |
| `POST /v1/licenses/:id/revoke` (step-up) | exists |
| `GET /v1/licenses/:id/activations` | assumed |
| `GET /v1/licenses/:id/devices` | assumed |
| `GET /v1/licenses/:id/heartbeats` | assumed |
| `GET /v1/activate/offline-requests`, `GET /v1/activate/offline-requests/:id` | exists |
| `POST /v1/activate/offline-request` (intake) | exists |
| `POST /v1/activate/offline-issue` | exists |
| `POST /v1/activate/offline-reject/:id` | exists |
| `GET /v1/activate/offline-certificates/:id/download` | assumed |
| `GET/POST /v1/trials`, `GET /v1/trials/:id` | exists |
| `POST /v1/trials/:id/convert`, `POST /v1/trials/:id/cancel` | exists |
| `GET/POST/DELETE /v1/webhooks` | exists |
| `GET /v1/webhooks/:id/deliveries` | exists |
| `POST /v1/webhooks/deliveries/:id/replay` | exists |
| `POST /v1/webhooks/:id/test` | assumed |
| `GET/POST/DELETE /v1/api-keys` | assumed |
| `GET /v1/audit`, `GET /v1/audit/verify` | exists |
| `GET /v1/signing-keys`, `GET /v1/signing-keys/active` | exists |
| `POST /v1/signing-keys/rotate` (step-up) | exists |
| `GET /v1/dashboard/kpis` | assumed |

The panel degrades gracefully when an endpoint is missing — the relevant
query returns an error and the `ErrorState` component surfaces it.

## License

UNLICENSED.
