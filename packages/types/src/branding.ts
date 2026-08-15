/**
 * @smart-edms/types — branding and theme (spec §9.2, §16.6, §17)
 *
 * Purpose: model theme preference, color scheme, brand assets, and the
 * design-token set used by the Mantine v7 theme provider. Branding is
 * optional per tenant (spec §9.2); when absent the default Smart EDMS
 * branding is used.
 */

import type { MandatoryLocale } from './common';
import type { TenantId } from './tenant';

/**
 * Theme preference (spec §16.6, §17). `system` follows the OS preference.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Resolved color scheme after applying `ThemePreference` against the OS
 * preference. Consumed by Mantine's `ColorSchemeProvider`.
 */
export type ColorScheme = 'light' | 'dark';

/**
 * Brand asset stored in object storage. The `assetId` is opaque; the
 * `kind` discriminator drives rendering.
 */
export type BrandAssetKind =
  | 'logo_full'
  | 'logo_mark'
  | 'favicon'
  | 'email_header'
  | 'login_background'
  | 'report_header'
  | 'custom_svg';

/**
 * Brand asset record.
 */
export interface BrandAsset {
  readonly id: string;
  readonly tenantId: TenantId | null;
  readonly kind: BrandAssetKind;
  /** MIME type, e.g. `image/svg+xml`. */
  readonly mimeType: string;
  /** Object-storage opaque key. */
  readonly storageKey: string;
  /** Light/dark variants; `null` means the asset is theme-agnostic. */
  readonly themeVariant: ColorScheme | null;
  /** Localised alt text key, for accessibility. */
  readonly altKey: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Design-token set used by the Mantine theme provider. All colours are
 * hex strings; the token names align with Mantine v7's theme keys.
 */
export interface BrandTokenSet {
  readonly tenantId: TenantId | null;
  readonly colorScheme: ColorScheme;
  readonly colors: Readonly<Record<string, readonly string[]>>;
  readonly primaryColor: string;
  readonly fontFamily: string;
  readonly headingFontFamily: string;
  readonly monospaceFontFamily: string;
  /** Border radius in `rem` applied to Mantine's `defaultRadius`. */
  readonly defaultRadius: string;
  /** Whether headings should use bold weight by default. */
  readonly headingsBold: boolean;
  /** Optional custom CSS asset id appended after the Mantine stylesheet. */
  readonly customCssAssetId: string | null;
}

/**
 * Branding bundle exposed to the client at boot. Combines the asset list
 * and the resolved token sets for both color schemes.
 */
export interface BrandingBundle {
  readonly tenantId: TenantId | null;
  readonly displayName: string | null;
  readonly assets: readonly BrandAsset[];
  readonly lightTokens: BrandTokenSet;
  readonly darkTokens: BrandTokenSet;
  /** Locales the bundle has been localised for. */
  readonly locales: readonly MandatoryLocale[];
  /** Whether the brand enforces a single color scheme (e.g. always dark). */
  readonly enforcedColorScheme: ColorScheme | null;
}

/**
 * Input payload accepted by `PATCH /v1/admin/branding`. All fields
 * optional; partial updates are merged server-side.
 */
export interface BrandingInput {
  readonly displayName?: string | null;
  readonly assetIds?: readonly string[];
  readonly lightTokens?: Partial<BrandTokenSet>;
  readonly darkTokens?: Partial<BrandTokenSet>;
  readonly enforcedColorScheme?: ColorScheme | null;
}
