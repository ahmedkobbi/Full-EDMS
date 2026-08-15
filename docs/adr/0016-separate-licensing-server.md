# ADR-0016: Keep licensing server as a separate NestJS app

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §4.2 (Licensing Server Model), §7.3 (Licensing Server stack), §12.4 (License Signing)

## Context

Smart EDMS has two distinct server-side concerns:

1. **On-premise backend**: runs in the customer's data center; handles documents, workflows, audit, AI, etc.
2. **Licensing server**: runs in the vendor's cloud; issues + signs licenses, processes activations, receives heartbeats

These could be combined into one app or kept separate.

## Decision

Keep the **licensing server as a separate NestJS app** (`apps/license-server`), with its own:
- Database (`smart_edms_license`, separate from on-premise `smart_edms`)
- Redis instance (or shared Redis with separate key prefixes)
- Signing key (private key NEVER on the on-premise backend)
- Admin user directory (separate from tenant users)
- API surface (`/v1/auth/admin/*`, `/v1/activate/*`, `/v1/heartbeat`, `/v1/licenses`, etc.)

## Consequences

### Positive

- **Security isolation**: private signing key never touches the on-premise backend (even if compromised, the key is safe)
- **Independent scaling**: license server can scale based on customer count, not document volume
- **Independent deployment**: license server updates don't require customer downtime
- **Separate database**: license data (customers, plans, activations) is vendor-confidential; tenant data (documents, audit) is customer-confidential — mixing them is a compliance risk
- **Separate admin directory**: license admins are vendor employees; tenant admins are customer employees — different auth requirements (vendor MFA vs. tenant SSO)
- **Failure isolation**: if the license server is down, on-premise backends continue operating (using cached license state + grace periods)

### Negative

- More infrastructure (two apps instead of one)
- More deployment complexity (two CI/CD pipelines)
- Cross-app communication requires network calls (license server heartbeat endpoint)

## Alternatives Considered

### Combined app (license endpoints in the on-premise backend)

- **Pros**: simpler deployment; no cross-app calls
- **Cons**: private signing key on the on-premise backend (security risk); vendor-confidential data (customer list, pricing) on customer infrastructure; license server updates require customer downtime
- **Rejected because**: Violates §12.4 ("Private signing key must remain only in the Licensing Server or KMS/HSM. Do not embed private keys in the on-premise backend.")

### Microservices (split further into customer-service, product-service, license-service, etc.)

- **Pros**: maximum isolation
- **Cons**: over-engineered for the scale; distributed transactions; operational complexity
- **Rejected because**: The licensing server is small enough to be a single app.

## Spec Reference

§4.2: "Cloud/hosted licensing control plane." §7.3: separate stack listing for licensing server. §12.4: "Private signing key must remain only in the Licensing Server."
