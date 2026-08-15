# Smart EDMS — Brand Guidelines

> Spec reference: §19 (Full Modern Premium Branding Requirements).

## Brand Personality

Smart EDMS brand personality must feel:

- **Premium** — refined, not flashy
- **Precise** — accurate, engineered
- **Trustworthy** — reliable, honest
- **Intelligent** — smart without arrogance
- **Calm** — non-alarmist, even under stress
- **Enterprise-grade** — built for serious work
- **Modern** — current, not trendy
- **Secure** — visibly trustworthy
- **Multilingual** — fluent in 6 languages
- **Culturally aware** — respectful of differences
- **Non-hyperbolic** — no marketing fluff

## Brand Name and Wordmark

The product name is **Smart EDMS**.

Rules:

- Keep the name consistent across all surfaces
- Do NOT rename the product in UI copy unless approved by brand owner
- Translate descriptive text, **not the product name**
- The wordmark must work in English, French, Arabic, Russian, Simplified Chinese, and German contexts
- Arabic rendering must remain visually elegant and RTL-compatible
- Wordmark must remain legible in small sizes (sidebar, favicon)
- Wordmark must work in both light and dark themes

## Visual Identity

### Logo concept

Recommended conceptual direction (spec §19.3):

- **Document + shield + node/network** — protection + structure + connectivity
- **Intelligent document flow** — movement + processing
- **Secure records governance** — authority + custodianship
- **Structured data layers** — depth + organization
- **Subtle geometric precision** — engineering quality

Logo principles:

- Simple
- Memorable
- Scalable (works at 16×16 favicon up to billboard)
- Premium (no clipart, no stock icons)
- Legible at small sizes
- Suitable for desktop icon, sidebar, marketing header, PDF certificate, tour welcome, AI bubble

### Required brand assets

| Asset | Where used |
|-------|------------|
| Primary logo | Sidebar, login, splash, marketing hero |
| Compact logo/icon | Favicon, taskbar, mobile |
| Monochrome logo | Footer, B&W print |
| Light-theme logo variant | Light backgrounds |
| Dark-theme logo variant | Dark backgrounds |
| Favicon | Browser, Electron taskbar |
| Electron app icon | `.ico` (Windows), `.icns` (macOS), `.png` (Linux) |
| Installer icons | OS-specific installer branding |
| Splash screen | Electron startup |
| Loading screen | App boot |
| Onboarding visuals | First-run wizard |
| Guided tour welcome visuals | Tour step 1 |
| AI assistant avatar | AI bubble + chat header |
| Empty-state illustrations | Document list, audit log, search results |
| Error-state illustrations | 404, 500, license invalid |
| License certificate design | PDF export |
| Email header/footer | Transactional emails |
| Marketing hero visuals | Homepage, demo page |
| Document/security motif | Section dividers, decorative |
| Social/share preview image | OpenGraph, Twitter cards |

## Color System

Smart EDMS uses a design token color system supporting light + dark themes, semantic status colors, classification colors, license state colors, workflow state colors, tour highlight colors, AI assistant accent colors, focus rings, disabled states, hover states, and active states.

### Light theme palette

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#FAFBFC` (soft neutral off-white) | App background |
| `surface` | `#FFFFFF` (clean white) | Cards, panels, modals |
| `surfaceAlt` | `#F4F6F8` | Sidebar, table headers |
| `text` | `#1A202C` (deep slate) | Primary text |
| `textMuted` | `#4A5568` | Secondary text |
| `textSubtle` | `#718096` | Tertiary text, captions |
| `border` | `#E2E8F0` | Subtle borders |
| `borderStrong` | `#CBD5E0` | Strong borders, dividers |
| `primary` | `#4F46E5` (refined indigo) | Primary actions, branding |
| `primaryHover` | `#4338CA` | Hover state |
| `primaryActive` | `#3730A3` | Active state |
| `accent` | `#0EA5E9` (premium electric blue) | Highlights, AI accent |
| `accentHover` | `#0284C7` | Hover |
| `success` | `#16A34A` (green) | Success states |
| `warning` | `#D97706` (amber) | Warning states |
| `danger` | `#DC2626` (red/crimson) | Error/destructive |
| `info` | `#2563EB` (blue) | Info states |

