# ADR-0014: Use neutral language indicator for Arabic (not a country flag)

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §4.5 (Arabic Flag Representation)

## Context

Smart EDMS supports Arabic (Modern Standard Arabic). The language switcher displays a flag icon next to each locale. Arabic is spoken across 22 countries — picking one country's flag would be politically charged and inaccurate.

## Decision

Use a **neutral language indicator** for Arabic by default. Tenant administrators may configure a specific flag if required.

## Consequences

### Positive

- Politically neutral (no endorsement of a specific country)
- Accurate (Arabic is a language, not a country)
- Tenant-configurable (customers with specific requirements can override)
- Consistent with industry best practice (e.g., Unicode CLDR recommends language-based, not country-based, indicators)

### Negative

- Less visually distinctive than a flag (mitigated by including the native name "العربية")
- Some users expect a flag (mitigated by the Welcome Tour explaining the choice)

## Alternatives Considered

- **Saudi Arabia flag**: would imply Saudi dialect (we use MSA); politically charged
- **Egypt flag**: most populous Arabic country; but still country-specific
- **UAE flag**: business hub; but still country-specific
- **Arab League flag**: obscure; not recognizable
- **All 22 flags**: cluttered; impractical

## Implementation

- `Tenant.flagConfig` JSON field: `{ "ar": "neutral" }` (default) or `{ "ar": "sa" }` (Saudi flag) etc.
- Language switcher reads the config and renders the appropriate indicator
- The Welcome Tour explains how to change language + flag

## Spec Reference

§4.5: "use a neutral Arabic/language indicator for `ar`; allow tenant administrators to configure a flag or visual indicator if required."
