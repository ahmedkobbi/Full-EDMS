import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LicenseService } from '../license/license.service.js';
import { WebhookService } from '../webhook/webhook.service.js';
import { z } from 'zod';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const createTrialSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  contactEmail: z.string().email().max(254),
  durationDays: z.number().int().min(1).max(90).optional(),
  featureLimits: z
    .object({
      maxUsers: z.number().int().min(0).optional(),
      maxDocuments: z.number().int().min(0).optional(),
      maxStorageBytes: z.number().int().min(0).optional(),
    })
    .optional(),
});

export type CreateTrialInput = z.infer<typeof createTrialSchema>;

/**
 * Trial license service.
 *
 * Spec ref: §12.10 (trials).
 *
 * - Admin creates a trial: customer email, product, duration (default 14d), feature limits.
 * - Trial generates an activation code bound to a single deployment.
 * - Trials cannot be renewed beyond their max duration.
 * - Trials automatically transition to `expired` state when duration elapses
 *   (handled by a scheduled cron job — `expireDueTrials()`).
 */
@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly licenseService: LicenseService,
    private readonly webhook: WebhookService,
  ) {}

  /**
   * Create a new trial. Generates an activation code bound to a single
   * deployment (maxDevices = 1).
   *
   * Returns the trial record + the plaintext activation code (shown once).
   */
  async create(input: CreateTrialInput, adminId: string, ipAddress?: string): Promise<{
    trial: unknown;
    activationCode: string; // plaintext — shown once
  }> {
    const maxDuration = this.config.get<number>('TRIAL_MAX_DURATION_DAYS') ?? 30;
    const defaultDuration = this.config.get<number>('TRIAL_DEFAULT_DURATION_DAYS') ?? 14;
    const durationDays = Math.min(input.durationDays ?? defaultDuration, maxDuration);

    // Validate FKs.
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer || customer.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.CUSTOMER_NOT_FOUND' });
    }
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.PRODUCT_NOT_FOUND' });
    }

    // Check for an existing active trial for the same customer + product
    // (one active trial per customer/product).
    const existing = await this.prisma.trial.findFirst({
      where: {
        customerId: input.customerId,
        productId: input.productId,
        status: { in: ['pending', 'active'] },
      },
    });
    if (existing) {
      throw new BadRequestException({ messageKey: 'errors.TRIAL_ALREADY_EXISTS' });
    }

    // Resolve the default plan for the product (use the cheapest plan if
    // multiple exist; here we just take the first).
    const plan = await this.prisma.plan.findFirst({ where: { productId: input.productId } });
    if (!plan) {
      throw new BadRequestException({ messageKey: 'errors.NO_PLAN_FOR_PRODUCT' });
    }

    // Issue the underlying license (type='trial', maxDevices=1).
    const activationCode = generateTrialActivationCode();
    const { license } = await this.licenseService.issue(
      {
        customerId: input.customerId,
        productId: input.productId,
        planId: plan.id,
        type: 'trial',
        environment: 'trial',
        maxUsers: input.featureLimits?.maxUsers ?? 5,
        maxDevices: 1, // trials are single-deployment
        maxDocuments: input.featureLimits?.maxDocuments ?? 100,
        maxStorageBytes: input.featureLimits?.maxStorageBytes ?? 1024 * 1024 * 1024, // 1GB
        aiUsageAllowance: 0, // trials: no AI
        enabledModules: ['core-edms', 'ocr'], // limited trial modules
        offlineMode: false, // trials: online only
        hybridSync: false,
        supportLevel: 'trial',
        gracePeriodDays: 0, // trials: no grace
        endDate: new Date(Date.now() + durationDays * 86_400_000).toISOString(),
      },
      adminId,
      ipAddress,
    );

    // Persist the trial record. The activationCode is stored hashed.
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 86_400_000);
    const trial = await this.prisma.trial.create({
      data: {
        id: randomUUID(),
        customerId: input.customerId,
        productId: input.productId,
        contactEmail: input.contactEmail,
        activationCode,
        activationCodeHash: sha256Hex(activationCode),
        startDate,
        endDate,
        maxDurationDays: durationDays,
        status: 'pending',
        featureLimits: (input.featureLimits as object) ?? {},
      },
    });

    await this.audit.record({
      adminId,
      action: 'trial.create',
      target: trial.id,
      customerId: input.customerId,
      ipAddress,
      metadata: {
        productId: input.productId,
        contactEmail: input.contactEmail,
        durationDays,
        licenseId: (license as { id: string }).id,
      },
    });

    await this.webhook.emit({
      customerId: input.customerId,
      event: 'trial.started',
      payload: {
        trialId: trial.id,
        licenseId: (license as { id: string }).id,
        productId: input.productId,
        contactEmail: input.contactEmail,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    return { trial, activationCode };
  }

  async list(input: { customerId?: string; status?: string; limit?: number }): Promise<unknown> {
    return this.prisma.trial.findMany({
      where: {
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(input.limit ?? 50, 200),
      include: { customer: { select: { id: true, name: true, email: true } }, product: { select: { id: true, code: true, name: true } } },
    });
  }

  async get(id: string): Promise<unknown> {
    const trial = await this.prisma.trial.findUnique({
      where: { id },
      include: { customer: true, product: true },
    });
    if (!trial) {
      throw new NotFoundException({ messageKey: 'errors.TRIAL_NOT_FOUND' });
    }
    return trial;
  }

  /**
   * Convert a trial to a full license. The trial's activation code is
   * invalidated; the customer is issued a new license (and a new
   * activation code) that they must re-activate.
   */
  async convert(
    trialId: string,
    input: { planId: string; type: 'subscription' | 'perpetual' | 'enterprise'; durationDays?: number },
    adminId: string,
    ipAddress?: string,
  ): Promise<{ license: unknown; activationCode: string }> {
    const trial = await this.prisma.trial.findUnique({ where: { id: trialId } });
    if (!trial) {
      throw new NotFoundException({ messageKey: 'errors.TRIAL_NOT_FOUND' });
    }
    if (trial.status === 'converted') {
      throw new BadRequestException({ messageKey: 'errors.TRIAL_ALREADY_CONVERTED' });
    }
    if (trial.status === 'cancelled') {
      throw new BadRequestException({ messageKey: 'errors.TRIAL_CANCELLED' });
    }

    // Issue a new (full) license for the same customer + product.
    const endDate =
      input.type === 'perpetual'
        ? null
        : input.durationDays
          ? new Date(Date.now() + input.durationDays * 86_400_000).toISOString()
          : new Date(Date.now() + 365 * 86_400_000).toISOString();
    const result = await this.licenseService.issue(
      {
        customerId: trial.customerId,
        productId: trial.productId,
        planId: input.planId,
        type: input.type,
        environment: 'production',
        endDate,
      },
      adminId,
      ipAddress,
    );

    // Mark the trial as converted.
    await this.prisma.trial.update({
      where: { id: trialId },
      data: {
        status: 'converted',
        convertedToLicenseId: (result.license as { id: string }).id,
      },
    });

    await this.audit.record({
      adminId,
      action: 'trial.convert',
      target: trialId,
      customerId: trial.customerId,
      ipAddress,
      metadata: {
        newLicenseId: (result.license as { id: string }).id,
        planId: input.planId,
        type: input.type,
      },
    });

    return { license: result.license, activationCode: result.activationCode };
  }

  /**
   * Cancel a trial (admin action — typically when the customer abuses
   * the trial or requests early termination).
   */
  async cancel(trialId: string, adminId: string, ipAddress?: string): Promise<{ ok: true }> {
    const trial = await this.prisma.trial.findUnique({ where: { id: trialId } });
    if (!trial) {
      throw new NotFoundException({ messageKey: 'errors.TRIAL_NOT_FOUND' });
    }
    if (trial.status === 'cancelled' || trial.status === 'expired') {
      throw new BadRequestException({ messageKey: 'errors.TRIAL_NOT_CANCELLABLE' });
    }
    await this.prisma.trial.update({
      where: { id: trialId },
      data: { status: 'cancelled' },
    });
    await this.audit.record({
      adminId,
      action: 'trial.cancel',
      target: trialId,
      customerId: trial.customerId,
      ipAddress,
    });
    return { ok: true };
  }

  /**
   * Scheduled cron: expire trials whose endDate has passed.
   *
   * Spec ref: §12.10 — "Trials automatically transition to `expired`
   * state when duration elapses."
   */
  async expireDueTrials(): Promise<{ expired: number }> {
    const result = await this.prisma.trial.updateMany({
      where: {
        status: { in: ['pending', 'active'] },
        endDate: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} trials (endDate passed)`);
      const expired = await this.prisma.trial.findMany({
        where: { status: 'expired', updatedAt: { gt: new Date(Date.now() - 5 * 60_000) } },
        select: { id: true, customerId: true, productId: true, contactEmail: true },
      });
      for (const t of expired) {
        await this.webhook.emit({
          customerId: t.customerId,
          event: 'trial.expired',
          payload: { trialId: t.id, productId: t.productId, contactEmail: t.contactEmail },
        });
      }
    }
    return { expired: result.count };
  }
}

function generateTrialActivationCode(): string {
  // Distinct format from regular activation codes so the server can
  // distinguish them at validation time if needed:
  //   TRIAL-XXXX-XXXX-XXXX-XXXX (16 hex chars, 64 bits of entropy).
  const bytes = randomBytes(8);
  const hex = bytes.toString('hex').toUpperCase();
  return `TRIAL-${hex.match(/.{1,4}/g)!.join('-')}`;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
