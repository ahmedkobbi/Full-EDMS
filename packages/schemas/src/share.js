"use strict";
/**
 * @smart-edms/schemas — sharing & external collaboration (spec §9.11)
 *
 * Zod schemas for: link create, update, revoke, access verify.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharePolicyResultSchema = exports.VerifyShareLinkAccessResponseSchema = exports.VerifyShareLinkAccessRequestSchema = exports.RevokeShareLinkRequestSchema = exports.UpdateShareLinkRequestSchema = exports.CreateShareLinkRequestSchema = exports.ShareAccessLogSchema = exports.ShareRecipientSchema = exports.ShareLinkSchema = exports.ShareRecipientKindSchema = exports.ShareRecipientStatusSchema = exports.SharePermissionSchema = exports.ShareRecipientIdSchema = exports.ShareLinkIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const document_1 = require("./document");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.ShareLinkIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ShareRecipientIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `SharePermission`. */
exports.SharePermissionSchema = zod_1.z.enum([
    'view',
    'view_with_watermark',
    'download',
    'comment',
    'annotate',
    'redact',
    'edit_metadata',
]);
/** `z.infer` === `ShareRecipientStatus`. */
exports.ShareRecipientStatusSchema = zod_1.z.enum([
    'pending',
    'verified',
    'accessed',
    'expired',
    'revoked',
]);
/** `z.infer` === `ShareRecipientKind`. */
exports.ShareRecipientKindSchema = zod_1.z.enum([
    'internal_user',
    'external_email',
    'anonymous',
]);
// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
/** `z.infer` matches `ShareLink`. */
exports.ShareLinkSchema = zod_1.z
    .object({
    id: exports.ShareLinkIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    documentId: document_1.DocumentIdSchema,
    versionId: common_1.UuidSchema.nullable(),
    createdBy: user_1.UserIdSchema,
    token: zod_1.z.string().min(16).max(256),
    permissions: zod_1.z.array(exports.SharePermissionSchema),
    passwordProtected: zod_1.z.boolean(),
    anonymousAllowed: zod_1.z.boolean(),
    downloadDisabled: zod_1.z.boolean(),
    watermarkEnabled: zod_1.z.boolean(),
    maxAccessCount: zod_1.z.number().int().min(1).nullable(),
    accessCount: zod_1.z.number().int().min(0),
    expiresAt: common_1.IsoDateStringSchema.nullable(),
    revokedAt: common_1.IsoDateStringSchema.nullable(),
    revokedBy: user_1.UserIdSchema.nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `ShareRecipient`. */
exports.ShareRecipientSchema = zod_1.z
    .object({
    id: exports.ShareRecipientIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    shareLinkId: exports.ShareLinkIdSchema,
    kind: exports.ShareRecipientKindSchema,
    email: zod_1.z.string().email().max(254).nullable(),
    internalUserId: user_1.UserIdSchema.nullable(),
    locale: zod_1.z.string().min(2).max(16).nullable(),
    status: exports.ShareRecipientStatusSchema,
    firstAccessedAt: common_1.IsoDateStringSchema.nullable(),
    lastAccessedAt: common_1.IsoDateStringSchema.nullable(),
    createdAt: common_1.IsoDateStringSchema,
})
    .strict();
/** `z.infer` matches `ShareAccessLog`. */
exports.ShareAccessLogSchema = zod_1.z
    .object({
    id: common_1.UuidSchema,
    tenantId: tenant_1.TenantIdSchema,
    shareLinkId: exports.ShareLinkIdSchema,
    recipientId: exports.ShareRecipientIdSchema.nullable(),
    action: zod_1.z.enum(['view', 'download', 'preview', 'password_check_failed']),
    ip: zod_1.z.string().min(1).max(64).nullable(),
    userAgent: zod_1.z.string().min(1).max(512).nullable(),
    occurredAt: common_1.IsoDateStringSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/documents/:id/share-links` (create link). */
exports.CreateShareLinkRequestSchema = zod_1.z
    .object({
    versionId: common_1.UuidSchema.nullable().optional(),
    permissions: zod_1.z.array(exports.SharePermissionSchema).min(1),
    passwordProtected: zod_1.z.boolean().default(false),
    password: zod_1.z.string().min(8).max(256).optional(),
    anonymousAllowed: zod_1.z.boolean().default(false),
    downloadDisabled: zod_1.z.boolean().default(false),
    watermarkEnabled: zod_1.z.boolean().default(true),
    maxAccessCount: zod_1.z.number().int().min(1).max(1000000).nullable().optional(),
    expiresInSeconds: zod_1.z.number().int().min(60).max(31536000).nullable().optional(),
    recipients: zod_1.z
        .array(zod_1.z
        .object({
        kind: exports.ShareRecipientKindSchema,
        email: zod_1.z.string().email().max(254).nullable().optional(),
        internalUserId: user_1.UserIdSchema.nullable().optional(),
    })
        .strict())
        .default([]),
})
    .strict();
/** Request body for `PATCH /v1/share-links/:id`. */
exports.UpdateShareLinkRequestSchema = zod_1.z
    .object({
    permissions: zod_1.z.array(exports.SharePermissionSchema).min(1).optional(),
    passwordProtected: zod_1.z.boolean().optional(),
    password: zod_1.z.string().min(8).max(256).optional(),
    downloadDisabled: zod_1.z.boolean().optional(),
    watermarkEnabled: zod_1.z.boolean().optional(),
    maxAccessCount: zod_1.z.number().int().min(1).max(1000000).nullable().optional(),
    expiresInSeconds: zod_1.z.number().int().min(60).max(31536000).nullable().optional(),
})
    .strict();
/** Request body for `DELETE /v1/share-links/:id` (revoke). */
exports.RevokeShareLinkRequestSchema = zod_1.z
    .object({
    reasonKey: zod_1.z.string().min(1).max(128).optional(),
})
    .strict();
/** Request body for `POST /v1/share-links/:token/verify` (access verify). */
exports.VerifyShareLinkAccessRequestSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(16).max(256),
    password: zod_1.z.string().min(1).max(256).optional(),
    // Email verification code for external recipients.
    verificationCode: zod_1.z.string().min(4).max(64).optional(),
})
    .strict();
/** Response body for access verify. */
exports.VerifyShareLinkAccessResponseSchema = zod_1.z
    .object({
    link: exports.ShareLinkSchema,
    document: zod_1.z.lazy(() => document_1.DocumentIdSchema),
    versionId: common_1.UuidSchema.nullable(),
    permissions: zod_1.z.array(exports.SharePermissionSchema),
    requiresPassword: zod_1.z.boolean(),
    requiresVerification: zod_1.z.boolean(),
    accessGranted: zod_1.z.boolean(),
    denialReasonKey: zod_1.z.string().min(1).max(128).nullable(),
})
    .strict();
/** `z.infer` matches `SharePolicyResult`. */
exports.SharePolicyResultSchema = zod_1.z
    .object({
    allowed: zod_1.z.boolean(),
    denialReasonKey: zod_1.z.string().min(1).max(128).nullable(),
    blockedByClassification: zod_1.z.boolean(),
    blockedByLegalHold: zod_1.z.boolean(),
    anonymousAllowed: zod_1.z.boolean(),
})
    .strict();
//# sourceMappingURL=share.js.map