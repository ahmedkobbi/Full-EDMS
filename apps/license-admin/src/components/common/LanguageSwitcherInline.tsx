/**
 * Inline language switcher for the login page.
 *
 * Smaller than the topbar switcher — renders a simple Select.
 */
import { Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { LOCALES, type MandatoryLocaleCode } from '@smart-edms/i18n';
import { useI18nStore } from '../../i18n/config';

export function LanguageSwitcherInline() {
  const { t } = useTranslation();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  return (
    <Select
      size="xs"
      w={180}
      aria-label={t('common:language.label')}
      data={LOCALES.map((l) => ({ value: l.code, label: `${l.nativeName} (${l.code})` }))}
      value={locale}
      onChange={(v) => v && setLocale(v as MandatoryLocaleCode)}
    />
  );
}
