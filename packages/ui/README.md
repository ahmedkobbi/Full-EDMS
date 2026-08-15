# @smart-edms/ui

Shared React UI primitives used by both the Electron client and the License
Admin Panel. These are the components currently duplicated between
`apps/electron/src/renderer/components/common/` and
`apps/license-admin/src/components/common/`.

## Components

- **`BrandedLogo`** — SVG logo (premium, works in light + dark).
- **`EmptyState`** — premium empty state with illustration + action button.
- **`LoadingState`** — spinner / skeleton loader.
- **`ErrorState`** — friendly error with retry button.
- **`LocaleAwareDate`** — Intl-based date formatter using `@smart-edms/i18n`.
- **`StatusBadge`** — semantic status badge (success / warning / danger / info).
- **`ConfirmDialog`** — confirmation dialog wrapper using `@mantine/modals`.

## Conventions

Every component in this package:

- Uses `t()` from `react-i18next` for ALL visible strings (no hardcoded copy).
- Accepts a `className` prop for customization.
- Is RTL-aware (uses logical CSS properties — `start`/`end`, not `left`/`right`).
- Works in both light and dark themes (uses Mantine CSS variables).
- Has JSDoc comments on the exported component + its props.

## Setup

Consumers must wire up:

1. `@mantine/core` `MantineProvider` (with a `theme.colorScheme` of `'light'`
   or `'dark'` — both apps already do this).
2. `react-i18next` `initReactI18next` (both apps already do this).

The components read the active locale from `i18n.language` via
`useTranslation()`, so they re-render automatically when the user switches
languages.

## Build

```bash
pnpm --filter @smart-edms/ui build
pnpm --filter @smart-edms/ui typecheck
```

No unit tests are included (the components are presentational; behavior is
covered by the consumer apps' Playwright e2e suites).
