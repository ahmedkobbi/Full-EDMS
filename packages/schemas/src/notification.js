"use strict";
/**
 * @smart-edms/schemas — notifications & alerts (spec §9.13)
 *
 * Zod schemas for: notification preferences, send, list query.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationThrottlePolicySchema = exports.MarkNotificationReadRequestSchema = exports.NotificationListQuerySchema = exports.SendNotificationRequestSchema = exports.UpdateNotificationPreferencesRequestSchema = exports.NotificationPreferencesSchema = exports.NotificationSchema = exports.NotificationDeliverySchema = exports.NotificationDeliveryStatusSchema = exports.NotificationCategorySchema = exports.NotificationSeveritySchema = exports.NotificationChannelSchema = exports.NotificationIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.NotificationIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `NotificationChannel`. */
exports.NotificationChannelSchema = zod_1.z.enum([
    'in_app',
    'email',
    'desktop_push',
    'sms',
    'webhook',
    'mobile_push',
]);
/** `z.infer` === `NotificationSeverity`. */
exports.NotificationSeveritySchema = zod_1.z.enum([
    'info',
    'success',
    'warning',
    'critical',
    'security',
]);
/** `z.infer` === `NotificationCategory`. */
exports.NotificationCategorySchema = zod_1.z.enum([
    'workflow',
    'share',
    'audit',
    'security',
    'license',
    'system',
    'retention',
    'legal_hold',
    'classification',
    'tour',
    'ai',
    'scanner',
    'admin',
]);
/** `z.infer` === `NotificationDeliveryStatus`. */
exports.NotificationDeliveryStatusSchema = zod_1.z.enum([
    'pending',
    'sent',
    'delivered',
    'read',
    'failed',
    'suppressed',
]);
// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
/** `z.infer` matches `NotificationDelivery`. */
exports.NotificationDeliverySchema = zod_1.z
    .object({
    channel: exports.NotificationChannelSchema,
    status: exports.NotificationDeliveryStatusSchema,
    attemptedAt: common_1.IsoDateStringSchema,
    deliveredAt: common_1.IsoDateStringSchema.nullable(),
    failureReasonKey: zod_1.z.string().min(1).max(128).nullable(),
    retryCount: zod_1.z.number().int().min(0),
})
    .strict();
/** `z.infer` matches `Notification`. */
exports.NotificationSchema = zod_1.z
    .object({
    id: exports.NotificationIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    recipientUserId: user_1.UserIdSchema,
    category: exports.NotificationCategorySchema,
    severity: exports.NotificationSeveritySchema,
    titleKey: common_1.MessageKeySchema,
    bodyKey: common_1.MessageKeySchema,
    vars: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number().int(), zod_1.z.boolean()])),
    deliveries: zod_1.z.array(exports.NotificationDeliverySchema),
    actionKeys: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    resource: zod_1.z
        .object({
        kind: zod_1.z.string().min(1).max(64),
        id: common_1.UuidSchema,
    })
        .nullable(),
    readAt: common_1.IsoDateStringSchema.nullable(),
    createdAt: common_1.IsoDateStringSchema,
    suppressed: zod_1.z.boolean(),
})
    .strict();
// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------
/** `z.infer` matches `NotificationPreferences`. */
exports.NotificationPreferencesSchema = zod_1.z
    .object({
    userId: user_1.UserIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    disabledCategories: zod_1.z.array(exports.NotificationCategorySchema),
    disabledChannels: zod_1.z.array(exports.NotificationChannelSchema),
    allowMutingCritical: zod_1.z.boolean(),
    quietHours: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        startLocal: zod_1.z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'startLocal must be HH:MM'),
        endLocal: zod_1.z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'endLocal must be HH:MM'),
    })
        .strict(),
})
    .strict();
/** Request body for `PATCH /v1/me/notification-preferences`. */
exports.UpdateNotificationPreferencesRequestSchema = zod_1.z
    .object({
    disabledCategories: zod_1.z.array(exports.NotificationCategorySchema).optional(),
    disabledChannels: zod_1.z.array(exports.NotificationChannelSchema).optional(),
    allowMutingCritical: zod_1.z.boolean().optional(),
    quietHours: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        startLocal: zod_1.z.string().regex(/^\d{2}:\d{2}$/),
        endLocal: zod_1.z.string().regex(/^\d{2}:\d{2}$/),
    })
        .partial()
        .optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Send / List
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/admin/notifications/send` (admin send). */
exports.SendNotificationRequestSchema = zod_1.z
    .object({
    recipientUserIds: zod_1.z.array(user_1.UserIdSchema).min(1).max(10000),
    category: exports.NotificationCategorySchema,
    severity: exports.NotificationSeveritySchema,
    titleKey: common_1.MessageKeySchema,
    bodyKey: common_1.MessageKeySchema,
    vars: zod_1.z
        .record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number().int(), zod_1.z.boolean()]))
        .default({}),
    channels: zod_1.z.array(exports.NotificationChannelSchema).min(1),
    actionKeys: zod_1.z.array(zod_1.z.string().min(1).max(128)).default([]),
    resource: zod_1.z
        .object({
        kind: zod_1.z.string().min(1).max(64),
        id: common_1.UuidSchema,
    })
        .nullable()
        .optional(),
})
    .strict();
/** Request body for `GET /v1/notifications` (list query). */
exports.NotificationListQuerySchema = zod_1.z
    .object({
    category: exports.NotificationCategorySchema.optional(),
    severity: exports.NotificationSeveritySchema.optional(),
    read: zod_1.z.boolean().optional(),
    from: common_1.IsoDateStringSchema.optional(),
    to: common_1.IsoDateStringSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(200).default(50),
    cursor: zod_1.z.string().min(1).max(1024).nullable().optional(),
})
    .strict();
/** Request body for `POST /v1/notifications/:id/read` (mark as read). */
exports.MarkNotificationReadRequestSchema = zod_1.z
    .object({
    readAt: common_1.IsoDateStringSchema.optional(),
})
    .strict();
/** `z.infer` matches `NotificationThrottlePolicy`. */
exports.NotificationThrottlePolicySchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    category: exports.NotificationCategorySchema,
    maxPerMinute: zod_1.z.number().int().min(0),
    maxPerHour: zod_1.z.number().int().min(0),
    maxPerDay: zod_1.z.number().int().min(0),
})
    .strict();
//# sourceMappingURL=notification.js.map