/**
 * @smart-edms/schemas — sharing & external collaboration (spec §9.11)
 *
 * Zod schemas for: link create, update, revoke, access verify.
 */

import { z } from 'zod';
import type { ShareLinkId, ShareRecipientId } from '@smart-edms/types';
import { IsoDateStringSchema, UuidSchema } from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { DocumentIdSchema } from './document';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const ShareLinkIdSchema = UuidSchema.transform(
  (v): ShareLinkId => v as ShareLinkId,
);
export const ShareRecipientIdSchema = UuidSchema.transform(
  (v): ShareRecipientId => v as ShareRecipientId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `SharePermission`. */
export const SharePermissionSchema = z.enum([
  'view',
  'view_with_watermark',
  'download',
  'comment',
  'annotate',
  'redact',
  'edit_metadata',
]);

/** `z.infer` === `ShareRecipientStatus`. */
export const ShareRecipientStatusSchema = z.enum([
  'pending',
  'verified',
  'accessed',
  'expired',
  'revoked',
]);

/** `z.infer` === `ShareRecipientKind`. */
export const ShareRecipientKindSchema = z.enum([
  'internal_user',
  'external_email',
  'anonymous',
]);

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/** `z.infer` matches `ShareLink`. */
export const ShareLinkSchema = z
  .object({
    id: ShareLinkIdSchema,
    tenantId: TenantIdSchema,
    documentId: DocumentIdSchema,
    versionId: UuidSchema.nullable(),
    createdBy: UserIdSchema,
    token: z.string().min(16).max(256),
    permissions: z.array(SharePermissionSchema),
    passwordProtected: z.boolean(),
    anonymousAllowed: z.boolean(),
    downloadDisabled: z.boolean(),
    watermarkEnabled: z.boolean(),
    maxAccessCount: z.number().int().min(1).nullable(),
    accessCount: z.number().int().min(0),
    expiresAt: IsoDateStringSchema.nullable(),
    revokedAt: IsoDateStringSchema.nullable(),
    revokedBy: UserIdSchema.nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `ShareRecipient`. */
export const ShareRecipientSchema = z
  .object({
    id: ShareRecipientIdSchema,
    tenantId: TenantIdSchema,
    shareLinkId: ShareLinkIdSchema,
    kind: ShareRecipientKindSchema,
    email: z.string().email().max(254).nullable(),
    internalUserId: UserIdSchema.nullable(),
    locale: z.string().min(2).max(16).nullable(),
    status: ShareRecipientStatusSchema,
    firstAccessedAt: IsoDateStringSchema.nullable(),
    lastAccessedAt: IsoDateStringSchema.nullable(),
    createdAt: IsoDateStringSchema,
  })
  .strict();

/** `z.infer` matches `ShareAccessLog`. */
export const ShareAccessLogSchema = z
  .object({
    id: UuidSchema,
    tenantId: TenantIdSchema,
    shareLinkId: ShareLinkIdSchema,
    recipientId: ShareRecipientIdSchema.nullable(),
    action: z.enum(['view', 'download', 'preview', 'password_check_failed']),
    ip: z.string().min(1).max(64).nullable(),
    userAgent: z.string().min(1).max(512).nullable(),
    occurredAt: IsoDateStringSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/documents/:id/share-links` (create link). */
export const CreateShareLinkRequestSchema = z
  .object({
    versionId: UuidSchema.nullable().optional(),
    permissions: z.array(SharePermissionSchema).min(1),
    passwordProtected: z.boolean().default(false),
    password: z.string().min(8).max(256).optional(),
    anonymousAllowed: z.boolean().default(false),
    downloadDisabled: z.boolean().default(false),
    watermarkEnabled: z.boolean().default(true),
    maxAccessCount: z.number().int().min(1).max(1000000).nullable().optional(),
    expiresInSeconds: z.number().int().min(60).max(31536000).nullable().optional(),
    recipients: z
      .array(
        z
          .object({
            kind: ShareRecipientKindSchema,
            email: z.string().email().max(254).nullable().optional(),
            internalUserId: UserIdSchema.nullable().optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

/** Request body for `PATCH /v1/share-links/:id`. */
export const UpdateShareLinkRequestSchema = z
  .object({
    permissions: z.array(SharePermissionSchema).min(1).optional(),
    passwordProtected: z.boolean().optional(),
    password: z.string().min(8).max(256).optional(),
    downloadDisabled: z.boolean().optional(),
    watermarkEnabled: z.boolean().optional(),
    maxAccessCount: z.number().int().min(1).max(1000000).nullable().optional(),
    expiresInSeconds: z.number().int().min(60).max(31536000).nullable().optional(),
  })
  .strict();

/** Request body for `DELETE /v1/share-links/:id` (revoke). */
export const RevokeShareLinkRequestSchema = z
  .object({
    reasonKey: z.string().min(1).max(128).optional(),
  })
  .strict();

/** Request body for `POST /v1/share-links/:token/verify` (access verify). */
export const VerifyShareLinkAccessRequestSchema = z
  .object({
    token: z.string().min(16).max(256),
    password: z.string().min(1).max(256).optional(),
    // Email verification code for external recipients.
    verificationCode: z.string().min(4).max(64).optional(),
  })
  .strict();

/** Response body for access verify. */
export const VerifyShareLinkAccessResponseSchema = z
  .object({
    link: ShareLinkSchema,
    document: z.lazy(() => DocumentIdSchema),
    versionId: UuidSchema.nullable(),
    permissions: z.array(SharePermissionSchema),
    requiresPassword: z.boolean(),
    requiresVerification: z.boolean(),
    accessGranted: z.boolean(),
    denialReasonKey: z.string().min(1).max(128).nullable(),
  })
  .strict();

/** `z.infer` matches `SharePolicyResult`. */
export const SharePolicyResultSchema = z
  .object({
    allowed: z.boolean(),
    denialReasonKey: z.string().min(1).max(128).nullable(),
    blockedByClassification: z.boolean(),
    blockedByLegalHold: z.boolean(),
    anonymousAllowed: z.boolean(),
  })
  .strict();
