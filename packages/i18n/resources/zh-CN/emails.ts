/**
 * @smart-edms/i18n — zh-CN translation: `emails` namespace.
 *
 * Source of truth: en/emails.ts
 * Translated from the English baseline.
 */

const emails = {
  'layout.footer': 'This message was sent by Smart EDMS on behalf of {{tenant}}.',  // falls back to English
  'layout.unsubscribe': 'You are receiving this email because you have an account on Smart EDMS. Manage your notification preferences in your account settings.',  // falls back to English
  'layout.support': 'Need help? Contact your administrator.',  // falls back to English
  'layout.copyright': '© {{year}} Smart EDMS. All rights reserved.',  // falls back to English
  'layout.viewInBrowser': 'View in browser',  // falls back to English
  'layout.poweredBy': 'Powered by Smart EDMS',  // falls back to English
  'common.greeting': 'Hello {{name}},',  // falls back to English
  'common.greeting.generic': 'Hello,',  // falls back to English
  'common.signOff': 'Kind regards,',  // falls back to English
  'common.signOff.team': 'The Smart EDMS team',  // falls back to English
  'common.button.callToAction': 'Open Smart EDMS',  // falls back to English
  'common.button.viewDocument': 'View document',  // falls back to English
  'common.button.acceptInvite': 'Accept invitation',  // falls back to English
  'common.button.resetPassword': 'Reset password',  // falls back to English
  'common.button.verifyEmail': 'Verify email',  // falls back to English
  'invite.subject': '{{actor}} invited you to join {{tenant}} on Smart EDMS',  // falls back to English
  'invite.preview': 'You have been invited to join {{tenant}}',  // falls back to English
  'invite.title': 'You’re invited to {{tenant}}',  // falls back to English
  'invite.body': '{{actor}} has invited you to join {{tenant}} on Smart EDMS. Click the button below to accept your invitation and set up your account.',  // falls back to English
  'invite.expires': 'This invitation expires on {{date}}.',  // falls back to English
  'invite.ignore': 'If you did not expect this invitation, you can safely ignore this email.',  // falls back to English
  'passwordReset.subject': 'Reset your Smart EDMS password',  // falls back to English
  'passwordReset.preview': 'A password reset was requested for your account',  // falls back to English
  'passwordReset.title': 'Reset your password',  // falls back to English
  'passwordReset.body': 'We received a request to reset your Smart EDMS password. Click the button below to choose a new password.',  // falls back to English
  'passwordReset.expires': 'This link expires in {{minutes}} minutes.',  // falls back to English
  'passwordReset.ignore': 'If you did not request a password reset, you can safely ignore this email — your password will not be changed.',  // falls back to English
  'passwordChanged.subject': 'Your Smart EDMS password was changed',  // falls back to English
  'passwordChanged.preview': 'Security alert: password change',  // falls back to English
  'passwordChanged.title': 'Password changed',  // falls back to English
  'passwordChanged.body': 'Your Smart EDMS password was changed on {{date}} from {{device}}. If this was you, no action is needed.',  // falls back to English
  'passwordChanged.notYou': 'If you did not make this change, please contact your administrator immediately.',  // falls back to English
  'mfaEnabled.subject': 'Multi-factor authentication is now enabled',  // falls back to English
  'mfaEnabled.preview': 'Security update: MFA enabled',  // falls back to English
  'mfaEnabled.title': 'MFA enabled on your account',  // falls back to English
  'mfaEnabled.body': 'Multi-factor authentication is now enabled on your account. You will be asked for a verification code on future sign-ins.',  // falls back to English
  'mfaEnabled.backup': 'Remember to store your backup codes in a safe place — they are the only way to regain access if you lose your authenticator device.',  // falls back to English
  'mfaDisabled.subject': 'Multi-factor authentication was disabled',  // falls back to English
  'mfaDisabled.preview': 'Security alert: MFA disabled',  // falls back to English
  'mfaDisabled.title': 'MFA disabled on your account',  // falls back to English
  'mfaDisabled.body': 'Multi-factor authentication was disabled on your account on {{date}}. Your account is now less secure.',  // falls back to English
  'mfaDisabled.notYou': 'If you did not make this change, please contact your administrator immediately.',  // falls back to English
  'suspiciousLogin.subject': 'New sign-in to your Smart EDMS account',  // falls back to English
  'suspiciousLogin.preview': 'Security alert: new sign-in',  // falls back to English
  'suspiciousLogin.title': 'New sign-in detected',  // falls back to English
  'suspiciousLogin.body': 'We detected a new sign-in to your account on {{date}} from a {{device}} in {{location}}.',  // falls back to English
  'suspiciousLogin.notYou': 'If this was not you, please reset your password immediately and contact your administrator.',  // falls back to English
  'documentShared.subject': '{{actor}} shared a document with you: {{name}}',  // falls back to English
  'documentShared.preview': 'A document was shared with you',  // falls back to English
  'documentShared.title': 'Document shared with you',  // falls back to English
  'documentShared.body': '{{actor}} shared the document "{{name}}" with you. You have {{permission}} access.',  // falls back to English
  'documentShared.expires': 'This share expires on {{date}}.',  // falls back to English
  'documentShared.view': 'View document',  // falls back to English
  'documentSharedExternal.subject': 'A document was shared with you on Smart EDMS',  // falls back to English
  'documentSharedExternal.preview': 'External document share',  // falls back to English
  'documentSharedExternal.title': 'A document has been shared with you',  // falls back to English
  'documentSharedExternal.body': '{{actor}} from {{tenant}} has shared the document "{{name}}" with you. Use the button below to access it.',  // falls back to English
  'documentSharedExternal.expires': 'This share expires on {{date}}.',  // falls back to English
  'documentSharedExternal.password': 'You will need the password provided by {{actor}} to access this document.',  // falls back to English
  'workflowAssigned.subject': 'Workflow step assigned: {{name}}',  // falls back to English
  'workflowAssigned.preview': 'You have a workflow step to review',  // falls back to English
  'workflowAssigned.title': 'Workflow step assigned to you',  // falls back to English
  'workflowAssigned.body': 'A workflow step has been assigned to you on document "{{name}}". Please review and approve, reject, or request changes.',  // falls back to English
  'workflowAssigned.dueBy': 'This step is due by {{date}}.',  // falls back to English
  'workflowAssigned.open': 'Open workflow',  // falls back to English
  'workflowOverdue.subject': 'Workflow step overdue: {{name}}',  // falls back to English
  'workflowOverdue.preview': 'A workflow step is overdue',  // falls back to English
  'workflowOverdue.title': 'Workflow step overdue',  // falls back to English
  'workflowOverdue.body': 'A workflow step assigned to you on document "{{name}}" is now overdue. Please complete it as soon as possible.',  // falls back to English
  'workflowOverdue.escalating': 'This step will be escalated in {{hours}} hours if not completed.',  // falls back to English
  'workflowCompleted.subject': 'Workflow completed: {{name}}',  // falls back to English
  'workflowCompleted.preview': 'A workflow has finished',  // falls back to English
  'workflowCompleted.title': 'Workflow completed',  // falls back to English
  'workflowCompleted.body': 'The workflow on document "{{name}}" has been completed.',  // falls back to English
  'workflowCompleted.outcome': 'Outcome: {{outcome}}',  // falls back to English
  'legalHold.subject': 'A legal hold was applied to your document',  // falls back to English
  'legalHold.preview': 'Legal hold notification',  // falls back to English
  'legalHold.title': 'Legal hold applied',  // falls back to English
  'legalHold.body': 'A legal hold has been applied to the document "{{name}}". The document cannot be modified, shared, or deleted while the hold is in effect.',  // falls back to English
  'legalHold.reason': 'Reason: {{reason}}',  // falls back to English
  'legalHold.custodian': 'Custodian: {{custodian}}',  // falls back to English
  'legalHold.contact': 'If you have questions, please contact {{custodian}}.',  // falls back to English
  'licenseExpiring.subject': 'Your Smart EDMS license will expire soon',  // falls back to English
  'licenseExpiring.preview': 'License renewal reminder',  // falls back to English
  'licenseExpiring.title': 'License expiring soon',  // falls back to English
  'licenseExpiring.body': 'Your Smart EDMS license will expire on {{date}}. Please renew to avoid any interruption in service.',  // falls back to English
  'licenseExpiring.grace': 'After expiry, you will have a {{days}}-day grace period during which the system remains fully functional.',  // falls back to English
  'licenseExpiring.action': 'Renew license',  // falls back to English
  'licenseExpired.subject': 'Your Smart EDMS license has expired',  // falls back to English
  'licenseExpired.preview': 'License expired',  // falls back to English
  'licenseExpired.title': 'License expired',  // falls back to English
  'licenseExpired.body': 'Your Smart EDMS license expired on {{date}}. You are now in the grace period. The system will remain functional until {{graceEnd}}.',  // falls back to English
  'licenseExpired.action': 'Renew license',  // falls back to English
  'licenseGraceExhausted.subject': 'Your Smart EDMS grace period has ended',  // falls back to English
  'licenseGraceExhausted.preview': 'Grace period ended',  // falls back to English
  'licenseGraceExhausted.title': 'Grace period ended',  // falls back to English
  'licenseGraceExhausted.body': 'The grace period for your expired Smart EDMS license has ended. Write access is now restricted. You can still read existing documents.',  // falls back to English
  'licenseGraceExhausted.action': 'Renew license',  // falls back to English
  'licenseInvalid.subject': 'Your Smart EDMS license is no longer valid',  // falls back to English
  'licenseInvalid.preview': 'License invalid',  // falls back to English
  'licenseInvalid.title': 'License invalid',  // falls back to English
  'licenseInvalid.body': 'Your Smart EDMS license is no longer valid. Please contact your administrator to restore access.',  // falls back to English
  'licenseInvalid.action': 'Contact administrator',  // falls back to English
  'retentionDisposition.subject': 'Documents pending disposition',  // falls back to English
  'retentionDisposition.preview': 'Retention disposition notice',  // falls back to English
  'retentionDisposition.title': 'Documents pending disposition',  // falls back to English
  'retentionDisposition.body': '{count, plural, one {# document is} other {# documents are}} scheduled for disposition on {{date}}.',  // falls back to English
  'retentionDisposition.review': 'Please review these documents before the disposition date.',  // falls back to English
  'retentionDisposition.action': 'Review documents',  // falls back to English
  'aiActionConfirmation.subject': 'Confirm AI action on {{name}}',  // falls back to English
  'aiActionConfirmation.preview': 'AI action requires your confirmation',  // falls back to English
  'aiActionConfirmation.title': 'AI action requires confirmation',  // falls back to English
  'aiActionConfirmation.body': 'The Smart EDMS AI assistant has proposed an action on the document "{{name}}". Please review and confirm before it is applied.',  // falls back to English
  'aiActionConfirmation.disclaimer': 'AI actions are read-only by default and require explicit confirmation before any change is made.',  // falls back to English
  'aiActionConfirmation.action': 'Review and confirm',  // falls back to English
  'welcome.subject': 'Welcome to Smart EDMS, {{name}}!',  // falls back to English
  'welcome.preview': 'Get started with Smart EDMS',  // falls back to English
  'welcome.title': 'Welcome to Smart EDMS',  // falls back to English
  'welcome.body': 'Your account is ready. Take the welcome tour to get familiar with the system in under five minutes.',  // falls back to English
  'welcome.action': 'Start the tour',  // falls back to English
  'welcome.tips': 'Quick tips: upload your first document, run OCR automatically, and set up a workflow for approvals.',  // falls back to English
  'digest.subject': 'Your daily Smart EDMS digest',  // falls back to English
  'digest.preview': 'Daily summary of activity',  // falls back to English
  'digest.title': 'Daily digest for {{date}}',  // falls back to English
  'digest.body': 'Here’s a summary of what happened in your workspace today.',  // falls back to English
  'digest.section.workflows': 'Workflows',  // falls back to English
  'digest.section.documents': 'Documents',  // falls back to English
  'digest.section.sharing': 'Sharing',  // falls back to English
  'digest.section.security': 'Security',  // falls back to English
  'digest.section.empty': 'Nothing new in this category today.',  // falls back to English
} as const;

export default emails;
