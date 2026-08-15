/**
 * Smart EDMS — Tour module DTOs (Zod schemas).
 *
 * Single source of truth for runtime validation of the Tour REST endpoints.
 * Composes and re-exports schemas from `@smart-edms/schemas` where applicable
 * (spec §10, §10.11, §10.14, §10.15, §10.18).
 *
 * Notes:
 *  - `tenantId` is always taken from the JWT (`req.user.tid`), never the body.
 *  - `userId` is always taken from the JWT (`req.user.sub`), never the body.
 *  - All schemas use `.strict()` to reject unknown keys at the boundary.
 *  - Boolean query params use `z.enum(['true','false']).transform(...)` to
 *    avoid the `z.coerce.boolean()` gotcha (any non-empty string would
 *    coerce to `true`).
 */

import { z } from 'zod';
import {
  TourTriggerSchema,
  TourPrioritySchema,
  TourAudienceSchema,
  TourStatusSchema,
} from '@smart-edms/schemas';

// ---------------------------------------------------------------------------
// Query: GET /v1/tours
// ---------------------------------------------------------------------------

export const TourListQuerySchema = z
  .object({
    /** Filter by tour code (exact match). */
    code: z.string().min(1).max(64).optional(),
    /** Filter by audience (must match exactly one of the user's roles). */
    audience: TourAudienceSchema.optional(),
    /** Filter by module label. */
    module: z.string().min(1).max(64).optional(),
    /** Include tours already dismissed by the user. */
    includeDismissed: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    /** Include tours marked `doNotShowAgain` by the user. */
    includeDoNotShow: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    /** Limit (max 100). */
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type TourListQuery = z.infer<typeof TourListQuerySchema>;

// ---------------------------------------------------------------------------
// Body: POST /v1/tours/:tourId/start
// ---------------------------------------------------------------------------

export const StartTourBodySchema = z
  .object({
    /** How the tour was triggered (defaults to `manual`). */
    trigger: TourTriggerSchema.default('manual'),
    /** The current route the user is on — used for `first_module_entry`. */
    currentRoute: z.string().min(1).max(512).optional(),
  })
  .strict();

export type StartTourBody = z.infer<typeof StartTourBodySchema>;

// ---------------------------------------------------------------------------
// Body: POST /v1/tours/:tourId/complete
// ---------------------------------------------------------------------------

export const CompleteTourBodySchema = z
  .object({
    /** Optional final step order (1-based) the user reached. */
    finalStepOrder: z.number().int().min(1).optional(),
  })
  .strict();

export type CompleteTourBody = z.infer<typeof CompleteTourBodySchema>;

// ---------------------------------------------------------------------------
// Body: POST /v1/tours/:tourId/skip
// ---------------------------------------------------------------------------

export const SkipTourBodySchema = z
  .object({
    /** Localised reason key — never raw text (privacy). */
    reasonKey: z.string().min(1).max(128).optional(),
    /** Step order (1-based) where the user dropped off. */
    dropOffStep: z.number().int().min(1).optional(),
  })
  .strict();

export type SkipTourBody = z.infer<typeof SkipTourBodySchema>;

// ---------------------------------------------------------------------------
// Body: POST /v1/tours/:tourId/dismiss
// ---------------------------------------------------------------------------

export const DismissTourBodySchema = z
  .object({
    /** If true, sets `doNotShowAgain: true` on the user state. */
    doNotShowAgain: z.boolean().default(false),
  })
  .strict();

export type DismissTourBody = z.infer<typeof DismissTourBodySchema>;

// ---------------------------------------------------------------------------
// Body: POST /v1/tours/:tourId/progress
// ---------------------------------------------------------------------------

export const TourProgressBodySchema = z
  .object({
    /** The 1-based step order the user is currently on. */
    currentStepOrder: z.number().int().min(1),
    /** Total steps in the tour (informational, server cross-checks). */
    totalSteps: z.number().int().min(1).optional(),
    /** Estimated remaining seconds (informational, stored in analytics only). */
    estimatedRemainingSeconds: z.number().int().min(0).nullable().optional(),
    /** Whether the tour was resumed from a previous session. */
    resumed: z.boolean().default(false),
  })
  .strict();

export type TourProgressBody = z.infer<typeof TourProgressBodySchema>;

// ---------------------------------------------------------------------------
// Admin: PATCH /v1/admin/tours/:tourId
// ---------------------------------------------------------------------------

export const AdminUpdateTourBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    priority: TourPrioritySchema.optional(),
    triggerType: TourTriggerSchema.optional(),
    audience: z.array(TourAudienceSchema).max(20).optional(),
    licenseModuleRequired: z.string().min(1).max(64).nullable().optional(),
  })
  .strict();

export type AdminUpdateTourBody = z.infer<typeof AdminUpdateTourBodySchema>;

// ---------------------------------------------------------------------------
// Admin: GET /v1/admin/tours/analytics query
// ---------------------------------------------------------------------------

export const TourAnalyticsQuerySchema = z
  .object({
    /** Filter by tour code. */
    code: z.string().min(1).max(64).optional(),
    /** Filter by event kind. */
    kind: z
      .enum([
        'started',
        'step_viewed',
        'completed',
        'skipped',
        'dismissed',
        'drop_off',
        'restarted',
      ])
      .optional(),
    /** ISO date string (inclusive). */
    from: z.string().datetime().optional(),
    /** ISO date string (inclusive). */
    to: z.string().datetime().optional(),
    /** Limit number of buckets returned (max 200). */
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export type TourAnalyticsQuery = z.infer<typeof TourAnalyticsQuerySchema>;

// ---------------------------------------------------------------------------
// Query: GET /v1/admin/tours
// ---------------------------------------------------------------------------

export const AdminTourListQuerySchema = z
  .object({
    code: z.string().min(1).max(64).optional(),
    enabled: z.enum(['true', 'false']).optional().transform((v) =>
      v === undefined ? undefined : v === 'true',
    ),
    module: z.string().min(1).max(64).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export type AdminTourListQuery = z.infer<typeof AdminTourListQuerySchema>;

// ---------------------------------------------------------------------------
// Query: GET /v1/tours/upcoming-expiry-style filter (user-state list)
// ---------------------------------------------------------------------------

export const UserTourStateQuerySchema = z
  .object({
    status: TourStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export type UserTourStateQuery = z.infer<typeof UserTourStateQuerySchema>;
