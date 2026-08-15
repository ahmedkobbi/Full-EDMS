/**
 * @smart-edms/i18n — de translation: `notifications` namespace.
 *
 * Source of truth: en/notifications.ts
 * Translated from the English baseline.
 */

const notifications = {
  title: 'Notifications',  // falls back to English
  subtitle: 'Stay up to date with what matters.',  // falls back to English
  empty: 'You’re all caught up!',  // falls back to English
  markAllRead: 'Mark all as read',  // falls back to English
  markRead: 'Mark as read',  // falls back to English
  markUnread: 'Mark as unread',  // falls back to English
  delete: 'Delete notification',  // falls back to English
  clear: 'Clear all',  // falls back to English
  'clear.confirm': 'Clear all notifications? This cannot be undone.',  // falls back to English
  'filter.all': 'All',  // falls back to English
  'filter.unread': 'Unread',  // falls back to English
  'filter.mentions': 'Mentions',  // falls back to English
  'filter.workflow': 'Workflow',  // falls back to English
  'filter.sharing': 'Sharing',  // falls back to English
  'filter.system': 'System',  // falls back to English
  'filter.security': 'Security',  // falls back to English
  settings: 'Notification settings',  // falls back to English
  viewAll: 'View all notifications',  // falls back to English
  'count.unread': '{count, plural, one {# unread} other {# unread}}',  // falls back to English
  'severity.info': 'Information',  // falls back to English
  'severity.success': 'Success',  // falls back to English
  'severity.warning': 'Warning',  // falls back to English
  'severity.error': 'Error',  // falls back to English
  'severity.critical': 'Critical',  // falls back to English
  'channel.inApp': 'In-app',  // falls back to English
  'channel.email': 'Email',  // falls back to English
  'channel.sms': 'SMS',  // falls back to English
  'channel.push': 'Push',  // falls back to English
  'channel.webhook': 'Webhook',  // falls back to English
  'preferences.title': 'Notification preferences',  // falls back to English
  'preferences.subtitle': 'Choose how and when you want to be notified.',  // falls back to English
  'preferences.category.workflow': 'Workflow events',  // falls back to English
  'preferences.category.sharing': 'Sharing events',  // falls back to English
  'preferences.category.mentions': 'Mentions',  // falls back to English
  'preferences.category.documents': 'Document events',  // falls back to English
  'preferences.category.security': 'Security alerts',  // falls back to English
  'preferences.category.admin': 'Administrative events',  // falls back to English
  'preferences.category.ai': 'AI assistant events',  // falls back to English
  'preferences.category.system': 'System events',  // falls back to English
  'preferences.save': 'Save preferences',  // falls back to English
  'preferences.saved': 'Your notification preferences have been saved.',  // falls back to English
  'preferences.doNotDisturb': 'Do not disturb',  // falls back to English
  'preferences.doNotDisturb.start': 'Start time',  // falls back to English
  'preferences.doNotDisturb.end': 'End time',  // falls back to English
  'preferences.doNotDisturb.exceptions': 'Allow critical notifications during do-not-disturb',  // falls back to English
  'preferences.digest': 'Daily digest',  // falls back to English
  'preferences.digest.enable': 'Send a daily digest instead of individual notifications',  // falls back to English
  'preferences.digest.time': 'Digest delivery time',  // falls back to English
  'throttle.title': 'Throttling',  // falls back to English
  'throttle.description': 'To prevent notification fatigue, similar notifications are grouped.',  // falls back to English
  'throttle.grouped': '{count, plural, one {# similar notification} other {# similar notifications}} grouped together.',  // falls back to English
  'event.document.shared': '{{actor}} shared a document with you: {{name}}',  // falls back to English
  'event.document.comment': '{{actor}} commented on {{name}}: "{{text}}"',  // falls back to English
  'event.document.mention': '{{actor}} mentioned you in {{name}}',  // falls back to English
  'event.document.uploaded': '{{actor}} uploaded {{name}}',  // falls back to English
  'event.document.modified': '{{actor}} modified {{name}}',  // falls back to English
  'event.document.deleted': '{{actor}} deleted {{name}}',  // falls back to English
  'event.document.classified': '{{name}} was classified as {{classification}}',  // falls back to English
  'event.document.reclassified': '{{name}} was reclassified from {{old}} to {{new}}',  // falls back to English
  'event.workflow.assigned': 'A workflow step is assigned to you: {{name}}',  // falls back to English
  'event.workflow.approved': '{{actor}} approved a workflow step: {{name}}',  // falls back to English
  'event.workflow.rejected': '{{actor}} rejected a workflow step: {{name}}',  // falls back to English
  'event.workflow.completed': 'Workflow completed: {{name}}',  // falls back to English
  'event.workflow.overdue': 'Workflow step is overdue: {{name}}',  // falls back to English
  'event.workflow.escalated': 'A workflow step was escalated to you: {{name}}',  // falls back to English
  'event.workflow.delegate': '{{actor}} delegated a workflow step to you: {{name}}',  // falls back to English
  'event.sharing.expiring': 'Share link for {{name}} expires in {{hours}} hours',  // falls back to English
  'event.sharing.expired': 'Share link for {{name}} has expired',  // falls back to English
  'event.sharing.accessed': '{{actor}} accessed your shared document: {{name}}',  // falls back to English
  'event.sharing.downloaded': '{{actor}} downloaded your shared document: {{name}}',  // falls back to English
  'event.security.mfaRequired': 'MFA is now required for your account',  // falls back to English
  'event.security.suspiciousLogin': 'A suspicious sign-in attempt was detected on your account',  // falls back to English
  'event.security.passwordChanged': 'Your password was changed',  // falls back to English
  'event.security.accountLocked': 'Your account was locked after too many failed attempts',  // falls back to English
  'event.legalHold.applied': 'A legal hold was applied to {count, plural, one {# document} other {# documents}}',  // falls back to English
  'event.legalHold.released': 'A legal hold was released for {{name}}',  // falls back to English
  'event.retention.disposition': '{count, plural, one {# document} other {# documents}} are pending disposition',  // falls back to English
  'event.retention.dispositionOverdue': '{count, plural, one {# document} other {# documents}} are overdue for disposition',  // falls back to English
  'event.license.expiringSoon': 'Your license will expire in {{days}} days',  // falls back to English
  'event.license.expired': 'Your license has expired',  // falls back to English
  'event.license.graceExhausted': 'Your license grace period has ended',  // falls back to English
  'event.license.invalid': 'Your license is no longer valid',  // falls back to English
  'event.license.heartbeatFailed': 'Could not reach the license server. Working offline.',  // falls back to English
  'event.ai.actionProposed': 'The AI assistant proposed an action on {{name}}',  // falls back to English
  'event.ai.actionCompleted': 'The AI assistant completed an action on {{name}}',  // falls back to English
  'event.ai.injectionDetected': 'A prompt injection was detected and blocked',  // falls back to English
  'event.admin.userInvited': '{{actor}} invited {{email}} to the organisation',  // falls back to English
  'event.admin.userJoined': '{{name}} joined the organisation',  // falls back to English
  'event.admin.userRemoved': '{{actor}} removed {{name}} from the organisation',  // falls back to English
  'event.admin.roleAssigned': 'You were assigned the role {{role}}',  // falls back to English
  'event.admin.roleRevoked': 'Your role {{role}} was revoked',  // falls back to English
  'event.system.maintenance': 'Scheduled maintenance will begin at {{date}}',  // falls back to English
  'event.system.update': 'Smart EDMS was updated to version {{version}}',  // falls back to English
  'event.system.outage': 'A service outage is affecting {{service}}',  // falls back to English
} as const;

export default notifications;
