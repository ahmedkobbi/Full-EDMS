# Smart EDMS — Security Model

> Spec reference: §21 (Security Requirements), §25 (Prohibited Actions).

## Security Principles

Smart EDMS follows **Zero Trust** principles:

1. **Network is not inherently trusted** — every request is authenticated and authorized
2. **Users and devices are continuously verified** — JWT + device fingerprint + tenant scoping
3. **Every request is authenticated and authorized** — no implicit trust
4. **Least privilege enforced by default** — deny-by-default RBAC + ABAC
5. **Sessions and tokens are short-lived** — access tokens 15min, refresh tokens 30 days, revocable
6. **Privileged access tightly controlled** — admin requires MFA, sensitive ops require step-up auth
7. **AI tool access explicitly scoped** — AI tools are independently authorized, audited, and rate-limited

## Authentication

### Password policy

- bcrypt with 12 rounds (configurable via `BCRYPT_ROUNDS`)
- Minimum 8 characters (enforced via Zod schema)
- Failed login attempts tracked per user
- Account locked after 5 failed attempts (15-minute lockout)
- Lockout audited as `auth.account.locked`

### MFA

- TOTP via `otplib` (RFC 6238)
- Required for admin roles
- Optional for other roles (recommended)
- Backup codes generated on enrollment
- MFA enrollment protected (requires recent login)

### Session management

- Access tokens: 15min TTL (configurable)
- Refresh tokens: 30 days TTL (configurable)
- Both are JWTs with `type: 'access'` or `type: 'refresh'` claim
- Refresh tokens stored as SHA-256 hash in `sessions` table
- Revocation list in Redis (`jwt:revoked:<sha256(token)>`) with TTL matching token expiry
- Concurrent session controls (configurable per tenant)

### Step-up authentication

Required for sensitive operations:

- License revocation
- Signing key rotation
- API key deletion
- Tenant-wide policy changes
- User role escalation

Step-up tokens are short-lived (5 minutes) and stored only in memory on the client.

## Authorization

### Deny-by-default

- Every endpoint requires explicit authentication (no anonymous access except `@Public()` routes)
- Every endpoint runs through `TenantGuard` which enforces tenant scoping
- Role checks via `@Roles('admin', 'user-manager')` decorator
- UI hiding is **not** a substitute for server authorization (spec §21.3)

### RBAC + ABAC

- **RBAC**: roles like `admin`, `user-manager`, `records-manager`, `security-officer`, `auditor`, `workflow-designer`, `it-administrator`, `end-user`
- **ABAC**: contextual rules like "user can only edit documents they created" or "user can only approve workflows where they're the assignee"

### Tenant isolation

- Every tenant-owned record carries `tenant_id`
- All Prisma queries scoped by `tenantId` from JWT
- Path-supplied `tenantId` that differs from JWT `tid` → 403 FORBIDDEN
- Cross-tenant access audited as `result: deny`
- Row-level security recommended at PostgreSQL level

### AI tool authorization

Every AI tool call:
1. Validates the tool is in the tenant's `allowedTools` list
2. Validates the user's role is in the tool's `requiredRoles`
3. Validates the user has the specific permission for the resource (e.g., `documents.read` for `documents.getSummary`)
4. Validates the license entitlement for the tool's `requiresLicenseModule` (e.g., `ai-assistant` for all AI tools)
5. Records an `AssistantToolInvocation` audit row
6. Records a global `AuditEvent` with code `ai.tool_invoked`

## Encryption

### In transit

- TLS 1.2 minimum, TLS 1.3 preferred
- HSTS with preload (1 year max-age, includeSubDomains)
- Nginx terminates TLS; internal traffic between containers is plaintext (Docker network isolation)
- WebSocket Secure (WSS) for real-time

### At rest

- PostgreSQL: enable disk encryption (LUKS or cloud-managed)
- Object storage (MinIO/S3): enable bucket encryption (SSE-S3 or SSE-KMS)
- Redis: enable disk encryption for AOF persistence
- Backups: encrypt before sending to off-site storage

### Envelope encryption (recommended for high-sensitivity deployments)

