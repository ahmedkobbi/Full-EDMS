# Smart EDMS — Security Controls Matrix

> Spec reference: §21 (Security Requirements), §26.13 (Security Controls Matrix deliverable).
>
> This matrix maps threats (from [THREAT_MODEL.md](THREAT_MODEL.md)) to security controls implemented in Smart EDMS, with the relevant spec section for each control.

## How to Read This Matrix

- **Threat Category**: STRIDE category (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- **Threat**: Specific attack scenario
- **Control**: Implemented mitigation
- **Implementation**: File / module / configuration where the control lives
- **Verification**: How to verify the control is working (test, endpoint, log query)
- **Spec**: Master prompt section reference

## 1. Authentication Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| Stolen JWT | Short access TTL (15min) | `apps/backend/src/config/environment.ts` `JWT_ACCESS_TTL_SECONDS=900` | Decode JWT, check `exp - iat` | §21.2 |
| Stolen JWT | Refresh token rotation | `apps/backend/src/modules/auth/auth.service.ts` `refresh()` issues new pair | Refresh twice, verify old refresh rejected | §21.2 |
| Stolen JWT | Revocation list | `apps/backend/src/modules/auth/auth.service.ts` `logout()` sets `jwt:revoked:<sha256>` in Redis; `JwtStrategy.validate()` checks it | Logout, then use old token → 401 | §21.2 |
| Brute-force login | Per-user lockout | `auth.service.ts` `incrementFailedLogin()` locks after 5 attempts for 15min | 5 failed logins, verify locked | §21.2 |
| Brute-force login | bcrypt(12) | `auth.service.ts` `bcrypt.hash(password, 12)` | Check `passwordHash` starts with `$2a$12$` | §21.2 |
| Brute-force login | Rate limit (auth) | `main.ts` `fastifyRateLimit` + Nginx `smart_edms_auth` zone (2 req/s) | 11 logins/min from same IP → 429 | §21.5 |
| Admin MFA bypass | TOTP required | `apps/license-server/src/modules/admin-auth/` — login issues MFA ticket, verifyMfa checks TOTP | Login without MFA code → `mfaRequired: true` | §12.10 |
| Admin MFA bypass | MFA ticket in Redis (not JWT) | `admin-auth.service.ts` `issueMfaTicket()` — 32-byte hex, 5min TTL | Verify ticket is opaque, not decodable | §12.10 |
| Admin MFA bypass | Step-up for sensitive ops | `stepUp()` re-verifies TOTP, 5min JWT, `StepUpGuard` checks `X-Step-Up-Token` | Revoke license without step-up → 403 | §12.10 |
| Fake on-premise backend | API key + activation code | `apps/license-server/src/security/api-key.guard.ts` | Call activation without API key → 401 | §12.7 |
| Electron renderer spoofing | contextIsolation + sandbox | `apps/electron/src/main/index.ts` `contextIsolation: true, nodeIntegration: false, sandbox: true` | Inspect BrowserWindow options | §7.1 |
| WebSocket unauth | Handshake JWT verification | `apps/backend/src/websocket/gateway.service.ts` `authenticateSocket()` | Connect without token → disconnected | §13.2 |

## 2. Authorization Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| Cross-tenant access | TenantGuard | `apps/backend/src/common/guards/tenant.guard.ts` — path `tenantId` must match JWT `tid` | Path `/v1/tenants/{otherTenantId}/users` → 403 | §9.2, §15.3 |
| Cross-tenant access | Prisma tenant scoping | All service methods use `where: { tenantId, ... }` | `test/tenant-isolation.test.ts` | §24.2 |
| Role escalation | `@Roles()` decorator | `apps/backend/src/common/decorators/roles.decorator.ts` + TenantGuard role check | Non-admin calling `/v1/admin/dashboard` → 403 | §21.3 |
| Role escalation | Self-update cannot change roles | `user.service.ts` `updatePreferences()` does not accept `roles` | PATCH `/v1/me/preferences` with `roles: ['admin']` → ignored | §9.1 |
| AI tool abuse | Tool catalog whitelist | `apps/backend/src/modules/ai/tool-catalog.ts` — 16 tools, each with `requiredPermission` + `requiresLicenseModule` | AI calling non-whitelisted tool → rejected | §11.5 |
| AI tool abuse | Independent tool authorization | Each tool's `execute()` re-checks permissions | AI without `audit.read` calling `audit.getRecentEvents` → 403 | §11.5, §11.19 |
| AI destructive action | 7 destructive types blocked | `ai.service.ts` `confirmAction()` — `delete`, `remove_legal_hold`, `downgrade_classification`, `revoke_license`, `disable_user`, `change_security_policy`, `delete_tenant_configuration` | Confirm destructive action → `blocked_destructive` | §11.4 |
| Unauthorized license import | Admin-only | `license.controller.ts` `@Roles('admin')` on `/v1/license/import` | Non-admin importing `.sedmslic` → 403 | §12.8 |
| Legal hold removal | Admin-only + reason | `legal-hold.controller.ts` `@Roles('admin')` + `reason` required | Release without reason → 400 | §9.7 |
| Classification downgrade | Reason required for downgrade | `classification.service.ts` `assign()` checks `sensitivityLevel` delta | Downgrade without reason → 400 | §9.4 |
| Step-up bypass | StepUpGuard | `apps/license-server/src/security/step-up.guard.ts` verifies `X-Step-Up-Token` | Revoke without step-up → 403 | §12.10 |

## 3. Encryption Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| Network interception | TLS 1.2+ | Nginx `ssl_protocols TLSv1.2 TLSv1.3` | `openssl s_client -connect host:443` | §21.4 |
| Data at rest (DB) | Disk encryption (LUKS/cloud) | Deployment responsibility | Check cloud provider encryption settings | §21.4 |
| Data at rest (object storage) | MinIO bucket encryption | `infra/docker/docker-compose.yml` MinIO config | `mc encrypt info local/smart-edms-documents` | §21.4 |
| JWT secret compromise | 64-char minimum in prod | `apps/backend/src/config/environment.ts` `superRefine` | Set 32-char JWT_SECRET in prod → startup fails | §21.6 |
| License signing key | Asymmetric (Ed25519/ES256) | `packages/license-core/src/keys.ts` `generateSigningKeyPair()` | Verify `.sedmslic` signature algorithm | §12.4 |
| License signing key | Private key never in client | `infra/docker/Dockerfile.api` — no private key mounted | `docker exec api ls /run/secrets/` shows only public key | §12.4 |
| Share link password | scrypt (16384 iterations) | `apps/backend/src/modules/share/share.service.ts` `hashPassword()` | Verify `passwordHash` starts with `scrypt$` | §9.11 |
| Share link token | 32-byte random | `share.service.ts` `randomBytes(32).toString('hex')` | Token is 64 hex chars | §9.11 |
| Document checksum | SHA-256 | `apps/backend/src/common/storage.service.ts` `uploadStream()` computes hash during upload | Verify `DocumentVersion.checksum` matches downloaded file | §9.3, §9.6 |

## 4. Input Validation Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| SQL injection | Prisma parameterized queries | All DB access via Prisma (no raw SQL) | Grep for `$queryRaw` — only used in health check with literal `SELECT 1` | §21.5, §27.3 |
| XSS | React auto-escaping | No `dangerouslySetInnerHTML` in codebase | Grep for `dangerouslySetInnerHTML` | §21.5 |
| XSS | Strict CSP | `apps/backend/src/main.ts` Helmet CSP + Electron `onHeadersReceived` | Check `Content-Security-Policy` header | §21.5 |
| Path traversal | Filename sanitization | `apps/backend/src/common/storage.service.ts` `sanitizeFilename()` | Upload `../../../etc/passwd` → sanitized name | §9.3, §27.3 |
| File type abuse | MIME whitelist | `apps/backend/src/modules/document/dto.ts` `uploadInitSchema` | Upload `.exe` → rejected | §9.3, §21.5 |
| Oversized upload | Size limit | `main.ts` `fastifyMultipart` 5GB limit + env `UPLOAD_MAX_SIZE_BYTES` | Upload 6GB → 413 | §21.5 |
| Oversized request body | Body limit | `main.ts` FastifyAdapter `bodyLimit: 50MB` | POST 51MB JSON → 413 | §21.5 |
| Malformed JSON | Fastify parser | Fastify rejects invalid JSON automatically | POST `{invalid` → 400 | §14.2 |
| AI prompt injection | 20-regex detector | `apps/backend/src/modules/ai/prompt-injection.ts` | POST "ignore previous instructions" → blocked | §11.9 |
| AI oversized input | 16KB limit | `prompt-injection.ts` checks input length | 17KB input → blocked | §11.9 |
| Zod validation | All API boundaries | `apps/backend/src/modules/*/dto.ts` + `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` | POST extra fields → 400 | §14.1, §27.1 |
| WebSocket payload | Zod discriminated union | `packages/schemas/src/websocket.ts` `WebSocketEventSchema` | Emit invalid event → rejected | §13.3 |

## 5. Audit & Integrity Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| Audit tampering | Hash chain | `apps/backend/src/common/audit.service.ts` — `eventHash = sha256(previousHash \| canonical)` | `GET /v1/audit/verify-chain` | §9.12 |
| Audit deletion | Append-only (no UPDATE/DELETE in code) | `audit.service.ts` only calls `create()` | Grep for `auditEvent.update` / `delete` | §9.12, §27.3 |
| Audit gap | `@Audit()` decorator + AuditInterceptor | Every sensitive controller method decorated | Grep for `@Audit(` coverage | §9.12 |
| Audit gap | Global AuditInterceptor | `apps/backend/src/app.module.ts` `APP_INTERCEPTOR` | Check audit table after any mutation | §9.12 |
| Legal hold bypass | `Document.legalHoldActive` checked in soft-delete | `document.service.ts` `softDelete()` throws if `legalHoldActive` | Delete document under hold → 403 | §9.7 |
| Version immutability | `DocumentVersion.isImmutable = true` | Prisma schema — no UPDATE path in code | Grep for `documentVersion.update` | §9.6 |
| Audit sequence | Per-tenant monotonic BigInt | `audit.service.ts` `lastSequenceByTenant` map + DB `sequenceNumber` | Verify sequence is monotonic | §9.12 |

## 6. Network & Infrastructure Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` | Helmet + Nginx | Check response headers | §21.5 |
| MIME sniffing | `X-Content-Type-Options: nosniff` | Helmet + Nginx | Check response headers | §21.5 |
| Protocol downgrade | HSTS (1 year, preload, includeSubDomains) | Nginx `add_header Strict-Transport-Security` | `curl -I https://host` | §21.5 |
| CORS abuse | Explicit allowlist | `main.ts` `app.enableCors({ origin: CORS_ORIGINS.split(',') })` | Check `Access-Control-Allow-Origin` | §21.5 |
| Open redirect | Navigation restricted | Electron `will-navigate` restricts to `file://` + `localhost:*` | Navigate to `https://evil.com` → blocked | §7.1 |
| Popup abuse | All new windows denied | Electron `setWindowOpenHandler(() => ({ action: 'deny' }))` | `window.open()` → blocked | §7.1 |
| WebSocket upgrade abuse | Nginx WS upgrade config | `infra/nginx/nginx.conf` `/realtime/` location | Connect via WSS → works; via WS → blocked | §23.2 |
| Rate limit bypass (IP rotation) | Per-IP + per-auth rate limit | `main.ts` `keyGenerator: (req) => ${req.ip}:${auth.slice(0,32)}` | Same user from 2 IPs → both count | §21.5 |
| Internal service exposure | Docker network isolation | `infra/docker/docker-compose.yml` `smart-edms-net` bridge network | Ports 5432/6379/9200 not bound to host | §23.1 |

## 7. License Enforcement Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| License bypass | Fail-closed LicenseGuard | `apps/backend/src/common/guards/license.guard.ts` — `invalid` state → 503 | Set license state to invalid → all routes 503 | §4.4, §27.4 |
| License bypass | No bypass flags | No env var or code path that disables license check | Grep for `SKIP_LICENSE` / `BYPASS_LICENSE` | §27.4 |
| License tampering | Signature verification on import | `license.service.ts` `importSedmslic()` → `verifyLicenseArtifact()` | Tampered `.sedmslic` → rejected | §12.4, §12.8 |
| Device mismatch | Fingerprint binding | `license.service.ts` checks `payload.deploymentFingerprint === computed hash` | Import on wrong device → rejected | §12.4 |
| Clock rollback | Heartbeat tracks failures | `computeLicenseState()` uses `heartbeatFailures` counter | Skip heartbeats → state degrades | §12.9 |
| Grace period abuse | 6-state machine | `packages/license-core/src/state-machine.ts` | Expired + grace exhausted → read-only mode | §4.4 |
| AI used without license | LicenseRequired decorator | `ai.controller.ts` `@LicenseRequired({ module: 'ai-assistant', failClosed: true })` | Call AI without license → `AI_NOT_LICENSED` | §11.16 |
| AI used without license | Bubble hidden in UI | `apps/electron/src/renderer/components/ai/AiAssistantBubble.tsx` checks license state | Unlicensed → bubble not rendered | §11.16, §11.20 |
| License revocation | CRL distribution | `apps/license-server/src/modules/revocation/` signs `.sedmscrl` | Fetch CRL, verify signature, check revoked ID | §12.4 |

## 8. Electron Security Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| Renderer → Node access | `nodeIntegration: false` | `apps/electron/src/main/index.ts` | `window.require` in renderer → undefined | §7.1 |
| Renderer → Node access | `contextIsolation: true` | Same | `window.process` in renderer → undefined | §7.1 |
| Renderer → Node access | `sandbox: true` | Same | Renderer has no Node globals | §7.1 |
| Preload API abuse | Minimal typed bridge | `apps/electron/src/main/preload.ts` — 7 functions via `contextBridge` | `Object.keys(window.smartEdms)` → 7 keys | §7.1 |
| Secret in localStorage | safeStorage (OS keychain) | `preload.ts` `saveCredentials()` / `getCredentials()` use `safeStorage.encryptString()` | `localStorage.getItem('jwt')` → null | §7.1, §21.6 |
| Unsigned update | Signature verification | `apps/electron/src/main/auto-updater.ts` `autoUpdater.signt` + `autoDownload: false` | Tampered update → not applied | §7.1, §23.4 |
| Webview insecurity | `will-attach-webview` strips prefs | `main/index.ts` | Inject webview with `nodeIntegration` → stripped | §7.1 |
| DevTools in prod | Disabled unless admin-enabled | `main/index.ts` `webPreferences.devTools: false` (production) | F12 in production → no-op | §7.1 |
| ASAR tampering | Integrity check (macOS) | `electron-builder.yml` `asarIntegrity: true` | Modify ASAR → app refuses to start | §7.1 |

## 9. Privacy & Data Minimization Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| PII in logs | Pino redaction | `app.module.ts` `LoggerModule` `redact.paths` | Login, check log → password redacted | §21.7 |
| AI content in logs | Content hash, not full content | `ai.service.ts` stores `contentHash` (sha256) + `contentSummary` (truncated 500 chars) | Check `assistant_messages` table | §11.10, §11.14 |
| AI over-collection | Tool returns minimal fields | Each tool's `execute()` returns only necessary fields | `documents.getSummary` returns summary, not full content | §11.10 |
| Unnecessary audit metadata | Audit excludes sensitive content | `audit.service.ts` records `metadata` with non-sensitive context only | Check audit event — no document content | §9.12 |
| Tour analytics PII | Aggregate counts only | `tour.service.ts` admin analytics returns counts, no user IDs | `GET /v1/admin/tours/analytics` → no PII | §10.15 |
| Machine fingerprint | Salted SHA-256 | `packages/license-core/src/fingerprint.ts` — never stores raw hostname/MAC | Check `LicenseLocalState.fingerprintHash` | §12.6, §21.7 |
| AI training on customer content | Configurable consent | `AssistantSettings` — no training flag; external provider disclosure required | Check tenant settings | §11.11, §11.15 |

## 10. Availability Controls

| Threat | Control | Implementation | Verification | Spec |
|--------|---------|----------------|--------------|------|
| API flood | Rate limit (200/min global) | `main.ts` + Nginx | 201st request/min → 429 | §21.5, §22.2 |
| Queue overflow | Max attempts + dead-letter | BullMQ config in worker modules | Check `failed` queue | §22.2 |
| N+1 queries | Prisma `include` / `select` | All list endpoints use explicit includes | Enable Prisma query log, check for repeated queries | §22.1, §27.2 |
| Unbounded list | Cursor pagination (max 100) | All `list()` methods enforce `limit ≤ 100` | Request `?limit=10000` → capped at 100 | §14.3, §22.1 |
| DB connection exhaustion | Prisma connection pool | Prisma default pool (10 connections) | Monitor `pg_stat_activity` | §22.1 |
| Redis memory exhaustion | `maxmemory-policy: allkeys-lru` (512MB) | `infra/docker/docker-compose.yml` Redis command | `redis-cli INFO memory` | §22.2 |
| Worker failure | Graceful shutdown | `worker.ts` SIGTERM/SIGINT handlers | Kill worker, verify in-progress jobs complete | §22.2, §27.8 |
| Health check gap | `/v1/health/ready` (DB + Redis) | `apps/backend/src/modules/health/health.controller.ts` | `curl /v1/health/ready` | §22.2, §27.8 |

## Control Coverage Summary

| STRIDE Category | Controls Implemented | Critical Gaps |
|----------------|---------------------|---------------|
| Spoofing | 11 | None |
| Tampering | 9 | None |
| Repudiation | 5 | None |
| Information Disclosure | 13 | None |
| Denial of Service | 11 | None |
| Elevation of Privilege | 10 | None |

**Total: 59 security controls implemented across 10 categories.**

## Verification Cadence

| Control Type | Verification Frequency |
|-------------|----------------------|
| Authentication | Each release (automated tests) |
| Authorization | Each release (tenant isolation tests) |
| Encryption | Quarterly (TLS scan, key rotation review) |
| Input validation | Each release (CI runs Zod schema tests) |
| Audit integrity | Daily cron (`/v1/audit/verify-chain`) |
| Network | Monthly (port scan, header check) |
| License enforcement | Each release (license-enforcement.test.ts) |
| Electron security | Each release (E2E tests) |
| Privacy | Quarterly (log audit) |
| Availability | Continuous (monitoring + alerting) |
