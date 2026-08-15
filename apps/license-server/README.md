# @smart-edms/license-server

Smart EDMS Licensing Server — the vendor-side control plane for license
issuance, activation, revocation, heartbeats, trials, and webhook delivery.

**Spec ref:** §4.2 (licensing server model), §7.3 (licensing server stack),
§12 (licensing system requirements).

This is a **SEPARATE NestJS app** from the on-premise backend. It runs in
the vendor's cloud/hosted environment and **holds the private signing
keys** (never embedded in client artifacts).

## Stack

- **NestJS** (Fastify adapter) — HTTP framework
- **Prisma** + **PostgreSQL** — persistence (separate database from the
  on-prem backend; all tables prefixed `lic_`)
- **Redis** + **BullMQ** — webhook delivery queue + rate limiting + cache
- **Pino** — structured logging with redaction of secrets
- **OpenAPI** — auto-generated docs at `/v1/docs`
- **Ed25519 / ES256** — asymmetric signing via `@smart-edms/license-core`

## Critical security invariants (spec §12.4)

1. **The private signing key NEVER leaves the licensing server process.**
   - Loaded ONCE at startup from `LICENSE_SIGNING_KEY_PATH` (a file
     readable ONLY by the license-server process; chmod 600).
   - Held in memory only for the lifetime of the process.
   - NEVER written to logs, persisted to the database, returned in any
     HTTP response, or embedded in any client artifact.
2. **Public key distribution:** the public key (PEM) is the only key
   material that leaves the server. It's distributed to on-prem backends
   and Electron clients for signature verification.
3. **`kid` validation at startup:** the server refuses to start if
   `LICENSE_SIGNING_KID` does not match `deriveKeyId(publicKeyPem)` for
   the loaded private key. This prevents accidental misconfiguration
   where on-prem backends have been told to trust a different `kid` than
   the one actually signing.
4. **File permission check:** the server refuses to start if the signing
   key file is group- or world-readable.
5. **Signature verification fails closed** (enforced by
   `@smart-edms/license-core`).
6. **Key rotation** (spec §12.4):
   - Admin generates a new keypair via `POST /v1/signing-keys/rotate`
     (requires step-up auth).
   - The new key's PUBLIC half is written to the DB as a new `SigningKey`
     row with status `'rotating'`; the OLD key's status is changed to
     `'retiring'`.
   - The new key's PRIVATE half is written to a NEW file path (chmod 600)
     and the operator updates the env vars + restarts the server.
   - On restart, the new key becomes active and signs all new licenses.
   - The old key signs one last CRL on the next CRL refresh to formally
     retire.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Generate the signing key

```bash
pnpm --filter @smart-edms/license-server key:generate -- --out ./keys/signing-key.pem --alg EdDSA
```

This will:
- Generate a new Ed25519 keypair.
- Write the private key to `./keys/signing-key.pem` (chmod 600).
- Print the public key PEM (copy this into on-prem backends' trusted
  public keys list).
- Print the `LICENSE_SIGNING_KID` env var to set.

### 3. Configure environment

Create a `.env` file (or set env vars in your process manager):

```bash
NODE_ENV=production
PORT=4100
HOST=0.0.0.0
LOG_LEVEL=info

DATABASE_URL=postgresql://license:password@localhost:5432/smart_edms_license
REDIS_URL=redis://localhost:6379/1

LICENSE_SIGNING_KEY_PATH=/run/secrets/signing-key.pem
LICENSE_SIGNING_KID=<from key:generate output>
LICENSE_SIGNING_ALG=EdDSA

JWT_SECRET=<64+ chars random string>
STEP_UP_AUTH_TTL_SECONDS=300

CORS_ORIGINS=https://license-admin.smart-edms.example

HEARTBEAT_INTERVAL_SECONDS=3600
HEARTBEAT_FAILURE_THRESHOLD=3
TRIAL_DEFAULT_DURATION_DAYS=14
TRIAL_MAX_DURATION_DAYS=30

WEBHOOK_MAX_ATTEMPTS=5
WEBHOOK_BACKOFF_BASE_MS=1000
WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_CONCURRENCY=5

CRL_REFRESH_HOURS=24
CRL_TTL_HOURS=24
```

### 4. Run database migrations

```bash
pnpm --filter @smart-edms/license-server db:migrate
```

### 5. Start the server

```bash
pnpm --filter @smart-edms/license-server start
```

## API endpoints

### Public (no auth)

- `GET /v1/health` — liveness probe
- `GET /v1/health/ready` — readiness probe (checks DB + Redis + signing key)
- `GET /v1/crl` — fetch the latest `.sedmscrl` revocation list (on-prem
  backends fetch this periodically when online)

