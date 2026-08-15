/**
 * Smart EDMS marketing site — locale-aware Link component (spec §7.5).
 *
 * Wraps Next.js `<Link>` so that the active locale is automatically prepended
 * to the `href`. This avoids `/${locale}/features` boilerplate at every call
 * site and guarantees every internal link on the site is locale-prefixed.
 *
 * Usage:
 *   <LocaleLink href="/features" locale="fr">Features</LocaleLink>
 *   // renders <a href="/fr/features">Features</a>
 *
 * Accepts the same props as `next/link` (className, onClick, target, …) plus
 * the `locale` prop. The locale MUST be passed explicitly because this
 * component is used from both server components (where there is no React
 * context to read it from) and client components.
 */

import Link from 'next/link';
import { type AnchorHTMLAttributes, type ReactNode } from 'react';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';

interface LocaleLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /**
   * Path WITHOUT the locale prefix. Must start with `/` or be `/`.
   * Examples: `/features`, `/pricing`, `/`.
   */
  readonly href: string;
  /** The current locale, used to build the locale-prefixed URL. */
  readonly locale: MandatoryLocaleCode;
  readonly children: ReactNode;
}

/**
 * Builds the locale-prefixed href. `/` becomes `/${locale}`, `/features`
 * becomes `/${locale}/features`.
 */
export function buildLocaleHref(
  locale: MandatoryLocaleCode,
  href: string,
): string {
  if (href === '/' || href === '') return `/${locale}`;
  if (href.startsWith('/')) return `/${locale}${href}`;
  return `/${locale}/${href}`;
}

export function LocaleLink({
  href,
  locale,
  children,
  ...rest
}: LocaleLinkProps): ReactNode {
  const finalHref = buildLocaleHref(locale, href);
  return (
    <Link href={finalHref} {...rest}>
      {children}
    </Link>
  );
}
