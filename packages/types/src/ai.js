"use strict";
/**
 * @smart-edms/types — AI Assistant Bubble (spec §11, §11.17)
 *
 * Purpose: model the AI Assistant session, messages, tool invocations,
 * actions, settings, audit events, tool catalog, citations, and the
 * secure AI context envelope.
 *
 * Critical rules (spec §11.1, §11.4, §11.5, §11.9, §11.10):
 *  - The AI acts on behalf of the authenticated user; never as a superuser.
 *  - Read-only by default. Sensitive actions require explicit confirmation;
 *    destructive actions require a dedicated confirmed UI flow.
 *  - Document content is untrusted data; prompt-injection protections apply.
 *  - Data minimization: only retrieve the minimum data necessary.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=ai.js.map