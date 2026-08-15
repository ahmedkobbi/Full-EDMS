/**
 * @smart-edms/types — internationalisation (spec §16)
 *
 * Purpose: model locales, locale metadata, translation namespaces, the
 * translation bundle shape, and ICU plural rules. Six mandatory locales
 * ship from day one (spec §16.1): en, fr, ar (RTL), ru, zh-CN, de.
 */

import type { Locale, MessageKey } from './common';
// `MandatoryLocale` and `LocaleDirection` are defined in `./common` and
// re-exported through the barrel; aliased here for self-contained imports.
export type { MandatoryLocale, LocaleDirection } from './common';
import type { LocaleDirection } from './common';

// ---------------------------------------------------------------------------
// Mandatory locales and metadata (spec §16.1, §16.6)
// ---------------------------------------------------------------------------

/**
 * The six mandatory Smart EDMS locales. Re-exported from `./common` so the
 * i18n module is self-contained for downstream consumers.
 */
// `MandatoryLocale` is re-exported above from `./common`.

/**
 * Locale direction. Arabic (`ar`) is RTL; all other mandatory locales are
 * LTR unless a future locale adds RTL (spec §16.1). Re-exported from
 * `./common`.
 */
// `LocaleDirection` is re-exported above from `./common`.

/**
 * Locale metadata used by the language switcher (spec §16.6).
 */
export interface LocaleMeta {
  readonly locale: Locale;
  /** BCP 47 tag, e.g. `ar`, `zh-CN`. */
  readonly tag: string;
  /** Native name, e.g. `العربية`, `简体中文`. */
  readonly nativeName: string;
  /** English name, e.g. `Arabic`, `Simplified Chinese`. */
  readonly englishName: string;
  readonly direction: LocaleDirection;
  /** Default numbering system (spec §16.8), e.g. `latn`, `arab`. */
  readonly defaultNumberingSystem: string;
  /** Default calendar system (spec §16.8). */
  readonly defaultCalendar: 'gregory' | 'islamic' | 'islamic-civil' | 'persian' | 'chinese';
  /** First day of week (`0` Sunday, `1` Monday, `6` Saturday). */
  readonly weekStart: 0 | 1 | 6;
}

/**
 * Translation namespaces (spec §16.4). Stable across releases; adding a
 * namespace is backwards-compatible but removing one is a breaking change.
 */
export type Namespace =
  | 'common'
  | 'auth'
  | 'documents'
  | 'metadata'
  | 'workflow'
  | 'sharing'
  | 'audit'
  | 'admin'
  | 'security'
  | 'errors'
  | 'notifications'
  | 'emails'
  | 'retention'
  | 'classification'
  | 'digitization'
  | 'provenance'
  | 'license'
  | 'billing'
  | 'marketing'
  | 'settings'
  | 'scanner'
  | 'locales'
  | 'tour.common'
  | 'tour.welcome'
  | 'tour.documents'
  | 'tour.search'
  | 'tour.workflows'
  | 'tour.audit'
  | 'tour.admin'
  | 'tour.license'
  | 'tour.scanner'
  | 'tour.collaboration'
  | 'tour.aiAssistant'
  | 'tour.checklist'
  | 'tour.marketing'
  | 'ai.common'
  | 'ai.bubble'
  | 'ai.errors'
  | 'ai.actions'
  | 'ai.disclaimer'
  | 'ai.citations';

/**
 * ICU plural form categories (spec §16.8). Each locale supports a subset;
 * Russian (`ru`) and Arabic (`ar`) use the full cardinal set including
 * `many` and `few`.
 */
export type IcuPlural =
  | 'zero'
  | 'one'
  | 'two'
  | 'few'
  | 'many'
  | 'other';

/**
 * ICU plural rule entry. The key is the plural category; the value is the
 * localised message (which may itself contain interpolation variables).
 */
export type IcuPluralRule = Readonly<Partial<Record<IcuPlural, string>>>;

/**
 * Translation bundle for a single namespace in a single locale. Keys are
 * dotted message identifiers (e.g. `errors.forbidden`); values are either
 * plain strings or ICU plural-rule objects.
 */
export type TranslationBundle = Readonly<Record<string, string | IcuPluralRule>>;

/**
 * Translation entry as stored in the database / glossary. Used by the
 * translation-management admin console (spec §9.15) and CI checks
 * (spec §16.5).
 */
export interface TranslationEntry {
  readonly id: string;
  readonly namespace: Namespace;
  readonly locale: Locale;
  readonly key: MessageKey;
  readonly value: string | IcuPluralRule;
  /** Whether the entry has been reviewed by a human translator. */
  readonly reviewed: boolean;
  /** Whether the entry is machine-translated. */
  readonly machineTranslated: boolean;
  /** Optional translator note (glossary). */
  readonly note: string | null;
  readonly updatedAt: string;
}

/**
 * Glossary term (spec §9.15 locale and translation management).
 * Used to enforce consistent terminology across locales.
 */
export interface GlossaryTerm {
  readonly id: string;
  readonly canonicalTerm: string;
  readonly definition: string;
  /** Per-locale preferred translations. */
  readonly translations: Readonly<Record<string, string>>;
  /** Whether the term must not be translated (e.g. product names). */
  readonly doNotTranslate: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Locale resource bundle returned to the client at boot. The client loads
 * the user's preferred locale and falls back to the tenant default.
 */
export interface LocaleResource {
  readonly locale: Locale;
  readonly direction: LocaleDirection;
  readonly bundles: Readonly<Record<Namespace, TranslationBundle>>;
  /** Loaded at runtime from the backend. */
  readonly loadedAt: string;
}

/**
 * Result of a CI translation-completeness check (spec §16.5).
 */
export interface I18nCheckReport {
  readonly locale: Locale;
  readonly missingKeys: readonly string[];
  readonly unusedKeys: readonly string[];
  readonly invalidInterpolationKeys: readonly string[];
  /** Keys missing plural categories required by this locale. */
  readonly pluralIssues: readonly string[];
  readonly ok: boolean;
}
