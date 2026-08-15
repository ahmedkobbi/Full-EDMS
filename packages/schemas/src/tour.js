"use strict";
/**
 * @smart-edms/schemas — guided tour system (spec §10, §10.11, §10.14)
 *
 * Zod schemas for: tour definition, step create, user state update
 * (start/complete/skip/dismiss/progress), admin update.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TourChecklistItemSchema = exports.TourAnalyticsEventSchema = exports.TourAdminUpdateSchema = exports.TourProgressRequestSchema = exports.DismissTourRequestSchema = exports.SkipTourRequestSchema = exports.CompleteTourRequestSchema = exports.StartTourRequestSchema = exports.TourUserStateSchema = exports.CreateTourStepRequestSchema = exports.TourStepSchema = exports.TourDefinitionSchema = exports.TourAnalyticsEventKindSchema = exports.TourStepActionTypeSchema = exports.TourStepPlacementSchema = exports.TourPrioritySchema = exports.TourAudienceSchema = exports.TourTriggerSchema = exports.TourStatusSchema = exports.TourCodeSchema = exports.TourAnalyticsEventIdSchema = exports.TourUserStateIdSchema = exports.TourStepIdSchema = exports.TourDefinitionIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const license_1 = require("./license");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.TourDefinitionIdSchema = common_1.UuidSchema.transform((v) => v);
exports.TourStepIdSchema = common_1.UuidSchema.transform((v) => v);
exports.TourUserStateIdSchema = common_1.UuidSchema.transform((v) => v);
exports.TourAnalyticsEventIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums (spec §10.2, §10.11, §10.14)
// ---------------------------------------------------------------------------
/** `z.infer` === `TourCode` (14 mandatory tour codes). */
exports.TourCodeSchema = zod_1.z.enum([
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
exports.TourStatusSchema = zod_1.z.enum([
    'not_started',
    'in_progress',
    'completed',
    'skipped',
    'dismissed',
]);
/** `z.infer` === `TourTrigger` (13 trigger kinds). */
exports.TourTriggerSchema = zod_1.z.enum([
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
exports.TourAudienceSchema = zod_1.z.enum([
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
exports.TourPrioritySchema = zod_1.z.enum(['low', 'normal', 'high', 'critical']);
/** `z.infer` === `TourStepPlacement`. */
exports.TourStepPlacementSchema = zod_1.z.enum([
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
exports.TourStepActionTypeSchema = zod_1.z.enum([
    'none',
    'click',
    'hover',
    'input',
    'navigate',
    'checklist_toggle',
    'wait_for_event',
]);
/** `z.infer` === `TourAnalyticsEventKind`. */
exports.TourAnalyticsEventKindSchema = zod_1.z.enum([
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
exports.TourDefinitionSchema = zod_1.z
    .object({
    id: exports.TourDefinitionIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    code: exports.TourCodeSchema,
    module: zod_1.z.string().min(1).max(64),
    audience: exports.TourAudienceSchema,
    priority: exports.TourPrioritySchema,
    version: zod_1.z.number().int().min(1),
    trigger: exports.TourTriggerSchema,
    enabled: zod_1.z.boolean(),
    licenseModuleRequired: license_1.EntitlementModuleSchema.nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `TourStep`. */
exports.TourStepSchema = zod_1.z
    .object({
    id: exports.TourStepIdSchema,
    tourId: exports.TourDefinitionIdSchema,
    stepOrder: zod_1.z.number().int().min(1),
    targetSelector: zod_1.z.string().min(1).max(256),
    titleKey: common_1.MessageKeySchema,
    bodyKey: common_1.MessageKeySchema,
    placement: exports.TourStepPlacementSchema,
    requiresPermission: zod_1.z.string().min(1).max(128).nullable(),
    requiresLicenseModule: license_1.EntitlementModuleSchema.nullable(),
    actionType: exports.TourStepActionTypeSchema,
    waitForEvent: zod_1.z.string().min(1).max(128).nullable(),
    enabled: zod_1.z.boolean(),
})
    .strict();
/** Request body for `POST /v1/admin/tours/:id/steps` (step create). */
exports.CreateTourStepRequestSchema = zod_1.z
    .object({
    stepOrder: zod_1.z.number().int().min(1),
    targetSelector: zod_1.z.string().min(1).max(256),
    titleKey: zod_1.z.string().min(1).max(128),
    bodyKey: zod_1.z.string().min(1).max(128),
    placement: exports.TourStepPlacementSchema,
    requiresPermission: zod_1.z.string().min(1).max(128).nullable().optional(),
    requiresLicenseModule: license_1.EntitlementModuleSchema.nullable().optional(),
    actionType: exports.TourStepActionTypeSchema.default('none'),
    waitForEvent: zod_1.z.string().min(1).max(128).nullable().optional(),
    enabled: zod_1.z.boolean().default(true),
})
    .strict();
// ---------------------------------------------------------------------------
// User state + progress
// ---------------------------------------------------------------------------
/** `z.infer` matches `TourUserState`. */
exports.TourUserStateSchema = zod_1.z
    .object({
    id: exports.TourUserStateIdSchema,
    userId: user_1.UserIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    tourId: exports.TourDefinitionIdSchema,
    status: exports.TourStatusSchema,
    currentStepId: exports.TourStepIdSchema.nullable(),
    startedAt: common_1.IsoDateStringSchema.nullable(),
    completedAt: common_1.IsoDateStringSchema.nullable(),
    skippedAt: common_1.IsoDateStringSchema.nullable(),
    dismissedAt: common_1.IsoDateStringSchema.nullable(),
    doNotShowAgain: zod_1.z.boolean(),
    lastStepOrder: zod_1.z.number().int().min(0),
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/tours/:id/start`. */
exports.StartTourRequestSchema = zod_1.z
    .object({
    trigger: exports.TourTriggerSchema.default('manual'),
})
    .strict();
/** Request body for `POST /v1/tours/:id/complete`. */
exports.CompleteTourRequestSchema = zod_1.z
    .object({
    finalStepOrder: zod_1.z.number().int().min(1).optional(),
})
    .strict();
/** Request body for `POST /v1/tours/:id/skip`. */
exports.SkipTourRequestSchema = zod_1.z
    .object({
    reasonKey: zod_1.z.string().min(1).max(128).optional(),
    dropOffStep: zod_1.z.number().int().min(1).optional(),
})
    .strict();
/** Request body for `POST /v1/tours/:id/dismiss`. */
exports.DismissTourRequestSchema = zod_1.z
    .object({
    doNotShowAgain: zod_1.z.boolean().default(false),
})
    .strict();
/** Request body for `POST /v1/tours/:id/progress`. `z.infer` matches `TourProgress`. */
exports.TourProgressRequestSchema = zod_1.z
    .object({
    tourId: exports.TourDefinitionIdSchema,
    currentStepOrder: zod_1.z.number().int().min(1),
    totalSteps: zod_1.z.number().int().min(1),
    estimatedRemainingSeconds: zod_1.z.number().int().min(0).nullable(),
    resumed: zod_1.z.boolean(),
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// Admin update
// ---------------------------------------------------------------------------
/** `z.infer` matches `TourAdminUpdate`. */
exports.TourAdminUpdateSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean().optional(),
    priority: exports.TourPrioritySchema.optional(),
    trigger: exports.TourTriggerSchema.optional(),
    audience: exports.TourAudienceSchema.optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Analytics + checklist
// ---------------------------------------------------------------------------
/** `z.infer` matches `TourAnalyticsEvent`. */
exports.TourAnalyticsEventSchema = zod_1.z
    .object({
    id: exports.TourAnalyticsEventIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    userId: user_1.UserIdSchema,
    tourId: exports.TourDefinitionIdSchema,
    kind: exports.TourAnalyticsEventKindSchema,
    stepOrder: zod_1.z.number().int().min(1).nullable(),
    durationSeconds: zod_1.z.number().int().min(0).nullable(),
    dropOffStep: zod_1.z.number().int().min(1).nullable(),
    occurredAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `TourChecklistItem`. */
exports.TourChecklistItemSchema = zod_1.z
    .object({
    id: common_1.UuidSchema,
    tourId: exports.TourDefinitionIdSchema,
    labelKey: common_1.MessageKeySchema,
    completionResolverCode: zod_1.z.string().min(1).max(64),
    completed: zod_1.z.boolean(),
    completedAt: common_1.IsoDateStringSchema.nullable(),
    launchesTourId: exports.TourDefinitionIdSchema.nullable(),
})
    .strict();
//# sourceMappingURL=tour.js.map