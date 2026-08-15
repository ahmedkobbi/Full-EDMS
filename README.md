# Smart EDMS — Premium Enterprise Document Management System

> **Smart EDMS** is a premium, modern, enterprise-grade, multilingual, on-premise Electronic Document Management System (EDMS) with an Electron desktop experience, NestJS backend, real-time WebSocket layer, secure licensing system, license admin panel, public marketing page, premium Guided Tour, and a permission-aware AI Assistant Bubble.

This repository contains the complete monorepo for Smart EDMS, including all applications, shared packages, infrastructure, and documentation. It is engineered to be production-ready, auditable, multilingual (English, French, Arabic with RTL, Russian, Simplified Chinese, German), and tamper-resistant.

## Repository Structure

```
full-edms/
├── apps/
│   ├── backend/           # NestJS on-premise backend (Fastify + Prisma + Redis + BullMQ + Socket.IO + OpenSearch + MinIO)
│   ├── electron/          # Electron desktop client (React + Mantine v7 + TanStack Query + Zustand + i18next)
│   ├── license-server/    # Vendor-hosted licensing control plane (NestJS + Ed25519 signing)
│   ├── license-admin/     # License Admin Panel (React + Mantine v7 + mantine-react-table)
│   └── marketing/         # Public marketing page (Next.js 14 App Router + SEO + hreflang)
├── packages/
│   ├── types/             # @smart-edms/types — strict TypeScript types (no `any`, branded IDs)
│   ├── schemas/           # @smart-edms/schemas — Zod schemas (single source of truth for runtime validation)
│   ├── i18n/              # @smart-edms/i18n — 6 locales × 41 namespaces, RTL-aware
│   ├── license-core/      # @smart-edms/license-core — .sedmslic / .sedmsreq / .sedmscrl + 6-state machine
│   ├── ui/                # @smart-edms/ui — shared UI primitives (planned)
│   ├── tour-core/         # @smart-edms/tour-core — tour engine core (planned)
│   ├── ai-core/           # @smart-edms/ai-core — AI tool catalog core (planned)
│   ├── utils/             # @smart-edms/utils — shared utilities (planned)
│   └── config/            # @smart-edms/config — shared configuration (planned)
├── infra/
│   ├── docker/            # docker-compose.yml + Dockerfiles
│   ├── nginx/             # reverse proxy config + certs
│   └── opensearch/        # OpenSearch config
├── docs/                  # Architecture, deployment, security, branding docs
├── .github/workflows/     # CI + security scan
└── scripts/               # Operational scripts
```

## Quick Start

### Prerequisites

- Node.js ≥ 20.10
- pnpm ≥ 9.0
- Docker ≥ 24
- Docker Compose ≥ 2.20

### 1. Install dependencies

```bash
pnpm install
```

### 2. Generate Prisma clients

```bash
pnpm --filter @smart-edms/backend db:generate
pnpm --filter @smart-edms/license-server db:generate
```

### 3. Start infrastructure (Postgres, Redis, MinIO, OpenSearch)

```bash
cd infra/docker
cp .env.example .env  # then edit .env to set strong passwords
docker compose up -d
```

### 4. Run database migrations

```bash
pnpm --filter @smart-edms/backend db:migrate:deploy
pnpm --filter @smart-edms/license-server db:migrate:deploy
```

### 5. Generate license signing keypair

```bash
pnpm --filter @smart-edms/license-server key:generate
# Writes private key to ./license-signing-key.pem (chmod 600)
# Prints public key PEM — embed in backend at infra/docker/license-public-key.pem
```

### 6. Start the backend (development)

```bash
pnpm --filter @smart-edms/backend dev
# API at http://localhost:4000
# OpenAPI docs at http://localhost:4000/v1/docs
```

### 7. Start the Electron client (development)

```bash
pnpm --filter @smart-edms/electron dev
```

### 8. Start the licensing server + admin panel (development)

```bash
pnpm --filter @smart-edms/license-server dev
pnpm --filter @smart-edms/license-admin dev
```

### 9. Start the marketing page (development)

```bash
pnpm --filter @smart-edms/marketing dev
```

## Production Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the complete production deployment guide including:

- Docker Compose stack
- TLS termination via Nginx
- License signing key management
- Backup and restore procedures
- Health checks and monitoring
- Rollback procedures

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the complete architecture document.

## Security

See [`docs/SECURITY.md`](docs/SECURITY.md) for the security model, threat model, and security controls matrix.

## Internationalization

Smart EDMS supports six mandatory locales from day one:

