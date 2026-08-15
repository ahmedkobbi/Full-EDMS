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

// Common primitives & helpers (spec §14, §15.4)
export * from './common';

// Multi-tenancy (spec §9.2, §15.3)
export * from './tenant';

// Identity & access management (spec §9.1, §15.1)
export * from './user';

// Document management (spec §9.3, §9.5, §9.6)
export * from './document';

// Classification (spec §9.4)
export * from './classification';

// Workflows (spec §9.8)
export * from './workflow';

// Retention & legal hold (spec §9.7)
export * from './retention';

// Audit (spec §9.12)
export * from './audit';

// Sharing (spec §9.11)
export * from './share';

// Search (spec §9.10)
export * from './search';

// Notifications (spec §9.13)
export * from './notification';

// Licensing (spec §12, §15.2)
export * from './license';

// Guided tour (spec §10, §10.11)
export * from './tour';

// AI Assistant (spec §11, §11.17)
export * from './ai';

// Scanner & digitization (spec §9.16)
export * from './scanner';

// WebSocket real-time (spec §13, §13.4)
export * from './websocket';

// REST API envelope (spec §14)
export * from './api';

// Branding & theme (spec §9.2, §16.6, §17)
export * from './branding';

// Provenance, C2PA, evidence (spec §9.12)
export * from './provenance';

// Internationalisation (spec §16)
export * from './i18n';
