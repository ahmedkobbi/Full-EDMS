/**
 * @smart-edms/ui
 *
 * Shared React UI primitives used by both the Electron desktop client and
 * the License Admin Panel. These are the components that were previously
 * duplicated between:
 *  - `apps/electron/src/renderer/components/common/`
 *  - `apps/license-admin/src/components/common/`
 *
 * Conventions enforced for every component in this package:
 *  - Uses `t()` from `react-i18next` for ALL visible strings (no hardcoded
 *    copy — every text node references a translation key).
 *  - Accepts a `className` prop for consumer-side customization.
 *  - Is RTL-aware (uses logical CSS properties — `marginInlineStart`,
 *    `insetInlineEnd`, etc. — never physical `left`/`right`).
 *  - Works in both light and dark Mantine themes (uses CSS variables that
 *    flip automatically).
 *  - Has JSDoc comments on the exported component and its props.
 *
 * Setup: consumers must wrap their app in `MantineProvider` (with the
 * `theme.colorScheme` set to `'light'` or `'dark'`) AND initialise
 * `react-i18next` via `initReactI18next`. Both existing apps already do
 * this; new consumers should follow the same pattern.
 *
 * Spec ref: §17 (premium UI), §19 (branding), §16 (i18n), §16.7/§16.8
 * (locale-aware formatting).
 */

export { BrandedLogo } from './BrandedLogo';
export { EmptyState } from './EmptyState';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
export { LocaleAwareDate } from './LocaleAwareDate';
export { StatusBadge } from './StatusBadge';
export { ConfirmDialog } from './ConfirmDialog';
