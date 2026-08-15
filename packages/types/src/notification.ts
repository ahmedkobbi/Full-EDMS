/**
 * @smart-edms/types — notifications and alerts (spec §9.13)
 *
 * Purpose: model user notifications, admin alerts, channels, and severity.
 * Notifications must be queue-backed, localised, and privacy-safe; they
 * must not leak sensitive document contents unless explicitly permitted
 * (spec §9.13).
 */

import type { ISODateString, MessageKey, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';

/** Branded notification identifier. */
export type NotificationId = UUID & { readonly __notification: 'NotificationId' };

/** Channels through which a notification can be delivered. */
export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'desktop_push'
  | 'sms'
  | 'webhook'
  | 'mobile_push';

/** Severity drives routing, throttling, and visual treatment. */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical' | 'security';

/** Category of a notification; drives user preferences and grouping. */
export type NotificationCategory =
  | 'workflow'
  | 'share'
  | 'audit'
  | 'security'
  | 'license'
  | 'system'
  | 'retention'
  | 'legal_hold'
  | 'classification'
  | 'tour'
  | 'ai'
  | 'scanner'
  | 'admin';

/** Delivery status for a single channel. */
export type NotificationDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'suppressed';

/**
 * Per-channel delivery record. Failures are retried safely (spec §9.13).
 */
export interface NotificationDelivery {
  readonly channel: NotificationChannel;
  readonly status: NotificationDeliveryStatus;
  readonly attemptedAt: ISODateString;
  readonly deliveredAt: ISODateString | null;
  readonly failureReasonKey: string | null;
  /** Number of retries so far. */
  readonly retryCount: number;
}

/**
 * Notification record. The body and title are message keys rendered via
 * `t()` with interpolation variables; raw strings are never stored as the
 * primary contract.
 */
export interface Notification {
  readonly id: NotificationId;
  readonly tenantId: TenantId;
  readonly recipientUserId: UserId;
  readonly category: NotificationCategory;
  readonly severity: NotificationSeverity;
  /** Localised title key, rendered via `t(titleKey, vars)`. */
  readonly titleKey: MessageKey;
  /** Localised body key, rendered via `t(bodyKey, vars)`. */
  readonly bodyKey: MessageKey;
  /** Interpolation variables for title and body. */
  readonly vars: Readonly<Record<string, string | number | boolean>>;
  /** Channels the notification was dispatched to. */
  readonly deliveries: readonly NotificationDelivery[];
  /** Optional action label keys (e.g. "Review", "Dismiss"). */
  readonly actionKeys: readonly string[];
  /** Optional resource link (e.g. document id). */
  readonly resource: { readonly kind: string; readonly id: UUID } | null;
  readonly readAt: ISODateString | null;
  readonly createdAt: ISODateString;
  /** Whether the notification was suppressed by user preferences. */
  readonly suppressed: boolean;
}

/**
 * Notification preference envelope. Per spec §9.13 users can disable
 * notification categories and channels.
 */
export interface NotificationPreferences {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  /** Categories the user has opted out of. */
  readonly disabledCategories: readonly NotificationCategory[];
  /** Channels the user has opted out of. */
  readonly disabledChannels: readonly NotificationChannel[];
  /** Whether security and critical alerts can be muted (usually false). */
  readonly allowMutingCritical: boolean;
  /** Quiet-hours window (user local time). */
  readonly quietHours: {
    readonly enabled: boolean;
    readonly startLocal: string;
    readonly endLocal: string;
  };
}

/**
 * Throttle policy applied to a burst of notifications (spec §9.13).
 * Bursts are throttled to avoid spamming the user.
 */
export interface NotificationThrottlePolicy {
  readonly tenantId: TenantId;
  readonly category: NotificationCategory;
  readonly maxPerMinute: number;
  readonly maxPerHour: number;
  readonly maxPerDay: number;
}
