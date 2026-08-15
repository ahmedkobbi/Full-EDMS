"use strict";
/**
 * @smart-edms/i18n — English baseline: `ai.disclaimer` namespace (spec §16.4)
 *
 * AI assistant safety disclaimers. Each string corresponds to a specific
 * guardrail or limitation. These appear in the AI bubble, in tooltips,
 * and in the audit log.
 *
 * REVIEW: AI-safety-relevant strings. English baseline is written by a
 * senior engineer but should be reviewed by an AI safety specialist
 * before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const aiDisclaimer = {
    'title': 'AI disclaimers',
    'subtitle': 'How the AI assistant stays safe and trustworthy.',
    'readOnlyDefault': 'The AI assistant is read-only by default. It can read documents you have access to and answer questions, but it cannot modify anything without your explicit confirmation.',
    'readOnlyDefault.short': 'Read-only by default. Confirmation required for changes.',
    'confirmationRequired': 'Every AI action that would modify a document, metadata, workflow, or setting requires your explicit confirmation. You see exactly what the AI proposes to do before anything happens.',
    'confirmationRequired.short': 'Every change requires your confirmation.',
    'notLegalAdvice': 'The AI assistant can summarise legal documents but cannot give legal advice. For legal decisions, consult a qualified lawyer. AI-generated summaries of legal text are drafts, not legal opinions.',
    'notLegalAdvice.short': 'Not legal advice. Consult a qualified lawyer for legal decisions.',
    'citationsLimitedToAccessible': 'Every claim the AI makes is backed by a citation to a specific document. The AI can only cite documents you have permission to access — it cannot use documents outside your reach to support its answers.',
    'citationsLimitedToAccessible.short': 'Citations are limited to documents you can access.',
    'toolAudited': 'Every AI tool invocation is recorded in the tamper-evident audit log. The prompt, the response, the documents accessed, and the user who triggered the call are all preserved for compliance review.',
    'toolAudited.short': 'Every AI tool call is audited.',
    'promptInjectionProtected': 'The AI assistant is protected against prompt injection — attempts to manipulate the AI by embedding instructions inside document content. Detected injections are blocked and reported.',
    'promptInjectionProtected.short': 'Protected against prompt injection.',
    'degradesGracefully': 'If the AI assistant becomes unavailable — provider outage, license limit, network issue — Smart EDMS continues to work normally. You lose only the AI features temporarily; your documents and workflows keep working.',
    'degradesGracefully.short': 'Degrades gracefully when AI is unavailable.',
    'mayContainErrors': 'AI-generated responses may contain errors. Verify important details against the cited sources before relying on them.',
    'mayContainErrors.short': 'May contain errors. Verify before relying on it.',
    'noPersonalDataToExternal': 'When using an external AI provider, Smart EDMS minimises the data sent. Personally identifiable information is redacted where possible. Use a local or hybrid model for sensitive documents.',
    'noPersonalDataToExternal.short': 'Personally identifiable information is redacted before sending to external AI providers.',
    'humanReviewRequired': 'AI suggestions for classification, retention, and legal hold are advisory only. A human user must approve every such decision.',
    'humanReviewRequired.short': 'AI suggestions for compliance are advisory. Human approval required.',
    'notForHighStakes': 'For high-stakes decisions — legal, medical, financial — treat AI output as a draft, not as final. Always consult a qualified professional.',
    'notForHighStakes.short': 'For high-stakes decisions, treat AI output as a draft.',
    'modelCapabilities': 'AI capabilities depend on the model in use. Larger models are more capable but slower and more expensive. Smart EDMS picks the right model for each task in hybrid mode.',
    'modelCapabilities.short': 'Capabilities depend on the model.',
    'contextLimits': 'The AI can only consider a limited amount of context at once. For very long documents, it may miss details near the beginning or end. Provide focused context for best results.',
    'contextLimits.short': 'Context is limited. Focus your question for best results.',
    'languageAccuracy': 'AI is most accurate in English. Translations and summaries in other languages may contain errors. Have a native speaker review compliance-critical content.',
    'languageAccuracy.short': 'Most accurate in English. Review translations in other languages.',
    'versionTransparency': 'The AI model and version are recorded with every response so you can verify which model produced a given answer.',
    'versionTransparency.short': 'Model and version are recorded with every response.',
    'noSelfModification': 'The AI cannot modify its own configuration, license, or audit trail. These are protected by separate authentication and authorisation.',
    'noSelfModification.short': 'The AI cannot modify its own settings or audit trail.',
    'complianceOverride': 'AI actions are subject to the same compliance rules as human actions. Retention schedules, legal holds, and classification policies apply equally.',
    'complianceOverride.short': 'AI is subject to the same compliance rules as humans.',
    'feedbackLoop': 'Your feedback helps improve the AI. Use the helpful / not helpful buttons on each response to guide future improvements.',
    'feedbackLoop.short': 'Your feedback improves the AI.',
    'disclaimerBanner': 'AI-generated responses may contain errors. Verify against cited sources. Not legal, medical, or financial advice.',
};
exports.default = aiDisclaimer;
//# sourceMappingURL=disclaimer.js.map