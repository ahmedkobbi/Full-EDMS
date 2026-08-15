#!/usr/bin/env python3
"""
Generate locale namespace files from a translation map.

Reads:
  - English namespace files (for key structure)
  - A translation map (key -> translated value) provided as a JSON file

Writes:
  - Per-namespace .ts files for the target locale
  - The locale's index.ts barrel

This is NOT machine translation. The translation map is human-authored.
The script just distributes the translated values into per-namespace files
that match the English key structure.

Usage:
  python3 scripts/gen-locale.py <locale> <translations.json>

Where <translations.json> is a flat map of "namespace.key" -> "value".
Keys not present in the translation map fall back to the English value
(for non-critical namespaces) or are omitted (for critical namespaces,
so the check-keys script can detect them).
"""
import json
import os
import re
import sys

RESOURCES_ROOT = '/home/z/my-project/full-edms/packages/i18n/resources'

# Namespaces and their file locations.
TOP_LEVEL_NAMESPACES = [
    'common', 'auth', 'documents', 'metadata', 'workflow', 'sharing',
    'audit', 'admin', 'security', 'errors', 'notifications', 'emails',
    'retention', 'classification', 'digitization', 'provenance', 'license',
    'billing', 'marketing', 'settings', 'scanner', 'locales',
]
TOUR_NAMESPACES = [
    'common', 'welcome', 'documents', 'search', 'workflows', 'audit',
    'admin', 'license', 'scanner', 'collaboration', 'aiAssistant',
    'checklist', 'marketing',
]
AI_NAMESPACES = [
    'common', 'bubble', 'errors', 'actions', 'disclaimer', 'citations',
]

# Critical namespaces — missing keys here fail the check.
CRITICAL_NAMESPACES = {
    'errors', 'license', 'audit', 'security', 'retention', 'classification',
    'ai.disclaimer', 'ai.errors', 'tour.license', 'tour.audit',
}

# Locales that need a REVIEW comment for compliance content.
COMPLIANCE_REVIEW_LOCALES = {'ar', 'ru', 'zh-CN', 'de', 'fr'}

# ---------------------------------------------------------------------------
# English TS file parser (reused from gen-locale.py)
# ---------------------------------------------------------------------------

def parse_ts_object(content):
    m = re.search(r'=\s*\{', content)
    if not m:
        return None
    start = m.end() - 1
    depth = 0
    i = start
    in_string = False
    string_char = None
    while i < len(content):
        c = content[i]
        if in_string:
            if c == '\\':
                i += 2
                continue
            if c == string_char:
                in_string = False
        else:
            if c in ("'", '"', '`'):
                in_string = True
                string_char = c
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return content[start:i+1]
        i += 1
    return None

def parse_keys(obj_str, top_level_ns=None):
    """Parse a JS object literal string into an ordered dict of key -> (type, value)."""
    result = {}
    inner = obj_str.strip()
    if inner.startswith('{'):
        inner = inner[1:]
    if inner.endswith('}'):
        inner = inner[:-1]

    i = 0
    while i < len(inner):
        while i < len(inner) and inner[i] in ' \t\n':
            i += 1
        if i >= len(inner):
            break
        if inner[i:i+2] == '//':
            while i < len(inner) and inner[i] != '\n':
                i += 1
            continue
        if inner[i:i+2] == '/*':
            i += 2
            while i < len(inner) - 1 and inner[i:i+2] != '*/':
                i += 1
            i += 2
            continue
        if inner[i] in ("'", '"', '`'):
            quote = inner[i]
            i += 1
            key_start = i
            while i < len(inner) and inner[i] != quote:
                if inner[i] == '\\':
                    i += 2
                    continue
                i += 1
            key = inner[key_start:i]
            i += 1
        else:
            key_start = i
            while i < len(inner) and inner[i] not in ' \t\n:,':
                i += 1
            key = inner[key_start:i]
        while i < len(inner) and inner[i] in ' \t\n':
            i += 1
        if i >= len(inner) or inner[i] != ':':
            break
        i += 1
        while i < len(inner) and inner[i] in ' \t\n':
            i += 1
        if i >= len(inner):
            break
        if inner[i] in ("'", '"', '`'):
            quote = inner[i]
            i += 1
            val_chars = []
            while i < len(inner):
                if inner[i] == '\\' and i + 1 < len(inner):
                    val_chars.append(inner[i:i+2])
                    i += 2
                    continue
                if inner[i] == quote:
                    break
                val_chars.append(inner[i])
                i += 1
            value = ''.join(val_chars)
            i += 1
            result[key] = ('string', value)
        elif inner[i] == '{':
            depth = 1
            i += 1
            obj_start = i
            while i < len(inner) and depth > 0:
                if inner[i] in ("'", '"', '`'):
                    q = inner[i]
                    i += 1
                    while i < len(inner) and inner[i] != q:
                        if inner[i] == '\\':
                            i += 2
                            continue
                        i += 1
                    i += 1
                elif inner[i] == '{':
                    depth += 1
                    i += 1
                elif inner[i] == '}':
                    depth -= 1
                    i += 1
                else:
                    i += 1
            nested_str = '{' + inner[obj_start:i]
            nested = parse_keys(nested_str)
            result[key] = ('object', nested)
        else:
            while i < len(inner) and inner[i] != ',':
                i += 1
        while i < len(inner) and inner[i] in ' \t\n':
            i += 1
        if i < len(inner) and inner[i] == ',':
            i += 1
    return result

