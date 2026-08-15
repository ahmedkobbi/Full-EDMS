/**
 * @smart-edms/i18n — fr translation: `locales` namespace.
 *
 * Source of truth: en/locales.ts
 * Translated from the English baseline.
 */

const locales = {
  title: 'Language',  // falls back to English
  subtitle: 'Choose your preferred language. Smart EDMS supports six languages out of the box.',  // falls back to English
  current: 'Current language: {{name}}',  // falls back to English
  change: 'Change language',  // falls back to English
  'change.description': 'Your choice is saved immediately and applies to all Smart EDMS apps.',  // falls back to English
  switching: 'Switching language…',  // falls back to English
  switched: 'Language switched to {{name}}.',  // falls back to English
  failed: 'Could not switch language. Please try again.',  // falls back to English
  'language.en.englishName': 'English',  // falls back to English
  'language.en.nativeName': 'English',  // falls back to English
  'language.en.description': 'International English (en-US for formatting).',  // falls back to English
  'language.fr.englishName': 'French',  // falls back to English
  'language.fr.nativeName': 'Français',  // falls back to English
  'language.fr.description': 'Français standard (fr-FR pour la mise en forme).',  // falls back to English
  'language.ar.englishName': 'Arabic',  // falls back to English
  'language.ar.nativeName': 'العربية',  // falls back to English
  'language.ar.description': 'Modern Standard Arabic with full right-to-left support.',  // falls back to English
  'language.ru.englishName': 'Russian',  // falls back to English
  'language.ru.nativeName': 'Русский',  // falls back to English
  'language.ru.description': 'Русский язык (ru-RU).',  // falls back to English
  'language.zh-CN.englishName': 'Simplified Chinese',  // falls back to English
  'language.zh-CN.nativeName': '简体中文',  // falls back to English
  'language.zh-CN.description': '简体中文（中国大陆）。',  // falls back to English
  'language.de.englishName': 'German',  // falls back to English
  'language.de.nativeName': 'Deutsch',  // falls back to English
  'language.de.description': 'Deutsch (de-DE).',  // falls back to English
  'flag.title': 'Flag indicator',  // falls back to English
  'flag.description': 'Each language has a default flag indicator. Tenants can override this.',  // falls back to English
  'flag.neutral': 'Neutral indicator (no country flag)',  // falls back to English
  'flag.neutral.description': 'Used by default for Arabic per Smart EDMS spec §4.5. Tenants may select a country flag instead.',  // falls back to English
  'flag.tenantOverride': 'Tenant override',  // falls back to English
  'flag.tenantOverride.description': 'If set, this overrides the default flag for this language across the tenant.',  // falls back to English
  'direction.title': 'Text direction',  // falls back to English
  'direction.ltr': 'Left to right',  // falls back to English
  'direction.rtl': 'Right to left',  // falls back to English
  'direction.description': 'Smart EDMS automatically sets the correct text direction. Arabic uses RTL; all other mandatory languages use LTR.',  // falls back to English
  'calendar.title': 'Calendar system',  // falls back to English
  'calendar.description': 'Choose the calendar system used for date display.',  // falls back to English
  'calendar.gregory': 'Gregorian',  // falls back to English
  'calendar.islamic': 'Islamic (Hijri)',  // falls back to English
  'calendar.islamic-civil': 'Islamic (civil)',  // falls back to English
  'calendar.persian': 'Persian (Solar Hijri)',  // falls back to English
  'calendar.chinese': 'Chinese',  // falls back to English
  'numbering.title': 'Numbering system',  // falls back to English
  'numbering.description': 'Choose how numbers are displayed.',  // falls back to English
  'numbering.latn': 'Latin (0123456789)',  // falls back to English
  'numbering.arab': 'Arabic-Indic (٠١٢٣٤٥٦٧٨٩)',  // falls back to English
  'plurals.title': 'Plural rules',  // falls back to English
  'plurals.description': 'Each language has its own plural rules. Smart EDMS follows the ICU plural rules standard.',  // falls back to English
  'plurals.en': 'English uses two plural forms: one and other.',  // falls back to English
  'plurals.fr': 'French uses two plural forms: one and other.',  // falls back to English
  'plurals.ar': 'Arabic uses six plural forms: zero, one, two, few, many, other.',  // falls back to English
  'plurals.ru': 'Russian uses four plural forms: one, few, many, other.',  // falls back to English
  'plurals.zh-CN': 'Chinese uses a single form: other.',  // falls back to English
  'plurals.de': 'German uses two plural forms: one and other.',  // falls back to English
  'preview.title': 'Preview',  // falls back to English
  'preview.subtitle': 'See how numbers, dates, and lists look in this language.',  // falls back to English
  'preview.date': 'Date: {{value}}',  // falls back to English
  'preview.number': 'Number: {{value}}',  // falls back to English
  'preview.currency': 'Currency: {{value}}',  // falls back to English
  'preview.fileSize': 'File size: {{value}}',  // falls back to English
  'preview.plural': 'Plural example: {{value}}',  // falls back to English
  'preview.list': 'List: {{value}}',  // falls back to English
  'request.title': 'Request a new language',  // falls back to English
  'request.subtitle': 'Need a language that’s not listed? Let us know.',  // falls back to English
  'request.field.language': 'Which language do you need?',  // falls back to English
  'request.field.speakers': 'Approximate number of users',  // falls back to English
  'request.field.notes': 'Additional notes',  // falls back to English
  'request.submit': 'Submit request',  // falls back to English
  'request.success': 'Thank you. We’ll be in touch about adding {{language}}.',  // falls back to English
} as const;

export default locales;
