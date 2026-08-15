"use strict";
/**
 * @smart-edms/schemas — document digitization & capture (spec §9.16)
 *
 * Zod schemas for: profile create, job create, batch create, capture rule.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanVerificationItemSchema = exports.IcrResultSchema = exports.OmrResultSchema = exports.OcrResultSchema = exports.CreateDigitizationBatchRequestSchema = exports.DigitizationBatchSchema = exports.CreateScannerJobRequestSchema = exports.ScannerJobSchema = exports.CreateCaptureRuleRequestSchema = exports.CaptureRuleSchema = exports.CaptureRuleActionSchema = exports.CaptureRuleTriggerSchema = exports.CreateScannerProfileRequestSchema = exports.ScannerProfileSchema = exports.ScanDeviceSchema = exports.ScanDuplexModeSchema = exports.ScanColorModeSchema = exports.ScanStatusSchema = exports.ScanDriverKindSchema = exports.ScanDeviceIdSchema = exports.CaptureRuleIdSchema = exports.DigitizationBatchIdSchema = exports.ScannerJobIdSchema = exports.ScannerProfileIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const document_1 = require("./document");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.ScannerProfileIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ScannerJobIdSchema = common_1.UuidSchema.transform((v) => v);
exports.DigitizationBatchIdSchema = common_1.UuidSchema.transform((v) => v);
exports.CaptureRuleIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ScanDeviceIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `ScanDriverKind`. */
exports.ScanDriverKindSchema = zod_1.z.enum([
    'upload',
    'twain',
    'wia',
    'isis',
    'network',
    'local_agent',
]);
/** `z.infer` === `ScanStatus`. */
exports.ScanStatusSchema = zod_1.z.enum([
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
exports.ScanColorModeSchema = zod_1.z.enum(['color', 'grayscale', 'bitonal']);
/** `z.infer` === `ScanDuplexMode`. */
exports.ScanDuplexModeSchema = zod_1.z.enum(['simplex', 'duplex']);
// ---------------------------------------------------------------------------
// Device + Profile
// ---------------------------------------------------------------------------
/** `z.infer` matches `ScanDevice`. */
exports.ScanDeviceSchema = zod_1.z
    .object({
    id: exports.ScanDeviceIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    displayName: zod_1.z.string().min(1).max(200),
    driver: exports.ScanDriverKindSchema,
    address: zod_1.z.string().min(1).max(256),
    manufacturer: zod_1.z.string().min(1).max(128).nullable(),
    model: zod_1.z.string().min(1).max(128).nullable(),
    online: zod_1.z.boolean(),
    lastSeenAt: common_1.IsoDateStringSchema.nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `ScannerProfile`. */
exports.ScannerProfileSchema = zod_1.z
    .object({
    id: exports.ScannerProfileIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    name: zod_1.z.string().min(1).max(200),
    deviceId: exports.ScanDeviceIdSchema.nullable(),
    driver: exports.ScanDriverKindSchema,
    dpi: zod_1.z.number().int().min(50).max(1200),
    colorMode: exports.ScanColorModeSchema,
    duplex: exports.ScanDuplexModeSchema,
    paperSize: zod_1.z.string().min(1).max(32),
    deskew: zod_1.z.boolean(),
    removeBlankPages: zod_1.z.boolean(),
    defaultDocumentTypeId: common_1.UuidSchema.nullable(),
    ocrLanguages: zod_1.z.array(zod_1.z.string().min(2).max(16)),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/admin/scanner/profiles`. */
exports.CreateScannerProfileRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    deviceId: exports.ScanDeviceIdSchema.nullable().optional(),
    driver: exports.ScanDriverKindSchema,
    dpi: zod_1.z.number().int().min(50).max(1200).default(200),
    colorMode: exports.ScanColorModeSchema.default('color'),
    duplex: exports.ScanDuplexModeSchema.default('simplex'),
    paperSize: zod_1.z.string().min(1).max(32).default('A4'),
    deskew: zod_1.z.boolean().default(true),
    removeBlankPages: zod_1.z.boolean().default(true),
    defaultDocumentTypeId: common_1.UuidSchema.nullable().optional(),
    ocrLanguages: zod_1.z.array(zod_1.z.string().min(2).max(16)).default(['en']),
})
    .strict();
// ---------------------------------------------------------------------------
// Capture rule (discriminated trigger + action)
// ---------------------------------------------------------------------------
/** `z.infer` matches `CaptureRule.trigger` (discriminated on `kind`). */
exports.CaptureRuleTriggerSchema = zod_1.z.discriminatedUnion('kind', [
    zod_1.z
        .object({
        kind: zod_1.z.literal('barcode'),
        symbology: zod_1.z.string().min(1).max(32),
        pattern: zod_1.z.string().min(1).max(256),
    })
        .strict(),
    zod_1.z.object({ kind: zod_1.z.literal('qr'), pattern: zod_1.z.string().min(1).max(256) }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('omr'), fieldKey: zod_1.z.string().min(1).max(64) }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('icr'), fieldKey: zod_1.z.string().min(1).max(64) }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('page_count'), value: zod_1.z.number().int().min(1) }).strict(),
]);
/** `z.infer` matches `CaptureRule.action` (discriminated on `kind`). */
exports.CaptureRuleActionSchema = zod_1.z.discriminatedUnion('kind', [
    zod_1.z.object({ kind: zod_1.z.literal('split') }).strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('assign_document_type'),
        documentTypeId: common_1.UuidSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('assign_metadata'),
        fieldKey: zod_1.z.string().min(1).max(64),
        valueKey: zod_1.z.string().min(1).max(128),
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('route_to_queue'),
        queueCode: zod_1.z.string().min(1).max(64),
    })
        .strict(),
]);
/** `z.infer` matches `CaptureRule`. */
exports.CaptureRuleSchema = zod_1.z
    .object({
    id: exports.CaptureRuleIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    name: zod_1.z.string().min(1).max(200),
    trigger: exports.CaptureRuleTriggerSchema,
    action: exports.CaptureRuleActionSchema,
    priority: zod_1.z.number().int().min(0),
    enabled: zod_1.z.boolean(),
})
    .strict();
/** Request body for `POST /v1/admin/scanner/capture-rules`. */
exports.CreateCaptureRuleRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    trigger: exports.CaptureRuleTriggerSchema,
    action: exports.CaptureRuleActionSchema,
    priority: zod_1.z.number().int().min(0).default(100),
    enabled: zod_1.z.boolean().default(true),
})
    .strict();
// ---------------------------------------------------------------------------
// Scanner job + Batch
// ---------------------------------------------------------------------------
/** `z.infer` matches `ScannerJob`. */
exports.ScannerJobSchema = zod_1.z
    .object({
    id: exports.ScannerJobIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    batchId: exports.DigitizationBatchIdSchema.nullable(),
    profileId: exports.ScannerProfileIdSchema.nullable(),
    deviceId: exports.ScanDeviceIdSchema.nullable(),
    status: exports.ScanStatusSchema,
    initiatedBy: user_1.UserIdSchema,
    pagesAcquired: zod_1.z.number().int().min(0),
    pagesProcessed: zod_1.z.number().int().min(0),
    pagesForReview: zod_1.z.number().int().min(0),
    failureReasonKey: zod_1.z.string().min(1).max(128).nullable(),
    resumable: zod_1.z.boolean(),
    startedAt: common_1.IsoDateStringSchema,
    completedAt: common_1.IsoDateStringSchema.nullable(),
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/scanner/jobs` (job create). */
exports.CreateScannerJobRequestSchema = zod_1.z
    .object({
    batchId: exports.DigitizationBatchIdSchema.nullable().optional(),
    profileId: exports.ScannerProfileIdSchema.nullable().optional(),
    deviceId: exports.ScanDeviceIdSchema.nullable().optional(),
    resumable: zod_1.z.boolean().default(true),
})
    .strict();
/** `z.infer` matches `DigitizationBatch`. */
exports.DigitizationBatchSchema = zod_1.z
    .object({
    id: exports.DigitizationBatchIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    name: zod_1.z.string().min(1).max(200),
    documentIds: zod_1.z.array(document_1.DocumentIdSchema),
    status: zod_1.z.enum(['open', 'closed', 'archived']),
    createdBy: user_1.UserIdSchema,
    createdAt: common_1.IsoDateStringSchema,
    closedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** Request body for `POST /v1/scanner/batches` (batch create). */
exports.CreateDigitizationBatchRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
})
    .strict();
// ---------------------------------------------------------------------------
// OCR / OMR / ICR results
// ---------------------------------------------------------------------------
/** `z.infer` matches `OcrResult`. */
exports.OcrResultSchema = zod_1.z
    .object({
    pageId: common_1.UuidSchema,
    text: zod_1.z.string().min(0).max(100000),
    confidence: common_1.ConfidenceScoreSchema,
    languages: zod_1.z.array(zod_1.z.string().min(2).max(16)),
    words: zod_1.z.array(zod_1.z
        .object({
        text: zod_1.z.string().min(0).max(256),
        confidence: common_1.ConfidenceScoreSchema,
        boundingBox: zod_1.z
            .object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            w: zod_1.z.number(),
            h: zod_1.z.number(),
        })
            .strict(),
    })
        .strict()),
    computedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `OmrResult`. */
exports.OmrResultSchema = zod_1.z
    .object({
    pageId: common_1.UuidSchema,
    fields: zod_1.z.array(zod_1.z
        .object({
        fieldKey: zod_1.z.string().min(1).max(64),
        marked: zod_1.z.boolean(),
        confidence: common_1.ConfidenceScoreSchema,
    })
        .strict()),
    computedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `IcrResult`. */
exports.IcrResultSchema = zod_1.z
    .object({
    pageId: common_1.UuidSchema,
    fields: zod_1.z.array(zod_1.z
        .object({
        fieldKey: zod_1.z.string().min(1).max(64),
        value: zod_1.z.string().min(0).max(1024),
        confidence: common_1.ConfidenceScoreSchema,
        routedToReview: zod_1.z.boolean(),
    })
        .strict()),
    computedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `HumanVerificationItem`. */
exports.HumanVerificationItemSchema = zod_1.z
    .object({
    id: common_1.UuidSchema,
    tenantId: tenant_1.TenantIdSchema,
    jobId: exports.ScannerJobIdSchema,
    pageId: common_1.UuidSchema,
    kind: zod_1.z.enum(['ocr', 'omr', 'icr']),
    fieldKey: zod_1.z.string().min(1).max(64).nullable(),
    machineValue: zod_1.z.string().min(0).max(1024),
    confidence: common_1.ConfidenceScoreSchema,
    resolvedValue: zod_1.z.string().min(0).max(1024).nullable(),
    reviewedBy: user_1.UserIdSchema.nullable(),
    reviewedAt: common_1.IsoDateStringSchema.nullable(),
    status: zod_1.z.enum(['pending', 'approved', 'corrected', 'rejected']),
    createdAt: common_1.IsoDateStringSchema,
})
    .strict();
//# sourceMappingURL=scanner.js.map