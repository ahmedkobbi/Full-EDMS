"use strict";
/**
 * @smart-edms/i18n — English locale: top-level barrel.
 *
 * Exports one default-export per namespace. The keys here match the
 * `Namespace` type from `@smart-edms/types` exactly (spec §16.4).
 *
 * English is the source of truth — the `check-keys` script uses this
 * locale as the baseline for missing-key detection in other locales.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.en = void 0;
const common_js_1 = __importDefault(require("./common.js"));
const auth_js_1 = __importDefault(require("./auth.js"));
const documents_js_1 = __importDefault(require("./documents.js"));
const metadata_js_1 = __importDefault(require("./metadata.js"));
const workflow_js_1 = __importDefault(require("./workflow.js"));
const sharing_js_1 = __importDefault(require("./sharing.js"));
const audit_js_1 = __importDefault(require("./audit.js"));
const admin_js_1 = __importDefault(require("./admin.js"));
const security_js_1 = __importDefault(require("./security.js"));
const errors_js_1 = __importDefault(require("./errors.js"));
const notifications_js_1 = __importDefault(require("./notifications.js"));
const emails_js_1 = __importDefault(require("./emails.js"));
const retention_js_1 = __importDefault(require("./retention.js"));
const classification_js_1 = __importDefault(require("./classification.js"));
const digitization_js_1 = __importDefault(require("./digitization.js"));
const provenance_js_1 = __importDefault(require("./provenance.js"));
const license_js_1 = __importDefault(require("./license.js"));
const billing_js_1 = __importDefault(require("./billing.js"));
const marketing_js_1 = __importDefault(require("./marketing.js"));
const settings_js_1 = __importDefault(require("./settings.js"));
const scanner_js_1 = __importDefault(require("./scanner.js"));
const locales_js_1 = __importDefault(require("./locales.js"));
const nav_js_1 = __importDefault(require("./nav.js"));
const dashboard_js_1 = __importDefault(require("./dashboard.js"));
const notFound_js_1 = __importDefault(require("./notFound.js"));
const index_js_1 = require("./tour/index.js");
const index_js_2 = require("./ai/index.js");
exports.en = {
    common: common_js_1.default,
    auth: auth_js_1.default,
    documents: documents_js_1.default,
    metadata: metadata_js_1.default,
    workflow: workflow_js_1.default,
    sharing: sharing_js_1.default,
    audit: audit_js_1.default,
    admin: admin_js_1.default,
    security: security_js_1.default,
    errors: errors_js_1.default,
    notifications: notifications_js_1.default,
    emails: emails_js_1.default,
    retention: retention_js_1.default,
    classification: classification_js_1.default,
    digitization: digitization_js_1.default,
    provenance: provenance_js_1.default,
    license: license_js_1.default,
    billing: billing_js_1.default,
    marketing: marketing_js_1.default,
    settings: settings_js_1.default,
    scanner: scanner_js_1.default,
    locales: locales_js_1.default,
    nav: nav_js_1.default,
    dashboard: dashboard_js_1.default,
    notFound: notFound_js_1.default,
    'tour.common': index_js_1.tour.common,
    'tour.welcome': index_js_1.tour.welcome,
    'tour.documents': index_js_1.tour.documents,
    'tour.search': index_js_1.tour.search,
    'tour.workflows': index_js_1.tour.workflows,
    'tour.audit': index_js_1.tour.audit,
    'tour.admin': index_js_1.tour.admin,
    'tour.license': index_js_1.tour.license,
    'tour.scanner': index_js_1.tour.scanner,
    'tour.collaboration': index_js_1.tour.collaboration,
    'tour.aiAssistant': index_js_1.tour.aiAssistant,
    'tour.checklist': index_js_1.tour.checklist,
    'tour.marketing': index_js_1.tour.marketing,
    'ai.common': index_js_2.ai.common,
    'ai.bubble': index_js_2.ai.bubble,
    'ai.errors': index_js_2.ai.errors,
    'ai.actions': index_js_2.ai.actions,
    'ai.disclaimer': index_js_2.ai.disclaimer,
    'ai.citations': index_js_2.ai.citations,
};
//# sourceMappingURL=index.js.map