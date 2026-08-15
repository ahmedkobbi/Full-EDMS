/**
 * @smart-edms/i18n — English baseline: `emails` namespace (spec §16.4)
 *
 * Email templates for transactional messages. The strings here are the
 * subject lines and body fragments rendered by the backend email templating
 * service (which is React-independent — it reads these strings and applies
 * them to an HTML template).
 */

const emails = {
  'layout.footer': 'This message was sent by Smart EDMS on behalf of {{tenant}}.',
  'layout.unsubscribe': 'You are receiving this email because you have an account on Smart EDMS. Manage your notification preferences in your account settings.',
  'layout.support': 'Need help? Contact your administrator.',
  'layout.copyright': '© {{year}} Smart EDMS. All rights reserved.',
  'layout.viewInBrowser': 'View in browser',
  'layout.poweredBy': 'Powered by Smart EDMS',

  'common.greeting': 'Hello {{name}},',
  'common.greeting.generic': 'Hello,',
  'common.signOff': 'Kind regards,',
  'common.signOff.team': 'The Smart EDMS team',
  'common.button.callToAction': 'Open Smart EDMS',
  'common.button.viewDocument': 'View document',
  'common.button.acceptInvite': 'Accept invitation',
  'common.button.resetPassword': 'Reset password',
  'common.button.verifyEmail': 'Verify email',

  'invite.subject': '{{actor}} invited you to join {{tenant}} on Smart EDMS',
  'invite.preview': 'You have been invited to join {{tenant}}',
  'invite.title': 'You’re invited to {{tenant}}',
  'invite.body': '{{actor}} has invited you to join {{tenant}} on Smart EDMS. Click the button below to accept your invitation and set up your account.',
  'invite.expires': 'This invitation expires on {{date}}.',
  'invite.ignore': 'If you did not expect this invitation, you can safely ignore this email.',

  'passwordReset.subject': 'Reset your Smart EDMS password',
  'passwordReset.preview': 'A password reset was requested for your account',
  'passwordReset.title': 'Reset your password',
  'passwordReset.body': 'We received a request to reset your Smart EDMS password. Click the button below to choose a new password.',
  'passwordReset.expires': 'This link expires in {{minutes}} minutes.',
  'passwordReset.ignore': 'If you did not request a password reset, you can safely ignore this email — your password will not be changed.',

  'passwordChanged.subject': 'Your Smart EDMS password was changed',
  'passwordChanged.preview': 'Security alert: password change',
  'passwordChanged.title': 'Password changed',
  'passwordChanged.body': 'Your Smart EDMS password was changed on {{date}} from {{device}}. If this was you, no action is needed.',
  'passwordChanged.notYou': 'If you did not make this change, please contact your administrator immediately.',

  'mfaEnabled.subject': 'Multi-factor authentication is now enabled',
  'mfaEnabled.preview': 'Security update: MFA enabled',
  'mfaEnabled.title': 'MFA enabled on your account',
  'mfaEnabled.body': 'Multi-factor authentication is now enabled on your account. You will be asked for a verification code on future sign-ins.',
  'mfaEnabled.backup': 'Remember to store your backup codes in a safe place — they are the only way to regain access if you lose your authenticator device.',

  'mfaDisabled.subject': 'Multi-factor authentication was disabled',
  'mfaDisabled.preview': 'Security alert: MFA disabled',
  'mfaDisabled.title': 'MFA disabled on your account',
  'mfaDisabled.body': 'Multi-factor authentication was disabled on your account on {{date}}. Your account is now less secure.',
  'mfaDisabled.notYou': 'If you did not make this change, please contact your administrator immediately.',

  'suspiciousLogin.subject': 'New sign-in to your Smart EDMS account',
  'suspiciousLogin.preview': 'Security alert: new sign-in',
  'suspiciousLogin.title': 'New sign-in detected',
  'suspiciousLogin.body': 'We detected a new sign-in to your account on {{date}} from a {{device}} in {{location}}.',
  'suspiciousLogin.notYou': 'If this was not you, please reset your password immediately and contact your administrator.',

  'documentShared.subject': '{{actor}} shared a document with you: {{name}}',
  'documentShared.preview': 'A document was shared with you',
  'documentShared.title': 'Document shared with you',
  'documentShared.body': '{{actor}} shared the document "{{name}}" with you. You have {{permission}} access.',
  'documentShared.expires': 'This share expires on {{date}}.',
  'documentShared.view': 'View document',

  'documentSharedExternal.subject': 'A document was shared with you on Smart EDMS',
  'documentSharedExternal.preview': 'External document share',
  'documentSharedExternal.title': 'A document has been shared with you',
  'documentSharedExternal.body': '{{actor}} from {{tenant}} has shared the document "{{name}}" with you. Use the button below to access it.',
  'documentSharedExternal.expires': 'This share expires on {{date}}.',
  'documentSharedExternal.password': 'You will need the password provided by {{actor}} to access this document.',

  'workflowAssigned.subject': 'Workflow step assigned: {{name}}',
  'workflowAssigned.preview': 'You have a workflow step to review',
  'workflowAssigned.title': 'Workflow step assigned to you',
  'workflowAssigned.body': 'A workflow step has been assigned to you on document "{{name}}". Please review and approve, reject, or request changes.',
  'workflowAssigned.dueBy': 'This step is due by {{date}}.',
  'workflowAssigned.open': 'Open workflow',

  'workflowOverdue.subject': 'Workflow step overdue: {{name}}',
  'workflowOverdue.preview': 'A workflow step is overdue',
  'workflowOverdue.title': 'Workflow step overdue',
  'workflowOverdue.body': 'A workflow step assigned to you on document "{{name}}" is now overdue. Please complete it as soon as possible.',
  'workflowOverdue.escalating': 'This step will be escalated in {{hours}} hours if not completed.',

  'workflowCompleted.subject': 'Workflow completed: {{name}}',
  'workflowCompleted.preview': 'A workflow has finished',
  'workflowCompleted.title': 'Workflow completed',
  'workflowCompleted.body': 'The workflow on document "{{name}}" has been completed.',
  'workflowCompleted.outcome': 'Outcome: {{outcome}}',

  'legalHold.subject': 'A legal hold was applied to your document',
  'legalHold.preview': 'Legal hold notification',
  'legalHold.title': 'Legal hold applied',
  'legalHold.body': 'A legal hold has been applied to the document "{{name}}". The document cannot be modified, shared, or deleted while the hold is in effect.',
  'legalHold.reason': 'Reason: {{reason}}',
  'legalHold.custodian': 'Custodian: {{custodian}}',
  'legalHold.contact': 'If you have questions, please contact {{custodian}}.',

  'licenseExpiring.subject': 'Your Smart EDMS license will expire soon',
  'licenseExpiring.preview': 'License renewal reminder',
  'licenseExpiring.title': 'License expiring soon',
  'licenseExpiring.body': 'Your Smart EDMS license will expire on {{date}}. Please renew to avoid any interruption in service.',
  'licenseExpiring.grace': 'After expiry, you will have a {{days}}-day grace period during which the system remains fully functional.',
  'licenseExpiring.action': 'Renew license',

  'licenseExpired.subject': 'Your Smart EDMS license has expired',
  'licenseExpired.preview': 'License expired',
  'licenseExpired.title': 'License expired',
  'licenseExpired.body': 'Your Smart EDMS license expired on {{date}}. You are now in the grace period. The system will remain functional until {{graceEnd}}.',
  'licenseExpired.action': 'Renew license',

  'licenseGraceExhausted.subject': 'Your Smart EDMS grace period has ended',
  'licenseGraceExhausted.preview': 'Grace period ended',
  'licenseGraceExhausted.title': 'Grace period ended',
  'licenseGraceExhausted.body': 'The grace period for your expired Smart EDMS license has ended. Write access is now restricted. You can still read existing documents.',
  'licenseGraceExhausted.action': 'Renew license',

  'licenseInvalid.subject': 'Your Smart EDMS license is no longer valid',
  'licenseInvalid.preview': 'License invalid',
  'licenseInvalid.title': 'License invalid',
  'licenseInvalid.body': 'Your Smart EDMS license is no longer valid. Please contact your administrator to restore access.',
  'licenseInvalid.action': 'Contact administrator',

  'retentionDisposition.subject': 'Documents pending disposition',
  'retentionDisposition.preview': 'Retention disposition notice',
  'retentionDisposition.title': 'Documents pending disposition',
  'retentionDisposition.body': '{count, plural, one {# document is} other {# documents are}} scheduled for disposition on {{date}}.',
  'retentionDisposition.review': 'Please review these documents before the disposition date.',
  'retentionDisposition.action': 'Review documents',

  'aiActionConfirmation.subject': 'Confirm AI action on {{name}}',
  'aiActionConfirmation.preview': 'AI action requires your confirmation',
  'aiActionConfirmation.title': 'AI action requires confirmation',
  'aiActionConfirmation.body': 'The Smart EDMS AI assistant has proposed an action on the document "{{name}}". Please review and confirm before it is applied.',
  'aiActionConfirmation.disclaimer': 'AI actions are read-only by default and require explicit confirmation before any change is made.',
  'aiActionConfirmation.action': 'Review and confirm',

  'welcome.subject': 'Welcome to Smart EDMS, {{name}}!',
  'welcome.preview': 'Get started with Smart EDMS',
  'welcome.title': 'Welcome to Smart EDMS',
  'welcome.body': 'Your account is ready. Take the welcome tour to get familiar with the system in under five minutes.',
  'welcome.action': 'Start the tour',
  'welcome.tips': 'Quick tips: upload your first document, run OCR automatically, and set up a workflow for approvals.',

  'digest.subject': 'Your daily Smart EDMS digest',
  'digest.preview': 'Daily summary of activity',
  'digest.title': 'Daily digest for {{date}}',
  'digest.body': 'Here’s a summary of what happened in your workspace today.',
  'digest.section.workflows': 'Workflows',
  'digest.section.documents': 'Documents',
  'digest.section.sharing': 'Sharing',
  'digest.section.security': 'Security',
  'digest.section.empty': 'Nothing new in this category today.',
} as const;

export default emails;
