"use strict";
/**
 * @smart-edms/schemas — multi-tenancy domain (spec §9.2, §15.3)
 *
 * Zod schemas for: create/update tenant, settings, branding, locale config,
 * and per-tenant flag configuration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantLocaleMetaSchema = exports.UpdateTenantRequestSchema = exports.CreateTenantResponseSchema = exports.CreateTenantRequestSchema = exports.TenantSchema = exports.TenantQuotaSchema = exports.FlagConfigSchema = exports.AiFlagConfigSchema = exports.TourFlagConfigSchema = exports.TenantBrandingSchema = exports.LocaleConfigSchema = exports.TenantStatusSchema = exports.DataResidencyRegionSchema = exports.TenantIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
/** `z.infer` === `TenantId`. */
exports.TenantIdSchema = common_1.UuidSchema.transform((v) => v);
/** `z.infer` === `DataResidencyRegion` (branded string). */
exports.DataResidencyRegionSchema = zod_1.z
    .string()
    .min(2)
    .max(64)
    .transform((v) => v);
/** `z.infer` === `TenantStatus`. */
exports.TenantStatusSchema = zod_1.z.enum([
    'active',
    'suspended',
    'decommissioned',
    'provisioning',
]);
// ---------------------------------------------------------------------------
// Locale + branding config
// ---------------------------------------------------------------------------
/** `z.infer` matches `LocaleConfig`. */
exports.LocaleConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.array(common_1.MandatoryLocaleSchema).min(1).max(6),
    default: common_1.MandatoryLocaleSchema,
    fallbackToDefault: zod_1.z.boolean(),
    arabicFlagAssetId: zod_1.z.string().min(1).max(128).nullable(),
    showNativeNames: zod_1.z.boolean(),
})
    .strict();
/** `z.infer` matches `TenantBranding`. */
exports.TenantBrandingSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean(),
    primaryColor: zod_1.z
        .string()
        .regex(/^#?[0-9a-fA-F]{6}$/, 'primaryColor must be a 6-digit hex color')
        .nullable(),
    logoAssetId: zod_1.z.string().min(1).max(128).nullable(),
    faviconAssetId: zod_1.z.string().min(1).max(128).nullable(),
    emailHeaderAssetId: zod_1.z.string().min(1).max(128).nullable(),
    displayName: zod_1.z.string().min(1).max(200).nullable(),
})
    .strict();
// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------
/** `z.infer` matches `TourFlagConfig`. */
exports.TourFlagConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean(),
    disabledTourCodes: zod_1.z.array(zod_1.z.string().min(1).max(64)),
    analyticsEnabled: zod_1.z.boolean(),
    allowFirstLoginTrigger: zod_1.z.boolean(),
})
    .strict();
/** `z.infer` matches `AiFlagConfig`. */
exports.AiFlagConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean(),
    allowedRoleIds: zod_1.z.array(zod_1.z.string().min(1).max(128)),
    allowedTools: zod_1.z.array(zod_1.z.string().min(1).max(64)),
    externalProviderAllowed: zod_1.z.boolean(),
    localModelAllowed: zod_1.z.boolean(),
    showCitations: zod_1.z.boolean(),
    requireDisclaimer: zod_1.z.boolean(),
    chatRetentionDays: zod_1.z.number().int().min(0).max(3650),
    dailyQuotaPerUser: zod_1.z.number().int().min(0).max(100000),
})
    .strict();
/** `z.infer` matches `FlagConfig`. */
exports.FlagConfigSchema = zod_1.z
    .object({
    tour: exports.TourFlagConfigSchema,
    ai: exports.AiFlagConfigSchema,
    externalSharingEnabled: zod_1.z.boolean(),
    anonymousShareLinksEnabled: zod_1.z.boolean(),
    crisisRoomEnabled: zod_1.z.boolean(),
    c2paEnforced: zod_1.z.boolean(),
    forgeryDetectionEnabled: zod_1.z.boolean(),
    predictiveLegalHoldEnabled: zod_1.z.boolean(),
    cryptoShreddingAllowed: zod_1.z.boolean(),
})
    .strict();
/** `z.infer` matches `TenantQuota`. */
exports.TenantQuotaSchema = zod_1.z
    .object({
    storageBytes: common_1.ByteSizeSchema,
    storageUsedBytes: common_1.ByteSizeSchema,
    maxUsers: zod_1.z.number().int().min(0),
    activeUsers: zod_1.z.number().int().min(0),
    maxDocuments: zod_1.z.number().int().min(0).nullable(),
    documentCount: zod_1.z.number().int().min(0),
})
    .strict();
// ---------------------------------------------------------------------------
// Tenant CRUD DTOs
// ---------------------------------------------------------------------------
/** `z.infer` matches `Tenant` (full entity). */
exports.TenantSchema = zod_1.z
    .object({
    id: exports.TenantIdSchema,
    slug: zod_1.z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
    legalName: zod_1.z.string().min(1).max(200),
    status: exports.TenantStatusSchema,
    dataResidency: exports.DataResidencyRegionSchema,
    locale: exports.LocaleConfigSchema,
    branding: exports.TenantBrandingSchema,
    flags: exports.FlagConfigSchema,
    quota: exports.TenantQuotaSchema,
    defaultTimezone: zod_1.z.string().min(1).max(64),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
    deletedAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
/** Request body for `POST /v1/admin/tenants` (create). */
exports.CreateTenantRequestSchema = zod_1.z
    .object({
    slug: zod_1.z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
    legalName: zod_1.z.string().min(1).max(200),
    dataResidency: exports.DataResidencyRegionSchema,
    locale: exports.LocaleConfigSchema,
    branding: exports.TenantBrandingSchema.optional(),
    flags: exports.FlagConfigSchema.optional(),
    defaultTimezone: zod_1.z.string().min(1).max(64),
    adminEmail: zod_1.z.string().email().max(254),
    adminDisplayName: zod_1.z.string().min(1).max(200),
})
    .strict();
/** Response body for tenant create. */
exports.CreateTenantResponseSchema = zod_1.z
    .object({
    tenant: exports.TenantSchema,
    adminUserId: common_1.UuidSchema,
    adminInvitationToken: zod_1.z.string().min(1).max(512),
})
    .strict();
/** Request body for `PATCH /v1/admin/tenants/:id`. `z.infer` matches `TenantSettingsInput`. */
exports.UpdateTenantRequestSchema = zod_1.z
    .object({
    legalName: zod_1.z.string().min(1).max(200).optional(),
    status: exports.TenantStatusSchema.optional(),
    dataResidency: exports.DataResidencyRegionSchema.optional(),
    locale: exports.LocaleConfigSchema.partial().optional(),
    branding: exports.TenantBrandingSchema.partial().optional(),
    flags: exports.FlagConfigSchema.partial().optional(),
    defaultTimezone: zod_1.z.string().min(1).max(64).optional(),
})
    .strict();
// ---------------------------------------------------------------------------
// Locale metadata
// ---------------------------------------------------------------------------
/** `z.infer` matches `TenantLocaleMeta`. */
exports.TenantLocaleMetaSchema = zod_1.z
    .object({
    locale: common_1.LocaleSchema,
    nativeName: zod_1.z.string().min(1).max(120),
    englishName: zod_1.z.string().min(1).max(120),
    direction: zod_1.z.enum(['ltr', 'rtl']),
})
    .strict();
//# sourceMappingURL=tenant.js.map