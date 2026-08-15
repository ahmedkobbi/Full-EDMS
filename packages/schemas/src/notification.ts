/**
 * @smart-edms/schemas — notifications & alerts (spec §9.13)
 *
 * Zod schemas for: notification preferences, send, list query.
 */

import { z } from 'zod';
import type { NotificationId } from '@smart-edms/types';
import {
  IsoDateStringSchema,
  MessageKeySchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const NotificationIdSchema = UuidSchema.transform(
  (v): NotificationId => v as NotificationId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `NotificationChannel`. */
export const NotificationChannelSchema = z.enum([
  'in_app',
  'email',
  'desktop_push',
  'sms',
  'webhook',
  'mobile_push',
]);

/** `z.infer` === `NotificationSeverity`. */
export const NotificationSeveritySchema = z.enum([
  'info',
  'success',
  'warning',
  'critical',
  'security',
]);

/** `z.infer` === `NotificationCategory`. */
export const NotificationCategorySchema = z.enum([
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
export const NotificationDeliveryStatusSchema = z.enum([
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
export const NotificationDeliverySchema = z
  .object({
    channel: NotificationChannelSchema,
    status: NotificationDeliveryStatusSchema,
    attemptedAt: IsoDateStringSchema,
    deliveredAt: IsoDateStringSchema.nullable(),
    failureReasonKey: z.string().min(1).max(128).nullable(),
    retryCount: z.number().int().min(0),
  })
  .strict();

/** `z.infer` matches `Notification`. */
export const NotificationSchema = z
  .object({
    id: NotificationIdSchema,
    tenantId: TenantIdSchema,
    recipientUserId: UserIdSchema,
    category: NotificationCategorySchema,
    severity: NotificationSeveritySchema,
    titleKey: MessageKeySchema,
    bodyKey: MessageKeySchema,
    vars: z.record(z.string(), z.union([z.string(), z.number().int(), z.boolean()])),
    deliveries: z.array(NotificationDeliverySchema),
    actionKeys: z.array(z.string().min(1).max(128)),
    resource: z
      .object({
        kind: z.string().min(1).max(64),
        id: UuidSchema,
      })
      .nullable(),
    readAt: IsoDateStringSchema.nullable(),
    createdAt: IsoDateStringSchema,
    suppressed: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

/** `z.infer` matches `NotificationPreferences`. */
export const NotificationPreferencesSchema = z
  .object({
    userId: UserIdSchema,
    tenantId: TenantIdSchema,
    disabledCategories: z.array(NotificationCategorySchema),
    disabledChannels: z.array(NotificationChannelSchema),
    allowMutingCritical: z.boolean(),
    quietHours: z
      .object({
        enabled: z.boolean(),
        startLocal: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'startLocal must be HH:MM'),
        endLocal: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'endLocal must be HH:MM'),
      })
      .strict(),
  })
  .strict();

/** Request body for `PATCH /v1/me/notification-preferences`. */
export const UpdateNotificationPreferencesRequestSchema = z
  .object({
    disabledCategories: z.array(NotificationCategorySchema).optional(),
    disabledChannels: z.array(NotificationChannelSchema).optional(),
    allowMutingCritical: z.boolean().optional(),
    quietHours: z
      .object({
        enabled: z.boolean(),
        startLocal: z.string().regex(/^\d{2}:\d{2}$/),
        endLocal: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .partial()
      .optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Send / List
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/admin/notifications/send` (admin send). */
export const SendNotificationRequestSchema = z
  .object({
    recipientUserIds: z.array(UserIdSchema).min(1).max(10000),
    category: NotificationCategorySchema,
    severity: NotificationSeveritySchema,
    titleKey: MessageKeySchema,
    bodyKey: MessageKeySchema,
    vars: z
      .record(z.string(), z.union([z.string(), z.number().int(), z.boolean()]))
      .default({}),
    channels: z.array(NotificationChannelSchema).min(1),
    actionKeys: z.array(z.string().min(1).max(128)).default([]),
    resource: z
      .object({
        kind: z.string().min(1).max(64),
        id: UuidSchema,
      })
      .nullable()
      .optional(),
  })
  .strict();

/** Request body for `GET /v1/notifications` (list query). */
export const NotificationListQuerySchema = z
  .object({
    category: NotificationCategorySchema.optional(),
    severity: NotificationSeveritySchema.optional(),
    read: z.boolean().optional(),
    from: IsoDateStringSchema.optional(),
    to: IsoDateStringSchema.optional(),
    limit: z.number().int().min(1).max(200).default(50),
    cursor: z.string().min(1).max(1024).nullable().optional(),
  })
  .strict();

/** Request body for `POST /v1/notifications/:id/read` (mark as read). */
export const MarkNotificationReadRequestSchema = z
  .object({
    readAt: IsoDateStringSchema.optional(),
  })
  .strict();

/** `z.infer` matches `NotificationThrottlePolicy`. */
export const NotificationThrottlePolicySchema = z
  .object({
    tenantId: TenantIdSchema,
    category: NotificationCategorySchema,
    maxPerMinute: z.number().int().min(0),
    maxPerHour: z.number().int().min(0),
    maxPerDay: z.number().int().min(0),
  })
  .strict();
