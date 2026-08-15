/**
 * @smart-edms/utils
 *
 * Shared, framework-agnostic utility functions used across every Smart EDMS
 * app — backend, license-server, license-admin panel, Electron client, and
 * the marketing site. This is a LEAF package: it has no `@smart-edms/*`
 * dependencies so it can be imported anywhere without dragging in domain
 * types or schemas.
 *
 * Conventions:
 *  - No `any`. Untrusted input is typed `unknown` and narrowed with guards.
 *  - All functions are pure unless explicitly noted (the only impure
 *    functions are `crypto.randomToken`, `async.sleep`, `async.retry`, and
 *    `async.mapLimit`, which are async-by-nature).
 *  - No external runtime dependencies — Node.js `crypto` and `Buffer` only.
 *  - Every exported symbol has a JSDoc comment describing its contract.
 *
 * Re-exported surface is flat: `import { sha256, uuid, sanitizeFilename } from '@smart-edms/utils'`.
 */

// Cryptographic helpers (sha256, random tokens, base64url, constant-time compare)
export * from './crypto';

// Identifier generators (UUIDv4, ULID, short id)
export * from './id';

// String helpers (filename sanitization, slugify, truncate, pluralize, casing)
export * from './string';

// Date helpers (ISO date conversions, relative formatting, expiry checks)
export * from './date';

// Object helpers (deepFreeze, omit, pick, deepEqual)
export * from './object';

// Async helpers (sleep, withTimeout, retry, mapLimit)
export * from './async';

// Lightweight format validators (isEmail, isUrl, isUuid, isISODate)
export * from './validation';
