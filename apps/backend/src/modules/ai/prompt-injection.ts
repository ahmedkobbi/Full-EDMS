/**
 * Smart EDMS — AI Assistant prompt-injection detection (spec §11.9).
 *
 * Document content and user input are treated as UNTRUSTED DATA. This module
 * performs lightweight heuristic detection of prompt-injection patterns and
 * returns a {@link PromptInjectionDetection} result.
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
 *
 * Patterns covered (per task spec):
 *   - Embedded instruction overrides:
 *       "ignore previous instructions", "ignore the above", "disregard prior",
 *       "you are now", "new instructions:", "system prompt:"
 *   - Secret / system-prompt extraction:
 *       "reveal system prompt", "show your instructions", "print your prompt",
 *       "what is your system message", "dump the system prompt",
 *       "show me your secrets", "reveal your api key", "show the jwt secret",
 *       "print all environment variables"
 *   - Raw SQL / DB access:
 *       "execute raw sql", "run this sql", "select * from", "drop table",
 *       "dump database", "show all data", "fetch all rows", "delete from"
 *   - Endpoint abuse / privilege escalation:
 *       "act as root", "act as administrator", "become admin", "escalate
 *       privileges", "bypass authorization", "bypass permissions",
 *       "execute as superuser"
 *
 * Spec ref: §11.9 (prompt injection), §11.10 (data minimisation),
 * §27.3 (security rules — fail closed on suspicious input).
 */

import type { PromptInjectionDetection } from '@smart-edms/types';

/** Category bucket each pattern maps to. */
type InjectionCategory = PromptInjectionDetection['category'];

interface InjectionPattern {
  /** Lowercased regex; tested against the lower-cased input. */
  readonly regex: RegExp;
  readonly category: InjectionCategory;
  /** Localised message key shown to the user when this pattern fires. */
  readonly explanationKey: string;
}

/**
 * Static catalogue of injection patterns. The order matters only for
 * reporting — the detector returns the FIRST match (most specific first).
 */
const PATTERNS: readonly InjectionPattern[] = [
  // ── Embedded instruction overrides ───────────────────────────────────────
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

  // ── Secret / system-prompt extraction ────────────────────────────────────
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

  // ── Raw SQL / DB access ─────────────────────────────────────────────────
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

  // ── Endpoint abuse / privilege escalation ───────────────────────────────
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
  {
    regex: /\b(access|read|modify)\s+another\s+(tenant|user|organisation)'s\s+(data|documents?|records?)\b/i,
    category: 'endpoint_abuse',
    explanationKey: 'ai.errors.promptInjectionDetected',
  },
];

/** A "no detection" sentinel — returned when no patterns match. */
const NO_DETECTION: PromptInjectionDetection = {
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
 * @returns a {@link PromptInjectionDetection} result.
 */
export function detectPromptInjection(
  input: string,
  mode: 'block' | 'audit' = 'block',
): PromptInjectionDetection {
  if (!input || typeof input !== 'string' || input.length === 0) {
    return NO_DETECTION;
  }
  // Cap the inspection window — extremely long inputs are truncated to the
  // first 16 KB so a malicious payload cannot DoS the regex engine.
  const haystack = input.length > 16_384 ? `${input.slice(0, 16_384)}…` : input;

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
export function isBlocked(detection: PromptInjectionDetection): boolean {
  return detection.detected && detection.blocked;
}
