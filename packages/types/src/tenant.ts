/**
 * @smart-edms/types — multi-tenancy domain (spec §9.2, §15.3)
 *
 * Purpose: define tenant identity, settings, branding, locale configuration,
 * and per-tenant feature flags. Every tenant-owned record in the system
 * references a `TenantId` for row-level isolation.
 */

import type {
  ByteSize,
  ISODateString,
  Locale,
  MandatoryLocale,
  UUID,
} from './common';

export type TenantId = UUID

/** Tenant lifecycle status. */
export type TenantStatus = 'active' | 'suspended' | 'decommissioned' | 'provisioning';

/**
 * Geographic data-residency identifier. Used to route tenant data to the
 * correct on-premise region or sovereignty boundary (spec §9.2).
 */
export type DataResidencyRegion = string;


/**
 * Per-tenant locale configuration. Controls which UI locales are exposed
 * in the language switcher, what the default is, and how the Arabic flag
 * ambiguity is resolved (spec §16.6).
 */
export interface LocaleConfig {
  /** Locales enabled for this tenant. Must be a subset of mandatory locales. */
  readonly enabled: readonly MandatoryLocale[];
  /** Default locale applied on first login before user preference is loaded. */
  readonly default: MandatoryLocale;
  /** Whether to fall back to `default` when a translation key is missing. */
  readonly fallbackToDefault: boolean;
  /**
   * Optional override for the Arabic flag visual indicator. `null` means
   * use a neutral indicator; a tenant may supply a custom SVG asset id.
   */
  readonly arabicFlagAssetId: string | null;
  /** Whether the language switcher shows native locale names. */
  readonly showNativeNames: boolean;
}

/**
 * Tenant branding assets. Branding is optional per spec §9.2 / §9.15.
 * When `enabled` is false the default Smart EDMS branding is used.
 */
export interface TenantBranding {
  readonly enabled: boolean;
  /** Primary brand colour as a hex string, e.g. `#0A66C2`. */
  readonly primaryColor: string | null;
  readonly logoAssetId: string | null;
  readonly faviconAssetId: string | null;
  /** Custom email template header asset, if any. */
  readonly emailHeaderAssetId: string | null;
  /** Tenant display name shown in emails and login screens. */
  readonly displayName: string | null;
}

/**
 * Per-tenant tour configuration. Tours are tenant-scoped per spec §9.2 and
 * §10.21; administrators can disable specific tours per role or module.
 */
export interface TourFlagConfig {
  /** Master kill-switch. When false, no tour surfaces in the UI. */
  readonly enabled: boolean;
  /** Tour codes explicitly disabled for this tenant. */
  readonly disabledTourCodes: readonly string[];
  /** Whether tour analytics events are emitted (privacy-sensitive). */
  readonly analyticsEnabled: boolean;
  /** Whether first-login auto-trigger is allowed. */
  readonly allowFirstLoginTrigger: boolean;
}

/**
 * Per-tenant AI Assistant configuration. Mirrors §11.15 settings. AI is
 * denied by default — `enabled` MUST be explicitly set to true by an admin.
 */
export interface AiFlagConfig {
  /** Master enable. Defaults to false (spec §9.1, §11.4). */
  readonly enabled: boolean;
  /** Roles permitted to use the AI Assistant. */
  readonly allowedRoleIds: readonly string[];
  /** Tool names whitelisted for this tenant (see ai.ts `ToolName`). */
  readonly allowedTools: readonly string[];
  /** Whether an external AI provider may be invoked (spec §11.11). */
  readonly externalProviderAllowed: boolean;
  /** Whether local/self-hosted AI mode is enabled. */
  readonly localModelAllowed: boolean;
  /** Whether citations are shown to end users. */
  readonly showCitations: boolean;
  /** Whether the disclaimer banner is rendered in the bubble. */
  readonly requireDisclaimer: boolean;
  /** Retention period for chat history, in days. `0` means no retention. */
  readonly chatRetentionDays: number;
  /** Daily AI request quota per user. */
  readonly dailyQuotaPerUser: number;
}

/**
 * Feature flag bundle scoped to a tenant. Each subsystem reads its own
 * sub-config so that a tenant admin can toggle behaviour without affecting
 * cross-tenant defaults.
 */
export interface FlagConfig {
  readonly tour: TourFlagConfig;
  readonly ai: AiFlagConfig;
  /** Whether external sharing is permitted (denied by default, §9.11). */
  readonly externalSharingEnabled: boolean;
  /** Whether anonymous share links are permitted (strongly restricted). */
  readonly anonymousShareLinksEnabled: boolean;
  /** Whether crisis response room module is licensed and visible. */
  readonly crisisRoomEnabled: boolean;
  /** Whether C2PA provenance verification is enforced on ingest. */
  readonly c2paEnforced: boolean;
  /** Whether deepfake / forgery detection pipeline is enabled. */
  readonly forgeryDetectionEnabled: boolean;
  /** Whether predictive legal-hold suggestions are surfaced. */
  readonly predictiveLegalHoldEnabled: boolean;
  /** Whether crypto-shredding is permitted for privacy deletion. */
  readonly cryptoShreddingAllowed: boolean;
}

/**
 * Tenant-scoped storage and quota envelope.
 */
export interface TenantQuota {
  readonly storageBytes: ByteSize;
  readonly storageUsedBytes: ByteSize;
  readonly maxUsers: number;
  readonly activeUsers: number;
  readonly maxDocuments: number | null;
  readonly documentCount: number;
}

/**
 * Top-level tenant entity. Every other tenant-owned record joins on `id`.
 */
export interface Tenant {
  readonly id: TenantId;
  /** Stable, human-readable slug used in URLs and audit logs. */
  readonly slug: string;
  readonly legalName: string;
  readonly status: TenantStatus;
  /** Residency boundary. Cross-region routing is denied by default. */
  readonly dataResidency: DataResidencyRegion;
  readonly locale: LocaleConfig;
  readonly branding: TenantBranding;
  readonly flags: FlagConfig;
  readonly quota: TenantQuota;
  /** Time zone used for default scheduling when a user has no preference. */
  readonly defaultTimezone: string;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  /** Soft-delete marker (spec §15.5). Hard delete is policy-controlled. */
  readonly deletedAt: ISODateString | null;
}

/**
 * Tenant settings payload accepted by `PATCH /v1/admin/tenants/:id`.
 * All fields optional; partial updates are merged server-side.
 */
export type TenantSettingsInput = {
  readonly legalName?: string;
  readonly status?: TenantStatus;
  readonly dataResidency?: DataResidencyRegion;
  readonly locale?: Partial<LocaleConfig>;
  readonly branding?: Partial<TenantBranding>;
  readonly flags?: Partial<FlagConfig>;
  readonly defaultTimezone?: string;
};

/** Convenience alias used by other domains when typing a `tenantId` field. */
export type TenantRef = TenantId;

/**
 * Locale metadata used by the language switcher. Distinct from `LocaleConfig`
 * (which is tenant policy) — this describes each available locale itself.
 */
export interface TenantLocaleMeta {
  readonly locale: Locale;
  readonly nativeName: string;
  readonly englishName: string;
  readonly direction: 'ltr' | 'rtl';
}
