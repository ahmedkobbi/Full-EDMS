"use strict";
/**
 * @smart-edms/types — common primitives
 *
 * Purpose: foundational branded identifiers, locale enum, error contract,
 * pagination, and result types shared across every Smart EDMS domain.
 *
 * Conventions enforced here (and across the package):
 * - No `any`. Untrusted input uses `unknown` plus a type guard.
 * - All timestamps are ISO 8601 UTC strings (`ISODateString`).
 * - All IDs are branded nominal types so that a `UserId` cannot be
 *   accidentally passed where a `DocumentId` is expected.
 * - Enums are string literal unions (no runtime `enum` keyword).
 * - JSDoc describes the purpose and constraints of each exported symbol.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertBranded = assertBranded;
exports.isISODateString = isISODateString;
/**
 * Type guard: narrows `unknown` to a `string` branded with the given brand.
 * The caller is responsible for validating the underlying value (UUID shape,
 * ISO date, etc.) before calling this.
 */
function assertBranded(value, brand) {
    if (typeof value !== 'string') {
        throw new TypeError(`Expected branded string "${brand}", got ${typeof value}`);
    }
}
/**
 * Type guard for `ISODateString`. Performs a structural check on the string
 * shape; full UTC validation must be performed at the parser boundary.
 */
function isISODateString(value) {
    if (typeof value !== 'string')
        return false;
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value);
}
//# sourceMappingURL=common.js.map