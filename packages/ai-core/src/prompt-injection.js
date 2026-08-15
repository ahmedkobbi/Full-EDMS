"use strict";
/**
 * @smart-edms/ai-core — prompt-injection detection (spec §11.9, §11.10).
 *
 * Document content and user input are treated as UNTRUSTED DATA. This module
 * performs lightweight heuristic detection of prompt-injection patterns and
 * returns a {@link PromptInjectionDetection} result.
 *
 * CRITICAL RULES (spec §11.9, §11.10, §27.3):
 *  - Detection is heuristic, not cryptographic. False positives and false
 *    negatives are both possible. Always log the detection and never rely
 *    on it as the sole defence.
 *  - When in doubt, BLOCK. The cost of a false positive (user rephrases) is
 *    much lower than the cost of a successful injection (data exfiltration,
 *    privilege escalation, destructive action).
 *  - The detector NEVER returns the offending text — only a localised
 *    explanation key (spec §11.10 — data minimisation in audit logs).
 *
 * This file is a 1:1 extraction of the backend's
 * `apps/backend/src/modules/ai/prompt-injection.ts` so the same logic is
 * available framework-agnostically (for tests, for the Electron client's
 * pre-flight check, and for the License Admin panel's audit-log viewer).
 *
 * Patterns covered (20 total):
 *   - Embedded instruction overrides (6):
 *       "ignore previous instructions", "disregard prior", "you are now",
 *       "new instructions:", "system prompt:", "pretend you are"
 *   - Secret / system-prompt extraction (4):
 *       "reveal system prompt", "show your secrets", "print env vars",
 *       "what is your system message"
 *   - Raw SQL / DB access (6):
 *       "execute raw sql", "run this sql", "select * from", "dump database",
 *       "show all rows", "read raw database"
 *   - Endpoint abuse / privilege escalation (4):
 *       "act as root", "escalate privileges", "bypass authorization",
 *       "execute as superuser"
 *
 * Spec ref: §11.9 (prompt injection), §11.10 (data minimisation),
 * §27.3 (security rules — fail closed on suspicious input).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPT_INJECTION_MAX_INPUT_LENGTH = void 0;
exports.detectPromptInjection = detectPromptInjection;
exports.isBlocked = isBlocked;
/**
 * Maximum input length the detector will scan. Inputs longer than this are
 * truncated to the first 16 KB to prevent regex-DoS via pathologically long
 * payloads. Spec ref: §11.9.
 */
exports.PROMPT_INJECTION_MAX_INPUT_LENGTH = 16_384;
/**
 * Static catalogue of injection patterns. The order matters only for
 * reporting — the detector returns the FIRST match (most specific first).
 */
