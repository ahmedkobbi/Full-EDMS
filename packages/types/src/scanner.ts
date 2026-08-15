/**
 * @smart-edms/types — document digitization and capture (spec §9.16)
 *
 * Purpose: model scanner profiles, scan devices, jobs, batches, capture
 * rules, OCR/OMR/ICR results, and confidence-driven routing to the human
 * verification queue.
 *
 * Phase 1 supports browser/Electron file upload; Phase 2 adds TWAIN, WIA,
 * ISIS, network scanners, and a local scanning agent (spec §9.16).
 */

import type { ConfidenceScore, ISODateString, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId } from './document';

/** Branded scanner-profile identifier. */
export type ScannerProfileId = UUID & { readonly __scannerProfile: 'ScannerProfileId' };

/** Branded scanner-job identifier. */
export type ScannerJobId = UUID & { readonly __scannerJob: 'ScannerJobId' };

/** Branded digitization-batch identifier. */
export type DigitizationBatchId = UUID & { readonly __digitizationBatch: 'DigitizationBatchId' };

/** Branded capture-rule identifier. */
export type CaptureRuleId = UUID & { readonly __captureRule: 'CaptureRuleId' };

/** Branded scan-device identifier. */
export type ScanDeviceId = UUID & { readonly __scanDevice: 'ScanDeviceId' };

/**
 * Scanner driver / protocol kind (spec §9.16 Phase 2).
 * `upload` covers the Phase 1 browser/Electron file-upload path.
 */
export type ScanDriverKind =
  | 'upload'
  | 'twain'
  | 'wia'
  | 'isis'
  | 'network'
  | 'local_agent';

/** Status of a scanner job. */
export type ScanStatus =
  | 'queued'
  | 'acquiring'
  | 'processing'
  | 'ocr_pending'
  | 'review_pending'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Colour mode for acquisition. */
export type ScanColorMode = 'color' | 'grayscale' | 'bitonal';

/** Duplex mode. */
export type ScanDuplexMode = 'simplex' | 'duplex';

/**
 * Scan device record (spec §9.16 Phase 2). Represents a hardware scanner
 * or a local scanning agent.
 */
