/**
 * StatusBadge — semantic status badge (spec §17, §19).
 *
 * A small pill-shaped badge that renders a status string with a semantic
 * color (success / warning / danger / info / neutral). The visible label
 * is resolved via `t()` from `react-i18next` so it picks up the user's
 * locale.
 *
 * RTL-aware: the badge uses logical `paddingInline` and the dot is rendered
 * to the start of the label via flexbox `dir`-aware ordering.
 */

import { type ReactElement } from 'react';
import { Badge, type BadgeProps, Box } from '@mantine/core';
import { useTranslation } from 'react-i18next';

/** The semantic status variants. */
export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Props for {@link StatusBadge}. */
export interface StatusBadgeProps extends Omit<BadgeProps, 'color' | 'children' | 'vars'> {
  /** Semantic variant. Drives the color. */
  readonly variant?: StatusBadgeVariant;
  /**
   * Translation key for the visible label (e.g. `'status.active'`,
   * `'common:status.pending'`). Resolved via `t()`.
   */
  readonly labelKey: string;
  /** Optional interpolation variables passed to `t()`. */
  readonly vars?: Readonly<Record<string, string | number | boolean>>;
  /** Extra CSS class name(s) applied to the root element. */
  readonly className?: string;
}

/** Maps a semantic variant to a Mantine color name. */
const VARIANT_COLOR: Record<StatusBadgeVariant, string> = {
  success: 'green',
  warning: 'yellow',
  danger: 'red',
  info: 'blue',
  neutral: 'gray',
};

/**
 * Render a semantic status badge. The badge is composed of a small dot
 * (rendered to the start of the label via flexbox) and a translated label.
 *
 * @example
 *   <StatusBadge variant="success" labelKey="common:status.active" />
 *   <StatusBadge variant="danger" labelKey="license:status.expired" />
 */
export function StatusBadge({
  variant = 'neutral',
  labelKey,
  vars,
  className,
  ...badgeProps
}: StatusBadgeProps): ReactElement {
  const { t } = useTranslation();
  const color = VARIANT_COLOR[variant];

  return (
    <Badge
      color={color}
      variant="light"
      className={className}
      leftSection={
        <Box
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            // Use the same color as the badge text so the dot is visible in
            // both light and dark themes.
            background: 'currentColor',
            display: 'inline-block',
          }}
        />
      }
      {...badgeProps}
    >
      {t(labelKey, vars as Record<string, string | number | boolean> | undefined)}
    </Badge>
  );
}
