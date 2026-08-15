/**
 * @smart-edms/schemas — document management (spec §9.3, §9.5, §9.6)
 *
 * Zod schemas for: create document, upload init (multipart), upload complete,
 * version create, metadata update, document search query, share link create.
 */

import { z } from 'zod';
import type {
  DocumentId,
  DocumentTypeId,
  DocumentVersionId,
  FolderId,
  MetadataFieldId,
  MetadataSchemaId,
  TagId,
} from '@smart-edms/types';
import {
  ByteSizeSchema,
  HashAlgorithmSchema,
  HashHexSchema,
  IsoDateStringSchema,
  LocaleSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { ClassificationLabelIdSchema } from './classification';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const DocumentIdSchema = UuidSchema.transform((v): DocumentId => v as DocumentId);
export const DocumentVersionIdSchema = UuidSchema.transform(
  (v): DocumentVersionId => v as DocumentVersionId,
);
export const MetadataSchemaIdSchema = UuidSchema.transform(
  (v): MetadataSchemaId => v as MetadataSchemaId,
);
export const MetadataFieldIdSchema = UuidSchema.transform(
  (v): MetadataFieldId => v as MetadataFieldId,
);
export const DocumentTypeIdSchema = UuidSchema.transform(
  (v): DocumentTypeId => v as DocumentTypeId,
);
export const FolderIdSchema = UuidSchema.transform((v): FolderId => v as FolderId);
export const TagIdSchema = UuidSchema.transform((v): TagId => v as TagId);

// ---------------------------------------------------------------------------
// Checksums
// ---------------------------------------------------------------------------

/** `z.infer` matches `Checksum`. */
export const ChecksumSchema = z
  .object({
    algorithm: HashAlgorithmSchema,
    digest: HashHexSchema,
    length: ByteSizeSchema,
  })
  .strict();

/** `z.infer` matches `FileHash`. */
export const FileHashSchema = z
  .object({
    primary: ChecksumSchema,
    secondary: ChecksumSchema.nullable(),
    computedAt: IsoDateStringSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Document status + types
// ---------------------------------------------------------------------------

/** `z.infer` === `DocumentStatus`. */
export const DocumentStatusSchema = z.enum([
  'draft',
  'active',
  'checked_out',
  'declared_record',
  'archived',
  'disposed',
  'under_review',
]);

/** `z.infer` === `MetadataFieldType`. */
export const MetadataFieldTypeSchema = z.enum([
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
export const MetadataValidationKindSchema = z.enum([
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
export const MetadataValidationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('required') }).strict(),
  z.object({ kind: z.literal('min_length'), value: z.number().int().min(0) }).strict(),
  z.object({ kind: z.literal('max_length'), value: z.number().int().min(0) }).strict(),
  z.object({ kind: z.literal('min_value'), value: z.number() }).strict(),
  z.object({ kind: z.literal('max_value'), value: z.number() }).strict(),
  z.object({ kind: z.literal('pattern'), regex: z.string().min(1).max(1024) }).strict(),
  z
    .object({
      kind: z.literal('enum'),
      allowedValues: z.array(z.string().min(1).max(128)),
    })
    .strict(),
  z
    .object({
      kind: z.literal('date_range'),
      min: IsoDateStringSchema.nullable(),
      max: IsoDateStringSchema.nullable(),
    })
    .strict(),
]);

/** `z.infer` matches `ControlledVocabularyEntry`. */
export const ControlledVocabularyEntrySchema = z
  .object({
    value: z.string().min(1).max(128),
    labelKey: z.string().min(1).max(128),
    displayNames: z.record(z.string(), z.string().min(1).max(200)).optional(),
    deprecated: z.boolean(),
  })
  .strict();

/** `z.infer` matches `MetadataField`. */
export const MetadataFieldSchema = z
  .object({
    id: MetadataFieldIdSchema,
    schemaId: MetadataSchemaIdSchema,
    code: z.string().min(1).max(64),
    type: MetadataFieldTypeSchema,
    labelKey: z.string().min(1).max(128),
    descriptionKey: z.string().min(1).max(128).nullable(),
    required: z.boolean(),
    readonly: z.boolean(),
    validations: z.array(MetadataValidationSchema),
    vocabulary: z.array(ControlledVocabularyEntrySchema),
    order: z.number().int().min(0),
  })
  .strict();

/** `z.infer` matches `MetadataSchema`. */
export const MetadataSchemaSchema = z
  .object({
    id: MetadataSchemaIdSchema,
    tenantId: TenantIdSchema,
    version: z.number().int().min(1),
    status: z.enum(['draft', 'published', 'archived']),
    fields: z.array(MetadataFieldSchema),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    publishedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/**
 * `z.infer` matches `MetadataValue` (discriminated on `fieldType`).
 * The `json` variant uses `z.unknown()` because the JSON payload is
 * genuinely untrusted external data — server-side code must narrow further.
 */
export const MetadataValueSchema = z.discriminatedUnion('fieldType', [
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.enum(['string', 'text']),
      value: z.string().min(0).max(16384),
    })
    .strict(),
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.literal('number'),
      value: z.number(),
    })
    .strict(),
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.literal('boolean'),
      value: z.boolean(),
    })
    .strict(),
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.enum(['date', 'datetime']),
      value: IsoDateStringSchema,
    })
    .strict(),
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.literal('enum'),
      value: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.literal('multiselect'),
      value: z.array(z.string().min(1).max(128)),
    })
    .strict(),
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.enum(['user', 'group', 'document_ref']),
      value: UuidSchema,
    })
    .strict(),
  // `json` variant: untrusted external data, intentionally `z.unknown()`.
  z
    .object({
      fieldId: MetadataFieldIdSchema,
      fieldType: z.literal('json'),
      value: z.unknown(),
    })
    .strict(),
]);

