/**
 * @smart-edms/schemas — identity & access management (spec §9.1, §15.1)
 *
 * Zod schemas for: create/update user, role assignment, group, invitation,
 * and preference update.
 */

import { z } from 'zod';
import type {
  GroupId,
  PermissionId,
  RoleId,
  ServiceAccountId,
  UserId,
} from '@smart-edms/types';
import {
  IsoDateStringSchema,
  LocaleSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { ThemePreferenceSchema } from './branding';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const UserIdSchema = UuidSchema.transform((v): UserId => v as UserId);
export const RoleIdSchema = UuidSchema.transform((v): RoleId => v as RoleId);
export const GroupIdSchema = UuidSchema.transform((v): GroupId => v as GroupId);
export const ServiceAccountIdSchema = UuidSchema.transform(
  (v): ServiceAccountId => v as ServiceAccountId,
);
export const PermissionIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z_]+(\.[a-z_]+)+$/, 'permission must follow domain.action format')
  .transform((v): PermissionId => v as PermissionId);

/** `z.infer` === `WeekStart`. */
export const WeekStartSchema = z.union([z.literal(0), z.literal(1), z.literal(6)]);

// ---------------------------------------------------------------------------
// Role / Group
// ---------------------------------------------------------------------------

/** `z.infer` matches `Role`. */
export const RoleSchema = z
  .object({
    id: RoleIdSchema,
    tenantId: TenantIdSchema,
    name: z.string().min(1).max(120),
    description: z.string().min(0).max(1000),
    permissions: z.array(PermissionIdSchema),
    systemRole: z.boolean(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/admin/roles`. */
export const CreateRoleRequestSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().min(0).max(1000),
    permissions: z.array(PermissionIdSchema),
  })
  .strict();

/** Request body for `PATCH /v1/admin/roles/:id`. */
export const UpdateRoleRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().min(0).max(1000).optional(),
    permissions: z.array(PermissionIdSchema).optional(),
  })
  .strict();

/** `z.infer` matches `Group`. */
export const GroupSchema = z
  .object({
    id: GroupIdSchema,
    tenantId: TenantIdSchema,
    name: z.string().min(1).max(120),
    description: z.string().min(0).max(1000),
    memberIds: z.array(UserIdSchema),
    roleIds: z.array(RoleIdSchema),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/admin/groups`. */
export const CreateGroupRequestSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().min(0).max(1000),
    memberIds: z.array(UserIdSchema).default([]),
    roleIds: z.array(RoleIdSchema).default([]),
  })
  .strict();

/** Request body for `PATCH /v1/admin/groups/:id`. */
export const UpdateGroupRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().min(0).max(1000).optional(),
    memberIds: z.array(UserIdSchema).optional(),
    roleIds: z.array(RoleIdSchema).optional(),
  })
  .strict();

/** Request body for `POST /v1/admin/users/:id/roles` (assign roles). */
export const AssignRolesRequestSchema = z
  .object({
    roleIds: z.array(RoleIdSchema),
    reasonKey: z.string().min(1).max(128).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// User preferences + entity
// ---------------------------------------------------------------------------

/** `z.infer` matches `UserPreference`. */
export const UserPreferenceSchema = z
  .object({
    userId: UserIdSchema,
    locale: LocaleSchema,
    timezone: z.string().min(1).max(64),
    theme: ThemePreferenceSchema,
    numberingSystem: z.string().min(1).max(32),
    weekStart: WeekStartSchema,
    reducedMotion: z.boolean(),
    notificationsEnabled: z.boolean(),
    emailNotificationsEnabled: z.boolean(),
    desktopNotificationsEnabled: z.boolean(),
    aiAssistantVisible: z.boolean(),
    tourRemindersEnabled: z.boolean(),
  })
  .strict();

/** Request body for `PATCH /v1/me/preferences`. */
export const UpdateUserPreferenceRequestSchema = UserPreferenceSchema.partial();

/** `z.infer` matches `MfaFactor`. */
export const MfaFactorSchema = z
  .object({
    id: UuidSchema,
    userId: UserIdSchema,
    kind: z.enum(['totp', 'webauthn', 'sms', 'email', 'backup_codes']),
    status: z.enum(['pending', 'active', 'disabled', 'revoked']),
    label: z.string().min(1).max(120),
    enrolledAt: IsoDateStringSchema,
    lastUsedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `MfaConfig`. */
export const MfaConfigSchema = z
  .object({
    enforcement: z.enum(['optional', 'mandatory', 'step_up']),
    factors: z.array(MfaFactorSchema),
    breakGlassAllowed: z.boolean(),
  })
  .strict();

/** `z.infer` matches `User`. */
export const UserSchema = z
  .object({
    id: UserIdSchema,
    tenantId: TenantIdSchema,
    email: z.string().email().max(254),
    displayName: z.string().min(1).max(200),
    preferredName: z.string().max(200).nullable(),
    status: z.enum(['active', 'suspended', 'invited', 'deactivated']),
    roleIds: z.array(RoleIdSchema),
    groupIds: z.array(GroupIdSchema),
    authProvider: z.enum([
      'local',
      'saml',
      'oidc',
      'ldap',
      'azuread',
      'google',
      'smartcard',
      'breakglass',
    ]),
    isServiceAccount: z.boolean(),
    mfa: MfaConfigSchema,
    preference: UserPreferenceSchema,
    firstLoginAt: IsoDateStringSchema.nullable(),
    lastLoginAt: IsoDateStringSchema.nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    deletedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** Request body for `POST /v1/admin/users`. */
export const CreateUserRequestSchema = z
  .object({
    email: z.string().email().max(254),
    displayName: z.string().min(1).max(200),
    preferredName: z.string().max(200).nullable().optional(),
    roleIds: z.array(RoleIdSchema),
    groupIds: z.array(GroupIdSchema).default([]),
    authProvider: z.enum([
      'local',
      'saml',
      'oidc',
      'ldap',
      'azuread',
      'google',
      'smartcard',
      'breakglass',
    ]),
    sendInvitation: z.boolean().default(true),
    locale: LocaleSchema.optional(),
  })
  .strict();

/** Request body for `PATCH /v1/admin/users/:id`. */
export const UpdateUserRequestSchema = z
  .object({
    displayName: z.string().min(1).max(200).optional(),
    preferredName: z.string().max(200).nullable().optional(),
    status: z.enum(['active', 'suspended', 'invited', 'deactivated']).optional(),
    roleIds: z.array(RoleIdSchema).optional(),
    groupIds: z.array(GroupIdSchema).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

/** `z.infer` matches `UserInvitation`. */
export const UserInvitationSchema = z
  .object({
    id: UuidSchema,
    tenantId: TenantIdSchema,
    email: z.string().email().max(254),
    roleIds: z.array(RoleIdSchema),
    invitedBy: UserIdSchema,
    status: z.enum(['pending', 'accepted', 'expired', 'revoked']),
    invitedAt: IsoDateStringSchema,
    expiresAt: IsoDateStringSchema,
    acceptedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** Request body for `POST /v1/admin/invitations`. */
export const CreateInvitationRequestSchema = z
  .object({
    email: z.string().email().max(254),
    roleIds: z.array(RoleIdSchema).min(1),
    expiresInSeconds: z.number().int().min(3600).max(604800).optional(),
  })
  .strict();
