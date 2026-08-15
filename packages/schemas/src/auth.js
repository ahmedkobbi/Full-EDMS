"use strict";
/**
 * @smart-edms/schemas — authentication & session (spec §9.1, §15.1)
 *
 * Zod schemas for: login, register, MFA enroll/verify, password reset,
 * token refresh, and session DTOs.
 *
 * Each `z.infer<typeof XSchema>` MUST match the corresponding DTO shape
 * consumed by the API. Where branded IDs are involved, the inferred type
 * carries the brand via the transform pattern (see `./common`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRevokeRequestSchema = exports.SessionListQuerySchema = exports.SessionSchema = exports.DeviceTrustSchema = exports.TokenRefreshResponseSchema = exports.TokenRefreshRequestSchema = exports.PasswordResetConfirmResponseSchema = exports.PasswordResetConfirmSchema = exports.PasswordResetRequestSchema = exports.MfaVerifyResponseSchema = exports.MfaVerifyRequestSchema = exports.MfaEnrollResponseSchema = exports.MfaEnrollRequestSchema = exports.RegisterResponseSchema = exports.RegisterRequestSchema = exports.LoginResponseSchema = exports.LoginRequestSchema = exports.AuthTokenSchema = exports.DeviceFingerprintSchema = exports.SessionStatusSchema = exports.DeviceTrustLevelSchema = exports.MfaFactorStatusSchema = exports.MfaFactorKindSchema = exports.AccountStatusSchema = exports.AuthProviderSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `AuthProvider`. */
exports.AuthProviderSchema = zod_1.z.enum([
    'local',
    'saml',
    'oidc',
    'ldap',
    'azuread',
    'google',
    'smartcard',
    'breakglass',
]);
/** `z.infer` === `AccountStatus`. */
exports.AccountStatusSchema = zod_1.z.enum([
    'active',
    'suspended',
    'invited',
    'deactivated',
]);
/** `z.infer` === `MfaFactorKind`. */
exports.MfaFactorKindSchema = zod_1.z.enum([
    'totp',
    'webauthn',
    'sms',
    'email',
    'backup_codes',
]);
/** `z.infer` === `MfaFactorStatus`. */
exports.MfaFactorStatusSchema = zod_1.z.enum([
    'pending',
    'active',
    'disabled',
    'revoked',
]);
/** `z.infer` === `DeviceTrustLevel`. */
exports.DeviceTrustLevelSchema = zod_1.z.enum([
    'untrusted',
    'managed',
    'trusted',
    'compliant',
]);
/** `z.infer` === `SessionStatus`. */
exports.SessionStatusSchema = zod_1.z.enum([
    'active',
    'refreshing',
    'revoked',
    'expired',
]);
/** `z.infer` === `DeviceFingerprint` (branded string). */
exports.DeviceFingerprintSchema = zod_1.z
    .string()
    .min(8)
    .max(256)
    .transform((v) => v);
/** `z.infer` === `AuthToken` (branded string). */
exports.AuthTokenSchema = zod_1.z
    .string()
    .min(1)
    .max(8192)
    .transform((v) => v);
// ---------------------------------------------------------------------------
// Login / register / password reset
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/auth/login`. */
exports.LoginRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(254),
    password: zod_1.z.string().min(1).max(256),
    tenantSlug: zod_1.z.string().min(1).max(64).optional(),
    deviceId: common_1.UuidSchema.optional(),
    deviceFingerprint: exports.DeviceFingerprintSchema.optional(),
    mfaChallengeResponse: zod_1.z.string().min(1).max(256).optional(),
    locale: zod_1.z.string().min(2).max(16).optional(),
})
    .strict();
/** Response body for `POST /v1/auth/login` (success). */
exports.LoginResponseSchema = zod_1.z
    .object({
    accessToken: exports.AuthTokenSchema,
    refreshToken: exports.AuthTokenSchema,
    expiresAt: common_1.IsoDateStringSchema,
    refreshExpiresAt: common_1.IsoDateStringSchema,
    tenantId: tenant_1.TenantIdSchema,
    userId: user_1.UserIdSchema,
    mfaRequired: zod_1.z.boolean(),
    mfaEnrollmentToken: zod_1.z.string().nullable().optional(),
    session: zod_1.z.lazy(() => exports.SessionSchema).optional(),
})
    .strict();
/** Request body for `POST /v1/auth/register` (self-service or admin invite accept). */
exports.RegisterRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(254),
    password: zod_1.z.string().min(12).max(256),
    displayName: zod_1.z.string().min(1).max(200),
    preferredName: zod_1.z.string().max(200).nullable().optional(),
    invitationToken: zod_1.z.string().min(1).max(512).optional(),
    tenantSlug: zod_1.z.string().min(1).max(64).optional(),
    locale: zod_1.z.string().min(2).max(16).optional(),
    acceptedTermsVersion: zod_1.z.string().min(1).max(32).optional(),
})
    .strict();
/** Response body for `POST /v1/auth/register`. */
exports.RegisterResponseSchema = zod_1.z
    .object({
    userId: user_1.UserIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    email: zod_1.z.string().email().max(254),
    status: exports.AccountStatusSchema,
    requiresEmailVerification: zod_1.z.boolean(),
    mfaEnrollmentRequired: zod_1.z.boolean(),
})
    .strict();
// ---------------------------------------------------------------------------
// MFA enroll / verify
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/auth/mfa/enroll`. */
exports.MfaEnrollRequestSchema = zod_1.z
    .object({
    kind: exports.MfaFactorKindSchema,
    label: zod_1.z.string().min(1).max(120),
    phoneNumber: zod_1.z.string().min(1).max(32).optional(),
})
    .strict();
