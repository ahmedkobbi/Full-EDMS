-- Smart EDMS Licensing Server — Initial Migration
--
-- Creates all tables for the vendor-hosted licensing control plane.
-- Spec ref: §12.1 (license server entities), §12.10 (license admin panel).
--
-- The licensing server has its own database (typically `smart_edms_license`)
-- separate from the on-premise backend's database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- Customers & Contacts
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT,
  industry     VARCHAR(64),
  website      TEXT,
  status       VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE lic_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES lic_customers(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          VARCHAR(64),
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lic_contacts_customer_id ON lic_contacts(customer_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Products & Plans
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  current_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  created_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE lic_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES lic_products(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  features    JSONB NOT NULL DEFAULT '{}',
  limits      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, code)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Signing Keys (private key NEVER stored in DB — only metadata)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_signing_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid             TEXT NOT NULL UNIQUE,
  alg             VARCHAR(16) NOT NULL,
  public_key_pem  TEXT NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  retired_at      TIMESTAMPTZ(3)
);

-- ────────────────────────────────────────────────────────────────────────────
-- Licenses
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_licenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES lic_customers(id) ON DELETE RESTRICT,
  product_id            UUID NOT NULL REFERENCES lic_products(id) ON DELETE RESTRICT,
  plan_id               UUID NOT NULL REFERENCES lic_plans(id) ON DELETE RESTRICT,
  code                  TEXT NOT NULL UNIQUE,
  status                VARCHAR(16) NOT NULL DEFAULT 'active',
  type                  VARCHAR(32) NOT NULL,
  start_date            TIMESTAMPTZ(3) NOT NULL,
  end_date              TIMESTAMPTZ(3),
  grace_period_days     INTEGER NOT NULL DEFAULT 7,
  max_users             INTEGER,
  max_devices           INTEGER,
  max_storage_bytes     BIGINT,
  max_documents         INTEGER,
  enabled_modules       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enabled_integrations  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ai_usage_allowance    INTEGER,
  offline_mode          BOOLEAN NOT NULL DEFAULT FALSE,
  hybrid_sync           BOOLEAN NOT NULL DEFAULT FALSE,
  support_level         VARCHAR(32) NOT NULL DEFAULT 'standard',
  environment           VARCHAR(32) NOT NULL DEFAULT 'production',
  signing_key_id        UUID NOT NULL REFERENCES lic_signing_keys(id) ON DELETE RESTRICT,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lic_licenses_customer_id ON lic_licenses(customer_id);
CREATE INDEX idx_lic_licenses_status ON lic_licenses(status);

-- ────────────────────────────────────────────────────────────────────────────
-- Activations, Devices, Heartbeats
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_activations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id          UUID NOT NULL REFERENCES lic_licenses(id) ON DELETE CASCADE,
  deployment_id       VARCHAR(128) NOT NULL,
  fingerprint_hash    VARCHAR(128) NOT NULL,
  app_version         VARCHAR(32),
  environment         VARCHAR(32) NOT NULL DEFAULT 'production',
  ip_address          VARCHAR(64),
  status              VARCHAR(16) NOT NULL DEFAULT 'active',
  first_activated_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  last_heartbeat_at   TIMESTAMPTZ(3),
  created_at          TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lic_activations_license_id ON lic_activations(license_id);
CREATE INDEX idx_lic_activations_deployment_id ON lic_activations(deployment_id);

CREATE TABLE lic_devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id     UUID NOT NULL REFERENCES lic_activations(id) ON DELETE CASCADE,
  fingerprint_hash  VARCHAR(128) NOT NULL,
  hostname          VARCHAR(256),
  os                VARCHAR(64),
  arch              VARCHAR(32),
  last_seen_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lic_devices_activation_id ON lic_devices(activation_id);

CREATE TABLE lic_heartbeats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id     UUID NOT NULL REFERENCES lic_activations(id) ON DELETE CASCADE,
  received_at       TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  status            VARCHAR(16) NOT NULL,
  usage_summary     JSONB,
  response_signature TEXT
);
CREATE INDEX idx_lic_heartbeats_activation_id ON lic_heartbeats(activation_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Usage Metrics, Revocations, Trials
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_usage_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id  UUID NOT NULL REFERENCES lic_licenses(id) ON DELETE CASCADE,
  activation_id UUID REFERENCES lic_activations(id) ON DELETE SET NULL,
  metric       VARCHAR(32) NOT NULL,
  value        BIGINT NOT NULL,
  recorded_at  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lic_usage_metrics_license_id ON lic_usage_metrics(license_id);

CREATE TABLE lic_revocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id        UUID NOT NULL REFERENCES lic_licenses(id) ON DELETE CASCADE,
  reason            TEXT NOT NULL,
  revoked_by_admin_id UUID,
  revoked_at        TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  crl_version       INTEGER NOT NULL
);

