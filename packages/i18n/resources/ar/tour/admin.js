"use strict";
/**
 * @smart-edms/i18n — ar translation: `tour.admin` namespace.
 *
 * Source of truth: en/tour/admin.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const admin = {
    title: 'Admin tour', // falls back to English
    subtitle: 'Manage users, roles, and tenant settings.', // falls back to English
    'step.intro.title': 'Administration', // falls back to English
    'step.intro.body': 'This tour is for administrators. It covers user management, roles, integrations, and tenant settings.', // falls back to English
    'step.users.title': 'Users', // falls back to English
    'step.users.body': 'Invite users, assign roles, reset passwords, reset MFA, and deactivate accounts. You can also import users in bulk via CSV.', // falls back to English
    'step.groups.title': 'Groups', // falls back to English
    'step.groups.body': 'Group users for easier permission management. A user can be in multiple groups.', // falls back to English
    'step.roles.title': 'Roles and permissions', // falls back to English
    'step.roles.body': 'Roles bundle permissions. Smart EDMS ships with sensible defaults (Administrator, Records manager, Compliance officer, Auditor, Contributor, Viewer) and you can create custom roles.', // falls back to English
    'step.tenant.title': 'Tenant settings', // falls back to English
    'step.tenant.body': 'Configure organisation name, logo, default locale, timezone, storage quota, and user limit.', // falls back to English
    'step.integrations.title': 'Integrations', // falls back to English
    'step.integrations.body': 'Connect Smart EDMS to identity providers, storage, notification systems, AI providers, and scanner drivers.', // falls back to English
    'step.featureFlags.title': 'Feature flags', // falls back to English
    'step.featureFlags.body': 'Toggle features on or off per tenant. Beta and experimental features require explicit opt-in.', // falls back to English
    'step.health.title': 'System health', // falls back to English
    'step.health.body': 'Monitor the status of backend services — database, search index, cache, queue, license server, AI gateway, object storage, audit log.', // falls back to English
    'step.audit.title': 'Audit log access', // falls back to English
    'step.audit.body': 'Administrators can read the audit log but cannot modify or delete events. Tamper-evidence protects you from rogue admins too.', // falls back to English
    'step.billing.title': 'Billing', // falls back to English
    'step.billing.body': 'Manage your subscription, invoices, payment methods, and usage. Plan changes take effect at the next billing period.', // falls back to English
    'step.license.title': 'License', // falls back to English
    'step.license.body': 'View your license status, renew, import a .sedmslic file, or export a .sedmsreq request for offline activation.', // falls back to English
    'step.impersonation.title': 'Impersonation', // falls back to English
    'step.impersonation.body': 'Need to see what a user sees? Impersonate them. Every action you take is audited under your identity, not theirs.', // falls back to English
    'completion.title': 'You’re ready to administer', // falls back to English
    'completion.body': 'You now know your way around the admin console. Take the License tour to learn about license states and the heartbeat model.', // falls back to English
    'completion.next': 'Take the License tour', // falls back to English
};
exports.default = admin;
//# sourceMappingURL=admin.js.map