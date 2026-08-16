/**
 * Role management service (spec §9.1 — roles, permissions).
 * System roles cannot be deleted; custom roles can be fully managed.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { z } from 'zod';

const createRoleSchema = z.object({
  code: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  permissions: z.array(z.string().max(128)).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
  permissions: z.array(z.string().max(128)).optional(),
});

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
    });
  }

  async getById(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!role) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return role;
  }

  async create(tenantId: string, raw: unknown) {
    const input = createRoleSchema.parse(raw);
    return this.prisma.role.create({
      data: { tenantId, ...input, isSystem: false },
    });
  }

  async update(tenantId: string, id: string, raw: unknown) {
    const input = updateRoleSchema.parse(raw);
    const existing = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!existing) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    if (existing.isSystem && input.permissions) {
      throw new BadRequestException({ messageKey: 'errors.SYSTEM_ROLE_PERMISSIONS_LOCKED' });
    }
    return this.prisma.role.update({ where: { id }, data: input });
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!existing) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    if (existing.isSystem) {
      throw new BadRequestException({ messageKey: 'errors.SYSTEM_ROLE_CANNOT_DELETE' });
    }
    // Check no users are assigned
    const assignmentCount = await this.prisma.userRoleAssignment.count({
      where: { roleId: id, tenantId },
    });
    if (assignmentCount > 0) {
      throw new BadRequestException({ messageKey: 'errors.ROLE_HAS_ASSIGNMENTS' });
    }
    await this.prisma.role.delete({ where: { id } });
  }

  async listPermissions(tenantId: string) {
    // Return the union of all permissions across roles (for UI permission picker)
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      select: { permissions: true },
    });
    const allPerms = new Set<string>();
    for (const role of roles) {
      for (const p of role.permissions) {
        allPerms.add(p);
      }
    }
    return Array.from(allPerms).sort();
  }
}
