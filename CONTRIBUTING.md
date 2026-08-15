# Contributing to Smart EDMS

Thank you for contributing to Smart EDMS. This document outlines the engineering standards all contributors must follow.

## Engineering Principles

Smart EDMS is engineered with the following priorities, in order (spec §33):

1. **Correctness** — the solution directly satisfies the stated requirement
2. **Security** — fail-closed, deny-by-default, audited
3. **Auditability** — every sensitive operation recorded
4. **Maintainability** — modular, readable, tested
5. **User trust** — premium, calm, non-alarmist UX
6. **Operational resilience** — graceful degradation, retries, observability
7. **Compliance readiness** — retention, legal hold, evidence packages
8. **Premium product experience** — Mantine v7, both light/dark themes polished
9. **Full multilingual quality** — 6 locales, RTL Arabic, native plural rules
10. **Flawless RTL Arabic support** — logical CSS properties, Mantine RTL
11. **Enterprise process standardization** — BPMN, CMMN, DMN
12. **Deployment flexibility** — on-premise, connected on-premise, hybrid
13. **Cryptographic and physical provenance** — C2PA, chain of custody
14. **Powerful backend performance** — pagination, indexing, caching, queues
15. **Scalable architecture** — stateless API, Redis adapter, BullMQ
16. **Human engineering ownership** — AI assists, humans decide
17. **Tamper-resistant licensing** — asymmetric signing, fail-closed verification
18. **Real-time WebSocket reliability** — Redis adapter, room scoping, reconnection
19. **Mantine v7 enterprise UI/UX quality** — design tokens, accessibility
20. **Strict use of `t()` for all internationalized text**

When in conflict, choose the higher-priority concern and explain the tradeoff in your PR.

## Code Quality

- TypeScript strict mode everywhere
- No `any` — use `unknown` and type guards for untrusted input
- Validate all external input with Zod
- Centralize error handling via the global exception filter
- Use dependency injection (NestJS) or clear module boundaries (frontend)
- Keep domain logic separate from transport concerns
- Avoid duplicated logic
- Write maintainable, readable code
- Use approved libraries only (check `package.json` of the relevant workspace)

## Mandatory Rules

### No Mock Data (spec §20)

- No mock document lists, users, tenants, licenses, audit logs, workflow instances, notifications, scanner devices, tour completion states, or AI responses presented as real
- No hardcoded customer names, license keys, activation codes, secrets, or fake metrics
- All UI data comes from real APIs, real WebSocket events, real configuration, real environment variables, real database records
- Demo mode (where it exists) is explicitly enabled, clearly labeled, isolated, and disabled by default in production

### No Hardcoded UI Strings (spec §16.3)

- Every user-facing string uses `t()` via `react-i18next` (frontend) or `i18next` (backend email templates)
- Translation keys live in `packages/i18n/resources/<locale>/`
- All 6 mandatory locales must have the key (CI validates this via `pnpm i18n:check`)

### Mantine v7 Only (spec §17, §27.5)

- Always use Mantine v7. Do NOT use v6 syntax.
- Use `@mantine/form` for complex forms
- Use `mantine-react-table` for enterprise data grids
- Use the centralized theme configuration (no inline color values)
- Use `t()` for every visible string
- Use locale-aware formatting for dates, times, numbers, and plurals
- Use Mantine RTL support for Arabic
- Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`)

### Database (spec §27.2)

- Use migrations only (`pnpm db:migrate`)
- Never mutate production schema manually
- Use transactions where consistency matters
- Use indexes intentionally
- Avoid N+1 query patterns
- Enforce constraints at database level where practical
- Use soft delete carefully and consistently
- Store localized fields as i18n keys, not as raw translated text

### Security (spec §27.3)

- Enforce authorization on every endpoint
- Enforce authorization on every WebSocket event
- Enforce authorization on every AI tool call
- Validate file uploads
- Sanitize filenames
- Avoid raw dynamic SQL
- Use signed URLs for object access
- Rate limit sensitive endpoints
- Log security failures
- Protect admin routes strongly
- Use approved crypto and auth libraries only

### Backend (spec §27.8)

- Every list endpoint must be paginated
- Every query-heavy feature must consider indexing
- Every sensitive endpoint must be rate limited
- Every external input must be validated
- Every heavy operation must be queued
- Every production feature must be observable
- Every license-sensitive operation must be audited
- Every WebSocket event must be authorized
- Every real-time room must be tenant-scoped
- Every AI tool call must be authorized and audited

## Pull Request Checklist

Before submitting a PR, verify:

- [ ] Code compiles (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test`)
- [ ] Format is correct (`pnpm format:check`)
- [ ] i18n keys exist in all 6 locales (`pnpm i18n:check`)
- [ ] No mock data introduced
- [ ] No hardcoded UI strings (grep for English text in `.tsx` files)
- [ ] New endpoints are paginated (if list endpoints)
- [ ] New endpoints are audited (via `@Audit()` decorator)
- [ ] New endpoints are authorized (via `@Roles()` or permission check)
- [ ] New endpoints are tenant-scoped (use `req.user.tid`, never path-supplied `tenantId`)
- [ ] New database fields have appropriate indexes
- [ ] Documentation updated (where applicable)
- [ ] No secrets in code (no API keys, passwords, private keys)

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(documents): add batch upload endpoint
fix(audit): correct hash chain on tenant boundary
chore(deps): bump @mantine/core to 7.13.0
docs(security): add threat model for AI prompt injection
refactor(license): extract state machine to @smart-edms/license-core
test(i18n): add ICU plural validation for Arabic
```

## Branching

- `main` — production-ready, tagged releases
- `develop` — integration branch for the next release
- Feature branches: `feat/<scope>-<description>` (e.g., `feat/documents-batch-upload`)
- Bugfix branches: `fix/<scope>-<description>`
- Hotfix branches: `hotfix/<scope>-<description>` (branch from `main`, merge to `main` + `develop`)

## Code Review

All PRs require at least one approval from a code owner. Sensitive areas (security, licensing, audit, AI) require two approvals.

Reviewers should verify:

- Spec compliance (cite the relevant section)
- Test coverage for new behavior
- No regressions in existing tests
- Accessibility (keyboard nav, screen reader, contrast)
- RTL correctness (logical CSS properties, no hardcoded left/right)
- Both light and dark themes work
- No performance regressions (N+1 queries, unbounded lists)

## Testing

### Required test types (spec §24.1)

- Unit tests
- Integration tests
- API tests
- WebSocket tests
- Electron IPC tests
- Licensing tests
- Authorization tests
- Multi-tenant isolation tests
- Workflow tests
- Audit integrity tests
- File pipeline tests
- Security regression tests
- Accessibility tests
- e2e tests for critical journeys
- i18n tests
- RTL tests
- Locale-specific formatting tests
- Pagination tests
- Rate limiting tests
- Queue retry tests
- License offline activation tests
- License heartbeat failure tests
- License revocation tests
- Guided tour tests
- AI assistant tests

### Critical test cases (spec §24.2)

Every PR that touches auth, tenant isolation, license, audit, or AI must include tests for:

- Tenant isolation (cross-tenant access denied)
- Authorization (deny-by-default works)
- License enforcement (fail-closed on invalid license)
- Audit integrity (hash chain verifies)
- AI authorization (prompt injection blocked, restricted document existence not leaked)

## Reporting Security Issues

**Do NOT open a public GitHub issue for security vulnerabilities.**

Email security@smart-edms.example with:

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Suggested fix (if any)

We acknowledge within 48 hours and provide a fix timeline within 7 days.
