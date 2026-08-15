# @smart-edms/utils

Shared, framework-agnostic utility functions used across all Smart EDMS apps
(backend, license-server, license-admin, electron, marketing).

## Modules

- **crypto** — `sha256`, `randomToken`, `base64urlEncode/Decode`, `constantTimeEqual`
- **id** — `uuid`, `ulid` (sortable), `shortId`
- **string** — `sanitizeFilename`, `truncate`, `slugify`, `camelToKebab`, `pluralize`
- **date** — `toISODate`, `fromISODate`, `formatRelative`, `isExpired`, `daysUntil`
- **object** — `deepFreeze`, `omit`, `pick`, `deepEqual`
- **async** — `sleep`, `withTimeout`, `retry`, `mapLimit`
- **validation** — `isEmail`, `isUrl`, `isUuid`, `isISODate`

## Design

- Leaf package — no `@smart-edms/*` dependencies.
- Pure TypeScript, strict mode, ESM, no `any`.
- All functions are pure (no side effects, no I/O) except `crypto.randomToken`
  and `async.sleep` / `async.retry` / `async.mapLimit`.
- Node.js `crypto` and `Buffer` only — no external dependencies.

## Build

```bash
pnpm --filter @smart-edms/utils build      # tsup → dist/
pnpm --filter @smart-edms/utils typecheck  # tsc --noEmit
pnpm --filter @smart-edms/utils test       # vitest
```
