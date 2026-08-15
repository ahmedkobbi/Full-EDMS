"use strict";
/**
 * @smart-edms/ai-core — citation builder (spec §11.8, §11.10).
 *
 * Citations attached to an AI answer may ONLY reference resources the user
 * is authorised to access (spec §11.8). This module filters a list of
 * candidate documents to those the user can read, then projects each to a
 * narrow citation summary (spec §11.10 — data minimization: never leak the
 * full document record).
 *
 * Spec ref: §11.8 (citations), §11.10 (data minimization), §11.13 (data
 * residency — citations stay in the user's tenant).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCitations = buildCitations;
/**
 * Filter `documents` to those the user can access and project each to a
 * narrow `Citation` summary (spec §11.8, §11.10).
 *
 * Behaviour:
 *  - Documents with `userCanAccess === false` are DROPPED entirely. The
 *    caller never sees them in the returned array — this prevents the AI
 *    from leaking the existence of restricted documents (spec §11.10).
 *  - The output `Citation` carries only the fields needed for display:
 *    `documentId`, `versionId`, `title`, `classificationLabelId`,
 *    `updatedAt`, `workflowState`, `retentionState`, `legalHoldState`,
 *    `locator`, `confidence`.
 *  - `licensedModules` is accepted so the builder can drop citations whose
 *    document type requires an unlicensed module — but currently the
 *    caller is expected to set `userCanAccess=false` in that case. The
 *    parameter is reserved for future use.
 *
 * @param documents       — candidate documents retrieved by the AI tools.
 * @param userPermissions — the user's effective permission codes (for
 *                          future fine-grained filtering; currently
 *                          informational only).
 * @param licensedModules — the tenant's licensed modules (for future
 *                          module-gated filtering; currently informational).
 * @returns a readonly array of `Citation` objects, never containing a
 *          document the user cannot access.
 */
function buildCitations(documents, userPermissions = [], licensedModules = []) {
    // Reserved for future fine-grained access checks; currently the
    // caller-supplied `userCanAccess` flag is the authoritative gate.
    void userPermissions;
    void licensedModules;
    const out = [];
    for (const doc of documents) {
        if (!doc.userCanAccess)
            continue;
        out.push({
            documentId: doc.documentId,
            versionId: doc.versionId,
            title: doc.title,
            classificationLabelId: doc.classificationLabelId,
            updatedAt: doc.updatedAt,
            workflowState: doc.workflowState,
            retentionState: doc.retentionState,
            legalHoldState: doc.legalHoldState,
            locator: doc.locator,
            confidence: doc.confidence,
        });
    }
    // Freeze the output so callers can't accidentally mutate it.
    return Object.freeze(out);
}
//# sourceMappingURL=citations.js.map