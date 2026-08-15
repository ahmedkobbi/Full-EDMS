"use strict";
/**
 * @smart-edms/license-core — `.sedmscrl` certificate revocation list (spec §4.3, §12.4)
 *
 * Purpose: build, sign, and verify the Smart EDMS Certificate Revocation
 * List. The CRL is a small JSON document listing license IDs and device
 * fingerprints that have been revoked by the licensing server; the
 * on-premise backend fetches it when online and consults it during every
 * license signature verification.
 *
 * Format (spec §4.3 / §12.4):
 *   {
 *     "v": 1,
 *     "type": "sedms.crl",
 *     "kid": "<16 hex chars>",
 *     "generatedAt": "<iso-8601>",
 *     "revokedLicenseIds": ["<uuid>", ...],
 *     "revokedFingerprints": ["<sha256-hex>", ...],
 *     "nextExpectedAt": "<iso-8601>",
 *     "sig": "<base64 signature over canonicalizeJson({
 *       v, type, kid, generatedAt, revokedLicenseIds, revokedFingerprints, nextExpectedAt
 *     })>"
 *   }
 *
 * Critical rules (spec §12.4):
 *  - The signature covers EVERYTHING in the CRL EXCEPT the `sig` field
 *    itself. (Signing over your own signature is impossible.)
 *  - Verification fails closed — a missing or invalid signature means
 *    the CRL is treated as untrusted, and the verifier MUST fall back
 *    to the last known-good CRL (or refuse to validate licenses at all).
 *  - The `kid` is the same key ID embedded in license artifacts signed
 *    by the same key. A single key may sign both licenses and CRLs;
 *    alternatively, a dedicated CRL-signing sub-key may be used (the
 *    verifier just needs to know the mapping).
 *  - The CRL does not store `alg` (it is implied by `kid`). The verifier
 *    detects the algorithm from the public key it holds for that `kid`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVOCATION_LIST_VERSION = void 0;
exports.buildRevocationList = buildRevocationList;
exports.verifyRevocationList = verifyRevocationList;
exports.isRevoked = isRevoked;
exports.isFingerprintRevoked = isFingerprintRevoked;
const node_crypto_1 = require("node:crypto");
const sign_js_1 = require("./sign.js");
/** Revocation list file schema version (spec §4.3 / §12.4). */
exports.REVOCATION_LIST_VERSION = 1;
/**
 * Build a signed `.sedmscrl` revocation list.
 *
 * The signature covers the canonicalized JSON of the unsigned envelope
 * (everything except the `sig` field).
 *
 * @param input - the revocation list fields (license IDs, fingerprints,
 *   timestamps).
 * @param privateKeyPem - PKCS#8 PEM-encoded private key (server-only).
 * @param kid - key ID derived from the public key.
 * @param alg - signing algorithm; must match the key type.
 * @returns the signed `RevocationList`.
 */
function buildRevocationList(input, privateKeyPem, kid, alg) {
    if (typeof kid !== 'string' || kid.length === 0) {
        throw new Error('buildRevocationList: kid must be a non-empty string');
    }
    if (!input || typeof input !== 'object') {
        throw new Error('buildRevocationList: input is required');
    }
    // Deduplicate and sort for deterministic output. Sorting is critical
    // because the verifier re-canonicalises the envelope: if the two
    // orderings differ, the signature will not match.
    const revokedLicenseIds = Array.from(new Set(input.revokedLicenseIds)).sort();
    const revokedFingerprints = Array.from(new Set(input.revokedFingerprints)).sort();
    const unsigned = {
        v: exports.REVOCATION_LIST_VERSION,
        type: 'sedms.crl',
        kid,
        generatedAt: input.generatedAt,
        revokedLicenseIds,
        revokedFingerprints,
        nextExpectedAt: input.nextExpectedAt,
    };
    const sig = (0, sign_js_1.signPayload)(unsigned, privateKeyPem, alg);
    return { ...unsigned, sig };
}
/**
 * Verify a `.sedmscrl` revocation list against a public key.
 *
 * Re-canonicalises the unsigned envelope (everything except `sig`) and
 * checks the signature. Fail-closed: any error returns `false`.
 *
 * @param crl - the parsed revocation list.
 * @param publicKeyPem - SPKI PEM-encoded public key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
function verifyRevocationList(crl, publicKeyPem) {
    try {
        if (crl == null || typeof crl !== 'object')
            return false;
        if (crl.v !== exports.REVOCATION_LIST_VERSION)
            return false;
        if (crl.type !== 'sedms.crl')
            return false;
        if (typeof crl.kid !== 'string' || crl.kid.length === 0)
            return false;
        if (typeof crl.sig !== 'string' || crl.sig.length === 0)
            return false;
        let alg;
        try {
            // The CRL does not store `alg`; we detect it from the public key.
            alg = detectAlgFromPublicKey(publicKeyPem);
        }
        catch {
            return false;
        }
        // Reconstruct the unsigned envelope in the EXACT same shape as in
        // buildRevocationList. The signature covers this object only.
        const unsigned = {
            v: crl.v,
            type: crl.type,
            kid: crl.kid,
            generatedAt: crl.generatedAt,
            revokedLicenseIds: [...crl.revokedLicenseIds].sort(),
            revokedFingerprints: [...crl.revokedFingerprints].sort(),
            nextExpectedAt: crl.nextExpectedAt,
        };
        return (0, sign_js_1.verifySignature)(unsigned, crl.sig, publicKeyPem, alg);
    }
    catch {
        return false;
    }
}
/**
 * Check whether a license ID appears in the revocation list.
 *
 * Does NOT verify the CRL's signature — callers must run
 * `verifyRevocationList()` once after fetching the CRL, then may use
 * `isRevoked()` for cheap membership checks during license verification.
 *
 * @param crl - the revocation list (assumed already verified).
 * @param licenseId - the license ID to check.
 * @returns `true` if the license ID is listed as revoked.
 */
function isRevoked(crl, licenseId) {
    if (!crl || !Array.isArray(crl.revokedLicenseIds))
        return false;
    return crl.revokedLicenseIds.includes(licenseId);
}
/**
 * Check whether a device fingerprint appears in the revocation list.
 */
function isFingerprintRevoked(crl, fingerprintHash) {
    if (!crl || !Array.isArray(crl.revokedFingerprints))
        return false;
    return crl.revokedFingerprints.includes(fingerprintHash);
}
// ---------------------------------------------------------------------------
// Internal: detect SigningAlg from a PEM public key
// ---------------------------------------------------------------------------
function detectAlgFromPublicKey(publicKeyPem) {
    const pub = (0, node_crypto_1.createPublicKey)({ key: Buffer.from(publicKeyPem, 'utf8'), format: 'pem' });
    const kty = pub.asymmetricKeyType;
    if (kty === 'ed25519')
        return 'EdDSA';
    if (kty === 'ec') {
        const details = pub.asymmetricKeyDetails;
        if (details?.namedCurve === 'prime256v1' || details?.namedCurve === 'secp256r1') {
            return 'ES256';
        }
        throw new Error(`detectAlgFromPublicKey: unsupported EC curve '${details?.namedCurve}'`);
    }
    throw new Error(`detectAlgFromPublicKey: unsupported key type '${kty ?? 'unknown'}'`);
}
//# sourceMappingURL=revocation-list.js.map