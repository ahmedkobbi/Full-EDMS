/**
 * OCR service (spec §9.16 — OCR, OMR, ICR).
 *
 * High-accuracy text extraction for printed documents. Supports:
 *   - English, French, Arabic, Russian, Simplified Chinese, German
 *   - Multi-page PDFs (via pdf-parse for embedded text)
 *   - Images (PNG, JPG, TIFF, GIF, WebP) via Tesseract.js (WASM)
 *   - Confidence scoring per word + overall
 *
 * Extraction strategy:
 *   1. Text-based formats (TXT, CSV, JSON, HTML) → direct string extraction (confidence 0.99)
 *   2. PDF with embedded text → pdf-parse extraction (confidence 0.92)
 *   3. PDF without embedded text (scanned) → Tesseract.js OCR (confidence varies)
 *   4. Images → Tesseract.js OCR (confidence varies)
 *
 * Spec ref: §9.16 (OCR: High-accuracy text extraction for printed documents,
 *           including Arabic, French, Russian, Simplified Chinese, German,
 *           and English where supported).
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage.service';
import { HumanVerificationService } from './human-verification.service';
import type { Readable } from 'node:stream';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  words: OcrWord[];
  language: string;
  source: 'embedded' | 'direct' | 'tesseract' | 'fallback';
}

export interface OcrResult {
  documentId: string;
  versionId: string;
  totalPages: number;
  pages: OcrPageResult[];
  overallConfidence: number;
  language: string;
  extractedText: string;
  processingTimeMs: number;
  routedToHumanVerification: boolean;
}

export type OcrLanguage = 'eng' | 'fra' | 'ara' | 'rus' | 'chi_sim' | 'deu';

const LANGUAGE_MAP: Record<string, OcrLanguage> = {
  en: 'eng',
  fr: 'fra',
  ar: 'ara',
  ru: 'rus',
  'zh-CN': 'chi_sim',
  de: 'deu',
};

const OCR_CONFIDENCE_THRESHOLD = 0.70;

const TEXT_MIMES = [
  'text/plain', 'text/csv', 'text/markdown', 'text/html',
  'application/json', 'application/xml',
];

const IMAGE_MIMES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/tiff',
];

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private tesseractWorker: any = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly verification: HumanVerificationService,
  ) {}

  /**
   * Run OCR on a document version.
   *
   * Downloads the binary from object storage, extracts text per page,
   * computes confidence scores, and routes low-confidence results to
   * the human verification queue.
   */
  async runOcr(
    tenantId: string,
    documentId: string,
    versionId: string,
    options: { language?: string; pages?: number[] } = {},
  ): Promise<OcrResult> {
    const startTime = Date.now();
    const language = options.language
      ? LANGUAGE_MAP[options.language] ?? 'eng'
      : 'eng';

    this.logger.log(`OCR started: doc=${documentId} ver=${versionId} lang=${language}`);

    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, tenantId },
    });
    if (!version) throw new Error(`Version ${versionId} not found`);

    const { stream } = await this.storage.download(version.storageKey);
    const buffer = await this.streamToBuffer(stream);

    const totalPages = await this.getPageCount(buffer, version.mime);
    const pagesToProcess = options.pages ?? Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: OcrPageResult[] = [];
    for (const pageNum of pagesToProcess) {
      const pageResult = await this.processPage(buffer, pageNum, language, version.mime);
      pages.push(pageResult);
    }

    const overallConfidence = pages.length > 0
      ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length
      : 0;

    const extractedText = pages.map((p) => p.text).join('\n\n--- Page Break ---\n\n');
    const processingTimeMs = Date.now() - startTime;

    // Route to human verification if confidence is below threshold
    let routedToHumanVerification = false;
    if (overallConfidence < OCR_CONFIDENCE_THRESHOLD && overallConfidence > 0) {
      routedToHumanVerification = true;
      await this.verification.enqueue({
        tenantId,
        documentId,
        versionId,
        scannerJobId: 'direct-ocr',
        type: 'ocr',
        pageNumber: 1,
        extractedValue: extractedText.slice(0, 500),
        confidence: overallConfidence,
      });
      this.logger.warn(
        `OCR routed to human verification: doc=${documentId} confidence=${overallConfidence.toFixed(2)} < ${OCR_CONFIDENCE_THRESHOLD}`,
      );
    }

    this.logger.log(
      `OCR completed: doc=${documentId} pages=${pages.length} confidence=${overallConfidence.toFixed(2)} ` +
      `time=${processingTimeMs}ms routed=${routedToHumanVerification}`,
    );

    return {
      documentId,
      versionId,
      totalPages,
      pages,
      overallConfidence,
      language,
      extractedText,
      processingTimeMs,
      routedToHumanVerification,
    };
  }

  /**
   * Process a single page — routes to the correct extraction method.
   */
  private async processPage(
    buffer: Buffer,
    pageNumber: number,
    language: OcrLanguage,
    mime: string,
  ): Promise<OcrPageResult> {
    // 1. Text-based formats → direct extraction
    if (TEXT_MIMES.some((m) => mime.includes(m))) {
      return this.extractFromText(buffer, pageNumber, language, mime);
    }

    // 2. PDF → try embedded text, fall back to Tesseract
    if (mime.includes('pdf')) {
      const embedded = await this.extractFromPdf(buffer, pageNumber, language);
      if (embedded) return embedded;
      // Scanned PDF → fall through to Tesseract
    }

    // 3. Images + scanned PDFs → Tesseract.js OCR
    if (IMAGE_MIMES.some((m) => mime.includes(m)) || mime.includes('pdf')) {
      return await this.extractWithTesseract(buffer, pageNumber, language);
    }

    // 4. Unknown format → fallback
    return {
      pageNumber,
      text: `[Unsupported format: ${mime}]`,
      confidence: 0,
      words: [],
      language,
      source: 'fallback',
    };
  }

  /**
   * Extract text from text-based files (TXT, CSV, JSON, HTML, XML).
   * High confidence (0.99) — the text is already digital.
   */
  private async extractFromText(
    buffer: Buffer,
    pageNumber: number,
    language: OcrLanguage,
    mime: string,
  ): Promise<OcrPageResult> {
    let text = buffer.toString('utf-8');

    // Strip HTML tags
    if (mime.includes('html')) {
      text = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const words: OcrWord[] = text.split(/\s+/).filter(Boolean).map((word) => ({
      text: word,
      confidence: 0.99,
    }));

    return {
      pageNumber,
      text,
      confidence: 0.99,
      words,
      language,
      source: 'direct',
    };
  }

  /**
   * Extract embedded text from PDF using pdf-parse.
   * Returns null if the PDF has no embedded text (scanned PDF).
   */
  private async extractFromPdf(
    buffer: Buffer,
    pageNumber: number,
    language: OcrLanguage,
  ): Promise<OcrPageResult | null> {
    try {
      // Dynamic import so pdf-parse is optional at startup
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);

      if (!data.text || data.text.trim().length < 10) {
        return null; // No embedded text → scanned PDF
      }

      // pdf-parse returns all pages concatenated; split by form feed
      const allPages = data.text.split('\f');
      const pageText = allPages[pageNumber - 1] ?? data.text;

      if (!pageText.trim()) return null;

      const words: OcrWord[] = pageText.split(/\s+/).filter(Boolean).map((word) => ({
        text: word,
        confidence: 0.92,
      }));

      return {
        pageNumber,
        text: pageText.trim(),
        confidence: 0.92,
        words,
        language,
        source: 'embedded',
      };
    } catch (err) {
      this.logger.warn(`pdf-parse failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Run Tesseract.js OCR on an image buffer.
   *
   * Tesseract.js is a WASM port of Tesseract OCR. It runs entirely in
   * Node.js — no external API calls needed (important for air-gapped
   * deployments, spec §4.2).
   *
   * Supported languages: eng, fra, ara, rus, chi_sim, deu
   */
  private async extractWithTesseract(
    buffer: Buffer,
    pageNumber: number,
    language: OcrLanguage,
  ): Promise<OcrPageResult> {
    try {
      // Dynamic import so tesseract.js is optional at startup
      const { createWorker } = await import('tesseract.js');

      // Reuse worker across calls (performance — worker loads ~2s on first call)
      if (!this.tesseractWorker) {
        this.tesseractWorker = await createWorker(language, 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              this.logger.debug(`Tesseract progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          },
        });
        this.logger.log(`Tesseract worker initialized (language=${language})`);
      }

      const { data } = await this.tesseractWorker.recognize(buffer);

      const words: OcrWord[] = (data.words || []).map((w: any) => ({
        text: w.text,
        confidence: (w.confidence || 0) / 100,
        bbox: w.bbox ? {
          x: w.bbox.x0,
          y: w.bbox.y0,
          width: w.bbox.x1 - w.bbox.x0,
          height: w.bbox.y1 - w.bbox.y0,
        } : undefined,
      }));

      const confidence = (data.confidence || 0) / 100;

      return {
        pageNumber,
        text: data.text.trim(),
        confidence,
        words: words.length > 0 ? words : [{ text: data.text, confidence }],
        language,
        source: 'tesseract',
      };
    } catch (err) {
      this.logger.error(`Tesseract OCR failed: ${(err as Error).message}`);

      // Return a low-confidence fallback so the result routes to human verification
      return {
        pageNumber,
        text: `[OCR failed: ${(err as Error).message}]`,
        confidence: 0.1,
        words: [],
        language,
        source: 'fallback',
      };
    }
  }

  /**
   * Get page count for a document.
   */
  private async getPageCount(buffer: Buffer, mime: string): Promise<number> {
    if (mime.includes('pdf')) {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        return data.numpages || 1;
      } catch {
        return 1;
      }
    }
    return 1;
  }

  /**
   * Convert a readable stream to a Buffer.
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Check if an OCR result should be routed to human verification.
   */
  shouldRouteToHumanVerification(result: OcrResult): boolean {
    return result.overallConfidence < OCR_CONFIDENCE_THRESHOLD;
  }

  /**
   * Get the confidence threshold for human verification routing.
   */
  getConfidenceThreshold(): number {
    return OCR_CONFIDENCE_THRESHOLD;
  }

  /**
   * Cleanup Tesseract worker on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
      this.logger.log('Tesseract worker terminated');
    }
  }
}
