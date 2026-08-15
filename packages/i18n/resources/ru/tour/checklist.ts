/**
 * @smart-edms/i18n — ru translation: `tour.checklist` namespace.
 *
 * Source of truth: en/tour/checklist.ts
 * Translated from the English baseline.
 */

const checklist = {
  title: 'Setup checklist',  // falls back to English
  subtitle: 'A few items to get the most out of Smart EDMS.',  // falls back to English
  'intro.title': 'Your setup checklist',  // falls back to English
  'intro.body': 'Here are the things we recommend doing to make Smart EDMS work for your organisation. Tick them off as you go.',  // falls back to English
  'category.profile': 'Your profile',  // falls back to English
  'category.documents': 'Documents',  // falls back to English
  'category.security': 'Security',  // falls back to English
  'category.team': 'Your team',  // falls back to English
  'category.integrations': 'Integrations',  // falls back to English
  'category.compliance': 'Compliance',  // falls back to English
  'item.completeProfile': 'Complete your profile',  // falls back to English
  'item.completeProfile.description': 'Add your name, photo, and timezone so colleagues can find and collaborate with you.',  // falls back to English
  'item.uploadAvatar': 'Upload an avatar',  // falls back to English
  'item.enableMfa': 'Enable multi-factor authentication',  // falls back to English
  'item.enableMfa.description': 'Protect your account with a second verification step.',  // falls back to English
  'item.switchLanguage': 'Try switching language',  // falls back to English
  'item.switchLanguage.description': 'Smart EDMS is available in six languages.',  // falls back to English
  'item.uploadDocument': 'Upload your first document',  // falls back to English
  'item.runOcr': 'Run OCR on a scanned document',  // falls back to English
  'item.createClassification': 'Create a classification label',  // falls back to English
  'item.createRetentionSchedule': 'Set up a retention schedule',  // falls back to English
  'item.createWorkflow': 'Create a workflow',  // falls back to English
  'item.inviteColleague': 'Invite a colleague',  // falls back to English
  'item.createGroup': 'Create a user group',  // falls back to English
  'item.configureSso': 'Configure single sign-on',  // falls back to English
  'item.configureScanner': 'Connect a scanner',  // falls back to English
  'item.takeAuditTour': 'Take the audit log tour',  // falls back to English
  'item.reviewLicense': 'Review your license status',  // falls back to English
  'item.exportAuditLog': 'Export a sample of the audit log',  // falls back to English
  'item.createEvidencePackage': 'Create an evidence package',  // falls back to English
  'item.configureAi': 'Review the AI assistant settings',  // falls back to English
  'item.takeAiTour': 'Take the AI assistant tour',  // falls back to English
  'progress.title': 'Setup progress',  // falls back to English
  'progress.description': '{{done}} of {{total}} items complete.',  // falls back to English
  'progress.percent': '{{percent}}% complete',  // falls back to English
  'progress.allDone': 'All done! You’re ready to roll.',  // falls back to English
  'skip.title': 'Skip the checklist',  // falls back to English
  'skip.body': 'You can come back to this checklist anytime from the Help menu.',  // falls back to English
  'skip.confirm': 'Skip the setup checklist?',  // falls back to English
  'dismiss.title': 'Dismiss the checklist',  // falls back to English
  'dismiss.body': 'Hide the checklist from your dashboard. You can re-enable it from Settings.',  // falls back to English
  'dismiss.confirm': 'Dismiss the setup checklist?',  // falls back to English
  'reset.title': 'Reset the checklist',  // falls back to English
  'reset.body': 'Clear all checkmarks and start over.',  // falls back to English
  'reset.confirm': 'Reset the setup checklist? All progress will be lost.',  // falls back to English
  categoryComplete: 'All items in this category are complete!',  // falls back to English
} as const;

export default checklist;
