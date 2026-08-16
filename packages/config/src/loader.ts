/**
 * @smart-edms/config — generic config loader.
 *
 * `loadConfig(schema, source)` validates `source` against a Zod schema and
 * either returns the typed config object or throws a
 * `ConfigValidationError` listing every issue (not just the first).
 *
 * Use this at application startup — fail fast with a clear, complete error
 * message rather than silently booting with `undefined` values.
 *
 * Spec ref: §15.1, §21.6.
 */

import type { ZodError, ZodType } from 'zod';

/**
 * Error thrown by `loadConfig` when the source object fails schema
 * validation. The `issues` array contains every issue found (not just the
 * first) so the operator can fix all problems in one pass.
 */
export class ConfigValidationError extends Error {
  /** Every Zod issue, flattened to `{ path, message }`. */
  readonly issues: ReadonlyArray<{ readonly path: string; readonly message: string }>;

  constructor(error: ZodError) {
    const issues = error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    super(
      `Configuration validation failed:\n${issues.map((i) => `  - ${i.path || '(root)'}: ${i.message}`).join('\n')}`,
    );
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

/**
 * Validate `source` against `schema` and return the typed config object.
 *
 * @param schema — any Zod schema (typically one of the `*ConfigSchema`
 *                 exports from this package, or a `schema.merge(other)`).
 * @param source — typically `process.env`.
 *
 * @throws {ConfigValidationError} if validation fails. The error message
 *         lists EVERY issue, not just the first.
 */
export function loadConfig<T>(
  schema: ZodType<T>,
  source: Record<string, unknown>,
): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new ConfigValidationError(result.error);
  }
  return result.data;
}

/**
 * Non-throwing variant of `loadConfig`. Returns a discriminated union:
 *  - `{ success: true, data: T }` on success;
 *  - `{ success: false, error: ConfigValidationError }` on failure.
 *
 * Use this in contexts where you want to handle config failure gracefully
 * (e.g. render a friendly error page instead of crashing).
 */
export function safeLoadConfig<T>(
  schema: ZodType<T>,
  source: Record<string, unknown>,
):
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: ConfigValidationError } {
  const result = schema.safeParse(source);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: new ConfigValidationError(result.error) };
}
