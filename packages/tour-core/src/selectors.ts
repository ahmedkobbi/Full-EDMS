/**
 * @smart-edms/tour-core — stable tour selectors (spec §10.13).
 *
 * The 13 stable `data-tour="..."` values used across the Smart EDMS UI.
 * These are the ONLY selector values the tour engine is allowed to target;
 * fragile selectors based on generated CSS classes are forbidden (spec §10.13).
 *
 * The values match the table in `docs/TOUR.md`:
 *
 * | Selector              | Element                       |
 * |-----------------------|-------------------------------|
 * | `app.sidebar`         | Main sidebar                  |
 * | `app.search`          | Global search input           |
 * | `app.languageSwitcher`| Language switcher             |
 * | `app.themeSwitcher`   | Theme switcher                |
 * | `documents.upload`    | Document upload button/dropzone |
 * | `documents.table`     | Document list table           |
 * | `license.statusWidget`| License status widget         |
 * | `workflow.designerCanvas` | Workflow designer canvas  |
 * | `audit.timeline`      | Audit timeline view           |
 * | `scanner.profiles`    | Scanner profiles list         |
 * | `help.menu`           | Help menu                     |
 * | `commandPalette`      | Command palette trigger       |
 * | `ai.bubble`           | AI Assistant bubble button    |
 *
 * Note: the seeder (`apps/backend/src/modules/tour/tour-seeder.ts`) defines
 * additional granular sub-selectors (e.g. `app.sidebar.documents`) for
 * finer-grained step targeting — those are passed as raw strings, not via
 * this constant, and are validated at seed-time only.
 */

/**
 * Type of a stable tour selector string. The string form is the same as the
 * literal value (e.g. `'app.sidebar'`).
 */
export type TourSelector =
  | 'app.sidebar'
  | 'app.search'
  | 'app.languageSwitcher'
  | 'app.themeSwitcher'
  | 'documents.upload'
  | 'documents.table'
  | 'license.statusWidget'
  | 'workflow.designerCanvas'
  | 'audit.timeline'
  | 'scanner.profiles'
  | 'help.menu'
  | 'commandPalette'
  | 'ai.bubble';

/**
 * The 13 canonical tour selectors, as a readonly array. Use this for
 * whitelist validation at seed-time or at runtime to reject fragile
 * CSS-class-based selectors.
 *
 * @example
 *   if (!TOUR_SELECTORS.includes(step.targetSelector)) {
 *     // Reject the step — fragile selectors are forbidden (spec §10.13).
 *   }
 */
export const TOUR_SELECTORS: readonly TourSelector[] = [
  'app.sidebar',
  'app.search',
  'app.languageSwitcher',
  'app.themeSwitcher',
  'documents.upload',
  'documents.table',
  'license.statusWidget',
  'workflow.designerCanvas',
  'audit.timeline',
  'scanner.profiles',
  'help.menu',
  'commandPalette',
  'ai.bubble',
] as const;

/**
 * Type guard: returns `true` iff `s` is one of the 13 canonical tour
 * selectors. Use this at the seed/validation boundary to reject arbitrary
 * selector strings.
 *
 * Note: the engine itself does NOT enforce this at runtime — granular
 * sub-selectors (e.g. `app.sidebar.documents`) are allowed by design.
 * Only seed-time validation uses this guard.
 */
export function isCanonicalTourSelector(s: string): s is TourSelector {
  return (TOUR_SELECTORS as readonly string[]).includes(s);
}
