import { type MetadataRoute } from 'next';

/**
 * Auto-generated robots.txt (spec §7.5).
 *
 * Allow all crawlers. Point them at the auto-generated sitemap.xml. The
 * marketing site is purely public content — nothing here should be hidden
 * from search engines.
 *
 * Vercel serves this at `/robots.txt` automatically.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
