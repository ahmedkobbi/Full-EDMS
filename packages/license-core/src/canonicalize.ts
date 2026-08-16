/**
 * @smart-edms/license-core — JSON canonicalization (spec §4.3, §12.5)
 *
 * Purpose: produce deterministic JSON bytes for digital signing. License
 * artifacts (`.sedmslic`, `.sedmsreq`, `.sedmscrl`) and heartbeat payloads
 * are canonicalised before being signed so that the signature is stable
 * across JSON serializers, key orderings, and runtime environments.
 *
 * Implementation note: this is an "RFC 8785-like" canonicalisation. The
 * core rules implemented here are:
 *  - Object keys are sorted lexicographically by UTF-16 code unit (the
 *    same ordering used by `Array.prototype.sort` with the default
 *    comparator and by RFC 8785 §3.2.3).
 *  - No insignificant whitespace is emitted.
 *  - Strings are escaped per RFC 8252 §7 with the following escapes
 *    mandatory: `"`, `\`, and control characters U+0000–U+001F.
 *  - `null`, `true`, `false` are emitted verbatim.
 *  - Numbers are emitted via `JSON.stringify`'s default Number→String
 *    conversion, which already produces the minimal, unambiguous form
 *    required by RFC 8785 §3.2.2.3 for finite numbers within IEEE 754
 *    double precision range. (Our payloads contain only non-negative
 *    integers and a small set of explicit floats, so the full RFC 8785
 *    number grammar is not needed.)
 *  - Arrays preserve element order (NOT sorted).
 *  - `undefined` is omitted (matching JSON.stringify semantics).
 *  - `NaN` / `Infinity` are rejected with an explicit error — they
 *    cannot be represented in JSON and a silent coercion would break
 *    signature stability.
 *
 * Non-goals (deliberately out of scope for the licensing core):
 *  - Surrogate pair reordering for U+D800–U+DFFF (we trust the input
 *    strings are well-formed UTF-16, which is the case for all fields
 *    in `LicensePayload` and friends).
 *  - BigInt support (license payloads do not use BigInt).
 *
 * Critical rules (spec §12.4):
 *  - The canonicalised bytes are what is signed, byte-for-byte.
 *  - Verification MUST canonicalise the *exact same* payload object
 *    before comparing signatures. Any deviation breaks verification.
 */

/**
 * Error thrown when canonicalization encounters a value that cannot be
 * deterministically serialised (e.g. `NaN`, `Infinity`, a circular
 * reference, a function, a symbol, or a BigInt).
 */
export class CanonicalizationError extends Error {
  constructor(message: string, readonly path: string) {
    super(`Canonicalization error at ${path || '<root>'}: ${message}`);
    this.name = 'CanonicalizationError';
  }
}

/**
 * Canonicalise a JSON-compatible value into a UTF-8 string suitable for
 * signing. The output is identical for any two structurally-equal inputs
 * regardless of object key insertion order.
 *
 * @param value - any JSON-compatible value (object, array, primitive).
 * @returns the canonical JSON string (no whitespace, sorted keys).
 * @throws {CanonicalizationError} if `value` contains NaN, Infinity,
 *   a function, a symbol, a BigInt, or a circular reference.
 */
export function canonicalizeJson(value: unknown): string {
  const seen = new WeakSet<object>();
  return serializeValue(value, '', seen);
}

/**
 * Canonicalise a JSON-compatible value and return the UTF-8 encoded
 * bytes. This is the form consumed by the signing functions in `sign.ts`.
 */
export function canonicalizeBytes(value: unknown): Uint8Array {
  return Buffer.from(canonicalizeJson(value), 'utf8');
}

// ---------------------------------------------------------------------------
// Internal recursive serializer
// ---------------------------------------------------------------------------

function serializeValue(value: unknown, path: string, seen: WeakSet<object>): string {
  // `undefined` is not representable in JSON. At root, treat as null;
  // inside objects, the property is omitted (handled by serializeObject).
  if (value === undefined) {
    if (path === '') {return 'null';}
    throw new CanonicalizationError('undefined is not representable in JSON', path);
  }
  if (value === null) {return 'null';}
  if (typeof value === 'boolean') {return value ? 'true' : 'false';}
  if (typeof value === 'string') {return serializeString(value);}
  if (typeof value === 'number') {return serializeNumber(value, path);}
  if (typeof value === 'bigint') {
    throw new CanonicalizationError('BigInt is not supported by canonicalization', path);
  }
  if (typeof value === 'symbol') {
    throw new CanonicalizationError('Symbol is not supported by canonicalization', path);
  }
  if (typeof value === 'function') {
    throw new CanonicalizationError('Function is not supported by canonicalization', path);
  }
  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      throw new CanonicalizationError('Circular reference detected', path);
    }
    seen.add(value as object);
    let out: string;
    if (Array.isArray(value)) {
      out = serializeArray(value, path, seen);
    } else if (value instanceof Date) {
      // ISO date string; we treat Date as its `.toISOString()` for
      // convenience. The license payloads already use ISODateString.
      out = serializeString(value.toISOString());
    } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      // Buffer / Uint8Array → base64 string. Used for raw signature
      // fields when canonicalising an envelope that wraps binary.
      out = serializeString(Buffer.from(value).toString('base64'));
    } else {
      out = serializeObject(value as Record<string, unknown>, path, seen);
    }
    seen.delete(value as object);
    return out;
  }
  // Should be unreachable.
  throw new CanonicalizationError(`Unsupported value type: ${typeof value}`, path);
}

function serializeObject(obj: Record<string, unknown>, path: string, seen: WeakSet<object>): string {
  const keys = Object.keys(obj);
  // Lexicographic sort by UTF-16 code unit (default String comparison).
  keys.sort();
  const parts: string[] = [];
  for (const key of keys) {
    // Skip `undefined`-valued properties (matches JSON.stringify semantics).
    const v = obj[key];
    if (v === undefined) {continue;}
    const childPath = path === '' ? key : `${path}.${key}`;
    parts.push(`${serializeString(key)}:${serializeValue(v, childPath, seen)}`);
  }
  return `{${parts.join(',')}}`;
}

function serializeArray(arr: unknown[], path: string, seen: WeakSet<object>): string {
  const parts: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const childPath = `${path}[${i}]`;
    const v = arr[i];
    // `undefined` array elements become `null` (matches JSON.stringify).
    parts.push(v === undefined ? 'null' : serializeValue(v, childPath, seen));
  }
  return `[${parts.join(',')}]`;
}

function serializeString(s: string): string {
  // Reuse JSON.stringify for the string-escape rules — it already produces
  // RFC 8259 §7-compliant escapes for `"`, `\`, and control chars
  // U+0000–U+001F. It does NOT escape non-ASCII characters (good — we
  // want the raw UTF-8 bytes to be signed).
  return JSON.stringify(s);
}

function serializeNumber(n: number, path: string): string {
  if (Number.isNaN(n)) {
    throw new CanonicalizationError('NaN is not representable in JSON', path);
  }
  if (n === Infinity || n === -Infinity) {
    throw new CanonicalizationError('Infinity is not representable in JSON', path);
  }
  // JSON.stringify produces the minimal numeric form (no leading +,
  // no unnecessary exponent, no trailing zeros after decimal point)
  // per ECMAScript §6.1.6.1.20 NumberToString, which matches the
  // RFC 8785 §3.2.2.3 requirements for the IEEE 754 double-precision
  // subset our payloads use.
  return JSON.stringify(n);
}
