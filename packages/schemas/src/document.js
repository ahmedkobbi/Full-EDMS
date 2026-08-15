"use strict";
/**
 * @smart-edms/schemas — document management (spec §9.3, §9.5, §9.6)
 *
 * Zod schemas for: create document, upload init (multipart), upload complete,
 * version create, metadata update, document search query, share link create.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentSearchQuerySchema = exports.UpdateMetadataRequestSchema = exports.CreateVersionRequestSchema = exports.UploadCompleteResponseSchema = exports.UploadCompleteRequestSchema = exports.UploadInitResponseSchema = exports.UploadInitRequestSchema = exports.DocumentSchema = exports.DocumentVersionSchema = exports.FolderSchema = exports.DocumentTypeSchema = exports.MetadataValueSchema = exports.MetadataSchemaSchema = exports.MetadataFieldSchema = exports.ControlledVocabularyEntrySchema = exports.MetadataValidationSchema = exports.MetadataValidationKindSchema = exports.MetadataFieldTypeSchema = exports.DocumentStatusSchema = exports.FileHashSchema = exports.ChecksumSchema = exports.TagIdSchema = exports.FolderIdSchema = exports.DocumentTypeIdSchema = exports.MetadataFieldIdSchema = exports.MetadataSchemaIdSchema = exports.DocumentVersionIdSchema = exports.DocumentIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const classification_1 = require("./classification");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.DocumentIdSchema = common_1.UuidSchema.transform((v) => v);
exports.DocumentVersionIdSchema = common_1.UuidSchema.transform((v) => v);
exports.MetadataSchemaIdSchema = common_1.UuidSchema.transform((v) => v);
exports.MetadataFieldIdSchema = common_1.UuidSchema.transform((v) => v);
exports.DocumentTypeIdSchema = common_1.UuidSchema.transform((v) => v);
exports.FolderIdSchema = common_1.UuidSchema.transform((v) => v);
exports.TagIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Checksums
// ---------------------------------------------------------------------------
/** `z.infer` matches `Checksum`. */
exports.ChecksumSchema = zod_1.z
    .object({
    algorithm: common_1.HashAlgorithmSchema,
    digest: common_1.HashHexSchema,
    length: common_1.ByteSizeSchema,
})
    .strict();
/** `z.infer` matches `FileHash`. */
exports.FileHashSchema = zod_1.z
    .object({
    primary: exports.ChecksumSchema,
    secondary: exports.ChecksumSchema.nullable(),
    computedAt: common_1.IsoDateStringSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// Document status + types
// ---------------------------------------------------------------------------
/** `z.infer` === `DocumentStatus`. */
exports.DocumentStatusSchema = zod_1.z.enum([
    'draft',
    'active',
    'checked_out',
    'declared_record',
    'archived',
    'disposed',
    'under_review',
]);
/** `z.infer` === `MetadataFieldType`. */
exports.MetadataFieldTypeSchema = zod_1.z.enum([
    'string',
    'text',
    'number',
    'boolean',
    'date',
    'datetime',
    'enum',
    'multiselect',
    'user',
    'group',
    'document_ref',
    'json',
]);
/** `z.infer` === `MetadataValidationKind`. */
exports.MetadataValidationKindSchema = zod_1.z.enum([
    'required',
    'min_length',
    'max_length',
    'min_value',
    'max_value',
    'pattern',
    'enum',
    'date_range',
]);
/** `z.infer` matches `MetadataValidation` (discriminated on `kind`). */
exports.MetadataValidationSchema = zod_1.z.discriminatedUnion('kind', [
    zod_1.z.object({ kind: zod_1.z.literal('required') }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('min_length'), value: zod_1.z.number().int().min(0) }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('max_length'), value: zod_1.z.number().int().min(0) }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('min_value'), value: zod_1.z.number() }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('max_value'), value: zod_1.z.number() }).strict(),
    zod_1.z.object({ kind: zod_1.z.literal('pattern'), regex: zod_1.z.string().min(1).max(1024) }).strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('enum'),
        allowedValues: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('date_range'),
        min: common_1.IsoDateStringSchema.nullable(),
        max: common_1.IsoDateStringSchema.nullable(),
    })
        .strict(),
]);
/** `z.infer` matches `ControlledVocabularyEntry`. */
exports.ControlledVocabularyEntrySchema = zod_1.z
    .object({
    value: zod_1.z.string().min(1).max(128),
    labelKey: zod_1.z.string().min(1).max(128),
    displayNames: zod_1.z.record(zod_1.z.string(), zod_1.z.string().min(1).max(200)).optional(),
    deprecated: zod_1.z.boolean(),
})
    .strict();
