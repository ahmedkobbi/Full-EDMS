# Smart EDMS — License File Specification

> Spec reference: §4.3 (Specialized Licensing File Extensions), §12.5 (.sedmslic), §12.6 (.sedmsreq), §12.4 (license signing).

## File Extensions and MIME Types

Smart EDMS uses three specialized licensing file extensions:

| Extension     | MIME type                          | Purpose                              |
|---------------|-------------------------------------|--------------------------------------|
| `.sedmslic`   | `application/x-sedms-license`       | Signed license certificate           |
| `.sedmsreq`   | `application/x-sedms-request`       | Offline activation request           |
| `.sedmscrl`   | `application/x-sedms-crl`           | Signed revocation list (offline)     |

**File extension alone must NEVER be trusted.** Every license file is validated by:

- Schema version
- Payload structure (Zod)
- Signature
- Key ID
- Expiry
- Tenant/product/deployment binding
- Device or installation fingerprint binding
- Environment binding
- Revocation state (where available)

## `.sedmslic` — Signed License Certificate

### File structure

The `.sedmslic` file is a canonicalized, versioned, signed JSON artifact with the following top-level structure:

```json
{
  "v": 1,
  "type": "sedms.license",
  "alg": "EdDSA",
  "kid": "a1b2c3d4e5f60718",
  "payload": {
    "v": 1,
    "licenseId": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "660e8400-e29b-41d4-a716-446655440000",
    "productId": "smart-edms-core",
    "planId": "enterprise-on-premise",
    "deploymentId": "dep-a1b2c3d4e5f60718",
    "tenantId": null,
    "environment": "production",
    "issuedAt": "2026-08-15T10:00:00Z",
    "expiresAt": "2027-08-15T10:00:00Z",
    "gracePeriodDays": 7,
    "offline": true,
    "deploymentFingerprint": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "entitlements": [
      "core-edms",
      "ai-assistant",
      "advanced-search",
      "audit-export",
      "guided-tour-analytics",
      "electron-desktop"
    ],
    "limits": {
      "maxUsers": 500,
      "maxDevices": 5,
      "maxStorageBytes": 1099511627776,
      "maxDocuments": 1000000
    },
    "features": {
      "aiUsageAllowance": 10000,
      "offlineMode": true,
      "hybridSync": false,
      "supportLevel": "enterprise"
    },
    "renewalCounter": 0
  },
  "sig": "base64url-encoded-signature"
}
```

### Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | int | yes | Artifact version (currently `1`) |
| `type` | string | yes | Always `"sedms.license"` |
| `alg` | string | yes | Signing algorithm: `"EdDSA"` (Ed25519) or `"ES256"` (ECDSA P-256) |
| `kid` | string | yes | Key ID = SHA-256 of public key SPKI, first 16 hex chars |
| `payload` | object | yes | License payload (see below) |
| `sig` | string | yes | Base64url-encoded signature over canonicalized payload |

### Payload fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | int | yes | Payload version (currently `1`) |
| `licenseId` | UUID | yes | License identifier |
| `customerId` | UUID | yes | Customer identifier |
| `productId` | string | yes | Product code |
| `planId` | string | yes | Plan code |
| `deploymentId` | string | yes | On-premise deployment identifier |
| `tenantId` | UUID \| null | no | Tenant identifier (if multi-tenant) |
| `environment` | string | yes | `production` / `staging` / `trial` |
| `issuedAt` | ISO 8601 | yes | Issue timestamp |
| `expiresAt` | ISO 8601 | yes | Expiry timestamp |
| `gracePeriodDays` | int | yes | Grace period after expiry |
| `offline` | bool | yes | License supports offline operation |
| `deploymentFingerprint` | string | yes | SHA-256 of machine fingerprint (deployment binding) |
| `entitlements` | string[] | yes | List of entitled modules |
| `limits` | object | yes | Usage limits (maxUsers, maxDevices, maxStorageBytes, maxDocuments) |
| `features` | object | yes | Feature flags (aiUsageAllowance, offlineMode, hybridSync, supportLevel) |
| `renewalCounter` | int | yes | Number of times renewed |

### Canonicalization

Before signing, the payload is canonicalized using RFC 8785-like JSON canonicalization:

- Object keys sorted lexicographically (recursive)
- No insignificant whitespace
- UTF-8 encoding
- No duplicate keys
- No `NaN`, `Infinity`, `BigInt`, or `undefined`

The signature is computed over the canonicalized payload bytes only (NOT the wrapper).

### Verification process

1. Parse JSON
2. Validate top-level structure (Zod)
3. Validate payload structure (Zod)
4. Verify `kid` matches an embedded public key
5. Canonicalize payload
6. Verify signature with public key
7. Check `expiresAt` is in the future
8. Check `deploymentFingerprint` matches current deployment
9. Check `environment` matches expected environment
10. Check revocation list (if available)
11. Check `licenseId` is not revoked

If any step fails, verification fails closed.

## `.sedmsreq` — Offline Activation Request

Generated by the on-premise backend when the admin initiates offline activation. Uploaded to the License Admin Panel for processing.

### Structure

```json
{
  "v": 1,
  "type": "sedms.request",
  "requestId": "req-a1b2c3d4e5f60718",
  "productId": "smart-edms-core",
  "deploymentId": "dep-a1b2c3d4e5f60718",
  "appVersion": "1.0.0",
  "generatedAt": "2026-08-15T10:00:00Z",
  "machineFingerprint": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "installationPublicKey": "",
  "os": "linux/x64",
  "arch": "x64",
  "contactEmail": "admin@customer.com",
  "nonce": "a1b2c3d4e5f60718a1b2c3d4e5f60718"
}
```

### Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | int | yes | Version (`1`) |
| `type` | string | yes | Always `"sedms.request"` |
| `requestId` | string | yes | Unique request ID (UUID) |
| `productId` | string | yes | Product code |
| `deploymentId` | string | yes | On-premise deployment ID |
| `appVersion` | string | yes | Smart EDMS backend version |
| `generatedAt` | ISO 8601 | yes | Generation timestamp |
| `machineFingerprint` | string | yes | SHA-256 of machine fingerprint |
| `installationPublicKey` | string | no | Optional ephemeral public key (for encrypted response) |
| `os` | string | yes | OS/platform |
| `arch` | string | yes | Architecture |
| `contactEmail` | string | no | Optional contact email |
| `nonce` | string | yes | Random nonce (prevents replay) |

### Flow

1. On-premise backend generates `.sedmsreq` via `LicenseService.generateOfflineRequest()`
2. Admin exports the file
3. Admin uploads `.sedmsreq` to License Admin Panel
4. Licensing server validates the request structure + nonce
5. Admin reviews and clicks "Issue License"
6. Licensing server signs and returns `.sedmslic`
7. Admin downloads `.sedmslic`
8. Admin imports `.sedmslic` into Smart EDMS via `LicenseService.importSedmslic()`
9. Backend verifies signature, deployment fingerprint, and entitlements
10. License state becomes `valid` (or `expired_grace` if past expiry)

## `.sedmscrl` — Signed Revocation List

Optional for offline deployments. Contains a list of revoked license IDs, signed by the licensing server.

### Structure

```json
{
  "v": 1,
  "type": "sedms.crl",
  "alg": "EdDSA",
  "kid": "a1b2c3d4e5f60718",
  "issuedAt": "2026-08-15T10:00:00Z",
  "expiresAt": "2026-09-15T10:00:00Z",
  "revokedLicenses": [
    {
      "licenseId": "550e8400-e29b-41d4-a716-446655440000",
      "revokedAt": "2026-08-10T12:00:00Z",
      "reason": "non-payment"
    }
  ],
  "sig": "base64url-encoded-signature"
}
```

### Verification

1. Parse JSON
2. Validate structure (Zod)
3. Verify signature
4. Check `expiresAt` (CRL must be fresh)
5. Check `licenseId` against `revokedLicenses` list

If a license is on the CRL, the on-premise backend immediately transitions to `invalid` state.

## Signing Algorithms

### EdDSA (Ed25519) — recommended

- 128-bit security
- ~64-byte signatures
- Fast signing + verification
- Available in Node.js `crypto` module (`generateKeyPairSync('ed25519')`)

### ES256 (ECDSA P-256)

- 128-bit security
- DER-encoded signatures (~70 bytes)
- Widely supported
- Available in Node.js `crypto` module (`generateKeyPairSync('ec', { namedCurve: 'prime256v1' })`)

## Key Management

### Private signing key

- Lives ONLY on the licensing server
- Stored in KMS/HSM where possible (AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault)
- Falls back to chmod-600 PEM file on disk
- NEVER embedded in:
  - Electron client
  - On-premise backend
  - Public repositories
  - Frontend bundles
  - Docker images
  - Logs

### Public verification key

- Embedded in on-premise backend (via `LICENSE_PUBLIC_KEY_PATH` env var)
- May be embedded in Electron client for early rejection (but server-side verification is authoritative)
- Identified by `kid` (key ID)

### Key rotation

1. Generate new keypair
2. Add new SigningKey record (status: active)
3. Mark old SigningKey as `retired`
4. Old key signs one last `.sedmscrl` (revoking any licenses that should not be renewed under the new key)
5. New key signs all new licenses
6. Old key remains valid for verification of old licenses until they expire or are reissued

## Security Posture

Smart EDMS licensing is **tamper-resistant**, **license-enforced**, **auditable**, and **designed to make unauthorized use difficult, detectable, and operationally unattractive**.

It is NOT "uncrackable". On-premise software cannot be made perfectly immune to tampering. The system is designed so that:

- Bypassing license checks requires modifying compiled code (detectable via ASAR integrity checks where practical)
- Modified clients cannot access cloud-side services (activations, heartbeats, webhooks) without a valid license
- Cross-tenant access is impossible without a valid JWT signed by the customer's own backend
- Audit logs reveal suspicious patterns (license state changes, heartbeats from unexpected fingerprints, etc.)
- Legal remedies are preserved (license agreements, EULAs, audit clauses)

## Heartbeat Contract (Online Deployments)

When the on-premise backend is online, it sends periodic heartbeats to the licensing server.

### Request

```http
POST /v1/heartbeat
X-Api-Key: <api-key>

{
  "licenseId": "550e8400-e29b-41d4-a716-446655440000",
  "deploymentId": "dep-a1b2c3d4e5f60718",
  "fingerprintHash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "appVersion": "1.0.0",
  "timestamp": "2026-08-15T10:00:00Z",
  "usageSummary": {
    "users": 142,
    "storageBytes": 536870912000,
    "documents": 12450,
    "aiCallsToday": 234
  }
}
```

### Response

```json
{
  "status": "ok",
  "serverTime": "2026-08-15T10:00:01Z",
  "graceState": "valid",
  "updatedCertificate": null,
  "entitlements": ["core-edms", "ai-assistant", "advanced-search"]
}
```

If `updatedCertificate` is non-null, the on-premise backend replaces its stored `.sedmslic` with the new one (after verification).

### Failure handling

- Heartbeat failures logged
- Repeated failures (configurable threshold) trigger offline grace rules
- Clock rollback mitigation via monotonic counters where practical
