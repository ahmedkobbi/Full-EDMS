/**
 * @smart-edms/i18n — locale metadata (spec §16.1, §16.6, §4.5)
 *
 * The six mandatory Smart EDMS locales and their UI metadata. The data here
 * drives the language switcher, the `<html lang="…" dir="…">` attributes,
 * Intl API locale selection, and the default flag indicator.
 *
 * Per spec §4.5, the Arabic flag indicator MUST default to a neutral
 * indicator (language-based, not country-based) and be overridable per
 * tenant. Other locales use a country flag emoji by default but, like
 * Arabic, the value is configurable per tenant (e.g. an international
 * organisation may prefer a neutral indicator for every locale).
 */

/**
 * Mandatory locale codes. Synchronised with `MandatoryLocale` from
 * `@smart-edms/types`. Duplicated here so the i18n package has no hard
 * runtime dependency on the types package (the types package is types-only
 * and may be absent in some build pipelines).
 */
export type MandatoryLocaleCode = 'en' | 'fr' | 'ar' | 'ru' | 'zh-CN' | 'de';

/**
 * Locale metadata used by the language switcher and `<html>` attributes.
 */
export interface LocaleMeta {
  /** BCP 47 short code, e.g. `en`, `zh-CN`. */
  readonly code: MandatoryLocaleCode;
  /** English display name, e.g. `Arabic`, `Simplified Chinese`. */
  readonly englishName: string;
  /** Native display name, e.g. `العربية`, `简体中文`. */
  readonly nativeName: string;
  /** Text direction. Only `ar` is RTL by default. */
  readonly direction: 'ltr' | 'rtl';
  /**
   * Default flag indicator. `neutral` means "do not show a country flag,
   * show a language glyph instead" — required for Arabic per spec §4.5.
   * Tenants may override this in `TenantBranding.localeFlags`.
   */
  readonly defaultFlagIndicator: 'neutral' | string;
  /** BCP 47 tag passed to `Intl` APIs (`Intl.DateTimeFormat`, etc.). */
  readonly intlLocale: string;
  /** Value for the `<html lang>` attribute. */
  readonly htmlLang: string;
  /** Default numbering system (spec §16.8). */
  readonly defaultNumberingSystem: 'latn' | 'arab';
  /** Default calendar (spec §16.8). */
  readonly defaultCalendar: 'gregory' | 'islamic' | 'islamic-civil' | 'persian' | 'chinese';
}

/**
 * The mandatory six locales. Order matches the spec §16.1 listing order and
 * is stable across releases — UIs that render this list verbatim should not
 * reorder it without coordination.
 */
export const LOCALES: readonly LocaleMeta[] = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    direction: 'ltr',
    defaultFlagIndicator: '🇬🇧',
    intlLocale: 'en',
    htmlLang: 'en',
    defaultNumberingSystem: 'latn',
    defaultCalendar: 'gregory',
  },
  {
    code: 'fr',
    englishName: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    defaultFlagIndicator: '🇫🇷',
    intlLocale: 'fr',
    htmlLang: 'fr',
    defaultNumberingSystem: 'latn',
    defaultCalendar: 'gregory',
  },
  {
    code: 'ar',
    englishName: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    defaultFlagIndicator: 'neutral',
    intlLocale: 'ar',
    htmlLang: 'ar',
    defaultNumberingSystem: 'arab',
    defaultCalendar: 'gregory',
  },
  {
    code: 'ru',
    englishName: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    defaultFlagIndicator: '🇷🇺',
    intlLocale: 'ru',
    htmlLang: 'ru',
    defaultNumberingSystem: 'latn',
    defaultCalendar: 'gregory',
  },
  {
    code: 'zh-CN',
    englishName: 'Simplified Chinese',
    nativeName: '简体中文',
    direction: 'ltr',
    defaultFlagIndicator: '🇨🇳',
    intlLocale: 'zh-CN',
    htmlLang: 'zh-CN',
    defaultNumberingSystem: 'latn',
    defaultCalendar: 'chinese',
  },
  {
    code: 'de',
    englishName: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    defaultFlagIndicator: '🇩🇪',
    intlLocale: 'de',
    htmlLang: 'de',
    defaultNumberingSystem: 'latn',
    defaultCalendar: 'gregory',
  },
] as const;

/**
 * Look up locale metadata by code. Throws if the code is not one of the six
 * mandatory locales — callers should validate user input before reaching
 * this function.
 */
export function getLocaleMeta(code: MandatoryLocaleCode): LocaleMeta {
  const meta = LOCALES.find((l) => l.code === code);
  if (!meta) {
    throw new Error(`Unknown mandatory locale: ${code}`);
  }
  return meta;
}

/**
 * Returns `true` if the locale is right-to-left. Currently only `ar`.
 */
export function isRtl(code: MandatoryLocaleCode): boolean {
  return getLocaleMeta(code).direction === 'rtl';
}

/**
 * Returns the default flag indicator for a locale. Tenants override this via
 * `TenantBranding.localeFlags[locale]`; this function returns the spec default
 * when no override is supplied.
 */
export function defaultFlagIndicator(code: MandatoryLocaleCode): 'neutral' | string {
  return getLocaleMeta(code).defaultFlagIndicator;
}

/**
 * Mapping from locale code to BCP 47 tag suitable for `Intl` APIs.
 */
export const INTL_LOCALE: Readonly<Record<MandatoryLocaleCode, string>> = {
  en: 'en',
  fr: 'fr',
  ar: 'ar',
  ru: 'ru',
  'zh-CN': 'zh-CN',
  de: 'de',
} as const;
