"use strict";
/**
 * @smart-edms/license-core — heartbeat request/response signing (spec §12.9)
 *
 * Purpose: build signed heartbeat requests on the on-premise side and
 * verify signed heartbeat responses received from the licensing server.
 *
 * Wire format (spec §12.9):
 *
 *   Request (on-premise → licensing server):
 *     {
 *       licenseId, deploymentId, fingerprintHash, appVersion, timestamp,
 *       usageSummary: { activeUsers, storageUsedBytes, documentCount, aiCallsToday },
 *       signature?: "<base64 sig over canonicalizeJson(rest) by installation key>"
 *     }
 *
 *   Response (licensing server → on-premise):
 *     HeartbeatResponse + { sig: "<base64 sig over canonicalizeJson(response) by server key>" }
 *
 * Note: the `HeartbeatResponse` type in `@smart-edms/types` does not
 * include a `sig` field. This package extends it locally as
 * {@link SignedHeartbeatResponse} to carry the server's signature. The
 * licensing server's API layer is responsible for adding `sig` to the
 * response body before transmission; the on-premise backend uses
 * `verifyHeartbeatResponse()` to check it.
 *
 * Critical rules (spec §12.9):
 *  - The request signature is OPTIONAL. If present, the licensing server
 *    verifies it against the `installationPublicKey` registered for the
 *    activation; mismatches are logged but do not reject the heartbeat
 *    (the server may treat the heartbeat as unauthenticated, with
 *    reduced trust).
 *  - The response signature is REQUIRED for production deployments. An
 *    unsigned response is acceptable only in development (the
 *    `NODE_ENV=development` check is the licensing server's
 *    responsibility, not this package's).
 *  - Fail-closed: `verifyHeartbeatResponse()` returns `false` on any
 *    verification error.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHeartbeatRequest = buildHeartbeatRequest;
exports.verifyHeartbeatRequest = verifyHeartbeatRequest;
exports.buildHeartbeatResponse = buildHeartbeatResponse;
exports.verifyHeartbeatResponse = verifyHeartbeatResponse;
const sign_js_1 = require("./sign.js");
/**
 * Build a heartbeat request, optionally signing it with the installation
 * private key.
 *
 * @param input - the raw heartbeat fields.
 * @param installationPrivateKeyPem - PKCS#8 PEM-encoded installation
 *   private key. If provided, the request is signed and `signature` is
 *   populated. If `null`/`undefined`, the request is sent unsigned.
 * @param alg - signing algorithm for the installation key. Required
 *   only if `installationPrivateKeyPem` is provided.
 * @returns the `HeartbeatRequest` (with `signature` if signed).
 */
function buildHeartbeatRequest(input, installationPrivateKeyPem, alg) {
    if (!installationPrivateKeyPem) {
        return { ...input };
    }
    if (!alg) {
        throw new Error('buildHeartbeatRequest: alg is required when installationPrivateKeyPem is provided');
    }
    // The signature covers the canonicalised request body EXCLUDING the
    // `signature` field (which would be self-referential).
    const unsigned = { ...input };
    const signature = (0, sign_js_1.signPayload)(unsigned, installationPrivateKeyPem, alg);
    return { ...input, signature };
}
/**
 * Verify the `signature` field on a heartbeat request.
 *
 * Used by the licensing server to confirm that the heartbeat came from
 * a deployment holding the installation private key registered for the
 * activation.
 *
 * @param req - the heartbeat request (must have `signature` populated).
 * @param installationPublicKeyPem - SPKI PEM-encoded installation public key.
 * @param alg - signing algorithm matching the installation key.
 * @returns `true` if the signature is valid, `false` otherwise (or if
 *   `req.signature` is absent).
 */
function verifyHeartbeatRequest(req, installationPublicKeyPem, alg) {
    if (!req || typeof req.signature !== 'string' || req.signature.length === 0) {
        return false;
    }
    // Strip the signature field before re-canonicalising. We deliberately
    // copy to avoid mutating the input.
    const { signature: _sig, ...unsigned } = req;
    void _sig;
    return (0, sign_js_1.verifySignature)(unsigned, req.signature, installationPublicKeyPem, alg);
}
/**
 * Build a signed heartbeat response. Used by the licensing server.
 *
 * The signature covers the canonicalised response body EXCLUDING the
 * `sig` field.
 *
 * @param response - the unsigned `HeartbeatResponse`.
 * @param serverPrivateKeyPem - PKCS#8 PEM-encoded licensing-server key.
 * @param alg - signing algorithm matching the server key.
 * @returns the signed response (with `sig` populated).
 */
function buildHeartbeatResponse(response, serverPrivateKeyPem, alg) {
    // Strip `sig` if present (defensive — `HeartbeatResponse` doesn't
    // have it, but a caller might have already attached one).
    const { sig: _existingSig, ...unsigned } = response;
    void _existingSig;
    const sig = (0, sign_js_1.signPayload)(unsigned, serverPrivateKeyPem, alg);
    return { ...unsigned, sig };
}
/**
 * Verify a signed heartbeat response. Used by the on-premise backend.
 *
 * Fail-closed: any verification error returns `false`. Callers should
 * treat a `false` result as "the heartbeat response is untrusted;
 * ignore it and continue operating on the last known-good state".
 *
 * @param resp - the signed response (must have `sig` populated).
 * @param serverPublicKeyPem - SPKI PEM-encoded licensing-server public key.
 * @param alg - signing algorithm matching the server key.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
function verifyHeartbeatResponse(resp, serverPublicKeyPem, alg) {
    if (!resp || typeof resp.sig !== 'string' || resp.sig.length === 0) {
        return false;
    }
    const { sig: _sig, ...unsigned } = resp;
    void _sig;
    return (0, sign_js_1.verifySignature)(unsigned, resp.sig, serverPublicKeyPem, alg);
}
//# sourceMappingURL=heartbeat.js.map