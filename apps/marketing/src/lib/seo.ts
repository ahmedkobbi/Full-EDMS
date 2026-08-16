/**
 * Smart EDMS marketing site — SEO helpers (spec §7.5, §12.11).
 *
 * Builds the metadata objects consumed by Next.js App Router's `generateMetadata`
 * API. Each page calls `buildPageMetadata()` with a title, description, and
 * the current locale; this helper fills in:
 *   - canonical URL
 *   - hreflang alternates (one per locale + `x-default`)
 *   - OpenGraph tags (og:title, og:description, og:url, og:image, og:locale, …)
 *   - Twitter card tags
 *   - robots directives
 *
 * The hreflang alternates are the SEO-critical piece — they tell search
 * engines that the same content exists at six locale-specific URLs (e.g.
 * `/en/features`, `/fr/features`, `/ar/features`, …). Google and Bing use
 * these to serve the right locale to the right user.
 */

import type { Metadata } from 'next';
import {
  type MandatoryLocaleCode,
  siteUrl,
  SUPPORTED_LOCALES,
} from './locales';

/**
 * Convert a Smart EDMS locale code to the BCP 47 tag OpenGraph expects.
 * Examples: `en` -> `en_US`, `fr` -> `fr_FR`, `zh-CN` -> `zh_CN`, `ar` -> `ar_SA`.
 */
function ogLocale(locale: MandatoryLocaleCode): string {
  const map: Record<MandatoryLocaleCode, string> = {
    en: 'en_US',
    fr: 'fr_FR',
    ar: 'ar_SA',
    ru: 'ru_RU',
    'zh-CN': 'zh_CN',
    de: 'de_DE',
  };
  return map[locale];
}

/**
 * Returns the OG alternate locales (all OTHER locales, not the current one).
 * Search engines and social platforms use these to offer the user's preferred
 * locale when sharing the link.
 */
function ogAlternateLocales(current: MandatoryLocaleCode): string[] {
  return SUPPORTED_LOCALES.filter((l) => l.code !== current).map((l) =>
    ogLocale(l.code),
  );
}

/**
 * The full list of marketing-site routes that get hreflang alternates.
 * Synchronised with the `src/app/[locale]/<route>/page.tsx` files.
 */
export const MARKETING_ROUTES: readonly string[] = [
  '',
  '/features',
  '/pricing',
  '/demo',
  '/trial',
  '/download',
  '/docs',
  '/security',
  '/privacy',
  '/terms',
  '/contact',
] as const;

export interface BuildPageMetadataArgs {
  /** Page title (already translated). */
  readonly title: string;
  /** Page description for meta tags (already translated). */
  readonly description: string;
  /** Current locale. */
  readonly locale: MandatoryLocaleCode;
  /**
   * Path under the locale segment, e.g. `''` for the homepage, `'/features'`
   * for the features page. Must start with `/` or be empty.
   */
  readonly path: string;
  /** Optional OpenGraph image URL (absolute). Defaults to `/og-image.png`. */
  readonly ogImage?: string;
  /** Optional — set true for legal pages that shouldn't be indexed. */
  readonly noIndex?: boolean;
}

/**
 * Build the Next.js Metadata object for a page. Sets canonical, hreflang
 * alternates, OpenGraph, and Twitter card fields.
 */
export function buildPageMetadata(args: BuildPageMetadataArgs): Metadata {
  const { title, description, locale, path, ogImage, noIndex } = args;
  const base = siteUrl();
  const canonicalPath = `/${locale}${path === '' ? '' : path}`;
  const canonicalUrl = `${base}${canonicalPath}`;
  const imageUrl = ogImage ?? `${base}/og-image.png`;

  // hreflang alternates — one per supported locale + x-default.
  const languages: Record<string, string> = {
    'x-default': `${base}/${path === '' ? '' : path}`,
  };
  for (const l of SUPPORTED_LOCALES) {
    languages[l.htmlLang] = `${base}/${l.code}${path === '' ? '' : path}`;
  }

  return {
    title,
    description,
    metadataBase: new URL(base),
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Smart EDMS',
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocales(locale),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    icons: {
      icon: '/favicon.ico',
    },
  };
}

/**
 * Returns the absolute URL for a locale-prefixed path. Used by the sitemap
 * generator and by the canonical/hreflang builders above.
 */
export function absoluteUrl(locale: MandatoryLocaleCode, path: string = ''): string {
  return `${siteUrl()}/${locale}${path === '' ? '' : path}`;
}
