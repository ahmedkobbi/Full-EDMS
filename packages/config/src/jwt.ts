/**
 * @smart-edms/config — JWT configuration schema.
 *
 * Validates the env vars consumed by the auth module for access / refresh
 * token signing. Enforces production-grade key length (≥ 64 chars) when
 * `NODE_ENV === 'production'`.
 *
 * Spec ref: §9.1 (authentication), §15.1 (env validation), §21.6 (fail fast
 * on weak secrets in production).
 */

import { z } from 'zod';

/**
 * Zod schema for JWT configuration. Production enforcement: if
 * `NODE_ENV === 'production'`, `JWT_SECRET` must be at least 64 characters.
 *
 *  - `JWT_SECRET` — HMAC secret used to sign access + refresh tokens.
 *  - `JWT_ISSUER` — `iss` claim (default `'smart-edms'`).
 *  - `JWT_ACCESS_TTL_SECONDS` — access token TTL (60-86400s, default 900 = 15min).
 *  - `JWT_REFRESH_TTL_SECONDS` — refresh token TTL (3600s-30d, default 604800 = 7d).
 */
export const JwtConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 chars')
      .max(2048, 'JWT_SECRET must be ≤ 2048 chars'),
    JWT_ISSUER: z.string().min(1).max(128).default('smart-edms'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().min(3600).max(2_592_000).default(604_800),
  })
  .strict()
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 64 chars in production',
      });
    }
  });

/** Parsed JWT configuration. */
export type JwtConfig = z.infer<typeof JwtConfigSchema>;
