/**
 * @smart-edms/i18n — extract-keys script (spec §16.5)
 *
 * Scans the codebase for `t('namespace.key')` calls and reports any keys
 * that are not present in the English resource bundle.
 *
 * This is a placeholder / scaffold. A production-grade extractor would
 * use a TypeScript AST walker (e.g. ts-morph) to find every `t()` call
 * site and resolve dynamic keys where possible.
 *
 * Usage:
 *   npx tsx scripts/extract-keys.ts
 *   npx tsx scripts/extract-keys.ts --src ../web/src
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { en } from '../resources/en/index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_SCAN_ROOT = process.cwd();
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
]);
const VALID_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively walk a directory and yield file paths matching the given
 * extension set. Skips ignored directories.
 */
function* walkDir(
  root: string,
  base: string = root,
): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = join(root, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue;
      yield* walkDir(fullPath, base);
    } else if (stat.isFile()) {
      const ext = entry.slice(entry.lastIndexOf('.'));
      if (VALID_EXTENSIONS.has(ext)) {
        yield fullPath;
      }
    }
  }
}

/**
 * Extract `t('...')` and `t("...")` calls from a source file.
 * Returns an array of { file, line, key } records.
 *
 * NOTE: This is a regex-based extractor. It handles simple literal-string
 * calls only. Dynamic keys (`t(someVar)`) are skipped. A real extractor
 * should use a TypeScript AST walker for accuracy.
 */
interface ExtractedKey {
  readonly file: string;
  readonly line: number;
  readonly key: string;
}

function extractKeysFromFile(filePath: string, base: string): readonly ExtractedKey[] {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const out: ExtractedKey[] = [];
  // Match t('foo.bar') or t("foo.bar") with optional leading whitespace.
  // We also match `i18n.t('...')`, `t(\`...\`)`, etc.
  const re = /\bt\(\s*['"`]([a-zA-Z0-9_.\-:]+)['"`]/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const key = m[1];
      // Filter out obviously non-message keys (e.g. CSS class names).
      if (key.length < 2) continue;
      out.push({ file: relative(base, filePath), line: i + 1, key });
    }
  }
  return out;
}

/**
 * Flatten the English resource bundle into a set of dotted keys.
 */
function flattenKeys(obj: unknown, prefix: string = ''): Set<string> {
  const out = new Set<string>();
  if (obj === null || obj === undefined || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const values = Object.values(value as Record<string, unknown>);
      const allStrings = values.every((v) => typeof v === 'string');
      if (allStrings && values.length > 0) {
        out.add(path);
      } else {
        for (const k of flattenKeys(value, path)) out.add(k);
      }
    } else {
      out.add(path);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: readonly string[]): { src?: string } {
  let src: string | undefined;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--src=')) {
      src = arg.slice('--src='.length);
    }
  }
  return { src };
}

function main(): void {
  const { src } = parseArgs(process.argv);
  const scanRoot = src || DEFAULT_SCAN_ROOT;

  console.log('');
  console.log('Smart EDMS — i18n key extractor (spec §16.5)');
  console.log('============================================');
  console.log(`Scanning: ${scanRoot}`);
  console.log('');

  const knownKeys = flattenKeys(en);
  console.log(`Known keys in English bundle: ${knownKeys.size}`);
  console.log('');

  const usedKeys = new Map<string, Array<{ file: string; line: number }>>();
  let scannedFiles = 0;
  for (const file of walkDir(scanRoot)) {
    scannedFiles++;
    const keys = extractKeysFromFile(file, scanRoot);
    for (const { key, line, file: relFile } of keys) {
      const arr = usedKeys.get(key) || [];
      arr.push({ file: relFile, line });
      usedKeys.set(key, arr);
    }
  }

  console.log(`Scanned ${scannedFiles} files.`);
  console.log(`Found ${usedKeys.size} unique t() call keys.`);
  console.log('');

  // Find used-but-undefined keys
  const undefinedKeys: Array<{ key: string; usages: Array<{ file: string; line: number }> }> = [];
  for (const [key, usages] of usedKeys) {
    if (!knownKeys.has(key)) {
      undefinedKeys.push({ key, usages });
    }
  }

  if (undefinedKeys.length > 0) {
    console.log('── Keys used in code but not in the English bundle ──');
    for (const { key, usages } of undefinedKeys.sort((a, b) => a.key.localeCompare(b.key))) {
      console.log(`  ${key}`);
      for (const u of usages.slice(0, 3)) {
        console.log(`    ${u.file}:${u.line}`);
      }
      if (usages.length > 3) {
        console.log(`    … and ${usages.length - 3} more`);
      }
    }
    console.log('');
  } else {
    console.log('✅ All t() keys used in code are present in the English bundle.');
  }

  // Find defined-but-unused keys (informational)
  const unusedKeys: string[] = [];
  for (const key of knownKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  }
  console.log(`ℹ️  ${unusedKeys.length} keys in the English bundle are not referenced by any t() call.`);
  console.log('   (This is informational — many keys are referenced dynamically.)');
  console.log('');

  if (undefinedKeys.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
