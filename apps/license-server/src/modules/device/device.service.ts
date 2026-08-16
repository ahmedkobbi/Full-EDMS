/**
 * Device management service (spec §12.1 — Device entity).
 *
 * Manages devices registered against activations. Each activation can have
 * multiple devices (e.g., a server + a backup). Devices are identified by
 * their fingerprint hash.
 *
 * Spec ref: §12.1 (Device entity), §12.7 (device limit enforcement).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List devices for an activation.
   */
  async listByActivation(activationId: string) {
    return this.prisma.device.findMany({
      where: { activationId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * List devices for a license (across all its activations).
   */
  async listByLicense(licenseId: string) {
    const activations = await this.prisma.activation.findMany({
      where: { licenseId },
      select: { id: true, deploymentId: true, status: true },
    });
    const activationIds = activations.map((a) => a.id);
    const devices = await this.prisma.device.findMany({
      where: { activationId: { in: activationIds } },
      orderBy: { lastSeenAt: 'desc' },
    });
    return devices.map((d) => ({
      ...d,
      activation: activations.find((a) => a.id === d.activationId),
    }));
  }

  /**
   * Get a single device.
   */
  async getById(id: string) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return device;
  }

  /**
   * Delete a device (removes it from the activation's device list).
   * This frees up a device slot for the license.
   *
   * Spec ref: §12.7 (device limit enforcement — freeing a slot allows
   * a new activation).
   */
  async delete(id: string, adminId: string): Promise<void> {
    const device = await this.getById(id);
    await this.prisma.device.delete({ where: { id } });

    await this.audit.record({
      adminId,
      action: 'device.delete',
      target: 'device',
      targetId: id,
      result: 'allow',
      metadata: { fingerprint: device.fingerprintHash, activationId: device.activationId },
    });

    this.logger.log(`Device deleted: ${id} (fingerprint=${device.fingerprintHash.slice(0, 16)}…)`);
  }

  /**
   * Register or update a device (called by the heartbeat handler).
   */
  async upsert(input: {
    activationId: string;
    licenseId: string;
    fingerprintHash: string;
    hostname?: string;
    os?: string;
    arch?: string;
    appVersion?: string;
  }): Promise<void> {
    await this.prisma.device.upsert({
      where: {
        activationId_fingerprintHash: {
          activationId: input.activationId,
          fingerprintHash: input.fingerprintHash,
        },
      },
      create: {
        activationId: input.activationId,
        licenseId: input.licenseId,
        fingerprintHash: input.fingerprintHash,
        hostname: input.hostname ?? null,
        os: input.os ?? 'unknown',
        arch: input.arch ?? 'unknown',
        appVersion: input.appVersion ?? 'unknown',
        lastSeenAt: new Date(),
      },
      update: {
        hostname: input.hostname ?? undefined,
        os: input.os ?? undefined,
        arch: input.arch ?? undefined,
        lastSeenAt: new Date(),
      },
    });
  }
}
