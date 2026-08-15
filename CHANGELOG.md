# Changelog

All notable changes to Smart EDMS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Documentation (commit `4a9fa04`)

- **Threat Model** (`docs/THREAT_MODEL.md`) — STRIDE analysis across 6 threat categories, 59 controls, attack surface inventory
- **Security Controls Matrix** (`docs/SECURITY_CONTROLS.md`) — 59 controls in 10 categories with implementation + verification
- **API Specification** (`docs/API_SPECIFICATION.md`) — ~130 endpoints (EDMS + license-server) with full schemas
- **WebSocket Event Specification** (`docs/WEBSOCKET_SPECIFICATION.md`) — all 26 server→client + 3 client→server events
- **Data Model** (`docs/DATA_MODEL.md`) — ~60 entities across EDMS + license-server with ERD descriptions
- **AI Tool Catalog** (`docs/AI_TOOL_CATALOG.md`) — 16 tools with input/output schemas + authorization matrix
- **Operations Runbook** (`docs/OPERATIONS_RUNBOOK.md`) — health, monitoring, incident response, backup, scaling
- **Licensing Operations Runbook** (`docs/LICENSING_OPERATIONS_RUNBOOK.md`) — MFA, issuance, activation, revocation, key rotation
- **16 Architecture Decision Records** (`docs/adr/`) — ADR-0001 through ADR-0016
- Dev environment config: `.nvmrc`, `.npmrc`, `.editorconfig`, `eslint.config.js`

### Added — Seed scripts + E2E (commit `d88fe03`)

- Backend `prisma/seed.ts` — idempotent seed creating default tenant, admin user, 8 roles, 5 classification labels, default metadata schema, 4 retention schedules, 14 tour definitions, default AI settings
- License-server `prisma/seed.ts` — super-admin + MFA secret + default product + 4 plans
- License-server `prisma/migrations/0001_init/migration.sql` baseline (all 17 entities)
- Backend + license-server `.env.example` files
- Electron `useTourStepsQuery` wired to real backend `GET /v1/tours/:tourId`
- Playwright E2E scaffolding: 5 test suites (login, theme-toggle, language-switcher.rtl, tour-engine, ai-bubble)
- `playwright.config.ts` with 3 projects (en/ar/fr-chromium)

### Added — Worker + AI + License-server auth + tests + i18n (commit `f78c350`)

- Backend `worker.ts` + `worker.module.ts` entry point for background job processing
- AI Assistant action-confirmation endpoints (`POST /v1/ai/assistant/actions/:id/confirm` + `/cancel`)
- 4 backend test suites: tenant-isolation, audit-hash-chain, license-enforcement, ai-security
- OpenSearch init script with Arabic-aware analyzer (tashkeel removal, alef/hamza/taa-marbuta normalization)
- Prisma migrations baseline
- Vitest config
- License-server admin-auth module (login + MFA verify + step-up + refresh + logout)
- AdminUser model + AdminJwtStrategy
- 3 new i18n namespaces (nav, dashboard, notFound) across all 6 locales — 106 new keys per locale

### Added — Initial build (commit `9918868`)

- **5 applications:**
  - `apps/backend` — NestJS on-premise backend (Fastify + Prisma + Redis + BullMQ + Socket.IO + OpenSearch + MinIO)
  - `apps/electron` — Electron desktop client (React + Mantine v7 + TanStack Query + Zustand + i18next + Socket.IO)
  - `apps/license-server` — Vendor-hosted licensing control plane (Ed25519 signed licenses)
  - `apps/license-admin` — License Admin Panel (React + Mantine v7 + mantine-react-table, MFA + step-up auth)
  - `apps/marketing` — Public marketing page (Next.js 14 + SEO + hreflang, 6 locales)
- **4 shared packages:**
  - `@smart-edms/types` — strict TypeScript types (no `any`, branded IDs, 22 domain files)
  - `@smart-edms/schemas` — Zod schemas (single source of truth, 19 domain files)
  - `@smart-edms/i18n` — 6 locales × 41 namespaces (~3,781 keys per locale, full RTL Arabic)
  - `@smart-edms/license-core` — `.sedmslic` / `.sedmsreq` / `.sedmscrl` signing + 6-state machine (58 tests)
- **Infrastructure:**
  - Docker Compose (postgres, redis, minio, opensearch, api, worker, license-server, nginx)
  - CI/CD GitHub Actions (lint, typecheck, test, build, i18n validation, CodeQL security scan)
  - Nginx reverse proxy with TLS, rate limiting, security headers, WebSocket upgrade
- **Documentation:**
  - README, ARCHITECTURE, DEPLOYMENT, SECURITY, BRAND_GUIDELINES
  - I18N, TOUR, AI_ASSISTANT, LICENSE_FILE_SPEC, CONTRIBUTING

### Smart EDMS spec compliance

- 14 Guided Tour types with stable selectors, RTL-aware, permission-aware
- AI Assistant Bubble with 16 permission-aware tools, audit, citations, prompt injection protection
- 6-state license machine: valid / expiring_soon / expired_grace / grace_exhausted / extended_remediation / invalid
- Asymmetric signing (Ed25519 / ES256), fail-closed verification
- No mock data, no hardcoded UI strings, full `t()` usage
- 6 mandatory locales with full RTL Arabic support
- Mantine v7 enterprise UI with light + dark themes (system default)
- Tamper-evident hash-chained audit log
- Multi-tenant isolation enforced server-side

## [1.0.0] — 2026-08-15

Initial release of Smart EDMS.
