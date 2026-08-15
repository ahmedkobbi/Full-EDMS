# ADR-0004: Use Ed25519 (EdDSA) asymmetric signing for license artifacts

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §5 (No "Uncrackable" Claims), §12.4 (License Signing), §12.5 (.sedmslic format)

## Context

Smart EDMS requires a licensing system that is:
- Tamper-resistant (cannot be forged without the private key)
- Offline-capable (verification without internet access)
- Auditable (every license issuance + verification logged)
- Fail-closed (invalid signature → blocked, not warned)

The signing algorithm must:
- Use asymmetric cryptography (private key signs, public key verifies)
- Support key rotation (multiple keys identified by `kid`)
- Be available in Node.js `crypto` module (no external crypto libraries)
- Have strong security (128-bit equivalent or better)

## Decision

Use **Ed25519 (EdDSA)** as the primary signing algorithm for license artifacts (`.sedmslic`, `.sedmscrl`).

Support **ECDSA P-256 (ES256)** as an alternative for environments that prefer NIST curves.

### Implementation

- Private signing key: generated via `crypto.generateKeyPairSync('ed25519')`
- Key ID (`kid`): SHA-256 of public key SPKI DER, first 16 hex chars
- Signature: `crypto.sign(null, data, privateKey)` (Ed25519 does its own hashing)
- Verification: `crypto.verify(null, data, publicKey, signature)`
- Private key NEVER leaves the licensing server
- Public key embedded in the on-premise backend via `LICENSE_PUBLIC_KEY_PATH` env var

### Why Ed25519 over ECDSA P-256

| Aspect | Ed25519 (EdDSA) | ECDSA P-256 (ES256) |
|--------|-----------------|---------------------|
| Security | 128-bit | 128-bit |
| Signature size | 64 bytes | ~70 bytes (DER) |
| Signing speed | Faster | Slower |
| Verification speed | Faster | Slower |
| Side-channel resistance | Better (deterministic) | Worse (requires randomness) |
| Standardization | RFC 8032 | FIPS 186-4 |
| Industry adoption | Growing (JWT, SSH, age) | Widespread (JWT, TLS) |

Ed25519 is preferred for its deterministic signatures (no randomness → no side-channel leakage) and performance. ES256 is supported as a fallback for environments that mandate NIST curves.

## Consequences

### Positive

- Tamper-evident license artifacts (any modification breaks the signature)
- Offline verification (public key embedded in backend, no internet needed)
- Key rotation supported (multiple `kid`s, old keys can sign a final CRL)
- Fast signing + verification (important for high-volume license issuance)
- No external crypto libraries (Node.js `crypto` only)
- Deterministic signatures (no randomness-related vulnerabilities)

### Negative

- Ed25519 is less widely supported than ECDSA in some legacy systems (mitigated by ES256 fallback)
- Key management still requires operational discipline (private key must be protected)
- On-premise software cannot be made perfectly immune to tampering (accepted — spec §5)

### Neutral

- License artifacts are JSON (not binary) for human inspection before signature verification

## Alternatives Considered

### HMAC (symmetric)

- **Pros**: Simpler; faster; single key
- **Cons**: Same key signs AND verifies → private key must be in the on-premise backend → anyone with backend access can forge licenses
- **Rejected because**: Violates §12.4 ("Private signing key must remain only in the Licensing Server or KMS/HSM"). Symmetric signing is not tamper-resistant when the verifier has the signing key.

### RSA-2048

- **Pros**: Widely supported; well-understood
- **Cons**: Large signatures (256 bytes); slower than Ed25519; larger keys; deprecated in many contexts
- **Rejected because**: Ed25519 is strictly better for new systems (smaller, faster, more secure per bit).

### JWT with embedded signature

- **Pros**: Standard format; library support
- **Cons**: JWT is designed for short-lived tokens, not offline licenses; format overhead; less control over canonicalization
- **Rejected because**: The `.sedmslic` format needs explicit canonicalization (RFC 8785-like) for deterministic signing. JWT's canonicalization is less strict.