- Per-document data encryption keys (DEKs)
- DEKs wrapped by tenant master keys (KEKs)
- KEKs stored in KMS/HSM
- Key rotation: rotate KEKs annually; re-wrap DEKs without re-encrypting document content

### License signing

- Asymmetric cryptography: Ed25519 (EdDSA) or ECDSA P-256 (ES256)
- Private key: never embedded in client, on-premise backend, or public repo
- Public key: embedded in on-premise backend (read from `LICENSE_PUBLIC_KEY_PATH` env)
- Key IDs (kid): SHA-256 of public key SPKI, first 16 hex chars
- Key rotation: new SigningKey record, old key signs one last CRL, new key signs all new licenses

## Secrets Management

- Secrets stored in environment variables or secret manager (Vault, AWS Secrets Manager, etc.)
- NEVER in Git (`.gitignore` excludes `.env*`, `*.pem`, `*.key`)
- NEVER in logs (Pino redacts `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.passwordHash`, `*.token`, `*.mfaSecret`)
- NEVER in frontend bundles (Electron renderer has no access to Node.js APIs; preload only exposes minimal typed APIs)
- NEVER in Electron local storage (JWT stored in `safeStorage` which uses OS keychain)

## Web and API Security

| Control | Implementation |
|---------|----------------|
| CSRF | Stateless JWT in Authorization header (not cookies) — CSRF not applicable |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| CORS | Restricted to `CORS_ORIGINS` env (comma-separated allowlist) |
| CSP | Strict: `default-src 'self'; script-src 'self'; object-src 'none'` |
| HSTS | 1 year, includeSubDomains, preload |
| Secure cookies | N/A (JWT in Authorization header) |
| XSS | React auto-escaping + CSP + no `dangerouslySetInnerHTML` |
| SQL injection | Prisma parameterized queries — no raw SQL |
| SSRF | Outbound HTTP only to whitelisted licensing server + AI provider URLs |
| Rate limiting | Global 200/min, auth 10/min, AI 20/min (configurable) |
| Brute force | Per-user lockout after 5 failed logins |
| Input validation | Zod schemas on every API boundary |
| Output encoding | React auto-escaping for HTML; JSON responses for API |
| Secure headers | Helmet + Nginx defense-in-depth |
| Request size limits | 50MB JSON body, 5GB multipart file |
| API abuse | Rate limit + per-tenant quotas |
| WebSocket abuse | Per-socket rate limit, event validation, room authorization |
| AI prompt injection | Heuristic detection (20 regex patterns) + tool input validation + system prompt isolation |

## Electron Security

| Control | Implementation |
|---------|----------------|
| `contextIsolation` | `true` |
| `nodeIntegration` | `false` |
| `sandbox` | `true` |
| `preload` | Only minimal typed APIs via `contextBridge` (7 functions) |
| `remote` module | Disabled |
| `eval` | Forbidden by CSP |
| Arbitrary remote HTML | Forbidden by navigation restrictions |
| CSP | Strict, both at network layer (`onHeadersReceived`) and document layer (`<meta>`) |
| Navigation | Restricted to `file://` + `localhost:*` |
| Popups | `setWindowOpenHandler(() => ({ action: 'deny' }))` blocks all new windows |
| Webview security | `will-attach-webview` strips insecure preferences |
| Secrets | `safeStorage` (OS keychain) — never localStorage |
| Auto-update signature | `electron-updater` with `autoDownload: false`; signature fails closed |
| ASAR integrity | Validated on macOS |
| DevTools | Disabled in production unless explicitly enabled by secure admin setting |

## Audit and Integrity

### Append-only audit log

- Every sensitive operation audited
- Audit events stored in `audit_events` table (no UPDATE/DELETE in code paths)
- Hash-chained: each event's `eventHash` = sha256(`${previousHash}|${canonicalEvent}`)
- Sequence numbers per tenant (monotonic BigInt)
- Tamper-evident: any modified event breaks the chain
- Periodic integrity verification: `GET /v1/audit/verify-chain`

### Audit event categories (spec §9.12)

