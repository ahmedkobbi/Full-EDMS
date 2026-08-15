"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTL_LOCALE = exports.LOCALES = void 0;
exports.getLocaleMeta = getLocaleMeta;
exports.isRtl = isRtl;
exports.defaultFlagIndicator = defaultFlagIndicator;
/**
 * The mandatory six locales. Order matches the spec §16.1 listing order and
 * is stable across releases — UIs that render this list verbatim should not
 * reorder it without coordination.
 */
exports.LOCALES = [
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
];
/**
 * Look up locale metadata by code. Throws if the code is not one of the six
 * mandatory locales — callers should validate user input before reaching
 * this function.
 */
function getLocaleMeta(code) {
    const meta = exports.LOCALES.find((l) => l.code === code);
    if (!meta) {
        throw new Error(`Unknown mandatory locale: ${code}`);
    }
    return meta;
}
/**
 * Returns `true` if the locale is right-to-left. Currently only `ar`.
 */
function isRtl(code) {
    return getLocaleMeta(code).direction === 'rtl';
}
/**
 * Returns the default flag indicator for a locale. Tenants override this via
 * `TenantBranding.localeFlags[locale]`; this function returns the spec default
 * when no override is supplied.
 */
function defaultFlagIndicator(code) {
    return getLocaleMeta(code).defaultFlagIndicator;
}
/**
 * Mapping from locale code to BCP 47 tag suitable for `Intl` APIs.
 */
exports.INTL_LOCALE = {
    en: 'en',
    fr: 'fr',
    ar: 'ar',
    ru: 'ru',
    'zh-CN': 'zh-CN',
    de: 'de',
};
//# sourceMappingURL=locales.js.map