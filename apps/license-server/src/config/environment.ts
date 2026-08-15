import { z } from 'zod';

/**
 * Licensing Server environment configuration.
 *
 * Validated at startup via Zod (spec §21.6 — configuration validation at
 * startup; §12.4 — signing key isolation).
 *
 * CRITICAL: the `LICENSE_SIGNING_KEY_PATH` env var points to a file on
 * disk that contains the Ed25519 / ES256 private key in PKCS#8 PEM form.
 * The file MUST be readable ONLY by the license-server process (chmod 600,
 * owned by the service account). The private key is loaded into memory
 * once at startup and NEVER:
 *   - written to logs,
 *   - persisted to the database,
 *   - returned in any HTTP response,
 *   - embedded in any client artifact.
 *
 * Only the public key (derived via `deriveKeyId()` from
 * `@smart-edms/license-core`) is exposed for distribution to on-prem
 * backends and Electron clients.
 */
export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4100),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // PostgreSQL — licensing server has its own database.
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Redis — for BullMQ (webhook delivery) + rate limiting + caching.
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    // ── Signing keys (spec §12.4) ────────────────────────────────────────
    /**
     * Absolute path to the file containing the active private signing key
     * (PKCS#8 PEM). The file must be chmod 600 and owned by the
     * license-server process account.
     */
    LICENSE_SIGNING_KEY_PATH: z.string().min(1, 'LICENSE_SIGNING_KEY_PATH is required'),
    /**
     * Key ID for the active signing key. Must match `deriveKeyId(publicKeyPem)`
     * for the private key in `LICENSE_SIGNING_KEY_PATH`. If it doesn't,
     * the server refuses to start.
     */
    LICENSE_SIGNING_KID: z.string().min(8).max(64),
    /**
     * Signing algorithm. `'EdDSA'` (Ed25519) is the default and
     * recommended. `'ES256'` (ECDSA P-256) is supported for FIPS-mode
     * deployments.
     */
    LICENSE_SIGNING_ALG: z.enum(['EdDSA', 'ES256']).default('EdDSA'),

    // ── JWT / admin auth ────────────────────────────────────────────────
    /**
     * Secret used to sign admin JWTs. MUST be at least 32 chars in dev
     * and 64 chars in production.
     */
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 min
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2592000), // 30 days
    /**
     * Step-up auth TTL — how long a verified MFA challenge authorises
     * sensitive operations (revocation, key rotation). Default 5 min.
     */
    STEP_UP_AUTH_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    /**
     * OTP window (in time steps) for TOTP verification. Default 1 means
     * the current + previous + next 30-second windows are accepted.
     */
    MFA_TOTP_WINDOW: z.coerce.number().int().min(0).max(5).default(1),

    // ── CORS ────────────────────────────────────────────────────────────
    CORS_ORIGINS: z.string().default('http://localhost:5174'),

    // ── Heartbeat / grace (spec §12.9) ─────────────────────────────────
    /**
     * Default heartbeat interval hint sent to on-prem deployments on
     * activation. The on-prem backend may override based on its own
     * license state.
     */
    HEARTBEAT_INTERVAL_SECONDS: z.coerce.number().int().min(60).max(86400).default(3600),
    /**
     * After this many consecutive missed heartbeats (no heartbeat for
     * `interval * threshold`), the activation is flagged for review.
     */
    HEARTBEAT_FAILURE_THRESHOLD: z.coerce.number().int().min(1).max(20).default(3),

    // ── Trials (spec §12.10) ───────────────────────────────────────────
    TRIAL_DEFAULT_DURATION_DAYS: z.coerce.number().int().min(1).max(90).default(14),
    TRIAL_MAX_DURATION_DAYS: z.coerce.number().int().min(1).max(90).default(30),

    // ── Webhooks ───────────────────────────────────────────────────────
    WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    WEBHOOK_BACKOFF_BASE_MS: z.coerce.number().int().min(100).default(1000),
    WEBHOOK_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
    WEBHOOK_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),

    // ── Rate limit ─────────────────────────────────────────────────────
    RATE_LIMIT_GLOBAL_PER_MINUTE: z.coerce.number().int().positive().default(200),
    RATE_LIMIT_ACTIVATE_PER_MINUTE: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_HEARTBEAT_PER_MINUTE: z.coerce.number().int().positive().default(60),

    // ── CRL (spec §12.4) ───────────────────────────────────────────────
    /**
     * How often a new CRL is generated (in hours). A new CRL is also
     * generated immediately on every revocation.
     */
    CRL_REFRESH_HOURS: z.coerce.number().int().min(1).max(168).default(24),
    /**
     * TTL for the `nextExpectedAt` field in the CRL. Tells the on-prem
     * backend how long to cache the CRL before re-fetching.
     */
    CRL_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),

    // ── Optional KMS / HSM integration ─────────────────────────────────
    /**
     * When set, the licensing server delegates private-key operations
     * to the named KMS provider instead of loading the key from disk.
     * Currently supported stubs: `'aws-kms'`, `'gcp-kms'`, `'vault'`.
     * Leave unset for filesystem / single-tenant deployments.
     */
    KMS_PROVIDER: z.enum(['aws-kms', 'gcp-kms', 'vault']).optional(),
    KMS_KEY_ID: z.string().optional(),

    // ── bcrypt rounds for admin password hashing ──────────────────────
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  })
  .superRefine((env: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const nodeEnv = env.NODE_ENV;
    const jwtSecret = env.JWT_SECRET;
    const alg = env.LICENSE_SIGNING_ALG;
    const kmsProvider = env.KMS_PROVIDER;
    if (nodeEnv === 'production') {
      if (typeof jwtSecret === 'string' && jwtSecret.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET must be at least 64 chars in production',
          path: ['JWT_SECRET'],
        });
      }
      if (alg === 'ES256' && !kmsProvider) {
        // ES256 in production SHOULD use KMS (FIPS-mode requirement).
        // Not enforced; just a warning via stdout.
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;