### Dark theme palette

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#0B0F1A` (deep graphite/navy) | App background |
| `surface` | `#1A202C` (elevated dark slate) | Cards, panels |
| `surfaceAlt` | `#111827` | Sidebar, table headers |
| `text` | `#F7FAFC` (soft white) | Primary text |
| `textMuted` | `#CBD5E0` | Secondary text |
| `textSubtle` | `#A0AEC0` | Tertiary text |
| `border` | `#2D3748` | Subtle borders |
| `borderStrong` | `#4A5568` | Strong borders |
| `primary` | `#818CF8` (luminous indigo) | Primary actions |
| `primaryHover` | `#A5B4FC` | Hover |
| `primaryActive` | `#6366F1` | Active |
| `accent` | `#22D3EE` (cyan) | Highlights, AI accent |
| `accentHover` | `#67E8F9` | Hover |
| `success` | `#10B981` (emerald) | Success |
| `warning` | `#F59E0B` (amber) | Warning |
| `danger` | `#F43F5E` (rose) | Error/destructive |
| `info` | `#38BDF8` (sky) | Info |

### Semantic state colors

| State | Light | Dark |
|-------|-------|------|
| Valid license | success | success |
| Expiring soon license | warning | warning |
| Grace period license | warning | warning |
| Grace exhausted license | danger | danger |
| Extended remediation | danger | danger |
| Invalid license | danger | danger |
| Public classification | info | info |
| Internal classification | primary | primary |
| Confidential classification | warning | warning |
| Restricted classification | danger | danger |
| Highly Sensitive classification | danger | danger |

Colors must meet WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text). Do NOT rely on color alone to communicate state — always include icons, labels, badges, and text where necessary.

## Typography

### Font strategy

| Script | Font | Fallback |
|--------|------|----------|
| Latin (en, fr, de) | Inter Variable | IBM Plex Sans, system-ui |
| Cyrillic (ru) | Inter Variable | IBM Plex Sans, system-ui |
| Arabic (ar) | IBM Plex Sans Arabic | Noto Sans Arabic, Tajawal, Cairo |
| Simplified Chinese (zh-CN) | Noto Sans SC | system-ui |
| Monospace (code, IDs) | JetBrains Mono | IBM Plex Mono, monospace |

### Typography rules

- No ultra-thin body text (min font-weight 400)
- Maintain readable line height (1.5 for body, 1.25 for headings)
- Do NOT apply letter-spacing to Arabic text (breaks glyph shaping)
- Preserve Arabic glyph shaping (never split Arabic characters across elements)
- Support Chinese character clarity (sufficient size + weight)
- Support Cyrillic clarity
- Use font fallback stacks (never assume a font is installed)
- Embed fonts in PDF exports where required
- License certificate typography must be premium and legible
- Guided tour text must be readable in all mandatory scripts
- AI assistant chat text must be readable in all mandatory scripts

### Type scale (Mantine v7 tokens)

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `h1` | 2.25rem (36px) | 700 | Page titles |
| `h2` | 1.875rem (30px) | 700 | Section titles |
| `h3` | 1.5rem (24px) | 600 | Card titles |
| `h4` | 1.25rem (20px) | 600 | Subsection titles |
| `h5` | 1.125rem (18px) | 600 | Small titles |
| `h6` | 1rem (16px) | 600 | Mini titles |
| `body` | 0.875rem (14px) | 400 | Body text |
| `small` | 0.75rem (12px) | 400 | Captions |
| `xs` | 0.625rem (10px) | 500 | Badges |

## Iconography

### Recommended libraries

- `lucide-react` (primary)
- `@tabler/icons-react` (supplementary)

### Icon rules

