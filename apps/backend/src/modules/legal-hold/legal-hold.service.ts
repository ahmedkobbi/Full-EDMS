/**
 * Smart EDMS — Legal Hold service (spec §9.7).
 *
 * Implements legal hold CRUD, document attach/detach, and release.
 *
 * Critical rules:
 *  - Legal hold overrides normal deletion. The Document soft-delete path
 *    checks `Document.legalHoldActive` (already enforced in
 *    `DocumentService.deleteDocument`). This service is responsible for
 *    keeping that flag in sync: any time a document is attached to an
 *    active hold, `legalHoldActive` is set to `true`. When the last
 *    active hold on a document is released or detached, the flag is set
 *    back to `false`. Both updates are transactional.
 *  - Releasing a hold requires an explicit reason key (audited). Only
 *    admins can release holds.
 *  - Hold creation requires records-manager or admin role.
 *  - All operations audited via `AuditService`.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// DTOs (Zod)
// ---------------------------------------------------------------------------

export const CreateLegalHoldBodySchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9_-]+$/, 'code must be lowercase, digits, underscore or hyphen'),
    name: z.string().min(1).max(200),
    reason: z.string().min(1).max(2000),
    caseReference: z.string().min(1).max(128).optional(),
    /** Initial documents to attach (optional). */
    documentIds: z.array(z.string().uuid()).max(500).default([]),
  })
  .strict();

export type CreateLegalHoldBody = z.infer<typeof CreateLegalHoldBodySchema>;

export const ReleaseLegalHoldBodySchema = z
  .object({
    /** Localised reason key — never raw text (privacy). */
    reasonKey: z.string().min(1).max(128),
    comment: z.string().min(0).max(4000).optional(),
  })
  .strict();

export type ReleaseLegalHoldBody = z.infer<typeof ReleaseLegalHoldBodySchema>;

export const LegalHoldListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(100),
    isActive: z.enum(['true', 'false']).optional().transform((v) =>
      v === undefined ? undefined : v === 'true',
    ),
    code: z.string().min(1).max(64).optional(),
    caseReference: z.string().min(1).max(128).optional(),
  })
  .strict();

