"use strict";
/**
 * @smart-edms/i18n — zh-CN translation: `settings` namespace.
 *
 * Source of truth: en/settings.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const settings = {
    title: 'Settings', // falls back to English
    subtitle: 'Manage your account preferences.', // falls back to English
    'tab.profile': 'Profile', // falls back to English
    'tab.preferences': 'Preferences', // falls back to English
    'tab.appearance': 'Appearance', // falls back to English
    'tab.accessibility': 'Accessibility', // falls back to English
    'tab.notifications': 'Notifications', // falls back to English
    'tab.security': 'Security', // falls back to English
    'tab.sessions': 'Sessions', // falls back to English
    'tab.integrations': 'Integrations', // falls back to English
    'tab.apiKeys': 'API keys', // falls back to English
    'profile.title': 'Profile', // falls back to English
    'profile.subtitle': 'Update your personal information.', // falls back to English
    'profile.firstName': 'First name', // falls back to English
    'profile.lastName': 'Last name', // falls back to English
    'profile.displayName': 'Display name', // falls back to English
    'profile.email': 'Email', // falls back to English
    'profile.phone': 'Phone', // falls back to English
    'profile.title.role': 'Job title', // falls back to English
    'profile.department': 'Department', // falls back to English
    'profile.location': 'Location', // falls back to English
    'profile.timezone': 'Timezone', // falls back to English
    'profile.bio': 'Bio', // falls back to English
    'profile.avatar': 'Avatar', // falls back to English
    'profile.avatar.upload': 'Upload avatar', // falls back to English
    'profile.avatar.remove': 'Remove avatar', // falls back to English
    'profile.save': 'Save profile', // falls back to English
    'profile.saved': 'Profile updated.', // falls back to English
    'preferences.title': 'Preferences', // falls back to English
    'preferences.subtitle': 'Configure how Smart EDMS behaves for you.', // falls back to English
    'preferences.language': 'Language', // falls back to English
    'preferences.language.description': 'The interface language. Changes apply immediately.', // falls back to English
    'preferences.dateFormat': 'Date format', // falls back to English
    'preferences.dateFormat.short': 'Short (e.g. 2025-01-31)', // falls back to English
    'preferences.dateFormat.medium': 'Medium (e.g. Jan 31, 2025)', // falls back to English
    'preferences.dateFormat.long': 'Long (e.g. January 31, 2025)', // falls back to English
    'preferences.timeFormat': 'Time format', // falls back to English
    'preferences.timeFormat.12h': '12-hour (1:30 PM)', // falls back to English
    'preferences.timeFormat.24h': '24-hour (13:30)', // falls back to English
    'preferences.numberFormat': 'Number format', // falls back to English
    'preferences.firstDayOfWeek': 'First day of week', // falls back to English
    'preferences.firstDayOfWeek.sunday': 'Sunday', // falls back to English
    'preferences.firstDayOfWeek.monday': 'Monday', // falls back to English
    'preferences.firstDayOfWeek.saturday': 'Saturday', // falls back to English
    'preferences.calendar': 'Calendar system', // falls back to English
    'preferences.calendar.gregory': 'Gregorian', // falls back to English
    'preferences.calendar.islamic': 'Islamic', // falls back to English
    'preferences.calendar.islamicCivil': 'Islamic (civil)', // falls back to English
    'preferences.calendar.persian': 'Persian', // falls back to English
    'preferences.calendar.chinese': 'Chinese', // falls back to English
    'preferences.defaultDocumentView': 'Default document view', // falls back to English
    'preferences.defaultDocumentView.grid': 'Grid', // falls back to English
    'preferences.defaultDocumentView.list': 'List', // falls back to English
    'preferences.defaultDocumentView.details': 'Details', // falls back to English
    'preferences.showThumbnails': 'Show document thumbnails', // falls back to English
    'preferences.autoStartTour': 'Auto-start the welcome tour', // falls back to English
    'preferences.confirmBeforeDelete': 'Confirm before deleting', // falls back to English
    'preferences.showFileSize': 'Show file sizes in lists', // falls back to English
    'preferences.recentDocumentsCount': 'Number of recent documents to show', // falls back to English
    'preferences.save': 'Save preferences', // falls back to English
    'preferences.saved': 'Preferences updated.', // falls back to English
    'appearance.title': 'Appearance', // falls back to English
    'appearance.subtitle': 'Customise how Smart EDMS looks.', // falls back to English
    'appearance.theme': 'Theme', // falls back to English
    'appearance.theme.light': 'Light', // falls back to English
    'appearance.theme.dark': 'Dark', // falls back to English
    'appearance.theme.system': 'System', // falls back to English
    'appearance.density': 'Density', // falls back to English
    'appearance.density.compact': 'Compact', // falls back to English
    'appearance.density.cozy': 'Cozy', // falls back to English
    'appearance.density.comfortable': 'Comfortable', // falls back to English
    'appearance.accentColor': 'Accent color', // falls back to English
    'appearance.fontSize': 'Font size', // falls back to English
    'appearance.fontSize.small': 'Small', // falls back to English
    'appearance.fontSize.medium': 'Medium', // falls back to English
    'appearance.fontSize.large': 'Large', // falls back to English
    'appearance.fontFamily': 'Font family', // falls back to English
    'appearance.reduceMotion': 'Reduce motion', // falls back to English
    'appearance.reduceMotion.description': 'Minimise animations and transitions.', // falls back to English
    'appearance.highContrast': 'High contrast mode', // falls back to English
    'appearance.save': 'Save appearance', // falls back to English
    'appearance.saved': 'Appearance updated.', // falls back to English
    'accessibility.title': 'Accessibility', // falls back to English
    'accessibility.subtitle': 'Configure assistive technology settings.', // falls back to English
    'accessibility.screenReader': 'Screen reader optimisations', // falls back to English
    'accessibility.screenReader.description': 'Adds extra ARIA labels and announcements.', // falls back to English
    'accessibility.keyboardNavigation': 'Enhanced keyboard navigation', // falls back to English
    'accessibility.keyboardNavigation.description': 'Shows focus rings more prominently and adds shortcuts.', // falls back to English
    'accessibility.largeClickTargets': 'Larger click targets', // falls back to English
    'accessibility.captions': 'Always show captions', // falls back to English
    'accessibility.captions.description': 'For video previews in the document library.', // falls back to English
    'accessibility.dyslexiaFont': 'Dyslexia-friendly font', // falls back to English
    'accessibility.colorblind': 'Colorblind-friendly palette', // falls back to English
    'accessibility.colorblind.protanopia': 'Protanopia (red-blind)', // falls back to English
    'accessibility.colorblind.deuteranopia': 'Deuteranopia (green-blind)', // falls back to English
    'accessibility.colorblind.tritanopia': 'Tritanopia (blue-blind)', // falls back to English
    'accessibility.save': 'Save accessibility settings', // falls back to English
    'accessibility.saved': 'Accessibility settings updated.', // falls back to English
    'apiKeys.title': 'API keys', // falls back to English
    'apiKeys.subtitle': 'Use API keys to authenticate programmatic access.', // falls back to English
    'apiKeys.create': 'Create API key', // falls back to English
    'apiKeys.name': 'Key name', // falls back to English
    'apiKeys.name.placeholder': 'e.g. CI pipeline', // falls back to English
    'apiKeys.scopes': 'Scopes', // falls back to English
    'apiKeys.scopes.documents.read': 'Read documents', // falls back to English
    'apiKeys.scopes.documents.write': 'Write documents', // falls back to English
    'apiKeys.scopes.workflow.read': 'Read workflows', // falls back to English
    'apiKeys.scopes.workflow.write': 'Manage workflows', // falls back to English
    'apiKeys.scopes.audit.read': 'Read audit log', // falls back to English
    'apiKeys.scopes.admin': 'Admin access', // falls back to English
    'apiKeys.expires': 'Expires', // falls back to English
    'apiKeys.expires.never': 'Never', // falls back to English
    'apiKeys.expires.30days': '30 days', // falls back to English
    'apiKeys.expires.90days': '90 days', // falls back to English
    'apiKeys.expires.1year': '1 year', // falls back to English
    'apiKeys.column.name': 'Name', // falls back to English
    'apiKeys.column.scopes': 'Scopes', // falls back to English
    'apiKeys.column.created': 'Created', // falls back to English
    'apiKeys.column.lastUsed': 'Last used', // falls back to English
    'apiKeys.column.expires': 'Expires', // falls back to English
    'apiKeys.copyOnce': 'Copy this key now. You will not be able to see it again.', // falls back to English
    'apiKeys.copied': 'API key copied to clipboard.', // falls back to English
    'apiKeys.revoke': 'Revoke', // falls back to English
    'apiKeys.revoke.confirm': 'Revoke API key "{{name}}"? Any application using it will lose access immediately.', // falls back to English
    'apiKeys.empty': 'No API keys created.', // falls back to English
    'integrations.title': 'My integrations', // falls back to English
    'integrations.subtitle': 'Apps and services connected to your account.', // falls back to English
    'integrations.empty': 'No integrations connected.', // falls back to English
    'integrations.disconnect': 'Disconnect', // falls back to English
    'integrations.disconnect.confirm': 'Disconnect {{name}}?', // falls back to English
    'dangerZone.title': 'Danger zone', // falls back to English
    'dangerZone.deleteAccount': 'Delete account', // falls back to English
    'dangerZone.deleteAccount.description': 'Permanently delete your account and all personal data. Documents you own will be reassigned to your manager.', // falls back to English
    'dangerZone.deleteAccount.confirm': 'Permanently delete your account? This cannot be undone.', // falls back to English
    'dangerZone.exportData': 'Export my data', // falls back to English
    'dangerZone.exportData.description': 'Download a copy of your personal data in JSON format.', // falls back to English
    'dangerZone.exportData.action': 'Export', // falls back to English
};
exports.default = settings;
//# sourceMappingURL=settings.js.map