CREATE TABLE lic_trials (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES lic_customers(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES lic_products(id) ON DELETE RESTRICT,
  contact_email         TEXT NOT NULL,
  activation_code       TEXT NOT NULL UNIQUE,
  start_date            TIMESTAMPTZ(3) NOT NULL,
  end_date              TIMESTAMPTZ(3) NOT NULL,
  max_duration_days     INTEGER NOT NULL DEFAULT 14,
  converted_to_license_id UUID REFERENCES lic_licenses(id),
  status                VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at            TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Webhooks, API Keys, Audit Logs
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_webhooks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES lic_customers(id) ON DELETE CASCADE,
  url                 TEXT NOT NULL,
  secret              TEXT,
  events              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_delivery_at    TIMESTAMPTZ(3),
  last_delivery_status VARCHAR(16),
  created_at          TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE lic_webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID NOT NULL REFERENCES lic_webhooks(id) ON DELETE CASCADE,
  event_type    VARCHAR(64) NOT NULL,
  payload       JSONB NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts      INTEGER NOT NULL DEFAULT 0,
  response_code INTEGER,
  delivered_at  TIMESTAMPTZ(3),
  created_at    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lic_webhook_deliveries_webhook_id ON lic_webhook_deliveries(webhook_id);
CREATE INDEX idx_lic_webhook_deliveries_status ON lic_webhook_deliveries(status);

CREATE TABLE lic_api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,
  key_prefix      VARCHAR(16) NOT NULL,
  scopes          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ(3),
  created_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE lic_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID,
  action          VARCHAR(64) NOT NULL,
  target          VARCHAR(64),
  target_id       UUID,
  metadata        JSONB,
  result          VARCHAR(16) NOT NULL DEFAULT 'allow',
  reason          TEXT,
  ip_address      VARCHAR(64),
  user_agent      TEXT,
  occurred_at     TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  sequence_number BIGINT NOT NULL,
  previous_hash   VARCHAR(128),
  event_hash      VARCHAR(128) NOT NULL
);
CREATE INDEX idx_lic_audit_logs_admin_id ON lic_audit_logs(admin_id);
CREATE INDEX idx_lic_audit_logs_occurred_at ON lic_audit_logs(occurred_at);

-- ────────────────────────────────────────────────────────────────────────────
-- Offline Activations
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_offline_activation_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        TEXT NOT NULL UNIQUE,
  product_id        UUID NOT NULL REFERENCES lic_products(id) ON DELETE RESTRICT,
  deployment_id     VARCHAR(128) NOT NULL,
  app_version       VARCHAR(32),
  machine_fingerprint VARCHAR(128) NOT NULL,
  contact_email     TEXT,
  raw_content       TEXT NOT NULL,
  status            VARCHAR(16) NOT NULL DEFAULT 'pending',
  reviewed_by_admin_id UUID,
  reviewed_at       TIMESTAMPTZ(3),
  created_at        TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lic_offline_requests_product_id ON lic_offline_activation_requests(product_id);
CREATE INDEX idx_lic_offline_requests_deployment_id ON lic_offline_activation_requests(deployment_id);
CREATE INDEX idx_lic_offline_requests_status ON lic_offline_activation_requests(status);

CREATE TABLE lic_offline_activation_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL UNIQUE REFERENCES lic_offline_activation_requests(id) ON DELETE CASCADE,
  offline_request_id UUID NOT NULL UNIQUE,
  license_id      UUID NOT NULL REFERENCES lic_licenses(id) ON DELETE RESTRICT,
  signing_key_id UUID NOT NULL REFERENCES lic_signing_keys(id) ON DELETE RESTRICT,
  artifact_content TEXT NOT NULL,
  signed_at       TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  signed_by_admin_id UUID,
  downloaded_at   TIMESTAMPTZ(3)
);
CREATE INDEX idx_lic_offline_certificates_license_id ON lic_offline_activation_certificates(license_id);
CREATE INDEX idx_lic_offline_certificates_signing_key_id ON lic_offline_activation_certificates(signing_key_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Admin Users (License Admin Panel login)
-- Spec ref: §12.10 (license admin panel — secure login, MFA required).
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lic_admin_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  password_hash     TEXT,
  roles             TEXT[] NOT NULL DEFAULT ARRAY['admin']::TEXT[],
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_secret        VARCHAR(64),
  mfa_backup_codes  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  mfa_enrolled_at   TIMESTAMPTZ(3),
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ(3),
  last_login_at     TIMESTAMPTZ(3),
  last_login_ip     VARCHAR(64),
  created_at        TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ(3)
);
CREATE INDEX idx_lic_admin_users_is_active ON lic_admin_users(is_active);
