/**
 * Admin user management service (spec §12.1 — AdminUser, §12.10).
 *
 * Manages admin user accounts for the License Admin Panel.
 * Super admins can create/edit/suspend other admins.
 *
 * Spec ref: §12.10 (admin authentication with MFA), §21.2 (admin MFA required).
 */
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import bcrypt from 'bcryptjs';
import { authenticator as otplibAuthenticator } from 'otplib';
import { z } from 'zod';

const createAdminSchema = z.object({
  email: z.string().email().max(256),
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
  password: z.string().min(12).max(256),
  roles: z.array(z.enum(['super_admin', 'admin', 'support', 'read_only'])).default(['admin']),
});

const updateAdminSchema = z.object({
  firstName: z.string().min(1).max(128).optional(),
  lastName: z.string().min(1).max(128).optional(),
  roles: z.array(z.enum(['super_admin', 'admin', 'support', 'read_only'])).optional(),
  isActive: z.boolean().optional(),
});

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        mfaSecret: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });
  }

  async getById(id: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        mfaSecret: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return user;
  }

  async create(adminId: string, raw: unknown) {
    const input = createAdminSchema.parse(raw);

    const existing = await this.prisma.adminUser.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({ messageKey: 'errors.ADMIN_USER_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const mfaSecret = otplibAuthenticator.generateSecret();

    const admin = await this.prisma.adminUser.create({
      data: {
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        roles: input.roles,
        isActive: true,
        mfaSecret,
        mfaEnrolledAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        mfaSecret: true,
        createdAt: true,
      },
    });

    await this.audit.record({
      adminId,
      action: 'admin_user.create',
      target: 'admin_user',
      targetId: admin.id,
      result: 'allow',
      metadata: { email: admin.email, roles: input.roles },
    });

    this.logger.log(`Admin user created: ${admin.email} (roles: ${input.roles.join(', ')})`);
    return admin;
  }

  async update(id: string, _adminId: string, raw: unknown) {
    const input = updateAdminSchema.parse(raw);
    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}

    return this.prisma.adminUser.update({
      where: { id },
      data: input,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async suspend(id: string, adminId: string): Promise<void> {
    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    if (existing.roles.includes('super_admin') && !existing.roles.includes('admin')) {
      // Prevent suspending the last super_admin
      const superAdmins = await this.prisma.adminUser.count({
        where: { roles: { has: 'super_admin' }, isActive: true },
      });
      if (superAdmins <= 1) {
        throw new ConflictException({ messageKey: 'errors.CANNOT_SUSPEND_LAST_SUPER_ADMIN' });
      }
    }

    await this.prisma.adminUser.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.record({
      adminId,
      action: 'admin_user.suspend',
      target: 'admin_user',
      targetId: id,
      result: 'allow',
    });
  }

  async delete(id: string, adminId: string): Promise<void> {
    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    if (existing.roles.includes('super_admin')) {
      const superAdmins = await this.prisma.adminUser.count({
        where: { roles: { has: 'super_admin' }, isActive: true },
      });
      if (superAdmins <= 1) {
        throw new ConflictException({ messageKey: 'errors.CANNOT_DELETE_LAST_SUPER_ADMIN' });
      }
    }

    await this.prisma.adminUser.delete({ where: { id } });

    await this.audit.record({
      adminId,
      action: 'admin_user.delete',
      target: 'admin_user',
      targetId: id,
      result: 'allow',
    });
  }
}