/** `z.infer` matches `MetadataField`. */
exports.MetadataFieldSchema = zod_1.z
    .object({
    id: exports.MetadataFieldIdSchema,
    schemaId: exports.MetadataSchemaIdSchema,
    code: zod_1.z.string().min(1).max(64),
    type: exports.MetadataFieldTypeSchema,
    labelKey: zod_1.z.string().min(1).max(128),
    descriptionKey: zod_1.z.string().min(1).max(128).nullable(),
    required: zod_1.z.boolean(),
    readonly: zod_1.z.boolean(),
    validations: zod_1.z.array(exports.MetadataValidationSchema),
    vocabulary: zod_1.z.array(exports.ControlledVocabularyEntrySchema),
    order: zod_1.z.number().int().min(0),
})
    .strict();
/** `z.infer` matches `MetadataSchema`. */
exports.MetadataSchemaSchema = zod_1.z
    .object({
    id: exports.MetadataSchemaIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    version: zod_1.z.number().int().min(1),
    status: zod_1.z.enum(['draft', 'published', 'archived']),
    fields: zod_1.z.array(exports.MetadataFieldSchema),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    publishedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/**
 * `z.infer` matches `MetadataValue` (discriminated on `fieldType`).
 * The `json` variant uses `z.unknown()` because the JSON payload is
 * genuinely untrusted external data — server-side code must narrow further.
 */
exports.MetadataValueSchema = zod_1.z.discriminatedUnion('fieldType', [
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.enum(['string', 'text']),
        value: zod_1.z.string().min(0).max(16384),
    })
        .strict(),
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.literal('number'),
        value: zod_1.z.number(),
    })
        .strict(),
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.literal('boolean'),
        value: zod_1.z.boolean(),
    })
        .strict(),
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.enum(['date', 'datetime']),
        value: common_1.IsoDateStringSchema,
    })
        .strict(),
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.literal('enum'),
        value: zod_1.z.string().min(1).max(128),
    })
        .strict(),
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.literal('multiselect'),
        value: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    })
        .strict(),
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.enum(['user', 'group', 'document_ref']),
        value: common_1.UuidSchema,
    })
        .strict(),
    // `json` variant: untrusted external data, intentionally `z.unknown()`.
    zod_1.z
        .object({
        fieldId: exports.MetadataFieldIdSchema,
        fieldType: zod_1.z.literal('json'),
        value: zod_1.z.unknown(),
    })
        .strict(),
]);
// ---------------------------------------------------------------------------
// Document type / folder
// ---------------------------------------------------------------------------
/** `z.infer` matches `DocumentType`. */
exports.DocumentTypeSchema = zod_1.z
    .object({
    id: exports.DocumentTypeIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    code: zod_1.z.string().min(1).max(64),
    labelKey: zod_1.z.string().min(1).max(128),
    description: zod_1.z.string().min(0).max(2000),
    metadataSchemaId: exports.MetadataSchemaIdSchema.nullable(),
    defaultRetentionScheduleId: common_1.UuidSchema.nullable(),
    allowedMimeTypes: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `Folder`. */
exports.FolderSchema = zod_1.z
    .object({
    id: exports.FolderIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    parentId: zod_1.z.lazy(() => exports.FolderIdSchema).nullable(),
    name: zod_1.z.string().min(1).max(200),
    createdBy: user_1.UserIdSchema,
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    deletedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `DocumentVersion`. */
exports.DocumentVersionSchema = zod_1.z
    .object({
    id: exports.DocumentVersionIdSchema,
    documentId: exports.DocumentIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    versionNumber: zod_1.z.number().int().min(1),
    fileName: zod_1.z.string().min(1).max(512),
    mimeType: zod_1.z.string().min(1).max(128),
    size: common_1.ByteSizeSchema,
    storageKey: zod_1.z.string().min(1).max(1024),
    hash: exports.FileHashSchema,
    isHead: zod_1.z.boolean(),
    isDerivative: zod_1.z.boolean(),
    reasonKey: zod_1.z.string().min(1).max(128).nullable(),
    createdBy: user_1.UserIdSchema,
    createdAt: common_1.IsoDateStringSchema,
    locked: zod_1.z.boolean(),
    lockedBy: user_1.UserIdSchema.nullable(),
    lockedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `Document`. */
exports.DocumentSchema = zod_1.z
    .object({
    id: exports.DocumentIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    documentTypeId: exports.DocumentTypeIdSchema,
    title: zod_1.z.string().min(1).max(512),
    description: zod_1.z.string().min(0).max(4000).nullable(),
    folderId: exports.FolderIdSchema.nullable(),
    status: exports.DocumentStatusSchema,
    currentVersionId: exports.DocumentVersionIdSchema,
    classificationLabelId: classification_1.ClassificationLabelIdSchema,
    tagIds: zod_1.z.array(exports.TagIdSchema),
    contentLanguage: common_1.LocaleSchema,
    textDirection: zod_1.z.enum(['ltr', 'rtl', 'auto']),
    legalHold: zod_1.z.boolean(),
    favourite: zod_1.z.boolean(),
    ownerUserId: user_1.UserIdSchema,
    createdBy: user_1.UserIdSchema,
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    deletedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
// ---------------------------------------------------------------------------
// Upload / version DTOs
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/documents/upload/init` (multipart init). */
exports.UploadInitRequestSchema = zod_1.z
    .object({
    fileName: zod_1.z.string().min(1).max(512),
    mimeType: zod_1.z.string().min(1).max(128),
    size: common_1.ByteSizeSchema,
    documentTypeId: exports.DocumentTypeIdSchema,
    folderId: exports.FolderIdSchema.nullable().optional(),
    classificationLabelId: classification_1.ClassificationLabelIdSchema,
    contentLanguage: common_1.LocaleSchema,
    textDirection: zod_1.z.enum(['ltr', 'rtl', 'auto']).optional(),
    // Optional pre-computed hash for deduplication / integrity.
    precomputedHash: zod_1.z
        .object({
        algorithm: common_1.HashAlgorithmSchema,
        digest: common_1.HashHexSchema,
    })
        .optional(),
    // Total parts for multipart upload (1 for single-shot).
    totalParts: zod_1.z.number().int().min(1).max(10000).default(1),
})
    .strict();
/** Response body for upload init. */
exports.UploadInitResponseSchema = zod_1.z
    .object({
    uploadId: zod_1.z.string().min(1).max(256),
    documentId: exports.DocumentIdSchema.optional(),
    // Pre-signed URLs for each part (S3 multipart).
    partUrls: zod_1.z
        .array(zod_1.z
        .object({
        partNumber: zod_1.z.number().int().min(1).max(10000),
        url: zod_1.z.string().url(),
        expiresAt: common_1.IsoDateStringSchema,
    })
        .strict())
        .max(10000),
    // Required hash algorithms the client must compute before complete.
    requiredHashAlgorithms: zod_1.z.array(common_1.HashAlgorithmSchema),
})
    .strict();
/** Request body for `POST /v1/documents/upload/:uploadId/complete`. */
exports.UploadCompleteRequestSchema = zod_1.z
    .object({
    uploadId: zod_1.z.string().min(1).max(256),
    // Per-part ETags returned by S3.
    parts: zod_1.z
        .array(zod_1.z
        .object({
        partNumber: zod_1.z.number().int().min(1).max(10000),
        etag: zod_1.z.string().min(1).max(256),
        size: common_1.ByteSizeSchema,
    })
        .strict())
        .max(10000),
    // Final hash(es) computed client-side.
    hashes: zod_1.z
        .array(zod_1.z
        .object({
        algorithm: common_1.HashAlgorithmSchema,
        digest: common_1.HashHexSchema,
    })
        .strict())
        .min(1),
})
    .strict();
/** Response body for upload complete. */
exports.UploadCompleteResponseSchema = zod_1.z
    .object({
    document: exports.DocumentSchema,
    version: exports.DocumentVersionSchema,
})
    .strict();
/** Request body for `POST /v1/documents/:id/versions` (create new version). */
exports.CreateVersionRequestSchema = zod_1.z
    .object({
    fileName: zod_1.z.string().min(1).max(512),
    mimeType: zod_1.z.string().min(1).max(128),
    size: common_1.ByteSizeSchema,
    storageKey: zod_1.z.string().min(1).max(1024),
    hash: exports.FileHashSchema,
    reasonKey: zod_1.z.string().min(1).max(128).optional(),
    // If true, the previous head is locked for archival.
    lockPrevious: zod_1.z.boolean().default(false),
})
    .strict();
/** Request body for `PATCH /v1/documents/:id/metadata`. */
exports.UpdateMetadataRequestSchema = zod_1.z
    .object({
    metadata: zod_1.z.array(exports.MetadataValueSchema),
    reasonKey: zod_1.z.string().min(1).max(128).optional(),
})
    .strict();
/** Request body for `POST /v1/documents/search` (document search query). */
exports.DocumentSearchQuerySchema = zod_1.z
    .object({
    text: zod_1.z.string().min(0).max(2048).nullable().optional(),
    folderId: exports.FolderIdSchema.nullable().optional(),
    documentTypeIds: zod_1.z.array(exports.DocumentTypeIdSchema).optional(),
    classificationLabelIds: zod_1.z.array(classification_1.ClassificationLabelIdSchema).optional(),
    status: zod_1.z.array(exports.DocumentStatusSchema).optional(),
    tagIds: zod_1.z.array(exports.TagIdSchema).optional(),
    contentLanguage: common_1.LocaleSchema.optional(),
    createdAfter: common_1.IsoDateStringSchema.optional(),
    createdBefore: common_1.IsoDateStringSchema.optional(),
    updatedAfter: common_1.IsoDateStringSchema.optional(),
    updatedBefore: common_1.IsoDateStringSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(200).default(50),
    cursor: zod_1.z.string().min(1).max(1024).nullable().optional(),
    sort: zod_1.z
        .enum(['createdAt', 'updatedAt', 'title', 'relevance'])
        .default('updatedAt'),
    sortDirection: zod_1.z.enum(['asc', 'desc']).default('desc'),
})
    .strict();
// NOTE: `CreateShareLinkRequestSchema` lives in `./share.ts` to avoid an
// ambiguous re-export collision. See `share.ts` for the canonical schema.
//# sourceMappingURL=document.js.map