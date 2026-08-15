# Smart EDMS — Guided Tour Specification

> Spec reference: §10 (Premium Modern Guided Tour / Tour guidé Requirement).

## Overview

Smart EDMS includes a first-class, premium, modern Guided Tour system. The Guided Tour is:

- Premium
- Calm
- Interactive
- Role-based
- Multilingual
- RTL-aware
- Accessible
- Context-aware
- License-aware
- Permission-aware
- Skippable
- Resumable
- Restartable
- Non-blocking
- Branded
- Free of hardcoded text
- Free of fake production data

The Guided Tour feels like a native Smart EDMS enterprise assistant — not a consumer game, noisy tooltip plugin, or third-party add-on.

## Tour Objectives

The Guided Tour helps users understand:

- What Smart EDMS is
- How to navigate the interface
- How to change language and theme
- How to upload and manage documents
- How metadata works
- How classification works
- How search works
- How workflows and approvals work
- How audit and compliance work
- How retention and legal hold work
- How licensing works
- How scanning works
- How administration works
- How real-time collaboration works
- How the AI Assistant works
- How to get help and restart tours

## Mandatory Tour Types (14)

| # | Code | Module | Audience | Default Trigger |
|---|------|--------|----------|-----------------|
| 1 | `welcome` | onboarding | All new users | First login |
| 2 | `documents` | documents | End users | First visit to Documents page |
| 3 | `search` | search | End users | First search |
| 4 | `records_manager` | retention | Records managers | First visit to Retention |
| 5 | `security_officer` | classification | Security officers | First visit to Classification |
| 6 | `auditor` | audit | Auditors | First visit to Audit |
| 7 | `administrator` | admin | Tenant admins | First visit to Admin |
| 8 | `workflow_designer` | workflow | Workflow designers | First visit to Workflow Designer |
| 9 | `scanner` | scanner | Scanner operators | First visit to Scanner |
| 10 | `license` | license | Tenant admins | License import or activation |
| 11 | `collaboration` | sharing | End users | First share link created |
| 12 | `ai_assistant` | ai | All users (when licensed) | First AI Assistant open |
| 13 | `empty_state` | contextual | All users | Triggered by empty-state action button |
| 14 | `marketing` | marketing | Public visitors | Optional public product tour |

Tours are modular and role-based. Smart EDMS does NOT force one single long tour on all users.

## Tour Delivery Styles

The Guided Tour system supports:

- Coach marks
- Step-by-step overlays
- Interactive checklists
- Contextual module tours
- Empty-state tours
- Restartable tours
- Resumable tours
- Skippable tours
- Command palette launch
- Help menu launch
- First-login onboarding
- Admin-assigned tours
- AI Assistant recommended tours

Optional sandbox/demo mode may exist but must be clearly labeled and disabled by default in production.

## Tour User Controls

Every tour provides:

- Start
- Next
- Previous
- Skip
- Pause
- Resume
- Finish
- Restart later
- Do not show again

All controls are localized using `t()`.

The user can always exit the tour without losing work.

## Tour Progress Display

The tour UI displays:

- Tour title
- Module name
- Current step
- Total steps
- Progress indicator (visual)
- Estimated duration (where appropriate)
- Resume state (where appropriate)

Progress is persisted per user and per tenant. Tour completion state is **real** — never faked.

## Tour Content and i18n

All tour content uses `t()`. Tour definitions store message keys (e.g., `tour.welcome.step1.title`), and the client translates them at render time.

### Required tour namespaces (13)

- `tour.common` — shared controls, progress labels
- `tour.welcome`
- `tour.documents`
- `tour.search`
- `tour.workflows`
- `tour.audit`
- `tour.admin`
- `tour.license`
- `tour.scanner`
- `tour.collaboration`
- `tour.aiAssistant`
- `tour.checklist` — onboarding checklist items
- `tour.marketing` — public product tour

### Translation quality

Tour content must be available in all mandatory locales: en, fr, ar, ru, zh-CN, de.

Machine-only translations are NOT allowed for compliance/license/audit/security/legal-hold/retention/AI-safety tour content. These are reviewed by humans.

