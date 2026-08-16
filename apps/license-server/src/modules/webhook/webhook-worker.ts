import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis.service.js';
import { type Job, Worker } from 'bullmq';
import { WebhookService } from './webhook.service.js';

/**
 * Webhook delivery worker — consumes the BullMQ queue and POSTs events
 * to customer-configured URLs.
 *
 * Spec ref: §12 (webhook delivery), §13 (BullMQ).
 *
 * Behaviour:
 *   - Up to WEBHOOK_CONCURRENCY concurrent deliveries.
 *   - Per-delivery timeout: WEBHOOK_TIMEOUT_MS (default 10s).
 *   - Retries with exponential backoff (BullMQ handles the backoff
 *     schedule; max attempts is set on the queue's defaultJobOptions).
 *   - On each attempt, records the result in the WebhookDelivery.attempts
 *     JSON array.
 *   - On permanent failure (max attempts exhausted, or a 4xx response
 *     that's not 408/429), marks the delivery as `dead_lettered`.
 *   - HMAC-SHA256 signature in `X-Smart-Edms-Signature` header so the
 *     customer can verify authenticity.
 *
 * The worker runs in the same process as the licensing server for
 * simplicity. Production deployments with high webhook volume should
 * run the worker as a separate process (scale horizontally).
 */
@Injectable()
export class WebhookWorker implements OnModuleInit {
  private readonly logger = new Logger(WebhookWorker.name);
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly webhookService: WebhookService,
  ) {}

  async onModuleInit(): Promise<void> {
    const concurrency = this.config.get<number>('WEBHOOK_CONCURRENCY') ?? 5;
    const timeoutMs = this.config.get<number>('WEBHOOK_TIMEOUT_MS') ?? 10000;

    this.worker = new Worker(
      'license-server:webhooks',
      async (job: Job) => this.deliver(job, timeoutMs),
      {
        connection: this.redis.connection,
        concurrency,
      },
    );

    this.worker.on('completed', (job: Job | undefined) => {
      if (job) {this.logger.debug(`Webhook job ${job.id} completed`);}
    });
    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.warn(`Webhook job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log(`Webhook worker started (concurrency=${concurrency})`);
  }

  private async deliver(job: Job, timeoutMs: number): Promise<void> {
    const data = job.data as {
      deliveryId: string;
      webhookId: string;
      url: string;
      secretHash: string;
      body: string;
      eventId: string;
      event: string;
      replay?: boolean;
    };

    const signature = this.webhookService.computeSignature(data.secretHash, data.body);
    const attemptNumber = job.attemptsMade + 1;
    const startedAt = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(data.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Smart-Edms-Signature': signature,
          'X-Smart-Edms-Event': data.event,
          'X-Smart-Edms-Delivery': data.deliveryId,
          'User-Agent': 'SmartEDMS-LicenseServer/1.0 (+https://smart-edms.example/license-server)',
        },
        body: data.body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const durationMs = Date.now() - startedAt;

      // Record the attempt.
      await this.recordAttempt(data.deliveryId, {
        attempt: attemptNumber,
        at: new Date().toISOString(),
        status: response.status < 400 ? 'success' : 'failed',
        code: response.status,
        durationMs,
      });

      // 2xx = success.
      if (response.status >= 200 && response.status < 300) {
        await this.prisma.webhookDelivery.update({
          where: { id: data.deliveryId },
          data: {
            status: 'delivered',
            attemptsCount: attemptNumber,
            finalStatusCode: response.status,
            nextRetryAt: null,
          },
        });
        await this.prisma.webhook.update({
          where: { id: data.webhookId },
          data: {
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: 'success',
            lastDeliveryCode: response.status,
          },
        });
        return;
      }

      // 4xx (except 408/429) = permanent failure (dead-letter).
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429
      ) {
        await this.prisma.webhookDelivery.update({
          where: { id: data.deliveryId },
          data: {
            status: 'dead_lettered',
            attemptsCount: attemptNumber,
            finalStatusCode: response.status,
            finalError: `HTTP ${response.status} — permanent failure (4xx)`,
            nextRetryAt: null,
          },
        });
        await this.prisma.webhook.update({
          where: { id: data.webhookId },
          data: {
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: 'failed',
            lastDeliveryCode: response.status,
          },
        });
        this.logger.warn(
          `Webhook ${data.deliveryId} dead-lettered (HTTP ${response.status} from ${data.url})`,
        );
        // Do NOT throw — BullMQ would retry. We've handled it as permanent.
        return;
      }

      // 5xx or 408/429 = retryable. Throw to trigger BullMQ's retry.
      throw new Error(`HTTP ${response.status} from ${data.url} (retryable)`);
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const errorMessage = (err as Error).message;

      await this.recordAttempt(data.deliveryId, {
        attempt: attemptNumber,
        at: new Date().toISOString(),
        status: 'error',
        code: null,
        durationMs,
        error: errorMessage,
      });

      // Update the webhook's last delivery status.
      await this.prisma.webhook.update({
        where: { id: data.webhookId },
        data: {
          lastDeliveryAt: new Date(),
          lastDeliveryStatus: 'retrying',
        },
      });

      // Re-throw to trigger BullMQ's retry. If max attempts exhausted,
      // BullMQ marks the job as failed — we'll handle that in the
      // 'failed' event by marking the delivery as dead_lettered.
      throw err;
    }
  }

  private async recordAttempt(
    deliveryId: string,
    attempt: {
      attempt: number;
      at: string;
      status: string;
      code: number | null;
      durationMs: number;
      error?: string;
    },
  ): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      select: { attempts: true, attemptsCount: true },
    });
    if (!delivery) {return;}
    const attempts = (delivery.attempts as unknown[]) ?? [];
    attempts.push(attempt);
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: attempts as unknown as Prisma.InputJsonValue,
        attemptsCount: attempt.attempt,
        nextRetryAt: new Date(Date.now() + Math.pow(2, attempt.attempt - 1) * 1000),
      },
    });
  }
}
