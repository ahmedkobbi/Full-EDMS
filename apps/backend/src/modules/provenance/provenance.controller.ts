/**
 * Provenance controller (spec §9.12).
 *
 * Endpoints:
 *   POST /v1/provenance/custody               add chain of custody entry
 *   GET  /v1/provenance/custody/:documentId   get full chain of custody
 *   GET  /v1/provenance/custody/:documentId/verify  verify hash chain
 *   POST /v1/provenance/c2pa/verify           verify C2PA manifest
 *   POST /v1/provenance/forgery/:documentId/versions/:versionId/detect  run forgery detection
 *   POST /v1/provenance/evidence/:documentId/generate  generate evidence package
 *   GET  /v1/provenance/evidence/:jobId/status           get evidence package status
 */
import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { ProvenanceService } from './provenance.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/provenance')
export class ProvenanceController {
  constructor(private readonly provenance: ProvenanceService) {}

  // ── Chain of Custody ──────────────────────────────────────────────────────

  @Post('custody')
  @Audit({ category: 'provenance', code: 'provenance.custody.entry' })
  async addCustodyEntry(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.provenance.addCustodyEntry(req.user!.tid, body);
  }

  @Get('custody/:documentId')
  async getChainOfCustody(@Req() req: AuthenticatedRequest, @Param('documentId') documentId: string) {
    return this.provenance.getChainOfCustody(req.user!.tid, documentId);
  }

  @Get('custody/:documentId/verify')
  async verifyChainOfCustody(@Req() req: AuthenticatedRequest, @Param('documentId') documentId: string) {
    return this.provenance.verifyChainOfCustody(req.user!.tid, documentId);
  }

  // ── C2PA ──────────────────────────────────────────────────────────────────

  @Post('c2pa/verify')
  @Audit({ category: 'provenance', code: 'provenance.c2pa.verify' })
  async verifyC2PA(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.provenance.verifyC2PA(req.user!.tid, body);
  }

  // ── Forgery Detection ─────────────────────────────────────────────────────

  @Post('forgery/:documentId/versions/:versionId/detect')
  @Audit({ category: 'provenance', code: 'provenance.forgery.detect' })
  async detectForgery(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.provenance.detectForgery(req.user!.tid, documentId, versionId);
  }

  // ── Evidence Package ──────────────────────────────────────────────────────

  @Post('evidence/:documentId/generate')
  @Audit({ category: 'provenance', code: 'provenance.evidence.generate' })
  async generateEvidencePackage(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ) {
    return this.provenance.generateEvidencePackage(req.user!.tid, documentId, req.user!.sub);
  }

  @Get('evidence/:jobId/status')
  async getEvidencePackageStatus(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
  ) {
    return this.provenance.getEvidencePackageStatus(req.user!.tid, jobId);
  }
}
