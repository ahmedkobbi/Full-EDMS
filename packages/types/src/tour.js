"use strict";
/**
 * @smart-edms/types — guided tour system (spec §10, §10.11, §10.14)
 *
 * Purpose: model the 14 mandatory tour types, tour definitions, steps,
 * per-user state, progress, and analytics events. Tours are tenant-scoped,
 * role-based, license-aware, permission-aware, RTL-aware, and skippable.
 *
 * Hard rules:
 *  - Tour text is never stored as a primary contract; only message keys.
 *  - Tour completion state must be real (spec §10.16) — no fake completion.
 *  - Tour analytics are disableable and privacy-safe (spec §10.15).
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=tour.js.map