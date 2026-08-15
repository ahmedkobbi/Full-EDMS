/**
 * @smart-edms/i18n — English baseline: `ai.actions` namespace (spec §16.4)
 *
 * Per-action labels, descriptions, confirmation prompts, and outcome
 * messages for every AI tool. Each action is read-only by default and
 * requires explicit confirmation before any change is applied.
 *
 * REVIEW: AI-safety-relevant strings. English baseline is written by a
 * senior engineer but should be reviewed by an AI safety specialist
 * before production rollout.
 */

const aiActions = {
  'title': 'AI actions',
  'subtitle': 'Things the AI can do for you — with your confirmation.',

  'common.confirm.title': 'Confirm AI action',
  'common.confirm.body': 'The AI assistant proposes the following action. Review it carefully before confirming.',
  'common.confirm.apply': 'Apply',
  'common.confirm.cancel': 'Cancel',
  'common.confirm.disclaimer': 'Once applied, this action will be recorded in the audit log under your identity.',
  'common.outcome.success': 'AI action applied successfully.',
  'common.outcome.failure': 'AI action could not be applied: {{reason}}',
  'common.outcome.cancelled': 'AI action cancelled.',
  'common.readOnly': 'Read-only — no changes will be made.',

  'summarize.title': 'Summarise document',
  'summarize.description': 'Generate a concise summary of the document.',
  'summarize.prompt': 'Summarise this document in {{length}} words or fewer.',
  'summarize.length.short': 'Short (3–5 sentences)',
  'summarize.length.medium': 'Medium (1 paragraph)',
  'summarize.length.long': 'Long (3 paragraphs)',
  'summarize.length.bullets': 'Bullet points (5–10 bullets)',
  'summarize.outcome': 'Summary generated.',

  'extract.title': 'Extract key data',
  'extract.description': 'Pull structured data (names, dates, amounts, identifiers) out of the document.',
  'extract.prompt': 'Extract the following fields from this document: {{fields}}.',
  'extract.fields.custom': 'Custom fields',
  'extract.fields.custom.placeholder': 'Field names, comma-separated',
  'extract.outcome': 'Data extracted.',

  'translate.title': 'Translate document',
  'translate.description': 'Translate the document (or a selection) into another language.',
  'translate.target': 'Target language',
  'translate.scope.full': 'Translate the entire document',
  'translate.scope.selection': 'Translate the selected text only',
  'translate.outcome': 'Translation generated.',
  'translate.disclaimer': 'Machine translation may contain errors. For compliance-critical content, have a native speaker review.',

  'redact.title': 'Suggest redactions',
  'redact.description': 'Identify sensitive information that should be redacted.',
  'redact.types': 'What to redact',
  'redact.types.pii': 'Personally identifiable information',
  'redact.types.financial': 'Financial data',
  'redact.types.health': 'Health information',
  'redact.types.credentials': 'Credentials and secrets',
  'redact.types.custom': 'Custom patterns',
  'redact.confirm.title': 'Apply suggested redactions?',
  'redact.confirm.body': 'The AI has identified {{count, plural, one {# area} other {# areas}} that may contain sensitive information. Applying redaction will permanently obscure the underlying text in those areas.',
  'redact.outcome': 'Redactions applied.',

  'classify.title': 'Suggest classification',
  'classify.description': 'Analyse the document content and suggest a classification label.',
  'classify.suggested': 'Suggested classification: {{label}}',
  'classify.reason': 'Reason: {{reason}}',
  'classify.confidence': 'Confidence: {{percent}}%',
  'classify.confirm.title': 'Apply suggested classification?',
  'classify.confirm.body': 'Change the classification from {{current}} to {{suggested}}?',
  'classify.outcome': 'Classification applied.',

  'draftWorkflow.title': 'Draft a workflow',
  'draftWorkflow.description': 'Generate a BPMN workflow definition for this document type.',
  'draftWorkflow.prompt': 'Draft an approval workflow for {{documentType}} documents.',
  'draftWorkflow.outline': 'Proposed workflow outline',
  'draftWorkflow.confirm.title': 'Apply drafted workflow?',
  'draftWorkflow.confirm.body': 'The AI has drafted a workflow. You can review and edit it before publishing. AI-drafted workflows must be approved by a human before they take effect.',
  'draftWorkflow.outcome': 'Workflow draft created. Review and publish.',

  'findSimilar.title': 'Find similar documents',
  'findSimilar.description': 'Search for documents similar to the current one.',
  'findSimilar.prompt': 'Find documents similar to this one.',
  'findSimilar.outcome': 'Found {count, plural, one {# similar document} other {# similar documents}}.',
  'findSimilar.empty': 'No similar documents found.',

  'explain.title': 'Explain document',
  'explain.description': 'Explain what this document is, in plain language.',
  'explain.prompt': 'Explain this document in plain language, as if to a non-specialist.',
  'explain.outcome': 'Explanation generated.',

  'answerQuestions.title': 'Answer questions',
  'answerQuestions.description': 'Answer questions about the document based on its content.',
  'answerQuestions.prompt': 'Answer the following question based on this document: {{question}}',
  'answerQuestions.outcome': 'Answer generated.',

  'compare.title': 'Compare documents',
  'compare.description': 'Compare two or more documents and highlight differences.',
  'compare.documents': 'Documents to compare',
  'compare.add': 'Add document',
  'compare.aspect': 'Aspect to compare',
  'compare.aspect.full': 'Full comparison',
  'compare.aspect.dates': 'Dates and deadlines',
  'compare.aspect.parties': 'Parties involved',
  'compare.aspect.amounts': 'Amounts and pricing',
  'compare.aspect.terms': 'Terms and conditions',
  'compare.outcome': 'Comparison generated.',

  'search.title': 'Search across documents',
  'search.description': 'Run a natural-language search across multiple documents.',
  'search.prompt': 'Search for: {{query}}',
  'search.outcome': 'Found {count, plural, one {# document} other {# documents}}.',

  'draftEmail.title': 'Draft an email',
  'draftEmail.description': 'Compose an email about this document.',
  'draftEmail.to': 'To',
  'draftEmail.subject': 'Subject',
  'draftEmail.tone': 'Tone',
  'draftEmail.tone.formal': 'Formal',
  'draftEmail.tone.friendly': 'Friendly',
  'draftEmail.tone.neutral': 'Neutral',
  'draftEmail.body': 'Draft body',
  'draftEmail.outcome': 'Email draft generated.',

  'suggestMetadata.title': 'Suggest metadata',
  'suggestMetadata.description': 'Suggest values for empty metadata fields based on document content.',
  'suggestMetadata.confirm.title': 'Apply suggested metadata?',
  'suggestMetadata.confirm.body': 'The AI suggests the following metadata values:',
  'suggestMetadata.outcome': 'Metadata applied.',

  'draftReply.title': 'Draft a reply',
  'draftReply.description': 'Draft a reply to a comment or message thread.',
  'draftReply.tone': 'Reply tone',
  'draftReply.length': 'Reply length',
  'draftReply.outcome': 'Reply drafted.',

  'summarizeThread.title': 'Summarise a thread',
  'summarizeThread.description': 'Summarise a long comment thread or email chain.',
  'summarizeThread.outcome': 'Thread summary generated.',

  'auditQuery.title': 'Audit query helper',
  'auditQuery.description': 'Help me write an audit query in plain English.',
  'auditQuery.prompt': 'Find audit events where {{criteria}}.',
  'auditQuery.outcome': 'Audit query generated. Review and run.',

  'retentionSuggest.title': 'Retention suggestion',
  'retentionSuggest.description': 'Suggest a retention schedule for this document type.',
  'retentionSuggest.outcome': 'Retention schedule suggested.',
  'retentionSuggest.disclaimer': 'Retention suggestions are advisory only. A human records manager must approve every schedule.',
} as const;

export default aiActions;
