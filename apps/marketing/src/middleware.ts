/**
 * Smart EDMS marketing site — middleware (spec §7.5, §16.1, §16.5).
 *
 * Two responsibilities:
 *
 * 1. **Locale routing.** Every request is redirected to a locale-prefixed URL
 *    (`/features` -> `/en/features`). Visitors with an `Accept-Language`
 *    header that matches a supported locale are routed to that locale; everyone
 *    else falls back to English.
 *
 * 2. **RTL detection.** The middleware doesn't set `<html dir>` directly (that
 *    happens in the layout based on the `[locale]` param), but it ensures the
 *    locale is always present in the URL so the layout can resolve it
 *    correctly.
 *
 * Inspired by the Next.js Internationalization example, but trimmed to the
 * Smart EDMS six-locale set with no third-party matcher dependency.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type MandatoryLocaleCode,
} from './lib/locales';

/**
 * Routes that should NOT be intercepted by the locale middleware. These are
 * Next.js internal paths (`/_next/...`), the API routes (`/api/...`), and
 * static assets (`/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/og-image.png`).
 */
const EXCLUDED_PATHS = /^\/(_next|api)|\.(ico|png|jpg|jpeg|svg|webp|avif|txt|xml|css|js|map)$/i;

/**
 * Pick the best locale from the `Accept-Language` header. Returns the
 * mandatory default if no header is present or no match is found.
 */
function negotiateLocale(acceptLanguage: string | null): MandatoryLocaleCode {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  // Parse "fr-FR,fr;q=0.9,en;q=0.8" — take the most specific match.
  const requested = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.split('=')[1]) : 1;
      return { tag: tag.trim().toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of requested) {
    // Exact match (e.g. "zh-cn", "zh-CN").
    if (isSupportedLocale(tag)) return tag as MandatoryLocaleCode;
    // Prefix match (e.g. "fr-FR" -> "fr", "zh-Hant" -> still no match, falls
    // back to en; that's acceptable since Smart EDMS only ships Simplified
    // Chinese).
    const prefix = tag.split('-')[0];
    if (isSupportedLocale(prefix)) return prefix as MandatoryLocaleCode;
  }
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Don't touch Next internals, API routes, or static assets.
  if (EXCLUDED_PATHS.test(pathname)) {
    return NextResponse.next();
  }

  // If the pathname already starts with a supported locale, let it through.
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && isSupportedLocale(firstSegment)) {
    return NextResponse.next();
  }

  // Negotiate locale and redirect.
  const locale = negotiateLocale(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

/**
 * The matcher runs the middleware on every request except Next internals and
 * static assets.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|og-image.png|api).*)'],
};
