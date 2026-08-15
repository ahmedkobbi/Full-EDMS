# Architecture Decision Records (ADRs)

> Spec reference: §26.25 (Architecture Decision Records deliverable).
>
> ADRs capture the "why" behind architectural decisions. Each ADR follows the
> [Michael Nygard template](https://github.com/joelparkerhenderson/architecture-decision-record).

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [ADR-0001](adr/0001-electron-remote-backend.md) | Use Electron as desktop client connecting to remote on-premise backend | Accepted | 2026-08-15 |
| [ADR-0002](adr/0002-nestjs-fastify.md) | Use NestJS with Fastify adapter (not Express) | Accepted | 2026-08-15 |
| [ADR-0003](adr/0003-prisma-orm.md) | Use Prisma ORM for database access | Accepted | 2026-08-15 |
| [ADR-0004](adr/0004-asymmetric-license-signing.md) | Use Ed25519 (EdDSA) asymmetric signing for license artifacts | Accepted | 2026-08-15 |
| [ADR-0005](adr/0005-6-state-license-machine.md) | Use a 6-state license state machine with grace periods | Accepted | 2026-08-15 |
| [ADR-0006](adr/0006-hash-chained-audit.md) | Use hash-chained append-only audit log | Accepted | 2026-08-15 |
| [ADR-0007](adr/0007-mantine-v7.md) | Use Mantine v7 for enterprise UI | Accepted | 2026-08-15 |
| [ADR-0008](adr/0008-cursor-pagination.md) | Use cursor-based pagination (not offset) | Accepted | 2026-08-15 |
| [ADR-0009](adr/0009-bullmq-queues.md) | Use BullMQ for background job processing | Accepted | 2026-08-15 |
| [ADR-0010](adr/0010-socket-io-redis-adapter.md) | Use Socket.IO with Redis adapter for WebSocket scaling | Accepted | 2026-08-15 |
| [ADR-0011](adr/0011-zod-validation.md) | Use Zod for all input validation (single source of truth) | Accepted | 2026-08-15 |
| [ADR-0012](adr/0012-i18next-bundled-resources.md) | Use i18next with bundled resources (not HTTP backend) | Accepted | 2026-08-15 |
| [ADR-0013](adr/0013-permission-aware-ai-tools.md) | Use a permission-aware tool catalog for AI Assistant (not direct endpoint access) | Accepted | 2026-08-15 |
| [ADR-0014](adr/0014-neutral-arabic-flag.md) | Use neutral language indicator for Arabic (not a country flag) | Accepted | 2026-08-15 |
| [ADR-0015](adr/0015-system-theme-default.md) | Default to system theme (not hardcoded light or dark) | Accepted | 2026-08-15 |
| [ADR-0016](adr/0016-separate-licensing-server.md) | Keep licensing server as a separate NestJS app (not part of on-premise backend) | Accepted | 2026-08-15 |

## ADR Format

Each ADR contains:

- **Title**: Short noun phrase
- **Status**: Proposed / Accepted / Deprecated / Superseded
- **Context**: Why this decision is needed
- **Decision**: What was decided
- **Consequences**: Positive, negative, and neutral effects
- **Alternatives Considered**: Other options and why they were rejected
- **Spec Reference**: Master prompt section(s) this ADR implements
