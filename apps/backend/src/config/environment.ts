import { z } from 'zod';

/**
 * Backend environment configuration.
 * Validated at startup via Zod (spec §21.6 — configuration validation at startup).
 * Dev-safe defaults; production requires explicit secrets.
 */
export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    OPENSEARCH_URL: z.string().url().optional(),
    OPENSEARCH_USERNAME: z.string().optional(),
    OPENSEARCH_PASSWORD: z.string().optional(),

    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().default('us-east-1'),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars in production'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 min
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2592000), // 30 days

    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

    LICENSE_PUBLIC_KEY_PATH: z.string().optional(),
    LICENSE_SERVER_URL: z.string().url().optional(),
    LICENSE_HEARTBEAT_INTERVAL_SECONDS: z.coerce.number().int().positive().default(3600),
    LICENSE_GRACE_PERIOD_DAYS: z.coerce.number().int().nonnegative().default(7),
    LICENSE_EXTENDED_REMEDIATION_DAYS: z.coerce.number().int().nonnegative().default(30),

    AI_PROVIDER: z.enum(['none', 'external', 'local', 'hybrid']).default('none'),
    AI_EXTERNAL_API_URL: z.string().url().optional(),
    AI_EXTERNAL_API_KEY: z.string().optional(),
    AI_LOCAL_API_URL: z.string().url().optional(),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    RATE_LIMIT_GLOBAL_PER_MINUTE: z.coerce.number().int().positive().default(200),
    RATE_LIMIT_AUTH_PER_MINUTE: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_AI_PER_MINUTE: z.coerce.number().int().positive().default(20),

    UPLOAD_MAX_SIZE_BYTES: z.coerce.number().int().positive().default(5368709120), // 5GB
    UPLOAD_ALLOWED_MIME_TYPES: z.string().optional(),

    WEBHOOK_SIGNING_SECRET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET must be at least 64 chars in production',
          path: ['JWT_SECRET'],
        });
      }
      if (!env.LICENSE_PUBLIC_KEY_PATH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'LICENSE_PUBLIC_KEY_PATH is required in production',
          path: ['LICENSE_PUBLIC_KEY_PATH'],
        });
      }
    }
    if (env.AI_PROVIDER === 'external' && !env.AI_EXTERNAL_API_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AI_EXTERNAL_API_URL required when AI_PROVIDER=external',
        path: ['AI_EXTERNAL_API_URL'],
      });
    }
    if (env.AI_PROVIDER === 'local' && !env.AI_LOCAL_API_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AI_LOCAL_API_URL required when AI_PROVIDER=local',
        path: ['AI_LOCAL_API_URL'],
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;
