# ADR-0012: Use i18next with bundled resources (not HTTP backend)

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §16.2 (i18n Libraries), §16.5 (Locale Resources)

## Context

Smart EDMS needs i18n for 6 locales × 41 namespaces. Two loading strategies: HTTP backend (fetch JSON on demand) or bundled resources (ship all translations in the JS bundle).

## Decision

Use **i18next with bundled resources** (TypeScript files, not JSON, for tree-shaking).

## Consequences

### Positive

- No HTTP latency for translations (instant UI)
- Works offline (critical for Electron desktop app)
- TypeScript type-checking on translation keys
- Tree-shaking (unused namespaces are dead-code-eliminated)
- No CORS issues
- Simpler deployment (no translation CDN)

### Negative

- Larger initial bundle (~1MB for all 6 locales × 41 namespaces — acceptable)
- Translation updates require app re-deployment (mitigated by tenant override via `LocaleResource` table)
- All locales loaded even if user only uses one (mitigated by locale-specific chunks in Vite)

## Alternatives Considered

- **HTTP backend (`i18next-http-backend`)**: lazy-loads JSON; smaller initial bundle; but adds latency + requires CDN + breaks offline
- **ICU MessageFormat only (no i18next)**: lower-level; would need to build our own key lookup
- **FormatJS (react-intl)**: good but less ecosystem than i18next; different API

## Spec Reference

§16.2 lists "i18next, react-i18next, i18next-browser-languagedetector, i18next-http-backend or bundled locale resources where appropriate." We chose bundled for offline + performance.
