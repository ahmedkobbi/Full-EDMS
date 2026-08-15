# ADR-0007: Use Mantine v7 for enterprise UI

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §17 (Mantine v7 UI/UX Requirements), §27.5 (UI/Mantine Rules)

## Context

Smart EDMS requires a premium, enterprise-grade UI component library with RTL support, theming, and accessibility. The spec mandates Mantine v7 (not v6).

## Decision

Use **Mantine v7** (`@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`, `@mantine/modals`, `@mantine/dates`, `@mantine/dropzone`, `mantine-react-table`).

## Consequences

### Positive

- Enterprise-grade components (tables, forms, modals, drawers, notifications)
- Built-in RTL support (critical for Arabic)
- Powerful theming (design tokens, light/dark, custom colors)
- Accessibility (ARIA, keyboard nav, focus management)
- `@mantine/form` for complex forms with validation
- `mantine-react-table` for enterprise data grids (server-side pagination)
- Active maintenance + growing ecosystem
- TypeScript-first

### Negative

- Bundle size (mitigated by tree-shaking)
- v7 breaking changes from v6 (we never used v6, so no migration)
- Some advanced components (e.g., rich text editor) require additional packages

## Alternatives Considered

- **Material-UI (MUI)**: Google-designed (not enterprise-premium feel); heavier; RTL support less polished
- **Ant Design**: Chinese-origin; enterprise but less premium feel; RTL issues
- **Chakra UI**: good but smaller component set; less enterprise-focused
- **shadcn/ui**: headless (Tailwind); requires more custom work; less out-of-box

## Spec Reference

§17 explicitly mandates Mantine v7. §27.5: "Always use Mantine v7. Do not use v6 syntax."
