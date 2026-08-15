/**
 * Secure viewer controller (spec §9.9).
 *
 * Endpoints:
 *   POST /v1/documents/:id/preview-token     issue short-lived preview token
 *   GET  /v1/preview/:token                   get signed URL + watermark + classification
 *   DELETE /v1/preview/:token                 revoke preview token
 *   POST /v1/documents/:id/versions/:versionId/redactions  create redaction regions
 *   POST /v1/redactions/:redactionId/export   export redacted derivative (async)
 */
import { Body, Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Audit } from '../../common/decorators/audit.decorator';
import { SecureViewerService } from './secure-viewer.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1')
export class SecureViewerController {
  constructor(private readonly viewer: SecureViewerService) {}

  /**
   * Issue a short-lived preview token for viewing a document.
   * Spec ref: §9.9 (secure viewer tokens must be short-lived).
   */
  @Post('documents/:id/preview-token')
  @Audit({ category: 'document', code: 'document.preview', documentIdParam: 'id' })
  async issuePreviewToken(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { versionId?: string; noDownload?: boolean },
  ) {
    return this.viewer.issuePreviewToken(
      req.user!.tid,
      req.user!.sub,
      req.user!.email,
      id,
      body,
    );
  }

  /**
   * Validate a preview token and get the signed download URL.
   * Returns watermark text + classification banner for client-side overlay.
   */
  @Get('preview/:token')
  async getPreviewUrl(@Param('token') token: string, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.viewer.getPreviewUrl(token);
    // Set security headers on the response
    for (const [key, value] of Object.entries(result.headers)) {
      reply.header(key, value);
    }
    return {
      url: result.url,
      watermark: result.watermark,
      classification: result.classification,
    };
  }

  /**
   * Revoke a preview token (user navigated away from viewer).
   */
  @Delete('preview/:token')
  async revokePreviewToken(@Param('token') token: string) {
    await this.viewer.revokePreviewToken(token);
    return { ok: true };
  }

  /**
   * Create redaction regions on a document version.
   * Spec ref: §9.9 (redaction mode, redaction preview).
   */
  @Post('documents/:id/versions/:versionId/redactions')
  @Audit({ category: 'document', code: 'document.redaction.create', documentIdParam: 'id' })
  async createRedactions(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: unknown,
  ) {
    return this.viewer.createRedactions(req.user!.tid, req.user!.sub, id, versionId, body);
  }

  /**
   * Export a redacted derivative (async — creates new version with redactions applied).
   * Spec ref: §9.9 (export of redacted derivative, original preservation).
   */
  @Post('redactions/:redactionId/export')
  @Audit({ category: 'document', code: 'document.redaction.export' })
  async exportRedactedDerivative(
    @Req() req: AuthenticatedRequest,
    @Param('redactionId') redactionId: string,
  ) {
    return this.viewer.exportRedactedDerivative(req.user!.tid, req.user!.sub, redactionId);
  }
}
