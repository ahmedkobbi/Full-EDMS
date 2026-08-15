import { type ReactNode } from 'react';
import { type Metadata } from 'next';
import type { MandatoryLocaleCode } from '@smart-edms/i18n';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ClientProviders } from '../../components/layout/ClientProviders';
import { getServerI18n } from '../../i18n/config';
import {
  isSupportedLocale,
  localeDirection,
  htmlLang,
  DEFAULT_LOCALE,
} from '../../lib/locales';
import { buildPageMetadata } from '../../lib/seo';

export const dynamic = 'force-static';

interface LocaleLayoutProps {
  readonly params: { readonly locale: string };
  readonly children: ReactNode;
}

/**
 * Generate hreflang alternates for the homepage (`/`) — one entry per locale
 * plus `x-default` pointing at the locale-less root.
 */
export function generateMetadata({ params }: LocaleLayoutProps): Metadata {
  const locale = isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  const i18n = getServerI18n(locale);
  return buildPageMetadata({
    title: i18n.t('pageTitle.home'),
    description: i18n.t('pageDescription.home'),
    locale,
    path: '',
  });
}

export default function LocaleLayout({ params, children }: LocaleLayoutProps): ReactNode {
  const locale: MandatoryLocaleCode = isSupportedLocale(params.locale)
    ? params.locale
    : DEFAULT_LOCALE;
  const dir = localeDirection(locale);
  const lang = htmlLang(locale);

  return (
    <html lang={lang} dir={dir}>
      <head>
        {/* hreflang alternates for the homepage. Each locale gets its own
            <link rel="alternate" hreflang="..." href="..."> tag, plus an
            x-default entry. Search engines use these to serve the right
            locale to the right user. */}
        <HreflangAlternates path="" />
      </head>
      <body>
        <ClientProviders locale={locale}>
          <a
            href="#main-content"
            className="skip-link"
            style={{
              position: 'absolute',
              left: -9999,
              top: 0,
              background: '#1f54e6',
              color: '#fff',
              padding: '0.5rem 1rem',
              zIndex: 200,
              textDecoration: 'none',
              fontWeight: 600,
              borderRadius: '0 0 0.5rem 0',
            }}
          >
            Skip to content
          </a>
          <Header locale={locale} t={getServerI18n(locale).t.bind(getServerI18n(locale))} />
          <main id="main-content">{children}</main>
          <Footer locale={locale} t={getServerI18n(locale).t.bind(getServerI18n(locale))} />
        </ClientProviders>
      </body>
      <style>{`
        .skip-link:focus {
          left: 0 !important;
        }
      `}</style>
    </html>
  );
}

/**
 * Server component that emits the hreflang <link> tags for the current page
 * path. Renders one <link> per supported locale + x-default.
 */
function HreflangAlternates({ path }: { readonly path: string }): ReactNode {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const links = [
    { hreflang: 'x-default', href: `${base}${path === '' ? '/' : path}` },
    { hreflang: 'en', href: `${base}/en${path === '' ? '' : path}` },
    { hreflang: 'fr', href: `${base}/fr${path === '' ? '' : path}` },
    { hreflang: 'ar', href: `${base}/ar${path === '' ? '' : path}` },
    { hreflang: 'ru', href: `${base}/ru${path === '' ? '' : path}` },
    { hreflang: 'zh-CN', href: `${base}/zh-CN${path === '' ? '' : path}` },
    { hreflang: 'de', href: `${base}/de${path === '' ? '' : path}` },
  ];
  return (
    <>
      {links.map((l) => (
        <link key={l.hreflang} rel="alternate" hrefLang={l.hreflang} href={l.href} />
      ))}
    </>
  );
}
