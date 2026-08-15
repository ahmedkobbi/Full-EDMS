/**
 * @smart-edms/types — document management domain (spec §9.3, §9.5, §9.6, §15.1)
 *
 * Purpose: model documents, versions, metadata schemas and values, document
 * types, and cryptographic checksums. Documents are immutable per version
 * (spec §9.6); redactions produce a new derivative version.
 */

import type {
  ByteSize,
  HashAlgorithm,
  HashHex,
  ISODateString,
  Locale,
  UUID,
} from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { ClassificationLabelId } from './classification';

/** Branded document identifier. */
export type DocumentId = UUID & { readonly __document: 'DocumentId' };

/** Branded document-version identifier. */
export type DocumentVersionId = UUID & { readonly __documentVersion: 'DocumentVersionId' };

/** Branded metadata-schema identifier. */
export type MetadataSchemaId = UUID & { readonly __schema: 'MetadataSchemaId' };

/** Branded metadata-field identifier. */
export type MetadataFieldId = UUID & { readonly __field: 'MetadataFieldId' };

/** Branded document-type identifier. */
export type DocumentTypeId = UUID & { readonly __documentType: 'DocumentTypeId' };

/** Branded folder / workspace identifier. */
export type FolderId = UUID & { readonly __folder: 'FolderId' };

/** Branded tag identifier. */
export type TagId = UUID & { readonly __tag: 'TagId' };

// ---------------------------------------------------------------------------
// Checksums and hashes
// ---------------------------------------------------------------------------

/**
 * Cryptographic checksum of a binary blob. Per spec §9.3 every uploaded
 * file must have a cryptographic hash; per §9.6 every version must have a
 * checksum.
 */
export interface Checksum {
  readonly algorithm: HashAlgorithm;
  readonly digest: HashHex;
  /** Length of the hashed content in bytes; used to detect truncation. */
  readonly length: ByteSize;
}

/**
 * File hash envelope used by the deepfake / forgery detection pipeline
 * (spec §9.12) and by C2PA provenance manifests.
 */
export interface FileHash {
  readonly primary: Checksum;
  /** Optional secondary hash for cross-algorithm verification. */
  readonly secondary: Checksum | null;
  /** When the hash was computed (immutable). */
  readonly computedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Document types and folders
// ---------------------------------------------------------------------------

/**
 * Document type. Each type may bind a metadata schema (spec §9.5) and a
 * default retention schedule (spec §9.7).
 */
export interface DocumentType {
  readonly id: DocumentTypeId;
  readonly tenantId: TenantId;
  readonly code: string;
  /** Localised label key, rendered via `t()`. */
  readonly labelKey: string;
  readonly description: string;
  readonly metadataSchemaId: MetadataSchemaId | null;
  readonly defaultRetentionScheduleId: UUID | null;
  readonly allowedMimeTypes: readonly string[];
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Folder or workspace node. Folders form a tree; root folders have
 * `parentId === null`.
 */
export interface Folder {
  readonly id: FolderId;
  readonly tenantId: TenantId;
  readonly parentId: FolderId | null;
  readonly name: string;
  readonly createdBy: UserId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt: ISODateString | null;
}

// ---------------------------------------------------------------------------
// Metadata schema and values
// ---------------------------------------------------------------------------

/** Field types supported by the metadata schema engine (spec §9.5). */
export type MetadataFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'multiselect'
  | 'user'
  | 'group'
  | 'document_ref'
  | 'json';

/**
 * Validation rule applied to a metadata field. The `params` shape depends
 * on `kind`; see `MetadataValidationParams` below.
 */
export type MetadataValidationKind =
  | 'required'
  | 'min_length'
  | 'max_length'
  | 'min_value'
  | 'max_value'
  | 'pattern'
  | 'enum'
  | 'date_range';

/**
 * Typed validation parameter set. The discriminant is `kind`; downstream
 * code narrows by case.
 */
export type MetadataValidation =
  | { readonly kind: 'required' }
  | { readonly kind: 'min_length'; readonly value: number }
  | { readonly kind: 'max_length'; readonly value: number }
  | { readonly kind: 'min_value'; readonly value: number }
  | { readonly kind: 'max_value'; readonly value: number }
  | { readonly kind: 'pattern'; readonly regex: string }
  | { readonly kind: 'enum'; readonly allowedValues: readonly string[] }
  | { readonly kind: 'date_range'; readonly min: ISODateString | null; readonly max: ISODateString | null };

/**
 * Controlled vocabulary entry. Used by `enum` and `multiselect` fields.
 * `labelKey` is rendered via `t()`; `value` is the stable machine form.
 */
export interface ControlledVocabularyEntry {
  readonly value: string;
  readonly labelKey: string;
  /** Optional locale-specific display overrides for terminological nuance. */
  readonly displayNames?: Readonly<Record<string, string>>;
  readonly deprecated: boolean;
}

/**
 * Metadata field definition. Localised labels and descriptions are
 * referenced by message keys (spec §9.5).
 */
export interface MetadataField {
  readonly id: MetadataFieldId;
  readonly schemaId: MetadataSchemaId;
  readonly code: string;
  readonly type: MetadataFieldType;
  readonly labelKey: string;
  readonly descriptionKey: string | null;
  readonly required: boolean;
  readonly readonly: boolean;
  readonly validations: readonly MetadataValidation[];
  readonly vocabulary: readonly ControlledVocabularyEntry[];
  /** Sort order within the schema. */
  readonly order: number;
}

/**
 * Metadata schema bound to a document type. Schemas are versioned; once a
 * schema is published its fields are immutable (spec §9.5).
 */
export interface MetadataSchema {
  readonly id: MetadataSchemaId;
  readonly tenantId: TenantId;
  readonly version: number;
  readonly status: 'draft' | 'published' | 'archived';
  readonly fields: readonly MetadataField[];
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly publishedAt: ISODateString | null;
}

/**
 * Value for a single metadata field on a specific document version.
 * Typed as a discriminated union on `fieldType` to keep narrowing safe.
 */
export type MetadataValue =
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'string' | 'text'; readonly value: string }
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'number'; readonly value: number }
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'boolean'; readonly value: boolean }
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'date' | 'datetime'; readonly value: ISODateString }
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'enum'; readonly value: string }
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'multiselect'; readonly value: readonly string[] }
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'user' | 'group' | 'document_ref'; readonly value: UUID }
  | { readonly fieldId: MetadataFieldId; readonly fieldType: 'json'; readonly value: unknown };