- Authentication (login, logout, MFA, refresh, lockout)
- Authorization (allow/deny decisions)
- Access (read, download, preview, share access)
- Mutation (create, update, delete)
- Workflow (start, approve, reject, delegate, cancel)
- Sharing (link create, revoke, access)
- License (import, activate, heartbeat, revoke)
- Tour (start, complete, skip, dismiss — where tracked)
- AI (chat, tool invocation, action suggestion, action confirmation)
- Admin (user create/update/delete, role change, policy change, branding change)
- Security (classification change, legal hold, retention change)
- Locale changes (where tracked)

### Tamper-evidence

- `eventHash` recomputed on read; mismatch detected by `/v1/audit/verify-chain`
- Audit table should be backed up to write-once storage (S3 Object Lock, WORM tape) for high-compliance deployments
- Audit deletion forbidden unless legally required and strictly controlled

## AI Safety

### Prompt injection protection (spec §11.9)

- 20 regex patterns detecting: embedded instructions, secret extraction, SQL injection, endpoint abuse
- Document content treated as untrusted data (never as instructions)
- System prompts never revealed
- Tool calls independently authorized (not by AI request)
- AI output validated before rendering
- Sensitive actions require explicit user confirmation
- Restricted content not summarized without access

### Data minimization (spec §11.10)

- AI retrieves only the minimum data necessary
- No raw database dumps
- No raw SQL generation
- No bulk exports via AI (guided to official export workflow instead)
- Citations limited to accessible documents
- Restricted document existence not revealed unless tenant policy explicitly allows

### Destructive action prevention (spec §11.4)

AI NEVER silently performs:

- Classification downgrade
- Deletion
- Legal hold removal
- Access grant expansion
- Export of restricted content
- Workflow execution or approval bypass
- Final signature application
- Tour publishing or tour content activation
- AI assistant policy changes

Destructive actions are only **suggested** with a dedicated confirmation UI flow that requires explicit user action.

## Threat Model Summary

| Threat | Mitigation |
|--------|------------|
| Stolen JWT | Short TTL (15min), revocation list, refresh token rotation |
| Brute force login | Per-user lockout + rate limit |
| Credential stuffing | Rate limit + optional CAPTCHA (tenant-configurable) |
| Privilege escalation | RBAC + ABAC + tenant scoping + step-up auth |
| Cross-tenant access | Server-enforced `tenantId` scoping + negative tests |
| SQL injection | Prisma parameterized queries (no raw SQL) |
| XSS | React auto-escaping + strict CSP + no `dangerouslySetInnerHTML` |
| CSRF | Stateless JWT in Authorization header (not cookies) |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| Path traversal | Filename sanitization + opaque storage keys |
| Malware upload | File type whitelist + (recommended) ClamAV scan queue |
| License tampering | Asymmetric signing + fail-closed verification + audit |
| License bypass | No hidden bypass flags; all state transitions audited |
| AI prompt injection | Heuristic detection + tool input validation + system prompt isolation |
| AI data exfiltration | Permission-aware tools + data minimization + audit |
| Audit tampering | Hash-chained + append-only + periodic verification |
| Insider threat | Step-up auth + dual control (recommended) + audit trail |
| Supply chain attack | `pnpm audit` in CI + CodeQL + pinned versions |
| Electron renderer compromise | `contextIsolation: true` + `sandbox: true` + preload bridge |
| Auto-update attack | `electron-updater` signature verification (fails closed) |
| Secret leakage | Pino redaction + `.gitignore` + safeStorage |

## Incident Response

1. **Detect**: monitor audit logs for `result: deny` spikes, license state changes, AI prompt injection flags
2. **Contain**: revoke affected sessions via `POST /v1/auth/logout`, suspend affected users
3. **Investigate**: query audit log by user/IP/correlation ID, verify hash chain integrity
4. **Remediate**: rotate compromised credentials, apply patches, restore from backup if needed
5. **Communicate**: notify affected users, regulators (if required), law enforcement (if criminal)
6. **Post-mortem**: document timeline, root cause, lessons learned, preventive controls

## Security Controls Matrix

See [`docs/SECURITY_CONTROLS.md`](SECURITY_CONTROLS.md) for the full security controls matrix mapping threats to controls to spec sections.
