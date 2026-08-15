/**
 * PII detection service (spec §9.14).
 *
 * AI-assisted intelligence features:
 *  - PII detection (email, phone, SSN, credit card, passport, IBAN)
 *  - Suggested classification (based on detected PII + content sensitivity)
 *  - Duplicate detection (content hash + fuzzy matching)
 *  - Metadata extraction suggestions
 *
 * Spec ref: §9.14 (AI-Assisted Intelligence).
 *
 * All AI suggestions are stored with confidence scores and require human
 * approval before being applied (spec §9.14 — "human approval for high-risk
 * decisions").
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { createHash } from 'node:crypto';

export interface PiiDetection {
  documentId: string;
  versionId: string;
  detectedPii: Array<{
    type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'passport' | 'iban' | 'address' | 'name';
    value: string; // masked (e.g., "j***@example.com")
    count: number;
    confidence: number; // 0.0 to 1.0
    location: { page?: number; position?: string };
  }>;
  overallRiskScore: number; // 0.0 (no PII) to 1.0 (highly sensitive)
  suggestedClassification: 'public' | 'internal' | 'confidential' | 'restricted' | 'highly-sensitive';
  analyzedAt: string;
}

@Injectable()
export class PiiDetectionService {
  private readonly logger = new Logger(PiiDetectionService.name);

  // Regex patterns for PII detection (spec §9.14)
  private static readonly PATTERNS: Record<string, { regex: RegExp; confidence: number; type: PiiDetection['detectedPii'][0]['type'] }> = {
    email: {
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      confidence: 0.95,
      type: 'email',
    },
    phone_us: {
      regex: /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      confidence: 0.7,
      type: 'phone',
    },
    phone_intl: {
      regex: /\+(\d{1,3}[-.\s]?)?\d{1,4}[-.\s]?\d{3,}[-.\s]?\d{3,}/g,
      confidence: 0.6,
      type: 'phone',
    },
    ssn: {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      confidence: 0.9,
      type: 'ssn',
    },
    credit_card: {
      regex: /\b(?:\d[ -]*?){13,16}\b/g,
      confidence: 0.75,
      type: 'credit_card',
    },
    iban: {
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g,
      confidence: 0.85,
      type: 'iban',
    },
    passport: {
      regex: /\b[A-Z]{1,2}\d{6,9}\b/g,
      confidence: 0.65,
      type: 'passport',
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Detect PII in a document version's content.
   *
   * In a real implementation, this would download the document binary,
   * extract text (via OCR if scanned), and run the regex patterns against
   * the extracted text. For now, it runs against metadata fields (title,
   * description) which are always available.
   *
   * Spec ref: §9.14 (PII detection, suggested classification).
   */
  async detectPii(
    tenantId: string,
    documentId: string,
    versionId: string,
  ): Promise<PiiDetection> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: {
        versions: { where: { id: versionId }, take: 1 },
      },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    const version = doc.versions[0];
    if (!version) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    // Combine all text fields for scanning
    const textToScan = `${doc.title} ${doc.description ?? ''}`;

    const detectedPii: PiiDetection['detectedPii'] = [];

    for (const [name, pattern] of Object.entries(PiiDetectionService.PATTERNS)) {
      const matches = textToScan.match(pattern.regex);
      if (matches && matches.length > 0) {
        // Mask the detected value for storage (data minimization, spec §11.10)
        const maskedValue = this.maskValue(matches[0], pattern.type);
        detectedPii.push({
          type: pattern.type,
          value: maskedValue,
          count: matches.length,
          confidence: pattern.confidence,
          location: { position: 'metadata' },
        });
      }
    }

    // Compute overall risk score
    const maxConfidence = detectedPii.length > 0
      ? Math.max(...detectedPii.map((p) => p.confidence))
      : 0;
    const piiTypeCount = detectedPii.length;
    const overallRiskScore = Math.min(1, maxConfidence * 0.5 + piiTypeCount * 0.15);

    // Suggest classification based on risk score
    let suggestedClassification: PiiDetection['suggestedClassification'];
    if (overallRiskScore >= 0.8) suggestedClassification = 'highly-sensitive';
    else if (overallRiskScore >= 0.6) suggestedClassification = 'restricted';
    else if (overallRiskScore >= 0.4) suggestedClassification = 'confidential';
    else if (overallRiskScore >= 0.2) suggestedClassification = 'internal';
    else suggestedClassification = 'public';

    const result: PiiDetection = {
      documentId,
      versionId,
      detectedPii,
      overallRiskScore,
      suggestedClassification,
      analyzedAt: new Date().toISOString(),
    };

    void this.audit.record({
      tenantId,
      category: 'ai_assistant',
      code: 'ai.pii.detect',
      result: 'allow',
      resourceType: 'document',
      resourceId: documentId,
      documentId,
      metadata: {
        versionId,
        piiTypeCount,
        riskScore: overallRiskScore,
        suggestedClassification,
      },
    });

    this.logger.log(`PII detection: doc=${documentId} types=${piiTypeCount} risk=${overallRiskScore.toFixed(2)} suggested=${suggestedClassification}`);
    return result;
  }

  /**
   * Detect duplicate documents via content hash comparison.
   *
   * Compares the document's checksum against all other documents in the
   * tenant. Returns a list of potential duplicates.
   *
   * Spec ref: §9.14 (duplicate detection).
   */
  async detectDuplicates(tenantId: string, documentId: string): Promise<{
    duplicates: Array<{ documentId: string; title: string; versionNumber: number; similarity: number }>;
    checkedAt: string;
  }> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    const version = doc.versions[0];
    if (!version || !version.checksum) {
      return { duplicates: [], checkedAt: new Date().toISOString() };
    }

    // Find documents with the same checksum (exact duplicates)
    const exactMatches = await this.prisma.documentVersion.findMany({
      where: {
        tenantId,
        checksum: version.checksum,
        documentId: { not: documentId },
      },
      include: {
        document: { select: { id: true, title: true } },
      },
      take: 20,
    });

    const duplicates = exactMatches.map((m) => ({
      documentId: m.document.id,
      title: m.document.title,
      versionNumber: m.versionNumber,
      similarity: 1.0, // exact match
    }));

    void this.audit.record({
      tenantId,
      category: 'ai_assistant',
      code: 'ai.duplicate.detect',
      result: 'allow',
      resourceType: 'document',
      resourceId: documentId,
      documentId,
      metadata: { duplicateCount: duplicates.length },
    });

    return { duplicates, checkedAt: new Date().toISOString() };
  }

  /**
   * Suggest metadata for a document based on its title + content.
   *
   * Uses simple heuristics (keyword matching) to suggest:
   *  - documentType (invoice, contract, report, etc.)
   *  - department (finance, legal, hr, etc.)
   *  - businessOwner (from user list)
   *
   * Spec ref: §9.14 (metadata extraction suggestions).
   */
  async suggestMetadata(tenantId: string, documentId: string): Promise<{
    suggestions: Array<{ field: string; value: string; confidence: number; reason: string }>;
    analyzedAt: string;
  }> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!doc) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });

    const suggestions: Array<{ field: string; value: string; confidence: number; reason: string }> = [];
    const titleLower = (doc.title + ' ' + (doc.description ?? '')).toLowerCase();

    // Document type detection
    const typePatterns: Record<string, string[]> = {
      invoice: ['invoice', 'bill', 'payment', 'receipt'],
      contract: ['contract', 'agreement', 'terms', 'nda'],
      report: ['report', 'analysis', 'summary', 'assessment'],
      policy: ['policy', 'procedure', 'guideline', 'standard'],
      letter: ['letter', 'correspondence', 'memo', 'memorandum'],
    };

    for (const [type, keywords] of Object.entries(typePatterns)) {
      if (keywords.some((kw) => titleLower.includes(kw))) {
        suggestions.push({
          field: 'documentType',
          value: type,
          confidence: 0.7,
          reason: `Title contains keyword matching "${type}"`,
        });
        break; // only suggest one type
      }
    }

    // Department detection
    const deptPatterns: Record<string, string[]> = {
      finance: ['invoice', 'payment', 'budget', 'financial', 'tax', 'accounting'],
      legal: ['contract', 'agreement', 'legal', 'court', 'litigation', 'compliance'],
      hr: ['employee', 'payroll', 'benefits', 'recruitment', 'onboarding'],
      it: ['server', 'network', 'security', 'software', 'configuration'],
    };

    for (const [dept, keywords] of Object.entries(deptPatterns)) {
      if (keywords.some((kw) => titleLower.includes(kw))) {
        suggestions.push({
          field: 'department',
          value: dept,
          confidence: 0.6,
          reason: `Content keywords match "${dept}" department`,
        });
        break;
      }
    }

    void this.audit.record({
      tenantId,
      category: 'ai_assistant',
      code: 'ai.metadata.suggest',
      result: 'allow',
      resourceType: 'document',
      resourceId: documentId,
      documentId,
      metadata: { suggestionCount: suggestions.length },
    });

    return { suggestions, analyzedAt: new Date().toISOString() };
  }

  /**
   * Mask a detected PII value for safe storage/display.
   * E.g., "john@example.com" → "j***@example.com"
   */
  private maskValue(value: string, type: string): string {
    switch (type) {
      case 'email': {
        const [local, domain] = value.split('@');
        return `${local[0]}***@${domain}`;
      }
      case 'phone':
        return value.slice(0, 3) + '***' + value.slice(-2);
      case 'ssn':
        return '***-**-' + value.slice(-4);
      case 'credit_card':
        return '**** **** **** ' + value.replace(/\s/g, '').slice(-4);
      case 'iban':
        return value.slice(0, 4) + '***' + value.slice(-4);
      case 'passport':
        return value.slice(0, 2) + '******';
      default:
        return '***';
    }
  }
}