// ---------------------------------------------------------------------------
// Document version
// ---------------------------------------------------------------------------

/**
 * Document version. Per spec §9.6 each version is immutable once committed.
 * The binary content is stored separately from the application database;
 * `storageKey` is the opaque reference into object storage.
 */
export interface DocumentVersion {
  readonly id: DocumentVersionId;
  readonly documentId: DocumentId;
  readonly tenantId: TenantId;
  /** 1-based version number. */
  readonly versionNumber: number;
  /** Original client-provided filename (Unicode-safe, spec §9.3). */
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: ByteSize;
  /** Storage-layer opaque key (S3 / MinIO / FS path). */
  readonly storageKey: string;
  readonly hash: FileHash;
  /** Whether this version is the current head. */
  readonly isHead: boolean;
  /** Whether this version was produced by a redaction export (§9.9). */
  readonly isDerivative: boolean;
  /** Optional reason-for-change note (spec §9.6). */
  readonly reasonKey: string | null;
  readonly createdBy: UserId;
  readonly createdAt: ISODateString;
  /** Locked flag prevents edits and overwrites (spec §9.3). */
  readonly locked: boolean;
  readonly lockedBy: UserId | null;
  readonly lockedAt: ISODateString | null;
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/** Document lifecycle status. */
export type DocumentStatus =
  | 'draft'
  | 'active'
  | 'checked_out'
  | 'declared_record'
  | 'archived'
  | 'disposed'
  | 'under_review';

/**
 * Top-level document entity. Carries the document type, current version,
 * classification, folder, tags, and lock state. Per spec §9.3 every document
 * carries a cryptographic hash (on its head version) and supports
 * localization metadata for title and direction.
 */
export interface Document {
  readonly id: DocumentId;
  readonly tenantId: TenantId;
  readonly documentTypeId: DocumentTypeId;
  /** Localised title; falls back to file name if absent. */
  readonly title: string;
  readonly description: string | null;
  readonly folderId: FolderId | null;
  readonly status: DocumentStatus;
  readonly currentVersionId: DocumentVersionId;
  readonly classificationLabelId: ClassificationLabelId;
  /** Tags attached for ad-hoc grouping (spec §9.3). */
  readonly tagIds: readonly TagId[];
  /** Content language of the document body (may differ from UI locale). */
  readonly contentLanguage: Locale;
  /** Text direction of the content: `ltr`, `rtl`, or `auto`. */
  readonly textDirection: 'ltr' | 'rtl' | 'auto';
  /** Whether the document is under legal hold (spec §9.7). */
  readonly legalHold: boolean;
  /** Whether the document is favourited by the current user (denormalised). */
  readonly favourite: boolean;
  /** Owner of the document; usually the uploader. */
  readonly ownerUserId: UserId;
  readonly createdBy: UserId;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt: ISODateString | null;
}

/**
 * Document comment. Per spec §9.3 comments are supported where appropriate.
 */
export interface DocumentComment {
  readonly id: UUID;
  readonly documentId: DocumentId;
  readonly tenantId: TenantId;
  readonly versionId: DocumentVersionId | null;
  readonly authorUserId: UserId;
  readonly body: string;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString | null;
  readonly deletedAt: ISODateString | null;
}

/**
 * Document checkout / lock state. Distinct from version-level lock; this
 * tracks an active checkout by a user for editing.
 */
export interface DocumentCheckout {
  readonly documentId: DocumentId;
  readonly checkedOutBy: UserId;
  readonly checkedOutAt: ISODateString;
  /** Expected check-in time; null means no deadline. */
  readonly expectedCheckInAt: ISODateString | null;
}
