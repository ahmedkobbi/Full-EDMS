'use client';

/**
 * Smart EDMS marketing site — client-side i18n provider (spec §16, §7.5).
 *
 * Wraps the React tree in `I18nextProvider` so client components can call
 * `useTranslation()`. Initialises the i18next singleton on mount with the
 * locale from the `[locale]` route param.
 *
 * Server components don't need this provider — they read translations
 * directly from `getServerI18n()`. But every page that renders interactive
 * client components (forms, language switcher, FAQ accordions) must wrap them
 * in `<I18nProvider locale={locale}>`.
 */

import { type ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initClientI18n } from './client';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';

interface I18nProviderProps {
  readonly locale: MandatoryLocaleCode;
  readonly children: ReactNode;
}

/**
 * Initialises i18next on the client and provides it to child components.
 *
 * The `ready` state prevents children from reading translations before
 * i18next has loaded the bundled resources. With `useSuspense: false` and
 * bundled (not async) resources, this resolves synchronously on first render
 * in practice — the gate is mostly defensive.
 */
export function I18nProvider({ locale, children }: I18nProviderProps): ReactNode {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initClientI18n(locale);
    setReady(true);
  }, [locale]);

  if (!ready) {
    // Server-rendered initial paint — i18next is bundled synchronously so this
    // branch only fires for one tick on the client.
    return null;
  }

  const i18n = initClientI18n(locale);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
