# Smart EDMS — Support

## Getting Help

### Documentation

Before reaching out for support, please check the following documentation:

- **[README](README.md)** — Project overview, quick start, structure
- **[Architecture](docs/ARCHITECTURE.md)** — System design, component responsibilities
- **[Deployment Guide](docs/DEPLOYMENT.md)** — Production deployment, backup, monitoring
- **[Operations Runbook](docs/OPERATIONS_RUNBOOK.md)** — Day-to-day operations, incident response
- **[API Specification](docs/API_SPECIFICATION.md)** — REST endpoint reference
- **[Security](docs/SECURITY.md)** — Security model, controls
- **[Contributing Guide](CONTRIBUTING.md)** — How to contribute, coding standards

### Reporting Issues

If you find a bug or have a feature request:

1. **Search existing issues** at [https://github.com/ahmedkobbi/Full-EDMS/issues](https://github.com/ahmedkobbi/Full-EDMS/issues) to avoid duplicates
2. **Open a new issue** with:
   - Clear title describing the problem
   - Smart EDMS version (from `package.json`)
   - Node.js + pnpm versions
   - Operating system
   - Steps to reproduce
   - Expected vs. actual behavior
   - Relevant logs (redact secrets)

### Security Vulnerabilities

**Do NOT open a public GitHub issue for security vulnerabilities.**

See [SECURITY.md](SECURITY.md) for the vulnerability reporting process.

### Community

- **GitHub Discussions** — Q&A and general discussion (coming soon)
- **GitHub Issues** — Bug reports and feature requests

## Commercial Support

For enterprise customers with a commercial license:

- **Email**: support@smart-edms.example
- **Response time**: per your support level (standard / priority / enterprise)
- **Support portal**: https://support.smart-edms.example (coming soon)

## Self-Service Troubleshooting

Common issues and solutions are documented in the [Operations Runbook → Troubleshooting](docs/OPERATIONS_RUNBOOK.md#10-troubleshooting) section:

- Cannot connect to PostgreSQL
- Redis connection refused
- License state is invalid
- WebSocket connections failing
- Upload fails with 413
- AI Assistant not responding
- Audit hash chain verification fails

## Feature Requests

We welcome feature requests! Please:

1. Check the [spec compliance](README.md#spec-compliance) section to see if the feature is already planned
2. Open a GitHub Issue with the `feature-request` label
3. Describe the use case, not just the solution
4. Be patient — we prioritize based on customer demand and engineering capacity
