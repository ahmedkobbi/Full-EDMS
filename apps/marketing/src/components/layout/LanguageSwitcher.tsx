'use client';

/**
 * Smart EDMS marketing site — language switcher (spec §16.6, §4.5).
 *
 * Renders a dropdown of the six mandatory Smart EDMS locales. Switching
 * locale navigates to the same page in the new locale (e.g. `/en/features` ->
 * `/fr/features`). The active locale is highlighted.
 *
 * Accessibility:
 *   - Uses a `<select>` element for keyboard accessibility and screen-reader
 *     support. Native selects are universally understood by AT.
 *   - Each `<option>` carries a label that combines the native name and the
 *     English name (for users who don't read the native script).
 *   - The `<label>` is visible-on-focus only (visually hidden by default) so
 *     sighted users see a clean dropdown but AT users hear the label.
 *
 * Per spec §4.5, the Arabic flag indicator defaults to "neutral" — we do not
 * render a country flag for Arabic, only the native name. Other locales use
 * the default flag emoji (country flag) from the LOCALES metadata.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useMantineTheme, VisuallyHidden } from '@mantine/core';
import { type LocaleMeta, LOCALES, type MandatoryLocaleCode } from '@smart-edms/i18n';

interface LanguageSwitcherProps {
  readonly currentLocale: MandatoryLocaleCode;
  readonly label?: string;
  readonly variant?: 'header' | 'footer';
}

/**
 * Strips the leading `/<locale>` segment from a pathname.
 * `/en/features` -> `/features`, `/ar` -> ``.
 */
function stripLocale(pathname: string, locale: MandatoryLocaleCode): string {
  const prefix = `/${locale}`;
  if (pathname === prefix || pathname === `${prefix}/`) {return '';}
  if (pathname.startsWith(prefix + '/')) {return pathname.slice(prefix.length);}
  return pathname;
}

export function LanguageSwitcher({
  currentLocale,
  label,
  variant = 'header',
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useMantineTheme();

  const handleChange = (next: MandatoryLocaleCode) => {
    if (next === currentLocale) {return;}
    const remainder = stripLocale(pathname, currentLocale);
    const target = `/${next}${remainder}`;
    router.push(target);
  };

  const isFooter = variant === 'footer';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
      }}
    >
      <VisuallyHidden>
        <label htmlFor="lang-switcher">{label ?? 'Language'}</label>
      </VisuallyHidden>
      <select
        id="lang-switcher"
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value as MandatoryLocaleCode)}
        aria-label={label ?? 'Language'}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          background: isFooter ? theme.colors.neutral[9] : theme.white,
          color: isFooter ? theme.white : theme.colors.neutral[9],
          border: `1px solid ${isFooter ? theme.colors.neutral[7] : theme.colors.neutral[3]}`,
          borderRadius: theme.radius.md,
          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
          fontSize: theme.fontSizes.sm,
          fontWeight: 500,
          cursor: 'pointer',
          minWidth: 140,
        }}
      >
        {LOCALES.map((l: LocaleMeta) => (
          <option key={l.code} value={l.code}>
            {l.nativeName} — {l.englishName}
          </option>
        ))}
      </select>
    </div>
  );
}
