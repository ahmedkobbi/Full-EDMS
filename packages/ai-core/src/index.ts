/**
 * @smart-edms/ai-core
 *
 * Framework-agnostic AI Assistant core (spec §11). Contains:
 *  - The tool catalog spec (16 whitelisted tools, their permissions and
 *    license-module requirements) — imported by the backend's
 *    `tool-catalog.ts` which adds the `execute()` functions.
 *  - The prompt-injection detector (20 regex patterns, extracted from the
 *    backend so it can be tested without NestJS).
 *  - The citation builder (filters documents to those the user can access).
 *  - The secure AI context envelope builder (spec §11.7).
 *  - The destructive-action deny-list (spec §11.4 — 7 action types the AI
 *    must NEVER execute silently).
 *
 * Critical rules (spec §11.1, §11.4, §11.5, §11.7, §11.9, §11.10):
 *  - The AI acts on behalf of the authenticated user; never as a superuser.
 *  - Read-only by default. Destructive actions require a dedicated
 *    confirmed UI flow (never silent execution).
 *  - Document content is untrusted data; prompt-injection protections apply.
 *  - The context envelope MUST NOT include secrets, tokens, private keys,
 *    full DB credentials, or unrestricted permission bypass.
 *  - Data minimization: only retrieve the minimum data necessary.
 *
 * React-independent and NestJS-independent. Consumed by:
 *  - `apps/backend/src/modules/ai/` — the AI gateway service.
 *  - `apps/electron/src/renderer/components/ai/` — the bubble (for the
 *    destructive-action deny-list + citation typing).
 *  - future test suites that need to assert on tool catalog shape without
 *    importing NestJS.
 */

export {
  AI_TOOL_CATALOG,
  type AiToolCatalogEntry,
  type AiToolCatalogPermissionMap,
  ROLES_BY_PERMISSION,
  isToolAuthorized,
} from './tool-catalog';

export {
  detectPromptInjection,
  isBlocked,
  PROMPT_INJECTION_MAX_INPUT_LENGTH,
  type PromptInjectionMode,
} from './prompt-injection';

export type {
  PromptInjectionDetection,
} from '@smart-edms/types';

export {
  buildCitations,
  type CitationInput,
} from './citations';

export {
  buildContextEnvelope,
  type ContextEnvelopeUser,
  type ContextEnvelopeTenant,
  type ContextEnvelopeLicense,
} from './context-envelope';

export {
  DESTRUCTIVE_ACTIONS,
  isDestructiveAction,
} from './destructive-actions';
