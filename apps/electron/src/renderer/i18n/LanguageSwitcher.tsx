/**
 * Smart EDMS language switcher (spec §16.6, §4.5).
 *
 * Renders a Mantine Menu with all six mandatory locales. Each locale is
 * shown with its native name (e.g. العربية, 简体中文) so a user can find
 * their language regardless of the current UI language.
 *
 * Flag indicator (spec §4.5):
 *  - Arabic uses a `neutral` indicator by default (no country flag).
 *  - Other locales use their default country flag emoji.
 *  - Tenants may override via `TenantBranding.localeFlags`.
 *
 * Accessibility:
 *  - The trigger has `aria-label` set to the current language name.
 *  - Menu items use `lang` attribute so screen readers pronounce the
 *    native name correctly.
 *  - Keyboard accessible: Tab to focus, Enter/Space to open, arrow keys
 *    to navigate, Escape to close.
 */
import { Menu, Button, type ButtonProps } from '@mantine/core';
import { IconChevronDown, IconCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LOCALES, isRtl } from '@smart-edms/i18n';
import { useI18nStore } from './config';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';

interface LanguageSwitcherProps {
  /** Compact mode renders only the flag + code (used in the topbar). */
  readonly variant?: 'compact' | 'full';
  readonly buttonProps?: Partial<ButtonProps>;
}

/**
 * Resolve the flag indicator for a locale. Defaults to the spec-defined
 * flag; tenant overrides are applied by the backend's branding bundle.
 */
function flagFor(code: MandatoryLocaleCode): string {
  if (code === 'ar') {
    // Arabic uses a neutral indicator per spec §4.5 — language glyph, not
    // a country flag, so the indicator is not associated with any single
    // Arabic-speaking country.
    return 'ع';
  }
  const meta = LOCALES.find((l) => l.code === code);
  if (!meta) return '🌐';
  // The default flag indicator is a country flag emoji; `neutral` is treated
  // specially (only Arabic by default).
  return meta.defaultFlagIndicator === 'neutral' ? '🌐' : meta.defaultFlagIndicator;
}

export function LanguageSwitcher({ variant = 'full', buttonProps }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <Menu shadow="md" width={220} position="bottom-end" withinPortal>
      <Menu.Target>
        <Button
          variant="subtle"
          color="gray"
          leftSection={<span aria-hidden="true">{flagFor(current.code)}</span>}
          rightSection={<IconChevronDown size={14} aria-hidden="true" />}
          aria-label={t('language.current', { name: current.nativeName })}
          data-tour="app.languageSwitcher"
          {...buttonProps}
        >
          {variant === 'compact' ? (
            <span>{current.code.toUpperCase()}</span>
          ) : (
            <span>{current.nativeName}</span>
          )}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('language.label')}</Menu.Label>
        {LOCALES.map((meta) => (
          <Menu.Item
            key={meta.code}
            onClick={() => setLocale(meta.code)}
            lang={meta.htmlLang}
            aria-current={meta.code === locale ? 'true' : undefined}
            leftSection={<span aria-hidden="true">{flagFor(meta.code)}</span>}
            rightSection={
              meta.code === locale ? <IconCheck size={14} aria-hidden="true" /> : null
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{meta.nativeName}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.65 }}>{meta.englishName}</span>
            </div>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

/**
 * Returns the direction-aware position multiplier for the current locale.
 * Components use this when placing the AI bubble, drawer, etc.
 */
export function useLocaleDirection(): 'ltr' | 'rtl' {
  const locale = useI18nStore((s) => s.locale);
  return isRtl(locale) ? 'rtl' : 'ltr';
}
