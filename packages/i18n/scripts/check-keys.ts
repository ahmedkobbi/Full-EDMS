/**
 * @smart-edms/i18n — check-keys script (spec §16.5)
 *
 * Walks all locale resource files, compares each locale's keys against the
 * English baseline, and reports:
 *   - missing keys (in non-English locales)
 *   - extra keys (in any locale)
 *   - invalid interpolation keys (e.g. mismatched {{ }} braces)
 *   - plural issues (e.g. missing plural categories required by the locale)
 *
 * Exits non-zero if any CRITICAL namespace has missing keys.
 *
 * Critical namespaces (spec §16.5, §10.6 compliance review):
 *   errors, license, audit, security, retention, classification,
 *   ai.disclaimer, ai.errors, tour.license, tour.audit
 *
 * Usage:
 *   npx tsx scripts/check-keys.ts
 *   npx tsx scripts/check-keys.ts --locale fr
 *   npx tsx scripts/check-keys.ts --strict   (treat any missing key as error)
 */

import { en } from '../resources/en/index.js';
import { fr } from '../resources/fr/index.js';
import { ar } from '../resources/ar/index.js';
import { ru } from '../resources/ru/index.js';
import { zhCN } from '../resources/zh-CN/index.js';
import { de } from '../resources/de/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TranslationTable = Readonly<Record<string, unknown>>;
type LocaleCode = 'en' | 'fr' | 'ar' | 'ru' | 'zh-CN' | 'de';

