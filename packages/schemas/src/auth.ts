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

import { z } from 'zod';
import type {
  AuthToken,
  DeviceFingerprint,
  SessionId,
} from '@smart-edms/types';
import {
  IsoDateStringSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `AuthProvider`. */
export const AuthProviderSchema = z.enum([
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
export const AccountStatusSchema = z.enum([
  'active',
  'suspended',
  'invited',
  'deactivated',
]);

/** `z.infer` === `MfaFactorKind`. */
export const MfaFactorKindSchema = z.enum([
  'totp',
  'webauthn',
  'sms',
  'email',
  'backup_codes',
]);

/** `z.infer` === `MfaFactorStatus`. */
export const MfaFactorStatusSchema = z.enum([
  'pending',
  'active',
  'disabled',
  'revoked',
]);

/** `z.infer` === `DeviceTrustLevel`. */
export const DeviceTrustLevelSchema = z.enum([
  'untrusted',
  'managed',
  'trusted',
  'compliant',
]);

/** `z.infer` === `SessionStatus`. */
export const SessionStatusSchema = z.enum([
  'active',
  'refreshing',
  'revoked',
  'expired',
]);

/** `z.infer` === `DeviceFingerprint` (branded string). */
export const DeviceFingerprintSchema = z
  .string()
  .min(8)
  .max(256)
  .transform((v): DeviceFingerprint => v as DeviceFingerprint);

/** `z.infer` === `AuthToken` (branded string). */
export const AuthTokenSchema = z
  .string()
  .min(1)
  .max(8192)
  .transform((v): AuthToken => v as AuthToken);

// ---------------------------------------------------------------------------
// Login / register / password reset
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/auth/login`. */
export const LoginRequestSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(256),
    tenantSlug: z.string().min(1).max(64).optional(),
    deviceId: UuidSchema.optional(),
    deviceFingerprint: DeviceFingerprintSchema.optional(),
    mfaChallengeResponse: z.string().min(1).max(256).optional(),
    locale: z.string().min(2).max(16).optional(),
  })
  .strict();

/** Response body for `POST /v1/auth/login` (success). */
export const LoginResponseSchema = z
  .object({
    accessToken: AuthTokenSchema,
    refreshToken: AuthTokenSchema,
    expiresAt: IsoDateStringSchema,
    refreshExpiresAt: IsoDateStringSchema,
    tenantId: TenantIdSchema,
    userId: UserIdSchema,
    mfaRequired: z.boolean(),
    mfaEnrollmentToken: z.string().nullable().optional(),
    session: z.lazy(() => SessionSchema).optional(),
  })
  .strict();

/** Request body for `POST /v1/auth/register` (self-service or admin invite accept). */
export const RegisterRequestSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(256),
    displayName: z.string().min(1).max(200),
    preferredName: z.string().max(200).nullable().optional(),
    invitationToken: z.string().min(1).max(512).optional(),
    tenantSlug: z.string().min(1).max(64).optional(),
    locale: z.string().min(2).max(16).optional(),
    acceptedTermsVersion: z.string().min(1).max(32).optional(),
  })
  .strict();

/** Response body for `POST /v1/auth/register`. */
export const RegisterResponseSchema = z
  .object({
    userId: UserIdSchema,
    tenantId: TenantIdSchema,
    email: z.string().email().max(254),
    status: AccountStatusSchema,
    requiresEmailVerification: z.boolean(),
    mfaEnrollmentRequired: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// MFA enroll / verify
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/auth/mfa/enroll`. */
export const MfaEnrollRequestSchema = z
  .object({
    kind: MfaFactorKindSchema,
    label: z.string().min(1).max(120),
    phoneNumber: z.string().min(1).max(32).optional(),
  })
  .strict();

/** Response body for `POST /v1/auth/mfa/enroll`. */
export const MfaEnrollResponseSchema = z
  .object({
    factorId: UuidSchema,
    kind: MfaFactorKindSchema,
    status: MfaFactorStatusSchema,
    // TOTP secret is shown ONCE at enrollment. Sensitive — never re-issued.
    totpSecret: z.string().min(1).max(128).optional(),
    // QR-code URL for authenticator apps (otpauth://).
    qrCodeUri: z.string().url().optional(),
    // WebAuthn registration challenge (base64url).
    webauthnChallenge: z.string().min(1).max(2048).optional(),
    backupCodes: z.array(z.string().min(1).max(64)).max(20).optional(),
  })
  .strict();

/** Request body for `POST /v1/auth/mfa/verify`. */
export const MfaVerifyRequestSchema = z
  .object({
    factorId: UuidSchema,
    code: z.string().min(4).max(64),
  })
  .strict();

/** Response body for `POST /v1/auth/mfa/verify`. */
export const MfaVerifyResponseSchema = z
  .object({
    factorId: UuidSchema,
    status: MfaFactorStatusSchema,
    verified: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/auth/password-reset/request`. */
export const PasswordResetRequestSchema = z
  .object({
    email: z.string().email().max(254),
    tenantSlug: z.string().min(1).max(64).optional(),
  })
  .strict();

/** Request body for `POST /v1/auth/password-reset/confirm`. */
export const PasswordResetConfirmSchema = z
  .object({
    resetToken: z.string().min(1).max(512),
    newPassword: z.string().min(12).max(256),
  })
  .strict();

/** Response body for `POST /v1/auth/password-reset/confirm`. */
export const PasswordResetConfirmResponseSchema = z
  .object({
    success: z.boolean(),
    userId: UserIdSchema.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/auth/token/refresh`. */
export const TokenRefreshRequestSchema = z
  .object({
    refreshToken: AuthTokenSchema,
  })
  .strict();

/** Response body for `POST /v1/auth/token/refresh`. */
export const TokenRefreshResponseSchema = z
  .object({
    accessToken: AuthTokenSchema,
    refreshToken: AuthTokenSchema.optional(),
    expiresAt: IsoDateStringSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** `z.infer<typeof DeviceTrustSchema>` matches `DeviceTrust` from `@smart-edms/types`. */
export const DeviceTrustSchema = z
  .object({
    id: UuidSchema,
    tenantId: TenantIdSchema,
    userId: UserIdSchema,
    fingerprint: DeviceFingerprintSchema,
    trustLevel: DeviceTrustLevelSchema,
    os: z.enum(['windows', 'macos', 'linux', 'ios', 'android', 'web']),
    osVersion: z.string().min(1).max(64),
    appVersion: z.string().min(1).max(64),
    userAgent: z.string().min(1).max(512),
    firstSeenAt: IsoDateStringSchema,
    lastSeenAt: IsoDateStringSchema,
    attested: z.boolean(),
  })
  .strict();

/** `z.infer<typeof SessionSchema>` matches `Session` from `@smart-edms/types`. */
export const SessionSchema = z
  .object({
    id: UuidSchema.transform((v): SessionId => v as SessionId),
    tenantId: TenantIdSchema,
    userId: UserIdSchema,
    status: SessionStatusSchema,
    device: DeviceTrustSchema,
    authProvider: AuthProviderSchema,
    mfaCompleted: z.boolean(),
    issuedAt: IsoDateStringSchema,
    expiresAt: IsoDateStringSchema,
    lastRefreshedAt: IsoDateStringSchema.nullable(),
    issuedFromIp: z.string().min(1).max(64),
    revokedAt: IsoDateStringSchema.nullable(),
    revokeReason: z.string().max(512).nullable(),
  })
  .strict();

/** Request body for `GET /v1/auth/sessions` (list active sessions). */
export const SessionListQuerySchema = z
  .object({
    userId: UserIdSchema.optional(),
    status: SessionStatusSchema.optional(),
  })
  .strict();

/** Request body for `DELETE /v1/auth/sessions/:id` (revoke). */
export const SessionRevokeRequestSchema = z
  .object({
    reason: z.string().min(1).max(512),
  })
  .strict();
