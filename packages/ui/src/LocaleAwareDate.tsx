/**
 * LocaleAwareDate — Intl-based date formatter (spec §16.7, §16.8).
 *
 * Uses the `@smart-edms/i18n` Intl-based formatters to render dates, times,
 * and date-times in the user's preferred locale. The locale is read from
 * `i18n.language` (via `react-i18next`'s `useTranslation()`) so the date
 * re-renders automatically when the user switches languages.
 *
 * For relative time ("3 hours ago"), pass `variant="relative"`.
 *
 * RTL-aware: the output is a `<time>` element with `dateTime` attribute
 * set to the ISO string; the visual order follows the document direction.
 */

import { type ReactElement, useMemo, type CSSProperties } from 'react';
import { Text, type TextProps } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from '@smart-edms/i18n';

/** Props for {@link LocaleAwareDate}. */
export interface LocaleAwareDateProps extends Omit<TextProps, 'children'> {
  /** The date value (Date, ISO string, or epoch number). */
  readonly value: string | Date | number;
  /** Display variant. `'date'` (default), `'datetime'`, or `'relative'`. */
  readonly variant?: 'date' | 'datetime' | 'relative';
  /** Inline style override applied to the root element. */
  readonly style?: CSSProperties;
  /** Extra CSS class name(s) applied to the root element. */
  readonly className?: string;
}

/**
 * Render a date in the user's preferred locale. The visible string is
 * produced by `@smart-edms/i18n`'s formatters; the underlying ISO value is
 * preserved in the `<time dateTime="...">` attribute for accessibility and
 * machine readability.
 *
 * @example
 *   <LocaleAwareDate value="2025-01-31T08:30:00.000Z" />
 *   <LocaleAwareDate value={event.timestamp} variant="relative" />
 *   <LocaleAwareDate value={meeting.startsAt} variant="datetime" />
 */
export function LocaleAwareDate({
  value,
  variant = 'date',
  style,
  className,
  ...textProps
}: LocaleAwareDateProps): ReactElement {
  const { i18n } = useTranslation();
  const locale = i18n.language ?? 'en';

  const formatted = useMemo(() => {
    switch (variant) {
      case 'datetime':
        return formatDateTime(value, locale);
      case 'relative':
        return formatRelativeTime(value, locale);
      case 'date':
      default:
        return formatDate(value, locale);
    }
  }, [value, locale, variant]);

  // Compute the ISO form for the `dateTime` attribute (accessibility).
  const isoValue = useMemo(() => {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }, [value]);

  return (
    <Text
      component="time"
      size="sm"
      style={style}
      className={className}
      dateTime={isoValue}
      {...textProps}
    >
      {formatted}
    </Text>
  );
}
