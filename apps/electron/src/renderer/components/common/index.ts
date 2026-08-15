/**
 * Smart EDMS — Electron common UI components.
 *
 * These are now thin re-exports from `@smart-edms/ui`, the shared package
 * used by both the Electron client and the License Admin Panel. This avoids
 * code duplication and ensures consistent branding + behavior across apps.
 *
 * Spec ref: §17 (Mantine v7 enterprise UI), §19 (branding), §16 (i18n).
 */
export { BrandedLogo } from '@smart-edms/ui';
export { EmptyState } from '@smart-edms/ui';
export { LoadingState } from '@smart-edms/ui';
export { ErrorState } from '@smart-edms/ui';
export { LocaleAwareDate } from '@smart-edms/ui';
export { StatusBadge } from '@smart-edms/ui';
export { ConfirmDialog } from '@smart-edms/ui';
