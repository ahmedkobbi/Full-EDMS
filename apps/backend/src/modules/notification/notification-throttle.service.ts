/**
 * Notification throttle service (spec §9.13).
 *
 * Prevents notification bursts by:
 *  - Rate limiting per user (max N notifications per minute)
 *  - Deduplicating identical notifications within a time window
 *  - Respecting do-not-disturb preferences
 *
 * Spec ref: §9.13 (notification bursts must be throttled).
 */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/redis.service.js';

@Injectable()
export class NotificationThrottleService {
  private readonly logger = new Logger(NotificationThrottleService.name);
  private static readonly MAX_PER_MINUTE = 10;
  private static readonly DEDUP_WINDOW_SECONDS = 60;

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if a notification should be throttled.
   * Returns true if the notification should be sent, false if throttled.
   */
  async shouldSend(
    tenantId: string,
    userId: string,
    notificationKey: string, // e.g., "document.updated:abc-123"
  ): Promise<boolean> {
    // 1. Check rate limit (max per minute)
    const rateLimitKey = `notif:rate:${tenantId}:${userId}`;
    const count = await this.redis.connection.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.connection.expire(rateLimitKey, 60);
    }
    if (count > NotificationThrottleService.MAX_PER_MINUTE) {
      this.logger.debug(`Notification throttled (rate limit): user=${userId} count=${count}`);
      return false;
    }

    // 2. Check dedup (same notification key within window)
    const dedupKey = `notif:dedup:${tenantId}:${userId}:${notificationKey}`;
    const set = await this.redis.connection.set(dedupKey, '1', 'EX', NotificationThrottleService.DEDUP_WINDOW_SECONDS, 'NX');
    if (!set) {
      // Key already exists — duplicate notification within window
      this.logger.debug(`Notification throttled (dedup): user=${userId} key=${notificationKey}`);
      return false;
    }

    return true;
  }

  /**
   * Check do-not-disturb window.
   */
  isInDoNotDisturbWindow(
    dndEnabled: boolean,
    dndFrom: string | null, // e.g., "22:00"
    dndTo: string | null,   // e.g., "07:00"
    userTimezone: string = 'UTC',
  ): boolean {
    if (!dndEnabled || !dndFrom || !dndTo) return false;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: userTimezone,
    });
    const currentTime = formatter.format(now);
    const currentMinutes = parseInt(currentTime.slice(0, 2), 10) * 60 + parseInt(currentTime.slice(3, 5), 10);

    const fromMinutes = parseInt(dndFrom.slice(0, 2), 10) * 60 + parseInt(dndFrom.slice(3, 5), 10);
    const toMinutes = parseInt(dndTo.slice(0, 2), 10) * 60 + parseInt(dndTo.slice(3, 5), 10);

    // Handle overnight DnD (e.g., 22:00-07:00)
    if (fromMinutes > toMinutes) {
      return currentMinutes >= fromMinutes || currentMinutes < toMinutes;
    }
    // Same-day DnD (e.g., 12:00-13:00)
    return currentMinutes >= fromMinutes && currentMinutes < toMinutes;
  }
}
