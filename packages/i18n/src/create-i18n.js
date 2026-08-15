"use strict";
/**
 * @smart-edms/i18n — i18next factory (spec §16.3)
 *
 * Creates a pre-configured i18next instance with all six mandatory locales
 * and all spec §16.4 namespaces bundled inline. No HTTP backend is needed —
 * the resources are statically imported, which keeps the package usable from
 * the backend (email templating), the marketing site, and the Electron
 * desktop app without a network round-trip.
 *
 * The factory is React-independent. React bindings (`react-i18next`) are
 * added by the web app; this package only exposes the core.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_I18N_OPTIONS = exports.NAMESPACES = exports.bundledResources = void 0;
exports.createI18n = createI18n;
const i18next_1 = __importDefault(require("i18next"));
const index_js_1 = require("../resources/en/index.js");
const index_js_2 = require("../resources/fr/index.js");
const index_js_3 = require("../resources/ar/index.js");
const index_js_4 = require("../resources/ru/index.js");
const index_js_5 = require("../resources/zh-CN/index.js");
const index_js_6 = require("../resources/de/index.js");
const locales_js_1 = require("./locales.js");
/**
 * Bundled resources keyed by locale code. The values are namespace →
 * translation-table maps ready for `i18next.init({ resources })`.
 */
exports.bundledResources = {
    en: index_js_1.en,
    fr: index_js_2.fr,
    ar: index_js_3.ar,
    ru: index_js_4.ru,
    'zh-CN': index_js_5.zhCN,
    de: index_js_6.de,
};
/**
 * The full ordered list of namespaces shipped by this package (spec §16.4).
 * Stable across releases; re-exported so the web app can register every
 * namespace without maintaining a parallel list.
 */
exports.NAMESPACES = [
    'common',
    'auth',
    'documents',
    'metadata',
    'workflow',
    'sharing',
    'audit',
    'admin',
    'security',
    'errors',
    'notifications',
    'emails',
    'retention',
    'classification',
    'digitization',
    'provenance',
    'license',
    'billing',
    'marketing',
    'settings',
    'scanner',
    'locales',
    'tour.common',
    'tour.welcome',
    'tour.documents',
    'tour.search',
    'tour.workflows',
    'tour.audit',
    'tour.admin',
    'tour.license',
    'tour.scanner',
    'tour.collaboration',
    'tour.aiAssistant',
    'tour.checklist',
    'tour.marketing',
    'ai.common',
    'ai.bubble',
    'ai.errors',
    'ai.actions',
    'ai.disclaimer',
    'ai.citations',
];
/**
 * Default i18next init options used by `createI18n`. Callers may override
 * any field by passing a partial options object.
 */
exports.DEFAULT_I18N_OPTIONS = {
    fallbackLng: 'en',
    supportedLngs: locales_js_1.LOCALES.map((l) => l.code),
    ns: exports.NAMESPACES,
    defaultNS: 'common',
    fallbackNS: 'common',
    resources: exports.bundledResources,
    interpolation: {
        // i18next already escapes by default; we keep that on for safety.
        escapeValue: false,
        // React handles its own escaping; the backend / marketing site may
        // post-process as needed. Keep raw interpolated values.
        formatSeparator: ',',
    },
    returnEmptyString: false,
    returnNull: false,
    react: {
        // Default for react-i18next; ignored by non-React consumers.
        useSuspense: false,
    },
    // Backend / non-DOM consumers do not have `localStorage` — let the caller
    // wire persistence (e.g. Electron `safeStorage`, server-side session).
    saveMissing: false,
};
/**
 * Create a fresh i18next instance pre-loaded with the bundled resources.
 *
 * This factory returns a *new* i18next instance on each call — it does not
 * mutate the global default instance. Callers that want a singleton should
 * cache the returned instance themselves (the web app caches one per
 * tenant; the email templating service creates one per render).
 */
function createI18n(options = {}) {
    const instance = i18next_1.default.createInstance();
    const initOptions = {
        ...exports.DEFAULT_I18N_OPTIONS,
        lng: options.locale ?? 'en',
        defaultNS: options.namespace ?? 'common',
        ...options.overrides,
    };
    instance.init(initOptions, (err) => {
        if (options.onInit)
            options.onInit(err, instance);
    });
    return instance;
}
//# sourceMappingURL=create-i18n.js.map