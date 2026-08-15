/**
 * @smart-edms/i18n — English baseline: `locales` namespace (spec §16.4, §16.6)
 *
 * Display strings for the language switcher. Each mandatory locale has a
 * display name, native name, and short description. Note that the flag
 * indicator for Arabic defaults to `neutral` per spec §4.5.
 */

const locales = {
  'title': 'Language',
  'subtitle': 'Choose your preferred language. Smart EDMS supports six languages out of the box.',
  'current': 'Current language: {{name}}',
  'change': 'Change language',
  'change.description': 'Your choice is saved immediately and applies to all Smart EDMS apps.',
  'switching': 'Switching language…',
  'switched': 'Language switched to {{name}}.',
  'failed': 'Could not switch language. Please try again.',

  'language.en.englishName': 'English',
  'language.en.nativeName': 'English',
  'language.en.description': 'International English (en-US for formatting).',

  'language.fr.englishName': 'French',
  'language.fr.nativeName': 'Français',
  'language.fr.description': 'Français standard (fr-FR pour la mise en forme).',

  'language.ar.englishName': 'Arabic',
  'language.ar.nativeName': 'العربية',
  'language.ar.description': 'Modern Standard Arabic with full right-to-left support.',

  'language.ru.englishName': 'Russian',
  'language.ru.nativeName': 'Русский',
  'language.ru.description': 'Русский язык (ru-RU).',

  'language.zh-CN.englishName': 'Simplified Chinese',
  'language.zh-CN.nativeName': '简体中文',
  'language.zh-CN.description': '简体中文（中国大陆）。',

  'language.de.englishName': 'German',
  'language.de.nativeName': 'Deutsch',
  'language.de.description': 'Deutsch (de-DE).',

  'flag.title': 'Flag indicator',
  'flag.description': 'Each language has a default flag indicator. Tenants can override this.',
  'flag.neutral': 'Neutral indicator (no country flag)',
  'flag.neutral.description': 'Used by default for Arabic per Smart EDMS spec §4.5. Tenants may select a country flag instead.',
  'flag.tenantOverride': 'Tenant override',
  'flag.tenantOverride.description': 'If set, this overrides the default flag for this language across the tenant.',

  'direction.title': 'Text direction',
  'direction.ltr': 'Left to right',
  'direction.rtl': 'Right to left',
  'direction.description': 'Smart EDMS automatically sets the correct text direction. Arabic uses RTL; all other mandatory languages use LTR.',

  'calendar.title': 'Calendar system',
  'calendar.description': 'Choose the calendar system used for date display.',
  'calendar.gregory': 'Gregorian',
  'calendar.islamic': 'Islamic (Hijri)',
  'calendar.islamic-civil': 'Islamic (civil)',
  'calendar.persian': 'Persian (Solar Hijri)',
  'calendar.chinese': 'Chinese',

  'numbering.title': 'Numbering system',
  'numbering.description': 'Choose how numbers are displayed.',
  'numbering.latn': 'Latin (0123456789)',
  'numbering.arab': 'Arabic-Indic (٠١٢٣٤٥٦٧٨٩)',

  'plurals.title': 'Plural rules',
  'plurals.description': 'Each language has its own plural rules. Smart EDMS follows the ICU plural rules standard.',
  'plurals.en': 'English uses two plural forms: one and other.',
  'plurals.fr': 'French uses two plural forms: one and other.',
  'plurals.ar': 'Arabic uses six plural forms: zero, one, two, few, many, other.',
  'plurals.ru': 'Russian uses four plural forms: one, few, many, other.',
  'plurals.zh-CN': 'Chinese uses a single form: other.',
  'plurals.de': 'German uses two plural forms: one and other.',

  'preview.title': 'Preview',
  'preview.subtitle': 'See how numbers, dates, and lists look in this language.',
  'preview.date': 'Date: {{value}}',
  'preview.number': 'Number: {{value}}',
  'preview.currency': 'Currency: {{value}}',
  'preview.fileSize': 'File size: {{value}}',
  'preview.plural': 'Plural example: {{value}}',
  'preview.list': 'List: {{value}}',

  'request.title': 'Request a new language',
  'request.subtitle': 'Need a language that’s not listed? Let us know.',
  'request.field.language': 'Which language do you need?',
  'request.field.speakers': 'Approximate number of users',
  'request.field.notes': 'Additional notes',
  'request.submit': 'Submit request',
  'request.success': 'Thank you. We’ll be in touch about adding {{language}}.',
} as const;

export default locales;
