/**
 * @smart-edms/config — database (PostgreSQL) configuration schema.
 *
 * Validates the env vars consumed by Prisma / pg / pg-connection-pool.
 *
 * Spec ref: §7.2 (PostgreSQL with row-level security), §15.1.
 */

import { z } from 'zod';

/**
 * Zod schema for database configuration. Accepts raw `process.env` values
 * (strings); coerces numerics and booleans.
 *
 *  - `DATABASE_URL` — required. PostgreSQL connection string.
 *  - `DATABASE_POOL_MAX` — max pool size (1-200, default 20).
 *  - `DATABASE_POOL_TIMEOUT_MS` — acquire timeout in ms (1000-60000, default 30000).
 *  - `DATABASE_SSL` — whether to require SSL (default `false` in dev).
 */
export const DatabaseConfigSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .max(512, 'DATABASE_URL must be ≤ 512 chars')
      // Basic shape check — full URL parsing is up to the driver.
      .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
        message: 'DATABASE_URL must be a PostgreSQL connection string',
      }),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(200).default(20),
    DATABASE_POOL_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(30_000),
    DATABASE_SSL: z
      .union([z.boolean(), z.string()])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'))
      .default(false),
  })
  .strict();

/** Parsed database configuration. */
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
