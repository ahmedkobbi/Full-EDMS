/**
 * Locale-aware date / datetime renderer.
 *
 * Uses the Intl-based formatters from `@smart-edms/i18n` so dates appear in
 * the admin's selected locale (en, fr, ar, ru, zh-CN, de). RTL is handled
 * by the browser's Intl implementation automatically.
 */
import { formatDate, formatDateTime, formatRelativeTime } from '@smart-edms/i18n';
import { useI18nStore } from '../../i18n/config';

interface LocaleAwareDateProps {
  readonly value: string | null | undefined;
  readonly variant?: 'date' | 'datetime' | 'relative';
  readonly fallback?: string;
}

export function LocaleAwareDate({
  value,
  variant = 'datetime',
  fallback = '—',
}: LocaleAwareDateProps) {
  const locale = useI18nStore((s) => s.locale);

  if (!value) {
    return <span>{fallback}</span>;
  }

  try {
    if (variant === 'date') {
      return <span>{formatDate(value, locale)}</span>;
    }
    if (variant === 'relative') {
      return <span>{formatRelativeTime(value, locale)}</span>;
    }
    return <span>{formatDateTime(value, locale)}</span>;
  } catch {
    return <span>{value}</span>;
  }
}
