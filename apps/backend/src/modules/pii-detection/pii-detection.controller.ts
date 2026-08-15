/**
 * PII detection + AI intelligence controller (spec §9.14).
 *
 * Endpoints:
 *   POST /v1/ai-intelligence/:documentId/versions/:versionId/pii-detect
 *   POST /v1/ai-intelligence/:documentId/duplicate-detect
 *   POST /v1/ai-intelligence/:documentId/suggest-metadata
 */
import { Controller, Param, Post, Req } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { PiiDetectionService } from './pii-detection.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/ai-intelligence')
export class PiiDetectionController {
  constructor(private readonly pii: PiiDetectionService) {}

  @Post(':documentId/versions/:versionId/pii-detect')
  @Audit({ category: 'ai_assistant', code: 'ai.pii.detect', documentIdParam: 'documentId' })
  async detectPii(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.pii.detectPii(req.user!.tid, documentId, versionId);
  }

  @Post(':documentId/duplicate-detect')
  @Audit({ category: 'ai_assistant', code: 'ai.duplicate.detect', documentIdParam: 'documentId' })
  async detectDuplicates(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ) {
    return this.pii.detectDuplicates(req.user!.tid, documentId);
  }

  @Post(':documentId/suggest-metadata')
  @Audit({ category: 'ai_assistant', code: 'ai.metadata.suggest', documentIdParam: 'documentId' })
  async suggestMetadata(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ) {
    return this.pii.suggestMetadata(req.user!.tid, documentId);
  }
}
