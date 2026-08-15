"use strict";
/**
 * @smart-edms/i18n — fr translation: `ai.common` namespace.
 *
 * Source of truth: en/ai/common.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const common = {
    title: 'AI assistant', // falls back to English
    subtitle: 'Your AI helper inside Smart EDMS.', // falls back to English
    'status.online': 'AI assistant online', // falls back to English
    'status.offline': 'AI assistant offline', // falls back to English
    'status.thinking': 'AI is thinking…', // falls back to English
    'status.processing': 'Processing…', // falls back to English
    'status.unavailable': 'AI assistant is temporarily unavailable.', // falls back to English
    'status.degraded': 'AI assistant is in degraded mode.', // falls back to English
    'status.rateLimited': 'AI assistant rate limit reached. Please try again in a moment.', // falls back to English
    'mode.title': 'AI mode', // falls back to English
    'mode.external': 'External AI', // falls back to English
    'mode.local': 'Local AI', // falls back to English
    'mode.hybrid': 'Hybrid', // falls back to English
    'mode.description.external': 'AI requests are sent to an external provider. Faster, but data leaves your tenant.', // falls back to English
    'mode.description.local': 'AI requests run on a local model. Slower, but data never leaves your tenant.', // falls back to English
    'mode.description.hybrid': 'Smart EDMS picks the right model for each request based on sensitivity and speed.', // falls back to English
    'model.title': 'Model', // falls back to English
    'model.select': 'Select model', // falls back to English
    'model.current': 'Current model: {{model}}', // falls back to English
    'model.capabilities': 'Capabilities', // falls back to English
    'model.contextWindow': 'Context window', // falls back to English
    'model.maxTokens': 'Max tokens per request', // falls back to English
    'model.updated': 'Model updated to {{model}}.', // falls back to English
    'session.title': 'AI session', // falls back to English
    'session.new': 'New session', // falls back to English
    'session.history': 'Session history', // falls back to English
    'session.clear': 'Clear session', // falls back to English
    'session.clear.confirm': 'Clear this AI session? The conversation will be permanently deleted.', // falls back to English
    'session.export': 'Export session', // falls back to English
    'session.empty': 'No AI sessions yet.', // falls back to English
    'session.count': '{count, plural, one {# session} other {# sessions}}', // falls back to English
    'message.placeholder': 'Ask the AI assistant anything about your documents…', // falls back to English
    'message.send': 'Send', // falls back to English
    'message.stop': 'Stop', // falls back to English
    'message.regenerate': 'Regenerate response', // falls back to English
    'message.copy': 'Copy response', // falls back to English
    'message.copy.success': 'Response copied to clipboard.', // falls back to English
    'message.edit': 'Edit message', // falls back to English
    'message.delete': 'Delete message', // falls back to English
    'message.delete.confirm': 'Delete this message?', // falls back to English
    'message.role.user': 'You', // falls back to English
    'message.role.assistant': 'AI assistant', // falls back to English
    'message.role.system': 'System', // falls back to English
    'message.timestamp': 'Sent at {{time}}', // falls back to English
    'settings.title': 'AI assistant settings', // falls back to English
    'settings.subtitle': 'Configure how the AI behaves for you.', // falls back to English
    'settings.mode': 'Default mode', // falls back to English
    'settings.model': 'Default model', // falls back to English
    'settings.citations': 'Always show citations', // falls back to English
    'settings.disclaimer': 'Show disclaimer on every response', // falls back to English
    'settings.confirmationRequired': 'Require confirmation for all actions', // falls back to English
    'settings.proactive': 'Allow proactive suggestions', // falls back to English
    'settings.maxTokensPerRequest': 'Max tokens per request', // falls back to English
    'settings.maxTokensPerDay': 'Max tokens per day', // falls back to English
    'settings.usedToday': 'Used today: {{used}} of {{limit}} tokens', // falls back to English
    'settings.usage.unlimited': 'Usage: unlimited', // falls back to English
    'settings.save': 'Save settings', // falls back to English
    'settings.saved': 'AI settings updated.', // falls back to English
    'tools.title': 'Available tools', // falls back to English
    'tools.subtitle': 'The AI can use these tools. Your administrator controls which are enabled.', // falls back to English
    'tools.enabled': 'Enabled', // falls back to English
    'tools.disabled': 'Disabled', // falls back to English
    'tools.allowlist': 'Tool allowlist', // falls back to English
    'tools.disclaimer': 'Tools are audited. Every invocation is recorded in the audit log.', // falls back to English
    'disclaimer.short': 'AI-generated. Verify before relying on it.', // falls back to English
    'disclaimer.long': 'This response was generated by an AI assistant. It may contain errors. Verify important details against the cited sources before relying on this response.', // falls back to English
    'feedback.title': 'Was this response helpful?', // falls back to English
    'feedback.helpful': 'Helpful', // falls back to English
    'feedback.notHelpful': 'Not helpful', // falls back to English
    'feedback.flag': 'Report a problem', // falls back to English
    'feedback.flag.placeholder': 'What went wrong?', // falls back to English
    'feedback.thanks': 'Thanks for the feedback!', // falls back to English
    'history.title': 'Conversation history', // falls back to English
    'history.empty': 'No messages yet. Ask the AI something!', // falls back to English
    'history.scrollBottom': 'Jump to latest', // falls back to English
    'history.scrollTop': 'Jump to start', // falls back to English
    'quota.title': 'AI quota', // falls back to English
    'quota.subtitle': 'Your AI usage for today.', // falls back to English
    'quota.tokensUsed': 'Tokens used', // falls back to English
    'quota.requestsMade': 'Requests made', // falls back to English
    'quota.resets': 'Resets in {{hours}} hours', // falls back to English
    'quota.exceeded': 'You have reached your daily AI quota. Please try again tomorrow.', // falls back to English
    'quota.warning': 'You have used {{percent}}% of your daily AI quota.', // falls back to English
};
exports.default = common;
//# sourceMappingURL=common.js.map