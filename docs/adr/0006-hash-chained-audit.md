# ADR-0006: Use hash-chained append-only audit log

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §9.12 (Audit, Evidence, Provenance), §21.7 (Logging and Monitoring)

## Context

Smart EDMS is deployed in regulated industries where audit logs are legally significant. Requirements:

1. **Tamper-evident**: Any modification to an audit event must be detectable
2. **Append-only**: No UPDATE or DELETE operations on audit events
3. **Verifiable**: A compliance officer must be able to verify the chain integrity
4. **Performant**: Audit writes must not become a bottleneck
5. **Tenant-scoped**: Each tenant has an independent chain

## Decision

Use a **hash-chained append-only audit log**:

- Each audit event has: `sequenceNumber` (per-tenant monotonic BigInt), `previousHash` (hash of the previous event), `eventHash` (SHA-256 of the canonical event including `previousHash`)
- `eventHash = sha256(previousHash | canonicalEvent)`
- The first event in a tenant's chain has `previousHash = null`
- Verification: walk the chain, recompute each `eventHash`, verify it matches

### Implementation

- `AuditService` in `apps/backend/src/common/audit.service.ts`
- `audit_events` table in PostgreSQL with `sequence_number BIGINT`, `previous_hash VARCHAR(128)`, `event_hash VARCHAR(128)`
- `record()` method: loads last hash from in-memory cache, computes new hash, writes row
- `verifyHashChain()` method: walks the chain, recomputes hashes, reports any broken links
- Periodic verification: `GET /v1/audit/verify-chain` endpoint

### Canonicalization

Before signing, the event is canonicalized using RFC 8785-like JSON canonicalization:

- Object keys sorted lexicographically (recursive)
- No insignificant whitespace
- UTF-8 encoding
- No duplicate keys

This ensures the same event always produces the same hash, regardless of JSON serialization order.

## Consequences

### Positive

- Tamper-evident (modifying any event breaks the chain at that point)
- Append-only by design (no UPDATE/DELETE code paths)
- Verifiable (compliance officers can run `verifyHashChain()` anytime)
- Tenant-independent (each tenant has its own chain — no cross-tenant leakage)
- Forensic value (broken chain pinpoints exactly where tampering occurred)
- Court-admissible (hash chaining is a well-established evidence technique)

### Negative

- Slight write overhead (hash computation + previous hash lookup)
- In-memory last-hash cache must be rehydrated on startup (one DB query per tenant)
- Cannot "fix" a tampered event without breaking the chain (by design — tampering is detectable)
- Chain breaks if the DB is restored from a backup that doesn't include the latest events (mitigated by backup procedures)

### Neutral

- The chain does not use a Merkle tree (simpler, but O(n) verification instead of O(log n) — acceptable for typical audit log sizes)
- For high-compliance deployments, the audit table should be backed up to write-once storage (S3 Object Lock, WORM tape)

## Alternatives Considered

### Plain append-only (no chaining)

- **Pros**: Simpler; faster writes
- **Cons**: Tampering is only detectable by comparing to external backups; an attacker with DB access can modify rows silently
- **Rejected because**: Doesn't satisfy "tamper-evident" requirement

### Merkle tree

- **Pros**: O(log n) verification; compact proofs
- **Cons**: More complex; requires tree maintenance (rebalancing); overkill for the typical audit log size
- **Rejected because**: Hash chaining is simpler and sufficient for Smart EDMS scale

### Blockchain (distributed ledger)

- **Pros**: Decentralized tamper resistance
- **Cons**: Overkill for a single-tenant on-premise deployment; requires consensus; complex; slow; expensive
- **Rejected because**: Smart EDMS is on-premise — there's no multi-party consensus need

### Signed audit receipts (each event individually signed)

- **Pros**: Each event is independently verifiable
- **Cons**: Doesn't detect insertion/deletion (an attacker could insert a fake event with a valid signature between two real events)
- **Rejected because**: Hash chaining detects insertion/deletion via the `previousHash` link