### API key (X-Api-Key header) OR activation code

- `POST /v1/activate/online` — online activation (spec §12.7)
- `POST /v1/heartbeat` — heartbeat (spec §12.9)

### Admin JWT (Authorization: Bearer ...)

- `POST /v1/customers` — create a customer
- `GET  /v1/customers` — list customers
- `GET  /v1/customers/:id` — get a customer
- `PATCH /v1/customers/:id` — update a customer
- `DELETE /v1/customers/:id` — soft-delete a customer
- `POST /v1/customers/:id/contacts` — add a contact
- `GET  /v1/customers/:id/contacts` — list contacts
- `POST /v1/products` — create a product
- `GET  /v1/products` — list products
- `GET  /v1/products/:id` — get a product
- `POST /v1/plans` — create a plan
- `GET  /v1/products/:id/plans` — list plans for a product
- `POST /v1/licenses` — issue a new license
- `GET  /v1/licenses` — list licenses
- `GET  /v1/licenses/:id` — get a license
- `PATCH /v1/licenses/:id/renew` — renew a license
- `POST /v1/licenses/:id/revoke` — revoke a license (**step-up auth**)
- `POST /v1/activate/offline-request` — intake a `.sedmsreq` file
- `POST /v1/activate/offline-issue` — issue `.sedmslic` for an offline request
- `POST /v1/activate/offline-reject/:id` — reject an offline request
- `GET  /v1/activate/offline-requests` — list offline requests
- `GET  /v1/activate/offline-requests/:id` — get an offline request
- `POST /v1/trials` — create a trial
- `GET  /v1/trials` — list trials
- `GET  /v1/trials/:id` — get a trial
- `POST /v1/trials/:id/convert` — convert trial to full license
- `POST /v1/trials/:id/cancel` — cancel a trial
- `POST /v1/webhooks` — create a webhook
- `GET  /v1/webhooks?customerId=` — list webhooks for a customer
- `DELETE /v1/webhooks/:id` — delete a webhook
- `GET  /v1/webhooks/:id/deliveries` — list delivery attempts
- `POST /v1/webhooks/deliveries/:id/replay` — replay a delivery
- `GET  /v1/signing-keys` — list signing keys (PUBLIC metadata only)
- `GET  /v1/signing-keys/active` — get the active signing key
- `POST /v1/signing-keys/rotate` — generate a new signing keypair for
  rotation (**step-up auth**)
- `POST /v1/revocations/refresh` — manually rebuild + sign the CRL
- `GET  /v1/audit` — list audit log entries
- `GET  /v1/audit/verify` — verify hash chain integrity

## Webhook events

The server emits the following webhook events (spec §12):

- `license.issued`
- `license.renewed`
- `license.revoked`
- `license.expired`
- `trial.started`
- `trial.expired`
- `heartbeat.failed`
- `activation.created`

Each webhook delivery includes:
- `Content-Type: application/json`
- `X-Smart-Edms-Signature: sha256=<HMAC-SHA256 of body>`
- `X-Smart-Edms-Event: <event name>`
- `X-Smart-Edms-Delivery: <delivery UUID>`

Delivery guarantees:
- At-least-once (customers MUST dedupe by event ID).
- Max 5 attempts (configurable via `WEBHOOK_MAX_ATTEMPTS`).
- Exponential backoff (1s, 2s, 4s, 8s, 16s).
- Dead-letter queue for permanent failures (5xx after all retries, or
  4xx that are not 408/429).

## Audit log

