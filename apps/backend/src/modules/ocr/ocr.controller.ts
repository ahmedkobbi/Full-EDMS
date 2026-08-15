/**
 * OCR controller (spec §9.16).
 *
 * Endpoints:
 *   POST /v1/ocr/run                    — run OCR on a document version
 *   POST /v1/omr/run                    — run OMR on a document version
 *   POST /v1/icr/run                    — run ICR on a document version
 *   POST /v1/barcode/detect             — detect barcodes/QR codes
 *   GET  /v1/human-verification         — list pending verification items
 *   GET  /v1/human-verification/:id     — get a verification item
 *   POST /v1/human-verification/:id/approve   — approve extraction
 *   POST /v1/human-verification/:id/correct   — correct extraction
 *   POST /v1/human-verification/:id/reject    — reject extraction
 *   GET  /v1/human-verification/stats         — get queue statistics
 */
import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { OcrService } from './ocr.service.js';
import { OmrService } from './omr.service.js';
import { IcrService } from './icr.service.js';
import { BarcodeService } from './barcode.service.js';
import { HumanVerificationService } from './human-verification.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1')
export class OcrController {
  constructor(
    private readonly ocr: OcrService,
    private readonly omr: OmrService,
    private readonly icr: IcrService,
    private readonly barcode: BarcodeService,
    private readonly verification: HumanVerificationService,
  ) {}

  // ── OCR ───────────────────────────────────────────────────────────────────

  @Audit({ category: 'scanner', code: 'scanner.ocr.run' })
  @Post('ocr/run')
  async runOcr(
    @Req() req: AuthenticatedRequest,
    @Body() body: { documentId: string; versionId: string; language?: string; pages?: number[] },
  ) {
    return this.ocr.runOcr(req.user!.tid, body.documentId, body.versionId, {
      language: body.language,
      pages: body.pages,
    });
  }

  // ── OMR ───────────────────────────────────────────────────────────────────

  @Audit({ category: 'scanner', code: 'scanner.omr.run' })
  @Post('omr/run')
  async runOmr(
    @Req() req: AuthenticatedRequest,
    @Body() body: { documentId: string; versionId: string; fieldDefinitions?: Array<{ name: string; page: number; x: number; y: number; width: number; height: number }> },
  ) {
    return this.omr.runOmr(req.user!.tid, body.documentId, body.versionId, {
      fieldDefinitions: body.fieldDefinitions,
    });
  }

  // ── ICR ───────────────────────────────────────────────────────────────────

  @Audit({ category: 'scanner', code: 'scanner.icr.run' })
  @Post('icr/run')
  async runIcr(
    @Req() req: AuthenticatedRequest,
    @Body() body: { documentId: string; versionId: string; fieldDefinitions?: Array<{ name: string; page: number; x: number; y: number; width: number; height: number; type: 'handwritten_text' | 'signature' | 'date' | 'number' | 'checkbox_handwritten' }> },
  ) {
    return this.icr.runIcr(req.user!.tid, body.documentId, body.versionId, {
      fieldDefinitions: body.fieldDefinitions,
    });
  }

  // ── Barcode ───────────────────────────────────────────────────────────────

  @Audit({ category: 'scanner', code: 'scanner.barcode.detect' })
  @Post('barcode/detect')
  async detectBarcodes(
    @Req() req: AuthenticatedRequest,
    @Body() body: { documentId: string; versionId: string },
  ) {
    return this.barcode.detectBarcodes(req.user!.tid, body.documentId, body.versionId);
  }

  // ── Human Verification Queue ──────────────────────────────────────────────

  @Get('human-verification')
  async listPending(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('type') type?: 'ocr' | 'omr' | 'icr',
  ) {
    return this.verification.listPending(
      req.user!.tid,
      limit ? parseInt(limit, 10) : 50,
      type,
    );
  }

  @Get('human-verification/stats')
  async getStats(@Req() req: AuthenticatedRequest) {
    return this.verification.getStats(req.user!.tid);
  }

  @Get('human-verification/:id')
  async getById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.verification.getById(req.user!.tid, id);
  }

  @Audit({ category: 'scanner', code: 'scanner.verification.approve' })
  @Post('human-verification/:id/approve')
  async approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.verification.approve(req.user!.tid, id, req.user!.sub);
    return { ok: true };
  }

  @Audit({ category: 'scanner', code: 'scanner.verification.correct' })
  @Post('human-verification/:id/correct')
  async correct(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { correctedValue: string },
  ) {
    await this.verification.correct(req.user!.tid, id, req.user!.sub, body.correctedValue);
    return { ok: true };
  }

  @Audit({ category: 'scanner', code: 'scanner.verification.reject' })
  @Post('human-verification/:id/reject')
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    await this.verification.reject(req.user!.tid, id, req.user!.sub, body.reason);
    return { ok: true };
  }
}
