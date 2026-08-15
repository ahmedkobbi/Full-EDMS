# @smart-edms/config

Reusable Zod schemas + a `loadConfig()` helper for validating `process.env`
at startup. Currently every Smart EDMS app has its own `config/environment.ts`
that re-implements the same database / redis / jwt / storage / license / ai
validation rules — this package centralises them so all apps share the same
contract.

## Schemas

- **`DatabaseConfigSchema`** — `DATABASE_URL`, `DATABASE_POOL_MAX`, `DATABASE_SSL`
- **`RedisConfigSchema`** — `REDIS_URL`, `REDIS_MAX_RETRIES`, `REDIS_KEY_PREFIX`
- **`JwtConfigSchema`** — `JWT_SECRET`, access + refresh TTL (production min 64 chars)
- **`StorageConfigSchema`** — S3 endpoint, credentials, bucket, region, path style
- **`LicenseConfigSchema`** — public key path, server URL, heartbeat, grace
- **`AiConfigSchema`** — provider mode, external API URL/key, local API URL, timeout

## Loader

```ts
import { DatabaseConfigSchema, loadConfig } from '@smart-edms/config';

const db = loadConfig(DatabaseConfigSchema, process.env);
// db.DATABASE_URL — typed, validated
```

`loadConfig(schema, source)` validates `source` against the schema and throws
an `ConfigValidationError` listing ALL issues (not just the first) on failure.

## Build

```bash
pnpm --filter @smart-edms/config build
pnpm --filter @smart-edms/config typecheck
pnpm --filter @smart-edms/config test
```
