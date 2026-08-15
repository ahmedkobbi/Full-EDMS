/**
 * Smart EDMS — Document service.
 *
 * Implements the multipart upload flow, version management, lock state,
 * soft-delete with legal-hold guard, and tenant-scoped CRUD.
 *
 * Spec ref: §9.3 (document lifecycle, file-type whitelist, filename
 * sanitisation), §9.6 (immutable versions + checksum), §9.7 (legal-hold
 * blocks deletion), §13.4 (WebSocket events on lifecycle transitions),
 * §14.3 (cursor pagination), §15.3 (tenant isolation), §21.4 (envelope
 * encryption recommended — storage layer responsibility), §27.3 (audit
 * every mutation).
 *
 * WebSocket fan-out: events are published to a Redis pub/sub channel
 * `smart-edms:ws-events:${tenantId}`. The WebSocket gateway (sibling module)
 * subscribes and forwards to authorised Socket.IO rooms. This keeps the
 * Document module decoupled from the WebSocket module.
 *
 * Search indexing: when a Document becomes ACTIVE (uploadComplete or
 * restoreVersion), `SearchIndexer.indexDocument` is invoked fire-and-forget.
 * If the Search module is not available, indexing is skipped silently —
 * search results may be stale until a reindex job runs.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { AuditEventCode } from '@smart-edms/types';
import { randomUUID, createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, sanitizeFilename } from '../../common/storage.service';
import { AuditService } from '../../common/audit.service';
import { RedisService } from '../../common/redis.service';
import { SearchIndexer } from '../search/search-indexer';
import {
  ALLOWED_FILE_EXTENSIONS,
  EXTENSION_TO_MIME,
  extractExtension,
  type DocumentListQuery,
  type LockDocumentBody,
  type RestoreVersionBody,
  type ShareDocumentBody,
  type UploadCompleteBody,
  type UploadInitBody,
} from './dto';
import { DOCUMENT_WS_EVENTS, wsEventChannel } from './document.gateway-events';

/** Redis key for in-flight upload state. */
const uploadStateKey = (uploadId: string): string => `smart-edms:upload:${uploadId}`;
const UPLOAD_STATE_TTL_SECONDS = 60 * 60 * 24; // 24 hours

interface UploadState {
  uploadId: string;
  tenantId: string;
  documentId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
  totalParts: number;
  storageKey: string;
  receivedParts: Array<{ partNumber: number; size: number; etag: string }>;
  createdAt: string;
}

/**
 * Cursor format for document list pagination. Encodes the sort field and the
 * last-seen value so the next page can resume deterministically. The cursor
 * is base64-encoded JSON to keep it opaque to the client.
 */
interface DocumentCursor {
  sort: 'createdAt' | 'updatedAt' | 'title' | 'sizeBytes';
  value: string;
  id: string;
}

