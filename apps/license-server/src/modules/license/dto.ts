import { z } from 'zod';

/**
 * License issue / renew DTOs.
 *
 * Spec ref: §12.2 (license types & statuses), §12.3 (entitlements),
 * §12.5 (license payload), §15.2 (license entity).
 */

export const licenseTypeSchema = z.enum([
  'trial',
  'subscription',
  'perpetual',
  'enterprise',
  'evaluation',
  'partner',
]);

export const licenseEnvironmentSchema = z.enum(['production', 'staging', 'trial']);

export const issueLicenseSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  planId: z.string().uuid(),
  type: licenseTypeSchema,
  environment: licenseEnvironmentSchema.default('production'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  gracePeriodDays: z.number().int().min(0).max(3650).default(7),
  maxUsers: z.number().int().min(0).nullable().optional(),
  maxDevices: z.number().int().min(0).nullable().optional(),
  maxStorageBytes: z.number().int().min(0).nullable().optional(),
  maxDocuments: z.number().int().min(0).nullable().optional(),
  aiUsageAllowance: z.number().int().min(0).nullable().optional(),
  enabledModules: z.array(z.string()).optional(),
  enabledIntegrations: z.array(z.string()).optional(),
  features: z
    .array(
      z.object({
        code: z.string().min(1).max(64),
        enabled: z.boolean().default(true),
        limits: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
  offlineMode: z.boolean().default(true),
  hybridSync: z.boolean().default(false),
  supportLevel: z.string().max(32).default('standard'),
});

export type IssueLicenseInput = z.input<typeof issueLicenseSchema>;

export const renewLicenseSchema = z.object({
  newEndDate: z.string().datetime().nullable().optional(),
  extendDays: z.number().int().min(1).max(3650).optional(),
  updateLimits: z
    .object({
      maxUsers: z.number().int().min(0).nullable().optional(),
      maxDevices: z.number().int().min(0).nullable().optional(),
      maxStorageBytes: z.number().int().min(0).nullable().optional(),
      maxDocuments: z.number().int().min(0).nullable().optional(),
      aiUsageAllowance: z.number().int().min(0).nullable().optional(),
    })
    .optional(),
  updateModules: z
    .object({
      enabledModules: z.array(z.string()).optional(),
      enabledIntegrations: z.array(z.string()).optional(),
    })
    .optional(),
});

export type RenewLicenseInput = z.infer<typeof renewLicenseSchema>;

export const revokeLicenseSchema = z.object({
  reason: z.string().min(1).max(2000),
  fingerprint: z.string().max(128).optional(),
});

export type RevokeLicenseInput = z.infer<typeof revokeLicenseSchema>;

export const listLicensesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  cursor: z.string().optional(),
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  status: z.string().optional(),
  code: z.string().optional(),
});

export type ListLicensesInput = z.infer<typeof listLicensesSchema>;
