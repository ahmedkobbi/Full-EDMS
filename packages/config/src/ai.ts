/**
 * @smart-edms/config — AI Assistant configuration schema.
 *
 * Validates the env vars consumed by the AI gateway. Supports three modes:
 *  - `'none'`    — AI Assistant disabled entirely.
 *  - `'external'`— external provider (requires `AI_EXTERNAL_API_URL` + key).
 *  - `'local'`   — self-hosted model (requires `AI_LOCAL_API_URL`).
 *  - `'hybrid'`  — combination (both endpoints must be configured).
 *
 * Spec ref: §11.11 (AI model deployment modes), §11.13 (data residency),
 * §15.1.
 */

import { z } from 'zod';

/**
 * Zod schema for AI Assistant configuration. Cross-field validation: the
 * mode determines which endpoint URLs are required.
 *
 *  - `AI_PROVIDER` — `'none' | 'external' | 'local' | 'hybrid'` (default `'none'`).
 *  - `AI_EXTERNAL_API_URL` — base URL of the external provider's REST API.
 *  - `AI_EXTERNAL_API_KEY` — bearer token for the external provider (secret).
 *  - `AI_LOCAL_API_URL` — base URL of the self-hosted model server.
 *  - `AI_REQUEST_TIMEOUT_MS` — per-request timeout (1000-300000ms, default 30000).
 */
export const AiConfigSchema = z
  .object({
    AI_PROVIDER: z.enum(['none', 'external', 'local', 'hybrid']).default('none'),
    AI_EXTERNAL_API_URL: z.string().url().max(512).optional(),
    AI_EXTERNAL_API_KEY: z.string().min(1).max(512).optional(),
    AI_LOCAL_API_URL: z.string().url().max(512).optional(),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300_000).default(30_000),
  })
  .strict()
  .superRefine((env, ctx) => {
    if ((env.AI_PROVIDER === 'external' || env.AI_PROVIDER === 'hybrid') && !env.AI_EXTERNAL_API_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_EXTERNAL_API_URL'],
        message: 'AI_EXTERNAL_API_URL is required when AI_PROVIDER is external or hybrid',
      });
    }
    if (env.AI_PROVIDER === 'external' && !env.AI_EXTERNAL_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_EXTERNAL_API_KEY'],
        message: 'AI_EXTERNAL_API_KEY is required when AI_PROVIDER is external',
      });
    }
    if ((env.AI_PROVIDER === 'local' || env.AI_PROVIDER === 'hybrid') && !env.AI_LOCAL_API_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_LOCAL_API_URL'],
        message: 'AI_LOCAL_API_URL is required when AI_PROVIDER is local or hybrid',
      });
    }
  });

/** Parsed AI configuration. */
export type AiConfig = z.infer<typeof AiConfigSchema>;
