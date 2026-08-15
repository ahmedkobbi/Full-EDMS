/**
 * @smart-edms/schemas — multi-tenancy domain (spec §9.2, §15.3)
 *
 * Zod schemas for: create/update tenant, settings, branding, locale config,
 * and per-tenant flag configuration.
 */

import { z } from 'zod';
import type {
  DataResidencyRegion,
  TenantId,
} from '@smart-edms/types';
import {
  ByteSizeSchema,
  IsoDateStringSchema,
  LocaleSchema,
  MandatoryLocaleSchema,
  UuidSchema,
} from './common';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

/** `z.infer` === `TenantId`. */
export const TenantIdSchema = UuidSchema.transform(
  (v): TenantId => v as TenantId,
);

/** `z.infer` === `DataResidencyRegion` (branded string). */
export const DataResidencyRegionSchema = z
  .string()
  .min(2)
  .max(64)
  .transform((v): DataResidencyRegion => v as DataResidencyRegion);

/** `z.infer` === `TenantStatus`. */
export const TenantStatusSchema = z.enum([
  'active',
  'suspended',
  'decommissioned',
  'provisioning',
]);

// ---------------------------------------------------------------------------
// Locale + branding config
// ---------------------------------------------------------------------------

/** `z.infer` matches `LocaleConfig`. */
export const LocaleConfigSchema = z
  .object({
    enabled: z.array(MandatoryLocaleSchema).min(1).max(6),
    default: MandatoryLocaleSchema,
    fallbackToDefault: z.boolean(),
    arabicFlagAssetId: z.string().min(1).max(128).nullable(),
    showNativeNames: z.boolean(),
  })
  .strict();

/** `z.infer` matches `TenantBranding`. */
export const TenantBrandingSchema = z
  .object({
    enabled: z.boolean(),
    primaryColor: z
      .string()
      .regex(/^#?[0-9a-fA-F]{6}$/, 'primaryColor must be a 6-digit hex color')
      .nullable(),
    logoAssetId: z.string().min(1).max(128).nullable(),
    faviconAssetId: z.string().min(1).max(128).nullable(),
    emailHeaderAssetId: z.string().min(1).max(128).nullable(),
    displayName: z.string().min(1).max(200).nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

/** `z.infer` matches `TourFlagConfig`. */
export const TourFlagConfigSchema = z
  .object({
    enabled: z.boolean(),
    disabledTourCodes: z.array(z.string().min(1).max(64)),
    analyticsEnabled: z.boolean(),
    allowFirstLoginTrigger: z.boolean(),
  })
  .strict();

/** `z.infer` matches `AiFlagConfig`. */
export const AiFlagConfigSchema = z
  .object({
    enabled: z.boolean(),
    allowedRoleIds: z.array(z.string().min(1).max(128)),
    allowedTools: z.array(z.string().min(1).max(64)),
    externalProviderAllowed: z.boolean(),
    localModelAllowed: z.boolean(),
    showCitations: z.boolean(),
    requireDisclaimer: z.boolean(),
    chatRetentionDays: z.number().int().min(0).max(3650),
    dailyQuotaPerUser: z.number().int().min(0).max(100000),
  })
  .strict();

/** `z.infer` matches `FlagConfig`. */
export const FlagConfigSchema = z
  .object({
    tour: TourFlagConfigSchema,
    ai: AiFlagConfigSchema,
    externalSharingEnabled: z.boolean(),
    anonymousShareLinksEnabled: z.boolean(),
    crisisRoomEnabled: z.boolean(),
    c2paEnforced: z.boolean(),
    forgeryDetectionEnabled: z.boolean(),
    predictiveLegalHoldEnabled: z.boolean(),
    cryptoShreddingAllowed: z.boolean(),
  })
  .strict();

/** `z.infer` matches `TenantQuota`. */
export const TenantQuotaSchema = z
  .object({
    storageBytes: ByteSizeSchema,
    storageUsedBytes: ByteSizeSchema,
    maxUsers: z.number().int().min(0),
    activeUsers: z.number().int().min(0),
    maxDocuments: z.number().int().min(0).nullable(),
    documentCount: z.number().int().min(0),
  })
  .strict();

// ---------------------------------------------------------------------------
// Tenant CRUD DTOs
// ---------------------------------------------------------------------------

/** `z.infer` matches `Tenant` (full entity). */
export const TenantSchema = z
  .object({
    id: TenantIdSchema,
    slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
    legalName: z.string().min(1).max(200),
    status: TenantStatusSchema,
    dataResidency: DataResidencyRegionSchema,
    locale: LocaleConfigSchema,
    branding: TenantBrandingSchema,
    flags: FlagConfigSchema,
    quota: TenantQuotaSchema,
    defaultTimezone: z.string().min(1).max(64),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
    deletedAt: IsoDateStringSchema.nullable(),
  })
  .strict();

/** Request body for `POST /v1/admin/tenants` (create). */
export const CreateTenantRequestSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
    legalName: z.string().min(1).max(200),
    dataResidency: DataResidencyRegionSchema,
    locale: LocaleConfigSchema,
    branding: TenantBrandingSchema.optional(),
    flags: FlagConfigSchema.optional(),
    defaultTimezone: z.string().min(1).max(64),
    adminEmail: z.string().email().max(254),
    adminDisplayName: z.string().min(1).max(200),
  })
  .strict();

/** Response body for tenant create. */
export const CreateTenantResponseSchema = z
  .object({
    tenant: TenantSchema,
    adminUserId: UuidSchema,
    adminInvitationToken: z.string().min(1).max(512),
  })
  .strict();

/** Request body for `PATCH /v1/admin/tenants/:id`. `z.infer` matches `TenantSettingsInput`. */
export const UpdateTenantRequestSchema = z
  .object({
    legalName: z.string().min(1).max(200).optional(),
    status: TenantStatusSchema.optional(),
    dataResidency: DataResidencyRegionSchema.optional(),
    locale: LocaleConfigSchema.partial().optional(),
    branding: TenantBrandingSchema.partial().optional(),
    flags: FlagConfigSchema.partial().optional(),
    defaultTimezone: z.string().min(1).max(64).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Locale metadata
// ---------------------------------------------------------------------------

/** `z.infer` matches `TenantLocaleMeta`. */
export const TenantLocaleMetaSchema = z
  .object({
    locale: LocaleSchema,
    nativeName: z.string().min(1).max(120),
    englishName: z.string().min(1).max(120),
    direction: z.enum(['ltr', 'rtl']),
  })
  .strict();
