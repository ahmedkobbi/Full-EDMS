"use strict";
/**
 * @smart-edms/i18n — package entry point
 *
 * Exports:
 * - Locale metadata and helpers (spec §16.1, §16.6, §4.5)
 * - Intl-based formatters (spec §16.7, §16.8)
 * - ICU plural helpers (spec §16.8)
 * - i18next factory with bundled resources (spec §16.3)
 * - Bundled resources themselves (for non-i18next consumers)
 *
 * React-independent — no `react-i18next` dependency here. Web apps compose
 * `createI18n()` with `react-i18next`'s `initReactI18next` plugin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.de = exports.zhCN = exports.ru = exports.ar = exports.fr = exports.en = exports.DEFAULT_I18N_OPTIONS = exports.NAMESPACES = exports.bundledResources = exports.createI18n = exports.buildCountMessage = exports.pluralCategoriesFor = exports.pickPlural = exports.formatPlural = exports.formatMessage = exports.createCollator = exports.pluralCategory = exports.formatList = exports.formatFileSize = exports.formatPercent = exports.formatCurrency = exports.formatNumber = exports.formatRelativeTime = exports.formatTime = exports.formatDateTime = exports.formatDate = exports.toIntlLocale = exports.defaultFlagIndicator = exports.isRtl = exports.getLocaleMeta = exports.INTL_LOCALE = exports.LOCALES = void 0;
var locales_js_1 = require("./locales.js");
Object.defineProperty(exports, "LOCALES", { enumerable: true, get: function () { return locales_js_1.LOCALES; } });
Object.defineProperty(exports, "INTL_LOCALE", { enumerable: true, get: function () { return locales_js_1.INTL_LOCALE; } });
Object.defineProperty(exports, "getLocaleMeta", { enumerable: true, get: function () { return locales_js_1.getLocaleMeta; } });
Object.defineProperty(exports, "isRtl", { enumerable: true, get: function () { return locales_js_1.isRtl; } });
Object.defineProperty(exports, "defaultFlagIndicator", { enumerable: true, get: function () { return locales_js_1.defaultFlagIndicator; } });
var format_js_1 = require("./format.js");
Object.defineProperty(exports, "toIntlLocale", { enumerable: true, get: function () { return format_js_1.toIntlLocale; } });
Object.defineProperty(exports, "formatDate", { enumerable: true, get: function () { return format_js_1.formatDate; } });
Object.defineProperty(exports, "formatDateTime", { enumerable: true, get: function () { return format_js_1.formatDateTime; } });
Object.defineProperty(exports, "formatTime", { enumerable: true, get: function () { return format_js_1.formatTime; } });
Object.defineProperty(exports, "formatRelativeTime", { enumerable: true, get: function () { return format_js_1.formatRelativeTime; } });
Object.defineProperty(exports, "formatNumber", { enumerable: true, get: function () { return format_js_1.formatNumber; } });
Object.defineProperty(exports, "formatCurrency", { enumerable: true, get: function () { return format_js_1.formatCurrency; } });
Object.defineProperty(exports, "formatPercent", { enumerable: true, get: function () { return format_js_1.formatPercent; } });
Object.defineProperty(exports, "formatFileSize", { enumerable: true, get: function () { return format_js_1.formatFileSize; } });
Object.defineProperty(exports, "formatList", { enumerable: true, get: function () { return format_js_1.formatList; } });
Object.defineProperty(exports, "pluralCategory", { enumerable: true, get: function () { return format_js_1.pluralCategory; } });
Object.defineProperty(exports, "createCollator", { enumerable: true, get: function () { return format_js_1.createCollator; } });
var plural_js_1 = require("./plural.js");
Object.defineProperty(exports, "formatMessage", { enumerable: true, get: function () { return plural_js_1.formatMessage; } });
Object.defineProperty(exports, "formatPlural", { enumerable: true, get: function () { return plural_js_1.formatPlural; } });
Object.defineProperty(exports, "pickPlural", { enumerable: true, get: function () { return plural_js_1.pickPlural; } });
Object.defineProperty(exports, "pluralCategoriesFor", { enumerable: true, get: function () { return plural_js_1.pluralCategoriesFor; } });
Object.defineProperty(exports, "buildCountMessage", { enumerable: true, get: function () { return plural_js_1.buildCountMessage; } });
var create_i18n_js_1 = require("./create-i18n.js");
Object.defineProperty(exports, "createI18n", { enumerable: true, get: function () { return create_i18n_js_1.createI18n; } });
Object.defineProperty(exports, "bundledResources", { enumerable: true, get: function () { return create_i18n_js_1.bundledResources; } });
Object.defineProperty(exports, "NAMESPACES", { enumerable: true, get: function () { return create_i18n_js_1.NAMESPACES; } });
Object.defineProperty(exports, "DEFAULT_I18N_OPTIONS", { enumerable: true, get: function () { return create_i18n_js_1.DEFAULT_I18N_OPTIONS; } });
// Bundled resources — re-exported so consumers can use them without i18next
// (e.g. backend email templating pulls a single key directly).
var index_js_1 = require("../resources/en/index.js");
Object.defineProperty(exports, "en", { enumerable: true, get: function () { return index_js_1.en; } });
var index_js_2 = require("../resources/fr/index.js");
Object.defineProperty(exports, "fr", { enumerable: true, get: function () { return index_js_2.fr; } });
var index_js_3 = require("../resources/ar/index.js");
Object.defineProperty(exports, "ar", { enumerable: true, get: function () { return index_js_3.ar; } });
var index_js_4 = require("../resources/ru/index.js");
Object.defineProperty(exports, "ru", { enumerable: true, get: function () { return index_js_4.ru; } });
var index_js_5 = require("../resources/zh-CN/index.js");
Object.defineProperty(exports, "zhCN", { enumerable: true, get: function () { return index_js_5.zhCN; } });
var index_js_6 = require("../resources/de/index.js");
Object.defineProperty(exports, "de", { enumerable: true, get: function () { return index_js_6.de; } });
//# sourceMappingURL=index.js.map