The licensing server has its OWN audit log, distinct from the on-prem
EDMS audit log (it's a separate service). The log is:

- **Append-only** — no update or delete operations.
- **Hash-chained** — each entry's `eventHash` is
  `sha256(${previousHash}|${canonicalEvent})`. Any modification to a
  historical entry breaks the chain and is detected by
  `GET /v1/audit/verify`.
- **Global** (not per-tenant) — the licensing server is a single-tenant
  control plane serving all customers. Per-customer filtering is done
  via the `customerId` column.

Every admin action is audited: customer create/update/delete, license
issue/renew/revoke, signing-key rotation, webhook create/delete/replay,
offline activation intake/issue/reject, trial create/convert/cancel,
CRL refresh.

## Key rotation procedure

1. **Admin (with step-up auth) generates a new keypair:**

   ```bash
   curl -X POST https://license-api.smart-edms.example/v1/signing-keys/rotate \
     -H "Authorization: Bearer $ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{"targetKeyPath": "/run/secrets/signing-key-v2.pem", "alg": "EdDSA"}'
   ```

   The response includes the new `kid`, public key PEM, and instructions.
   The new private key is written to `/run/secrets/signing-key-v2.pem`
   (chmod 600). The current key is marked `'retiring'` in the DB.

2. **Distribute the new public key to all on-prem backends** (add to
   their trusted-public-keys list).

3. **Update env vars + restart the licensing server:**

   ```bash
   LICENSE_SIGNING_KEY_PATH=/run/secrets/signing-key-v2.pem
   LICENSE_SIGNING_KID=<new kid>
   ```

   On restart, the new key becomes active. The old key signs one final
   CRL (on the next CRL refresh) to formally retire.

4. **Once all on-prem backends have fetched the new CRL**, delete the
   old private key file from disk (the DB row is kept for audit history).

## Module structure

```
src/
├── main.ts                       # Fastify bootstrap + OpenAPI + helmet + rate limit
├── app.module.ts                 # Root module
├── prisma/
│   ├── prisma.module.ts          # @Global PrismaModule
│   └── prisma.service.ts         # PrismaClient wrapper
├── config/
│   └── environment.ts            # Zod-validated env (LICENSE_SIGNING_KEY_PATH, etc.)
├── security/
│   ├── admin-jwt.guard.ts        # Admin JWT auth (MFA required for sensitive ops)
│   ├── api-key.guard.ts          # API key auth (X-Api-Key) for on-prem calls
│   └── step-up.guard.ts          # Step-up auth (MFA within last 5 min)
├── modules/
│   ├── customer/                 # Customer + Contact CRUD
│   ├── product/                  # Product + Plan CRUD
│   ├── license/                  # License issue/renew/revoke + signer
│   ├── activation/               # Online + offline activation (§12.7, §12.8)
│   ├── heartbeat/                # Heartbeat receiver (§12.9)
│   ├── trial/                    # Trial management (§12.10)
│   ├── webhook/                  # Webhook delivery (BullMQ + retries + DLQ)
│   ├── signing-key/              # KMS/HSM stub + filesystem key loading
│   ├── audit/                    # Hash-chained audit log
│   ├── revocation/               # CRL build + sign (§12.4)
│   └── health/                   # Liveness + readiness probes
└── common/
    ├── all-exceptions.filter.ts  # Standard error envelope
    ├── audit.interceptor.ts      # @AuditAction() interceptor
    ├── redis.service.ts          # Shared ioredis connection
    ├── redis.module.ts           # @Global RedisModule
    └── decorators/               # @Public, @OptionalApiKey, @AuditAction, @AdminRoles
```

## Prisma schema

All tables are prefixed with `lic_` and live in the licensing server's
own database. See `prisma/schema.prisma` for the full schema.

Key entities (spec §12.1):
- `Customer`, `Contact`
- `Product`, `Plan`
- `License`, `LicenseFeature`, `LicenseLimit`
- `Activation`, `Device`
- `Heartbeat`, `UsageMetric`
- `Revocation`
- `Trial`
- `Webhook`, `WebhookDelivery`
- `ApiKey`
- `LicenseAuditLog` (hash-chained)
- `OfflineActivationRequest`, `OfflineActivationCertificate`
- `SigningKey` (public metadata only — private key never persisted)

## Spec compliance

- §4.2 licensing server model — ✓ (separate NestJS app, vendor cloud)
- §7.3 licensing server stack — ✓ (NestJS + Fastify + Prisma + PostgreSQL + Redis + BullMQ + Pino + OpenAPI)
- §12.1 licensing server entity graph — ✓ (all entities in Prisma schema)
- §12.2 license types & statuses — ✓ (LicenseType enum, LicenseStatus enum)
- §12.3 entitlements — ✓ (enabledModules[], enabledIntegrations[], features JSON)
- §12.4 signing keys + CRL — ✓ (SigningKeyService enforces isolation; RevocationService signs CRLs)
- §12.5 license payload + signing — ✓ (LicenseSigner uses buildLicenseArtifact from license-core)
- §12.6 offline activation request format — ✓ (parseOfflineRequest from license-core)
- §12.7 online activation flow — ✓ (ActivationService.activateOnline)
- §12.8 offline activation issue flow — ✓ (intakeOfflineRequest + issueOfflineLicense)
- §12.9 heartbeat — ✓ (HeartbeatService.receiveHeartbeat + signed response)
- §12.10 trials — ✓ (TrialService.create/convert/cancel/expireDueTrials)
- §21.2 authentication — ✓ (AdminJwtGuard + StepUpGuard + ApiKeyGuard)
- §21.5 security headers — ✓ (fastify-helmet + strict CSP + HSTS)
- §21.6 config validation — ✓ (Zod schema in environment.ts)
- §21.7 logging + monitoring — ✓ (Pino + redaction + health probes)
- §27.3 security rules — ✓ (rate limit, audit, fail-closed verification)