## RTL Tour Requirements

For Arabic, the Guided Tour:

- Sets direction to RTL
- Positions popovers correctly using logical `start`/`end` placement
- Respects logical start/end placement (never hardcoded `left`/`right`)
- Preserves logical keyboard navigation order
- Supports accessible focus order
- Avoids hardcoded left/right positioning
- Works correctly with Mantine RTL support

Tour animations and overlays do NOT break Arabic typography or RTL layout.

## Accessibility Requirements

The Guided Tour supports:

- Keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- Escape to close
- Focus management (focus moves to tour step, returns to trigger element on close)
- Screen reader announcements (ARIA live regions)
- Reduced motion preferences (`prefers-reduced-motion: reduce` → disable animations)
- Accessible labels (ARIA labels on all controls)
- Sufficient contrast (WCAG AA)
- Visible focus states
- Non-trapping behavior (user can Tab out of the tour)

The tour does NOT block:

- Security alerts
- License remediation flows
- Emergency access
- Critical error recovery
- Essential navigation

Tour overlays are readable in both light and dark themes.

## Context Awareness

Tour steps only appear when ALL of the following are true:

- The user has permission to access the target feature
- The target module is licensed
- The target UI element exists in the DOM (selector matches)
- The tenant has enabled the tour
- The user has not dismissed the tour (`doNotShowAgain = false`)
- The feature is not disabled by configuration
- The user role is appropriate for the tour

If a tour step is unavailable, the tour engine skips it safely without errors.

## Role-Based Tours

Recommended role mapping (configurable per tenant):

| Role | Tours |
|------|-------|
| End User | Welcome, Document Basics, Search, AI Assistant |
| Records Manager | Retention, Legal Hold, Disposition, Evidence |
| Security Officer | Classification, Audit, Alerts |
| Auditor | Audit Trail, Evidence Export, Provenance |
| Tenant Admin | Admin Setup, Users, License, Branding, Scanner, Tour Configuration, AI Settings |
| Workflow Designer | BPMN/CMMN/DMN, Approvals, Monitoring |
| IT Administrator | Deployment, Scanner, Health, Backups, License |

## Tour Data Model

