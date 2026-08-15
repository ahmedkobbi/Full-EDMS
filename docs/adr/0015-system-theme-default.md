# ADR-0015: Default to system theme (not hardcoded light or dark)

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §4.7 (Theme Strategy), §18 (Theme System Requirements)

## Context

Smart EDMS needs a theme strategy. Options: hardcode light, hardcode dark, or default to the OS preference.

## Decision

Default to **system theme** (follows `prefers-color-scheme` media query). Users can override to `light` or `dark`; the override is persisted.

## Consequences

### Positive

- Respects user's OS preference (most modern apps do this)
- Reduces eye strain (dark mode at night, light mode during the day)
- Premium feel (both themes are first-class)
- Electron native theme syncs with the UI theme

### Negative

- Slightly more complex (must handle theme changes at runtime)
- Risk of "flash of incorrect theme" (FOUC) on startup — mitigated by reading theme synchronously from localStorage before React hydrates
- Both themes must be tested (more QA work)

## Implementation

- Theme store (Zustand + persist) reads from localStorage on startup
- If no stored preference, uses `window.matchMedia('(prefers-color-scheme: dark)').matches`
- Electron main process syncs `nativeTheme` with the UI theme
- Mantine `ColorSchemeProvider` applies the theme
- CSS variables + logical properties ensure both themes work

## Alternatives Considered

- **Hardcode light**: ignores user preference; feels dated
- **Hardcode dark**: ignores users who prefer light; can feel oppressive
- **Time-based (dark at night)**: clever but surprising; doesn't respect explicit user choice

## Spec Reference

§4.7: "The default theme must be: System theme." §18.1: "Default: system." §27.5: "Default theme must follow system."