export interface ScanDevice {
  readonly id: ScanDeviceId;
  readonly tenantId: TenantId;
  readonly displayName: string;
  readonly driver: ScanDriverKind;
  /** Device-specific address (USB id, IP, agent id). */
  readonly address: string;
  readonly manufacturer: string | null;
  readonly model: string | null;
  /** Whether the device is currently online and reachable. */
  readonly online: boolean;
  readonly lastSeenAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Scanner profile. Reusable acquisition settings bound to a device.
 */
export interface ScannerProfile {
  readonly id: ScannerProfileId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly deviceId: ScanDeviceId | null;
  readonly driver: ScanDriverKind;
  readonly dpi: number;
  readonly colorMode: ScanColorMode;
  readonly duplex: ScanDuplexMode;
  /** Paper size, e.g. `A4`, `Letter`, `Legal`. */
  readonly paperSize: string;
  /** Whether to deskew pages after acquisition. */
  readonly deskew: boolean;
  /** Whether to remove blank pages. */
  readonly removeBlankPages: boolean;
  /** Default document type id for ingested documents. */
  readonly defaultDocumentTypeId: UUID | null;
  /** Default OCR language tags. */
  readonly ocrLanguages: readonly string[];
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Capture rule (spec §9.16). Automated splitting, sorting, and metadata
 * tagging based on OMR, ICR, Barcode, or QR triggers.
 */
export interface CaptureRule {
  readonly id: CaptureRuleId;
  readonly tenantId: TenantId;
  readonly name: string;
  /** Trigger kind for the rule. */
  readonly trigger:
    | { readonly kind: 'barcode'; readonly symbology: string; readonly pattern: string }
    | { readonly kind: 'qr'; readonly pattern: string }
    | { readonly kind: 'omr'; readonly fieldKey: string }
    | { readonly kind: 'icr'; readonly fieldKey: string }
    | { readonly kind: 'page_count'; readonly value: number };
  /** Action to take when the trigger matches. */
  readonly action:
    | { readonly kind: 'split' }
    | { readonly kind: 'assign_document_type'; readonly documentTypeId: UUID }
    | { readonly kind: 'assign_metadata'; readonly fieldKey: string; readonly valueKey: string }
    | { readonly kind: 'route_to_queue'; readonly queueCode: string };
  readonly priority: number;
  readonly enabled: boolean;
}

/**
 * Scanner job. Per spec §9.16 backend rules, scanning ingestion must be
 * asynchronous and batch jobs must be resumable.
 */
export interface ScannerJob {
  readonly id: ScannerJobId;
  readonly tenantId: TenantId;
  readonly batchId: DigitizationBatchId | null;
  readonly profileId: ScannerProfileId | null;
  readonly deviceId: ScanDeviceId | null;
  readonly status: ScanStatus;
  readonly initiatedBy: UserId;
  /** Number of pages acquired. */
  readonly pagesAcquired: number;
  /** Number of pages successfully processed. */
  readonly pagesProcessed: number;
  /** Number of pages routed to human verification. */
  readonly pagesForReview: number;
  /** Localised failure-reason key, when failed. */
  readonly failureReasonKey: string | null;
  /** Whether the job is resumable after interruption. */
  readonly resumable: boolean;
  readonly startedAt: ISODateString;
  readonly completedAt: ISODateString | null;
  readonly updatedAt: ISODateString;
}

/**
 * Digitization batch (spec §9.16). Groups multiple scanner jobs and the
 * resulting documents.
 */
export interface DigitizationBatch {
  readonly id: DigitizationBatchId;
  readonly tenantId: TenantId;
  readonly name: string;
  /** Documents produced from this batch. */
  readonly documentIds: readonly DocumentId[];
  readonly status: 'open' | 'closed' | 'archived';
  readonly createdBy: UserId;
  readonly createdAt: ISODateString;
  readonly closedAt: ISODateString | null;
}

/**
 * OCR result for a single page (spec §9.16). High-accuracy text extraction
 * including Arabic, French, Russian, Simplified Chinese, German, English.
 */
export interface OcrResult {
  readonly pageId: UUID;
  readonly text: string;
  /** Confidence score in [1,100]. */
  readonly confidence: ConfidenceScore;
  /** Detected language tags. */
  readonly languages: readonly string[];
  /** Bounding-box-level word results, when available. */
  readonly words: ReadonlyArray<{
    readonly text: string;
    readonly confidence: ConfidenceScore;
    readonly boundingBox: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  }>;
  readonly computedAt: ISODateString;
}

/**
 * OMR result for a single page (spec §9.16). Captures checkboxes, bubbles,
 * and marks from surveys, forms, and ballots.
 */
export interface OmrResult {
  readonly pageId: UUID;
  /** Per-field mark state. */
  readonly fields: ReadonlyArray<{
    readonly fieldKey: string;
    readonly marked: boolean;
    readonly confidence: ConfidenceScore;
  }>;
  readonly computedAt: ISODateString;
}

/**
 * ICR result for a single page (spec §9.16). Handwriting recognition and
 * form-field extraction. Low-confidence results route to a human queue.
 */
export interface IcrResult {
  readonly pageId: UUID;
  /** Per-field handwriting recognition results. */
  readonly fields: ReadonlyArray<{
    readonly fieldKey: string;
    readonly value: string;
    readonly confidence: ConfidenceScore;
    /** Whether this field was routed to the human verification queue. */
    readonly routedToReview: boolean;
  }>;
  readonly computedAt: ISODateString;
}

/**
 * Human verification queue item (spec §9.16). Low-confidence OCR/OMR/ICR
 * extractions are routed here for human review.
 */
export interface HumanVerificationItem {
  readonly id: UUID;
  readonly tenantId: TenantId;
  readonly jobId: ScannerJobId;
  readonly pageId: UUID;
  readonly kind: 'ocr' | 'omr' | 'icr';
  readonly fieldKey: string | null;
  readonly machineValue: string;
  readonly confidence: ConfidenceScore;
  /** Resolved value, when the human reviewer has acted. */
  readonly resolvedValue: string | null;
  /** Reviewer user id, when resolved. */
  readonly reviewedBy: UserId | null;
  readonly reviewedAt: ISODateString | null;
  readonly status: 'pending' | 'approved' | 'corrected' | 'rejected';
  readonly createdAt: ISODateString;
}