/** Response body for `POST /v1/auth/mfa/enroll`. */
exports.MfaEnrollResponseSchema = zod_1.z
    .object({
    factorId: common_1.UuidSchema,
    kind: exports.MfaFactorKindSchema,
    status: exports.MfaFactorStatusSchema,
    // TOTP secret is shown ONCE at enrollment. Sensitive — never re-issued.
    totpSecret: zod_1.z.string().min(1).max(128).optional(),
    // QR-code URL for authenticator apps (otpauth://).
    qrCodeUri: zod_1.z.string().url().optional(),
    // WebAuthn registration challenge (base64url).
    webauthnChallenge: zod_1.z.string().min(1).max(2048).optional(),
    backupCodes: zod_1.z.array(zod_1.z.string().min(1).max(64)).max(20).optional(),
})
    .strict();
/** Request body for `POST /v1/auth/mfa/verify`. */
exports.MfaVerifyRequestSchema = zod_1.z
    .object({
    factorId: common_1.UuidSchema,
    code: zod_1.z.string().min(4).max(64),
})
    .strict();
/** Response body for `POST /v1/auth/mfa/verify`. */
exports.MfaVerifyResponseSchema = zod_1.z
    .object({
    factorId: common_1.UuidSchema,
    status: exports.MfaFactorStatusSchema,
    verified: zod_1.z.boolean(),
})
    .strict();
// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/auth/password-reset/request`. */
exports.PasswordResetRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(254),
    tenantSlug: zod_1.z.string().min(1).max(64).optional(),
})
    .strict();
/** Request body for `POST /v1/auth/password-reset/confirm`. */
exports.PasswordResetConfirmSchema = zod_1.z
    .object({
    resetToken: zod_1.z.string().min(1).max(512),
    newPassword: zod_1.z.string().min(12).max(256),
})
    .strict();
/** Response body for `POST /v1/auth/password-reset/confirm`. */
exports.PasswordResetConfirmResponseSchema = zod_1.z
    .object({
    success: zod_1.z.boolean(),
    userId: user_1.UserIdSchema.optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/auth/token/refresh`. */
exports.TokenRefreshRequestSchema = zod_1.z
    .object({
    refreshToken: exports.AuthTokenSchema,
})
    .strict();
/** Response body for `POST /v1/auth/token/refresh`. */
exports.TokenRefreshResponseSchema = zod_1.z
    .object({
    accessToken: exports.AuthTokenSchema,
    refreshToken: exports.AuthTokenSchema.optional(),
    expiresAt: common_1.IsoDateStringSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
/** `z.infer<typeof DeviceTrustSchema>` matches `DeviceTrust` from `@smart-edms/types`. */
exports.DeviceTrustSchema = zod_1.z
    .object({
    id: common_1.UuidSchema,
    tenantId: tenant_1.TenantIdSchema,
    userId: user_1.UserIdSchema,
    fingerprint: exports.DeviceFingerprintSchema,
    trustLevel: exports.DeviceTrustLevelSchema,
    os: zod_1.z.enum(['windows', 'macos', 'linux', 'ios', 'android', 'web']),
    osVersion: zod_1.z.string().min(1).max(64),
    appVersion: zod_1.z.string().min(1).max(64),
    userAgent: zod_1.z.string().min(1).max(512),
    firstSeenAt: common_1.IsoDateStringSchema,
    lastSeenAt: common_1.IsoDateStringSchema,
    attested: zod_1.z.boolean(),
})
    .strict();
/** `z.infer<typeof SessionSchema>` matches `Session` from `@smart-edms/types`. */
exports.SessionSchema = zod_1.z
    .object({
    id: common_1.UuidSchema.transform((v) => v),
    tenantId: tenant_1.TenantIdSchema,
    userId: user_1.UserIdSchema,
    status: exports.SessionStatusSchema,
    device: exports.DeviceTrustSchema,
    authProvider: exports.AuthProviderSchema,
    mfaCompleted: zod_1.z.boolean(),
    issuedAt: common_1.IsoDateStringSchema,
    expiresAt: common_1.IsoDateStringSchema,
    lastRefreshedAt: common_1.IsoDateStringSchema.nullable(),
    issuedFromIp: zod_1.z.string().min(1).max(64),
    revokedAt: common_1.IsoDateStringSchema.nullable(),
    revokeReason: zod_1.z.string().max(512).nullable(),
})
    .strict();
/** Request body for `GET /v1/auth/sessions` (list active sessions). */
exports.SessionListQuerySchema = zod_1.z
    .object({
    userId: user_1.UserIdSchema.optional(),
    status: exports.SessionStatusSchema.optional(),
})
    .strict();
/** Request body for `DELETE /v1/auth/sessions/:id` (revoke). */
exports.SessionRevokeRequestSchema = zod_1.z
    .object({
    reason: zod_1.z.string().min(1).max(512),
})
    .strict();
//# sourceMappingURL=auth.js.map