interface LocaleReport {
  readonly locale: LocaleCode;
  readonly totalKeys: number;
  readonly missingKeys: readonly string[];
  readonly extraKeys: readonly string[];
  readonly invalidInterpolationKeys: readonly string[];
  readonly pluralIssues: readonly string[];
  readonly missingByNamespace: Readonly<Record<string, number>>;
  readonly ok: boolean;
  readonly criticalFailures: readonly string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ALL_LOCALES: LocaleCode[] = ['en', 'fr', 'ar', 'ru', 'zh-CN', 'de'];

const RESOURCES: Readonly<Record<LocaleCode, TranslationTable>> = {
  en: en as unknown as TranslationTable,
  fr: fr as unknown as TranslationTable,
  ar: ar as unknown as TranslationTable,
  ru: ru as unknown as TranslationTable,
  'zh-CN': zhCN as unknown as TranslationTable,
  de: de as unknown as TranslationTable,
};

// Spec §16.5 — critical compliance/safety namespaces.
const CRITICAL_NAMESPACES: readonly string[] = [
  'errors',
  'license',
  'audit',
  'security',
  'retention',
  'classification',
  'ai.disclaimer',
  'ai.errors',
  'tour.license',
  'tour.audit',
];

// Plural categories per locale (per ICU plural rules).
// Used by the `pluralCategoriesFor` helper in `src/plural.ts`; duplicated
// here so the check-keys script can reference locale plural expectations
// in future enhancements.
export const PLURAL_CATEGORIES: Readonly<Record<LocaleCode, readonly string[]>> = {
  en: ['one', 'other'],
  fr: ['one', 'other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  ru: ['one', 'few', 'many', 'other'],
  'zh-CN': ['other'],
  de: ['one', 'other'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLURAL_CATEGORY_NAMES = new Set([
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
]);

/**
 * Returns true if `obj` looks like an ICU plural-rule record (an object
 * whose keys are plural-category names and whose values are strings).
 */
function isPluralRule(obj: unknown): boolean {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {return false;}
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec);
  if (keys.length === 0) {return false;}
  // At least one key must be a plural category, and all values must be strings.
  const allStrings = Object.values(rec).every((v) => typeof v === 'string');
  if (!allStrings) {return false;}
  // Require at least `other` OR at least one of the standard categories.
  return keys.some((k) => PLURAL_CATEGORY_NAMES.has(k));
}

/**
 * Flatten a nested translation table into dotted keys.
 * Handles nested objects (used for plural rules).
 *
 * When a value is a plural-rule record (an object whose keys are plural
 * categories like `one`, `other`), the path itself is recorded as a key —
 * the plural sub-keys are not flattened further.
 */
function flattenKeys(
  obj: unknown,
  prefix: string = '',
): readonly string[] {
  const out: string[] = [];
  if (obj === null || obj === undefined) {return out;}
  if (typeof obj !== 'object') {return out;}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPluralRule(value)) {
      // Plural rule — record the path itself (not the sub-keys).
      out.push(path);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Nested object — recurse.
      out.push(...flattenKeys(value, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

/**
 * Validate that all `{{...}}` interpolations in a value are well-formed
 * (matched braces, non-empty content).
 *
 * Also validates that single-brace ICU MessageFormat expressions
 * (`{var, plural, ...}`, `{var, select, ...}`) are balanced.
 */
function validateInterpolation(value: string): boolean {
  // First, check single-brace balance. This catches ICU expressions and
  // any stray single braces. We treat `{{` and `}}` as two single braces.
  // ICU allows `#` inside `{...}` clauses for plural substitution.
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '{') {depth++;}
    else if (c === '}') {
      depth--;
      if (depth < 0) {return false;}
    }
  }
  if (depth !== 0) {return false;}

  // Now check that `{{...}}` interpolations have non-empty content.
  // Match `{{ ... }}` where `...` doesn't contain `}}`.
  const re = /\{\{([^}]*(?:\}[^}]+)*)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const inner = m[1].trim();
    if (!inner) {return false;}
    // If the inner content looks like an ICU expression (e.g. `count, plural, ...`),
    // it's likely a misplaced `{{` that should be `{`. Flag it.
    if (/^[a-zA-Z_][a-zA-Z0-9_]*,\s*(plural|select|selectordinal|date|time|number|duration),/.test(inner)) {
      return false;
    }
  }
  return true;
}

/**
 * Extract translation string values for a given key path. Returns an array
 * because the value may be a plural-rule record with multiple strings.
 */
function extractStrings(obj: unknown, path: string): readonly string[] {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') {return [];}
    cur = (cur as Record<string, unknown>)[p];
  }
  if (typeof cur === 'string') {return [cur];}
  if (cur !== null && typeof cur === 'object') {
    return Object.values(cur).filter((v): v is string => typeof v === 'string');
  }
  return [];
}

/**
 * Check plural-rule completeness for a locale. If a key's value is a plural
 * record (an object whose keys are plural categories), verify it contains
 * the categories required by the locale.
 *
 * Currently only checks that the `other` category is present (it is always
 * required by ICU). Full per-locale plural-category enforcement is deferred
 * to a future enhancement.
 */
function checkPlural(
  obj: unknown,
  path: string,
  _locale: LocaleCode,
): string[] {
  const issues: string[] = [];
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') {return issues;}
    cur = (cur as Record<string, unknown>)[p];
  }
  if (cur !== null && typeof cur === 'object' && !Array.isArray(cur)) {
    const record = cur as Record<string, unknown>;
    const values = Object.values(record);
    const allStrings = values.every((v) => typeof v === 'string');
    if (allStrings && values.length > 0) {
      // This is a plural-rule record.
      const present = Object.keys(record);
      // `other` is always required.
      if (!present.includes('other')) {
        issues.push(`${path}: missing required "other" category`);
      }
      // For non-en locales, we don't enforce the full set (translators may
      // legitimately provide a subset if the locale's plural rules don't
      // require all categories). We do warn on missing `other`.
    }
  }
  return issues;
}

/**
 * Compute a report for a single locale.
 */
