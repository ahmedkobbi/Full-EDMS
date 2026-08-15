"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @smart-edms/i18n — Navigation namespace
 *
 * Sidebar + topbar navigation labels. Used by the Electron client, License Admin
 * Panel, and (subset) Marketing page.
 *
 * Spec ref: §16.4 (translation namespaces).
 *
 * NOTE: All keys here are English-source. The other 5 locales (fr, ar, ru, zh-CN, de)
 * are kept in sync by `pnpm i18n:check` — missing keys fail CI for critical namespaces.
 */
const nav = {
    'nav.dashboard': 'Dashboard',
    'nav.documents': 'Documents',
    'nav.search': 'Search',
    'nav.workflows': 'Workflows',
    'nav.audit': 'Audit',
    'nav.admin': 'Administration',
    'nav.scanner': 'Scanner',
    'nav.tours': 'Guided Tours',
    'nav.settings': 'Settings',
    'nav.help': 'Help',
    'nav.profile': 'Profile',
    'nav.signOut': 'Sign out',
    'nav.account': 'Account',
    'nav.notifications': 'Notifications',
    'nav.license': 'License',
    'nav.classification': 'Classification',
    'nav.retention': 'Retention',
    'nav.legalHold': 'Legal Hold',
    'nav.users': 'Users',
    'nav.groups': 'Groups',
    'nav.roles': 'Roles',
    'nav.apiKeys': 'API Keys',
    'nav.webhooks': 'Webhooks',
    'nav.branding': 'Branding',
    'nav.integrations': 'Integrations',
    'nav.aiAssistant': 'AI Assistant',
    'nav.commandPalette': 'Command palette',
    'nav.languageSwitcher': 'Language switcher',
    'nav.themeSwitcher': 'Theme switcher',
    // Admin sub-nav
    'nav.admin.dashboard': 'Overview',
    'nav.admin.users': 'User management',
    'nav.admin.roles': 'Roles & permissions',
    'nav.admin.security': 'Security policies',
    'nav.admin.locale': 'Locale & translation',
    'nav.admin.tourConfig': 'Tour configuration',
    'nav.admin.aiSettings': 'AI Assistant settings',
    'nav.admin.billing': 'Billing',
    'nav.admin.health': 'System health',
    'nav.admin.migration': 'Migration tools',
    // License server admin panel
    'nav.licenseServer.customers': 'Customers',
    'nav.licenseServer.products': 'Products',
    'nav.licenseServer.plans': 'Plans',
    'nav.licenseServer.licenses': 'Licenses',
    'nav.licenseServer.activations': 'Activations',
    'nav.licenseServer.offlineRequests': 'Offline activation requests',
    'nav.licenseServer.trials': 'Trials',
    'nav.licenseServer.webhooks': 'Webhooks',
    'nav.licenseServer.apiKeys': 'API keys',
    'nav.licenseServer.signingKeys': 'Signing keys',
    'nav.licenseServer.auditLogs': 'Audit logs',
};
exports.default = nav;
//# sourceMappingURL=nav.js.map