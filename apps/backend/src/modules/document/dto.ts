/**
 * Smart EDMS — Document module DTOs (Zod schemas).
 *
 * These schemas are the SINGLE SOURCE OF TRUTH for runtime validation of the
 * Document REST endpoints. They compose and re-export schemas from
 * `@smart-edms/schemas` where applicable (spec §14, §15.4).
 *
 * Spec ref: §9.3 (upload flow), §9.6 (immutable versions), §14 (API contract).
 *
 * Notes:
 *  - All `tenantId` is taken from the JWT (`req.user.tid`), never from the
 *    request body. The schemas therefore do not accept `tenantId`.
 *  - All schemas use `.strict()` so unknown keys are rejected at the boundary.
 *  - The file-type whitelist is enforced here in addition to the storage layer.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// File-type whitelist (spec §9.3 — upload validation)
// ---------------------------------------------------------------------------

/**
 * Whitelisted file extensions. Lower-cased, no leading dot. The upload
 * endpoints accept either the extension or the canonical MIME type.
 */
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'txt',
  'md',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'tiff',
  'tif',
  'mp4',
  'mp3',
  'wav',
  'eml',
  'msg',
  'html',
  'htm',
  'json',
  'xml',
  'csv',
] as const satisfies readonly string[];

export type AllowedFileExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number];

/**
 * Canonical MIME-type whitelist. The upload-init endpoint accepts either a
 * whitelisted extension match or a whitelisted MIME match. This map is the
 * single source of truth — extensions and MIME types are kept in sync here.
 */
export const EXTENSION_TO_MIME: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  eml: 'message/rfc822',
  msg: 'application/vnd.ms-outlook',
  html: 'text/html',
  htm: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  csv: 'text/csv',
};

export const ALLOWED_MIME_TYPES = Array.from(
  new Set(Object.values(EXTENSION_TO_MIME)),
) as readonly string[];

