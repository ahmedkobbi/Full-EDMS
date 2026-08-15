/**
 * Locale-aware date display (spec §16.7, §16.8).
 *
 * Uses the `@smart-edms/i18n` Intl-based formatters to render dates, times,
 * and date-times in the user's preferred locale. The locale is read from
 * the i18n store so the date re-renders when the user switches languages.
 *
 * For relative time ("3 hours ago"), pass `variant="relative"`.
 */
import { useMemo, type CSSProperties } from 'react';
import { Text, type TextProps } from '@mantine/core';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from '@smart-edms/i18n';
import { useI18nStore } from '../../i18n/config';

interface LocaleAwareDateProps extends Omit<TextProps, 'children'> {
  readonly value: string | Date | number;
  readonly variant?: 'date' | 'datetime' | 'relative';
  readonly style?: CSSProperties;
}

export function LocaleAwareDate({
  value,
  variant = 'date',
  style,
  ...textProps
}: LocaleAwareDateProps) {
  const locale = useI18nStore((s) => s.locale);

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

  return (
    <Text component="time" size="sm" style={style} {...textProps}>
      {formatted}
    </Text>
  );
}
