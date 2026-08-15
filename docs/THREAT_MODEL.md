# Smart EDMS — Threat Model

> Spec reference: §21 (Security Requirements), §25 (Prohibited Actions), §26.9 (Threat Model deliverable).

## Threat Modeling Approach

This threat model uses the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) applied to each trust boundary in the Smart EDMS architecture.

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER DEVICE (Electron)                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Renderer Process (sandboxed, contextIsolation)                     │ │
│  │  - React UI, Mantine v7, i18next                                   │ │
│  │  - JWT in memory only (NEVER localStorage)                         │ │
│  │  - No Node.js access                                               │ │
│  └────────────────────────────┬───────────────────────────────────────┘ │
│                               │ contextBridge (typed, minimal API)      │
│  ┌────────────────────────────┴───────────────────────────────────────┐ │
│  │ Main Process (Node.js)                                             │ │
│  │  - safeStorage (OS keychain) for JWT persistence                   │ │
│  │  - File dialogs, native theme sync                                 │ │
│  │  - electron-updater (signature verification)                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                 │ HTTPS (TLS 1.2+)                    │ WSS (TLS 1.2+)
                 ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    REVERSE PROXY (Nginx)                                 │
│  TLS termination, rate limit, HSTS, CSP, clickjacking protection        │
└─────────────────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              ON-PREMISE BACKEND (NestJS + Fastify)                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Guards: JwtAuth → Tenant → License (per request)                   │ │
│  │ Audit: hash-chained, append-only                                   │ │
│  │ Validation: Zod on every boundary                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
        │            │            │            │             │
        ▼            ▼            ▼            ▼             ▼
   PostgreSQL     Redis      OpenSearch    MinIO/S3     BullMQ Workers
   (tenant_id     (cache,    (search       (object      (document proc,
    RLS)           pubsub)     index)       storage)     audit export,
                                                           retention)
