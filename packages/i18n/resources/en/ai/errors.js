"use strict";
/**
 * @smart-edms/i18n — English baseline: `ai.errors` namespace (spec §16.4)
 *
 * AI-specific error messages. Distinct from the global `errors` namespace
 * because AI errors carry extra context (prompt injection, license limits,
 * tool failures).
 *
 * REVIEW: AI-safety-relevant strings. English baseline is written by a
 * senior engineer but should be reviewed by an AI safety specialist
 * before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const aiErrors = {
    'unavailable': 'The AI assistant is unavailable. Please try again later.',
    'unavailable.long': 'The AI assistant is unavailable. This may be a temporary outage. You can continue to use Smart EDMS without AI features.',
    'notLicensed': 'AI assistant features are not included in your current license plan. Contact your administrator to upgrade.',
    'notEnabled': 'AI assistant is not enabled for your organisation. Contact your administrator.',
    'toolForbidden': 'You do not have permission to use this AI tool.',
    'toolDisabled': 'This AI tool has been disabled by your administrator.',
    'toolNotFound': 'The requested AI tool could not be found.',
    'toolFailed': 'The AI tool failed to complete. Please try again.',
    'toolTimeout': 'The AI tool took too long to respond. Please try again or rephrase your request.',
    'rateLimited': 'You have reached the AI rate limit. Please wait {seconds, plural, one {# second} other {# seconds}} before trying again.',
    'quotaExceeded': 'You have used your daily AI quota. Please try again tomorrow.',
    'quotaExceeded.tokens': 'You have used {{used}} of {{limit}} tokens today.',
    'contextTooLarge': 'The context you provided is too large. Try selecting a smaller portion of the document.',
    'contextTooLarge.details': 'The context is {{actual}} tokens but the model accepts at most {{max}} tokens.',
    'promptEmpty': 'Please enter a question or instruction for the AI.',
    'promptTooLong': 'Your message is too long. Please shorten it.',
    'promptInjectionDetected': 'A potential prompt injection was detected in your input. The request has been blocked for safety.',
    'promptInjectionDetected.details': 'The system detected instructions embedded in the input that appear to be an attempt to manipulate the AI. If this is a false positive, please rephrase your input and try again.',
    'promptInjectionDetected.document': 'The document you attached appears to contain a prompt injection. The request has been blocked. Please review the document manually.',
    'sensitiveContent': 'The AI refused to process this request because it appears to involve sensitive content.',
    'externalDisabled': 'External AI providers are disabled for your organisation. Please use a local model or contact your administrator.',
    'externalUnavailable': 'The external AI provider is unavailable. Please try again later.',
    'externalError': 'The external AI provider returned an error. Please try again.',
    'localUnavailable': 'The local AI model is unavailable. Please try again later or switch to an external model.',
    'localError': 'The local AI model encountered an error. Please try again.',
    'modelNotFound': 'The selected AI model could not be found.',
    'modelDeprecated': 'The selected AI model has been deprecated. Please choose a different model.',
    'modelOverloaded': 'The selected AI model is currently overloaded. Please try again later or choose a different model.',
    'invalidResponse': 'The AI returned an invalid response. Please try again or rephrase your request.',
    'noCitations': 'The AI could not find any documents to cite for this response. The response may be unreliable.',
    'citationBlocked': 'The AI attempted to cite a document you do not have access to. The citation has been removed.',
    'actionRequiresConfirmation': 'This AI action requires your confirmation before it can be applied.',
    'actionBlocked': 'This AI action has been blocked by policy.',
    'actionBlocked.legalHold': 'This AI action is blocked because the document is under legal hold.',
    'actionBlocked.retention': 'This AI action is blocked because the document is under an active retention schedule.',
    'actionBlocked.classification': 'This AI action is blocked because of the document’s classification level.',
    'actionFailed': 'The AI action failed to apply. Please try again or apply the change manually.',
    'sessionExpired': 'Your AI session has expired. Please start a new session.',
    'sessionNotFound': 'The AI session could not be found. It may have been deleted.',
    'feedbackFailed': 'Could not submit your feedback. Please try again.',
    'unknown': 'An unexpected error occurred while processing your AI request. Please try again.',
    'safety.title': 'AI safety',
    'safety.disclaimer': 'Smart EDMS AI safety guardrails are active. The AI cannot:',
    'safety.disclaimer.bullet1': 'Modify any document without your explicit confirmation.',
    'safety.disclaimer.bullet2': 'Cite documents you do not have access to.',
    'safety.disclaimer.bullet3': 'Execute prompt injections embedded in documents.',
    'safety.disclaimer.bullet4': 'Bypass your organisation’s retention, legal hold, or classification policies.',
    'safety.disclaimer.bullet5': 'Give legal, medical, or financial advice.',
    'safety.report': 'Report an AI safety concern',
    'safety.report.placeholder': 'Describe what happened',
    'safety.report.success': 'Thank you. Your report has been logged and will be reviewed by an AI safety specialist.',
};
exports.default = aiErrors;
//# sourceMappingURL=errors.js.map