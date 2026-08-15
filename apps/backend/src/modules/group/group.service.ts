/**
 * Group management service (spec §9.1 — groups, group membership).
 * All operations are tenant-scoped.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['member', 'manager']).default('member'),
});

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, rawQuery: unknown) {
    const q = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().optional(),
      search: z.string().optional(),
    }).parse(rawQuery);

    const where = {
      tenantId,
      ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        orderBy: { name: 'asc' },
        take: q.limit,
        ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.group.count({ where }),
    ]);
    return {
      items: items.map((g) => ({ ...g, memberCount: g._count.members, _count: undefined })),
      total,
      cursor: items.length === q.limit ? items[items.length - 1]?.id : null,
      limit: q.limit,
    };
  }

  async getById(tenantId: string, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, tenantId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!group) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return group;
  }

  async create(tenantId: string, raw: unknown) {
    const input = createGroupSchema.parse(raw);
    return this.prisma.group.create({
      data: { tenantId, ...input },
    });
  }

  async update(tenantId: string, id: string, raw: unknown) {
    const input = updateGroupSchema.parse(raw);
    const existing = await this.prisma.group.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return this.prisma.group.update({ where: { id }, data: input });
  }

  async softDelete(tenantId: string, id: string) {
    await this.prisma.group.deleteMany({ where: { id, tenantId } });
  }

  async addMember(tenantId: string, groupId: string, raw: unknown) {
    const input = addMemberSchema.parse(raw);
    return this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId: input.userId } },
      create: { groupId, tenantId, ...input },
      update: { role: input.role },
    });
  }

  async removeMember(tenantId: string, groupId: string, userId: string) {
    await this.prisma.groupMember.deleteMany({
      where: { groupId, userId, tenantId },
    });
  }
}
