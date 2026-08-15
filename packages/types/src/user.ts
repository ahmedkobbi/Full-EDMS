/**
 * @smart-edms/types — identity and access management (spec §9.1, §15.1)
 *
 * Purpose: model users, roles, permissions, groups, sessions, MFA,
 * authentication providers, and device trust. Identity is tenant-scoped;
 * every entity carries a `tenantId` for row-level isolation.
 */

import type {
  ISODateString,
  Locale,
  Timezone,
  UUID,
} from './common';
// `AuditActorKind` is re-exported for ergonomic imports in modules that
// depend only on `./user`.
export type { AuditActorKind } from './common';
import type { TenantId } from './tenant';
import type { ThemePreference } from './branding';

/** Branded user identifier. */
export type UserId = UUID & { readonly __user: 'UserId' };

/** Branded role identifier. */
export type RoleId = UUID & { readonly __role: 'RoleId' };

/** Branded group identifier. */
export type GroupId = UUID & { readonly __group: 'GroupId' };

/** Branded session identifier. */
export type SessionId = UUID & { readonly __session: 'SessionId' };

/** Branded permission identifier (e.g. `documents.read`). */
export type PermissionId = string & { readonly __permission: 'PermissionId' };

/** Branded service-account identifier. */
export type ServiceAccountId = UUID & { readonly __serviceAccount: 'ServiceAccountId' };

/** Branded device / installation fingerprint. */
export type DeviceFingerprint = string & { readonly __device: 'DeviceFingerprint' };

// ---------------------------------------------------------------------------
// Authentication providers
// ---------------------------------------------------------------------------

/**
 * Authentication provider kinds supported by Smart EDMS. `local` covers the
 * built-in username + password (or email + password) flow.
 */
export type AuthProvider =
  | 'local'
  | 'saml'
  | 'oidc'
  | 'ldap'
  | 'azuread'
  | 'google'
  | 'smartcard'
  | 'breakglass';

/** Account status. Suspended accounts cannot authenticate. */
export type AccountStatus = 'active' | 'suspended' | 'invited' | 'deactivated';

// ---------------------------------------------------------------------------
// Roles, permissions, groups
// ---------------------------------------------------------------------------

/**
 * Permission scope. `tenant` covers the common case; `global` is reserved
 * for system-level permissions (e.g. license server, super-admin).
 */
export type PermissionScope = 'tenant' | 'global';

/**
 * A single permission entry. Permission strings follow `domain.action`
 * (e.g. `documents.read`, `workflows.approve`, `admin.users.write`).
 */
export interface Permission {
  readonly id: PermissionId;
  readonly scope: PermissionScope;
  readonly description: string;
  /** Whether this permission can be granted to non-admin roles. */
  readonly adminOnly: boolean;
}

/**
 * Role definition. Roles bundle a set of permissions and are assignable to
 * users and groups. The `systemRole` flag marks built-in roles that cannot
 * be deleted (e.g. `tenant-admin`, `records-manager`, `auditor`).
 */
