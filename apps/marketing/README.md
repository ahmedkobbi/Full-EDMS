# Smart EDMS — Marketing Public Page

> Public marketing site for the Smart EDMS enterprise document management
> platform. Spec reference: §7.5 (marketing public page stack), §12.11
> (marketing page requirements).

Built with Next.js 14 (App Router), TypeScript, Mantine v7, i18next, and the
shared `@smart-edms/i18n` package (six locales including Arabic RTL).

## Highlights

- **Multilingual.** Six locales out of the box: English, French, Arabic (RTL),
  Russian, Simplified Chinese, German. All strings flow through `t()` from the
  `marketing` namespace in `@smart-edms/i18n`.
- **SEO-optimised.** Per-page `generateMetadata` sets canonical URL, hreflang
  alternates (one per locale + `x-default`), OpenGraph, and Twitter cards.
  `app/sitemap.ts` emits one entry per (route × locale) pair. `app/robots.ts`
  allows all crawlers and points at the sitemap.
- **RTL-aware.** `<html dir="rtl" lang="ar">` is set per-locale in the
  `[locale]/layout.tsx`. Logical CSS properties (`paddingInlineStart`,
  `marginInlineEnd`) are used throughout so Arabic flips correctly without
  per-locale overrides.
- **Premium branding.** Light-only Mantine v7 theme that mirrors the License
  Admin and Electron client token sets (same brand blue, same typography, same
  logomark).
- **Accessibility.** Semantic landmarks (`<header role="banner">`,
  `<nav aria-label="Primary">`, `<main id="main-content">`,
  `<footer role="contentinfo">`), visible-on-focus skip-to-content link,
  labelled form fields, keyboard-navigable nav and language switcher, alt text
  on the screenshot placeholders.
