/**
 * @smart-edms/config — S3-compatible object storage configuration schema.
 *
 * Validates the env vars consumed by MinIO / AWS S3 clients. MinIO is used
 * in dev / on-prem; AWS S3 in cloud deployments.
 *
 * Spec ref: §7.2 (S3-compatible storage), §9.3 (file storage separate from
 * application database), §15.1.
 */

import { z } from 'zod';

/**
 * Zod schema for object storage configuration.
 *
 *  - `S3_ENDPOINT` — required. URL (`https://...`).
 *  - `S3_REGION` — AWS region (default `'us-east-1'`).
 *  - `S3_BUCKET` — required. Bucket name (DNS-compatible).
 *  - `S3_ACCESS_KEY_ID` — required in production; optional in dev (MinIO may
 *    run anonymous).
 *  - `S3_SECRET_ACCESS_KEY` — required in production; optional in dev.
 *  - `S3_FORCE_PATH_STYLE` — true for MinIO, false for AWS S3 (default true).
 */
export const StorageConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    S3_ENDPOINT: z
      .string()
      .min(1, 'S3_ENDPOINT is required')
      .max(512)
      .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
        message: 'S3_ENDPOINT must be a URL',
      }),
    S3_REGION: z.string().min(1).max(64).default('us-east-1'),
    S3_BUCKET: z
      .string()
      .min(1, 'S3_BUCKET is required')
      .max(128)
      // Bucket names: lowercase letters, digits, hyphens; 3-63 chars.
      .refine((v) => /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(v), {
        message: 'S3_BUCKET must be a DNS-compatible bucket name (lowercase, 3-63 chars)',
      }),
    S3_ACCESS_KEY_ID: z.string().min(1).max(256).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).max(512).optional(),
    S3_FORCE_PATH_STYLE: z
      .union([z.boolean(), z.string()])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'))
      .default(true),
  })
  .strict()
  .superRefine((env, ctx) => {
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
    }
  });

/** Parsed storage configuration. */
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
