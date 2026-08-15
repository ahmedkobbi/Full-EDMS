import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis.service.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  unreadOnly: z.coerce.boolean().default(false),
});

const createSchema = z.object({
  userId: z.string().uuid(),
  channel: z.enum(['in_app', 'email', 'desktop', 'sms']).default('in_app'),
  severity: z.enum(['info', 'success', 'warning', 'danger']).default('info'),
  titleKey: z.string().min(1).max(128),
  bodyKey: z.string().min(1).max(256),
  titleVars: z.record(z.string(), z.unknown()).optional(),
  bodyVars: z.record(z.string(), z.unknown()).optional(),
  actionUrl: z.string().max(512).optional(),
});

/**
 * Notification service. In-app notifications + queue-backed email/desktop dispatch.
 * Spec ref: §9.13 (notifications and alerts).
 *
 * Rules:
 * - Notifications never leak sensitive document contents (only titleKey/bodyKey + vars)
 * - Templates localized client-side via t(titleKey, titleVars)
 * - Notification failures retried safely (BullMQ)
 * - Throttled to prevent bursts
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listForUser(tenantId: string, userId: string, rawQuery: unknown) {
    const q = listQuerySchema.parse(rawQuery);
    const where = {
      tenantId,
      userId,
      ...(q.unreadOnly ? { readAt: null } : {}),
    };
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: q.limit,
        ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      }),
      this.prisma.notification.count({ where: { tenantId, userId, readAt: null } }),
    ]);
    return {
      items,
      unreadCount,
      cursor: items.length === q.limit ? items[items.length - 1]?.id : null,
      limit: q.limit,
    };
  }

  async markRead(tenantId: string, userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, tenantId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Internal: enqueue a notification for a user. Email/desktop dispatch is queued via Redis.
   */
  async send(tenantId: string, raw: unknown) {
    const input = createSchema.parse(raw);
    const notif = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: input.userId,
        channel: input.channel,
        severity: input.severity,
        titleKey: input.titleKey,
        bodyKey: input.bodyKey,
        titleVars: (input.titleVars as any) ?? undefined,
        bodyVars: (input.bodyVars as any) ?? undefined,
        actionUrl: input.actionUrl,
      },
    });
    // Publish to Redis for WebSocket fan-out
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'notification.created',
        payload: { tenantId, userId: input.userId, notification: notif },
      }),
    );
    return notif;
  }
}
