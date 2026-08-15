/**
 * @smart-edms/i18n — English baseline: `tour.marketing` namespace (spec §16.4)
 *
 * Tour shown on the public marketing site to walk prospects through the
 * product highlights.
 */

const tourMarketing = {
  'title': 'Product tour',
  'subtitle': 'A 3-minute walkthrough of Smart EDMS.',

  'step.intro.title': 'Welcome to Smart EDMS',
  'step.intro.body': 'In the next three minutes, you’ll see what makes Smart EDMS different from other document management platforms.',

  'step.capture.title': 'Capture anything',
  'step.capture.body': 'Upload files, scan paper, ingest email, or pull from network shares. OCR runs automatically. Multi-language OCR for documents that mix scripts.',

  'step.organize.title': 'Organize with confidence',
  'step.organize.body': 'Folders, tags, metadata schemas, classification labels — organise your documents the way your organisation works.',

  'step.workflow.title': 'Workflows that don’t break',
  'step.workflow.body': 'BPMN, CMMN, and DMN workflows with durable execution. Approvals, signatures, escalations — all audited.',

  'step.ai.title': 'AI that respects boundaries',
  'step.ai.body': 'The AI assistant is read-only by default. Every action requires your confirmation. Citations are limited to documents you can access. Prompt-injection protected.',

  'step.security.title': 'Security you can audit',
  'step.security.body': 'Tamper-evident audit log. Hash-chain receipts. MFA, SSO, network rules, DLP, anomaly detection. SOC 2 Type II, ISO 27001.',

  'step.compliance.title': 'Compliance built in',
  'step.compliance.body': 'Retention schedules, legal holds, disposition certificates, predictive holds. C2PA manifests and forgery detection for provable provenance.',

  'step.multilingual.title': 'Six languages from day one',
  'step.multilingual.body': 'English, French, Arabic (RTL), Russian, Simplified Chinese, German. ICU plural rules. Locale-aware formatting. No machine-only translations for compliance content.',

  'step.deployment.title': 'Deploy your way',
  'step.deployment.body': 'Cloud, on-premise, air-gapped, or hybrid. Your data stays in your jurisdiction.',

  'step.license.title': 'License that respects offline',
  'step.license.body': 'Heartbeat model with grace periods. Works offline for weeks. Calm, non-alarming state transitions.',

  'step.pricing.title': 'Transparent pricing',
  'step.pricing.body': 'Starter, Business, Enterprise, and Government plans. Custom plans for air-gapped deployments. No hidden fees.',

  'completion.title': 'Ready to see Smart EDMS in your organisation?',
  'completion.body': 'Book a 30-minute demo with one of our document management specialists.',
  'completion.cta.demo': 'Book a demo',
  'completion.cta.trial': 'Try free for 14 days',
  'completion.cta.contact': 'Contact sales',
} as const;

export default tourMarketing;
