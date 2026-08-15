"use strict";
/**
 * @smart-edms/license-core — signing key generation (spec §12.4)
 *
 * Purpose: generate asymmetric signing key pairs for license artifacts,
 * derive a stable key ID (`kid`) from the public key, and serialise the
 * pair to PEM.
 *
 * Algorithms (spec §12.4 / §12.5):
 *  - `'EdDSA'`    → Ed25519 (recommended; 128-bit security, ~64-byte sigs).
 *  - `'ES256'`    → ECDSA with the P-256 curve and SHA-256 (NIST-friendly,
 *                   128-bit security, ~64-byte sigs, deterministic per
 *                   RFC 6979 when supported).
 *
 * Critical rules (spec §12.4):
 *  - The private key NEVER leaves the licensing server / KMS / HSM. The
 *    `SigningKeyPair.privateKeyPem` field is provided for use ONLY inside
 *    the licensing server process; it MUST NOT be persisted to disk in a
 *    client-readable location, returned by any API, embedded in an
 *    Electron bundle, or shipped in a Docker image.
 *  - The public key is embedded in the on-premise backend and Electron
 *    client. Verification MUST use only the public key.
 *  - The `kid` is derived deterministically from the public key so that
 *    a client can pick the correct embedded public key for a given
 *    artifact without maintaining an external key directory.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSigningKeyPair = generateSigningKeyPair;
exports.deriveKeyId = deriveKeyId;
exports.algToSpecAlg = algToSpecAlg;
exports.specAlgToAlg = specAlgToAlg;
const node_crypto_1 = require("node:crypto");
/**
 * Generate a new signing key pair.
 *
 * @param alg - `'EdDSA'` (default) or `'ES256'`.
 * @returns the key pair plus the derived `kid`.
 */
function generateSigningKeyPair(alg = 'EdDSA') {
    const { publicKey, privateKey } = generateKeyPairForAlg(alg);
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString('utf8');
    const privateKeyPem = privateKey
        .export({ type: 'pkcs8', format: 'pem' })
        .toString('utf8');
    const kid = deriveKeyId(publicKeyPem);
    return { kid, alg, publicKeyPem, privateKeyPem };
}
/**
 * Derive a stable key ID from a public key PEM.
 *
 * The `kid` is the first 16 hex characters of `SHA-256(SPKI-DER(publicKey))`.
 * This is sufficient collision resistance for license-key directories
 * (2^64 collision space) and short enough to embed in a license artifact
 * without bloating it.
 *
 * @param publicKeyPem - SPKI PEM-encoded public key.
 * @returns a 16-character lowercase-hex string.
 */
function deriveKeyId(publicKeyPem) {
    const pubKeyObj = (0, node_crypto_1.createPublicKey)({
        key: Buffer.from(publicKeyPem, 'utf8'),
        format: 'pem',
    });
    const spkiDer = pubKeyObj.export({ type: 'spki', format: 'der' });
    const hash = (0, node_crypto_1.createHash)('sha256').update(spkiDer).digest('hex');
    return hash.slice(0, 16);
}
/**
 * Map a JOSE-style `alg` to the spec's `LicenseSigningAlgorithm` enum
 * used inside `LicenseArtifact.alg` and `RevocationList.alg`.
 *
 * - `'EdDSA'` → `'ed25519'`
 * - `'ES256'` → `'ecdsa-p256-sha256'`
 */
function algToSpecAlg(alg) {
    switch (alg) {
        case 'EdDSA':
            return 'ed25519';
        case 'ES256':
            return 'ecdsa-p256-sha256';
        default: {
            // Exhaustive guard — if a future alg is added without updating
            // this switch, TypeScript will fail to compile.
            const _exhaustive = alg;
            throw new Error(`Unsupported signing alg: ${String(_exhaustive)}`);
        }
    }
}
/**
 * Inverse of {@link algToSpecAlg}. Maps the spec's
 * `LicenseSigningAlgorithm` enum back to a JOSE-style alg.
 *
 * `'rsa-pss-sha256'` is not supported by this package (the licensing
 * server may add it later — until then, calling this with that value
 * throws).
 */
function specAlgToAlg(specAlg) {
    switch (specAlg) {
        case 'ed25519':
            return 'EdDSA';
        case 'ecdsa-p256-sha256':
            return 'ES256';
        case 'rsa-pss-sha256':
            throw new Error("RSA-PSS ('rsa-pss-sha256') is not supported by license-core; use EdDSA or ES256");
        default: {
            const _exhaustive = specAlg;
            throw new Error(`Unsupported spec alg: ${String(_exhaustive)}`);
        }
    }
}
// ---------------------------------------------------------------------------
// Internal: Node.js crypto key generation
// ---------------------------------------------------------------------------
function generateKeyPairForAlg(alg) {
    if (alg === 'EdDSA') {
        // Ed25519 keys are tiny and fast; no parameters required.
        const { publicKey, privateKey } = (0, node_crypto_1.generateKeyPairSync)('ed25519');
        return { publicKey, privateKey };
    }
    if (alg === 'ES256') {
        // P-256 / prime256v1 / secp256r1. ECDSA with SHA-256.
        const { publicKey, privateKey } = (0, node_crypto_1.generateKeyPairSync)('ec', {
            namedCurve: 'prime256v1',
        });
        return { publicKey, privateKey };
    }
    const _exhaustive = alg;
    throw new Error(`Unsupported signing alg: ${String(_exhaustive)}`);
}
//# sourceMappingURL=keys.js.map