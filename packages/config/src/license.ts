/**
 * @smart-edms/config — license verification configuration schema.
 *
 * Validates the env vars consumed by the on-premise backend to verify
 * signed license artifacts and run the heartbeat loop.
 *
 * Spec ref: §12.4 (asymmetric signing, public key embedded on-prem),
 * §12.9 (heartbeat), §15.1.
 */

import { z } from 'zod';

/**
 * Zod schema for license verification configuration.
 *
 *  - `LICENSE_PUBLIC_KEY_PATH` — absolute path to the public key PEM file.
 *    Required in production; optional in dev (tests may use an inline key).
 *  - `LICENSE_SERVER_URL` — base URL of the licensing server, used for
 *    online activation + heartbeat.
 *  - `LICENSE_HEARTBEAT_INTERVAL_SECONDS` — heartbeat period (60-86400s, default 3600).
 *  - `LICENSE_GRACE_PERIOD_DAYS` — offline grace window (0-90 days, default 7).
 *  - `LICENSE_EXTENDED_REMEDIATION_DAYS` — admin-only degraded-mode window
 *    (0-90 days, default 30).
 */
export const LicenseConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    LICENSE_PUBLIC_KEY_PATH: z.string().min(1).max(512).optional(),
    LICENSE_SERVER_URL: z.string().url().max(512).optional(),
    LICENSE_HEARTBEAT_INTERVAL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3600),
    LICENSE_GRACE_PERIOD_DAYS: z.coerce.number().int().min(0).max(90).default(7),
    LICENSE_EXTENDED_REMEDIATION_DAYS: z.coerce.number().int().min(0).max(90).default(30),
  })
  .strict()
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.LICENSE_PUBLIC_KEY_PATH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LICENSE_PUBLIC_KEY_PATH'],
        message: 'LICENSE_PUBLIC_KEY_PATH is required in production',
      });
    }
  });

/** Parsed license configuration. */
export type LicenseConfig = z.infer<typeof LicenseConfigSchema>;
