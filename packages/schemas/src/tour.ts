/**
 * @smart-edms/schemas — guided tour system (spec §10, §10.11, §10.14)
 *
 * Zod schemas for: tour definition, step create, user state update
 * (start/complete/skip/dismiss/progress), admin update.
 */

import { z } from 'zod';
import type {
  TourAnalyticsEventId,
  TourDefinitionId,
  TourStepId,
  TourUserStateId,
} from '@smart-edms/types';
import {
  IsoDateStringSchema,
  MessageKeySchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { EntitlementModuleSchema } from './license';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const TourDefinitionIdSchema = UuidSchema.transform(
  (v): TourDefinitionId => v as TourDefinitionId,
);
export const TourStepIdSchema = UuidSchema.transform(
  (v): TourStepId => v as TourStepId,
);
export const TourUserStateIdSchema = UuidSchema.transform(
  (v): TourUserStateId => v as TourUserStateId,
);
export const TourAnalyticsEventIdSchema = UuidSchema.transform(
  (v): TourAnalyticsEventId => v as TourAnalyticsEventId,
);

// ---------------------------------------------------------------------------
// Enums (spec §10.2, §10.11, §10.14)
// ---------------------------------------------------------------------------

/** `z.infer` === `TourCode` (14 mandatory tour codes). */
export const TourCodeSchema = z.enum([
  'welcome',
  'documents',
  'search',
  'records_manager',
  'security_officer',
  'auditor',
  'administrator',
  'workflow_designer',
  'scanner',
  'license',
  'realtime_collaboration',
  'ai_assistant',
  'empty_state_learning',
  'marketing_public',
]);

/** `z.infer` === `TourStatus`. */
export const TourStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'skipped',
  'dismissed',
]);

/** `z.infer` === `TourTrigger` (13 trigger kinds). */
export const TourTriggerSchema = z.enum([
  'first_login',
  'first_module_entry',
  'help_menu',
  'admin_invitation',
  'license_activation',
  'scanner_agent_first_detected',
  'workflow_designer_first_opened',
  'audit_explorer_first_opened',
  'ai_assistant_first_opened',
  'empty_state_action',
  'command_palette',
  'in_app_notification',
  'manual',
]);

/** `z.infer` === `TourAudience`. */
export const TourAudienceSchema = z.enum([
  'end_user',
  'records_manager',
  'security_officer',
  'auditor',
  'tenant_admin',
  'workflow_designer',
  'it_administrator',
  'marketing_visitor',
  'all',
]);

/** `z.infer` === `TourPriority`. */
export const TourPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);

/** `z.infer` === `TourStepPlacement`. */
export const TourStepPlacementSchema = z.enum([
  'top',
  'bottom',
  'start',
  'end',
  'top_start',
  'top_end',
  'bottom_start',
  'bottom_end',
  'center',
]);

/** `z.infer` === `TourStepActionType`. */
export const TourStepActionTypeSchema = z.enum([
  'none',
  'click',
  'hover',
  'input',
  'navigate',
  'checklist_toggle',
  'wait_for_event',
]);

/** `z.infer` === `TourAnalyticsEventKind`. */
export const TourAnalyticsEventKindSchema = z.enum([
  'started',
  'step_viewed',
  'completed',
  'skipped',
  'dismissed',
  'drop_off',
  'restarted',
]);

// ---------------------------------------------------------------------------
// Definition / Step
// ---------------------------------------------------------------------------

