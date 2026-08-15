# Smart EDMS — Security Policy

> This document describes how to report security vulnerabilities for Smart EDMS.
> For the security model and controls, see [docs/SECURITY.md](docs/SECURITY.md).

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅         |
| < 1.0   | ❌         |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in Smart EDMS:

1. **Email**: **security@smart-edms.example**
2. **Subject**: `[SECURITY] <brief description>`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce (proof of concept if possible)
   - Affected versions
   - Potential impact
   - Suggested fix (if any)
   - Your name/handle for credit (optional)

### Response Timeline

| Step | Target |
|------|--------|
| Acknowledgment of receipt | 48 hours |
| Initial assessment | 7 days |
| Fix timeline communication | 14 days |
| Fix release (severity-dependent) | 30-90 days |

### What to Expect

- We will acknowledge your report within 48 hours.
- We will investigate and verify the vulnerability.
- We will work with you to understand the impact and develop a fix.
- We will credit you in the security advisory (unless you prefer to remain anonymous).
- We will coordinate disclosure timing with you.

### What We Ask

- **Do not publicly disclose** the vulnerability until a fix is released.
- **Do not access or modify** data that does not belong to you.
- **Do not degrade** service availability (no DoS testing on production systems).
- **Do provide** sufficient detail for us to reproduce and fix the issue.

## Scope

### In Scope

- Smart EDMS backend (`apps/backend`)
- Smart EDMS Electron client (`apps/electron`)
- Smart EDMS Licensing Server (`apps/license-server`)
- Smart EDMS License Admin Panel (`apps/license-admin`)
- Smart EDMS Marketing Page (`apps/marketing`)
- Shared packages (`packages/*`)

### Out of Scope

- Third-party dependencies (report to the respective maintainer)
- Self-hosted infrastructure misconfiguration (e.g., exposed database ports)
- Social engineering attacks
- Physical security attacks
- Denial of service attacks on production systems
- Vulnerabilities requiring physical access to a user's device

## Security Measures

Smart EDMS implements defense-in-depth security. See:

- [Security Model](docs/SECURITY.md) — full security architecture
- [Threat Model](docs/THREAT_MODEL.md) — STRIDE analysis
- [Security Controls Matrix](docs/SECURITY_CONTROLS.md) — 59 controls mapped to threats
- [Architecture Decision Records](docs/adr/) — security-related design decisions

## Bug Bounty

We do not currently operate a formal bug bounty program. However, we sincerely
appreciate responsible disclosure and will acknowledge contributors in our
security advisories.

## Contact

- **Security email**: security@smart-edms.example
- **PGP key**: (coming soon — will be published at https://smart-edms.example/.well-known/security.txt)
- **General support**: see [SUPPORT.md](SUPPORT.md)