export interface Role {
  readonly id: RoleId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly PermissionId[];
  readonly systemRole: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Group of users. Used for shared mailbox-style permissions and for
 * workflow routing (spec §9.8).
 */
export interface Group {
  readonly id: GroupId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly description: string;
  readonly memberIds: readonly UserId[];
  readonly roleIds: readonly RoleId[];
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// MFA
// ---------------------------------------------------------------------------

/** MFA factor kinds. TOTP is the default; WebAuthn / SMS are optional. */
export type MfaFactorKind = 'totp' | 'webauthn' | 'sms' | 'email' | 'backup_codes';

/** Status of an enrolled MFA factor. */
export type MfaFactorStatus = 'pending' | 'active' | 'disabled' | 'revoked';

/**
 * Enrolled MFA factor. Sensitive fields (TOTP secret, phone number) are
 * never returned by the API; only metadata needed for UX.
 */
export interface MfaFactor {
  readonly id: UUID;
  readonly userId: UserId;
  readonly kind: MfaFactorKind;
  readonly status: MfaFactorStatus;
  /** Display label, e.g. "Authenticator app" or "YubiKey #1". */
  readonly label: string;
  readonly enrolledAt: ISODateString;
  readonly lastUsedAt: ISODateString | null;
}

/**
 * MFA configuration envelope attached to a user. `required` is driven by
 * tenant policy; users cannot disable MFA when `enforcement` is `mandatory`.
 */
export interface MfaConfig {
  readonly enforcement: 'optional' | 'mandatory' | 'step_up';
  readonly factors: readonly MfaFactor[];
  /** Whether break-glass emergency access is permitted for this user. */
  readonly breakGlassAllowed: boolean;
}

// ---------------------------------------------------------------------------
// Device trust
// ---------------------------------------------------------------------------

/** Trust level assigned to a device or session. */
export type DeviceTrustLevel = 'untrusted' | 'managed' | 'trusted' | 'compliant';

/**
 * Device trust record. Used for risk-based authentication and for license
 * device-limit enforcement (spec §12.3, §9.1).
 */
export interface DeviceTrust {
  readonly id: UUID;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly fingerprint: DeviceFingerprint;
  readonly trustLevel: DeviceTrustLevel;
  /** Operating system family. */
  readonly os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web';
  readonly osVersion: string;
  readonly appVersion: string;
  /** User-agent string captured at first authentication. */
  readonly userAgent: string;
  readonly firstSeenAt: ISODateString;
  readonly lastSeenAt: ISODateString;
  /** Whether device-level attestation passed (TPM / Secure Enclave). */
  readonly attested: boolean;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** Session status tracked server-side (spec §9.1: session state must be server-verifiable). */
export type SessionStatus = 'active' | 'refreshing' | 'revoked' | 'expired';

/**
 * Server-side session record. Tokens are opaque references into this
 * record; revocation is performed by mutating the record, not by deleting
 * the token.
 */
export interface Session {
  readonly id: SessionId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly status: SessionStatus;
  readonly device: DeviceTrust;
  readonly authProvider: AuthProvider;
  /** Whether MFA was completed in this session. */
  readonly mfaCompleted: boolean;
  readonly issuedAt: ISODateString;
  readonly expiresAt: ISODateString;
  readonly lastRefreshedAt: ISODateString | null;
  /** IP address at issuance. Logged for audit; never returned to client. */
  readonly issuedFromIp: string;
  readonly revokedAt: ISODateString | null;
  readonly revokeReason: string | null;
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

// `ThemePreference` is imported from `./branding` to avoid a duplicate export;
// it is re-exported through the barrel for convenience.
export type { ThemePreference } from './branding';

/** First-day-of-week preference. `1` = Monday, `0` = Sunday, `6` = Saturday. */
export type WeekStart = 0 | 1 | 6;

/**
 * Per-user preferences. Stored tenant-scoped. Locale/timezone preferences
 * drive server-side formatting for emails and notifications.
 */
export interface UserPreference {
  readonly userId: UserId;
  readonly locale: Locale;
  readonly timezone: Timezone;
  readonly theme: ThemePreference;
  /** Numbering system: `latn`, `arab`, `arabext`, etc. (spec §16.8). */
  readonly numberingSystem: string;
  /** First day of week for calendar pickers. */
  readonly weekStart: WeekStart;
  /** Whether to follow OS-level reduced-motion preference. */
  readonly reducedMotion: boolean;
  /** Whether to subscribe to in-app notifications. */
  readonly notificationsEnabled: boolean;
  /** Whether to subscribe to email notifications. */
  readonly emailNotificationsEnabled: boolean;
  /** Whether desktop push notifications are enabled (Electron only). */
  readonly desktopNotificationsEnabled: boolean;
  /** Whether the AI Assistant bubble is visible. */
  readonly aiAssistantVisible: boolean;
  /** Tour invitation reminders; disableable per spec §10.15. */
  readonly tourRemindersEnabled: boolean;
}

// ---------------------------------------------------------------------------
// User entity
// ---------------------------------------------------------------------------

/**
 * Smart EDMS user. Email is unique per tenant. Status drives authentication
 * gating. The `firstLoginAt` field is used by the tour engine to initialise
 * onboarding state safely (spec §9.1).
 */
export interface User {
  readonly id: UserId;
  readonly tenantId: TenantId;
  readonly email: string;
  /** Display name shown in UI. Localised rendering uses the user's locale. */
  readonly displayName: string;
  /** Optional preferred name (e.g. Arabic name display). */
  readonly preferredName: string | null;
  readonly status: AccountStatus;
  readonly roleIds: readonly RoleId[];
  readonly groupIds: readonly GroupId[];
  readonly authProvider: AuthProvider;
  /** Whether the user is a service account (no human owner). */
  readonly isServiceAccount: boolean;
  readonly mfa: MfaConfig;
  readonly preference: UserPreference;
  readonly firstLoginAt: ISODateString | null;
  readonly lastLoginAt: ISODateString | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt: ISODateString | null;
}

// `AuditActor` is defined in `./audit` and re-exported through the barrel.
// It is intentionally not duplicated here to avoid an ambiguous re-export.
export type { AuditActor } from './audit';

/** Invitation status for onboarding flow. */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/** Invitation to join a tenant. */
export interface UserInvitation {
  readonly id: UUID;
  readonly tenantId: TenantId;
  readonly email: string;
  readonly roleIds: readonly RoleId[];
  readonly invitedBy: UserId;
  readonly status: InvitationStatus;
  readonly invitedAt: ISODateString;
  readonly expiresAt: ISODateString;
  readonly acceptedAt: ISODateString | null;
}
