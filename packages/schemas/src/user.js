"use strict";
/**
 * @smart-edms/schemas — identity & access management (spec §9.1, §15.1)
 *
 * Zod schemas for: create/update user, role assignment, group, invitation,
 * and preference update.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInvitationRequestSchema = exports.UserInvitationSchema = exports.UpdateUserRequestSchema = exports.CreateUserRequestSchema = exports.UserSchema = exports.MfaConfigSchema = exports.MfaFactorSchema = exports.UpdateUserPreferenceRequestSchema = exports.UserPreferenceSchema = exports.AssignRolesRequestSchema = exports.UpdateGroupRequestSchema = exports.CreateGroupRequestSchema = exports.GroupSchema = exports.UpdateRoleRequestSchema = exports.CreateRoleRequestSchema = exports.RoleSchema = exports.WeekStartSchema = exports.PermissionIdSchema = exports.ServiceAccountIdSchema = exports.GroupIdSchema = exports.RoleIdSchema = exports.UserIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const branding_1 = require("./branding");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.UserIdSchema = common_1.UuidSchema.transform((v) => v);
exports.RoleIdSchema = common_1.UuidSchema.transform((v) => v);
exports.GroupIdSchema = common_1.UuidSchema.transform((v) => v);
exports.ServiceAccountIdSchema = common_1.UuidSchema.transform((v) => v);
exports.PermissionIdSchema = zod_1.z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z_]+(\.[a-z_]+)+$/, 'permission must follow domain.action format')
    .transform((v) => v);
/** `z.infer` === `WeekStart`. */
exports.WeekStartSchema = zod_1.z.union([zod_1.z.literal(0), zod_1.z.literal(1), zod_1.z.literal(6)]);
// ---------------------------------------------------------------------------
// Role / Group
// ---------------------------------------------------------------------------
/** `z.infer` matches `Role`. */
exports.RoleSchema = zod_1.z
    .object({
    id: exports.RoleIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    name: zod_1.z.string().min(1).max(120),
    description: zod_1.z.string().min(0).max(1000),
    permissions: zod_1.z.array(exports.PermissionIdSchema),
    systemRole: zod_1.z.boolean(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/admin/roles`. */
exports.CreateRoleRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120),
    description: zod_1.z.string().min(0).max(1000),
    permissions: zod_1.z.array(exports.PermissionIdSchema),
})
    .strict();
/** Request body for `PATCH /v1/admin/roles/:id`. */
exports.UpdateRoleRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120).optional(),
    description: zod_1.z.string().min(0).max(1000).optional(),
    permissions: zod_1.z.array(exports.PermissionIdSchema).optional(),
})
    .strict();
/** `z.infer` matches `Group`. */
exports.GroupSchema = zod_1.z
    .object({
    id: exports.GroupIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    name: zod_1.z.string().min(1).max(120),
    description: zod_1.z.string().min(0).max(1000),
    memberIds: zod_1.z.array(exports.UserIdSchema),
    roleIds: zod_1.z.array(exports.RoleIdSchema),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/admin/groups`. */
exports.CreateGroupRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120),
    description: zod_1.z.string().min(0).max(1000),
    memberIds: zod_1.z.array(exports.UserIdSchema).default([]),
    roleIds: zod_1.z.array(exports.RoleIdSchema).default([]),
})
    .strict();
/** Request body for `PATCH /v1/admin/groups/:id`. */
exports.UpdateGroupRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(120).optional(),
    description: zod_1.z.string().min(0).max(1000).optional(),
    memberIds: zod_1.z.array(exports.UserIdSchema).optional(),
    roleIds: zod_1.z.array(exports.RoleIdSchema).optional(),
})
    .strict();
