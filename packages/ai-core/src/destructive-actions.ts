/**
 * @smart-edms/ai-core — destructive action deny-list (spec §11.4).
 *
 * The AI Assistant is READ-ONLY by default. It may SUGGEST destructive
 * actions to the user (via `AssistantSuggestedAction`), but it MUST NEVER
 * execute them silently. Destructive actions require a dedicated,
 * explicitly-confirmed UI flow (spec §11.4).
 *
 * This module exports the canonical Set of 7 destructive action types.
 * Any tool or action whose `actionType` is in this Set must be:
 *  1. Surfaced to the user as a suggested action (NOT auto-executed).
 *  2. Confirmed via a dedicated confirmation dialog (NOT a toast).
 *  3. Audited with `confirmationRequired: true`.
 *
 * Spec ref: §11.4 (read-only default; destructive requires confirmation),
 * §11.10 (data minimization), §27.3 (security rules — fail closed).
 */

import type { AssistantActionType } from '@smart-edms/types';

/**
 * The 7 destructive action types (spec §11.4). These actions can modify or
 * destroy data, expose resources externally, or trigger irreversible
 * processes — they must NEVER be executed by the AI without explicit,
 * step-up user confirmation.
 *
 *  - `create_share_link`     — exposes a document externally.
 *  - `start_workflow`        — kicks off a stateful process.
 *  - `request_approval`      — sends a notification to another user.
 *  - `export_evidence`       — packages potentially sensitive content for
 *                              external consumption.
 *  - `generate_report`       — may aggregate large amounts of data.
 *  - `modify_metadata`       — mutates document metadata.
 *  - `import_license`        — replaces the active license (system-wide
 *                              impact).
 *
 * `navigate`, `contact_support`, and `launch_tour` are intentionally NOT
 * in this set — they are non-destructive navigation / communication
 * actions that the AI may execute directly (still subject to the standard
 * tool whitelist).
 */
export const DESTRUCTIVE_ACTIONS: ReadonlySet<AssistantActionType> = new Set<AssistantActionType>([
  'create_share_link',
  'start_workflow',
  'request_approval',
  'export_evidence',
  'generate_report',
  'modify_metadata',
  'import_license',
]);

/**
 * Returns `true` iff the given `actionType` is destructive (i.e. in the
 * {@link DESTRUCTIVE_ACTIONS} set). Use this to gate the confirmation UI
 * and the audit `confirmationRequired` flag.
 *
 * @example
 *   if (isDestructiveAction(action.actionType)) {
 *     // Force step-up confirmation + dedicated dialog.
 *     showDestructiveConfirmationDialog(action);
 *   } else {
 *     // Execute directly (still subject to the tool whitelist + permissions).
 *     executeAction(action);
 *   }
 */
export function isDestructiveAction(actionType: AssistantActionType): boolean {
  return DESTRUCTIVE_ACTIONS.has(actionType);
}