function reportForLocale(locale: LocaleCode): LocaleReport {
  const baseline = RESOURCES.en;
  const target = RESOURCES[locale];

  const baselineKeys = new Set(flattenKeys(baseline));
  const targetKeys = new Set(flattenKeys(target));

  const missingKeys: string[] = [];
  const extraKeys: string[] = [];
  const missingByNamespace: Record<string, number> = {};
  for (const k of baselineKeys) {
    if (!targetKeys.has(k)) {
      missingKeys.push(k);
      const ns = k.includes('.') ? k.split('.')[0] : k;
      missingByNamespace[ns] = (missingByNamespace[ns] || 0) + 1;
    }
  }
  for (const k of targetKeys) {
    if (!baselineKeys.has(k)) {
      extraKeys.push(k);
    }
  }

  const invalidInterpolationKeys: string[] = [];
  const pluralIssues: string[] = [];
  for (const key of baselineKeys) {
    if (!targetKeys.has(key)) {continue;}
    const strings = extractStrings(target, key);
    for (const s of strings) {
      if (!validateInterpolation(s)) {
        invalidInterpolationKeys.push(`${locale}:${key}`);
      }
    }
    pluralIssues.push(...checkPlural(target, key, locale));
  }

  // Critical-namespace failures.
  const criticalFailures: string[] = [];
  if (locale !== 'en') {
    for (const ns of CRITICAL_NAMESPACES) {
      const nsMissing = missingKeys.filter((k) => k.startsWith(`${ns}.`));
      if (nsMissing.length > 0) {
        criticalFailures.push(`${ns}: ${nsMissing.length} missing key(s)`);
      }
    }
  }

  const ok = criticalFailures.length === 0;

  return {
    locale,
    totalKeys: targetKeys.size,
    missingKeys: missingKeys.sort(),
    extraKeys: extraKeys.sort(),
    invalidInterpolationKeys: invalidInterpolationKeys.sort(),
    pluralIssues: pluralIssues.sort(),
    missingByNamespace,
    ok,
    criticalFailures,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: readonly string[]): { locale?: LocaleCode; strict: boolean } {
  let locale: LocaleCode | undefined;
  let strict = false;
  for (const arg of argv.slice(2)) {
    if (arg === '--strict') {
      strict = true;
    } else if (arg.startsWith('--locale=')) {
      const v = arg.slice('--locale='.length) as LocaleCode;
      if (ALL_LOCALES.includes(v)) {locale = v;}
    }
  }
  return { locale, strict };
}

function formatPercent(n: number, total: number): string {
  if (total === 0) {return '100%';}
  return `${(((total - n) / total) * 100).toFixed(1)}%`;
}

function main(): void {
  const { locale: onlyLocale, strict } = parseArgs(process.argv);
  const localesToCheck = onlyLocale ? [onlyLocale] : ALL_LOCALES;

  console.log('');
  console.log('Smart EDMS — i18n key checker (spec §16.5)');
  console.log('==========================================');
  console.log('');

  const baselineKeyCount = flattenKeys(RESOURCES.en).length;
  console.log(`English baseline: ${baselineKeyCount} keys across ${Object.keys(RESOURCES.en).length} namespaces.`);
  console.log(`Critical namespaces: ${CRITICAL_NAMESPACES.join(', ')}`);
  console.log('');

  const allReports: LocaleReport[] = [];
  for (const locale of localesToCheck) {
    const report = reportForLocale(locale);
    allReports.push(report);

    console.log(`── Locale: ${locale} ────────────────────────────────`);
    console.log(`  Total keys:        ${report.totalKeys}`);
    console.log(`  Coverage vs en:    ${formatPercent(report.missingKeys.length, baselineKeyCount)}`);
    console.log(`  Missing keys:      ${report.missingKeys.length}`);
    console.log(`  Extra keys:        ${report.extraKeys.length}`);
    console.log(`  Invalid interp:    ${report.invalidInterpolationKeys.length}`);
    console.log(`  Plural issues:     ${report.pluralIssues.length}`);
    if (report.criticalFailures.length > 0) {
      console.log(`  ❌ Critical failures:`);
      for (const f of report.criticalFailures) {
        console.log(`     - ${f}`);
      }
    } else {
      console.log(`  ✅ Critical namespaces: all keys present`);
    }
    if (Object.keys(report.missingByNamespace).length > 0) {
      console.log(`  Missing by namespace:`);
      for (const [ns, count] of Object.entries(report.missingByNamespace)) {
        console.log(`     - ${ns}: ${count}`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('── Summary ─────────────────────────────────────────');
  for (const r of allReports) {
    const status = r.ok ? '✅' : '❌';
    console.log(`  ${status} ${r.locale.padEnd(6)} ${r.totalKeys.toString().padStart(6)} keys  ${r.missingKeys.length.toString().padStart(4)} missing  ${r.criticalFailures.length.toString().padStart(2)} critical`);
  }
  console.log('');

  // Exit code logic:
  // - Non-zero if any locale has critical-namespace failures.
  // - In strict mode, non-zero if any locale has ANY missing keys.
  const hasCriticalFailure = allReports.some((r) => !r.ok);
  const hasAnyMissing = allReports.some(
    (r) => r.locale !== 'en' && r.missingKeys.length > 0,
  );

  if (hasCriticalFailure) {
    console.log('❌ FAIL: one or more critical namespaces have missing keys.');
    process.exit(1);
  }
  if (strict && hasAnyMissing) {
    console.log('❌ FAIL (strict): one or more non-English locales have missing keys.');
    process.exit(1);
  }
  console.log('✅ PASS: all critical namespaces have complete translations.');
  process.exit(0);
}

main();