/** Request body for `POST /v1/admin/users/:id/roles` (assign roles). */
exports.AssignRolesRequestSchema = zod_1.z
    .object({
    roleIds: zod_1.z.array(exports.RoleIdSchema),
    reasonKey: zod_1.z.string().min(1).max(128).optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// User preferences + entity
// ---------------------------------------------------------------------------
/** `z.infer` matches `UserPreference`. */
exports.UserPreferenceSchema = zod_1.z
    .object({
    userId: exports.UserIdSchema,
    locale: common_1.LocaleSchema,
    timezone: zod_1.z.string().min(1).max(64),
    theme: branding_1.ThemePreferenceSchema,
    numberingSystem: zod_1.z.string().min(1).max(32),
    weekStart: exports.WeekStartSchema,
    reducedMotion: zod_1.z.boolean(),
    notificationsEnabled: zod_1.z.boolean(),
    emailNotificationsEnabled: zod_1.z.boolean(),
    desktopNotificationsEnabled: zod_1.z.boolean(),
    aiAssistantVisible: zod_1.z.boolean(),
    tourRemindersEnabled: zod_1.z.boolean(),
})
    .strict();
/** Request body for `PATCH /v1/me/preferences`. */
exports.UpdateUserPreferenceRequestSchema = exports.UserPreferenceSchema.partial();
/** `z.infer` matches `MfaFactor`. */
exports.MfaFactorSchema = zod_1.z
    .object({
    id: common_1.UuidSchema,
    userId: exports.UserIdSchema,
    kind: zod_1.z.enum(['totp', 'webauthn', 'sms', 'email', 'backup_codes']),
    status: zod_1.z.enum(['pending', 'active', 'disabled', 'revoked']),
    label: zod_1.z.string().min(1).max(120),
    enrolledAt: common_1.IsoDateStringSchema,
    lastUsedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** `z.infer` matches `MfaConfig`. */
exports.MfaConfigSchema = zod_1.z
    .object({
    enforcement: zod_1.z.enum(['optional', 'mandatory', 'step_up']),
    factors: zod_1.z.array(exports.MfaFactorSchema),
    breakGlassAllowed: zod_1.z.boolean(),
})
    .strict();
/** `z.infer` matches `User`. */
exports.UserSchema = zod_1.z
    .object({
    id: exports.UserIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    email: zod_1.z.string().email().max(254),
    displayName: zod_1.z.string().min(1).max(200),
    preferredName: zod_1.z.string().max(200).nullable(),
    status: zod_1.z.enum(['active', 'suspended', 'invited', 'deactivated']),
    roleIds: zod_1.z.array(exports.RoleIdSchema),
    groupIds: zod_1.z.array(exports.GroupIdSchema),
    authProvider: zod_1.z.enum([
        'local',
        'saml',
        'oidc',
        'ldap',
        'azuread',
        'google',
        'smartcard',
        'breakglass',
    ]),
    isServiceAccount: zod_1.z.boolean(),
    mfa: exports.MfaConfigSchema,
    preference: exports.UserPreferenceSchema,
    firstLoginAt: common_1.IsoDateStringSchema.nullable(),
    lastLoginAt: common_1.IsoDateStringSchema.nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    deletedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** Request body for `POST /v1/admin/users`. */
exports.CreateUserRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(254),
    displayName: zod_1.z.string().min(1).max(200),
    preferredName: zod_1.z.string().max(200).nullable().optional(),
    roleIds: zod_1.z.array(exports.RoleIdSchema),
    groupIds: zod_1.z.array(exports.GroupIdSchema).default([]),
    authProvider: zod_1.z.enum([
        'local',
        'saml',
        'oidc',
        'ldap',
        'azuread',
        'google',
        'smartcard',
        'breakglass',
    ]),
    sendInvitation: zod_1.z.boolean().default(true),
    locale: common_1.LocaleSchema.optional(),
})
    .strict();
/** Request body for `PATCH /v1/admin/users/:id`. */
exports.UpdateUserRequestSchema = zod_1.z
    .object({
    displayName: zod_1.z.string().min(1).max(200).optional(),
    preferredName: zod_1.z.string().max(200).nullable().optional(),
    status: zod_1.z.enum(['active', 'suspended', 'invited', 'deactivated']).optional(),
    roleIds: zod_1.z.array(exports.RoleIdSchema).optional(),
    groupIds: zod_1.z.array(exports.GroupIdSchema).optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
/** `z.infer` matches `UserInvitation`. */
exports.UserInvitationSchema = zod_1.z
    .object({
    id: common_1.UuidSchema,
    tenantId: tenant_1.TenantIdSchema,
    email: zod_1.z.string().email().max(254),
    roleIds: zod_1.z.array(exports.RoleIdSchema),
    invitedBy: exports.UserIdSchema,
    status: zod_1.z.enum(['pending', 'accepted', 'expired', 'revoked']),
    invitedAt: common_1.IsoDateStringSchema,
    expiresAt: common_1.IsoDateStringSchema,
    acceptedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** Request body for `POST /v1/admin/invitations`. */
exports.CreateInvitationRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().max(254),
    roleIds: zod_1.z.array(exports.RoleIdSchema).min(1),
    expiresInSeconds: zod_1.z.number().int().min(3600).max(604800).optional(),
})
    .strict();
//# sourceMappingURL=user.js.map