# ADR-0003: Use Prisma ORM for database access

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §7.2 (NestJS On-Premise Backend), §27.2 (Database Rules)

## Context

Smart EDMS requires a type-safe, migration-friendly ORM for PostgreSQL. The spec lists "Prisma or Drizzle ORM" as options.

## Decision

Use **Prisma ORM** (`@prisma/client` + `prisma` CLI).

## Consequences

### Positive

- Type-safe queries (no raw SQL strings)
- Schema-first design (single source of truth in `schema.prisma`)
- Built-in migrations (`prisma migrate`)
- Excellent TypeScript inference (no manual types needed)
- Parameterized queries (SQL injection protection by default)
- Good NestJS integration via `PrismaService` wrapper
- Multi-tenant scoping is straightforward (`where: { tenantId, ... }`)

### Negative

- Larger generated client (~5MB)
- Less control over query optimization (mitigated by `select` / `include` for field-level control)
- N+1 queries possible if not careful (mitigated by code review + Prisma query log in dev)
- No native support for PostgreSQL RLS (must be done via raw SQL in migration)

## Alternatives Considered

- **Drizzle**: smaller, faster, but less mature; smaller ecosystem; more manual SQL
- **TypeORM**: active record pattern (we prefer repository pattern); more decorators; slower
- **Raw SQL (pg)**: maximum control but no type safety; high maintenance burden; SQL injection risk

## Spec Reference

§7.2 lists "Prisma or Drizzle ORM." Prisma was chosen for its maturity and type safety.
