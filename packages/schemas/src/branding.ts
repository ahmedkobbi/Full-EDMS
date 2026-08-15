/**
 * @smart-edms/schemas — branding & theme (spec §9.2, §16.6, §17)
 *
 * Zod schemas for: theme preference, color scheme, brand asset, token set,
 * branding bundle, and branding input DTO.
 */

import { z } from 'zod';
import { MandatoryLocaleSchema } from './common';
import { TenantIdSchema } from './tenant';

/** `z.infer` === `ThemePreference`. */
export const ThemePreferenceSchema = z.enum(['system', 'light', 'dark']);

/** `z.infer` === `ColorScheme`. */
export const ColorSchemeSchema = z.enum(['light', 'dark']);

/** `z.infer` === `BrandAssetKind`. */
export const BrandAssetKindSchema = z.enum([
  'logo_full',
  'logo_mark',
  'favicon',
  'email_header',
  'login_background',
  'report_header',
  'custom_svg',
]);

/** `z.infer` matches `BrandAsset`. */
export const BrandAssetSchema = z
  .object({
    id: z.string().min(1).max(128),
    tenantId: TenantIdSchema.nullable(),
    kind: BrandAssetKindSchema,
    mimeType: z.string().min(1).max(128),
    storageKey: z.string().min(1).max(512),
    themeVariant: ColorSchemeSchema.nullable(),
    altKey: z.string().min(1).max(128).nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

/** `z.infer` matches `BrandTokenSet`. */
export const BrandTokenSetSchema = z
  .object({
    tenantId: TenantIdSchema.nullable(),
    colorScheme: ColorSchemeSchema,
    colors: z.record(z.string(), z.array(z.string().min(1).max(64))),
    primaryColor: z.string().min(1).max(64),
    fontFamily: z.string().min(1).max(256),
    headingFontFamily: z.string().min(1).max(256),
    monospaceFontFamily: z.string().min(1).max(256),
    defaultRadius: z.string().min(1).max(16),
    headingsBold: z.boolean(),
    customCssAssetId: z.string().min(1).max(128).nullable(),
  })
  .strict();

/** `z.infer` matches `BrandingBundle`. */
export const BrandingBundleSchema = z
  .object({
    tenantId: TenantIdSchema.nullable(),
    displayName: z.string().min(1).max(200).nullable(),
    assets: z.array(BrandAssetSchema),
    lightTokens: BrandTokenSetSchema,
    darkTokens: BrandTokenSetSchema,
    locales: z.array(MandatoryLocaleSchema),
    enforcedColorScheme: ColorSchemeSchema.nullable(),
  })
  .strict();

/** Request body for `PATCH /v1/admin/branding`. `z.infer` matches `BrandingInput`. */
export const BrandingInputSchema = z
  .object({
    displayName: z.string().min(1).max(200).nullable().optional(),
    assetIds: z.array(z.string().min(1).max(128)).optional(),
    lightTokens: BrandTokenSetSchema.partial().optional(),
    darkTokens: BrandTokenSetSchema.partial().optional(),
    enforcedColorScheme: ColorSchemeSchema.nullable().optional(),
  })
  .strict();
