/**
 * @smart-edms/i18n — English baseline: `tour.aiAssistant` namespace (spec §16.4)
 *
 * REVIEW: AI-safety-relevant content. English baseline is written by a
 * senior engineer but should be reviewed by an AI safety specialist
 * before production rollout.
 */

const tourAiAssistant = {
  'title': 'AI assistant tour',
  'subtitle': 'How AI helps you in Smart EDMS — and where it stops.',

  'step.intro.title': 'AI that respects boundaries',
  'step.intro.body': 'The Smart EDMS AI assistant is here to help, not to take over. This tour shows you what it can do, what it can’t, and how it stays safe.',

  'step.readOnly.title': 'Read-only by default',
  'step.readOnly.body': 'The AI can read documents you have access to and answer questions. It cannot change anything unless you explicitly confirm.',

  'step.confirmation.title': 'Confirmation required',
  'step.confirmation.body': 'When the AI proposes an action — applying a metadata field, starting a workflow, classifying a document — you see exactly what it wants to do. Nothing happens until you click Confirm.',

  'step.citations.title': 'Citations',
  'step.citations.body': 'Every claim the AI makes is backed by a citation to a specific document. You can click through to verify. The AI cannot cite documents you don’t have access to.',

  'step.tools.title': 'Tools',
  'step.tools.body': 'The AI has a curated set of tools — search, summarise, translate, redact, draft workflow. Each tool is audited. Tools you don’t want can be disabled by your administrator.',

  'step.promptInjection.title': 'Prompt-injection protected',
  'step.promptInjection.body': 'If someone tries to trick the AI by embedding instructions inside a document (a “prompt injection”), the system detects it and blocks the request. You’ll see a clear message explaining what happened.',

  'step.degrades.title': 'Degrades gracefully',
  'step.degrades.body': 'If the AI is unavailable — provider outage, license limit, network issue — Smart EDMS continues to work normally. You just lose the AI features temporarily.',

  'step.disclaimer.title': 'Always a disclaimer',
  'step.disclaimer.body': 'Every AI response includes a short reminder that it’s AI-generated and may contain errors. For high-stakes decisions, treat AI output as a draft, not as final.',

  'step.notLegalAdvice.title': 'Not legal advice',
  'step.notLegalAdvice.body': 'The AI can summarise legal documents but cannot give legal advice. For legal decisions, consult a qualified lawyer.',

  'step.audited.title': 'Every call audited',
  'step.audited.body': 'Every AI tool invocation — the prompt, the response, the user who triggered it, the documents accessed — is recorded in the audit log.',

  'step.localModel.title': 'Local or external model',
  'step.localModel.body': 'Depending on your license, the AI can run on a local model (your data never leaves your tenant) or an external provider. Hybrid mode lets the system pick the right model per task.',

  'step.bubble.title': 'The AI bubble',
  'step.bubble.body': 'The AI lives in a small bubble in the corner of the screen. Click it to ask a question or invoke a tool. The bubble is always available but never intrusive.',

  'step.turnOff.title': 'You can turn it off',
  'step.turnOff.body': 'Don’t want the AI? Your administrator can disable it for the whole tenant, or you can hide the bubble from your personal settings.',

  'completion.title': 'You know how AI helps (and where it stops)',
  'completion.body': 'You now understand the AI assistant. Take the Checklist tour to see what’s left to set up.',
  'completion.next': 'Take the Checklist tour',
} as const;

export default tourAiAssistant;
