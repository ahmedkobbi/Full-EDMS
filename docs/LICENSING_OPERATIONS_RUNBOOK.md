# Smart EDMS — Licensing Operations Runbook

> Spec reference: §26.20 (Licensing Operations Runbook deliverable), §12 (Licensing System Requirements).
>
> This runbook covers operations specific to the Smart EDMS Licensing Server: license issuance, activation, revocation, key rotation, webhook management, and offline activation flows.

## Table of Contents

1. [Service Overview](#1-service-overview)
2. [Admin Login + MFA](#2-admin-login--mfa)
3. [Customer Management](#3-customer-management)
4. [License Issuance](#4-license-issuance)
5. [Online Activation](#5-online-activation)
6. [Offline / Air-Gap Activation](#6-offline--air-gap-activation)
7. [Heartbeat Monitoring](#7-heartbeat-monitoring)
8. [License Revocation](#8-license-revocation)
9. [Signing Key Rotation](#9-signing-key-rotation)
10. [Webhook Management](#10-webhook-management)
11. [Trial Management](#11-trial-management)
12. [Audit Log Review](#12-audit-log-review)
13. [Incident Response](#13-incident-response)

## 1. Service Overview

### Services

| Service | Port | Purpose |
|---------|------|---------|
| `license-api` | 4001 | NestJS licensing control plane |
| `license-admin` | 5174 (dev) / CDN (prod) | React admin panel |
| `postgres` | 5432 | Licensing database (`smart_edms_license`) |
| `redis` | 6379 | Cache + MFA tickets + revocation list |
| `webhook-worker` | — | BullMQ webhook delivery worker |

### Critical Security Invariants

- **Private signing key NEVER leaves this server** (stored in KMS/HSM or chmod-600 PEM file)
- **Admin MFA is required** for all admin logins
- **Step-up auth required** for revocation, key rotation, API key deletion
- **All admin actions audited** with hash-chained log

## 2. Admin Login + MFA

### First-time setup

1. Run the seed: `pnpm --filter @smart-edms/license-server db:seed`
2. The seed prints:
   - Super-admin email: `superadmin@smart-edms.example`
   - Password: `ChangeMe!2026` (CHANGE IMMEDIATELY)
   - MFA secret: enroll via authenticator app (Google Authenticator, Authy, 1Password)
   - otpauth URI: `otpauth://totp/Smart-EDMS:superadmin@smart-edms.example?secret=...&issuer=Smart-EDMS`
3. Scan the URI as a QR code (use `qrencode` or an online generator)
4. Login at the License Admin Panel to verify

### Login flow

1. Admin enters email + password → `POST /v1/auth/admin/login` → returns `{ mfaTicket }`
2. Admin enters TOTP code → `POST /v1/auth/admin/mfa/verify` → returns `{ accessToken, refreshToken }`
3. Access token TTL: 15 minutes
4. Refresh token TTL: 30 days

### Step-up auth

For sensitive operations (revoke license, rotate key, delete API key):

1. Admin enters current TOTP code → `POST /v1/auth/admin/mfa/step-up` → returns `{ stepUpToken }`
2. Step-up token TTL: 5 minutes (in-memory only, never persisted)
3. Client sends `X-Step-Up-Token` header on the sensitive request
4. `StepUpGuard` verifies the token

### Account lockout

- 5 failed logins → 15-minute lockout
- Lockout audited as `admin.account.locked`
- To unlock early: `UPDATE lic_admin_users SET locked_until = NULL, failed_login_count = 0 WHERE email = '...'`

## 3. Customer Management

### Create a customer

```bash
curl -X POST https://license-server/v1/customers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Acme Corp",
    "email": "procurement@acme.com",
    "industry": "legal",
    "website": "https://acme.com"
  }'
```

### Add a contact

```bash
curl -X POST https://license-server/v1/customers/$CUSTOMER_ID/contacts \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@acme.com",
    "role": "IT Director",
    "isPrimary": true
  }'
```

## 4. License Issuance

### Issue a new license

1. **Verify customer exists** + has a primary contact
2. **Select product + plan** (e.g., `smart-edms-core` + `enterprise-on-premise`)
3. **Set license parameters**:
   - `type`: `subscription` / `perpetual` / `enterprise` / `trial` / `evaluation` / `partner`
   - `startDate`: today (or customer's requested date)
   - `endDate`: per plan duration (e.g., 1 year for subscription)
   - `gracePeriodDays`: 7 (default)
   - `maxUsers`, `maxDevices`, `maxStorageBytes`, `maxDocuments`: per plan limits
   - `enabledModules`: per plan features
   - `environment`: `production` / `staging` / `trial`
   - `offlineMode`: `true` (allow offline operation)
   - `supportLevel`: per plan
4. **Select signing key**: the active key (default)
5. **Issue license** via the admin panel or API:

```bash
curl -X POST https://license-server/v1/licenses \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "...",
    "productId": "...",
    "planId": "...",
    "type": "subscription",
    "startDate": "2026-08-15T00:00:00Z",
    "endDate": "2027-08-15T00:00:00Z",
    "environment": "production",
    "offlineMode": true
  }'
```

6. **License is signed** with the active signing key → `.sedmslic` artifact generated
7. **Activation code** is generated (for online activation) or the `.sedmslic` is downloadable (for offline)

### License renewal

1. Find the existing license
2. Click "Renew" (or `POST /v1/licenses/:id/renew`)
3. Set new `endDate`
4. New `.sedmslic` is signed with the same `licenseId` (renewal counter incremented)
5. Customer's on-premise backend picks up the new certificate via the next heartbeat (if online)
6. If offline: customer must manually import the new `.sedmslic`

## 5. Online Activation

### Customer flow

1. Customer receives activation code via email
2. In the Smart EDMS Electron app, admin navigates to Settings → License → Activate
3. Enters the activation code
4. On-premise backend:
   - Generates machine fingerprint (SHA-256 of hostname + platform + arch + MAC)
   - Calls `POST /v1/activate/online` with activation code + fingerprint
5. Licensing server:
   - Validates activation code
   - Checks device limit not exceeded
   - Signs `.sedmslic` with deployment fingerprint binding
   - Returns the artifact
6. On-premise backend verifies signature + stores the license
7. Heartbeat begins (hourly)

### Device limit enforcement

- Each license has `maxDevices` (default 1 for team, 3 for business, 10 for enterprise)
- Each activation creates an `Activation` record with a unique `deploymentId` + `fingerprintHash`
- If device limit exceeded: activation rejected with `errors.DEVICE_LIMIT_EXCEEDED`
- To free a device slot: revoke the old activation via the admin panel

## 6. Offline / Air-Gap Activation

### When to use

- Customer's on-premise backend has no internet access
- Customer's network blocks outbound connections to the licensing server
- Air-gapped deployment (regulated industries)

### Flow

1. **Customer generates `.sedmsreq`**:
   - In the Electron app, admin clicks "Generate Offline Request"
   - Backend generates a `.sedmsreq` file with deployment ID + machine fingerprint + nonce
   - File downloads to the admin's machine
2. **Customer sends `.sedmsreq`** to the vendor (email, secure portal)
3. **Vendor admin uploads `.sedmsreq`** to the License Admin Panel:
   - `POST /v1/activate/offline-request` (accepts the file content)
   - Server validates the request structure + nonce
   - Creates an `OfflineActivationRequest` record with status `pending`
4. **Vendor admin reviews** the request in the admin panel:
   - Verifies customer identity
   - Verifies the deployment fingerprint matches expected
   - Selects the license to bind
5. **Vendor admin clicks "Issue License"**:
   - Server signs the `.sedmslic` with the deployment fingerprint
   - Creates an `OfflineActivationCertificate` record
   - Status changes to `fulfilled`
6. **Vendor admin downloads `.sedmslic`** and sends it to the customer
7. **Customer imports `.sedmslic`**:
   - In the Electron app, admin clicks "Import License"
   - Backend verifies signature + deployment fingerprint + entitlements
   - License state becomes `valid`

### Security notes

- `.sedmsreq` contains a nonce to prevent replay
- `.sedmslic` is bound to the deployment fingerprint — cannot be used on a different server
- Offline licenses cannot be revoked via CRL (unless the customer manually imports the `.sedmscrl`)

## 7. Heartbeat Monitoring

### What it does

- On-premise backend sends hourly heartbeat to the licensing server
- Heartbeat includes: `licenseId`, `deploymentId`, `fingerprintHash`, `appVersion`, `usageSummary`
- Licensing server responds with: `status`, `graceState`, optional `updatedCertificate`

### Monitoring

- Check the Heartbeats dashboard in the admin panel
- Alert if a deployment hasn't heartbeated in 24 hours
- Alert if heartbeat failures spike (could indicate network issues or license problems)

### Heartbeat failure handling (on-premise side)

- 1 failure: logged, no user impact
- 3 consecutive failures: admin warning shown
- 24 hours of failures: license enters `expired_grace` (if past expiry) or `grace_exhausted` (if grace period elapses)
- The on-premise backend continues operating in offline mode using the last known license certificate

## 8. License Revocation

### When to revoke

- Customer cancels subscription
- Customer breaches license agreement
- License key compromised (rare — requires key rotation too)
- Fraudulent activation detected

### Procedure

1. **Login as admin** (with MFA)
2. **Request step-up auth** (re-enter TOTP code)
3. **Find the license** in the admin panel
4. **Click "Revoke"** — requires a `reason`
5. **Server**:
   - Creates a `Revocation` record with `revokedAt`, `reason`, `crlVersion`
   - Signs a new `.sedmscrl` (revocation list) including the revoked `licenseId`
   - Audit log records the action
6. **Online deployments**: the next heartbeat receives a `revoked` status → on-premise backend transitions to `invalid` state
7. **Offline deployments**: customer must manually import the new `.sedmscrl` — until then, the on-premise backend continues using the (now-revoked) license

### Emergency revocation

For critical cases (e.g., license key compromise):

1. Revoke the license (above)
2. **Rotate the signing key** (see [Signing Key Rotation](#9-signing-key-rotation)) — this invalidates ALL licenses signed by the old key
3. Re-issue licenses to all other customers with the new key
4. Notify affected customers

## 9. Signing Key Rotation

### When to rotate

- Annually (scheduled)
- After key compromise (emergency)
- When switching algorithms (e.g., EdDSA → ES256)

### Procedure

**This is a high-risk operation — schedule a maintenance window and notify customers.**

1. **Generate new keypair**:
   ```bash
   pnpm --filter @smart-edms/license-server key:generate
   # Writes new private key to license-signing-key.pem
   # Prints new public key + kid
   ```
2. **Add new SigningKey** to the database (status: `active`)
3. **Mark old SigningKey** as `retired` (do NOT delete — needed to verify old licenses)
4. **Old key signs one last `.sedmscrl`** (revoking any licenses that should not be renewed under the new key)
5. **New key signs all new licenses** from this point forward
6. **Old key remains valid** for verification of existing licenses until they expire or are reissued
7. **Distribute new public key** to all on-premise backends (they fetch it via heartbeat or manual update)
8. **Audit log** records the rotation with the admin's ID

### Rollback

If the new key is compromised or the rotation causes issues:

1. Mark the new key as `retired`
2. Re-activate the old key (if still trusted)
3. Re-issue any licenses signed by the compromised new key

### Key storage

- **Production**: KMS/HSM (AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault)
- **Development**: chmod-600 PEM file on disk
- **NEVER** in Git, logs, frontend bundles, or Docker images

## 10. Webhook Management

### Configure a webhook

1. Customer admin requests webhook integration
2. Vendor admin creates the webhook:
   ```bash
   curl -X POST https://license-server/v1/webhooks \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{
       "customerId": "...",
       "url": "https://customer.com/webhooks/smart-edms",
       "events": ["license.issued", "license.renewed", "license.revoked", "license.expired"]
     }'
   ```
3. Server generates a `secret` (used for HMAC-SHA256 signature in `X-Smart-Edms-Signature` header)
4. **Share the secret with the customer** (via secure channel — NOT email)

### Webhook delivery

- BullMQ worker delivers webhooks with retries (exponential backoff, max 5 attempts)
- Dead-letter queue for permanent failures
- Last delivery status visible in admin panel

### Test a webhook

```bash
curl -X POST https://license-server/v1/webhooks/$WEBHOOK_ID/test \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Sends a test event (`webhook.test`) to verify the endpoint is reachable + the customer's signature verification works.

### Webhook events

| Event | Triggered When |
|------|----------------|
| `license.issued` | New license created |
| `license.renewed` | License renewed |
| `license.revoked` | License revoked |
| `license.expired` | License end date passed (cron job) |
| `trial.started` | Trial created |
| `trial.expired` | Trial end date passed |
| `trial.converted` | Trial converted to full license |
| `heartbeat.failed` | Deployment missed 3 consecutive heartbeats |
| `activation.created` | New activation recorded |

## 11. Trial Management

### Create a trial

1. Customer requests trial via marketing page or sales
2. Vendor admin creates the trial:
   ```bash
   curl -X POST https://license-server/v1/trials \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{
       "customerId": "...",
       "productId": "...",
       "contactEmail": "evaluator@customer.com",
       "durationDays": 14
     }'
   ```
3. Server generates an activation code bound to a single deployment
4. Activation code sent to the customer

### Trial limitations

- Max duration: 30 days (configurable)
- Cannot be renewed beyond max duration
- Automatically transitions to `expired` state when duration elapses
- Trial licenses have reduced entitlements (per the `trial` plan)

### Convert trial to full license

1. Customer purchases a full license
2. Vendor admin issues a new license (standard flow)
3. Vendor admin marks the trial as `converted`:
   ```bash
   curl -X POST https://license-server/v1/trials/$TRIAL_ID/convert \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"licenseId": "..."}'
   ```
4. Customer's on-premise backend picks up the new license via heartbeat (or manual import if offline)

## 12. Audit Log Review

### What to review

- **Daily**: failed admin logins, step-up auth failures, revocations, key rotations
- **Weekly**: offline activation requests (verify each was legitimate), webhook delivery failures
- **Monthly**: full audit export for compliance review

### Query the audit log

```sql
-- Recent revocations
SELECT occurred_at, admin_id, action, target_id, reason
FROM lic_audit_logs
WHERE action = 'license.revoke'
ORDER BY occurred_at DESC
LIMIT 20;

-- Failed admin logins
SELECT occurred_at, reason, ip_address
FROM lic_audit_logs
WHERE action = 'admin.login' AND result = 'deny'
ORDER BY occurred_at DESC;

-- Step-up auth failures
SELECT occurred_at, admin_id, ip_address
FROM lic_audit_logs
WHERE action = 'admin.mfa.step_up' AND result = 'deny'
ORDER BY occurred_at DESC;
```

### Verify hash chain

The licensing server's audit log is also hash-chained (same pattern as the on-premise backend). Verify periodically:

```bash
# (Endpoint to be implemented — similar to /v1/audit/verify-chain on the on-premise backend)
```

## 13. Incident Response

### SEV-1: Signing key compromised

1. **Immediately rotate the signing key** (see [Signing Key Rotation](#9-signing-key-rotation))
2. **Revoke all licenses** signed by the compromised key
3. **Re-issue licenses** to all legitimate customers with the new key
4. **Notify all customers** — they must import the new public key + new `.sedmslic`
5. **Preserve evidence** — audit logs, key metadata, access logs
6. **Post-mortem** — how was the key compromised? (insider threat, infrastructure breach, etc.)

### SEV-1: Admin account compromised

1. **Disable the compromised admin account**:
   ```sql
   UPDATE lic_admin_users SET is_active = false WHERE email = '...';
   ```
2. **Revoke all active sessions** for that admin (flush Redis `admin:jwt:revoked:*` — or just rotate `JWT_SECRET`)
3. **Review all actions** taken by that admin in the last 30 days
4. **Reset MFA** for all admin accounts (force re-enrollment)
5. **Rotate JWT secret** (invalidates all admin sessions)
6. **Post-mortem** — how was the account compromised? (phishing, weak password, MFA bypass?)

### SEV-2: Webhook delivery failures

1. **Check webhook status** in admin panel
2. **Check customer's endpoint** — is it reachable? Returning 2xx?
3. **Check signature verification** on customer's side — did they use the correct secret?
4. **Resend failed webhooks** via the admin panel
5. **If customer's endpoint is down**: pause the webhook (set `is_active = false`) and notify them

### SEV-2: Offline activation request backlog

1. **Check pending requests**:
   ```sql
   SELECT id, request_id, customer_id, created_at, status
   FROM lic_offline_activation_requests
   WHERE status = 'pending'
   ORDER BY created_at ASC;
   ```
2. **Process each** — verify customer identity, verify deployment fingerprint, issue license
3. **If backlog is large**: add staff or automate verification (carefully — don't compromise security for speed)

## Related Documents

- [Operations Runbook](OPERATIONS_RUNBOOK.md) — on-premise backend operations
- [Deployment Guide](DEPLOYMENT.md) — deployment procedures
- [Security](SECURITY.md) — security model
- [Threat Model](THREAT_MODEL.md) — threat scenarios
- [License File Specification](LICENSE_FILE_SPEC.md) — `.sedmslic` / `.sedmsreq` / `.sedmscrl` formats
- [License Server README](../apps/license-server/README.md) — setup + API reference
