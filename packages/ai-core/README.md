# @smart-edms/ai-core

Framework-agnostic AI Assistant core (spec §11). No React, no NestJS —
contains the **spec contract** for the AI gateway, the prompt-injection
detector, the citation builder, the secure context envelope builder, and
the destructive-action deny-list.

## Modules

- **`tool-catalog`** — re-exports the 16 tool definitions (name, description,
  required permission, required license module) as a framework-agnostic
  catalog. The backend's `tool-catalog.ts` imports this and adds `execute()`.
- **`prompt-injection`** — the 20-regex detector. Extracted here from
  `apps/backend/src/modules/ai/prompt-injection.ts` so both the backend and
  future tests can use it without importing NestJS.
- **`citations`** — `buildCitations(documents, userPermissions)` filters
  documents to only those the user can access (spec §11.8).
- **`context-envelope`** — `buildContextEnvelope(user, tenant, license)`
  builds the secure AI context envelope (spec §11.7), explicitly EXCLUDING
  secrets / tokens / private keys.
- **`destructive-actions`** — the Set of 7 destructive action types that
  must NEVER be executed by AI (spec §11.4).

## Build

```bash
pnpm --filter @smart-edms/ai-core build
pnpm --filter @smart-edms/ai-core typecheck
pnpm --filter @smart-edms/ai-core test
```
