"use strict";
/**
 * @smart-edms/types
 *
 * Comprehensive TypeScript type definitions for the Smart EDMS monorepo.
 *
 * Domains covered (spec sections in parentheses):
 *  - common primitives, branded IDs, errors, pagination  (§14, §15.4)
 *  - tenant & multi-tenancy configuration                (§9.2, §15.3)
 *  - users, roles, groups, sessions, MFA, device trust   (§9.1, §15.1)
 *  - documents, versions, metadata schemas               (§9.3, §9.5, §9.6)
 *  - classification and sensitivity labels               (§9.4)
 *  - workflows, approvals, BPMN/CMMN/DMN                 (§9.8)
 *  - retention, legal hold, disposition                  (§9.7)
 *  - audit, evidence, hash-chain receipts                (§9.12)
 *  - sharing and external collaboration                  (§9.11)
 *  - search, DLA, Flex Search                            (§9.10)
 *  - notifications and alerts                            (§9.13)
 *  - licensing system, signed artifacts                  (§12, §15.2)
 *  - guided tour engine (14 tour types, RTL-aware)       (§10, §10.11)
 *  - AI Assistant Bubble, permission-aware tools         (§11, §11.17)
 *  - scanner, OCR/OMR/ICR, digitization                  (§9.16)
 *  - WebSocket real-time events                          (§13, §13.4)
 *  - REST API envelope, pagination, health               (§14)
 *  - branding and theme tokens                           (§9.2, §16.6, §17)
 *  - provenance, C2PA, evidence, forgery detection       (§9.12)
 *  - i18n, locales, namespaces, ICU plurals              (§16)
 *
 * Conventions:
 *  - No `any`. Untrusted input is typed `unknown` and narrowed with guards.
 *  - All timestamps are ISO 8601 UTC strings (`ISODateString`).
 *  - All IDs are branded nominal types.
 *  - All enums are string literal unions (no runtime `enum` keyword).
 *  - JSDoc comments describe purpose and constraints.
 *
 * Re-exported surface is flat: `import { UserId, License, TourCode } from '@smart-edms/types'`.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Common primitives & helpers (spec §14, §15.4)
__exportStar(require("./common"), exports);
// Multi-tenancy (spec §9.2, §15.3)
__exportStar(require("./tenant"), exports);
// Identity & access management (spec §9.1, §15.1)
__exportStar(require("./user"), exports);
// Document management (spec §9.3, §9.5, §9.6)
__exportStar(require("./document"), exports);
// Classification (spec §9.4)
__exportStar(require("./classification"), exports);
// Workflows (spec §9.8)
__exportStar(require("./workflow"), exports);
// Retention & legal hold (spec §9.7)
__exportStar(require("./retention"), exports);
// Audit (spec §9.12)
__exportStar(require("./audit"), exports);
// Sharing (spec §9.11)
__exportStar(require("./share"), exports);
// Search (spec §9.10)
__exportStar(require("./search"), exports);
// Notifications (spec §9.13)
__exportStar(require("./notification"), exports);
// Licensing (spec §12, §15.2)
__exportStar(require("./license"), exports);
// Guided tour (spec §10, §10.11)
__exportStar(require("./tour"), exports);
// AI Assistant (spec §11, §11.17)
__exportStar(require("./ai"), exports);
// Scanner & digitization (spec §9.16)
__exportStar(require("./scanner"), exports);
// WebSocket real-time (spec §13, §13.4)
__exportStar(require("./websocket"), exports);
// REST API envelope (spec §14)
__exportStar(require("./api"), exports);
// Branding & theme (spec §9.2, §16.6, §17)
__exportStar(require("./branding"), exports);
// Provenance, C2PA, evidence (spec §9.12)
__exportStar(require("./provenance"), exports);
// Internationalisation (spec §16)
__exportStar(require("./i18n"), exports);
//# sourceMappingURL=index.js.map