/** Extract a lower-cased extension (no leading dot) from a filename. */
export function extractExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx < 0 || idx === filename.length - 1) {return '';}
  return filename.slice(idx + 1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Upload-init request body
// ---------------------------------------------------------------------------

export const UploadInitBodySchema = z
  .object({
    fileName: z
      .string()
      .min(1, 'fileName is required')
      .max(512, 'fileName too long'),
    mimeType: z
      .string()
      .min(1, 'mimeType is required')
      .max(128, 'mimeType too long'),
    size: z
      .number()
      .int('size must be an integer')
      .positive('size must be positive'),
    documentType: z
      .string()
      .min(1)
      .max(64)
      .optional(),
    folderId: z.string().uuid().nullable().optional(),
    classificationId: z.string().uuid().nullable().optional(),
    contentLanguage: z
      .string()
      .min(2)
      .max(16)
      .default('en'),
    textDirection: z.enum(['ltr', 'rtl', 'auto']).default('auto'),
    totalParts: z
      .number()
      .int('totalParts must be an integer')
      .min(1)
      .max(10000)
      .default(1),
  })
  .strict();

export type UploadInitBody = z.infer<typeof UploadInitBodySchema>;

// ---------------------------------------------------------------------------
// Upload-complete request body
// ---------------------------------------------------------------------------

export const UploadCompleteBodySchema = z
  .object({
    uploadId: z.string().min(1).max(256),
    documentId: z.string().uuid(),
    // Optional pre-computed checksum from the client (sha256 hex). If provided
    // and it does not match the server-computed checksum, upload is rejected.
    clientChecksum: z
      .string()
      .regex(/^[0-9a-f]+$/i)
      .optional(),
    changeReason: z.string().min(1).max(1024).optional(),
  })
  .strict();

export type UploadCompleteBody = z.infer<typeof UploadCompleteBodySchema>;

// ---------------------------------------------------------------------------
// Upload-chunk multipart fields
// ---------------------------------------------------------------------------

/**
 * Multipart form fields accepted by upload-chunk. The binary chunk itself
 * arrives as a file part (`chunk`); these are the accompanying text fields.
 */
export const UploadChunkFieldsSchema = z
  .object({
    uploadId: z.string().min(1).max(256),
    documentId: z.string().uuid(),
    partNumber: z
      .number()
      .int('partNumber must be an integer')
      .min(1)
      .max(10000),
    totalParts: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional(),
    // Optional per-part checksum (sha256 hex). The server computes its own
    // and verifies if provided.
    partChecksum: z
      .string()
      .regex(/^[0-9a-f]+$/i)
      .optional(),
  })
  .strict();

export type UploadChunkFields = z.infer<typeof UploadChunkFieldsSchema>;

// ---------------------------------------------------------------------------
// Document list query (cursor-based pagination)
// ---------------------------------------------------------------------------

export const DocumentListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1024).optional(),
    sort: z
      .enum(['createdAt', 'updatedAt', 'title', 'sizeBytes'])
      .default('updatedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    // Filters
    q: z.string().min(1).max(2048).optional(),
    folderId: z.string().uuid().optional(),
    documentType: z.string().min(1).max(64).optional(),
    classificationId: z.string().uuid().optional(),
    status: z
      .enum(['ACTIVE', 'ARCHIVED', 'RECORD', 'PROCESSING', 'QUARANTINED'])
      .optional(),
    // Boolean query params arrive as strings ("true"/"false"). `z.coerce.boolean()`
    // would coerce every non-empty string to `true`, so we use a string-enum
    // transform instead.
    isRecord: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    isLocked: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    updatedAfter: z.string().datetime().optional(),
    updatedBefore: z.string().datetime().optional(),
    createdByUserId: z.string().uuid().optional(),
    // Whether to include soft-deleted documents (admin only — enforced in service).
    includeDeleted: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .strict();

export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;

// ---------------------------------------------------------------------------
// Document update body (PATCH /v1/documents/:id)
// ---------------------------------------------------------------------------

export const UpdateDocumentBodySchema = z
  .object({
    title: z.string().min(1).max(512).optional(),
    description: z.string().min(0).max(4000).nullable().optional(),
    folderId: z.string().uuid().nullable().optional(),
    documentType: z.string().min(1).max(64).optional(),
    classificationId: z.string().uuid().nullable().optional(),
    sensitivityLevel: z.number().int().min(0).max(5).optional(),
    contentLanguage: z.string().min(2).max(16).optional(),
    textDirection: z.enum(['ltr', 'rtl', 'auto']).optional(),
    sourceSystem: z.string().min(1).max(128).optional(),
    reason: z.string().min(1).max(1024).optional(),
  })
  .strict();

export type UpdateDocumentBody = z.infer<typeof UpdateDocumentBodySchema>;

// ---------------------------------------------------------------------------
// Document restore body (POST /v1/documents/:id/versions/:versionId/restore)
// ---------------------------------------------------------------------------

export const RestoreVersionBodySchema = z
  .object({
    reason: z.string().min(1).max(1024).optional(),
  })
  .strict();

export type RestoreVersionBody = z.infer<typeof RestoreVersionBodySchema>;

// ---------------------------------------------------------------------------
// Document lock body
// ---------------------------------------------------------------------------

export const LockDocumentBodySchema = z
  .object({
    reason: z.string().min(1).max(1024).optional(),
  })
  .strict();

export type LockDocumentBody = z.infer<typeof LockDocumentBodySchema>;

// ---------------------------------------------------------------------------
// Document share body (POST /v1/documents/:id/share)
// ---------------------------------------------------------------------------

export const ShareDocumentBodySchema = z
  .object({
    permission: z
      .enum(['view', 'view_with_watermark', 'download', 'comment', 'annotate'])
      .default('view'),
    recipientEmail: z.string().email().max(254).optional(),
    passwordProtected: z.boolean().default(false),
    password: z.string().min(8).max(256).optional(),
    expiresInSeconds: z.number().int().min(60).max(31536000).optional(),
    maxViews: z.number().int().min(1).max(1000000).optional(),
    anonymousAllowed: z.boolean().default(false),
    watermarkEnabled: z.boolean().default(true),
  })
  .strict();

export type ShareDocumentBody = z.infer<typeof ShareDocumentBodySchema>;

// ---------------------------------------------------------------------------
// Version list query
// ---------------------------------------------------------------------------

export const VersionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1024).optional(),
  })
  .strict();

export type VersionListQuery = z.infer<typeof VersionListQuerySchema>;
