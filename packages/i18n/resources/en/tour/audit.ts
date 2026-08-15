/**
 * @smart-edms/i18n — English baseline: `tour.audit` namespace (spec §16.4)
 *
 * REVIEW: Compliance-relevant content. English baseline is written by a
 * senior engineer but should be reviewed by a native English-speaking
 * compliance specialist before production rollout.
 */

const tourAudit = {
  'title': 'Audit tour',
  'subtitle': 'Understand the tamper-evident record of every action.',

  'step.intro.title': 'The audit log',
  'step.intro.body': 'Every action in Smart EDMS — sign-in, document view, workflow approval, legal hold — is recorded in an audit log you can trust.',

  'step.tamperEvident.title': 'Tamper-evident',
  'step.tamperEvident.body': 'Each audit event includes a hash of the previous event, forming a chain. If anyone modifies an old event, the chain breaks and we can detect it.',

  'step.integrity.title': 'Integrity verification',
  'step.integrity.body': 'Click Verify integrity to walk the hash chain and confirm no event has been tampered with. The result is itself audited.',

  'step.filters.title': 'Filtering and search',
  'step.filters.body': 'Filter by actor, action, category, resource, date range, or result. Save frequent queries for compliance reporting.',

  'step.export.title': 'Export',
  'step.export.body': 'Export the audit log as CSV, JSON, or a signed PDF. The PDF includes the hash-chain head so the export can be verified later.',

  'step.actorKinds.title': 'Actor kinds',
  'step.actorKinds.body': 'Actions are attributed to users, service accounts, the system itself, the AI assistant, or the license server. Always know who (or what) did what.',

  'step.categories.title': 'Categories',
  'step.categories.body': 'Events are grouped into 22 categories — authentication, document access, classification, retention, legal hold, AI tool invocation, and more.',

  'step.legalHold.title': 'Legal hold intersection',
  'step.legalHold.body': 'When a resource is under legal hold, its audit events are also protected from export and modification. This preserves evidence for litigation.',

  'step.retention.title': 'Retention',
  'step.retention.body': 'Audit events have their own retention schedule. They cannot be deleted before their disposition date, even by an administrator.',

  'step.liveTail.title': 'Live tail',
  'step.liveTail.body': 'For real-time monitoring, use the live tail. It streams new events as they happen — useful during investigations.',

  'step.snapshot.title': 'Integrity snapshots',
  'step.snapshot.body': 'Create a snapshot to capture the current hash-chain head. Store it off-site to be able to detect tampering even if Smart EDMS itself is compromised.',

  'step.receipts.title': 'Hash-chain receipts',
  'step.receipts.body': 'For high-value actions, Smart EDMS can issue a signed receipt anchoring the action to a point in time. Useful for legal evidence.',

  'completion.title': 'You can trust the audit log',
  'completion.body': 'You now understand how Smart EDMS keeps an honest record of every action. Take the Admin tour to learn about user management.',
  'completion.next': 'Take the Admin tour',
} as const;

export default tourAudit;