```

## STRIDE Analysis

### 1. Spoofing (Identity falsification)

| Threat | Surface | Mitigation | Spec |
|--------|---------|------------|------|
| Stolen JWT used to impersonate user | REST API | Short access TTL (15min), refresh rotation, Redis revocation list (`jwt:revoked:<hash>`), logout invalidates | §21.2 |
| Forged admin login to license server | License Admin Panel | bcrypt(12) + TOTP MFA required, account lockout after 5 failed attempts, MFA ticket (not JWT) in Redis with 5min TTL | §12.10, §21.2 |
| Fake on-premise backend calling license server | License Server activation endpoint | API key + activation code required, device fingerprint binding | §12.7 |
| Electron renderer pretending to be main process | Electron preload | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, preload exposes only 7 typed APIs via contextBridge | §7.1 |
| WebSocket connection without auth | Socket.IO gateway | JWT verified on handshake, socket disconnected if invalid, every event re-authorized | §13.2, §13.3 |
| AI assistant acting as a different user | AI Gateway | Session ownership verified on every message + action confirmation; `AssistantAction.message.session.userId` must match `req.user.sub` | §11.4, §11.5 |

### 2. Tampering (Data modification)

| Threat | Surface | Mitigation | Spec |
|--------|---------|------------|------|
| License file tampered to extend expiry | `.sedmslic` import | Asymmetric signature (Ed25519/ES256) verified against embedded public key, fail-closed on signature mismatch, canonicalized payload before signing | §12.4, §12.5 |
| Audit log modified to hide malicious activity | `audit_events` table | Hash-chained (`eventHash = sha256(previousHash \| canonicalEvent)`), append-only (no UPDATE/DELETE in code), periodic `/v1/audit/verify-chain` verification | §9.12, §21.7 |
| Document binary modified in storage | MinIO/S3 | SHA-256 checksum per version, immutable stored content, version comparison re-computes hash | §9.3, §9.6 |
| Path-supplied `tenantId` differs from JWT | REST API | `TenantGuard` rejects mismatched `tenantId` with 403, audited as `result: deny` | §9.2, §15.3 |
| License bypass via hidden flag | Backend env | No bypass flags exist; `LicenseGuard` enforces 6-state machine on every non-public route; fail-closed when state is `invalid` | §4.4, §27.4 |
| AI-generated workflow auto-published without review | Workflow publish endpoint | `isAiDraft: true` workflows cannot be published until `humanReviewed: true` is set | §9.8 |
| Redaction reversed in exported derivative | Redaction export | Original binary preserved; exported derivative is a new version with irreversible redaction; export job audited | §9.9 |
| Auto-update artifact tampered in transit | Electron updater | `electron-updater` verifies signature before applying; `autoDownload: false` requires user confirmation; fails closed on signature mismatch | §7.1, §23.4 |
| ASAR integrity bypassed | Electron packaging | ASAR integrity validation enabled (macOS), code signing required for production installers | §7.1 |

### 3. Repudiation (Denial of action)

| Threat | Surface | Mitigation | Spec |
|--------|---------|------------|------|
| User denies performing a destructive action | Audit log | Every sensitive operation recorded with `userId`, `tenantId`, `ipAddress`, `userAgent`, `correlationId`, `reason`, `timestamp` | §9.12, §21.7 |
| Admin denies revoking a license | License server audit | `LicenseAuditLog` with `adminId`, `action`, `target`, `metadata`, `ipAddress`, hash-chained | §12.1, §12.10 |
| AI denies performing a tool call | AI audit | `AssistantToolInvocation` + `AssistantAuditEvent` + global `AuditEvent` with `code: 'ai.tool_invoked'`; tool calls independently authorized (not by AI request) | §11.5, §11.14 |
| User denies confirming an AI-suggested action | AI action confirmation | `AssistantAction.confirmedAt` + `AssistantAction.executedAt` + audit event `code: 'ai.action.confirm'` with `result: allow` | §11.4 |
| Workflow approver denies approval | Workflow audit | `Approval` record with `approverId`, `decision`, `comment`, `signature` (audit-trail attestation hash), `decidedAt` | §9.8 |

### 4. Information Disclosure

| Threat | Surface | Mitigation | Spec |
|--------|---------|------------|------|
| Cross-tenant document access | Document API | `tenantId` from JWT (never path/body); Prisma queries scoped; negative tests prove denial; cross-tenant attempts audited as `deny` | §9.2, §15.3, §24.2 |
| Search results leak restricted document existence | OpenSearch / Search API | Search filtered by `tenantId` + user permissions BEFORE pagination; existence disclosure requires explicit tenant policy | §9.10 |
| AI reveals restricted document existence | AI chat | Citations only include documents the user can access; prompt injection detector blocks "show all data" patterns | §11.8, §11.9, §11.10 |
| JWT in localStorage leaked via XSS | Electron renderer | JWT stored in Electron `safeStorage` (OS keychain), never localStorage; CSP blocks inline scripts | §7.1, §21.4 |
| Secrets in frontend bundle | Electron build | Preload exposes only typed APIs; no `process.env` access in renderer; Vite tree-shakes server-only code | §7.1, §21.6 |
| Secrets in logs | Pino logger | Redaction paths: `req.headers.authorization`, `*.password`, `*.passwordHash`, `*.token`, `*.mfaSecret`, `*.privateKeyPem` | §21.7 |
| License private key in client artifact | Build pipeline | Private key NEVER in Electron, on-premise backend, or public repo; only public key embedded; key file chmod 600 | §12.4 |
| Share link password brute-forced | Share API | scrypt(salt + 16384 iterations) password hash; rate limit on share access; max view count enforced | §9.11 |
| Share link token guessed | Share API | 32-byte cryptographically random token (64 hex chars) | §9.11 |
| WebSocket event leaks other tenant's data | Socket.IO rooms | Rooms are tenant-scoped (`tenant:{tid}`); user joins only their own tenant room; event payloads validated with Zod | §13.3 |
| Error message reveals internal state | Exception filter | `AllExceptionsFilter` returns stable `messageKey` (e.g. `errors.UNAUTHENTICATED`), never raw stack traces; client renders via `t(messageKey)` | §14.2, §21.5 |
| OCR/AI content sent to external provider without consent | AI Gateway | Tenant-configurable `externalAiAllowed` flag; `localOnlyMode` for restricted classifications; model provider disclosed in settings | §11.11, §11.15 |
| Document metadata leaked via timing side-channel | Document API | `getById` returns 404 (not 403) for non-existent documents in other tenants; uniform response time | §9.2 |

### 5. Denial of Service

| Threat | Surface | Mitigation | Spec |
|--------|---------|------------|------|
| Brute-force login | Auth API | Per-user lockout (5 attempts → 15min); global rate limit (10/min for auth); bcrypt(12) slows attempts | §21.2, §21.5 |
| API flood | REST API | Global rate limit (200/min per IP+auth); Nginx rate limit (10 req/s burst 20); per-tenant quotas | §21.5, §22.2 |
| WebSocket event flood | Socket.IO | Per-socket rate limit; event throttling; connection limits; reconnection backoff | §13.5, §22.3 |
| Large upload exhausts storage | Upload API | `UPLOAD_MAX_SIZE_BYTES` env (5GB default); file type whitelist; tenant storage quota enforced; streaming upload (not buffered) | §9.3, §21.5 |
| Unbounded list query | List endpoints | Cursor-based pagination with max limit (100); server-side filtering/sorting with whitelisted fields; no OFFSET | §14.3, §22.1 |
| AI request flood | AI chat endpoint | Per-user rate limit (20/min, configurable); daily quota (200/day); tenant-level enable/disable | §11.6, §11.15 |
| Search query DoS | Search API | Rate-limited; heavy queries cached where safe; OpenSearch has its own resource limits | §9.10, §22.1 |
| BullMQ queue overflow | Background workers | Max attempts (3) + dead-letter queue; backpressure handling; idempotent workers | §22.2 |
| Disk exhaustion from audit logs | Audit table | Audit retention policy (configurable); async export for large datasets; index optimization | §9.12, §22.1 |
| Prompt injection with huge input | AI prompt injection detector | 16KB input size limit; detection runs before LLM call | §11.9 |
| Redis memory exhaustion | Redis | `maxmemory-policy: allkeys-lru` (512MB limit); AOF persistence; separate connection for Socket.IO adapter | §22.2 |

### 6. Elevation of Privilege

| Threat | Surface | Mitigation | Spec |
|--------|---------|------------|------|
| Regular user accesses admin endpoint | REST API | `@Roles('admin')` decorator + `TenantGuard` role check; UI hiding is not authorization | §21.3 |
| User escalates own role | User update API | Role assignment is admin-only (`@Roles('admin', 'user-manager')`); self-update cannot change roles | §9.1, §21.3 |
| AI tool call bypasses authorization | AI tool layer | Each tool independently checks `requiredPermission` + `requiresLicenseModule` + role; tool catalog is whitelist (not blacklist) | §11.5, §11.19 |
| AI executes destructive action | AI action confirmation | 7 destructive action types blocked in `confirmAction`; non-destructive actions return `client_action_required` (client executes via own authenticated API) | §11.4 |
| Step-up auth bypassed for sensitive op | License server | `StepUpGuard` verifies `X-Step-Up-Token` header independently; step-up JWT TTL 5min; in-memory only (not persisted) | §12.10, §21.2 |
| License state forced to `valid` | License guard | State computed from signature verification + expiry + fingerprint; no env override; cached 30s but recomputed from DB | §4.4, §27.4 |
| Tenant admin disables audit | Admin API | Audit is not disableable; audit events written on every sensitive operation regardless of admin preference | §9.12, §21.7 |
| Workflow AI draft auto-executed | Workflow engine | AI drafts marked `isAiDraft: true`; cannot be published without `humanReviewed: true`; high-risk actions require explicit confirmation | §9.8, §9.14 |
| Legal hold removed without authorization | Legal hold API | Release is admin-only (`@Roles('admin')`); requires `reason`; audited; `Document.legalHoldActive` maintained transactionally | §9.7, §27.3 |
| Classification downgraded silently | Classification API | Downgrades require `reason` + permission; legal hold blocks classification change; all changes audited + history recorded | §9.4 |

## Attack Surface Inventory

### Public-facing endpoints (highest risk)

| Endpoint | Auth | Risk | Mitigation |
|----------|------|------|------------|
| `POST /v1/auth/login` | None | Brute force, credential stuffing | Rate limit (10/min), lockout, bcrypt(12) |
| `POST /v1/auth/refresh` | Refresh token | Token theft | Refresh rotation, Redis revocation |
| `GET /v1/health/*` | None | Info disclosure | Returns minimal info (status only) |
| `GET /v1/crl` (license server) | None | CRL tampering | Signed CRL, signature verified by client |
| `POST /v1/activate/online` (license server) | API key | Unauthorized activation | Device fingerprint binding, device limit |
| `POST /v1/heartbeat` (license server) | API key | Fake heartbeat | Deployment must match existing Activation |
| Marketing page routes | None | XSS, SEO spam | CSP, Next.js SSR, no user input rendered unsanitized |

### Authenticated endpoints (lower risk but larger surface)

All `/v1/*` endpoints (except public) require JWT + tenant scoping + license check. Risk is reduced but not eliminated — a compromised JWT grants the attacker the user's full permissions until the token expires or is revoked.

### Internal services (not exposed)

| Service | Port | Network | Risk |
|---------|------|---------|------|
| PostgreSQL | 5432 | Docker internal | Should NOT be exposed; firewall blocks |
| Redis | 6379 | Docker internal | Should NOT be exposed; firewall blocks |
| OpenSearch | 9200 | Docker internal | Should NOT be exposed; firewall blocks |
| MinIO | 9000 | Docker internal | Console (9001) should be IP-restricted |
| Backend (direct) | 4000 | Docker internal | Only via Nginx reverse proxy |
| Worker | — | Docker internal | No HTTP listener |

## Assumptions

1. The on-premise server runs in a physically and network-secured data center
2. Docker host OS is patched and hardened (CIS benchmark or equivalent)
3. TLS certificates are valid and not expired
4. Database credentials are not shared across environments
5. Backups are encrypted at rest
6. The license signing private key is stored in a KMS/HSM or chmod-600 file with restricted access
7. Electron app is distributed via signed installers from a trusted update server
8. Administrators are trained not to share credentials
9. Network segmentation separates the Docker internal network from the public internet
10. Log aggregation is configured (ELK, Loki, Datadog, etc.)

## Open Questions

1. **Hardware security module (HSM)**: For high-value deployments, should the license signing key be stored in an HSM rather than a PEM file? The current implementation supports both (the `SigningKeyService` has a KMS/HSM integration stub).

2. **Network segmentation**: Should the on-premise backend be deployed in a network zone with no outbound internet access (fully air-gapped)? The current implementation supports both online and offline modes.

3. **Database row-level security (RLS)**: Should PostgreSQL RLS be enabled as defense-in-depth alongside the application-level tenant scoping? The Prisma schema includes `tenant_id` on all tenant-owned tables, but RLS is not automatically configured by migrations.

4. **Anomaly detection**: Should the audit log be analyzed for anomalous patterns (unusual access times, mass downloads, privilege escalation attempts)? The current implementation records all events but does not perform real-time anomaly detection.

5. **Key rotation cadence**: What is the recommended rotation cadence for JWT secrets, license signing keys, and webhook signing secrets? The current implementation supports rotation but does not enforce a schedule.

## Threat Model Review

This threat model should be reviewed:

- Annually (scheduled)
- After any major architecture change
- After any security incident
- Before deploying to a new environment (cloud, on-premise, hybrid)
- When new attack vectors emerge (e.g., new prompt injection techniques)

## Related Documents

- [Security Controls Matrix](SECURITY_CONTROLS.md) — mapping of threats to controls
- [Security Policy](SECURITY.md) — security model and implementation details
- [Architecture](ARCHITECTURE.md) — system design
- [Deployment Guide](DEPLOYMENT.md) — production deployment
