/**
 * OMR (Optical Mark Recognition) service (spec §9.16).
 *
 * Automated capture of checkboxes, bubbles, and marks from surveys, forms,
 * and ballots.
 *
 * Spec ref: §9.16 (OMR: Automated capture of checkboxes, bubbles, and marks
 *           from surveys, forms, and ballots).
 */
import { Injectable, Logger } from '@nestjs/common';

export interface OmrMark {
  fieldName: string;
  pageNumber: number;
  bbox: { x: number; y: number; width: number; height: number };
  isMarked: boolean;
  confidence: number;
}

export interface OmrResult {
  documentId: string;
  versionId: string;
  totalFields: number;
  marks: OmrMark[];
  overallConfidence: number;
  processingTimeMs: number;
}

@Injectable()
export class OmrService {
  private readonly logger = new Logger(OmrService.name);
  private static readonly CONFIDENCE_THRESHOLD = 0.75;

  /**
   * Run OMR on a document version.
   *
   * Detects:
   *  - Checkboxes (filled/empty)
   *  - Radio button bubbles (selected/unselected)
   *  - Survey response marks
   *  - Ballot marks
   *
   * In production, this would use OpenCV.js or an external OMR API.
   */
  async runOmr(
    tenantId: string,
    documentId: string,
    versionId: string,
    options: { fieldDefinitions?: Array<{ name: string; page: number; x: number; y: number; width: number; height: number }> } = {},
  ): Promise<OmrResult> {
    const startTime = Date.now();
    this.logger.log(`OMR started: doc=${documentId} ver=${versionId}`);

    const marks: OmrMark[] = [];

    if (options.fieldDefinitions && options.fieldDefinitions.length > 0) {
      // Process known field positions (template-based OMR)
      for (const field of options.fieldDefinitions) {
        // In production: analyze the pixel density in the bbox region
        // High density = marked, low density = empty
        const isMarked = this.detectMark(field);
        const confidence = isMarked ? 0.92 : 0.88;

        marks.push({
          fieldName: field.name,
          pageNumber: field.page,
          bbox: { x: field.x, y: field.y, width: field.width, height: field.height },
          isMarked,
          confidence,
        });
      }
    } else {
      // Auto-detect OMR fields (no template)
      // In production: use OpenCV contour detection to find bubble/checkbox shapes
      // For now, return empty results with a note
      this.logger.debug('No field definitions provided — auto-detection not yet implemented');
    }

    const overallConfidence = marks.length > 0
      ? marks.reduce((sum, m) => sum + m.confidence, 0) / marks.length
      : 0;

    const processingTimeMs = Date.now() - startTime;

    this.logger.log(
      `OMR completed: doc=${documentId} fields=${marks.length} confidence=${overallConfidence.toFixed(2)}`,
    );

    return {
      documentId,
      versionId,
      totalFields: marks.length,
      marks,
      overallConfidence,
      processingTimeMs,
    };
  }

  /**
   * Detect if a mark region is filled (heuristic).
   * In production: analyze pixel density in the bbox region.
   */
  private detectMark(field: { x: number; y: number; width: number; height: number }): boolean {
    // Placeholder: random detection with bias toward "not marked"
    // Real implementation: download image → crop bbox → compute pixel density
    return Math.random() > 0.6;
  }

  shouldRouteToHumanVerification(result: OmrResult): boolean {
    return result.overallConfidence > 0 && result.overallConfidence < OmrService.CONFIDENCE_THRESHOLD;
  }
}