| Code     | Native Name  | Direction |
|----------|--------------|-----------|
| `en`     | English      | LTR       |
| `fr`     | Français     | LTR       |
| `ar`     | العربية       | RTL       |
| `ru`     | Русский      | LTR       |
| `zh-CN`  | 简体中文       | LTR       |
| `de`     | Deutsch      | LTR       |

All user-facing strings use `t()` via `react-i18next` (frontend) and `i18next` (backend email templates). Arabic uses Modern Standard Arabic (MAS/MSA) with full RTL behavior, including logical CSS properties, Mantine RTL support, and proper popover placement.

For Arabic flag representation, Smart EDMS uses a **neutral language indicator by default** (no country flag). Tenant administrators may configure a specific flag if required, per spec §4.5.

## Licensing

Smart EDMS uses a cloud-hosted licensing control plane with offline/air-gap signed license support. Three specialized file extensions are used:

| Extension     | MIME type                          | Purpose                              |
|---------------|-------------------------------------|--------------------------------------|
| `.sedmslic`   | `application/x-sedms-license`       | Signed license certificate           |
| `.sedmsreq`   | `application/x-sedms-request`       | Offline activation request           |
| `.sedmscrl`   | `application/x-sedms-crl`           | Signed revocation list (offline)     |

License artifacts are signed with Ed25519 (EdDSA) or ECDSA P-256 (ES256) asymmetric keys. The **private signing key never leaves the licensing server**. The public verification key is embedded in the on-premise backend.

Smart EDMS does **not** claim the licensing system is uncrackable. It is **tamper-resistant, license-enforced, auditable, and designed to make unauthorized use difficult, detectable, and operationally unattractive** (spec §5).

## Guided Tour

The Smart EDMS Guided Tour is a first-class, premium, multilingual, RTL-aware onboarding system with 14 tour types:

1. First-Run Welcome Tour
2. End User Document Tour
3. Search Tour
4. Records Manager Tour
5. Security Officer Tour
6. Auditor Tour
7. Administrator Tour
8. Workflow Designer Tour
9. Scanner Tour
10. License Tour
11. Real-Time Collaboration Tour
12. AI Assistant Tour
13. Empty-State Learning Tour
14. Marketing Public Product Tour

Tours are skippable, resumable, restartable, accessible, context-aware, license-aware, and permission-aware. Tour progress is persisted per user+tenant. Tours never use mock data — they highlight real features using stable selectors (`data-tour="..."`).

## AI Assistant

The AI Assistant Bubble is a premium, permission-aware, auditable, multilingual, RTL-aware assistant that helps users with:

- Natural language questions about documents, workflows, audit data, license state, help content, and UI navigation
- Document search (permission-aware)
- Metadata explanation
- Workflow status
- Retention and legal hold explanation
- Guided tour recommendations

The AI Assistant is **read-only by default**. Sensitive actions require explicit user confirmation. Destructive actions are never auto-executed — only suggested with a dedicated confirmation flow. All tool calls are audited. Citations only include documents the user is authorized to access. The AI respects tenant isolation, classification policy, legal hold, retention policy, and license entitlements.

The AI Assistant is hidden when not licensed or when the tenant has disabled it.

## No Mock Data Rule

Smart EDMS strictly prohibits mock data in production (spec §20):

- No mock document lists, users, tenants, licenses, audit logs, workflow instances, notifications, scanner devices, tour completion states, or AI assistant responses presented as real system state
- No hardcoded customer names, license keys, activation codes, secrets, API endpoints (except configurable defaults), tenant IDs, user IDs, feature flags, fake metrics, fake usage numbers, fake testimonials, or fake pricing
- All UI data comes from real APIs, real WebSocket events, real configuration, real environment variables, real database records, real license state, real tour progress, and real AI session state

A clearly-labeled **demo mode** may exist but must be explicitly enabled, isolated from production, and disabled by default.

## Engineering Principles

Smart EDMS is engineered with the following priorities, in order (spec §33):

1. Correctness
2. Security
3. Auditability
4. Maintainability
5. User trust
6. Operational resilience
7. Compliance readiness
8. Premium product experience
9. Full multilingual quality
10. Flawless RTL Arabic support
11. Enterprise process standardization (BPMN, CMMN, DMN)
12. Deployment flexibility (on-premise, connected on-premise, hybrid)
13. Cryptographic and physical provenance
14. Powerful backend performance
15. Scalable architecture
16. Human engineering ownership
17. Tamper-resistant licensing
18. Real-time WebSocket reliability
19. Mantine v7 enterprise UI/UX quality
20. Strict use of `t()` for all internationalized text

## License

UNLICENSED — proprietary. © Smart EDMS. All rights reserved.
