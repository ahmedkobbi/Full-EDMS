"use strict";
/**
 * @smart-edms/types — provenance, C2PA, evidence (spec §9.12)
 *
 * Purpose: model provenance manifests, C2PA Content Credentials, evidence
 * packages, chain-of-custody entries, and forgery-detection results.
 *
 * Critical rules (spec §9.12):
 *  - Audit storage is append-only; hash chaining or equivalent tamper-
 *    evidence is mandatory.
 *  - C2PA manifests are verified on ingest where enabled.
 *  - The Deepfake and Forgery Detection Pipeline flags AI-generated PDFs,
 *    manipulated images, and spoofed digital signatures.
 *  - Chain-of-custody anchoring is enabled for critical documents.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=provenance.js.map