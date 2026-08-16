/**
 * Smart EDMS — Document REST controller.
 *
 * All endpoints are JWT-protected (no @Public), tenant-scoped (uses
 * `req.user.tid`), and audited via the @Audit() decorator where mutating.
 *
 * Spec ref: §9.3 (document lifecycle), §14 (API contract), §14.3 (cursor
 * pagination), §27.3 (audit every mutation).
 *
 * Endpoint summary:
 *   POST   /v1/documents/upload-init             initialize multipart upload
 *   POST   /v1/documents/upload-chunk            receive a chunk (multipart)
 *   POST   /v1/documents/upload-complete         finalize + checksum + WS event
 *   GET    /v1/documents                          paginated list (cursor)
 *   GET    /v1/documents/:id                      get metadata
 *   GET    /v1/documents/:id/download             signed URL
 *   GET    /v1/documents/:id/versions             version history (cursor)
 *   POST   /v1/documents/:id/versions/:versionId/restore   restore
 *   PATCH  /v1/documents/:id                      update metadata
 *   POST   /v1/documents/:id/lock                 lock
 *   POST   /v1/documents/:id/unlock               unlock (owner or admin)
 *   DELETE /v1/documents/:id                      soft delete (legal-hold guard)
 *   POST   /v1/documents/:id/share                create share link
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuditEventCode } from '@smart-edms/types';
import { Audit } from '../../common/decorators/audit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import { DocumentService } from './document.service';
import {
  type DocumentListQuery,
  DocumentListQuerySchema,
  type LockDocumentBody,
  LockDocumentBodySchema,
  type RestoreVersionBody,
  RestoreVersionBodySchema,
  type ShareDocumentBody,
  ShareDocumentBodySchema,
  type UpdateDocumentBody,
  UpdateDocumentBodySchema,
  UploadChunkFieldsSchema,
  type UploadCompleteBody,
  UploadCompleteBodySchema,
  type UploadInitBody,
  UploadInitBodySchema,
  VersionListQuerySchema,
} from './dto';

@Controller('v1/documents')
export class DocumentController {
  constructor(private readonly documents: DocumentService) {}

  // -------------------------------------------------------------------------
  // Upload flow
  // -------------------------------------------------------------------------

  @Post('upload-init')
  @Audit({
    category: 'create',
    code: 'document.upload' as AuditEventCode,
    resourceType: 'document',
  })
  @HttpCode(200)
  async uploadInit(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = UploadInitBodySchema.parse(body) as UploadInitBody;
    const result = await this.documents.uploadInit(req.user!.tid, req.user!.sub, parsed);
    return result;
  }

  @Post('upload-chunk')
  @Audit({
    category: 'create',
    code: 'document.upload' as AuditEventCode,
    resourceType: 'document',
  })
  @HttpCode(200)
  async uploadChunk(@Req() req: AuthenticatedRequest): Promise<{
    partNumber: number;
    etag: string;
    size: number;
  }> {
    // Fastify multipart: parse the request manually.
    const parts = (req as unknown as { parts(): AsyncIterable<unknown> }).parts();
    const fields: Record<string, string> = {};
    let chunkStream: NodeJS.ReadableStream | null = null;

    for await (const part of parts as AsyncIterable<
      | { type: 'file'; fieldname: string; file: NodeJS.ReadableStream; mimetype: string }
      | { type: 'field'; fieldname: string; value: string }
    >) {
      if (part.type === 'field') {
        fields[part.fieldname] = part.value;
      } else if (part.type === 'file' && part.fieldname === 'chunk') {
        chunkStream = part.file;
      } else {
        // Drain unknown file parts to avoid backpressure.
        if (part.type === 'file') {
          part.file.resume();
        }
      }
    }

    if (!chunkStream) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: 'missing chunk file part',
      });
    }

    const parsed = UploadChunkFieldsSchema.parse({
      uploadId: fields['uploadId'],
      documentId: fields['documentId'],
      partNumber: fields['partNumber'] !== undefined ? Number(fields['partNumber']) : undefined,
      totalParts: fields['totalParts'] !== undefined ? Number(fields['totalParts']) : undefined,
      partChecksum: fields['partChecksum'],
    });

    return this.documents.uploadChunk(
      req.user!.tid,
      req.user!.sub,
      parsed,
      chunkStream as unknown as import('node:stream').Readable,
    );
  }

  @Post('upload-complete')
  @Audit({
    category: 'create',
    code: 'document.upload' as AuditEventCode,
    resourceType: 'document',
    // resourceIdParam / documentIdParam omitted — the documentId arrives in
    // the request body, not the URL. The service enriches the audit event
    // with the documentId explicitly.
  })
  @HttpCode(200)
  async uploadComplete(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = UploadCompleteBodySchema.parse(body) as UploadCompleteBody;
    return this.documents.uploadComplete(
      req.user!.tid,
      req.user!.sub,
      parsed,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // -------------------------------------------------------------------------
  // Read endpoints
  // -------------------------------------------------------------------------

  @Get()
  async list(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = DocumentListQuerySchema.parse(query) as DocumentListQuery;
    // `includeDeleted` is admin-only — strip it for non-admins.
    if (!req.user!.roles?.includes('admin')) {
      parsed.includeDeleted = false;
    }
    return this.documents.listDocuments(req.user!.tid, req.user!.sub, parsed);
  }

  @Get(':id')
  @Audit({
    category: 'read',
    code: 'document.read',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.documents.getDocument(req.user!.tid, req.user!.sub, id);
  }

  @Get(':id/download')
  @Audit({
    category: 'download',
    code: 'document.downloaded',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async download(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.documents.downloadDocument(
      req.user!.tid,
      req.user!.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':id/versions')
  async listVersions(
    @Param('id') id: string,
    @Query() query: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = VersionListQuerySchema.parse(query);
    return this.documents.listVersions(req.user!.tid, req.user!.sub, id, parsed);
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  @Post(':id/versions/:versionId/restore')
  @Roles('admin', 'records-manager', 'editor')
  @Audit({
    category: 'update',
    code: 'document.version.restored',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = RestoreVersionBodySchema.parse(body ?? {}) as RestoreVersionBody;
    return this.documents.restoreVersion(
      req.user!.tid,
      req.user!.sub,
      id,
      versionId,
      parsed,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @Roles('admin', 'records-manager', 'editor')
  @Audit({
    category: 'update',
    code: 'document.updated',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = UpdateDocumentBodySchema.parse(body) as UpdateDocumentBody;
    return this.documents.updateDocument(
      req.user!.tid,
      req.user!.sub,
      id,
      parsed,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/lock')
  @Roles('admin', 'records-manager', 'editor')
  @Audit({
    category: 'update',
    code: 'document.checkout',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async lock(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = LockDocumentBodySchema.parse(body ?? {}) as LockDocumentBody;
    return this.documents.lockDocument(
      req.user!.tid,
      req.user!.sub,
      id,
      parsed,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/unlock')
  @Roles('admin', 'records-manager', 'editor')
  @Audit({
    category: 'update',
    code: 'document.checkin',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async unlock(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.documents.unlockDocument(
      req.user!.tid,
      req.user!.sub,
      req.user!.roles ?? [],
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @Roles('admin', 'records-manager')
  @Audit({
    category: 'delete',
    code: 'document.deleted',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.documents.deleteDocument(
      req.user!.tid,
      req.user!.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/share')
  @Roles('admin', 'records-manager', 'editor')
  @Audit({
    category: 'sharing',
    code: 'document.shared',
    resourceType: 'document',
    resourceIdParam: 'id',
    documentIdParam: 'id',
  })
  async share(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = ShareDocumentBodySchema.parse(body) as ShareDocumentBody;
    return this.documents.shareDocument(
      req.user!.tid,
      req.user!.sub,
      id,
      parsed,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ── §9.3 Document comments ──────────────────────────────────────────────

  @Get(':id/comments')
  async listComments(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.documents.listComments(req.user!.tid, id);
  }

  @Post(':id/comments')
  @Audit({ category: 'document', code: 'document.comment.create', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async createComment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { body: string; anchor?: string },
  ) {
    return this.documents.createComment(req.user!.tid, id, req.user!.sub, body.body, body.anchor);
  }

  @Delete(':id/comments/:commentId')
  @Audit({ category: 'document', code: 'document.comment.delete', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    await this.documents.deleteComment(req.user!.tid, id, commentId, req.user!.sub);
    return { ok: true };
  }

  @Post(':id/comments/:commentId/resolve')
  @Audit({ category: 'document', code: 'document.comment.resolve', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async resolveComment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.documents.resolveComment(req.user!.tid, id, commentId, req.user!.sub);
  }

  // ── §9.3 Document tags ───────────────────────────────────────────────────

  @Get(':id/tags')
  async listTags(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.documents.listTags(req.user!.tid, id);
  }

  @Post(':id/tags')
  @Audit({ category: 'document', code: 'document.tag.add', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async addTag(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { tag: string },
  ) {
    return this.documents.addTag(req.user!.tid, id, body.tag);
  }

  @Delete(':id/tags/:tag')
  @Audit({ category: 'document', code: 'document.tag.remove', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async removeTag(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('tag') tag: string,
  ) {
    await this.documents.removeTag(req.user!.tid, id, tag);
    return { ok: true };
  }

  // ── §9.3 Document favorites ──────────────────────────────────────────────

  @Post(':id/favorite')
  @Audit({ category: 'document', code: 'document.favorite.add', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async addFavorite(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.documents.addFavorite(req.user!.tid, id, req.user!.sub);
    return { ok: true };
  }

  @Delete(':id/favorite')
  @Audit({ category: 'document', code: 'document.favorite.remove', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async removeFavorite(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.documents.removeFavorite(req.user!.tid, id, req.user!.sub);
    return { ok: true };
  }

  @Get('favorites/me')
  async listFavorites(@Req() req: AuthenticatedRequest) {
    return this.documents.listFavorites(req.user!.tid, req.user!.sub);
  }

  // ── §9.3 Folder / workspace management ───────────────────────────────────

  @Get('folders')
  async listFolders(@Req() req: AuthenticatedRequest, @Query('parentId') parentId?: string) {
    return this.documents.listFolders(req.user!.tid, parentId);
  }

  @Post('folders')
  @Audit({ category: 'document', code: 'document.folder.create' })
  async createFolder(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; parentId?: string },
  ) {
    return this.documents.createFolder(req.user!.tid, body.name, body.parentId);
  }

  @Patch('folders/:id')
  @Audit({ category: 'document', code: 'document.folder.rename', resourceType: 'folder', resourceIdParam: 'id' })
  async renameFolder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.documents.renameFolder(req.user!.tid, id, body.name);
  }

  @Delete('folders/:id')
  @Audit({ category: 'document', code: 'document.folder.delete', resourceType: 'folder', resourceIdParam: 'id' })
  async deleteFolder(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.documents.deleteFolder(req.user!.tid, id);
    return { ok: true };
  }

  @Post(':id/move')
  @Audit({ category: 'document', code: 'document.move', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async moveDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { targetFolderId: string | null },
  ) {
    return this.documents.moveDocument(req.user!.tid, id, body.targetFolderId);
  }

  // ── §9.3 Declare as record + version compare + batch upload ──────────────

  /**
   * Declare a document as an official record.
   * Spec ref: §9.3 (declare documents as records).
   */
  @Post(':id/declare-record')
  @Audit({ category: 'document', code: 'document.record.declare', resourceType: 'document', resourceIdParam: 'id', documentIdParam: 'id' })
  async declareAsRecord(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.documents.declareAsRecord(req.user!.tid, id, req.user!.sub, body.reason);
  }

  /**
   * Compare two document versions (metadata diff).
   * Spec ref: §9.3 (compare versions where practical), §9.6.
   */
  @Get(':id/versions/:versionId1/compare/:versionId2')
  async compareVersions(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('versionId1') versionId1: string,
    @Param('versionId2') versionId2: string,
  ) {
    return this.documents.compareVersions(req.user!.tid, id, versionId1, versionId2);
  }

  /**
   * Batch upload multiple files.
   * Spec ref: §9.3 (batch ingestion), §9.16 (batch processing).
   */
  @Post('batch-upload')
  @Audit({ category: 'document', code: 'document.batch_upload' })
  async batchUpload(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      files: Array<{ filename: string; contentType: string; size: number; metadata?: Record<string, unknown> }>;
      folderId?: string;
      classificationId?: string;
    },
  ) {
    return this.documents.batchUpload(
      req.user!.tid,
      req.user!.sub,
      body.files,
      { folderId: body.folderId, classificationId: body.classificationId },
    );
  }
}