- Consistent stroke width (1.5px default)
- Consistent size scale (16, 20, 24, 32 px)
- Accessible labels (`aria-label` or `<title>`)
- RTL-aware directional icons (mirror arrows, chevrons)
- Do NOT mirror non-directional icons (lock, search, settings)
- Use semantic color only when meaningful (e.g., red for delete, never for primary action)
- Avoid decorative icon overload

## Motion and Micro-Interactions

Motion must be subtle and premium.

| Motion | Duration | Easing |
|--------|----------|--------|
| Hover elevation | 150ms | ease-out |
| Drawer transition | 200ms | ease-out |
| Modal scale/fade | 200ms | ease-out |
| Notification slide | 200ms | ease-out |
| Table row hover | 150ms | ease-out |
| Button press | 100ms | ease-out |
| License warning entrance | 250ms | ease-out |
| Tour step transition | 200ms | ease-out |
| AI bubble entrance | 250ms | ease-out |

Rules:

- No excessive bouncing
- No distracting animation
- No animation that hides security state (license warnings must be persistent)
- Respect `prefers-reduced-motion` (set `prefers-reduced-motion: reduce` → disable all non-essential motion)
- Use motion to reinforce clarity, not decoration

## Voice and Tone

### Product copy

- Clear
- Confident
- Professional
- Calm
- Precise
- Respectful
- Multilingual
- Non-alarmist except for real security/license risks

### Guided tour copy

- Helpful
- Short
- Reassuring
- Educational
- Non-condescending
- Enterprise-appropriate

### AI assistant copy

- Honest about limitations
- Clear about citations
- Direct about confirmation requirements
- Never claims perfection
- Never provides legal advice as a certified authority
- Never overrides official EDMS records or audit truth

### Forbidden language

- Marketing fluff
- Unsupported claims (especially security/uncrackable claims)
- Vague promises
- Unnecessary jargon
- Overcomplication when simpler design is safer
- English-centric assumptions
- Broken RTL experiences
- Blind AI dependency
- "Uncrackable" claims (spec §5)
- Noisy or childish guided tour language
- Overpromising AI accuracy

## Branding in the Product UI

### Required branded UI areas

- Sidebar logo
- Topbar product name
- Login screen
- Electron splash/loading screen
- Onboarding wizard
- Guided tour welcome screen
- AI assistant bubble
- Empty states
- License status widget
- Admin dashboard header
- Audit report header
- PDF export header/footer
- Evidence package cover page
- Email templates
- Notification center
- Error screens
- Installer welcome screen
- Updater screen
- Marketing page hero

All branded UI text uses `t()` where user-facing. Brand name and logo assets may be static, but all explanatory text must be localized.

## Tenant Branding (Optional)

Smart EDMS may support optional tenant branding:

- Tenant logo
- Tenant name
- Tenant favicon where appropriate
- Tenant color accent where appropriate
- Custom login message
- Custom support link
- Locale flag configuration

Tenant branding must NOT:

- Break accessibility (contrast ratios must still meet WCAG AA)
- Hide Smart EDMS product identity completely (unless white-label explicitly approved)
- Allow unsafe SVG or image injection
- Permit hardcoded tenant data inside frontend code

Tenant branding configuration comes from backend or approved configuration — never hardcoded.

## Branding Deliverables

The branding system must produce:

1. Brand guidelines document (this file)
2. Logo package (primary, compact, monochrome, light, dark, favicon, installer icons)
3. Icon package (app icon, AI avatar, empty-state illustrations, error-state illustrations)
4. Color token definitions (light + dark, semantic states)
5. Typography token definitions (per-locale font stacks)
6. Spacing and radius tokens
7. Mantine theme configuration (TypeScript)
8. Light theme specification
9. Dark theme specification
10. RTL specification (logical CSS properties, Mantine RTL, popover placement)
11. Installer branding (Windows, macOS, Linux)
12. Splash/loading screens
13. Empty-state illustrations
14. Error-state illustrations
15. Guided tour visuals
16. AI assistant visuals
17. Email header/footer templates
18. License certificate design (PDF)
19. Marketing page visual direction
20. Admin panel visual direction
21. Desktop app visual direction
