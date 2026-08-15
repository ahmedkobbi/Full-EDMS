"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDestructiveAction = exports.DESTRUCTIVE_ACTIONS = exports.buildContextEnvelope = exports.buildCitations = exports.PROMPT_INJECTION_MAX_INPUT_LENGTH = exports.isBlocked = exports.detectPromptInjection = exports.isToolAuthorized = exports.ROLES_BY_PERMISSION = exports.AI_TOOL_CATALOG = void 0;
var tool_catalog_1 = require("./tool-catalog");
Object.defineProperty(exports, "AI_TOOL_CATALOG", { enumerable: true, get: function () { return tool_catalog_1.AI_TOOL_CATALOG; } });
Object.defineProperty(exports, "ROLES_BY_PERMISSION", { enumerable: true, get: function () { return tool_catalog_1.ROLES_BY_PERMISSION; } });
Object.defineProperty(exports, "isToolAuthorized", { enumerable: true, get: function () { return tool_catalog_1.isToolAuthorized; } });
var prompt_injection_1 = require("./prompt-injection");
Object.defineProperty(exports, "detectPromptInjection", { enumerable: true, get: function () { return prompt_injection_1.detectPromptInjection; } });
Object.defineProperty(exports, "isBlocked", { enumerable: true, get: function () { return prompt_injection_1.isBlocked; } });
Object.defineProperty(exports, "PROMPT_INJECTION_MAX_INPUT_LENGTH", { enumerable: true, get: function () { return prompt_injection_1.PROMPT_INJECTION_MAX_INPUT_LENGTH; } });
var citations_1 = require("./citations");
Object.defineProperty(exports, "buildCitations", { enumerable: true, get: function () { return citations_1.buildCitations; } });
var context_envelope_1 = require("./context-envelope");
Object.defineProperty(exports, "buildContextEnvelope", { enumerable: true, get: function () { return context_envelope_1.buildContextEnvelope; } });
var destructive_actions_1 = require("./destructive-actions");
Object.defineProperty(exports, "DESTRUCTIVE_ACTIONS", { enumerable: true, get: function () { return destructive_actions_1.DESTRUCTIVE_ACTIONS; } });
Object.defineProperty(exports, "isDestructiveAction", { enumerable: true, get: function () { return destructive_actions_1.isDestructiveAction; } });
//# sourceMappingURL=index.js.map