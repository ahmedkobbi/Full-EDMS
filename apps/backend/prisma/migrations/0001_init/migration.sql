-- Smart EDMS — Initial Migration
--
-- Creates all tables for the on-premise backend.
-- Spec ref: §9.x (product scope), §15.1 (EDMS core entities), §15.3 (tenant isolation).
--
-- Every tenant-owned table includes `tenant_id` for strict multi-tenant isolation.
-- Audit events use an append-only, hash-chained design (spec §9.12).
-- All timestamps are timestamptz(3) for millisecond precision + UTC storage.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- for uuid_generate_v4() (fallback)

-- ────────────────────────────────────────────────────────────────────────────
-- Identity & Tenancy
-- ────────────────────────────────────────────────────────────────────────────

CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  status          tenant_status NOT NULL DEFAULT 'ACTIVE',
  default_locale  VARCHAR(16) NOT NULL DEFAULT 'en',
  enabled_locales TEXT[] NOT NULL DEFAULT ARRAY['en','fr','ar','ru','zh-CN','de'],
  default_theme   VARCHAR(16) NOT NULL DEFAULT 'system',
  flag_config     JSONB NOT NULL DEFAULT '{"ar":"neutral"}',
  branding        JSONB,
  data_residency  VARCHAR(64),
  quota_users     INTEGER NOT NULL DEFAULT 50,
  quota_storage_bytes BIGINT NOT NULL DEFAULT 10737418240,
  quota_documents INTEGER NOT NULL DEFAULT 100000,
  created_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ(3)
);
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITED', 'DELETED');

CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email              TEXT NOT NULL,
  email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash      TEXT,
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  preferred_name     TEXT,
  status             user_status NOT NULL DEFAULT 'ACTIVE',
  mfa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret         VARCHAR(64),
  mfa_backup_codes   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_locale   VARCHAR(16),
  preferred_theme    VARCHAR(16),
  preferred_timezone VARCHAR(64),
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ(3),
  last_login_at      TIMESTAMPTZ(3),
  last_login_ip      VARCHAR(64),
  created_at         TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ(3),
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_users_tenant_status ON users(tenant_id, status);
CREATE INDEX idx_users_email ON users(email);

-- (Remaining tables created by subsequent migration files; see 0002_documents.sql,
-- 0003_workflows.sql, 0004_audit.sql, 0005_tour.sql, 0006_ai_assistant.sql, etc.)
-- In practice, `pnpm db:migrate` generates these from the Prisma schema automatically.
