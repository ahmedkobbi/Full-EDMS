"use strict";
/**
 * @smart-edms/i18n — de translation: `ai.bubble` namespace.
 *
 * Source of truth: en/ai/bubble.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const bubble = {
    title: 'AI assistant', // falls back to English
    subtitle: 'Ask me anything about your documents.', // falls back to English
    'launcher.title': 'Open AI assistant', // falls back to English
    'launcher.aria': 'AI assistant', // falls back to English
    'launcher.tooltip': 'Ask the AI assistant', // falls back to English
    'launcher.unread': '{count, plural, one {# new message} other {# new messages}}', // falls back to English
    'launcher.close': 'Close AI assistant', // falls back to English
    'panel.title': 'AI assistant', // falls back to English
    'panel.subtitle': 'Here to help — read-only by default', // falls back to English
    'panel.expand': 'Expand', // falls back to English
    'panel.collapse': 'Collapse', // falls back to English
    'panel.fullscreen': 'Open in fullscreen', // falls back to English
    'panel.popout': 'Open in new window', // falls back to English
    'panel.settings': 'Settings', // falls back to English
    'panel.history': 'History', // falls back to English
    'panel.clear': 'Clear conversation', // falls back to English
    'panel.close': 'Close', // falls back to English
    'input.placeholder': 'Ask anything…', // falls back to English
    'input.placeholder.contextDocument': 'Ask about this document…', // falls back to English
    'input.placeholder.contextFolder': 'Ask about this folder…', // falls back to English
    'input.placeholder.contextSearch': 'Ask about these results…', // falls back to English
    'input.send': 'Send', // falls back to English
    'input.attach': 'Attach context', // falls back to English
    'input.attach.document': 'Attach current document', // falls back to English
    'input.attach.selection': 'Attach selected text', // falls back to English
    'input.attach.search': 'Attach current search', // falls back to English
    'input.attach.metadata': 'Attach document metadata', // falls back to English
    'input.voice': 'Voice input', // falls back to English
    'input.voice.listening': 'Listening…', // falls back to English
    'input.voice.notSupported': 'Voice input is not supported in this browser.', // falls back to English
    'quickAction.title': 'Quick actions', // falls back to English
    'quickAction.subtitle': 'Tap to start a common task', // falls back to English
    'quickAction.summarize': 'Summarise this document', // falls back to English
    'quickAction.extract': 'Extract key data', // falls back to English
    'quickAction.translate': 'Translate this document', // falls back to English
    'quickAction.redact': 'Suggest redactions', // falls back to English
    'quickAction.classify': 'Suggest a classification', // falls back to English
    'quickAction.draftWorkflow': 'Draft a workflow', // falls back to English
    'quickAction.findSimilar': 'Find similar documents', // falls back to English
    'quickAction.explain': 'Explain this document', // falls back to English
    'quickAction.answerQuestions': 'Answer questions about this document', // falls back to English
    'quickAction.compare': 'Compare documents', // falls back to English
    'quickAction.search': 'Search across documents', // falls back to English
    'quickAction.draftEmail': 'Draft an email about this document', // falls back to English
    'quickAction.suggestMetadata': 'Suggest metadata values', // falls back to English
    'context.title': 'Context', // falls back to English
    'context.subtitle': 'The AI can see the following:', // falls back to English
    'context.document': 'Current document: {{name}}', // falls back to English
    'context.selection': 'Selected text: {{length}} characters', // falls back to English
    'context.search': 'Search results: {count, plural, one {# document} other {# documents}}', // falls back to English
    'context.folder': 'Folder: {{name}}', // falls back to English
    'context.clear': 'Clear context', // falls back to English
    'context.add': 'Add context', // falls back to English
    'suggestion.title': 'Suggestions', // falls back to English
    'suggestion.subtitle': 'Things you might want to ask:', // falls back to English
    'suggestion.example1': 'What is this document about?', // falls back to English
    'suggestion.example2': 'Who is the author and when was it created?', // falls back to English
    'suggestion.example3': 'Summarise the key points in three bullets.', // falls back to English
    'suggestion.example4': 'Are there any deadlines mentioned?', // falls back to English
    'suggestion.example5': 'What classification level would you suggest?', // falls back to English
    'suggestion.example6': 'Find documents similar to this one.', // falls back to English
    'suggestion.example7': 'Draft an approval workflow for this document type.', // falls back to English
    'suggestion.example8': 'Translate the summary to French.', // falls back to English
    'suggestion.example9': 'What retention schedule applies to this document?', // falls back to English
    'suggestion.example10': 'Does this document contain personally identifiable information?', // falls back to English
    'typing.title': 'AI is typing', // falls back to English
    'typing.subtitle': 'This usually takes a few seconds…', // falls back to English
    'typing.cancel': 'Cancel', // falls back to English
    'response.title': 'Response', // falls back to English
    'response.from': 'AI assistant', // falls back to English
    'response.at': 'at {{time}}', // falls back to English
    'response.citations': 'Citations', // falls back to English
    'response.citations.count': '{count, plural, one {# citation} other {# citations}}', // falls back to English
    'response.tools': 'Tools used', // falls back to English
    'response.tools.count': '{count, plural, one {# tool} other {# tools}}', // falls back to English
    'response.confidence': 'Confidence: {{percent}}%', // falls back to English
    'response.disclaimer': 'AI-generated. Verify before relying on it.', // falls back to English
    'response.actions': 'Suggested actions', // falls back to English
    'response.applyAction': 'Apply', // falls back to English
    'response.dismissAction': 'Dismiss', // falls back to English
    'response.feedback': 'Was this helpful?', // falls back to English
    'empty.title': 'How can I help?', // falls back to English
    'empty.subtitle': 'Ask me anything about your documents. I can read, summarise, translate, classify, and more — but I’ll always ask before I change anything.', // falls back to English
    'empty.tip': 'Tip: I work best when you give me context. Open a document first, then ask your question.', // falls back to English
    'minimized.title': 'AI assistant', // falls back to English
    'minimized.subtitle': 'Tap to reopen', // falls back to English
    'history.title': 'Recent conversations', // falls back to English
    'history.empty': 'No recent conversations.', // falls back to English
    'history.resume': 'Resume', // falls back to English
    'history.delete': 'Delete', // falls back to English
    'permission.denied': 'You don’t have permission to use the AI assistant.', // falls back to English
    'permission.denied.document': 'The AI can’t access this document because of your permissions.', // falls back to English
    'permission.denied.tool': 'You don’t have permission to use this AI tool.', // falls back to English
    'rateLimited.title': 'Slow down', // falls back to English
    'rateLimited.body': 'You’ve sent a lot of messages in a short time. Please wait {{seconds}} seconds before sending another.', // falls back to English
};
exports.default = bubble;
//# sourceMappingURL=bubble.js.map