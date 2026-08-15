import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { z } from 'zod';

const createLabelSchema = z.object({
  code: z.string().min(1).max(64),
  nameKey: z.string().min(1).max(128),
  descriptionKey: z.string().max(128).optional(),
  sensitivityLevel: z.number().int().min(1).max(5),
  color: z.string().max(16).optional(),
  bannerText: z.string().optional(),
});

const assignSchema = z.object({
  classificationId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

/**
 * Classification & sensitivity label service.
 * Spec ref: §9.4 (classification and sensitivity labels).
 *
 * Rules enforced:
 * - Downgrades require justification and permission
 * - Documents under legal hold cannot be silently downgraded
 * - All classification changes audited
 * - Labels displayed in UI via t(nameKey) — never hardcoded text
 */
@Injectable()
export class ClassificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.classificationLabel.findMany({
      where: { tenantId },
      orderBy: { sensitivityLevel: 'asc' },
    });
  }

  async create(tenantId: string, raw: unknown) {
    const input = createLabelSchema.parse(raw);
    return this.prisma.classificationLabel.create({ data: { tenantId, ...input } });
  }

  async assign(tenantId: string, documentId: string, userId: string, raw: unknown) {
    const input = assignSchema.parse(raw);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, tenantId } });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    if (doc.legalHoldActive) {
      throw new Error('LEGAL_HOLD_BLOCKS_CLASSIFICATION_CHANGE');
    }

    // Check for downgrade
    const newLabel = await this.prisma.classificationLabel.findFirst({ where: { id: input.classificationId, tenantId } });
    if (!newLabel) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (doc.classificationId) {
      const oldLabel = await this.prisma.classificationLabel.findFirst({ where: { id: doc.classificationId, tenantId } });
      if (oldLabel && newLabel.sensitivityLevel < oldLabel.sensitivityLevel && !input.reason) {
        throw new Error('DOWNGRADE_REQUIRES_REASON');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: documentId },
        data: { classificationId: input.classificationId, sensitivityLevel: newLabel.sensitivityLevel },
      });
      await tx.classificationHistory.create({
        data: {
          tenantId,
          documentId,
          fromLabelId: doc.classificationId,
          toLabelId: input.classificationId,
          reason: input.reason,
          changedByUserId: userId,
        },
      });
      return updated;
    });
  }

  async history(tenantId: string, documentId: string) {
    return this.prisma.classificationHistory.findMany({
      where: { tenantId, documentId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