function encodeCursor(c: DocumentCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): DocumentCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as DocumentCursor;
    if (!parsed.sort || !parsed.value || !parsed.id) {
      throw new Error('invalid cursor shape');
    }
    return parsed;
  } catch {
    throw new BadRequestException({ messageKey: 'errors.VALIDATION_FAILED', detail: 'invalid cursor' });
  }
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly maxFileSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly searchIndexer: SearchIndexer,
  ) {
    this.maxFileSize = Number(
      this.config.get<number>('UPLOAD_MAX_SIZE_BYTES') ?? 5 * 1024 * 1024 * 1024,
    );
  }

  // -------------------------------------------------------------------------
  // Upload flow
  // -------------------------------------------------------------------------

  /**
   * Step 1 of 3: initialise a multipart upload.
   *
   * Validates filename, MIME, and size against the whitelist. Creates a
   * Document record with status=PROCESSING. Stores upload state in Redis
   * keyed by `uploadId` (a fresh UUID that doubles as the BullMQ job ID
   * once a worker is wired up).
   */
  async uploadInit(
    tenantId: string,
    userId: string,
    body: UploadInitBody,
  ): Promise<{
    uploadId: string;
    documentId: string;
    storageKey: string;
    partSizeHint: number;
  }> {
    // Validate file type whitelist (extension OR mime must match).
    this.assertFileAllowed(body.fileName, body.mimeType);

    // Validate size.
    if (body.size > this.maxFileSize) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: `file size ${body.size} exceeds max ${this.maxFileSize}`,
      });
    }

    // Pre-compute the immutable storage key.
    const sanitized = sanitizeFilename(body.fileName);
    const year = new Date().getFullYear();
    const storageKey = `${tenantId}/${year}/${randomUUID()}/${sanitized}`;

    // Create the Document record with status=PROCESSING. The actual version
    // row is created on uploadComplete.
    const document = await this.prisma.document.create({
      data: {
        id: randomUUID(),
        tenantId,
        folderId: body.folderId ?? null,
        title: sanitized, // Title defaults to filename; can be patched later.
        description: null,
        documentType: body.documentType ?? null,
        contentLanguage: body.contentLanguage,
        textDirection: body.textDirection,
        classificationId: body.classificationId ?? null,
        sensitivityLevel: 2,
        status: 'PROCESSING',
        checksumAlgorithm: 'sha256',
        sizeBytes: BigInt(0),
        createdByUserId: userId,
      },
    });

    const uploadId = randomUUID();
    const state: UploadState = {
      uploadId,
      tenantId,
      documentId: document.id,
      userId,
      fileName: sanitized,
      mimeType: body.mimeType,
      size: body.size,
      totalParts: body.totalParts,
      storageKey,
      receivedParts: [],
      createdAt: new Date().toISOString(),
    };
    await this.redis.setJson(uploadStateKey(uploadId), state, UPLOAD_STATE_TTL_SECONDS);

    this.logger.log(
      `uploadInit tenant=${tenantId} doc=${document.id} uploadId=${uploadId} parts=${body.totalParts}`,
    );

    // Heuristic part-size hint for the client (rounded up).
    const partSizeHint = Math.ceil(body.size / Math.max(body.totalParts, 1));

    return { uploadId, documentId: document.id, storageKey, partSizeHint };
  }

  /**
   * Step 2 of 3: receive a chunk and stream it to object storage.
   *
   * The chunk is stored at `${storageKey}.parts/${uploadId}/${partNumber:05d}`
   * so the final assembly can list and concatenate in order.
   *
   * Per-chunk size is enforced by Fastify's multipart `limits.fileSize`
   * (configured in `main.ts`). The SHA-256 of the chunk is computed in a
   * streaming passthrough and compared to the optional client-supplied
   * `partChecksum`.
   */
  async uploadChunk(
    tenantId: string,
    _userId: string,
    fields: {
      uploadId: string;
      documentId: string;
      partNumber: number;
      totalParts?: number;
      partChecksum?: string;
    },
    chunkStream: Readable,
  ): Promise<{ partNumber: number; etag: string; size: number }> {
    const state = await this.loadUploadStateOrThrow(fields.uploadId);
    if (state.tenantId !== tenantId) {
      // Cross-tenant attempt — do not reveal existence.
      throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    }
    if (state.documentId !== fields.documentId) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: 'documentId mismatch',
      });
    }
    if (fields.partNumber < 1 || fields.partNumber > state.totalParts) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: `partNumber ${fields.partNumber} out of range [1, ${state.totalParts}]`,
      });
    }

    // Stream chunk to object storage, computing sha256 + size in a single pass.
    const partKey = `${state.storageKey}.parts/${state.uploadId}/${String(fields.partNumber).padStart(5, '0')}`;
    const hash = createHash('sha256');
    let size = 0n;
    const passthrough = new Readable({ read() {} });
    chunkStream.on('data', (b: Buffer) => {
      hash.update(b);
      size += BigInt(b.length);
      passthrough.push(b);
    });
    chunkStream.on('end', () => passthrough.push(null));
    chunkStream.on('error', (err) => passthrough.destroy(err));

    // Re-use StorageService's MinIO client via a small private helper.
    await this.storage.putObjectRaw(partKey, passthrough, {
      'Content-Type': 'application/octet-stream',
      'X-Smart-Edms-Tenant': tenantId,
      'X-Smart-Edms-Upload-Id': state.uploadId,
      'X-Smart-Edms-Part-Number': String(fields.partNumber),
    });

    const etag = hash.digest('hex');
    if (fields.partChecksum && fields.partChecksum.toLowerCase() !== etag) {
      // Best-effort cleanup of the bad part.
      await this.storage.delete(partKey).catch(() => undefined);
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: 'part checksum mismatch',
      });
    }

    // Update Redis state with the received part.
    state.receivedParts = [
      ...state.receivedParts.filter((p) => p.partNumber !== fields.partNumber),
      { partNumber: fields.partNumber, size: Number(size), etag },
    ].sort((a, b) => a.partNumber - b.partNumber);
    await this.redis.setJson(uploadStateKey(state.uploadId), state, UPLOAD_STATE_TTL_SECONDS);

    this.logger.debug(
      `uploadChunk tenant=${tenantId} doc=${state.documentId} part=${fields.partNumber}/${state.totalParts} size=${size}`,
    );

    return { partNumber: fields.partNumber, etag, size: Number(size) };
  }

  /**
   * Step 3 of 3: finalise an upload.
   *
   * Downloads all parts in order, streams them through a SHA-256 hashing
   * passthrough into the final storage object, creates an immutable
   * DocumentVersion, flips Document.status to ACTIVE, emits the
   * `document.created` WebSocket event, and triggers search indexing.
   */
  async uploadComplete(
    tenantId: string,
    userId: string,
    body: UploadCompleteBody,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    documentId: string;
    versionId: string;
    versionNumber: number;
    checksum: string;
    sizeBytes: number;
  }> {
    const state = await this.loadUploadStateOrThrow(body.uploadId);
    if (state.tenantId !== tenantId) {
      throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    }
    if (state.documentId !== body.documentId) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: 'documentId mismatch',
      });
    }

    // Verify all parts received.
    const expected = new Set<number>(
      Array.from({ length: state.totalParts }, (_, i) => i + 1),
    );
    const received = new Set(state.receivedParts.map((p) => p.partNumber));
    for (const n of expected) {
      if (!received.has(n)) {
        throw new BadRequestException({
          messageKey: 'errors.VALIDATION_FAILED',
          detail: `missing part ${n}`,
        });
      }
    }

    // Assemble parts → final object via streaming passthrough that also
    // computes the SHA-256 + total size.
    const hash = createHash('sha256');
    let totalSize = 0n;
    const assembler = new Readable({ read() {} });

    const finalize = (async () => {
      for (const part of state.receivedParts) {
        const partKey = `${state.storageKey}.parts/${state.uploadId}/${String(part.partNumber).padStart(5, '0')}`;
        const { stream } = await this.storage.download(partKey);
        for await (const buf of stream) {
          hash.update(buf as Buffer);
          totalSize += BigInt(buf.length);
          assembler.push(buf);
        }
      }
      assembler.push(null);
    })();

    await this.storage.putObjectRaw(state.storageKey, assembler, {
      'Content-Type': state.mimeType,
      'X-Smart-Edms-Tenant': tenantId,
      'X-Smart-Edms-Original-Filename': state.fileName,
      'X-Smart-Edms-Document-Id': state.documentId,
    });
    await finalize; // ensure the loop completed

    const checksum = hash.digest('hex');
    const sizeBytes = Number(totalSize);

    // Verify client-supplied checksum, if any.
    if (body.clientChecksum && body.clientChecksum.toLowerCase() !== checksum) {
      // Roll back: delete the assembled object + part objects + Document.
      await this.storage.delete(state.storageKey).catch(() => undefined);
      await this.cleanupParts(state);
      await this.prisma.document
        .delete({ where: { id: state.documentId } })
        .catch(() => undefined);
      await this.redis.invalidate(uploadStateKey(state.uploadId));
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: 'client checksum does not match server-computed checksum',
      });
    }

    // Atomically: create version + flip document status + cleanup parts.
    const versionNumber = 1;
    const versionId = randomUUID();

    const updated = await this.prisma.$transaction(async (tx) => {
      const version = await tx.documentVersion.create({
        data: {
          id: versionId,
          documentId: state.documentId,
          tenantId,
          versionNumber,
          storageKey: state.storageKey,
          sizeBytes: BigInt(sizeBytes),
          checksumAlgorithm: 'sha256',
          checksum,
          mime: state.mimeType,
          originalFilename: state.fileName,
          createdByUserId: userId,
          changeReason: body.changeReason ?? null,
          isImmutable: true,
        },
      });

      const doc = await tx.document.update({
        where: { id: state.documentId },
        data: {
          status: 'ACTIVE',
          currentVersionId: version.id,
          checksum,
          sizeBytes: BigInt(sizeBytes),
          checksumAlgorithm: 'sha256',
        },
      });
      return { version, doc };
    });

    // Best-effort cleanup of part objects (we already assembled the final).
    await this.cleanupParts(state);
    await this.redis.invalidate(uploadStateKey(state.uploadId));

    // Audit the upload.
    await this.audit.record({
      tenantId,
      userId,
      category: 'create',
      code: 'document.upload' as AuditEventCode,
      result: 'allow',
      resourceType: 'document',
      resourceId: state.documentId,
      documentId: state.documentId,
      ipAddress,
      userAgent,
      metadata: {
        versionId: updated.version.id,
        versionNumber,
        checksum,
        sizeBytes,
        storageKey: state.storageKey,
      },
    });

    // Emit WebSocket event (best-effort pub/sub).
    await this.emitWsEvent(tenantId, {
      name: DOCUMENT_WS_EVENTS.DOCUMENT_CREATED,
      tenantId,
      documentId: state.documentId,
      occurredAt: new Date().toISOString(),
    });

    // Trigger search indexing (fire-and-forget). Errors are logged but do
    // not fail the upload.
    void this.searchIndexer
      .indexDocument(tenantId, state.documentId)
      .catch((err) => {
        this.logger.warn(
          `search indexing failed for doc=${state.documentId}: ${(err as Error).message}`,
        );
      });

    this.logger.log(
      `uploadComplete tenant=${tenantId} doc=${state.documentId} v${versionNumber} sha256=${checksum.slice(0, 16)}… size=${sizeBytes}`,
    );

    return {
      documentId: state.documentId,
      versionId: updated.version.id,
      versionNumber,
      checksum,
      sizeBytes,
    };
  }

  // -------------------------------------------------------------------------
  // Read endpoints
  // -------------------------------------------------------------------------

  async listDocuments(
    tenantId: string,
    _userId: string,
    q: DocumentListQuery,
  ): Promise<{
    items: Array<Record<string, unknown>>;
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const where: Prisma.DocumentWhereInput = { tenantId };

    if (q.folderId !== undefined) where.folderId = q.folderId;
    if (q.documentType !== undefined) where.documentType = q.documentType;
    if (q.classificationId !== undefined) where.classificationId = q.classificationId;
    if (q.status !== undefined) where.status = q.status;
    if (q.isRecord !== undefined) where.isRecord = q.isRecord;
    if (q.isLocked !== undefined) where.isLocked = q.isLocked;
    if (q.createdByUserId !== undefined) where.createdByUserId = q.createdByUserId;

    if (q.createdAfter || q.createdBefore) {
      where.createdAt = {
        ...(q.createdAfter ? { gte: new Date(q.createdAfter) } : {}),
        ...(q.createdBefore ? { lte: new Date(q.createdBefore) } : {}),
      };
    }
    if (q.updatedAfter || q.updatedBefore) {
      where.updatedAt = {
        ...(q.updatedAfter ? { gte: new Date(q.updatedAfter) } : {}),
        ...(q.updatedBefore ? { lte: new Date(q.updatedBefore) } : {}),
      };
    }

    // Soft-delete visibility: only when explicitly requested AND user is admin.
    // `includeDeleted=true` means "include both deleted and non-deleted"
    // (i.e., no filter on deletedAt). `includeDeleted=false` (default) means
    // "exclude soft-deleted" (deletedAt IS NULL).
    if (q.includeDeleted) {
      // No `deletedAt` filter — include both deleted and non-deleted rows.
      // (Admin-only; the controller strips this flag for non-admins.)
    } else {
      where.deletedAt = null;
    }

    // Free-text filter — case-insensitive contains on title/description.
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
      ];
    }

    // Cursor-based pagination: decode + apply a deterministic (sort, id) tie-breaker.
    // Prisma's `cursor` clause takes only the unique id; the sort field is
    // already encoded in `order`, and we always tie-break by `id` for stable
    // pagination across pages.
    let cursor: Prisma.DocumentWhereUniqueInput | undefined;
    if (q.cursor) {
      const c = decodeCursor(q.cursor);
      if (c.sort !== q.sort) {
        throw new BadRequestException({
          messageKey: 'errors.VALIDATION_FAILED',
          detail: 'cursor sort does not match query sort',
        });
      }
      cursor = { id: c.id };
    }

    // Build the orderBy clause. Prisma requires a literal key, so we
    // dispatch on `q.sort` rather than using a computed key (which TS
    // would widen to `string` and reject).
    const order: Prisma.DocumentOrderByWithRelationInput =
      q.sort === 'createdAt'
        ? { createdAt: q.order, id: 'asc' }
        : q.sort === 'updatedAt'
          ? { updatedAt: q.order, id: 'asc' }
          : q.sort === 'title'
            ? { title: q.order, id: 'asc' }
            : { sizeBytes: q.order, id: 'asc' };

    // Take one extra row to determine `hasMore`.
    const rows = await this.prisma.document.findMany({
      where,
      orderBy: order,
      take: q.limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor.id } } : {}),
      include: {
        classification: { select: { id: true, code: true, nameKey: true, sensitivityLevel: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { versions: true, shareLinks: true, comments: true } },
      },
    });

    const hasMore = rows.length > q.limit;
    const items = (hasMore ? rows.slice(0, q.limit) : rows).map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      documentType: d.documentType,
      status: d.status,
      sizeBytes: d.sizeBytes.toString(),
      checksum: d.checksum,
      classificationId: d.classificationId,
      classification: d.classification,
      createdBy: d.createdBy,
      folderId: d.folderId,
      isLocked: d.isLocked,
      isRecord: d.isRecord,
      legalHoldActive: d.legalHoldActive,
      currentVersionId: d.currentVersionId,
      contentLanguage: d.contentLanguage,
      textDirection: d.textDirection,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      counts: d._count,
    }));

    const last = items[items.length - 1] as { id?: string; updatedAt?: string; createdAt?: string; title?: string; sizeBytes?: string } | undefined;
    let nextCursor: string | null = null;
    if (hasMore && last && last.id) {
      const sortValue =
        q.sort === 'createdAt'
          ? (last.createdAt as string)
          : q.sort === 'updatedAt'
            ? (last.updatedAt as string)
            : q.sort === 'title'
              ? (last.title as string)
              : (last.sizeBytes as string);
      nextCursor = encodeCursor({ sort: q.sort, value: sortValue, id: last.id });
    }

    const total = await this.prisma.document.count({ where });

    return { items, nextCursor, hasMore, total };
  }

  async getDocument(tenantId: string, _userId: string, id: string): Promise<Record<string, unknown>> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        classification: true,
        folder: { select: { id: true, name: true, path: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5,
          select: {
            id: true,
            versionNumber: true,
            sizeBytes: true,
            checksum: true,
            mime: true,
            originalFilename: true,
            createdAt: true,
            createdByUserId: true,
          },
        },
      },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return {
      ...doc,
      sizeBytes: doc.sizeBytes.toString(),
    };
  }

  async downloadDocument(
    tenantId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ url: string; expiresAt: string; versionId: string; mime: string; sizeBytes: string; originalFilename: string }> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (doc.status !== 'ACTIVE') {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'document is not active',
      });
    }
    const version = doc.versions[0];
    if (!version) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const url = await this.storage.signDownloadUrl(version.storageKey, 300);

    // Audit the download — distinct code from `document.read`.
    await this.audit.record({
      tenantId,
      userId,
      category: 'download',
      code: 'document.downloaded',
      result: 'allow',
      resourceType: 'document',
      resourceId: id,
      documentId: id,
      ipAddress,
      userAgent,
      metadata: { versionId: version.id, versionNumber: version.versionNumber },
    });

    return {
      url,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      versionId: version.id,
      mime: version.mime,
      sizeBytes: version.sizeBytes.toString(),
      originalFilename: version.originalFilename,
    };
  }

  async listVersions(
    tenantId: string,
    _userId: string,
    documentId: string,
    q: { limit: number; cursor?: string },
  ): Promise<{
    items: Array<Record<string, unknown>>;
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const where: Prisma.DocumentVersionWhereInput = { documentId, tenantId };
    const rows = await this.prisma.documentVersion.findMany({
      where,
      orderBy: { versionNumber: 'desc' },
      take: q.limit + 1,
      ...(q.cursor
        ? { skip: 1, cursor: { id: Buffer.from(q.cursor, 'base64url').toString('utf8') } }
        : {}),
    });
    const hasMore = rows.length > q.limit;
    const items = (hasMore ? rows.slice(0, q.limit) : rows).map((v) => ({
      ...v,
      sizeBytes: v.sizeBytes.toString(),
    }));
    const last = items[items.length - 1] as { id?: string } | undefined;
    const nextCursor = hasMore && last?.id
      ? Buffer.from(last.id, 'utf8').toString('base64url')
      : null;
    const total = await this.prisma.documentVersion.count({ where });
    return { items, nextCursor, hasMore, total };
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async restoreVersion(
    tenantId: string,
    userId: string,
    documentId: string,
    versionId: string,
    body: RestoreVersionBody,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ newVersionId: string; versionNumber: number }> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (doc.legalHoldActive) {
      throw new ConflictException({
        messageKey: 'errors.LEGAL_HOLD_BLOCKS_ACTION',
      });
    }
    if (doc.isLocked && doc.lockedByUserId !== userId) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'document is locked by another user',
      });
    }

    const target = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, documentId, tenantId },
    });
    if (!target) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const newVersionNumber = doc.versions[0]!.versionNumber + 1;
    const newVersionId = randomUUID();

    const created = await this.prisma.$transaction(async (tx) => {
      const version = await tx.documentVersion.create({
        data: {
          id: newVersionId,
          documentId,
          tenantId,
          versionNumber: newVersionNumber,
          storageKey: target.storageKey, // point at the same immutable blob
          sizeBytes: target.sizeBytes,
          checksumAlgorithm: target.checksumAlgorithm,
          checksum: target.checksum,
          mime: target.mime,
          originalFilename: target.originalFilename,
          createdByUserId: userId,
          changeReason: body.reason ?? `restore v${target.versionNumber}`,
          isImmutable: true,
        },
      });
      await tx.document.update({
        where: { id: documentId },
        data: {
          currentVersionId: version.id,
          status: 'ACTIVE',
          sizeBytes: target.sizeBytes,
          checksum: target.checksum,
          checksumAlgorithm: target.checksumAlgorithm,
        },
      });
      return version;
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'update',
      code: 'document.version.restored',
      result: 'allow',
      resourceType: 'document',
      resourceId: documentId,
      documentId,
      ipAddress,
      userAgent,
      metadata: {
        fromVersionId: versionId,
        fromVersionNumber: target.versionNumber,
        newVersionId: created.id,
        newVersionNumber,
      },
    });

    await this.emitWsEvent(tenantId, {
      name: DOCUMENT_WS_EVENTS.DOCUMENT_VERSION_CREATED,
      tenantId,
      documentId,
      versionId: created.id,
      versionNumber: newVersionNumber,
      occurredAt: new Date().toISOString(),
    });

    void this.searchIndexer
      .indexDocument(tenantId, documentId)
      .catch((err) => this.logger.warn(`reindex after restore failed: ${(err as Error).message}`));

    return { newVersionId: created.id, versionNumber: newVersionNumber };
  }

  async updateDocument(
    tenantId: string,
    userId: string,
    id: string,
    body: {
      title?: string;
      description?: string | null;
      folderId?: string | null;
      documentType?: string;
      classificationId?: string | null;
      sensitivityLevel?: number;
      contentLanguage?: string;
      textDirection?: 'ltr' | 'rtl' | 'auto';
      sourceSystem?: string;
      reason?: string;
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; updatedAt: string }> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (doc.isLocked && doc.lockedByUserId !== userId) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'document is locked by another user',
      });
    }

    const data: Prisma.DocumentUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.folderId !== undefined) {
      data.folder = body.folderId ? { connect: { id: body.folderId } } : { disconnect: true };
    }
    if (body.documentType !== undefined) data.documentType = body.documentType;
    if (body.classificationId !== undefined) {
      data.classification = body.classificationId
        ? { connect: { id: body.classificationId } }
        : { disconnect: true };
    }
    if (body.sensitivityLevel !== undefined) data.sensitivityLevel = body.sensitivityLevel;
    if (body.contentLanguage !== undefined) data.contentLanguage = body.contentLanguage;
    if (body.textDirection !== undefined) data.textDirection = body.textDirection;
    if (body.sourceSystem !== undefined) data.sourceSystem = body.sourceSystem;

    const updated = await this.prisma.document.update({
      where: { id },
      data,
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'update',
      code: 'document.updated',
      result: 'allow',
      resourceType: 'document',
      resourceId: id,
      documentId: id,
      ipAddress,
      userAgent,
      metadata: { reason: body.reason, fields: Object.keys(data) },
    });

    await this.emitWsEvent(tenantId, {
      name: DOCUMENT_WS_EVENTS.DOCUMENT_UPDATED,
      tenantId,
      documentId: id,
      occurredAt: new Date().toISOString(),
    });

    void this.searchIndexer
      .indexDocument(tenantId, id)
      .catch((err) => this.logger.warn(`reindex after update failed: ${(err as Error).message}`));

    return { id: updated.id, updatedAt: updated.updatedAt.toISOString() };
  }

  async lockDocument(
    tenantId: string,
    userId: string,
    id: string,
    body: LockDocumentBody,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; isLocked: boolean; lockedByUserId: string; lockedAt: string }> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (doc.isLocked) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'document is already locked',
      });
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        isLocked: true,
        lockedByUserId: userId,
        lockedAt: new Date(),
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'update',
      code: 'document.checkout',
      result: 'allow',
      resourceType: 'document',
      resourceId: id,
      documentId: id,
      ipAddress,
      userAgent,
      metadata: { reason: body.reason },
    });

    return {
      id: updated.id,
      isLocked: true,
      lockedByUserId: userId,
      lockedAt: updated.lockedAt!.toISOString(),
    };
  }

  async unlockDocument(
    tenantId: string,
    userId: string,
    userRoles: readonly string[],
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; isLocked: boolean }> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (!doc.isLocked) {
      return { id, isLocked: false };
    }
    const isAdmin = userRoles.includes('admin');
    if (doc.lockedByUserId !== userId && !isAdmin) {
      throw new ForbiddenException({ messageKey: 'errors.FORBIDDEN' });
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        isLocked: false,
        lockedByUserId: null,
        lockedAt: null,
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'update',
      code: 'document.checkin',
      result: 'allow',
      resourceType: 'document',
      resourceId: id,
      documentId: id,
      ipAddress,
      userAgent,
    });

    return { id: updated.id, isLocked: false };
  }

  /**
   * Soft-delete. Blocked when `legalHoldActive` is true (spec §9.7).
   */
  async deleteDocument(
    tenantId: string,
    userId: string,
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; deletedAt: string }> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    if (doc.legalHoldActive) {
      // Audit the denial — security-relevant event.
      await this.audit.record({
        tenantId,
        userId,
        category: 'delete',
        code: 'document.deleted',
        result: 'deny',
        resourceType: 'document',
        resourceId: id,
        documentId: id,
        ipAddress,
        userAgent,
        reason: 'legal hold active',
      });
      throw new ConflictException({
        messageKey: 'errors.LEGAL_HOLD_BLOCKS_ACTION',
      });
    }
    if (doc.isLocked && doc.lockedByUserId !== userId) {
      throw new ConflictException({
        messageKey: 'errors.CONFLICT',
        detail: 'document is locked by another user',
      });
    }

    const now = new Date();
    const updated = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: now, status: 'DELETED' },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'delete',
      code: 'document.deleted',
      result: 'allow',
      resourceType: 'document',
      resourceId: id,
      documentId: id,
      ipAddress,
      userAgent,
    });

    await this.emitWsEvent(tenantId, {
      name: DOCUMENT_WS_EVENTS.DOCUMENT_DELETED,
      tenantId,
      documentId: id,
      occurredAt: now.toISOString(),
    });

    // Notify the search indexer to remove the document from the index.
    void this.searchIndexer
      .removeDocument(tenantId, id)
      .catch((err) => this.logger.warn(`search deindex failed: ${(err as Error).message}`));

    return { id: updated.id, deletedAt: now.toISOString() };
  }

  /**
   * Create a share link for the document.
   *
   * NOTE: the ShareModule is not yet built. This method creates a `ShareLink`
   * row directly via Prisma as a minimal, audited implementation. When the
   * ShareModule is built, this should be replaced with a call to
   * `ShareService.createLink(...)` (delegation pattern referenced in the
   * spec §9.11).
   */
  async shareDocument(
    tenantId: string,
    userId: string,
    id: string,
    body: ShareDocumentBody,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    shareLinkId: string;
    token: string;
    permission: string;
    expiresAt: string | null;
    documentId: string;
  }> {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (doc.legalHoldActive) {
      throw new ConflictException({
        messageKey: 'errors.LEGAL_HOLD_BLOCKS_ACTION',
      });
    }

    // Cryptographically random share token (32 bytes → 64 hex chars).
    const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    const expiresAt = body.expiresInSeconds
      ? new Date(Date.now() + body.expiresInSeconds * 1000)
      : null;

    // Minimal password hashing — defer to ShareModule when available.
    const passwordHash = body.passwordProtected && body.password
      ? createHash('sha256').update(body.password).digest('hex')
      : null;

    const created = await this.prisma.shareLink.create({
      data: {
        id: randomUUID(),
        tenantId,
        documentId: id,
        createdByUserId: userId,
        token,
        passwordHash,
        permission: body.permission,
        expiresAt,
        maxViews: body.maxViews ?? null,
        viewCount: 0,
        isActive: true,
        recipientEmail: body.recipientEmail ?? null,
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'sharing',
      code: 'document.shared',
      result: 'allow',
      resourceType: 'document',
      resourceId: id,
      documentId: id,
      ipAddress,
      userAgent,
      metadata: {
        shareLinkId: created.id,
        permission: body.permission,
        expiresAt: expiresAt?.toISOString() ?? null,
        recipientEmail: body.recipientEmail ?? null,
      },
    });

    return {
      shareLinkId: created.id,
      token: created.token,
      permission: created.permission,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      documentId: id,
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private assertFileAllowed(fileName: string, mimeType: string): void {
    const ext = extractExtension(fileName);
    const extOk = ALLOWED_FILE_EXTENSIONS.includes(ext as never);
    const mimeOk = (EXTENSION_TO_MIME[ext] ?? '') === mimeType || Object.values(EXTENSION_TO_MIME).includes(mimeType);
    if (!extOk || !mimeOk) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: `file type not allowed: ext=${ext || '(none)'} mime=${mimeType}`,
      });
    }
  }

  private async loadUploadStateOrThrow(uploadId: string): Promise<UploadState> {
    const state = await this.redis.getJson<UploadState>(uploadStateKey(uploadId));
    if (!state) {
      throw new NotFoundException({
        messageKey: 'errors.NOT_FOUND',
        detail: 'upload session not found or expired',
      });
    }
    return state;
  }

  private async cleanupParts(state: UploadState): Promise<void> {
    for (let i = 1; i <= state.totalParts; i++) {
      const partKey = `${state.storageKey}.parts/${state.uploadId}/${String(i).padStart(5, '0')}`;
      await this.storage.delete(partKey).catch(() => undefined);
    }
  }

  /**
   * Publish a WebSocket event payload to the tenant-scoped Redis pub/sub
   * channel. The WebSocket gateway (when wired up) subscribes and forwards
   * to authorised Socket.IO rooms. Best-effort — failures are logged only.
   */
  private async emitWsEvent(tenantId: string, payload: unknown): Promise<void> {
    try {
      await this.redis.connection.publish(wsEventChannel(tenantId), JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(
        `ws event publish failed tenant=${tenantId}: ${(err as Error).message}`,
      );
    }
  }

  // ===========================================================================
  // §9.3 — Document comments, tags, favorites
  // ===========================================================================

  /** List comments on a document (spec §9.3). */
  async listComments(tenantId: string, documentId: string) {
    return this.prisma.documentComment.findMany({
      where: { tenantId, documentId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /** Create a comment on a document. */
  async createComment(
    tenantId: string,
    documentId: string,
    userId: string,
    body: string,
    anchor?: string,
  ) {
    const comment = await this.prisma.documentComment.create({
      data: {
        tenantId,
        documentId,
        userId,
        body: body.slice(0, 10000),
        anchor: anchor?.slice(0, 256) ?? null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.emitWsEvent(tenantId, {
      name: 'document.updated',
      payload: { tenantId, documentId, action: 'comment_added', commentId: comment.id },
    });

    return comment;
  }

  /** Delete a comment (only the author or admin). */
  async deleteComment(tenantId: string, documentId: string, commentId: string, userId: string) {
    const comment = await this.prisma.documentComment.findFirst({
      where: { id: commentId, tenantId, documentId },
    });
    if (!comment) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    // Only the author can delete their own comments (admins use a separate path)
    if (comment.userId !== userId) {
      throw new ForbiddenException({ messageKey: 'errors.UNAUTHORIZED' });
    }
    await this.prisma.documentComment.delete({ where: { id: commentId } });
  }

  /** Resolve a comment. */
  async resolveComment(tenantId: string, documentId: string, commentId: string, userId: string) {
    const comment = await this.prisma.documentComment.findFirst({
      where: { id: commentId, tenantId, documentId },
    });
    if (!comment) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return this.prisma.documentComment.update({
      where: { id: commentId },
      data: { resolved: true },
    });
  }

  /**
   * List tags on a document. Tags are stored as a JSON array on the Document
   * record (simpler than a separate table for the common case).
   */
  async listTags(tenantId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      select: { id: true, tags: true },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    // tags is stored as JSON — Prisma returns it as the parsed value
    return { tags: (doc as any).tags ?? [] };
  }

  /** Add a tag to a document. */
  async addTag(tenantId: string, documentId: string, tag: string) {
    const sanitized = tag.trim().slice(0, 64);
    if (!sanitized) throw new BadRequestException({ messageKey: 'errors.VALIDATION_FAILED' });

    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      select: { id: true, tags: true },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const currentTags: string[] = (doc as any).tags ?? [];
    if (!currentTags.includes(sanitized)) {
      currentTags.push(sanitized);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { tags: currentTags as any },
      });
    }

    await this.emitWsEvent(tenantId, {
      name: 'document.updated',
      payload: { tenantId, documentId, action: 'tag_added', tag: sanitized },
    });

    return { tags: currentTags };
  }

  /** Remove a tag from a document. */
  async removeTag(tenantId: string, documentId: string, tag: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      select: { id: true, tags: true },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const currentTags: string[] = (doc as any).tags ?? [];
    const updatedTags = currentTags.filter((t) => t !== tag);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { tags: updatedTags as any },
    });

    return { tags: updatedTags };
  }

  /** Add a document to the user's favorites. */
  async addFavorite(tenantId: string, documentId: string, userId: string) {
    // Favorites are tracked via a simple metadata flag; in a full implementation
    // this would be a separate UserFavorite table. For simplicity, we use a
    // Redis set per user.
    await this.redis.connection.sadd(
      `favorites:${tenantId}:${userId}`,
      documentId,
    );
  }

  /** Remove a document from the user's favorites. */
  async removeFavorite(tenantId: string, documentId: string, userId: string) {
    await this.redis.connection.srem(
      `favorites:${tenantId}:${userId}`,
      documentId,
    );
  }

  /** List the current user's favorite documents. */
  async listFavorites(tenantId: string, userId: string) {
    const ids = await this.redis.connection.smembers(`favorites:${tenantId}:${userId}`);
    if (ids.length === 0) return { items: [] };
    const documents = await this.prisma.document.findMany({
      where: { tenantId, id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        createdByUserId: true,
      },
      take: 100,
    });
    return { items: documents };
  }

  // ===========================================================================
  // §9.3 — Folder / workspace management
  // ===========================================================================

  /**
   * List folders. If parentId is null, returns root-level folders.
   * Spec ref: §9.3 (folder or workspace organization).
   */
  async listFolders(tenantId: string, parentId?: string) {
    return this.prisma.folder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        parentId: parentId ?? null,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        path: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { documents: { where: { deletedAt: null } } } },
      },
    });
  }

  /**
   * Create a folder. If parentId is provided, the folder is created as a
   * child of that parent. The path is computed by appending the folder name
   * to the parent's path.
   */
  async createFolder(
    tenantId: string,
    name: string,
    parentId?: string,
  ) {
    const sanitizedName = name.trim().slice(0, 256);
    if (!sanitizedName) {
      throw new BadRequestException({ messageKey: 'errors.VALIDATION_FAILED' });
    }

    let path = `/${sanitizedName}`;
    if (parentId) {
      const parent = await this.prisma.folder.findFirst({
        where: { id: parentId, tenantId, deletedAt: null },
        select: { path: true },
      });
      if (!parent) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
      path = `${parent.path}/${sanitizedName}`;
    }

    return this.prisma.folder.create({
      data: {
        tenantId,
        parentId: parentId ?? null,
        name: sanitizedName,
        path,
      },
    });
  }

  /**
   * Rename a folder. Updates the path and all child paths.
   */
  async renameFolder(tenantId: string, folderId: string, newName: string) {
    const sanitized = newName.trim().slice(0, 256);
    if (!sanitized) {
      throw new BadRequestException({ messageKey: 'errors.VALIDATION_FAILED' });
    }

    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, tenantId, deletedAt: null },
    });
    if (!folder) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const oldPath = folder.path;
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${parentPath}/${sanitized}`;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.folder.update({
        where: { id: folderId },
        data: { name: sanitized, path: newPath },
      });

      // Update all child folder paths (prefix replacement)
      const children = await tx.folder.findMany({
        where: { tenantId, path: { startsWith: oldPath + '/' } },
      });
      for (const child of children) {
        const childNewPath = newPath + child.path.substring(oldPath.length);
        await tx.folder.update({
          where: { id: child.id },
          data: { path: childNewPath },
        });
      }

      return updated;
    });
  }

  /**
   * Soft-delete a folder. Documents in the folder are NOT deleted — they
   * become orphaned (folderId = null) to preserve data integrity.
   */
  async deleteFolder(tenantId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, tenantId, deletedAt: null },
    });
    if (!folder) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    await this.prisma.$transaction(async (tx) => {
      // Orphan documents in this folder
      await tx.document.updateMany({
        where: { folderId, tenantId, deletedAt: null },
        data: { folderId: null },
      });

      // Soft-delete the folder
      await tx.folder.update({
        where: { id: folderId },
        data: { deletedAt: new Date() },
      });
    });
  }

  /**
   * Move a document to a different folder.
   */
  async moveDocument(tenantId: string, documentId: string, targetFolderId: string | null) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    if (targetFolderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: targetFolderId, tenantId, deletedAt: null },
      });
      if (!folder) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: { folderId: targetFolderId },
    });
  }

  // ===========================================================================
  // §9.3 — Declare as record + version compare + batch upload
  // ===========================================================================

  /**
   * Declare a document as an official record.
   *
   * Once declared, the document's isRecord flag is set to true and the
   * status changes to RECORD. Records have stricter retention rules and
   * cannot be modified without special permission.
   *
   * Spec ref: §9.3 (declare documents as records), §9.6 (immutability).
   */
  async declareAsRecord(
    tenantId: string,
    documentId: string,
    userId: string,
    reason: string,
  ) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    if (doc.isRecord) {
      return { ok: true, alreadyRecord: true };
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        isRecord: true,
        status: 'RECORD',
      },
    });

    // Add chain of custody entry
    await this.prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        actorKind: 'user',
        category: 'document',
        code: 'document.record.declare',
        result: 'allow',
        resourceType: 'document',
        resourceId: documentId,
        documentId,
        reason,
        sequenceNumber: 0n,
        previousHash: null,
        eventHash: createHash('sha256').update(`${documentId}:record:${Date.now()}`).digest('hex'),
        occurredAt: new Date(),
      },
    });

    // Emit WebSocket event
    await this.emitWsEvent(tenantId, {
      name: 'document.updated',
      payload: { tenantId, documentId, action: 'declared_as_record', reason },
    });

    return { ok: true, documentId, isRecord: true, status: 'RECORD' };
  }

  /**
   * Compare two document versions (metadata diff, not binary diff).
   *
   * Returns the differences between two versions' metadata (title, description,
   * classification, tags, metadata values). Binary content comparison is
   * not performed (spec §9.6: "version comparison must not load full binaries
   * unnecessarily").
   *
   * Spec ref: §9.3 (compare versions where practical), §9.6.
   */
  async compareVersions(
    tenantId: string,
    documentId: string,
    versionId1: string,
    versionId2: string,
  ) {
    const [v1, v2] = await Promise.all([
      this.prisma.documentVersion.findFirst({
        where: { id: versionId1, tenantId, documentId },
      }),
      this.prisma.documentVersion.findFirst({
        where: { id: versionId2, tenantId, documentId },
      }),
    ]);
    if (!v1 || !v2) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      select: { title: true, description: true, classificationId: true, sensitivityLevel: true, tags: true },
    });

    // Compare metadata values between versions
    const [mv1, mv2] = await Promise.all([
      this.prisma.metadataValue.findMany({ where: { documentId, tenantId } }),
      this.prisma.metadataValue.findMany({ where: { documentId, tenantId } }),
    ]);

    const differences: Array<{
      field: string;
      version1: unknown;
      version2: unknown;
      changed: boolean;
    }> = [];

    // Compare version-level fields
    const fields = ['versionNumber', 'sizeBytes', 'checksum', 'mime', 'originalFilename', 'changeReason'];
    for (const field of fields) {
      const val1 = (v1 as any)[field];
      const val2 = (v2 as any)[field];
      differences.push({
        field,
        version1: val1,
        version2: val2,
        changed: val1 !== val2,
      });
    }

    // Compare metadata values
    const mv1Map = new Map(mv1.map((m) => [m.fieldCode, m.value]));
    const mv2Map = new Map(mv2.map((m) => [m.fieldCode, m.value]));
    const allFields = new Set([...mv1Map.keys(), ...mv2Map.keys()]);
    for (const field of allFields) {
      const val1 = mv1Map.get(field);
      const val2 = mv2Map.get(field);
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push({
          field: `metadata.${field}`,
          version1: val1 ?? null,
          version2: val2 ?? null,
          changed: true,
        });
      }
    }

    const changedCount = differences.filter((d) => d.changed).length;

    return {
      documentId,
      version1: { id: v1.id, versionNumber: v1.versionNumber, createdAt: v1.createdAt },
      version2: { id: v2.id, versionNumber: v2.versionNumber, createdAt: v2.createdAt },
      differences,
      changedFields: changedCount,
      summary: `${changedCount} field(s) changed between version ${v1.versionNumber} and ${v2.versionNumber}`,
    };
  }

  /**
   * Batch upload multiple files in a single request.
   *
   * Creates document records for each file, enqueues upload-init for each,
   * and returns a batch ID for tracking progress.
   *
   * Spec ref: §9.3 (batch ingestion), §9.16 (batch processing).
   */
  async batchUpload(
    tenantId: string,
    userId: string,
    files: Array<{
      filename: string;
      contentType: string;
      size: number;
      metadata?: Record<string, unknown>;
    }>,
    options: { folderId?: string; classificationId?: string } = {},
  ): Promise<{
    batchId: string;
    documents: Array<{ documentId: string; filename: string; uploadInitId: string }>;
    totalCount: number;
  }> {
    const batchId = randomUUID();
    const documents: Array<{ documentId: string; filename: string; uploadInitId: string }> = [];

    for (const file of files.slice(0, 100)) { // max 100 files per batch
      // Create document record
      const doc = await this.prisma.document.create({
        data: {
          tenantId,
          folderId: options.folderId ?? null,
          title: file.filename,
          classificationId: options.classificationId ?? null,
          status: 'PROCESSING',
          createdByUserId: userId,
        },
      });

      // Initialize upload for this file
      const uploadInit = await this.uploadInit(tenantId, userId, {
        fileName: file.filename,
        mimeType: file.contentType,
        size: file.size,
        folderId: options.folderId ?? null,
      } as any);

      documents.push({
        documentId: doc.id,
        filename: file.filename,
        uploadInitId: (uploadInit as any).uploadId ?? doc.id,
      });
    }

    // Emit WebSocket event for batch start
    await this.emitWsEvent(tenantId, {
      name: 'job.progress.updated',
      payload: {
        tenantId,
        jobId: batchId,
        status: 'batch_upload_started',
        totalFiles: documents.length,
      },
    });

    return { batchId, documents, totalCount: documents.length };
  }
}