// ---------------------------------------------------------------------------
// Document type / folder
// ---------------------------------------------------------------------------

/** `z.infer` matches `DocumentType`. */
export const DocumentTypeSchema = z
  .object({
    id: DocumentTypeIdSchema,
    tenantId: TenantIdSchema,
    code: z.string().min(1).max(64),
    labelKey: z.string().min(1).max(128),
    description: z.string().min(0).max(2000),
    metadataSchemaId: MetadataSchemaIdSchema.nullable(),
    defaultRetentionScheduleId: UuidSchema.nullable(),
    allowedMimeTypes: z.array(z.string().min(1).max(128)),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `Folder`. */
export const FolderSchema = z
  .object({
    id: FolderIdSchema,
    tenantId: TenantIdSchema,
    parentId: z.lazy(() => FolderIdSchema).nullable(),
    name: z.string().min(1).max(200),
    createdBy: UserIdSchema,
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    deletedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `DocumentVersion`. */
export const DocumentVersionSchema = z
  .object({
    id: DocumentVersionIdSchema,
    documentId: DocumentIdSchema,
    tenantId: TenantIdSchema,
    versionNumber: z.number().int().min(1),
    fileName: z.string().min(1).max(512),
    mimeType: z.string().min(1).max(128),
    size: ByteSizeSchema,
    storageKey: z.string().min(1).max(1024),
    hash: FileHashSchema,
    isHead: z.boolean(),
    isDerivative: z.boolean(),
    reasonKey: z.string().min(1).max(128).nullable(),
    createdBy: UserIdSchema,
    createdAt: IsoDateStringSchema,
    locked: z.boolean(),
    lockedBy: UserIdSchema.nullable(),
    lockedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `Document`. */
export const DocumentSchema = z
  .object({
    id: DocumentIdSchema,
    tenantId: TenantIdSchema,
    documentTypeId: DocumentTypeIdSchema,
    title: z.string().min(1).max(512),
    description: z.string().min(0).max(4000).nullable(),
    folderId: FolderIdSchema.nullable(),
    status: DocumentStatusSchema,
    currentVersionId: DocumentVersionIdSchema,
    classificationLabelId: ClassificationLabelIdSchema,
    tagIds: z.array(TagIdSchema),
    contentLanguage: LocaleSchema,
    textDirection: z.enum(['ltr', 'rtl', 'auto']),
    legalHold: z.boolean(),
    favourite: z.boolean(),
    ownerUserId: UserIdSchema,
    createdBy: UserIdSchema,
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    deletedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Upload / version DTOs
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/documents/upload/init` (multipart init). */
export const UploadInitRequestSchema = z
  .object({
    fileName: z.string().min(1).max(512),
    mimeType: z.string().min(1).max(128),
    size: ByteSizeSchema,
    documentTypeId: DocumentTypeIdSchema,
    folderId: FolderIdSchema.nullable().optional(),
    classificationLabelId: ClassificationLabelIdSchema,
    contentLanguage: LocaleSchema,
    textDirection: z.enum(['ltr', 'rtl', 'auto']).optional(),
    // Optional pre-computed hash for deduplication / integrity.
    precomputedHash: z
      .object({
        algorithm: HashAlgorithmSchema,
        digest: HashHexSchema,
      })
      .optional(),
    // Total parts for multipart upload (1 for single-shot).
    totalParts: z.number().int().min(1).max(10000).default(1),
  })
  .strict();

/** Response body for upload init. */
export const UploadInitResponseSchema = z
  .object({
    uploadId: z.string().min(1).max(256),
    documentId: DocumentIdSchema.optional(),
    // Pre-signed URLs for each part (S3 multipart).
    partUrls: z
      .array(
        z
          .object({
            partNumber: z.number().int().min(1).max(10000),
            url: z.string().url(),
            expiresAt: IsoDateStringSchema,
          })
          .strict(),
      )
      .max(10000),
    // Required hash algorithms the client must compute before complete.
    requiredHashAlgorithms: z.array(HashAlgorithmSchema),
  })
  .strict();

/** Request body for `POST /v1/documents/upload/:uploadId/complete`. */
export const UploadCompleteRequestSchema = z
  .object({
    uploadId: z.string().min(1).max(256),
    // Per-part ETags returned by S3.
    parts: z
      .array(
        z
          .object({
            partNumber: z.number().int().min(1).max(10000),
            etag: z.string().min(1).max(256),
            size: ByteSizeSchema,
          })
          .strict(),
      )
      .max(10000),
    // Final hash(es) computed client-side.
    hashes: z
      .array(
        z
          .object({
            algorithm: HashAlgorithmSchema,
            digest: HashHexSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

/** Response body for upload complete. */
export const UploadCompleteResponseSchema = z
  .object({
    document: DocumentSchema,
    version: DocumentVersionSchema,
  })
  .strict();

/** Request body for `POST /v1/documents/:id/versions` (create new version). */
export const CreateVersionRequestSchema = z
  .object({
    fileName: z.string().min(1).max(512),
    mimeType: z.string().min(1).max(128),
    size: ByteSizeSchema,
    storageKey: z.string().min(1).max(1024),
    hash: FileHashSchema,
    reasonKey: z.string().min(1).max(128).optional(),
    // If true, the previous head is locked for archival.
    lockPrevious: z.boolean().default(false),
  })
  .strict();

/** Request body for `PATCH /v1/documents/:id/metadata`. */
export const UpdateMetadataRequestSchema = z
  .object({
    metadata: z.array(MetadataValueSchema),
    reasonKey: z.string().min(1).max(128).optional(),
  })
  .strict();

/** Request body for `POST /v1/documents/search` (document search query). */
export const DocumentSearchQuerySchema = z
  .object({
    text: z.string().min(0).max(2048).nullable().optional(),
    folderId: FolderIdSchema.nullable().optional(),
    documentTypeIds: z.array(DocumentTypeIdSchema).optional(),
    classificationLabelIds: z.array(ClassificationLabelIdSchema).optional(),
    status: z.array(DocumentStatusSchema).optional(),
    tagIds: z.array(TagIdSchema).optional(),
    contentLanguage: LocaleSchema.optional(),
    createdAfter: IsoDateStringSchema.optional(),
    createdBefore: IsoDateStringSchema.optional(),
    updatedAfter: IsoDateStringSchema.optional(),
    updatedBefore: IsoDateStringSchema.optional(),
    limit: z.number().int().min(1).max(200).default(50),
    cursor: z.string().min(1).max(1024).nullable().optional(),
    sort: z
      .enum(['createdAt', 'updatedAt', 'title', 'relevance'])
      .default('updatedAt'),
    sortDirection: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// NOTE: `CreateShareLinkRequestSchema` lives in `./share.ts` to avoid an
// ambiguous re-export collision. See `share.ts` for the canonical schema.
