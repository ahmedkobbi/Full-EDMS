import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service.js';
import { LicenseSigner } from './license-signer.js';
import type { IssueLicenseInput, RenewLicenseInput, RevokeLicenseInput, ListLicensesInput } from './dto.js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { WebhookService } from '../webhook/webhook.service.js';

/**
 * License admin service — issue, renew, revoke, get, list.
 *
 * Spec ref: §12.2 (license types & statuses), §12.3 (entitlements),
 * §12.5 (license payload), §12.7 (online activation), §12.8 (offline
 * activation), §12.10 (trials).
 *
 * The license entity itself is stored in the DB. The SIGNED `.sedmslic`
 * artifact is generated on demand — at activation time (online or
 * offline) — because the payload includes the deployment fingerprint,
 * which is not known until the on-prem backend activates.
 */
@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly signer: LicenseSigner,
    private readonly webhook: WebhookService,
  ) {}

  /**
   * Issue a new license. The license is created in `pending_activation`
   * status — it becomes `active` only after the first activation.
   *
   * Returns the license record + the PLAINTEXT activation code (shown
   * ONCE to the admin; only the hash is persisted).
   */
  async issue(input: IssueLicenseInput, adminId: string, ipAddress?: string): Promise<{
    license: unknown;
    activationCode: string; // plaintext — shown once
  }> {
    // Validate FK existence.
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer || customer.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.CUSTOMER_NOT_FOUND' });
    }
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.PRODUCT_NOT_FOUND' });
    }
    const plan = await this.prisma.plan.findUnique({ where: { id: input.planId } });
    if (!plan || plan.productId !== input.productId) {
      throw new NotFoundException({ messageKey: 'errors.PLAN_NOT_FOUND' });
    }

    // Resolve signing key.
    let signingKey;
    try {
      signingKey = this.signer.getActiveSigner();
    } catch {
      throw new BadRequestException({
        messageKey: 'errors.SIGNING_KEY_NOT_LOADED',
      });
    }

    // Generate the license code + activation code.
    const code = this.signer.generateLicenseCode(`SEDMS-${plan.code.toUpperCase().slice(0, 4)}`);
    const activationCode = generateActivationCode();
    const activationCodeHash = sha256Hex(activationCode);
    const activationCodePrefix = activationCode.slice(0, 8);

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = input.endDate ? new Date(input.endDate) : input.type === 'perpetual' ? null : defaultEndDate(startDate, 365);

    const license = await this.prisma.license.create({
      data: {
        id: randomUUID(),
        customerId: input.customerId,
        productId: input.productId,
        planId: input.planId,
        code,
        activationCodeHash,
        activationCodePrefix,
        status: 'pending_activation',
        type: input.type,
        environment: input.environment,
        signingKeyId: signingKey.signingKeyId,
        version: 1,
        startDate,
        endDate,
        gracePeriodDays: input.gracePeriodDays,
        maxUsers: input.maxUsers ?? null,
        maxDevices: input.maxDevices ?? null,
        maxStorageBytes: input.maxStorageBytes ?? null,
        maxDocuments: input.maxDocuments ?? null,
        aiUsageAllowance: input.aiUsageAllowance ?? null,
        enabledModules: input.enabledModules ?? (plan.features as string[]) ?? [],
        enabledIntegrations: input.enabledIntegrations ?? [],
        featuresJson: (input.features ?? []) as unknown as Prisma.InputJsonValue,
        limitsJson: {} as Prisma.InputJsonValue,
        offlineMode: input.offlineMode,
        hybridSync: input.hybridSync,
        supportLevel: input.supportLevel,
        renewalCounter: 0,
      },
      include: { customer: true, product: true, plan: true, signingKey: true },
    });

    await this.audit.record({
      adminId,
      action: 'license.issue',
      target: license.id,
      customerId: input.customerId,
      ipAddress,
      metadata: {
        code,
        type: input.type,
        environment: input.environment,
        productId: input.productId,
        planId: input.planId,
        endDate: endDate?.toISOString() ?? null,
      },
    });

    await this.webhook.emit({
      customerId: input.customerId,
      event: 'license.issued',
      payload: {
        licenseId: license.id,
        code,
        type: input.type,
        environment: input.environment,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() ?? null,
        customerId: input.customerId,
        productId: input.productId,
        planId: input.planId,
      },
    });

    return { license, activationCode };
  }

  /**
   * Renew a license — extends the end date and bumps the renewalCounter.
   *
   * Spec ref: §12.5 (renewalCounter is monotonic).
   */
  async renew(
    licenseId: string,
    input: RenewLicenseInput,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ license: unknown }> {
    const license = await this.prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) {
      throw new NotFoundException({ messageKey: 'errors.LICENSE_NOT_FOUND' });
    }
    if (license.status === 'revoked' || license.status === 'cancelled') {
      throw new BadRequestException({ messageKey: 'errors.LICENSE_NOT_RENEWABLE' });
    }

    let newEndDate: Date | null;
    if (input.newEndDate) {
      newEndDate = new Date(input.newEndDate);
    } else if (input.extendDays) {
      const base = license.endDate ?? new Date();
      newEndDate = new Date(base.getTime() + input.extendDays * 86_400_000);
    } else {
      // Default: extend by 1 year from current end date.
      const base = license.endDate ?? new Date();
      newEndDate = new Date(base.getTime() + 365 * 86_400_000);
    }

    const updated = await this.prisma.license.update({
      where: { id: licenseId },
      data: {
        endDate: newEndDate,
        renewalCounter: { increment: 1 },
        version: { increment: 1 },
        status: license.status === 'expired' ? 'active' : license.status,
        revokedAt: null,
        ...(input.updateLimits ?? {}),
        ...(input.updateModules ?? {}),
      },
      include: { customer: true, product: true, plan: true, signingKey: true },
    });

    await this.audit.record({
      adminId,
      action: 'license.renew',
      target: licenseId,
      customerId: license.customerId,
      ipAddress,
      metadata: {
        newEndDate: newEndDate?.toISOString() ?? null,
        renewalCounter: updated.renewalCounter,
        version: updated.version,
      },
    });

    await this.webhook.emit({
      customerId: license.customerId,
      event: 'license.renewed',
      payload: {
        licenseId,
        newEndDate: newEndDate?.toISOString() ?? null,
        renewalCounter: updated.renewalCounter,
      },
    });

    return { license: updated };
  }

  /**
   * Revoke a license — marks it as revoked, signs a new CRL, and emits
   * a webhook event. The on-prem backend will pick up the revocation
   * via the CRL on its next online check.
   *
   * Spec ref: §12.4 (revocation list), §12.7 (revocation propagation).
   *
   * Requires step-up auth (enforced at the controller layer via
   * `@UseGuards(StepUpGuard)`).
   */
  async revoke(
    licenseId: string,
    input: RevokeLicenseInput,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ ok: true; revocationId: string; crlVersion: number }> {
    const license = await this.prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) {
      throw new NotFoundException({ messageKey: 'errors.LICENSE_NOT_FOUND' });
    }
    if (license.status === 'revoked') {
      throw new BadRequestException({ messageKey: 'errors.LICENSE_ALREADY_REVOKED' });
    }

    // Mark the license as revoked.
    await this.prisma.license.update({
      where: { id: licenseId },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    });

    // Get the current max CRL version.
    const lastRevocation = await this.prisma.revocation.findFirst({
      orderBy: { crlVersion: 'desc' },
      take: 1,
    });
    const crlVersion = (lastRevocation?.crlVersion ?? 0) + 1;

    // Resolve the active signing key for the CRL.
    let signingKey;
    try {
      signingKey = this.signer.getActiveSigner();
    } catch {
      throw new BadRequestException({ messageKey: 'errors.SIGNING_KEY_NOT_LOADED' });
    }

    const revocation = await this.prisma.revocation.create({
      data: {
        id: randomUUID(),
        licenseId,
        reason: input.reason,
        revokedByAdminId: adminId,
        crlVersion,
        propagated: false,
        signingKeyId: signingKey.signingKeyId,
        fingerprint: input.fingerprint,
      },
    });

    await this.audit.record({
      adminId,
      action: 'license.revoke',
      target: licenseId,
      customerId: license.customerId,
      ipAddress,
      metadata: {
        reason: input.reason,
        crlVersion,
        revocationId: revocation.id,
      },
    });

    await this.webhook.emit({
      customerId: license.customerId,
      event: 'license.revoked',
      payload: {
        licenseId,
        reason: input.reason,
        crlVersion,
        revokedAt: new Date().toISOString(),
      },
    });

    return { ok: true, revocationId: revocation.id, crlVersion };
  }

  async get(licenseId: string): Promise<unknown> {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: {
        customer: true,
        product: true,
        plan: true,
        signingKey: true,
        features: true,
        limits: true,
        activations: { include: { devices: true } },
        revocations: true,
      },
    });
    if (!license) {
      throw new NotFoundException({ messageKey: 'errors.LICENSE_NOT_FOUND' });
    }
    return license;
  }

  async list(input: ListLicensesInput): Promise<{ licenses: unknown[]; nextCursor: string | null }> {
    const take = Math.min(input.limit, 500);
    const licenses = await this.prisma.license.findMany({
      where: {
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.productId ? { productId: input.productId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.code ? { code: { contains: input.code, mode: 'insensitive' } } : {}),
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: take + 1,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, code: true, name: true } },
        plan: { select: { id: true, code: true, name: true } },
      },
    });
    const nextCursor = licenses.length > take ? licenses[licenses.length - 1].id : null;
    return { licenses: licenses.slice(0, take), nextCursor };
  }

  /**
   * Mark licenses whose endDate has passed as `expired`. Called by a
   * scheduled cron job (spec §12.10 — trials auto-expire; same applies
   * to subscriptions).
   */
  async expireDueLicenses(): Promise<{ expired: number }> {
    const result = await this.prisma.license.updateMany({
      where: {
        status: { in: ['active', 'pending_activation'] },
        endDate: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} licenses (endDate passed)`);
      // Emit webhook events for each. Fetch the affected licenses.
      const expired = await this.prisma.license.findMany({
        where: { status: 'expired', updatedAt: { gt: new Date(Date.now() - 5 * 60_000) } },
        select: { id: true, customerId: true, code: true },
      });
      for (const lic of expired) {
        await this.webhook.emit({
          customerId: lic.customerId,
          event: 'license.expired',
          payload: { licenseId: lic.id, code: lic.code },
        });
      }
    }
    return { expired: result.count };
  }
}

function generateActivationCode(): string {
  // Format: XXXX-XXXX-XXXX-XXXX-XXXX (20 hex chars, 80 bits of entropy).
  const bytes = randomBytes(10);
  const hex = bytes.toString('hex').toUpperCase();
  return hex.match(/.{1,4}/g)!.join('-');
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function defaultEndDate(start: Date, days: number): Date {
  return new Date(start.getTime() + days * 86_400_000);
}
