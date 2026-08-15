/**
 * @smart-edms/i18n — de translation: `ai.actions` namespace.
 *
 * Source of truth: en/ai/actions.ts
 * Translated from the English baseline.
 */

const actions = {
  title: 'AI actions',  // falls back to English
  subtitle: 'Things the AI can do for you — with your confirmation.',  // falls back to English
  'common.confirm.title': 'Confirm AI action',  // falls back to English
  'common.confirm.body': 'The AI assistant proposes the following action. Review it carefully before confirming.',  // falls back to English
  'common.confirm.apply': 'Apply',  // falls back to English
  'common.confirm.cancel': 'Cancel',  // falls back to English
  'common.confirm.disclaimer': 'Once applied, this action will be recorded in the audit log under your identity.',  // falls back to English
  'common.outcome.success': 'AI action applied successfully.',  // falls back to English
  'common.outcome.failure': 'AI action could not be applied: {{reason}}',  // falls back to English
  'common.outcome.cancelled': 'AI action cancelled.',  // falls back to English
  'common.readOnly': 'Read-only — no changes will be made.',  // falls back to English
  'summarize.title': 'Summarise document',  // falls back to English
  'summarize.description': 'Generate a concise summary of the document.',  // falls back to English
  'summarize.prompt': 'Summarise this document in {{length}} words or fewer.',  // falls back to English
  'summarize.length.short': 'Short (3–5 sentences)',  // falls back to English
  'summarize.length.medium': 'Medium (1 paragraph)',  // falls back to English
  'summarize.length.long': 'Long (3 paragraphs)',  // falls back to English
  'summarize.length.bullets': 'Bullet points (5–10 bullets)',  // falls back to English
  'summarize.outcome': 'Summary generated.',  // falls back to English
  'extract.title': 'Extract key data',  // falls back to English
  'extract.description': 'Pull structured data (names, dates, amounts, identifiers) out of the document.',  // falls back to English
  'extract.prompt': 'Extract the following fields from this document: {{fields}}.',  // falls back to English
  'extract.fields.custom': 'Custom fields',  // falls back to English
  'extract.fields.custom.placeholder': 'Field names, comma-separated',  // falls back to English
  'extract.outcome': 'Data extracted.',  // falls back to English
  'translate.title': 'Translate document',  // falls back to English
  'translate.description': 'Translate the document (or a selection) into another language.',  // falls back to English
  'translate.target': 'Target language',  // falls back to English
  'translate.scope.full': 'Translate the entire document',  // falls back to English
  'translate.scope.selection': 'Translate the selected text only',  // falls back to English
  'translate.outcome': 'Translation generated.',  // falls back to English
  'translate.disclaimer': 'Machine translation may contain errors. For compliance-critical content, have a native speaker review.',  // falls back to English
  'redact.title': 'Suggest redactions',  // falls back to English
  'redact.description': 'Identify sensitive information that should be redacted.',  // falls back to English
  'redact.types': 'What to redact',  // falls back to English
  'redact.types.pii': 'Personally identifiable information',  // falls back to English
  'redact.types.financial': 'Financial data',  // falls back to English
  'redact.types.health': 'Health information',  // falls back to English
  'redact.types.credentials': 'Credentials and secrets',  // falls back to English
  'redact.types.custom': 'Custom patterns',  // falls back to English
  'redact.confirm.title': 'Apply suggested redactions?',  // falls back to English
  'redact.confirm.body': 'The AI has identified {{count, plural, one {# area} other {# areas}} that may contain sensitive information. Applying redaction will permanently obscure the underlying text in those areas.',  // falls back to English
  'redact.outcome': 'Redactions applied.',  // falls back to English
  'classify.title': 'Suggest classification',  // falls back to English
  'classify.description': 'Analyse the document content and suggest a classification label.',  // falls back to English
  'classify.suggested': 'Suggested classification: {{label}}',  // falls back to English
  'classify.reason': 'Reason: {{reason}}',  // falls back to English
  'classify.confidence': 'Confidence: {{percent}}%',  // falls back to English
  'classify.confirm.title': 'Apply suggested classification?',  // falls back to English
  'classify.confirm.body': 'Change the classification from {{current}} to {{suggested}}?',  // falls back to English
  'classify.outcome': 'Classification applied.',  // falls back to English
  'draftWorkflow.title': 'Draft a workflow',  // falls back to English
  'draftWorkflow.description': 'Generate a BPMN workflow definition for this document type.',  // falls back to English
  'draftWorkflow.prompt': 'Draft an approval workflow for {{documentType}} documents.',  // falls back to English
  'draftWorkflow.outline': 'Proposed workflow outline',  // falls back to English
  'draftWorkflow.confirm.title': 'Apply drafted workflow?',  // falls back to English
  'draftWorkflow.confirm.body': 'The AI has drafted a workflow. You can review and edit it before publishing. AI-drafted workflows must be approved by a human before they take effect.',  // falls back to English
  'draftWorkflow.outcome': 'Workflow draft created. Review and publish.',  // falls back to English
  'findSimilar.title': 'Find similar documents',  // falls back to English
  'findSimilar.description': 'Search for documents similar to the current one.',  // falls back to English
  'findSimilar.prompt': 'Find documents similar to this one.',  // falls back to English
  'findSimilar.outcome': 'Found {count, plural, one {# similar document} other {# similar documents}}.',  // falls back to English
  'findSimilar.empty': 'No similar documents found.',  // falls back to English
  'explain.title': 'Explain document',  // falls back to English
  'explain.description': 'Explain what this document is, in plain language.',  // falls back to English
  'explain.prompt': 'Explain this document in plain language, as if to a non-specialist.',  // falls back to English
  'explain.outcome': 'Explanation generated.',  // falls back to English
  'answerQuestions.title': 'Answer questions',  // falls back to English
  'answerQuestions.description': 'Answer questions about the document based on its content.',  // falls back to English
  'answerQuestions.prompt': 'Answer the following question based on this document: {{question}}',  // falls back to English
  'answerQuestions.outcome': 'Answer generated.',  // falls back to English
  'compare.title': 'Compare documents',  // falls back to English
  'compare.description': 'Compare two or more documents and highlight differences.',  // falls back to English
  'compare.documents': 'Documents to compare',  // falls back to English
  'compare.add': 'Add document',  // falls back to English
  'compare.aspect': 'Aspect to compare',  // falls back to English
  'compare.aspect.full': 'Full comparison',  // falls back to English
  'compare.aspect.dates': 'Dates and deadlines',  // falls back to English
  'compare.aspect.parties': 'Parties involved',  // falls back to English
  'compare.aspect.amounts': 'Amounts and pricing',  // falls back to English
  'compare.aspect.terms': 'Terms and conditions',  // falls back to English
  'compare.outcome': 'Comparison generated.',  // falls back to English
  'search.title': 'Search across documents',  // falls back to English
  'search.description': 'Run a natural-language search across multiple documents.',  // falls back to English
  'search.prompt': 'Search for: {{query}}',  // falls back to English
  'search.outcome': 'Found {count, plural, one {# document} other {# documents}}.',  // falls back to English
  'draftEmail.title': 'Draft an email',  // falls back to English
  'draftEmail.description': 'Compose an email about this document.',  // falls back to English
  'draftEmail.to': 'To',  // falls back to English
  'draftEmail.subject': 'Subject',  // falls back to English
  'draftEmail.tone': 'Tone',  // falls back to English
  'draftEmail.tone.formal': 'Formal',  // falls back to English
  'draftEmail.tone.friendly': 'Friendly',  // falls back to English
  'draftEmail.tone.neutral': 'Neutral',  // falls back to English
  'draftEmail.body': 'Draft body',  // falls back to English
  'draftEmail.outcome': 'Email draft generated.',  // falls back to English
  'suggestMetadata.title': 'Suggest metadata',  // falls back to English
  'suggestMetadata.description': 'Suggest values for empty metadata fields based on document content.',  // falls back to English
  'suggestMetadata.confirm.title': 'Apply suggested metadata?',  // falls back to English
  'suggestMetadata.confirm.body': 'The AI suggests the following metadata values:',  // falls back to English
  'suggestMetadata.outcome': 'Metadata applied.',  // falls back to English
  'draftReply.title': 'Draft a reply',  // falls back to English
  'draftReply.description': 'Draft a reply to a comment or message thread.',  // falls back to English
  'draftReply.tone': 'Reply tone',  // falls back to English
  'draftReply.length': 'Reply length',  // falls back to English
  'draftReply.outcome': 'Reply drafted.',  // falls back to English
  'summarizeThread.title': 'Summarise a thread',  // falls back to English
  'summarizeThread.description': 'Summarise a long comment thread or email chain.',  // falls back to English
  'summarizeThread.outcome': 'Thread summary generated.',  // falls back to English
  'auditQuery.title': 'Audit query helper',  // falls back to English
  'auditQuery.description': 'Help me write an audit query in plain English.',  // falls back to English
  'auditQuery.prompt': 'Find audit events where {{criteria}}.',  // falls back to English
  'auditQuery.outcome': 'Audit query generated. Review and run.',  // falls back to English
  'retentionSuggest.title': 'Retention suggestion',  // falls back to English
  'retentionSuggest.description': 'Suggest a retention schedule for this document type.',  // falls back to English
  'retentionSuggest.outcome': 'Retention schedule suggested.',  // falls back to English
  'retentionSuggest.disclaimer': 'Retention suggestions are advisory only. A human records manager must approve every schedule.',  // falls back to English
} as const;

export default actions;
