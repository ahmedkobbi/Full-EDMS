'use client';

/**
 * Smart EDMS marketing site — client-side providers wrapper (spec §7.5).
 *
 * Next.js App Router requires `MantineProvider` (and any context provider
 * that uses `createContext`) to be rendered inside a 'use client' boundary.
 * The root `[locale]/layout.tsx` is a server component, so it can't host
 * `MantineProvider` directly. This file is the client-side wrapper.
 *
 * Also hosts the `I18nProvider` (which initialises the i18next singleton on
 * the client) so we only pay one client/server boundary cost.
 */

import { type ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { marketingTheme } from '../../theme/theme';
import { I18nProvider } from '../../i18n/I18nProvider';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';

interface ClientProvidersProps {
  readonly locale: MandatoryLocaleCode;
  readonly children: ReactNode;
}

export function ClientProviders({ locale, children }: ClientProvidersProps): ReactNode {
  return (
    <MantineProvider theme={marketingTheme} defaultColorScheme="light">
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </MantineProvider>
  );
}