const PATTERNS = [
    // ── Embedded instruction overrides (6 patterns) ──────────────────────
    {
        regex: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?|directives?)/i,
        category: 'embedded_instruction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /disregard\s+(all\s+)?(prior|previous|above)\s+(instructions?|rules?|prompts?)/i,
        category: 'embedded_instruction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\byou\s+are\s+now\s+(an?\s+)?(admin|root|superuser|developer|root\s+user)\b/i,
        category: 'embedded_instruction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\b(new\s+instructions?|updated?\s+rules?)\s*[:\-]\s/i,
        category: 'embedded_instruction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\b(system\s+prompt|hidden\s+prompt|developer\s+prompt)\s*[:=]/i,
        category: 'embedded_instruction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(admin|root|developer|unrestricted)/i,
        category: 'embedded_instruction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    // ── Secret / system-prompt extraction (4 patterns) ───────────────────
    {
        regex: /(reveal|show|print|display|dump|expose)\s+(me\s+)?(your|the)\s+(system\s+prompt|instructions?|initial\s+message|hidden\s+prompt|rules?)/i,
        category: 'secret_extraction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /(reveal|show|print|display|expose)\s+(your|the|all)\s+(secrets?|api\s+keys?|tokens?|passwords?|credentials?|private\s+keys?|jwt)/i,
        category: 'secret_extraction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /(print|dump|show|list)\s+(all\s+)?environment\s+variables?/i,
        category: 'secret_extraction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /what\s+is\s+(your|the)\s+(system\s+message|system\s+prompt|hidden\s+instruction)/i,
        category: 'secret_extraction',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    // ── Raw SQL / DB access (6 patterns) ─────────────────────────────────
    {
        regex: /execute\s+(raw\s+)?sql\b/i,
        category: 'sql_injection',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\brun\s+this\s+sql\b/i,
        category: 'sql_injection',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\b(select\s+\*\s+from|drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set|truncate\s+table)\b/i,
        category: 'sql_injection',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /(dump|export\s+all|download\s+all)\s+(the\s+)?(database|db|tables?|rows?|records?)/i,
        category: 'sql_injection',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /(show|fetch|list)\s+(me\s+)?all\s+(rows?|records?|documents?|users?|tenants?|data)/i,
        category: 'sql_injection',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\b(read|access|query)\s+(the|all)\s+(raw\s+)?(database|db|tables?)\b/i,
        category: 'sql_injection',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    // ── Endpoint abuse / privilege escalation (4 patterns) ───────────────
    {
        regex: /\b(act\s+as|become|impersonate)\s+(root|admin|administrator|superuser|developer)\b/i,
        category: 'endpoint_abuse',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\b(escalate|elevate)\s+(my\s+)?(privileges?|permissions?|rights?|role)\b/i,
        category: 'endpoint_abuse',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\b(bypass|circumvent|skip|disable)\s+(authorization|authorisation|permissions?|rbac|access\s+control|tenant\s+isolation)\b/i,
        category: 'endpoint_abuse',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
    {
        regex: /\b(execute|run)\s+as\s+(root|admin|superuser|another\s+(tenant|user))\b/i,
        category: 'endpoint_abuse',
        explanationKey: 'ai.errors.promptInjectionDetected',
    },
];
/** A "no detection" sentinel — returned when no patterns match. */
const NO_DETECTION = {
    detected: false,
    explanationKey: null,
    blocked: false,
    category: 'other',
};
/**
 * Run prompt-injection detection over a piece of untrusted text.
 *
 * @param input — the user message OR the document content the AI is about to
 *                read. Treated as untrusted data per spec §11.9.
 * @param mode  — `'block'` (default) sets `blocked: true` when detection
 *                fires; `'audit'` only flags without blocking (useful for
 *                document content where the AI is summarising and a single
 *                match should not silently refuse the whole request).
 * @returns a {@link PromptInjectionDetection} result. The result NEVER
 *          includes the offending text — only a localised `explanationKey`
 *          (spec §11.10 — data minimisation in audit logs).
 */
function detectPromptInjection(input, mode = 'block') {
    if (!input || typeof input !== 'string' || input.length === 0) {
        return NO_DETECTION;
    }
    // Cap the inspection window — extremely long inputs are truncated to the
    // first 16 KB so a malicious payload cannot DoS the regex engine.
    const haystack = input.length > exports.PROMPT_INJECTION_MAX_INPUT_LENGTH
        ? `${input.slice(0, exports.PROMPT_INJECTION_MAX_INPUT_LENGTH)}…`
        : input;
    for (const pattern of PATTERNS) {
        if (pattern.regex.test(haystack)) {
            return {
                detected: true,
                explanationKey: pattern.explanationKey,
                blocked: mode === 'block',
                category: pattern.category,
            };
        }
    }
    return NO_DETECTION;
}
/**
 * Convenience: returns `true` when the detection result is blocking.
 * The AI service should refuse to proceed when this returns `true`.
 */
function isBlocked(detection) {
    return detection.detected && detection.blocked;
}
//# sourceMappingURL=prompt-injection.js.map