/**
 * Smart EDMS marketing site — locale metadata (spec §7.5, §16.1).
 *
 * Re-exports the canonical locale list from `@smart-edms/i18n` and adds the
 * marketing-site-specific helpers:
 *   - `SUPPORTED_LOCALES` — the list of locales the marketing site renders.
 *   - `DEFAULT_LOCALE` — the locale used when no locale is detected.
 *   - `isSupportedLocale()` — type guard.
 *   - `localeDirection()` — 'ltr' or 'rtl' for the `<html dir>` attribute.
 *   - `htmlLang()` — BCP 47 tag for the `<html lang>` attribute.
 *
 * Marketing keeps its own copy of these helpers (rather than importing from
 * the Electron renderer or the license admin) because:
 *   1. Each app should be buildable independently.
 *   2. The marketing site uses Next.js App Router server components, so the
 *      helpers must be importable from server code without React hooks.
 */

import {
  isRtl,
  type LocaleMeta,
  LOCALES,
  type MandatoryLocaleCode,
} from '@smart-edms/i18n';

export type { LocaleMeta, MandatoryLocaleCode } from '@smart-edms/i18n';

/**
 * The six mandatory Smart EDMS locales, re-exported from the shared i18n
 * package so the marketing site stays in sync with the rest of the product.
 */
export const SUPPORTED_LOCALES: readonly LocaleMeta[] = LOCALES;

/**
 * The locale codes the marketing site accepts. Used by `middleware.ts` to
 * match the `[locale]` dynamic segment.
 */
export const SUPPORTED_LOCALE_CODES: readonly MandatoryLocaleCode[] = LOCALES.map(
  (l) => l.code,
);

/**
 * Default locale for the marketing site root (`/`). English is the source of
 * truth per spec §16.5.
 */
export const DEFAULT_LOCALE: MandatoryLocaleCode = 'en';

/**
 * Type guard: returns true if `value` is one of the six mandatory locale codes.
 */
export function isSupportedLocale(value: string | undefined | null): value is MandatoryLocaleCode {
  if (!value) {return false;}
  return SUPPORTED_LOCALE_CODES.includes(value as MandatoryLocaleCode);
}

/**
 * Returns the text direction for a locale. Only `ar` is RTL; everything else
 * is LTR.
 */
export function localeDirection(locale: MandatoryLocaleCode): 'ltr' | 'rtl' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

/**
 * Returns the BCP 47 tag suitable for the `<html lang>` attribute. This is the
 * locale code itself (`en`, `ar`, `zh-CN`, …).
 */
export function htmlLang(locale: MandatoryLocaleCode): string {
  return locale;
}

/**
 * Resolves a locale string from a request URL pathname. Returns the default
 * locale if the pathname doesn't start with a known locale code.
 */
export function resolveLocaleFromPathname(pathname: string): MandatoryLocaleCode {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (isSupportedLocale(first)) {return first;}
  return DEFAULT_LOCALE;
}

/**
 * Returns the canonical site URL (without trailing slash). Reads from
 * `NEXT_PUBLIC_SITE_URL` so it works in both Vercel preview and production
 * deployments. Falls back to `http://localhost:3000` in dev.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}