def load_en_keys(namespace, subdir=None):
    if subdir:
        path = os.path.join(RESOURCES_ROOT, 'en', subdir, namespace + '.ts')
    else:
        path = os.path.join(RESOURCES_ROOT, 'en', namespace + '.ts')
    with open(path, 'r') as f:
        content = f.read()
    obj_str = parse_ts_object(content)
    if obj_str is None:
        return {}
    return parse_keys(obj_str)

# ---------------------------------------------------------------------------
# TS file emitter
# ---------------------------------------------------------------------------

def escape_ts_string(s):
    """Escape a string for use in a TypeScript single-quoted string literal."""
    # Escape backslashes first, then single quotes.
    s = s.replace('\\', '\\\\')
    s = s.replace("'", "\\'")
    # Preserve newlines as \n
    s = s.replace('\n', '\\n')
    return s

def emit_value(value, indent, translations, full_key, is_critical, missing):
    """Emit a TS value (string or nested object) for a translated key."""
    typ, v = value
    if typ == 'string':
        if full_key in translations:
            return "'" + escape_ts_string(translations[full_key]) + "'"
        elif is_critical:
            missing.append(full_key)
            return "'" + escape_ts_string(v) + "'  // TODO: translate"
        else:
            # Non-critical: fall back to English with a comment.
            return "'" + escape_ts_string(v) + "'  // falls back to English"
    else:
        # Nested object — could be a plural rule.
        # Check if it's a plural rule (keys are plural categories).
        plural_cats = {'zero', 'one', 'two', 'few', 'many', 'other'}
        sub_keys = list(v.keys())
        is_plural = (
            len(sub_keys) > 0
            and all(t == 'string' for t, _ in v.values())
            and any(k in plural_cats for k in sub_keys)
        )
        if is_plural:
            # Emit as a plural-rule object.
            lines = ['{']
            for sk, (st, sv) in v.items():
                sub_full_key = f"{full_key}.{sk}" if full_key else sk
                if sub_full_key in translations:
                    val = "'" + escape_ts_string(translations[sub_full_key]) + "'"
                elif is_critical:
                    missing.append(sub_full_key)
                    val = "'" + escape_ts_string(sv) + "'  // TODO: translate"
                else:
                    val = "'" + escape_ts_string(sv) + "'  // falls back to English"
                lines.append(f"  {indent}{sk}: {val},")
            lines.append(f"{indent}}}")
            return '\n'.join(lines)
        else:
            # Regular nested object — recurse.
            lines = ['{']
            for sk, sv in v.items():
                sub_full_key = f"{full_key}.{sk}" if full_key else sk
                lines.append(f"  {indent}{sk}: {emit_value(sv, indent + '  ', translations, sub_full_key, is_critical, missing)},")
            lines.append(f"{indent}}}")
            return '\n'.join(lines)

def emit_namespace_file(namespace, subdir, translations, locale, is_critical, needs_review):
    """Emit a TS namespace file for the given locale."""
    keys = load_en_keys(namespace, subdir)
    missing = []
    var_name = namespace.replace('-', '_')

    # Build the header comment.
    ns_full = f"{subdir}.{namespace}" if subdir else namespace
    header_lines = [
        '/**',
        f' * @smart-edms/i18n — {locale} translation: `{ns_full}` namespace.',
        ' *',
        ' * Source of truth: en/' + (f'{subdir}/' if subdir else '') + namespace + '.ts',
        ' * Translated from the English baseline.',
    ]
    if needs_review:
        header_lines.append(' *')
        header_lines.append(' * REVIEW: This namespace contains compliance-relevant content.')
        header_lines.append(' * Translations should be reviewed by a native speaker before production rollout.')
    header_lines.append(' */')
    header = '\n'.join(header_lines)

    # Build the object body.
    body_lines = []
    for key, value in keys.items():
        full_key = f"{ns_full}.{key}" if False else key  # keys are within the namespace
        # The translation map uses "namespace.key" format.
        translation_key = f"{ns_full}.{key}"
        emitted = emit_value(value, '  ', translations, translation_key, is_critical, missing)
        body_lines.append(f"  {escape_key(key)}: {emitted},")
    body = '\n'.join(body_lines)

    file_content = f"""{header}

const {var_name} = {{
{body}
}} as const;

export default {var_name};
"""
    return file_content, missing

