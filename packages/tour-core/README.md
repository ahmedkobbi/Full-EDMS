# @smart-edms/tour-core

Framework-agnostic tour engine core for Smart EDMS. The Electron client's
`TourEngine.tsx` and the License Admin panel's `GuidedTour.tsx` both use
this for step navigation, context-aware filtering, and progress reporting.

## What's here

- **`TourEngine`** class — stateful engine with `start`, `next`, `previous`,
  `skip`, `complete`, `dismiss`, `getCurrentStep`, `getProgress`,
  `shouldShowStep`, `computeNextAvailableStep`.
- **`TOUR_SELECTORS`** — the 13 stable `data-tour` values from spec §10.13.
- **`TourContext`** — permission / license / selector-exists context used
  for context-aware step filtering.
- **`TourEngineState`** / **`TourStepResolution`** — typed state + resolution
  result.

## What's NOT here

- React components (the engine is UI-framework-agnostic; consumers render
  with their own stack).
- Hardcoded copy. Every step references message keys; consumers render via
  `t()` from `@smart-edms/i18n`.
- HTTP progress reporting. The engine exposes progress snapshots; consumers
  decide when / how to POST them to the backend.

## Build

```bash
pnpm --filter @smart-edms/tour-core build
pnpm --filter @smart-edms/tour-core typecheck
pnpm --filter @smart-edms/tour-core test
```
