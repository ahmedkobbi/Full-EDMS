# ADR-0005: Use a 6-state license state machine with grace periods

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §4.4 (License Failure Behavior)

## Context

Smart EDMS is deployed on-premise in regulated industries. License failures must balance two competing concerns:

1. **Commercial protection**: Unlicensed or expired deployments should not have full functionality
2. **Customer trust**: Sudden lockout could cause business disruption, data loss, or safety issues (e.g., a hospital cannot suddenly lose access to patient records)

A binary "valid / invalid" model is too crude — it either lets expired licenses run indefinitely (commercial risk) or locks users out immediately (customer trust risk).

## Decision

Use a **6-state license state machine**:

1. **`valid`** — full functionality according to entitlements
2. **`expiring_soon`** — full functionality + admin warnings + localized notifications
3. **`expired_grace`** — system remains available + prominent license warning + renewal required + all warnings audited
4. **`grace_exhausted`** — restricted read-only/export-only mode + new uploads/edits/shares/workflows blocked + legal hold + audit protections remain active
5. **`extended_remediation`** — admin-only remediation mode + general users blocked + admins can import/renew/remediate + data preserved + audit remains active
6. **`invalid`** — immediate restricted mode + admin-only or read-only + security alert + audit log + licensing server notified when online

### State transitions

```
valid → expiring_soon (within 30 days of expiry)
expiring_soon → expired_grace (past expiry, within grace period)
expired_grace → grace_exhausted (grace period elapsed)
grace_exhausted → extended_remediation (extended non-remediation threshold reached)
any state → invalid (signature invalid, revoked, or device mismatch)
```

### Implementation

- `computeLicenseState()` in `packages/license-core/src/state-machine.ts`
- Inputs: signature validity, revocation state, device match, environment match, current time vs issuedAt/expiresAt/gracePeriodDays, heartbeat failures
- `LicenseGuard` enforces the state on every non-public route
- Read-only mode (`grace_exhausted`): allows GET/HEAD/OPTIONS, blocks POST/PATCH/PUT/DELETE
- Admin-only mode (`extended_remediation`): only users with `admin` role can access; others get 503

## Consequences

### Positive

- No sudden lockout (customers have time to renew)
- Commercial protection (functionality degrades progressively)
- Customer trust (data is never destroyed; legal hold + audit always active)
- Auditable (every state transition logged)
- Localized (all user-visible messages via `t()`)
- Offline-capable (state computed from signed license payload, no internet needed)

### Negative

- More complex than binary model (6 states instead of 2)
- Requires careful testing of each state's behavior
- Grace period could be abused if too long (mitigated by `extended_remediation` after 30 days)

### Neutral

- The Guided Tour includes a License Tour explaining these states in non-alarming language (spec §4.4)
- The AI Assistant is disabled when not licensed (spec §11.16)

## Alternatives Considered

### Binary (valid / invalid)

- **Pros**: Simple
- **Cons**: Sudden lockout risks business disruption; no warning before expiry; harsh for honest customers with payment delays
- **Rejected because**: Spec §4.4 explicitly requires "enterprise-safe license failure model" with grace periods

### 3-state (valid / expiring / expired)

- **Pros**: Simpler than 6-state
- **Cons**: No distinction between "expired but in grace" and "expired and grace exhausted"; no admin-only remediation mode; either too lenient or too harsh
- **Rejected because**: Doesn't satisfy the nuanced requirements of spec §4.4

### Time-based with hard cutoff

- **Pros**: Very simple
- **Cons**: Sudden lockout at expiry; no remediation path
- **Rejected because**: Same as binary — doesn't satisfy spec §4.4
