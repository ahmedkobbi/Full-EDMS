import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { MetadataService } from './metadata.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/metadata')
export class MetadataController {
  constructor(private readonly metadata: MetadataService) {}

  @Get('schemas')
  listSchemas(@Req() req: AuthenticatedRequest) {
    return this.metadata.listSchemas(req.user!.tid);
  }

  @Get('schemas/:id')
  getSchema(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.metadata.getSchema(req.user!.tid, id);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'metadata.schema.create' })
  @Post('schemas')
  createSchema(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.metadata.createSchema(req.user!.tid, body);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'metadata.schema.update', resourceType: 'metadata_schema', resourceIdParam: 'id' })
  @Patch('schemas/:id')
  updateSchema(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.metadata.updateSchema(req.user!.tid, id, body);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'metadata.schema.delete', resourceType: 'metadata_schema', resourceIdParam: 'id' })
  @Delete('schemas/:id')
  async deleteSchema(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.metadata.deleteSchema(req.user!.tid, id);
    return { ok: true };
  }

  // ── Document metadata values ─────────────────────────────────────────────

  @Get('documents/:documentId')
  getDocumentMetadata(@Req() req: AuthenticatedRequest, @Param('documentId') documentId: string) {
    return this.metadata.getDocumentMetadata(req.user!.tid, documentId);
  }

  @Audit({ category: 'document', code: 'document.metadata.set', documentIdParam: 'documentId' })
  @Post('documents/:documentId/:fieldCode')
  setMetadataValue(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
    @Param('fieldCode') fieldCode: string,
    @Body() body: { value: unknown },
  ) {
    return this.metadata.setMetadataValue(req.user!.tid, documentId, fieldCode, body.value);
  }

  @Audit({ category: 'document', code: 'document.metadata.remove', documentIdParam: 'documentId' })
  @Delete('documents/:documentId/:fieldCode')
  async removeMetadataValue(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
    @Param('fieldCode') fieldCode: string,
  ) {
    await this.metadata.removeMetadataValue(req.user!.tid, documentId, fieldCode);
    return { ok: true };
  }
}
