/**
 * Smart EDMS — AI Assistant prompt-injection detection (spec §11.9).
 *
 * This module is now a thin re-export from `@smart-edms/ai-core`, which is
 * the framework-agnostic, NestJS-free implementation. Both the backend and
 * the test suite import from the shared package to avoid duplication.
 *
 * Spec ref: §11.9 (Prompt Injection Protection), §11.10 (Data Minimization).
 *
 * CRITICAL RULES (spec §11.9, §11.10):
 *  - Detection is heuristic, not cryptographic. False positives and false
 *    negatives are both possible. Always log the detection and never rely
 *    on it as the sole defence.
 *  - When in doubt, BLOCK. The cost of a false positive (user rephrases) is
 *    much lower than the cost of a successful injection (data exfiltration,
 *    privilege escalation, destructive action).
 *  - The detector NEVER returns the offending text — only a localised
 *    explanation key (spec §11.10 — data minimisation in audit logs).
 */
export {
  detectPromptInjection,
  type PromptInjectionDetection,
  type PromptInjectionCategory,
} from '@smart-edms/ai-core';