- **NO fake data.** No fabricated customer counts, no invented metrics, no
  fake testimonials, no claimed third-party certifications. The legacy i18n
  keys `hero.badge`, `hero.trust.*`, `pricing.starter.*`, `pricing.business.price`,
  `customers.*`, and `stats.*` exist in the bundle for backwards compatibility
  but are intentionally NOT rendered by the marketing site. The Stats section
  is reframed as architectural promises ("Backed by enterprise-grade
  architecture") with four verifiable capability cards.
- **Public product tour.** Interactive `FeatureTabs` component on the
  homepage and `/features` page renders the nine spec features (Documents,
  Workflows, Audit, Search, Classification, Retention, AI Assistant, Guided
  Tour, Scanner) with screenshot placeholders (gradients + icons). Replace
  with real screenshots when available.
- **Demo + Trial forms.** POST to `/api/demo` and `/api/trial` route handlers
  that validate input with zod. In production these would enqueue emails via
  the licensing server's webhook infrastructure; for now they just validate
  and return success.
- **Pricing.** Three tiers (Team / Business / Enterprise) all showing
  "Custom" or "Starting from — contact sales" with a "Contact sales" CTA. No
  invented dollar amounts.

## Routes

| Path                       | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `/[locale]`                | Homepage — hero, stats, features, pricing, FAQ, CTA   |
| `/[locale]/features`       | Feature tabs + feature grid                            |
| `/[locale]/pricing`        | Three-tier pricing + FAQ                               |
| `/[locale]/demo`           | Demo request form (POST /api/demo)                     |
| `/[locale]/trial`          | Trial request form (POST /api/trial)                   |
| `/[locale]/download`       | Download links (Windows, macOS, Linux, server)         |
| `/[locale]/docs`           | Documentation portal links                             |
| `/[locale]/security`       | Security architecture + compliance posture             |
| `/[locale]/privacy`        | Privacy policy (template)                              |
| `/[locale]/terms`          | Terms of service (template)                            |
| `/[locale]/contact`        | Contact channels (email, sales, support, security)     |
| `/sitemap.xml`             | Auto-generated sitemap (one entry per route × locale)  |
| `/robots.txt`              | Allow all + sitemap pointer                            |
| `/api/demo`                | POST — demo request handler (zod validation)           |
| `/api/trial`               | POST — trial request handler (zod validation)          |

`[locale]` is one of: `en`, `fr`, `ar`, `ru`, `zh-CN`, `de`.

## Locale routing & RTL

`src/middleware.ts` intercepts every request, checks the `Accept-Language`
header, and redirects the user to a locale-prefixed URL (`/features` →
`/en/features`). Visitors with an Arabic `Accept-Language` are routed to
`/ar/...` which sets `<html dir="rtl" lang="ar">`.

The LanguageSwitcher in the header lets the user override the detected locale
at any time. The preference is encoded in the URL (no cookie / localStorage
dependency) so it survives link sharing.

## SEO

Every page calls `buildPageMetadata()` from `src/lib/seo.ts`, which produces
the Next.js `Metadata` object with:

- Canonical URL
- `alternates.languages` — one hreflang entry per locale + `x-default`
- OpenGraph (`og:title`, `og:description`, `og:url`, `og:locale`,
  `og:alternateLocale`, `og:image`)
- Twitter card (`summary_large_image`)
- `metadataBase` for resolving relative OG image URLs

The `[locale]/layout.tsx` also emits explicit `<link rel="alternate"
hreflang="..." href="...">` tags in the document head for crawlers that don't
read the `alternates` metadata field.

## i18n

The marketing site uses the `marketing` namespace from `@smart-edms/i18n` as
its default namespace, with `common` as the fallback. Server components read
translations via `getServerI18n(locale)`; client components read via
`useTranslation()` from `react-i18next` (initialised by `I18nProvider`).

231 new keys were added to the `marketing` namespace across all six locales
in `packages/i18n/resources/<locale>/marketing.ts`:

- The nine spec features (Documents, Workflows, Audit, Search,
  Classification, Retention, AI Assistant, Guided Tour, Scanner)
- Three pricing tiers (Team, Business, Enterprise) with "Custom" pricing
- Security architecture (six pillars) + compliance posture (GDPR, HIPAA,
  eIDAS, ISO 15489) — all framed as "designed for" not "certified by"
- Privacy policy + terms of service templates (long-form legal text)
- FAQ (six Q&A pairs)
- Download page, docs portal, contact page
- Page titles + descriptions for SEO

High-visibility UI strings (nav, hero, section titles, FAQ questions, page
titles, form labels) are properly translated for all six locales. Long-form
legal/security/compliance text is provided in English with a `// REVIEW:
native speaker needed` marker for non-English locales — the same convention
used by the existing `marketing` namespace files.

## Local development

```bash
# From the monorepo root:
pnpm install
pnpm --filter @smart-edms/marketing dev

# Or directly:
cd apps/marketing
pnpm dev
```

The dev server runs on `http://localhost:3000`. The middleware will redirect
`/` to `/en` (or your browser's preferred locale).

### Environment variables

| Variable                | Default                  | Purpose                                |
| ----------------------- | ------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | `http://localhost:3000`  | Canonical site URL for sitemap/OG tags |

Set `NEXT_PUBLIC_SITE_URL=https://smart-edms.example` in production.

## Build

```bash
pnpm --filter @smart-edms/marketing build
```

The build produces a `.next/` directory with the static + server-rendered
output. Deploy to Vercel or any Next.js-compatible host.

## Typecheck

```bash
pnpm --filter @smart-edms/marketing typecheck
```

## File structure

```
apps/marketing/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── next-env.d.ts
├── README.md (this file)
├── public/
│   ├── favicon.ico         # placeholder — replace before production
│   └── og-image.png        # placeholder — replace with 1200x630 PNG
│                           # (no robots.txt — served dynamically by app/robots.ts)
└── src/
    ├── app/
    │   ├── [locale]/
    │   │   ├── layout.tsx          # <html lang/dir>, MantineProvider, Header/Footer
    │   │   ├── page.tsx            # homepage
    │   │   ├── features/page.tsx
    │   │   ├── pricing/page.tsx
    │   │   ├── demo/page.tsx
    │   │   ├── trial/page.tsx
    │   │   ├── download/page.tsx
    │   │   ├── docs/page.tsx
    │   │   ├── security/page.tsx
    │   │   ├── privacy/page.tsx
    │   │   ├── terms/page.tsx
    │   │   └── contact/page.tsx
    │   ├── sitemap.ts              # auto-generated sitemap.xml
    │   ├── robots.ts               # auto-generated robots.txt
    │   └── api/
    │       ├── demo/route.ts       # POST demo request handler
    │       └── trial/route.ts      # POST trial request handler
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── Footer.tsx
    │   │   └── LanguageSwitcher.tsx
    │   ├── sections/
    │   │   ├── Hero.tsx
    │   │   ├── FeatureGrid.tsx
    │   │   ├── FeatureTabs.tsx     # interactive product tour preview
    │   │   ├── Pricing.tsx
    │   │   ├── SecuritySection.tsx
    │   │   ├── LocalizationSection.tsx
    │   │   ├── TourSection.tsx
    │   │   ├── FAQ.tsx
    │   │   ├── CTA.tsx
    │   │   └── Stats.tsx           # architectural promises, NO fake metrics
    │   ├── forms/
    │   │   ├── DemoRequestForm.tsx
    │   │   └── TrialRequestForm.tsx
    │   └── common/
    │       ├── BrandedLogo.tsx
    │       └── LocaleLink.tsx
    ├── i18n/
    │   ├── config.ts               # getServerI18n + initClientI18n
    │   └── I18nProvider.tsx        # client-side i18next provider
    ├── theme/
    │   └── theme.ts                # Mantine v7 light theme
    ├── lib/
    │   ├── locales.ts              # SUPPORTED_LOCALES, localeDirection, htmlLang
    │   └── seo.ts                  # buildPageMetadata, MARKETING_ROUTES
    └── middleware.ts               # locale routing + Accept-Language negotiation
```

## Production deployment checklist

Before going live:

1. **Replace placeholders.**
   - `public/favicon.ico` — real Smart EDMS favicon
   - `public/og-image.png` — real 1200×630 OpenGraph image
   - `FeatureTabs.tsx` screenshot gradient → real product screenshots
2. **Legal review.** Have counsel review `privacy/page.tsx` and
   `terms/page.tsx` content for the target jurisdiction.
3. **Native speaker review.** Have native speakers review the long-form
   legal/security/compliance text in non-English locales (marked with
   `// REVIEW: native speaker needed` in the i18n files).
4. **Set `NEXT_PUBLIC_SITE_URL`** to the canonical production URL.
5. **Wire API routes.** Connect `/api/demo` and `/api/trial` to the licensing
   server's webhook infrastructure to persist leads and send notification
   emails. Add rate-limiting by IP + email.
6. **Add an attestation list.** When SOC 2 / ISO 27001 certifications are
   earned, update `security/page.tsx` to display them. Do NOT display them
   before they are earned (the current `security.note` makes this explicit).
