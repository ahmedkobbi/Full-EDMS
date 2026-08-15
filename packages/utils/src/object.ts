/**
 * @smart-edms/utils — object helpers.
 *
 *  - `deepFreeze(obj)` — recursively freeze an object and all nested objects.
 *  - `omit(obj, keys)` — return a shallow copy with the given keys removed.
 *  - `pick(obj, keys)` — return a shallow copy with only the given keys.
 *  - `deepEqual(a, b)` — structural deep equality (handles plain objects,
 *    arrays, dates, and primitives).
 *
 * These helpers operate on JSON-serialisable structures. They do NOT handle
 * class instances, Maps, Sets, or functions — for those use a dedicated
 * library.
 */

/**
 * Recursively freeze `obj` and every nested plain object or array. Returns
 * the same reference (now frozen). Use this to make configuration objects
 * and shared constants immutable at runtime.
 *
 * Note: freezing is shallow for non-plain values (class instances, Maps,
 * Sets) — only plain objects and arrays are walked.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // Plain object or array — freeze it and recurse into its values.
  if (Array.isArray(obj)) {
    Object.freeze(obj);
    for (const v of obj) {
      deepFreeze(v);
    }
    return obj as Readonly<T>;
  }
  if (Object.getPrototypeOf(obj) === Object.prototype || Object.getPrototypeOf(obj) === null) {
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
      deepFreeze((obj as Record<string, unknown>)[key]);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Return a shallow copy of `obj` with the specified `keys` removed. Keys
 * that don't exist on `obj` are silently ignored (no error).
 *
 * @example
 *   omit({ a: 1, b: 2, c: 3 }, ['b']); // { a: 1, c: 3 }
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const keySet = new Set(keys as readonly string[]);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (!keySet.has(k)) {
      out[k] = obj[k];
    }
  }
  return out as Omit<T, K>;
}

/**
 * Return a shallow copy of `obj` containing only the specified `keys`.
 * Keys that don't exist on `obj` are silently skipped.
 *
 * @example
 *   pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // { a: 1, c: 3 }
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in obj) {
      out[k as string] = obj[k];
    }
  }
  return out as Pick<T, K>;
}

/**
 * Structural deep equality. Returns `true` iff `a` and `b` are deeply equal.
 *
 * Handles:
 *  - primitives (compared with `===`, with `NaN === NaN` treated as `true`);
 *  - `Date` instances (compared by `.getTime()`);
 *  - plain objects and arrays (compared recursively, key order irrelevant).
 *
 * Does NOT handle: class instances (other than Date), Maps, Sets, RegExps,
 * ArrayBuffers, or functions. For those, use a dedicated deep-equal library.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Strict-equal fast path (also covers `null === null`, `undefined === undefined`).
  if (a === b) return true;
  // Treat NaN === NaN as equal.
  if (a !== a && b !== b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date || b instanceof Date) {
    return false;
  }
  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr !== bIsArr) return false;
  if (aIsArr) {
    const aa = a as readonly unknown[];
    const bb = b as readonly unknown[];
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
      if (!deepEqual(aa[i], bb[i])) return false;
    }
    return true;
  }
  // Only walk plain objects (prototype is Object.prototype or null). Skip
  // class instances — they may have private state that deep-walking would miss.
  const aProto = Object.getPrototypeOf(a);
  const bProto = Object.getPrototypeOf(b);
  if (aProto !== Object.prototype && aProto !== null) return false;
  if (bProto !== Object.prototype && bProto !== null) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
      return false;
    }
  }
  return true;
}
