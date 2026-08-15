/**
 * @smart-edms/config — Redis configuration schema.
 *
 * Validates the env vars consumed by ioredis / BullMQ / rate-limit stores.
 *
 * Spec ref: §7.3 (Redis for caching + BullMQ), §15.1.
 */

import { z } from 'zod';

/**
 * Zod schema for Redis configuration.
 *
 *  - `REDIS_URL` — required. `redis://` or `rediss://` (TLS) URL.
 *  - `REDIS_MAX_RETRIES` — max reconnect attempts before giving up (0-100, default 10).
 *  - `REDIS_KEY_PREFIX` — namespace prefix for all keys (max 64 chars, default `'smart-edms:'`).
 */
export const RedisConfigSchema = z
  .object({
    REDIS_URL: z
      .string()
      .min(1, 'REDIS_URL is required')
      .max(512)
      .refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), {
        message: 'REDIS_URL must start with redis:// or rediss://',
      }),
    REDIS_MAX_RETRIES: z.coerce.number().int().min(0).max(100).default(10),
    REDIS_KEY_PREFIX: z.string().min(1).max(64).default('smart-edms:'),
  })
  .strict();

/** Parsed Redis configuration. */
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
