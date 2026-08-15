"use strict";
/**
 * @smart-edms/schemas — branding & theme (spec §9.2, §16.6, §17)
 *
 * Zod schemas for: theme preference, color scheme, brand asset, token set,
 * branding bundle, and branding input DTO.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandingInputSchema = exports.BrandingBundleSchema = exports.BrandTokenSetSchema = exports.BrandAssetSchema = exports.BrandAssetKindSchema = exports.ColorSchemeSchema = exports.ThemePreferenceSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
/** `z.infer` === `ThemePreference`. */
exports.ThemePreferenceSchema = zod_1.z.enum(['system', 'light', 'dark']);
/** `z.infer` === `ColorScheme`. */
exports.ColorSchemeSchema = zod_1.z.enum(['light', 'dark']);
/** `z.infer` === `BrandAssetKind`. */
exports.BrandAssetKindSchema = zod_1.z.enum([
    'logo_full',
    'logo_mark',
    'favicon',
    'email_header',
    'login_background',
    'report_header',
    'custom_svg',
]);
/** `z.infer` matches `BrandAsset`. */
exports.BrandAssetSchema = zod_1.z
    .object({
    id: zod_1.z.string().min(1).max(128),
    tenantId: tenant_1.TenantIdSchema.nullable(),
    kind: exports.BrandAssetKindSchema,
    mimeType: zod_1.z.string().min(1).max(128),
    storageKey: zod_1.z.string().min(1).max(512),
    themeVariant: exports.ColorSchemeSchema.nullable(),
    altKey: zod_1.z.string().min(1).max(128).nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
})
    .strict();
/** `z.infer` matches `BrandTokenSet`. */
exports.BrandTokenSetSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema.nullable(),
    colorScheme: exports.ColorSchemeSchema,
    colors: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string().min(1).max(64))),
    primaryColor: zod_1.z.string().min(1).max(64),
    fontFamily: zod_1.z.string().min(1).max(256),
    headingFontFamily: zod_1.z.string().min(1).max(256),
    monospaceFontFamily: zod_1.z.string().min(1).max(256),
    defaultRadius: zod_1.z.string().min(1).max(16),
    headingsBold: zod_1.z.boolean(),
    customCssAssetId: zod_1.z.string().min(1).max(128).nullable(),
})
    .strict();
/** `z.infer` matches `BrandingBundle`. */
exports.BrandingBundleSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema.nullable(),
    displayName: zod_1.z.string().min(1).max(200).nullable(),
    assets: zod_1.z.array(exports.BrandAssetSchema),
    lightTokens: exports.BrandTokenSetSchema,
    darkTokens: exports.BrandTokenSetSchema,
    locales: zod_1.z.array(common_1.MandatoryLocaleSchema),
    enforcedColorScheme: exports.ColorSchemeSchema.nullable(),
})
    .strict();
/** Request body for `PATCH /v1/admin/branding`. `z.infer` matches `BrandingInput`. */
exports.BrandingInputSchema = zod_1.z
    .object({
    displayName: zod_1.z.string().min(1).max(200).nullable().optional(),
    assetIds: zod_1.z.array(zod_1.z.string().min(1).max(128)).optional(),
    lightTokens: exports.BrandTokenSetSchema.partial().optional(),
    darkTokens: exports.BrandTokenSetSchema.partial().optional(),
    enforcedColorScheme: exports.ColorSchemeSchema.nullable().optional(),
})
    .strict();
//# sourceMappingURL=branding.js.map