/** `z.infer` matches `TourDefinition`. */
export const TourDefinitionSchema = z
  .object({
    id: TourDefinitionIdSchema,
    tenantId: TenantIdSchema,
    code: TourCodeSchema,
    module: z.string().min(1).max(64),
    audience: TourAudienceSchema,
    priority: TourPrioritySchema,
    version: z.number().int().min(1),
    trigger: TourTriggerSchema,
    enabled: z.boolean(),
    licenseModuleRequired: EntitlementModuleSchema.nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `TourStep`. */
export const TourStepSchema = z
  .object({
    id: TourStepIdSchema,
    tourId: TourDefinitionIdSchema,
    stepOrder: z.number().int().min(1),
    targetSelector: z.string().min(1).max(256),
    titleKey: MessageKeySchema,
    bodyKey: MessageKeySchema,
    placement: TourStepPlacementSchema,
    requiresPermission: z.string().min(1).max(128).nullable(),
    requiresLicenseModule: EntitlementModuleSchema.nullable(),
    actionType: TourStepActionTypeSchema,
    waitForEvent: z.string().min(1).max(128).nullable(),
    enabled: z.boolean(),
  })
  .strict();

/** Request body for `POST /v1/admin/tours/:id/steps` (step create). */
export const CreateTourStepRequestSchema = z
  .object({
    stepOrder: z.number().int().min(1),
    targetSelector: z.string().min(1).max(256),
    titleKey: z.string().min(1).max(128),
    bodyKey: z.string().min(1).max(128),
    placement: TourStepPlacementSchema,
    requiresPermission: z.string().min(1).max(128).nullable().optional(),
    requiresLicenseModule: EntitlementModuleSchema.nullable().optional(),
    actionType: TourStepActionTypeSchema.default('none'),
    waitForEvent: z.string().min(1).max(128).nullable().optional(),
    enabled: z.boolean().default(true),
  })
  .strict();

// ---------------------------------------------------------------------------
// User state + progress
// ---------------------------------------------------------------------------

/** `z.infer` matches `TourUserState`. */
export const TourUserStateSchema = z
  .object({
    id: TourUserStateIdSchema,
    userId: UserIdSchema,
    tenantId: TenantIdSchema,
    tourId: TourDefinitionIdSchema,
    status: TourStatusSchema,
    currentStepId: TourStepIdSchema.nullable(),
    startedAt: IsoDateStringSchema.nullable(),
    completedAt: IsoDateStringSchema.nullable(),
    skippedAt: IsoDateStringSchema.nullable(),
    dismissedAt: IsoDateStringSchema.nullable(),
    doNotShowAgain: z.boolean(),
    lastStepOrder: z.number().int().min(0),
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/tours/:id/start`. */
export const StartTourRequestSchema = z
  .object({
    trigger: TourTriggerSchema.default('manual'),
  })
  .strict();

/** Request body for `POST /v1/tours/:id/complete`. */
export const CompleteTourRequestSchema = z
  .object({
    finalStepOrder: z.number().int().min(1).optional(),
  })
  .strict();

/** Request body for `POST /v1/tours/:id/skip`. */
export const SkipTourRequestSchema = z
  .object({
    reasonKey: z.string().min(1).max(128).optional(),
    dropOffStep: z.number().int().min(1).optional(),
  })
  .strict();

/** Request body for `POST /v1/tours/:id/dismiss`. */
export const DismissTourRequestSchema = z
  .object({
    doNotShowAgain: z.boolean().default(false),
  })
  .strict();

/** Request body for `POST /v1/tours/:id/progress`. `z.infer` matches `TourProgress`. */
export const TourProgressRequestSchema = z
  .object({
    tourId: TourDefinitionIdSchema,
    currentStepOrder: z.number().int().min(1),
    totalSteps: z.number().int().min(1),
    estimatedRemainingSeconds: z.number().int().min(0).nullable(),
    resumed: z.boolean(),
    updatedAt: IsoDateStringSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Admin update
// ---------------------------------------------------------------------------

/** `z.infer` matches `TourAdminUpdate`. */
export const TourAdminUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    priority: TourPrioritySchema.optional(),
    trigger: TourTriggerSchema.optional(),
    audience: TourAudienceSchema.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Analytics + checklist
// ---------------------------------------------------------------------------

/** `z.infer` matches `TourAnalyticsEvent`. */
export const TourAnalyticsEventSchema = z
  .object({
    id: TourAnalyticsEventIdSchema,
    tenantId: TenantIdSchema,
    userId: UserIdSchema,
    tourId: TourDefinitionIdSchema,
    kind: TourAnalyticsEventKindSchema,
    stepOrder: z.number().int().min(1).nullable(),
    durationSeconds: z.number().int().min(0).nullable(),
    dropOffStep: z.number().int().min(1).nullable(),
    occurredAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `TourChecklistItem`. */
export const TourChecklistItemSchema = z
  .object({
    id: UuidSchema,
    tourId: TourDefinitionIdSchema,
    labelKey: MessageKeySchema,
    completionResolverCode: z.string().min(1).max(64),
    completed: z.boolean(),
    completedAt: IsoDateStringSchema.nullable(),
    launchesTourId: TourDefinitionIdSchema.nullable(),
  })
  .strict();