def escape_key(key):
    """Escape a key for use as a TS object key. Quote if it contains special chars."""
    if re.match(r'^[a-zA-Z_$][a-zA-Z0-9_$]*$', key):
        return key
    return "'" + escape_ts_string(key) + "'"

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 3:
        print("Usage: gen-locale.py <locale> <translations.json>")
        sys.exit(1)
    locale = sys.argv[1]
    translations_path = sys.argv[2]
    with open(translations_path, 'r') as f:
        translations = json.load(f)

    # Validate translations: keys should be in "namespace.key" or
    # "subdir.namespace.key" format. We just use them as-is.

    # Create directories
    locale_root = os.path.join(RESOURCES_ROOT, locale)
    tour_dir = os.path.join(locale_root, 'tour')
    ai_dir = os.path.join(locale_root, 'ai')
    os.makedirs(tour_dir, exist_ok=True)
    os.makedirs(ai_dir, exist_ok=True)

    total_keys = 0
    total_missing = 0
    files_written = []

    # Top-level namespaces
    for ns in TOP_LEVEL_NAMESPACES:
        is_critical = ns in CRITICAL_NAMESPACES
        needs_review = is_critical and locale in COMPLIANCE_REVIEW_LOCALES
        content, missing = emit_namespace_file(ns, None, translations, locale, is_critical, needs_review)
        path = os.path.join(locale_root, ns + '.ts')
        with open(path, 'w') as f:
            f.write(content)
        files_written.append(path)
        total_missing += len(missing)

    # Tour namespaces
    for ns in TOUR_NAMESPACES:
        full_ns = f"tour.{ns}"
        is_critical = full_ns in CRITICAL_NAMESPACES
        needs_review = is_critical and locale in COMPLIANCE_REVIEW_LOCALES
        content, missing = emit_namespace_file(ns, 'tour', translations, locale, is_critical, needs_review)
        path = os.path.join(tour_dir, ns + '.ts')
        with open(path, 'w') as f:
            f.write(content)
        files_written.append(path)
        total_missing += len(missing)

    # AI namespaces
    for ns in AI_NAMESPACES:
        full_ns = f"ai.{ns}"
        is_critical = full_ns in CRITICAL_NAMESPACES
        needs_review = is_critical and locale in COMPLIANCE_REVIEW_LOCALES
        content, missing = emit_namespace_file(ns, 'ai', translations, locale, is_critical, needs_review)
        path = os.path.join(ai_dir, ns + '.ts')
        with open(path, 'w') as f:
            f.write(content)
        files_written.append(path)
        total_missing += len(missing)

    # Emit tour/index.ts
    tour_index = "/**\n * @smart-edms/i18n — " + locale + " locale: tour sub-namespaces barrel.\n */\n\n"
    for ns in TOUR_NAMESPACES:
        tour_index += f"import {ns} from './{ns}.js';\n"
    tour_index += "\nexport const tour = {\n"
    for ns in TOUR_NAMESPACES:
        tour_index += f"  {ns},\n"
    tour_index += "} as const;\n"
    with open(os.path.join(tour_dir, 'index.ts'), 'w') as f:
        f.write(tour_index)

    # Emit ai/index.ts
    ai_index = "/**\n * @smart-edms/i18n — " + locale + " locale: ai sub-namespaces barrel.\n */\n\n"
    for ns in AI_NAMESPACES:
        ai_index += f"import {ns} from './{ns}.js';\n"
    ai_index += "\nexport const ai = {\n"
    for ns in AI_NAMESPACES:
        ai_index += f"  {ns},\n"
    ai_index += "} as const;\n"
    with open(os.path.join(ai_dir, 'index.ts'), 'w') as f:
        f.write(ai_index)

    # Emit locale/index.ts
    var_name = locale.replace('-', '')
    index = "/**\n * @smart-edms/i18n — " + locale + " locale barrel.\n */\n\n"
    for ns in TOP_LEVEL_NAMESPACES:
        index += f"import {ns} from './{ns}.js';\n"
    index += "\nimport { tour } from './tour/index.js';\n"
    index += "import { ai } from './ai/index.js';\n\n"
    index += f"export const {var_name} = {{\n"
    for ns in TOP_LEVEL_NAMESPACES:
        index += f"  {ns},\n"
    # Tour and AI sub-namespaces
    for ns in TOUR_NAMESPACES:
        index += f"  'tour.{ns}': tour.{ns},\n"
    for ns in AI_NAMESPACES:
        index += f"  'ai.{ns}': ai.{ns},\n"
    index += "} as const;\n"
    with open(os.path.join(locale_root, 'index.ts'), 'w') as f:
        f.write(index)

    print(f"Generated {len(files_written)} namespace files for locale '{locale}'.")
    print(f"Total missing translations in critical namespaces: {total_missing}")
    print(f"Translation map had {len(translations)} entries.")

if __name__ == '__main__':
    main()