export type LegalHoldListQuery = z.infer<typeof LegalHoldListQuerySchema>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class LegalHoldService {
  private readonly logger = new Logger(LegalHoldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Create + list + get
  // -------------------------------------------------------------------------

  /**
   * Create a legal hold. Optionally attach an initial set of documents.
   * Sets `Document.legalHoldActive = true` for each attached document.
   */
  async createHold(
    tenantId: string,
    userId: string,
    body: CreateLegalHoldBody,
  ): Promise<{
    readonly id: string;
    readonly code: string;
    readonly documentCount: number;
    readonly createdAt: string;
  }> {
    const existing = await this.prisma.legalHold.findUnique({
      where: { tenantId_code: { tenantId, code: body.code } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: `legal hold "${body.code}" already exists`,
      });
    }

    // Validate that all the document IDs refer to active documents in this
    // tenant. We do this BEFORE the transaction so we can fail fast.
    if (body.documentIds.length > 0) {
      const docs = await this.prisma.document.findMany({
        where: {
          id: { in: body.documentIds },
          tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (docs.length !== body.documentIds.length) {
        throw new BadRequestException({
          messageKey: 'errors.VALIDATION_FAILED',
          detail: 'one or more documentIds are invalid or refer to deleted documents',
        });
      }
    }

    const holdId = randomUUID();
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.legalHold.create({
        data: {
          id: holdId,
          tenantId,
          code: body.code,
          name: body.name,
          reason: body.reason,
          caseReference: body.caseReference ?? null,
          placedByUserId: userId,
          isActive: true,
          documents: body.documentIds.length
            ? { connect: body.documentIds.map((id) => ({ id })) }
            : undefined,
        },
      });

      if (body.documentIds.length > 0) {
        await tx.document.updateMany({
          where: { id: { in: body.documentIds }, tenantId },
          data: { legalHoldActive: true },
        });
      }
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'legal_hold',
      code: 'legal_hold.applied',
      result: 'allow',
      resourceType: 'legal_hold',
      resourceId: holdId,
      metadata: {
        code: body.code,
        documentCount: body.documentIds.length,
        caseReference: body.caseReference ?? null,
      },
    });

    return {
      id: holdId,
      code: body.code,
      documentCount: body.documentIds.length,
      createdAt: now.toISOString(),
    };
  }

  /** List legal holds (paginated, filterable). */
  async listHolds(
    tenantId: string,
    query: LegalHoldListQuery,
  ): Promise<{
    readonly holds: ReadonlyArray<{
      readonly id: string;
      readonly code: string;
      readonly name: string;
      readonly reason: string;
      readonly caseReference: string | null;
      readonly placedByUserId: string;
      readonly releasedByUserId: string | null;
      readonly releasedAt: string | null;
      readonly isActive: boolean;
      readonly createdAt: string;
      readonly updatedAt: string;
    }>;
  }> {
    const where: Prisma.LegalHoldWhereInput = { tenantId };
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.code) where.code = query.code;
    if (query.caseReference) where.caseReference = query.caseReference;

    const rows = await this.prisma.legalHold.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return {
      holds: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        reason: r.reason,
        caseReference: r.caseReference,
        placedByUserId: r.placedByUserId,
        releasedByUserId: r.releasedByUserId,
        releasedAt: r.releasedAt?.toISOString() ?? null,
        isActive: r.isActive,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Get a single hold with its attached documents. The document list is
   * projected to a narrow summary (id + title + classificationId) to
   * avoid leaking sensitive content.
   */
  async getHold(
    tenantId: string,
    holdId: string,
  ): Promise<{
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly reason: string;
    readonly caseReference: string | null;
    readonly placedByUserId: string;
    readonly releasedByUserId: string | null;
    readonly releasedAt: string | null;
    readonly releaseReasonKey: string | null;
    readonly isActive: boolean;
    readonly createdAt: string;
    readonly documents: ReadonlyArray<{
      readonly id: string;
      readonly title: string;
      readonly classificationId: string | null;
      readonly sensitivityLevel: number;
      readonly legalHoldActive: boolean;
    }>;
  }> {
    const hold = await this.prisma.legalHold.findFirst({
      where: { id: holdId, tenantId },
      include: {
        documents: {
          select: {
            id: true,
            title: true,
            classificationId: true,
            sensitivityLevel: true,
            legalHoldActive: true,
          },
        },
      },
    });
    if (!hold) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    return {
      id: hold.id,
      code: hold.code,
      name: hold.name,
      reason: hold.reason,
      caseReference: hold.caseReference,
      placedByUserId: hold.placedByUserId,
      releasedByUserId: hold.releasedByUserId,
      releasedAt: hold.releasedAt?.toISOString() ?? null,
      // The schema doesn't have a dedicated releaseReasonKey column; we
      // store it in the audit log (reason field on the release event).
      // The frontend can fetch the audit trail to display it.
      releaseReasonKey: null,
      isActive: hold.isActive,
      createdAt: hold.createdAt.toISOString(),
      documents: hold.documents.map((d) => ({
        id: d.id,
        title: d.title,
        classificationId: d.classificationId,
        sensitivityLevel: d.sensitivityLevel,
        legalHoldActive: d.legalHoldActive,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Attach / detach documents
  // -------------------------------------------------------------------------

  /**
   * Attach a document to an active hold. Sets `Document.legalHoldActive`
   * to `true` transactionally. Idempotent: attaching a document that's
   * already on the hold is a no-op.
   */
  async attachDocument(
    tenantId: string,
    userId: string,
    holdId: string,
    documentId: string,
  ): Promise<{ holdId: string; documentId: string; attached: boolean }> {
    const hold = await this.prisma.legalHold.findFirst({
      where: { id: holdId, tenantId, isActive: true },
      select: { id: true, code: true, documents: { select: { id: true } } },
    });
    if (!hold) {
      throw new NotFoundException({
        messageKey: 'errors.NOT_FOUND',
        detail: 'legal hold not found or not active',
      });
    }

    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
      select: { id: true, legalHoldActive: true },
    });
    if (!doc) {
      throw new NotFoundException({
        messageKey: 'errors.NOT_FOUND',
        detail: 'document not found',
      });
    }

    if (hold.documents.some((d) => d.id === documentId)) {
      // Idempotent: already attached.
      return { holdId, documentId, attached: false };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.legalHold.update({
        where: { id: holdId },
        data: { documents: { connect: { id: documentId } } },
      });
      await tx.document.update({
        where: { id: documentId },
        data: { legalHoldActive: true },
      });
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'legal_hold',
      code: 'legal_hold.applied',
      result: 'allow',
      resourceType: 'legal_hold',
      resourceId: holdId,
      documentId,
      metadata: { action: 'attach_document', code: hold.code },
    });

    return { holdId, documentId, attached: true };
  }

  /**
   * Detach a document from a hold. If no other active holds reference the
   * document, sets `Document.legalHoldActive = false`. Transactional.
   */
  async detachDocument(
    tenantId: string,
    userId: string,
    holdId: string,
    documentId: string,
  ): Promise<{ holdId: string; documentId: string; detached: boolean; legalHoldActive: boolean }> {
    const hold = await this.prisma.legalHold.findFirst({
      where: { id: holdId, tenantId },
      select: { id: true, code: true, isActive: true, documents: { select: { id: true } } },
    });
    if (!hold) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    if (!hold.documents.some((d) => d.id === documentId)) {
      // Idempotent: not attached.
      return { holdId, documentId, detached: false, legalHoldActive: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.legalHold.update({
        where: { id: holdId },
        data: { documents: { disconnect: { id: documentId } } },
      });

      // Check if any OTHER active holds still reference this document.
      const otherActiveHolds = await tx.legalHold.count({
        where: {
          tenantId,
          isActive: true,
          id: { not: holdId },
          documents: { some: { id: documentId } },
        },
      });

      if (otherActiveHolds === 0) {
        await tx.document.update({
          where: { id: documentId },
          data: { legalHoldActive: false },
        });
      }
    });

    // Re-read the document's legalHoldActive to return the post-detach state.
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { legalHoldActive: true },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'legal_hold',
      code: 'legal_hold.released',
      result: 'allow',
      resourceType: 'legal_hold',
      resourceId: holdId,
      documentId,
      metadata: { action: 'detach_document', code: hold.code },
    });

    return {
      holdId,
      documentId,
      detached: true,
      legalHoldActive: doc?.legalHoldActive ?? false,
    };
  }

  // -------------------------------------------------------------------------
  // Release
  // -------------------------------------------------------------------------

  /**
   * Release a hold: mark `isActive=false`, set `releasedAt` and
   * `releasedByUserId`, and clear `Document.legalHoldActive` for any
   * document that is no longer under any active hold.
   *
   * Admin-only (enforced at the controller layer). Requires an explicit
   * `reasonKey`.
   */
  async releaseHold(
    tenantId: string,
    userId: string,
    holdId: string,
    body: ReleaseLegalHoldBody,
  ): Promise<{
    readonly holdId: string;
    readonly isActive: false;
    readonly releasedAt: string;
    readonly documentsUnblocked: number;
  }> {
    const hold = await this.prisma.legalHold.findFirst({
      where: { id: holdId, tenantId },
      select: { id: true, code: true, isActive: true, documents: { select: { id: true } } },
    });
    if (!hold) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (!hold.isActive) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'legal hold is already released',
      });
    }

    const now = new Date();
    const documentIds = hold.documents.map((d) => d.id);

    let unblocked = 0;
    await this.prisma.$transaction(async (tx) => {
      await tx.legalHold.update({
        where: { id: holdId },
        data: {
          isActive: false,
          releasedAt: now,
          releasedByUserId: userId,
        },
      });

      // For each document previously attached to this hold, check if any
      // other active holds still reference it. If not, clear the flag.
      for (const docId of documentIds) {
        const otherActive = await tx.legalHold.count({
          where: {
            tenantId,
            isActive: true,
            id: { not: holdId },
            documents: { some: { id: docId } },
          },
        });
        if (otherActive === 0) {
          await tx.document.update({
            where: { id: docId },
            data: { legalHoldActive: false },
          });
          unblocked++;
        }
      }
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'legal_hold',
      code: 'legal_hold.released',
      result: 'allow',
      resourceType: 'legal_hold',
      resourceId: holdId,
      reason: body.reasonKey,
      metadata: {
        code: hold.code,
        documentCount: documentIds.length,
        documentsUnblocked: unblocked,
        comment: body.comment,
      },
    });

    return {
      holdId,
      isActive: false,
      releasedAt: now.toISOString(),
      documentsUnblocked: unblocked,
    };
  }

  // -------------------------------------------------------------------------
  // Used by other modules (e.g. RetentionService) — read-only checks
  // -------------------------------------------------------------------------

  /**
   * Check whether a document is currently under any active legal hold.
   * Used by the retention cron to mark disposition records as
   * `BLOCKED_LEGAL_HOLD` (though the retention service uses the
   * `Document.legalHoldActive` flag directly for performance).
   */
  async isDocumentUnderHold(tenantId: string, documentId: string): Promise<boolean> {
    const count = await this.prisma.legalHold.count({
      where: {
        tenantId,
        isActive: true,
        documents: { some: { id: documentId } },
      },
    });
    return count > 0;
  }
}
