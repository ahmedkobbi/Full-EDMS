/**
 * Webhook management service (spec §9.15 — webhook management).
 * Manages tenant-configured webhooks for outgoing event delivery.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const createWebhookSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().max(64)).min(1).max(50),
  secret: z.string().min(16).max(256).optional(),
});

const updateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string().max(64)).min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(tenantId: string, id: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!webhook) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return webhook;
  }

  async create(tenantId: string, userId: string, raw: unknown) {
    const input = createWebhookSchema.parse(raw);
    const secretHash = input.secret ? sha256(input.secret) : null;
    const webhook = await this.prisma.webhook.create({
      data: {
        tenantId,
        url: input.url,
        events: input.events,
        secretHash,
        isActive: true,
      },
    });

    void this.audit.record({
      tenantId,
      userId,
      category: 'admin',
      code: 'webhook.create',
      result: 'allow',
      resourceType: 'webhook',
      resourceId: webhook.id,
    });

    return webhook;
  }

  async update(tenantId: string, userId: string, id: string, raw: unknown) {
    const input = updateWebhookSchema.parse(raw);
    const existing = await this.prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return this.prisma.webhook.update({ where: { id }, data: input });
  }

  async delete(tenantId: string, userId: string, id: string) {
    await this.prisma.webhook.deleteMany({ where: { id, tenantId } });
    void this.audit.record({
      tenantId,
      userId,
      category: 'admin',
      code: 'webhook.delete',
      result: 'allow',
      resourceType: 'webhook',
      resourceId: id,
    });
  }

  /**
   * Send a test event to a webhook (spec §9.15).
   */
  async sendTestEvent(tenantId: string, userId: string, id: string) {
    const webhook = await this.getById(tenantId, id);
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Smart EDMS webhook test event' },
    };

    // In a real implementation, this would be queued via BullMQ
    // For now, we do a direct fetch with timeout
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Smart-Edms-Event': 'webhook.test',
          'X-Smart-Edms-Signature': webhook.secretHash
            ? `sha256=${createHash('sha256').update(JSON.stringify(testPayload) + webhook.secretHash).digest('hex')}`
            : '',
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      await this.prisma.webhook.update({
        where: { id },
        data: { lastDeliveryAt: new Date(), lastDeliveryStatus: response.ok ? 'success' : 'failed' },
      });

      return { ok: response.ok, statusCode: response.status, responseBody: await response.text().catch(() => '') };
    } catch (err) {
      await this.prisma.webhook.update({
        where: { id },
        data: { lastDeliveryAt: new Date(), lastDeliveryStatus: 'failed' },
      });
      return { ok: false, error: (err as Error).message };
    }
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
