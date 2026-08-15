/**
 * @smart-edms/i18n — ar translation: `workflow` namespace.
 *
 * Source of truth: en/workflow.ts
 * Translated from the English baseline.
 */

const workflow = {
  title: 'Workflows',  // falls back to English
  subtitle: 'Automate document approvals, reviews, and signatures.',  // falls back to English
  'empty.title': 'No workflows yet',  // falls back to English
  'empty.subtitle': 'Create your first workflow to automate document processing.',  // falls back to English
  'empty.action': 'Create workflow',  // falls back to English
  'definition.title': 'Workflow definitions',  // falls back to English
  'definition.create': 'Create workflow',  // falls back to English
  'definition.name': 'Workflow name',  // falls back to English
  'definition.description': 'Description',  // falls back to English
  'definition.model.kind': 'Model type',  // falls back to English
  'definition.model.bpmn': 'BPMN (process)',  // falls back to English
  'definition.model.cmmn': 'CMMN (case)',  // falls back to English
  'definition.model.dmn': 'DMN (decision table)',  // falls back to English
  'definition.trigger': 'Trigger',  // falls back to English
  'definition.trigger.manual': 'Manual start',  // falls back to English
  'definition.trigger.documentUpload': 'On document upload',  // falls back to English
  'definition.trigger.documentCreated': 'On document created',  // falls back to English
  'definition.trigger.metadataChanged': 'On metadata change',  // falls back to English
  'definition.trigger.classificationChanged': 'On classification change',  // falls back to English
  'definition.trigger.scheduled': 'Scheduled',  // falls back to English
  'definition.trigger.event': 'External event',  // falls back to English
  'definition.version': 'Version',  // falls back to English
  'definition.published': 'Published',  // falls back to English
  'definition.draft': 'Draft',  // falls back to English
  'definition.archived': 'Archived',  // falls back to English
  'definition.durable': 'Durable execution',  // falls back to English
  'definition.durable.description': 'Workflow state is persisted so it survives server restarts and crashes.',  // falls back to English
  'definition.delete.confirm': 'Archive workflow "{{name}}"? Existing instances will continue to run.',  // falls back to English
  'definition.copy': 'Duplicate workflow',  // falls back to English
  'definition.export': 'Export as BPMN XML',  // falls back to English
  'definition.import': 'Import BPMN XML',  // falls back to English
  'instance.title': 'Workflow instances',  // falls back to English
  'instance.current': 'Active instances',  // falls back to English
  'instance.completed': 'Completed instances',  // falls back to English
  'instance.failed': 'Failed instances',  // falls back to English
  'instance.cancelled': 'Cancelled instances',  // falls back to English
  'instance.started': 'Started',  // falls back to English
  'instance.completedAt': 'Completed',  // falls back to English
  'instance.duration': 'Duration',  // falls back to English
  'instance.startedBy': 'Started by',  // falls back to English
  'instance.document': 'Document',  // falls back to English
  'instance.cancel': 'Cancel instance',  // falls back to English
  'instance.cancel.confirm': 'Cancel this workflow instance? The document will remain in its current state.',  // falls back to English
  'instance.retry': 'Retry failed step',  // falls back to English
  'instance.resume': 'Resume instance',  // falls back to English
  'instance.status.running': 'Running',  // falls back to English
  'instance.status.waiting': 'Waiting for input',  // falls back to English
  'instance.status.completed': 'Completed',  // falls back to English
  'instance.status.failed': 'Failed',  // falls back to English
  'instance.status.cancelled': 'Cancelled',  // falls back to English
  'instance.status.suspended': 'Suspended',  // falls back to English
  'step.title': 'Step',  // falls back to English
  'step.approval': 'Approval step',  // falls back to English
  'step.review': 'Review step',  // falls back to English
  'step.signature': 'Signature step',  // falls back to English
  'step.notification': 'Notification step',  // falls back to English
  'step.script': 'Script step',  // falls back to English
  'step.condition': 'Conditional branch',  // falls back to English
  'step.parallel': 'Parallel branch',  // falls back to English
  'step.timer': 'Timer',  // falls back to English
  'step.assignee': 'Assignee',  // falls back to English
  'step.assigneeGroup': 'Assignee group',  // falls back to English
  'step.dueIn': 'Due in {{duration}}',  // falls back to English
  'step.overdue': 'Overdue',  // falls back to English
  'step.completed': 'Completed',  // falls back to English
  'step.skipped': 'Skipped',  // falls back to English
  'step.assignedTo': 'Assigned to {{user}}',  // falls back to English
  'step.assignedToGroup': 'Assigned to group {{group}}',  // falls back to English
  'approval.title': 'Approval required',  // falls back to English
  'approval.subtitle': 'Review the document and approve or request changes.',  // falls back to English
  'approval.approve': 'Approve',  // falls back to English
  'approval.reject': 'Reject',  // falls back to English
  'approval.requestChanges': 'Request changes',  // falls back to English
  'approval.comment.label': 'Comment',  // falls back to English
  'approval.comment.placeholder': 'Add a comment (required when rejecting or requesting changes)',  // falls back to English
  'approval.comment.required': 'A comment is required when rejecting or requesting changes.',  // falls back to English
  'approval.delegate': 'Delegate',  // falls back to English
  'approval.delegate.to': 'Delegate to',  // falls back to English
  'approval.escalate': 'Escalate',  // falls back to English
  'approval.escalate.to': 'Escalate to',  // falls back to English
  'approval.success': 'Approval submitted.',  // falls back to English
  'approval.timeout': 'Approval timed out. Escalated to {{user}}.',  // falls back to English
  'approval.cancelled': 'Approval cancelled by {{user}}.',  // falls back to English
  'signature.title': 'Signature required',  // falls back to English
  'signature.subtitle': 'Sign the document to complete this step.',  // falls back to English
  'signature.kind.electronic': 'Electronic signature',  // falls back to English
  'signature.kind.digital': 'Digital signature (PKI)',  // falls back to English
  'signature.kind.qualified': 'Qualified electronic signature (eIDAS)',  // falls back to English
  'signature.kind.biometric': 'Biometric signature',  // falls back to English
  'signature.reason': 'Reason for signing',  // falls back to English
  'signature.location': 'Location',  // falls back to English
  'signature.certificate': 'Certificate',  // falls back to English
  'signature.certificate.select': 'Select certificate',  // falls back to English
  'signature.certificate.expired': 'The selected certificate has expired.',  // falls back to English
  'signature.certificate.invalid': 'The selected certificate is invalid.',  // falls back to English
  'signature.timestamp': 'Trusted timestamp',  // falls back to English
  'signature.success': 'Document signed.',  // falls back to English
  'signature.failed': 'Signing failed. Please try again.',  // falls back to English
  'negotiator.title': 'AI workflow assistant',  // falls back to English
  'negotiator.subtitle': 'The AI can draft an approval path for you. Review and adjust before publishing.',  // falls back to English
  'negotiator.draft': 'Draft workflow',  // falls back to English
  'negotiator.apply': 'Apply suggested workflow',  // falls back to English
  'negotiator.discard': 'Discard draft',  // falls back to English
  'negotiator.disclaimer': 'AI-suggested workflows must be reviewed and approved by a human before they take effect.',  // falls back to English
  'error.invalidState': 'The workflow is not in a state that allows this action.',  // falls back to English
  'error.notDurable': 'This workflow is not durable and cannot survive a server restart. Update the definition to enable durable execution.',  // falls back to English
  'error.cannotCancel': 'This instance cannot be cancelled in its current state.',  // falls back to English
  'error.assigneeNotFound': 'The specified assignee could not be found.',  // falls back to English
  'error.cannotAssign': 'You cannot assign this step to yourself.',  // falls back to English
  'error.alreadyCompleted': 'This step has already been completed.',  // falls back to English
  'error.lockedByLegalHold': 'This step is locked because the document is under legal hold.',  // falls back to English
  'error.cannotPublish': 'The workflow cannot be published: {{reason}}',  // falls back to English
} as const;

export default workflow;
