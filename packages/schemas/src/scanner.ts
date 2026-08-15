/**
 * @smart-edms/schemas — document digitization & capture (spec §9.16)
 *
 * Zod schemas for: profile create, job create, batch create, capture rule.
 */

import { z } from 'zod';
import type {
  CaptureRuleId,
  DigitizationBatchId,
  ScanDeviceId,
  ScannerJobId,
  ScannerProfileId,
} from '@smart-edms/types';
import {
  ConfidenceScoreSchema,
  IsoDateStringSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { DocumentIdSchema } from './document';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const ScannerProfileIdSchema = UuidSchema.transform(
  (v): ScannerProfileId => v as ScannerProfileId,
);
export const ScannerJobIdSchema = UuidSchema.transform(
  (v): ScannerJobId => v as ScannerJobId,
);
export const DigitizationBatchIdSchema = UuidSchema.transform(
  (v): DigitizationBatchId => v as DigitizationBatchId,
);
export const CaptureRuleIdSchema = UuidSchema.transform(
  (v): CaptureRuleId => v as CaptureRuleId,
);
export const ScanDeviceIdSchema = UuidSchema.transform(
  (v): ScanDeviceId => v as ScanDeviceId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `ScanDriverKind`. */
export const ScanDriverKindSchema = z.enum([
  'upload',
  'twain',
  'wia',
  'isis',
  'network',
  'local_agent',
]);

/** `z.infer` === `ScanStatus`. */
export const ScanStatusSchema = z.enum([
  'queued',
  'acquiring',
  'processing',
  'ocr_pending',
  'review_pending',
  'completed',
  'failed',
  'cancelled',
]);

/** `z.infer` === `ScanColorMode`. */
export const ScanColorModeSchema = z.enum(['color', 'grayscale', 'bitonal']);

/** `z.infer` === `ScanDuplexMode`. */
export const ScanDuplexModeSchema = z.enum(['simplex', 'duplex']);

// ---------------------------------------------------------------------------
// Device + Profile
// ---------------------------------------------------------------------------

/** `z.infer` matches `ScanDevice`. */
export const ScanDeviceSchema = z
  .object({
    id: ScanDeviceIdSchema,
    tenantId: TenantIdSchema,
    displayName: z.string().min(1).max(200),
    driver: ScanDriverKindSchema,
    address: z.string().min(1).max(256),
    manufacturer: z.string().min(1).max(128).nullable(),
    model: z.string().min(1).max(128).nullable(),
    online: z.boolean(),
    lastSeenAt: IsoDateStringSchema.nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `ScannerProfile`. */
export const ScannerProfileSchema = z
  .object({
    id: ScannerProfileIdSchema,
    tenantId: TenantIdSchema,
    name: z.string().min(1).max(200),
    deviceId: ScanDeviceIdSchema.nullable(),
    driver: ScanDriverKindSchema,
    dpi: z.number().int().min(50).max(1200),
    colorMode: ScanColorModeSchema,
    duplex: ScanDuplexModeSchema,
    paperSize: z.string().min(1).max(32),
    deskew: z.boolean(),
    removeBlankPages: z.boolean(),
    defaultDocumentTypeId: UuidSchema.nullable(),
    ocrLanguages: z.array(z.string().min(2).max(16)),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/admin/scanner/profiles`. */
export const CreateScannerProfileRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    deviceId: ScanDeviceIdSchema.nullable().optional(),
    driver: ScanDriverKindSchema,
    dpi: z.number().int().min(50).max(1200).default(200),
    colorMode: ScanColorModeSchema.default('color'),
    duplex: ScanDuplexModeSchema.default('simplex'),
    paperSize: z.string().min(1).max(32).default('A4'),
    deskew: z.boolean().default(true),
    removeBlankPages: z.boolean().default(true),
    defaultDocumentTypeId: UuidSchema.nullable().optional(),
    ocrLanguages: z.array(z.string().min(2).max(16)).default(['en']),
  })
  .strict();

// ---------------------------------------------------------------------------
// Capture rule (discriminated trigger + action)
// ---------------------------------------------------------------------------

/** `z.infer` matches `CaptureRule.trigger` (discriminated on `kind`). */
export const CaptureRuleTriggerSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('barcode'),
      symbology: z.string().min(1).max(32),
      pattern: z.string().min(1).max(256),
    })
    .strict(),
  z.object({ kind: z.literal('qr'), pattern: z.string().min(1).max(256) }).strict(),
  z.object({ kind: z.literal('omr'), fieldKey: z.string().min(1).max(64) }).strict(),
  z.object({ kind: z.literal('icr'), fieldKey: z.string().min(1).max(64) }).strict(),
  z.object({ kind: z.literal('page_count'), value: z.number().int().min(1) }).strict(),
]);

/** `z.infer` matches `CaptureRule.action` (discriminated on `kind`). */
export const CaptureRuleActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('split') }).strict(),
  z
    .object({
      kind: z.literal('assign_document_type'),
      documentTypeId: UuidSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('assign_metadata'),
      fieldKey: z.string().min(1).max(64),
      valueKey: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({
      kind: z.literal('route_to_queue'),
      queueCode: z.string().min(1).max(64),
    })
    .strict(),
]);

/** `z.infer` matches `CaptureRule`. */
export const CaptureRuleSchema = z
  .object({
    id: CaptureRuleIdSchema,
    tenantId: TenantIdSchema,
    name: z.string().min(1).max(200),
    trigger: CaptureRuleTriggerSchema,
    action: CaptureRuleActionSchema,
    priority: z.number().int().min(0),
    enabled: z.boolean(),
  })
  .strict();

/** Request body for `POST /v1/admin/scanner/capture-rules`. */
export const CreateCaptureRuleRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    trigger: CaptureRuleTriggerSchema,
    action: CaptureRuleActionSchema,
    priority: z.number().int().min(0).default(100),
    enabled: z.boolean().default(true),
  })
  .strict();

// ---------------------------------------------------------------------------
// Scanner job + Batch
// ---------------------------------------------------------------------------

/** `z.infer` matches `ScannerJob`. */
export const ScannerJobSchema = z
  .object({
    id: ScannerJobIdSchema,
    tenantId: TenantIdSchema,
    batchId: DigitizationBatchIdSchema.nullable(),
    profileId: ScannerProfileIdSchema.nullable(),
    deviceId: ScanDeviceIdSchema.nullable(),
    status: ScanStatusSchema,
    initiatedBy: UserIdSchema,
    pagesAcquired: z.number().int().min(0),
    pagesProcessed: z.number().int().min(0),
    pagesForReview: z.number().int().min(0),
    failureReasonKey: z.string().min(1).max(128).nullable(),
    resumable: z.boolean(),
    startedAt: IsoDateStringSchema,
    completedAt: IsoDateStringSchema.nullable(),
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/scanner/jobs` (job create). */
export const CreateScannerJobRequestSchema = z
  .object({
    batchId: DigitizationBatchIdSchema.nullable().optional(),
    profileId: ScannerProfileIdSchema.nullable().optional(),
    deviceId: ScanDeviceIdSchema.nullable().optional(),
    resumable: z.boolean().default(true),
  })
  .strict();

/** `z.infer` matches `DigitizationBatch`. */
export const DigitizationBatchSchema = z
  .object({
    id: DigitizationBatchIdSchema,
    tenantId: TenantIdSchema,
    name: z.string().min(1).max(200),
    documentIds: z.array(DocumentIdSchema),
    status: z.enum(['open', 'closed', 'archived']),
    createdBy: UserIdSchema,
    createdAt: IsoDateStringSchema,
    closedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** Request body for `POST /v1/scanner/batches` (batch create). */
export const CreateDigitizationBatchRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
  })
  .strict();

// ---------------------------------------------------------------------------
// OCR / OMR / ICR results
// ---------------------------------------------------------------------------

/** `z.infer` matches `OcrResult`. */
export const OcrResultSchema = z
  .object({
    pageId: UuidSchema,
    text: z.string().min(0).max(100000),
    confidence: ConfidenceScoreSchema,
    languages: z.array(z.string().min(2).max(16)),
    words: z.array(
      z
        .object({
          text: z.string().min(0).max(256),
          confidence: ConfidenceScoreSchema,
          boundingBox: z
            .object({
              x: z.number(),
              y: z.number(),
              w: z.number(),
              h: z.number(),
            })
            .strict(),
        })
        .strict(),
    ),
    computedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `OmrResult`. */
export const OmrResultSchema = z
  .object({
    pageId: UuidSchema,
    fields: z.array(
      z
        .object({
          fieldKey: z.string().min(1).max(64),
          marked: z.boolean(),
          confidence: ConfidenceScoreSchema,
        })
        .strict(),
    ),
    computedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `IcrResult`. */
export const IcrResultSchema = z
  .object({
    pageId: UuidSchema,
    fields: z.array(
      z
        .object({
          fieldKey: z.string().min(1).max(64),
          value: z.string().min(0).max(1024),
          confidence: ConfidenceScoreSchema,
          routedToReview: z.boolean(),
        })
        .strict(),
    ),
    computedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `HumanVerificationItem`. */
export const HumanVerificationItemSchema = z
  .object({
    id: UuidSchema,
    tenantId: TenantIdSchema,
    jobId: ScannerJobIdSchema,
    pageId: UuidSchema,
    kind: z.enum(['ocr', 'omr', 'icr']),
    fieldKey: z.string().min(1).max(64).nullable(),
    machineValue: z.string().min(0).max(1024),
    confidence: ConfidenceScoreSchema,
    resolvedValue: z.string().min(0).max(1024).nullable(),
    reviewedBy: UserIdSchema.nullable(),
    reviewedAt: IsoDateStringSchema.nullable(),
    status: z.enum(['pending', 'approved', 'corrected', 'rejected']),
    createdAt: IsoDateStringSchema,
  })
  .strict();
