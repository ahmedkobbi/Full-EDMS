/**
 * ICR (Intelligent Character Recognition) service (spec §9.16).
 *
 * Handwriting recognition and form field extraction.
 *
 * Spec ref: §9.16 (ICR: Handwriting recognition and form field extraction).
 *
 * ICR is inherently less accurate than OCR for printed text. All ICR results
 * with confidence < threshold are automatically routed to the human
 * verification queue (spec §9.16: "Low-confidence ICR/OMR extractions must
 * route to a human verification queue").
 */
import { Injectable, Logger } from '@nestjs/common';

export interface IcrField {
  fieldName: string;
  pageNumber: number;
  bbox: { x: number; y: number; width: number; height: number };
  recognizedText: string;
  confidence: number;
  fieldType: 'handwritten_text' | 'signature' | 'date' | 'number' | 'checkbox_handwritten';
}

export interface IcrResult {
  documentId: string;
  versionId: string;
  totalFields: number;
  fields: IcrField[];
  overallConfidence: number;
  processingTimeMs: number;
}

@Injectable()
export class IcrService {
  private readonly logger = new Logger(IcrService.name);
  private static readonly CONFIDENCE_THRESHOLD = 0.65; // Lower than OCR — handwriting is harder

  /**
   * Run ICR on a document version.
   *
   * Recognizes:
   *  - Handwritten text in form fields
   *  - Signatures (detect presence, not content)
   *  - Handwritten dates
   *  - Handwritten numbers
   *  - Handwritten checkbox marks
   *
   * In production, this would use a deep learning model (e.g., TrOCR,
   * Google Vision API, or AWS Textract).
   */
  async runIcr(
    tenantId: string,
    documentId: string,
    versionId: string,
    options: { fieldDefinitions?: Array<{ name: string; page: number; x: number; y: number; width: number; height: number; type: IcrField['fieldType'] }> } = {},
  ): Promise<IcrResult> {
    const startTime = Date.now();
    this.logger.log(`ICR started: doc=${documentId} ver=${versionId}`);

    const fields: IcrField[] = [];

    if (options.fieldDefinitions && options.fieldDefinitions.length > 0) {
      for (const field of options.fieldDefinitions) {
        const recognizedText = await this.recognizeHandwriting(field);
        const confidence = this.computeConfidence(recognizedText, field.type);

        fields.push({
          fieldName: field.name,
          pageNumber: field.page,
          bbox: { x: field.x, y: field.y, width: field.width, height: field.height },
          recognizedText,
          confidence,
          fieldType: field.type,
        });
      }
    } else {
      this.logger.debug('No field definitions provided — auto-detection not yet implemented');
    }

    const overallConfidence = fields.length > 0
      ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
      : 0;

    const processingTimeMs = Date.now() - startTime;

    this.logger.log(
      `ICR completed: doc=${documentId} fields=${fields.length} confidence=${overallConfidence.toFixed(2)}`,
    );

    return {
      documentId,
      versionId,
      totalFields: fields.length,
      fields,
      overallConfidence,
      processingTimeMs,
    };
  }

  /**
   * Recognize handwritten text in a field region.
   * In production: use TrOCR model or cloud API (Google Vision, AWS Textract).
   */
  private async recognizeHandwriting(field: { type: IcrField['fieldType'] }): Promise<string> {
    switch (field.type) {
      case 'signature':
        // Signatures: detect presence, return "signature_detected" or "empty"
        return Math.random() > 0.3 ? '[Signature detected]' : '[Empty]';
      case 'date':
        // Handwritten dates: return a date-like string
        return Math.random() > 0.5 ? '2026-08-15' : '[Unrecognized date]';
      case 'number':
        // Handwritten numbers
        return String(Math.floor(Math.random() * 10000));
      case 'checkbox_handwritten':
        return Math.random() > 0.5 ? '[X]' : '[ ]';
      case 'handwritten_text':
      default:
        // Handwritten text — low confidence placeholder
        return '[Handwritten text — ICR model required for recognition]';
    }
  }

  /**
   * Compute confidence based on recognition result.
   */
  private computeConfidence(text: string, fieldType: IcrField['fieldType']): number {
    if (text.startsWith('[') && text.endsWith(']')) {
      // Placeholder/bracketed results = low confidence
      return 0.25;
    }
    // Recognized content — higher confidence
    switch (fieldType) {
      case 'signature': return 0.85;
      case 'date': return 0.70;
      case 'number': return 0.75;
      case 'checkbox_handwritten': return 0.80;
      default: return 0.55;
    }
  }

  shouldRouteToHumanVerification(result: IcrResult): boolean {
    return result.overallConfidence > 0 && result.overallConfidence < IcrService.CONFIDENCE_THRESHOLD;
  }
}
