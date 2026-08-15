/**
 * @smart-edms/config
 *
 * Reusable Zod schemas + a `loadConfig()` helper for validating `process.env`
 * at application startup. Each Smart EDMS app (backend, license-server,
 * license-admin, electron main) composes the schemas it needs and calls
 * `loadConfig()` once at boot.
 *
 * Spec ref: §15.1 (environment configuration), §21.6 (configuration
 * validation at startup — fail fast on missing secrets).
 *
 * Conventions:
 *  - All schemas accept the raw `process.env` shape (string-valued) and
 *    coerce numeric / boolean values via `z.coerce`.
 *  - Production-only strict enforcement (e.g. `JWT_SECRET` ≥ 64 chars) is
 *    expressed via `superRefine` so the same schema can be used in dev
 *    (lenient) and prod (strict).
 *  - Schemas are composable: callers can `schema.merge(otherSchema)` to
 *    build an app-specific config shape.
 *  - No `z.any()`. Secret values use `z.string().min(N)` only.
 */

export {
  DatabaseConfigSchema,
  type DatabaseConfig,
} from './database';

export {
  RedisConfigSchema,
  type RedisConfig,
} from './redis';

export {
  JwtConfigSchema,
  type JwtConfig,
} from './jwt';

export {
  StorageConfigSchema,
  type StorageConfig,
} from './storage';

export {
  LicenseConfigSchema,
  type LicenseConfig,
} from './license';

export {
  AiConfigSchema,
  type AiConfig,
} from './ai';

export {
  loadConfig,
  safeLoadConfig,
  ConfigValidationError,
} from './loader';
