"use strict";
/**
 * @smart-edms/i18n — English baseline: `tour.admin` namespace (spec §16.4)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tourAdmin = {
    'title': 'Admin tour',
    'subtitle': 'Manage users, roles, and tenant settings.',
    'step.intro.title': 'Administration',
    'step.intro.body': 'This tour is for administrators. It covers user management, roles, integrations, and tenant settings.',
    'step.users.title': 'Users',
    'step.users.body': 'Invite users, assign roles, reset passwords, reset MFA, and deactivate accounts. You can also import users in bulk via CSV.',
    'step.groups.title': 'Groups',
    'step.groups.body': 'Group users for easier permission management. A user can be in multiple groups.',
    'step.roles.title': 'Roles and permissions',
    'step.roles.body': 'Roles bundle permissions. Smart EDMS ships with sensible defaults (Administrator, Records manager, Compliance officer, Auditor, Contributor, Viewer) and you can create custom roles.',
    'step.tenant.title': 'Tenant settings',
    'step.tenant.body': 'Configure organisation name, logo, default locale, timezone, storage quota, and user limit.',
    'step.integrations.title': 'Integrations',
    'step.integrations.body': 'Connect Smart EDMS to identity providers, storage, notification systems, AI providers, and scanner drivers.',
    'step.featureFlags.title': 'Feature flags',
    'step.featureFlags.body': 'Toggle features on or off per tenant. Beta and experimental features require explicit opt-in.',
    'step.health.title': 'System health',
    'step.health.body': 'Monitor the status of backend services — database, search index, cache, queue, license server, AI gateway, object storage, audit log.',
    'step.audit.title': 'Audit log access',
    'step.audit.body': 'Administrators can read the audit log but cannot modify or delete events. Tamper-evidence protects you from rogue admins too.',
    'step.billing.title': 'Billing',
    'step.billing.body': 'Manage your subscription, invoices, payment methods, and usage. Plan changes take effect at the next billing period.',
    'step.license.title': 'License',
    'step.license.body': 'View your license status, renew, import a .sedmslic file, or export a .sedmsreq request for offline activation.',
    'step.impersonation.title': 'Impersonation',
    'step.impersonation.body': 'Need to see what a user sees? Impersonate them. Every action you take is audited under your identity, not theirs.',
    'completion.title': 'You’re ready to administer',
    'completion.body': 'You now know your way around the admin console. Take the License tour to learn about license states and the heartbeat model.',
    'completion.next': 'Take the License tour',
};
exports.default = tourAdmin;
//# sourceMappingURL=admin.js.map