"use strict";
/**
 * @smart-edms/i18n — ar translation: `admin` namespace.
 *
 * Source of truth: en/admin.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const admin = {
    title: 'Administration', // falls back to English
    subtitle: 'Manage your organisation’s users, settings, and integrations.', // falls back to English
    'tab.users': 'Users', // falls back to English
    'tab.groups': 'Groups', // falls back to English
    'tab.roles': 'Roles', // falls back to English
    'tab.permissions': 'Permissions', // falls back to English
    'tab.tenant': 'Tenant settings', // falls back to English
    'tab.integrations': 'Integrations', // falls back to English
    'tab.audit': 'Audit log', // falls back to English
    'tab.billing': 'Billing', // falls back to English
    'tab.license': 'License', // falls back to English
    'tab.featureFlags': 'Feature flags', // falls back to English
    'tab.health': 'System health', // falls back to English
    'users.title': 'Users', // falls back to English
    'users.subtitle': 'Manage user accounts in your organisation.', // falls back to English
    'users.search': 'Search users…', // falls back to English
    'users.invite': 'Invite user', // falls back to English
    'users.create': 'Create user', // falls back to English
    'users.empty': 'No users found.', // falls back to English
    'users.count': '{count, plural, one {# user} other {# users}}', // falls back to English
    'users.column.name': 'Name', // falls back to English
    'users.column.email': 'Email', // falls back to English
    'users.column.role': 'Role', // falls back to English
    'users.column.status': 'Status', // falls back to English
    'users.column.lastActive': 'Last active', // falls back to English
    'users.column.created': 'Created', // falls back to English
    'users.column.mfa': 'MFA', // falls back to English
    'users.actions.edit': 'Edit user', // falls back to English
    'users.actions.deactivate': 'Deactivate', // falls back to English
    'users.actions.activate': 'Activate', // falls back to English
    'users.actions.resetPassword': 'Reset password', // falls back to English
    'users.actions.resetMfa': 'Reset MFA', // falls back to English
    'users.actions.delete': 'Delete user', // falls back to English
    'users.actions.impersonate': 'Impersonate', // falls back to English
    'users.actions.impersonate.confirm': 'You are about to sign in as {{name}}. All actions will be audited under your identity. Continue?', // falls back to English
    'users.actions.impersonate.stop': 'Stop impersonating', // falls back to English
    'users.delete.confirm': 'Permanently delete user {{name}}? Their documents will be reassigned to their manager.', // falls back to English
    'users.deactivate.confirm': 'Deactivate {{name}}? They will lose access immediately.', // falls back to English
    'users.resetPassword.confirm': 'Send a password reset email to {{email}}?', // falls back to English
    'users.resetMfa.confirm': 'Reset MFA for {{name}}? They will need to set it up again on next sign-in.', // falls back to English
    'users.status.active': 'Active', // falls back to English
    'users.status.inactive': 'Inactive', // falls back to English
    'users.status.suspended': 'Suspended', // falls back to English
    'users.status.invited': 'Invited', // falls back to English
    'users.status.expired': 'Expired', // falls back to English
    'users.mfa.enabled': 'Enabled', // falls back to English
    'users.mfa.disabled': 'Disabled', // falls back to English
    'users.mfa.required': 'Required', // falls back to English
    'users.bulk.import': 'Import users', // falls back to English
    'users.bulk.export': 'Export users', // falls back to English
    'users.bulk.template': 'Download CSV template', // falls back to English
    'users.bulk.success': 'Imported {count, plural, one {# user} other {# users}}.', // falls back to English
    'users.bulk.error': 'Import failed: {{reason}}', // falls back to English
    'groups.title': 'Groups', // falls back to English
    'groups.subtitle': 'Organise users into groups for easier permission management.', // falls back to English
    'groups.create': 'Create group', // falls back to English
    'groups.empty': 'No groups defined.', // falls back to English
    'groups.column.name': 'Name', // falls back to English
    'groups.column.members': 'Members', // falls back to English
    'groups.column.description': 'Description', // falls back to English
    'groups.members.count': '{count, plural, one {# member} other {# members}}', // falls back to English
    'groups.members.add': 'Add members', // falls back to English
    'groups.members.remove': 'Remove from group', // falls back to English
    'groups.delete.confirm': 'Delete group "{{name}}"? Members will keep their individual permissions.', // falls back to English
    'roles.title': 'Roles', // falls back to English
    'roles.subtitle': 'Define reusable permission sets.', // falls back to English
    'roles.create': 'Create role', // falls back to English
    'roles.empty': 'No roles defined.', // falls back to English
    'roles.column.name': 'Role', // falls back to English
    'roles.column.description': 'Description', // falls back to English
    'roles.column.users': 'Users assigned', // falls back to English
    'roles.column.system': 'System role', // falls back to English
    'roles.system.admin': 'Administrator', // falls back to English
    'roles.system.recordsManager': 'Records manager', // falls back to English
    'roles.system.complianceOfficer': 'Compliance officer', // falls back to English
    'roles.system.auditor': 'Auditor', // falls back to English
    'roles.system.contributor': 'Contributor', // falls back to English
    'roles.system.viewer': 'Viewer', // falls back to English
    'roles.system.scanner': 'Scanner operator', // falls back to English
    'roles.system.workflowApprover': 'Workflow approver', // falls back to English
    'roles.system.aiUser': 'AI assistant user', // falls back to English
    'roles.delete.confirm': 'Delete role "{{name}}"? Users assigned to it will lose the associated permissions.', // falls back to English
    'roles.permissions.edit': 'Edit permissions', // falls back to English
    'permissions.title': 'Permissions', // falls back to English
    'permissions.subtitle': 'Granular permissions that can be assigned to roles.', // falls back to English
    'permissions.category.documents': 'Documents', // falls back to English
    'permissions.category.folders': 'Folders', // falls back to English
    'permissions.category.workflow': 'Workflows', // falls back to English
    'permissions.category.sharing': 'Sharing', // falls back to English
    'permissions.category.audit': 'Audit', // falls back to English
    'permissions.category.admin': 'Administration', // falls back to English
    'permissions.category.security': 'Security', // falls back to English
    'permissions.category.retention': 'Retention', // falls back to English
    'permissions.category.legalHold': 'Legal hold', // falls back to English
    'permissions.category.classification': 'Classification', // falls back to English
    'permissions.category.license': 'License', // falls back to English
    'permissions.category.ai': 'AI assistant', // falls back to English
    'permissions.category.scanner': 'Scanner', // falls back to English
    'permissions.grant': 'Grant', // falls back to English
    'permissions.revoke': 'Revoke', // falls back to English
    'permissions.inherited': 'Inherited from {{role}}', // falls back to English
    'tenant.title': 'Tenant settings', // falls back to English
    'tenant.subtitle': 'Organisation-wide configuration.', // falls back to English
    'tenant.name': 'Organisation name', // falls back to English
    'tenant.displayName': 'Display name', // falls back to English
    'tenant.description': 'Description', // falls back to English
    'tenant.logo': 'Logo', // falls back to English
    'tenant.logo.upload': 'Upload logo', // falls back to English
    'tenant.logo.recommendedSize': 'Recommended size: 512×512 px, SVG or PNG', // falls back to English
    'tenant.defaultLocale': 'Default locale', // falls back to English
    'tenant.defaultTimezone': 'Default timezone', // falls back to English
    'tenant.defaultClassification': 'Default classification', // falls back to English
    'tenant.storageQuota': 'Storage quota', // falls back to English
    'tenant.storageUsed': 'Storage used', // falls back to English
    'tenant.storageRemaining': 'Storage remaining', // falls back to English
    'tenant.userLimit': 'User limit', // falls back to English
    'tenant.userCount': 'Active users', // falls back to English
    'tenant.suspend': 'Suspend tenant', // falls back to English
    'tenant.suspend.confirm': 'Suspend this organisation? All users will lose access immediately.', // falls back to English
    'tenant.reactivate': 'Reactivate tenant', // falls back to English
    'tenant.delete': 'Delete tenant', // falls back to English
    'tenant.delete.confirm': 'Permanently delete this organisation and all its data? This cannot be undone.', // falls back to English
    'integrations.title': 'Integrations', // falls back to English
    'integrations.subtitle': 'Connect Smart EDMS to external systems.', // falls back to English
    'integrations.add': 'Add integration', // falls back to English
    'integrations.empty': 'No integrations configured.', // falls back to English
    'integrations.configure': 'Configure', // falls back to English
    'integrations.disconnect': 'Disconnect', // falls back to English
    'integrations.disconnect.confirm': 'Disconnect {{name}}? Data sync will stop immediately.', // falls back to English
    'integrations.test': 'Test connection', // falls back to English
    'integrations.connected': 'Connected', // falls back to English
    'integrations.disconnected': 'Disconnected', // falls back to English
    'integrations.error': 'Connection error', // falls back to English
    'integrations.lastSync': 'Last sync: {{date}}', // falls back to English
    'integrations.category.identity': 'Identity providers', // falls back to English
    'integrations.category.storage': 'Storage', // falls back to English
    'integrations.category.notification': 'Notifications', // falls back to English
    'integrations.category.ai': 'AI providers', // falls back to English
    'integrations.category.scanner': 'Scanner drivers', // falls back to English
    'integrations.category.archive': 'Archival systems', // falls back to English
    'featureFlags.title': 'Feature flags', // falls back to English
    'featureFlags.subtitle': 'Toggle features on or off for this tenant.', // falls back to English
    'featureFlags.empty': 'No configurable feature flags.', // falls back to English
    'featureFlags.enable': 'Enable', // falls back to English
    'featureFlags.disable': 'Disable', // falls back to English
    'featureFlags.beta': 'Beta', // falls back to English
    'featureFlags.experimental': 'Experimental', // falls back to English
    'featureFlags.requiresLicense': 'Requires license entitlement', // falls back to English
    'health.title': 'System health', // falls back to English
    'health.subtitle': 'Real-time status of backend services.', // falls back to English
    'health.ok': 'All systems operational', // falls back to English
    'health.degraded': 'Degraded performance', // falls back to English
    'health.down': 'Service outage', // falls back to English
    'health.lastCheck': 'Last checked: {{date}}', // falls back to English
    'health.check': 'Run health check', // falls back to English
    'health.service.database': 'Database', // falls back to English
    'health.service.search': 'Search index', // falls back to English
    'health.service.cache': 'Cache', // falls back to English
    'health.service.queue': 'Background queue', // falls back to English
    'health.service.license': 'License server', // falls back to English
    'health.service.ai': 'AI gateway', // falls back to English
    'health.service.storage': 'Object storage', // falls back to English
    'health.service.audit': 'Audit log', // falls back to English
};
exports.default = admin;
//# sourceMappingURL=admin.js.map