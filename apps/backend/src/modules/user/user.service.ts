import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INVITED', 'DELETED']).optional(),
  sort: z.enum(['createdAt', 'email', 'firstName', 'lastName']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const createUserSchema = z.object({
  email: z.string().email().max(256),
  firstName: z.string().min(1).max(128),
  lastName: z.string().min(1).max(128),
  preferredName: z.string().max(128).optional(),
  preferredLocale: z.string().max(16).optional(),
  preferredTheme: z.enum(['system', 'light', 'dark']).optional(),
  preferredTimezone: z.string().max(64).optional(),
  roleCodes: z.array(z.string().max(64)).default([]),
  sendInvite: z.boolean().default(true),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(128).optional(),
  lastName: z.string().min(1).max(128).optional(),
  preferredName: z.string().max(128).optional(),
  preferredLocale: z.string().max(16).optional(),
  preferredTheme: z.enum(['system', 'light', 'dark']).optional(),
  preferredTimezone: z.string().max(64).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INVITED', 'DELETED']).optional(),
  roleCodes: z.array(z.string().max(64)).optional(),
});

const updatePreferencesSchema = z.object({
  locale: z.string().max(16).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  timezone: z.string().max(64).optional(),
  reducedMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  tourAutoStart: z.boolean().optional(),
  aiAssistantEnabled: z.boolean().optional(),
  notificationPrefs: z.record(z.string(), z.unknown()).optional(),
});

/**
 * User management service. All operations are tenant-scoped (spec §9.1, §15.3).
 */
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, rawQuery: unknown) {
    const q = listQuerySchema.parse(rawQuery);
    const where = {
      tenantId,
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.search
        ? {
            OR: [
              { email: { contains: q.search, mode: 'insensitive' as const } },
              { firstName: { contains: q.search, mode: 'insensitive' as const } },
              { lastName: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [q.sort]: q.order },
        take: q.limit,
        ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
        include: { roleAssignments: { include: { role: true } }, preferences: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map(serializeUser),
      total,
      cursor: items.length === q.limit ? items[items.length - 1]?.id : null,
      limit: q.limit,
    };
  }

  async getById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { roleAssignments: { include: { role: true } }, preferences: true, groupMemberships: { include: { group: true } } },
    });
    if (!user) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return serializeUser(user);
  }

  async create(tenantId: string, raw: unknown) {
    const input = createUserSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email: input.email.toLowerCase(),
          firstName: input.firstName,
          lastName: input.lastName,
          preferredName: input.preferredName,
          preferredLocale: input.preferredLocale,
          preferredTheme: input.preferredTheme,
          preferredTimezone: input.preferredTimezone,
          status: 'INVITED',
        },
      });
      await tx.userPreference.create({
        data: {
          userId: user.id,
          tenantId,
          locale: input.preferredLocale ?? 'en',
          theme: input.preferredTheme ?? 'system',
          timezone: input.preferredTimezone ?? 'UTC',
        },
      });
      if (input.roleCodes.length > 0) {
        const roles = await tx.role.findMany({ where: { tenantId, code: { in: input.roleCodes } } });
        await tx.userRoleAssignment.createMany({
          data: roles.map((r) => ({ userId: user.id, roleId: r.id, tenantId })),
          skipDuplicates: true,
        });
      }
      // sendInvite path would enqueue an email job here
      return serializeUser(await tx.user.findUniqueOrThrow({ where: { id: user.id }, include: { roleAssignments: { include: { role: true } }, preferences: true } } }));
    });
  }

  async update(tenantId: string, id: string, raw: unknown) {
    const input = updateUserSchema.parse(raw);
    const existing = await this.prisma.user.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return this.prisma.$transaction(async (tx) => {
      if (input.roleCodes) {
        await tx.userRoleAssignment.deleteMany({ where: { userId: id, tenantId } });
        const roles = await tx.role.findMany({ where: { tenantId, code: { in: input.roleCodes } } });
        await tx.userRoleAssignment.createMany({
          data: roles.map((r) => ({ userId: id, roleId: r.id, tenantId })),
          skipDuplicates: true,
        });
      }
      const { roleCodes, ...userData } = input;
      void roleCodes;
      const updated = await tx.user.update({
        where: { id },
        data: userData,
        include: { roleAssignments: { include: { role: true } }, preferences: true },
      });
      return serializeUser(updated);
    });
  }

  async updatePreferences(tenantId: string, userId: string, raw: unknown) {
    const input = updatePreferencesSchema.parse(raw);
    const prefs = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, tenantId, ...input },
      update: input,
    });
    return prefs;
  }

  async softDelete(tenantId: string, id: string) {
    await this.prisma.user.update({
      where: { id, tenantId },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }
}

function serializeUser(user: any): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    preferredName: user.preferredName,
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    preferredLocale: user.preferredLocale ?? user.preferences?.locale,
    preferredTheme: user.preferredTheme ?? user.preferences?.theme,
    preferredTimezone: user.preferredTimezone ?? user.preferences?.timezone,
    roles: (user.roleAssignments ?? []).map((r: any) => r.role.code),
    groups: (user.groupMemberships ?? []).map((gm: any) => ({ id: gm.group.id, name: gm.group.name, role: gm.role })),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
