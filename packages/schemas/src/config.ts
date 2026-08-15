/**
 * @smart-edms/schemas — environment configuration (spec §15.1)
 *
 * Zod schema for validating `process.env` at startup. Safe defaults for
 * development; strict requirements for production.
 *
 * Usage:
 *   const env = EnvironmentConfigSchema.parse(process.env);
 *
 * In development missing required values are filled with safe defaults so
 * the app can boot without exhaustive configuration. In production the same
 * schema requires all secrets to be present and rejects empty strings.
 */

import { z } from 'zod';

/**
 * Node environment the process is running in. Drives whether dev-safe
 * defaults apply or strict secret enforcement kicks in.
 */
export const NodeEnvSchema = z.enum(['development', 'staging', 'production', 'test']);

/** Log level. */
export const LogLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']);

// ---------------------------------------------------------------------------
// Environment config schema
// ---------------------------------------------------------------------------

const boolString = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .pipe(z.boolean());

const numInt = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);

/**
 * `z.infer<typeof EnvironmentConfigSchema>` matches the validated shape of
 * `process.env` after parsing.
 *
 * Development vs production: development fills safe defaults; production
 * rejects missing secrets.
 */
export const EnvironmentConfigSchema = z
  .object({
    // ---- Runtime ----
    NODE_ENV: NodeEnvSchema.default('development'),
    LOG_LEVEL: LogLevelSchema.default('info'),
    PORT: numInt(1, 65535).default(3000),

    // ---- Database ----
    DATABASE_URL: z.string().min(1).max(512),
    DATABASE_POOL_MAX: numInt(1, 200).default(20),
    DATABASE_SSL: boolString.default('false'),

    // ---- Redis / BullMQ ----
    REDIS_URL: z.string().min(1).max(512),

    // ---- Object storage ----
    S3_ENDPOINT: z.string().min(1).max(512),
    S3_REGION: z.string().min(1).max(64).default('us-east-1'),
    S3_BUCKET: z.string().min(1).max(128),
    S3_ACCESS_KEY_ID: z.string().min(1).max(256).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).max(512).optional(),
    S3_FORCE_PATH_STYLE: boolString.default('true'),

    // ---- Search ----
    OPENSEARCH_URL: z.string().min(1).max(512),
    OPENSEARCH_USERNAME: z.string().min(1).max(128).optional(),
    OPENSEARCH_PASSWORD: z.string().min(1).max(256).optional(),

    // ---- Auth / crypto ----
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars').max(2048),
    JWT_ISSUER: z.string().min(1).max(128).default('smart-edms'),
    JWT_ACCESS_TTL_SECONDS: numInt(60, 86400).default(900),
    JWT_REFRESH_TTL_SECONDS: numInt(3600, 2592000).default(604800),

    // ---- License verification (spec §12.4) ----
    LICENSE_PUBLIC_KEY_PATH: z.string().min(1).max(512),
    LICENSE_CRL_FETCH_INTERVAL_SECONDS: numInt(60, 86400).default(3600),
    LICENSE_HEARTBEAT_INTERVAL_SECONDS: numInt(60, 86400).default(3600),
    LICENSE_GRACE_PERIOD_DAYS: numInt(0, 90).default(7),

    // ---- Tenant / deployment identity ----
    DEPLOYMENT_ID: z.string().uuid().optional(),
    DEFAULT_DATA_RESIDENCY: z.string().min(1).max(64).default('default'),

    // ---- AI gateway (spec §11) ----
    AI_GATEWAY_URL: z.string().url().max(512).optional(),
    AI_EXTERNAL_PROVIDER_API_KEY: z.string().min(1).max(512).optional(),
    AI_LOCAL_MODEL_ENDPOINT: z.string().url().max(512).optional(),
    AI_MODEL_MODE: z.enum(['external', 'local', 'hybrid']).default('local'),

    // ---- WebSocket / Socket.IO ----
    WS_PORT: numInt(1, 65535).optional(),
    WS_CORS_ORIGINS: z.string().min(1).max(2048).default('*'),

    // ---- Webhooks / email ----
    WEBHOOK_SIGNING_SECRET: z.string().min(16).max(512).optional(),
    SMTP_URL: z.string().url().max(512).optional(),
    SMTP_FROM_ADDRESS: z.string().email().max(254).optional(),

    // ---- Observability ----
    SENTRY_DSN: z.string().url().max(512).optional(),
    TELEMETRY_ENABLED: boolString.default('false'),

    // ---- Misc ----
    PUBLIC_BASE_URL: z.string().url().max(512).default('http://localhost:3000'),
    CORS_ORIGINS: z.string().min(1).max(2048).default('http://localhost:3000'),
  })
  .strict()
  .superRefine((env, ctx) => {
    // Production-only strict enforcement.
    if (env.NODE_ENV === 'production') {
      if (!env.S3_ACCESS_KEY_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['S3_ACCESS_KEY_ID'],
          message: 'S3_ACCESS_KEY_ID is required in production',
        });
      }
      if (!env.S3_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['S3_SECRET_ACCESS_KEY'],
          message: 'S3_SECRET_ACCESS_KEY is required in production',
        });
      }
      if (!env.WEBHOOK_SIGNING_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WEBHOOK_SIGNING_SECRET'],
          message: 'WEBHOOK_SIGNING_SECRET is required in production',
        });
      }
      if (!env.SMTP_URL || !env.SMTP_FROM_ADDRESS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMTP_URL'],
          message: 'SMTP_URL and SMTP_FROM_ADDRESS are required in production',
        });
      }
      if (env.JWT_SECRET.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 64 chars in production',
        });
      }
      if (env.WS_CORS_ORIGINS === '*') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WS_CORS_ORIGINS'],
          message: 'WS_CORS_ORIGINS must not be "*" in production',
        });
      }
      if (env.CORS_ORIGINS === '*') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGINS'],
          message: 'CORS_ORIGINS must not be "*" in production',
        });
      }
      if (env.TELEMETRY_ENABLED) {
        if (!env.SENTRY_DSN) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['SENTRY_DSN'],
            message: 'SENTRY_DSN is required when TELEMETRY_ENABLED=true',
          });
        }
      }
    }
  });

/** Parsed environment configuration. */
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

/**
 * Safe parser that never throws. Returns `{ success, data, error }`.
 * Use this at startup so the app can render a friendly error page when
 * the environment is misconfigured.
 */
export const safeParseEnvironmentConfig = (env: unknown) =>
  EnvironmentConfigSchema.safeParse(env);