### TourDefinition

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `code` | string | Tour code (e.g., `welcome`) |
| `module` | string | Feature module |
| `audience` | string[] | Role codes that should see this tour |
| `priority` | int | Sort order (lower = higher priority) |
| `version` | int | Tour version (for content changes) |
| `trigger_type` | string | `first_login` / `first_visit` / `manual` / `event` |
| `enabled` | boolean | Tour is active |
| `license_module_required` | string? | Entitlement module required (e.g., `ai-assistant`) |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### TourStep

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tour_id` | UUID | FK to TourDefinition |
| `step_order` | int | 1-based step number |
| `target_selector` | string | Stable selector: `data-tour="app.sidebar"` |
| `title_key` | string | i18n key for step title |
| `body_key` | string | i18n key for step body |
| `placement` | string | `auto` / `start` / `end` / `top` / `bottom` |
| `requires_permission` | string? | Permission required to see this step |
| `requires_license_module` | string? | Entitlement required to see this step |
| `action_type` | string? | `click` / `hover` / `input` / `navigate` |
| `wait_for_event` | string? | Wait for a specific event before showing |
| `enabled` | boolean | Step is active |

### TourUserState

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | UUID | User |
| `tenant_id` | UUID | Tenant |
| `tour_id` | UUID | Tour |
| `status` | enum | `not_started` / `in_progress` / `completed` / `skipped` / `dismissed` |
| `current_step_id` | UUID? | Last viewed step |
| `started_at` | timestamp? | |
| `completed_at` | timestamp? | |
| `skipped_at` | timestamp? | |
| `do_not_show_again` | boolean | User dismissed permanently |

## Tour API

### User endpoints

- `GET /v1/tours` — list available tours for current user
- `GET /v1/tours/:tourId` — get tour definition with steps
- `POST /v1/tours/:tourId/start` — initialize user state to `IN_PROGRESS`
- `POST /v1/tours/:tourId/complete` — mark `COMPLETED`
- `POST /v1/tours/:tourId/skip` — mark `SKIPPED`
- `POST /v1/tours/:tourId/dismiss` — mark `DISMISSED` + set `doNotShowAgain=true`
- `POST /v1/tours/:tourId/progress` — update `currentStepId`, `currentStepOrder`
- `GET /v1/tours/user-state` — all tour states for current user

### Admin endpoints

- `GET /v1/admin/tours` — all tour definitions
- `PATCH /v1/admin/tours/:tourId` — enable/disable, configure triggers
- `GET /v1/admin/tours/analytics` — privacy-safe aggregated analytics

Tour API responses do NOT contain hardcoded human-readable strings as the primary contract. The client renders tour text using `t()`.

Tour API respects:

- Tenant isolation
- User permissions
- License entitlements
- Audit rules
- Rate limiting

## Tour UI Integration

### Stable tour selectors

The tour engine uses stable selectors via `data-tour="..."` attribute:

| Selector | Element |
|----------|---------|
| `data-tour="app.sidebar"` | Main sidebar |
| `data-tour="app.search"` | Global search input |
| `data-tour="app.languageSwitcher"` | Language switcher |
| `data-tour="app.themeSwitcher"` | Theme switcher |
| `data-tour="documents.upload"` | Document upload button/dropzone |
| `data-tour="documents.table"` | Document list table |
| `data-tour="license.statusWidget"` | License status widget |
| `data-tour="workflow.designerCanvas"` | Workflow designer canvas |
| `data-tour="audit.timeline"` | Audit timeline view |
| `data-tour="scanner.profiles"` | Scanner profiles list |
| `data-tour="help.menu"` | Help menu |
| `data-tour="commandPalette"` | Command palette trigger |
| `data-tour="ai.bubble"` | AI Assistant bubble button |

Fragile selectors based on generated CSS classes are forbidden.

### Engine integration

The tour engine integrates with:

- Mantine theme tokens (uses brand colors, spacing, radius)
- Mantine Popover/Modal/Drawer components
- Command palette (tour launch actions)
- Help menu (tour restart actions)
- Notification center (tour invitations)
- User preferences (auto-start setting)
- Tenant configuration (enabled/disabled per tenant)
- License entitlement state (module-gated tours)
- Permission state (role-gated tours)
- AI Assistant launcher (AI can suggest tours)

### Implementation strategy

The premium long-term implementation is preferred:

- Custom Smart EDMS Tour Engine using Mantine components
- Zustand for client-side state
- XState (where needed) for complex step transitions
- Backend tour configuration (admin-managed)
- Backend tour progress persistence

MVP fallback (driver.js or equivalent) is acceptable ONLY if it satisfies accessibility and RTL requirements. The premium custom engine is the production target.

## Tour Triggers

Tours may be triggered by:

- First login
- First time entering a module
- User clicking Help → Guided Tour
- Admin inviting a new user
- License activation
- Scanner agent first detected
- Workflow designer first opened
- Audit explorer first opened
- AI Assistant first opened
- Empty state action button
- Command palette action
- In-app notification
- AI Assistant recommendation

Automatic triggers are non-intrusive and configurable. The user can always dismiss or postpone.

### Command palette tour actions

The command palette includes:

- Start welcome tour
- Start document tour
- Start search tour
- Start admin tour
- Start workflow tour
- Start license tour
- Start scanner tour
- Start AI Assistant tour
- Restart current tour

All command palette labels use `t()`.

## Tour Analytics

Optional tour analytics may track:

- Tour started
- Step viewed
- Tour completed
- Tour skipped
- Tour dismissed
- Drop-off step
- Duration

Tour analytics:

- Respect tenant privacy settings
- Are disableable per tenant
- Avoid unnecessary personal data
- Are NOT used to lock users out
- Are NOT sold or shared without approval

Analytics never use fake completion data.

## No Mock Data Rule for Tours

The Guided Tour respects the Smart EDMS no-mock rule (spec §20).

### Allowed

- Translated tour labels
- Translated explanations
- Product education content
- UI element highlights
- Real user progress state
- Real feature availability state

### Forbidden in production

- Fake documents
- Fake users
- Fake tenants
- Fake audit logs
- Fake license data
- Fake workflow approvals
- Fake scanner devices
- Fake metrics
- Fake completion state

If a tour requires sample content, it must use:

- A clearly labeled sandbox/demo mode (explicit, isolated, disabled by default in production)
- A neutral illustration (not fake data presented as real)
- An empty state with a real action button (e.g., "Upload your first document")

## Premium Tour Behavior

The Guided Tour feels premium and calm.

### Required qualities

- Subtle animation (200ms transitions, ease-out)
- Clear typography (Mantine tokens, premium fonts)
- Brand-consistent colors (indigo primary, cyan accent)
- Smooth step transitions
- Non-intrusive placement (doesn't cover critical UI)
- Helpful copy (short, reassuring, educational)
- No excessive gamification (no points, badges, levels)
- No noisy popups
- No forced completion (user can always skip)
- Premium empty-state guidance
- Premium onboarding checklist

The tour feels like a calm enterprise assistant — not a consumer onboarding flow.

## Interactive Checklists

Smart EDMS supports interactive onboarding checklists:

| # | Item | Real-state check |
|---|------|------------------|
| 1 | Choose language | `user.preferences.locale != null` |
| 2 | Choose theme | `user.preferences.theme != null` |
| 3 | Complete welcome tour | `TourUserState[welcome].status == 'completed'` |
| 4 | Upload first document | `count(documents where createdByUserId == user.id) > 0` |
| 5 | Add metadata | `count(metadata_values where document.createdBy == user.id) > 0` |
| 6 | Run first search | (tracked via audit event `search.executed`) |
| 7 | Preview document | (tracked via audit event `document.preview`) |
| 8 | Share or request approval | `count(share_links where createdBy == user.id) > 0 OR count(approvals where approverId == user.id) > 0` |
| 9 | View audit trail | (tracked via audit event `audit.viewed`) |
| 10 | Review license status | (tracked via audit event `license.status.viewed`) |
| 11 | Try AI Assistant (where enabled) | `count(assistant_sessions where userId == user.id) > 0` |

Checklist completion is based on **real backend state** — never faked.

## Empty-State Tours

When a module has no data, the empty state offers helpful actions:

- Start guided tour
- Learn how this module works
- Ask AI Assistant
- Create your first document
- Upload a document
- Configure scanner profile
- Review license status

Empty states do NOT display fake records.

## Marketing Page Guided Tour

The public marketing page includes an optional product tour:

- Screenshots (real product UI, no mockups presented as real)
- Approved illustrations
- Short videos (where licensed)
- Interactive feature tabs
- Localized feature explanations

The marketing tour does NOT use:

- Fake customer names
- Fake metrics
- Fake testimonials
- Fabricated compliance claims
- Mock business data presented as real data

The marketing tour supports all mandatory locales and Arabic RTL.

## Tour Administration

Administrators can:

- Enable/disable tours globally
- Enable/disable tours per role
- Enable/disable tours per module
- Restart tours for themselves
- View tour version
- Configure tour triggers (where appropriate)
- View privacy-safe tour analytics (where enabled)
- Localize tour content through translation workflow

Tour administration is audited.

## Definition of Done for Guided Tour

The Guided Tour is complete only when:

- [ ] All 14 tour types are defined
- [ ] Tour is skippable
- [ ] Tour is resumable
- [ ] Tour is restartable
- [ ] Tour is accessible by keyboard
- [ ] Tour respects reduced motion
- [ ] Tour respects permissions
- [ ] Tour respects license entitlements
- [ ] Tour avoids fake data
- [ ] Tour uses stable selectors
- [ ] Tour works in RTL (Arabic)
- [ ] Tour works in light and dark modes
- [ ] Tour uses `t()` for all content
- [ ] Tour progress is persisted
- [ ] Tour analytics are privacy-safe
- [ ] Admins can enable/disable tours
- [ ] All mandatory locales have tour translations
- [ ] Tour content is reviewed by humans for compliance/security/legal strings
