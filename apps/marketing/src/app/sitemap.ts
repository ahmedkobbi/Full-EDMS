import { type MetadataRoute } from 'next';
import { SUPPORTED_LOCALES } from '../lib/locales';
import { MARKETING_ROUTES } from '../lib/seo';

/**
 * Auto-generated sitemap.xml (spec §7.5).
 *
 * Emits one entry per (route × locale) pair. The `alternates.languages` field
 * tells search engines that the same content exists at the other locale URLs.
 *
 * The base URL comes from `NEXT_PUBLIC_SITE_URL` (defaults to
 * `http://localhost:3000` in dev). Production deployments must set this env
 * var to the canonical public URL (e.g. `https://smart-edms.example`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const now = new Date().toISOString();

  const entries: MetadataRoute.Sitemap = [];

  for (const path of MARKETING_ROUTES) {
    for (const locale of SUPPORTED_LOCALES) {
      const url = `${base}/${locale.code}${path === '' ? '' : path}`;
      // Build hreflang alternates for this URL — all six locales plus
      // x-default pointing at the locale-less root.
      const languages: Record<string, string> = {
        'x-default': `${base}${path === '' ? '' : path}`,
      };
      for (const l of SUPPORTED_LOCALES) {
        languages[l.htmlLang] = `${base}/${l.code}${path === '' ? '' : path}`;
      }

      entries.push({
        url,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: path === '' ? 1.0 : 0.8,
        alternates: { languages },
      });
    }
  }

  return entries;
}
