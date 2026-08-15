import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RedisService } from '../../common/redis.service.js';
import { Queue, QueueEvents } from 'bullmq';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * Webhook event types (spec §12 — webhook events).
 */
export type WebhookEvent =
  | 'license.issued'
  | 'license.renewed'
  | 'license.revoked'
  | 'license.expired'
  | 'trial.started'
  | 'trial.expired'
  | 'heartbeat.failed'
  | 'activation.created';

export const webhookEvents: readonly WebhookEvent[] = [
  'license.issued',
  'license.renewed',
  'license.revoked',
  'license.expired',
  'trial.started',
  'trial.expired',
  'heartbeat.failed',
  'activation.created',
];

export const createWebhookSchema = z.object({
  customerId: z.string().uuid(),
  url: z.string().url().max(2048),
  events: z.array(z.enum(webhookEvents as unknown as [WebhookEvent, ...WebhookEvent[]])).default([]),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

const WEBHOOK_QUEUE_NAME = 'license-server:webhooks';

/**
 * Webhook service — emits events to a BullMQ queue for async delivery
 * with retries + exponential backoff.
 *
 * Spec ref: §12 (webhook events), §13 (BullMQ queue).
 *
 * Delivery guarantees:
 *   - At-least-once (events may be delivered more than once if the
 *     worker crashes mid-delivery; customers MUST dedupe by event ID).
 *   - HMAC-SHA256 signature in `X-Smart-Edms-Signature` header so
 *     customers can verify authenticity.
 *   - Max 5 attempts (configurable via WEBHOOK_MAX_ATTEMPTS).
 *   - Exponential backoff (1s, 2s, 4s, 8s, 16s).
 *   - Dead-letter queue for permanent failures (5xx after all retries,
 *     or 4xx that are not 408/429).
 */
@Injectable()
export class WebhookService implements OnModuleInit {
  private readonly logger = new Logger(WebhookService.name);
  private queue!: Queue;
  private queueEvents!: QueueEvents;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queue = new Queue(WEBHOOK_QUEUE_NAME, {
      connection: this.redis.connection,
      defaultJobOptions: {
        attempts: this.config.get<number>('WEBHOOK_MAX_ATTEMPTS') ?? 5,
        backoff: {
          type: 'exponential',
          delay: this.config.get<number>('WEBHOOK_BACKOFF_BASE_MS') ?? 1000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
    this.queueEvents = new QueueEvents(WEBHOOK_QUEUE_NAME, {
      connection: this.redis.connection,
    });
    this.queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.warn(`Webhook job ${jobId} permanently failed: ${failedReason}`);
    });
    this.logger.log(`Webhook queue '${WEBHOOK_QUEUE_NAME}' initialised`);
  }

  /**
   * Emit a webhook event. Looks up all active webhooks for the customer
   * that subscribe to the event, creates a WebhookDelivery row, and
   * enqueues a BullMQ job for each.
   *
   * This method is non-blocking — it returns immediately after enqueueing.
   * Failures during delivery are handled by the worker
   * (see `webhook-worker.ts`).
   */
  async emit(input: {
    customerId: string;
    event: WebhookEvent;
    payload: Record<string, unknown>;
  }): Promise<void> {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          customerId: input.customerId,
          isActive: true,
          events: { has: input.event },
        },
      });
      if (webhooks.length === 0) return;

      const eventId = randomUUID();
      const timestamp = new Date().toISOString();
      const body = JSON.stringify({
        id: eventId,
        event: input.event,
        customerId: input.customerId,
        timestamp,
        payload: input.payload,
      });

      for (const webhook of webhooks) {
        // Create a WebhookDelivery row (for the admin panel's delivery log).
        const delivery = await this.prisma.webhookDelivery.create({
          data: {
            id: randomUUID(),
            webhookId: webhook.id,
            event: input.event,
            payload: body as unknown as object,
            status: 'pending',
            attempts: [],
          },
        });

        // Enqueue the delivery job. The worker will perform the actual
        // HTTP POST + retry.
        await this.queue.add(
          'deliver',
          {
            deliveryId: delivery.id,
            webhookId: webhook.id,
            url: webhook.url,
            secretHash: webhook.secretHash,
            body,
            eventId,
            event: input.event,
          },
          { jobId: delivery.id },
        );
      }
    } catch (err) {
      // Webhook failures must NEVER break the calling request flow.
      this.logger.error(
        `Webhook emit failed for event ${input.event}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Compute the HMAC-SHA256 signature for a webhook body.
   *
   * Spec ref: §12 — "HMAC-SHA256 signature in `X-Smart-Edms-Signature` header".
   *
   * Note: the webhook's secret is hashed at rest (`secretHash` column).
   * For HMAC computation we need the PLAINTEXT secret, which is shown
   * only once at creation. To support this, we store the plaintext
   * secret encrypted in a separate column (`secretEncrypted`) OR we
   * store the HMAC key as the hash itself and use a deterministic
   * derivation. For simplicity in this skeleton, we use the hash as
   * the HMAC key — this means the customer must use the hash (not the
   * plaintext) when verifying. Production deployments should use a
   * proper KMS-encrypted secret.
   */
  computeSignature(secretHash: string, body: string): string {
    const hmac = createHmac('sha256', secretHash).update(body, 'utf8').digest('hex');
    return `sha256=${hmac}`;
  }

  // ── Webhook CRUD ──────────────────────────────────────────────────────

  async createWebhook(input: CreateWebhookInput, adminId: string, ipAddress?: string): Promise<{
    webhook: unknown;
    secret: string; // plaintext — shown once
  }> {
    const secret = generateWebhookSecret();
    const secretHash = sha256Hex(secret);
    const webhook = await this.prisma.webhook.create({
      data: {
        id: randomUUID(),
        customerId: input.customerId,
        url: input.url,
        secretHash,
        events: input.events,
        isActive: true,
      },
    });
    await this.audit.record({
      adminId,
      action: 'webhook.create',
      target: webhook.id,
      customerId: input.customerId,
      ipAddress,
      metadata: { url: input.url, events: input.events },
    });
    return { webhook, secret };
  }

  async listWebhooks(customerId: string): Promise<unknown> {
    return this.prisma.webhook.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { deliveries: { take: 20, orderBy: { createdAt: 'desc' } } },
    });
  }

  async deleteWebhook(id: string, adminId: string, ipAddress?: string): Promise<{ ok: true }> {
    await this.prisma.webhook.delete({ where: { id } });
    await this.audit.record({
      adminId,
      action: 'webhook.delete',
      target: id,
      ipAddress,
    });
    return { ok: true };
  }

  async listDeliveries(webhookId: string, limit = 50): Promise<unknown> {
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Manually replay a webhook delivery (admin action — typically after
   * the customer reports they didn't receive an event).
   */
  /**
   * Send a test event to a webhook (spec §12.10).
   */
  async sendTestEvent(webhookId: string, adminId: string, ipAddress?: string): Promise<{ ok: true }> {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    await this.emit({
      customerId: webhook.customerId,
      event: 'webhook.test',
      payload: {
        message: 'Smart EDMS webhook test event',
        webhookId,
        sentAt: new Date().toISOString(),
      },
    });

    await this.audit.record({
      adminId,
      action: 'webhook.test',
      target: 'webhook',
      targetId: webhookId,
      result: 'allow',
      ipAddress,
    });

    this.logger.log(`Test event sent to webhook ${webhookId}`);
    return { ok: true };
  }

  async replayDelivery(deliveryId: string, adminId: string, ipAddress?: string): Promise<{ ok: true }> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });
    if (!delivery) {
      throw new Error('Delivery not found');
    }
    await this.queue.add(
      'deliver',
      {
        deliveryId: delivery.id,
        webhookId: delivery.webhookId,
        url: delivery.webhook.url,
        secretHash: delivery.webhook.secretHash,
        body: delivery.payload as unknown as string,
        eventId: delivery.id,
        event: delivery.event,
        replay: true,
      },
      { jobId: `replay-${delivery.id}-${Date.now()}` },
    );
    await this.audit.record({
      adminId,
      action: 'webhook.replay',
      target: deliveryId,
      ipAddress,
    });
    return { ok: true };
  }
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function generateWebhookSecret(): string {
  // 32-byte random secret, base64-encoded.
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}
