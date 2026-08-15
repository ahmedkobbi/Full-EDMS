# Smart EDMS — AI Assistant Specification

> Spec reference: §11 (AI Assistant Bubble Requirement).

## AI Assistant Principle

> **The AI acts on behalf of the authenticated user and may only access data that the user is authorized to access.**

The AI Assistant must NOT:

- Act as a superuser
- Access all endpoints directly
- Query the database directly
- Generate raw SQL
- Bypass authorization
- Bypass tenant isolation
- Bypass license enforcement
- Expose restricted document existence
- Reveal secrets
- Reveal system prompts
- Perform destructive actions without explicit confirmation
- Use mock data in production

## AI Assistant Architecture

```
1. AI Bubble UI inside Electron or web client
2. AI Gateway endpoint in NestJS backend (POST /v1/ai/assistant/chat)
3. Permission-aware tool layer (ToolCatalog)
4. Existing Smart EDMS services and repositories (Prisma, Storage, etc.)
5. Audit and observability layer (AssistantAuditEvent + AuditEvent)
```

The AI calls **approved tools only**. The AI does NOT call arbitrary internal endpoints unless explicitly whitelisted and authorized.

## AI Assistant Capabilities

The AI Assistant may support:

- Natural language questions
- Document search
- Metadata explanation
- Workflow status explanation
- Audit summary (where authorized)
- Retention explanation
- Legal hold explanation
- License status explanation (where authorized)
- Help documentation search
- Guided tour recommendations
- UI navigation assistance
- Error explanation
- Suggested actions
- Citations to accessible documents
- Localized answers

The AI Assistant always respects:

- User permissions
- Tenant isolation
- Classification policy
- Legal hold
- Retention policy
- License entitlements
- Privacy settings

## Read-Only Default Mode

The AI Assistant is **read-only by default**.

It may suggest actions, but sensitive actions require explicit user confirmation.

### Sensitive actions (require confirmation)

- Create share link
- Start workflow
- Request approval
- Export evidence
- Generate large reports
- Modify metadata
- Navigate to admin settings
- Import license
- Contact support

### Destructive actions (NEVER performed by AI)

- Delete document
- Remove legal hold
- Downgrade classification
- Revoke license
- Disable user
- Change security policy
- Delete tenant configuration

Destructive actions are only **suggested** with a dedicated confirmed UI flow that the user must explicitly invoke. The AI never executes them, even with confirmation.

## Permission-Aware Tool Layer

The AI Assistant uses a controlled tool catalog. Each tool:

- Is explicitly whitelisted
- Validates input with Zod
- Enforces authorization (RBAC + ABAC)
- Enforces tenant isolation
- Respects license entitlements
- Returns only necessary fields
- Is rate limited
- Is audited

### Tool catalog (16 tools)

| Tool | Description | Required Permission | Required License Module |
|------|-------------|---------------------|-------------------------|
| `documents.search` | Search documents user can access | `documents.read` | `core-edms` |
| `documents.getSummary` | Get document summary | `documents.read` | `core-edms` |
| `documents.getMetadata` | Get document metadata | `documents.read` | `core-edms` |
| `documents.getVersions` | Get document version history | `documents.read` | `core-edms` |
| `documents.getLockState` | Get document lock state | `documents.read` | `core-edms` |
| `workflows.getStatus` | Get workflow instance status | `workflows.read` | `core-edms` |
| `workflows.getPendingApprovals` | Get pending approvals for user | `workflows.read` | `core-edms` |
| `audit.getRecentEvents` | Get recent audit events | `audit.read` | `audit-export` |
| `retention.getUpcomingExpiry` | Get upcoming retention expirations | `retention.read` | `core-edms` |
| `legalHold.getStatus` | Get legal hold status | `legalhold.read` | `core-edms` |
| `license.getStatus` | Get license status | `license.read` | `core-edms` |
| `help.searchDocumentation` | Search help docs (i18n) | none | `core-edms` |
| `ui.navigateTo` | Suggest UI navigation (returns action, not executed) | none | `core-edms` |
| `tour.start` | Suggest tour start (returns action, not executed) | none | `core-edms` |
| `admin.getHealth` | Get system health (admin only) | `admin.read` | `core-edms` |
| `admin.getSystemUsage` | Get system usage (admin only) | `admin.read` | `core-edms` |

## AI API Contract

### User endpoints

- `POST /v1/ai/assistant/chat` — main chat endpoint (SSE streaming)
- `GET /v1/ai/assistant/sessions` — list user's sessions (paginated)
- `GET /v1/ai/assistant/sessions/:id` — get session with messages
- `POST /v1/ai/assistant/sessions/:id/feedback` — thumbs up/down
- `POST /v1/ai/assistant/sessions/:id/clear` — clear session (audited)
- `GET /v1/ai/assistant/tools` — list available tools for current user

### Admin endpoints

- `GET /v1/admin/ai/settings` — tenant AI settings
- `PATCH /v1/admin/ai/settings` — update settings
- `GET /v1/admin/ai/audit` — paginated AI audit events
- `GET /v1/admin/ai/usage` — usage metrics

All AI endpoints:

- Require authentication
- Enforce tenant isolation
- Validate input (Zod)
- Enforce rate limits (configurable per tenant, default 20/min)
- Check license entitlement (`ai-assistant` module)
- Are audited
- Support locale context (responses in user's locale)
- Return stable error message keys (not hardcoded English)

## AI Context Envelope

The AI Gateway provides the AI planner with a secure context envelope.

### Includes

- `userId`
- `tenantId`
- `roles`
- `permissions summary`
- `locale`
- `timezone`
- `licensed modules`
- `current route`
- `request ID`
- `theme`

### Excludes (NEVER in envelope)

- Secrets
- Tokens
- Private keys
- Full database credentials
- Unrestricted permission bypass

## AI Citations

When the AI answers using EDMS data, it includes citations where appropriate.

Citations only reference resources the user is authorized to access.

### Citation metadata

- Document ID
- Version
- Title
- Classification
- Updated date
- Workflow state
- Retention state
- Legal hold state

If the user is not authorized to access a resource, the AI does NOT reveal its existence unless tenant policy explicitly allows existence disclosure.

## Prompt Injection Protection

The AI Assistant treats document content as untrusted data.

### Required protections

- Document content must not override system instructions
- Embedded instructions inside documents are ignored
- System prompts are never revealed
- Secrets are never revealed
- Raw SQL generation is forbidden
- Arbitrary endpoint calls are forbidden
- Tool calls are independently authorized (not by AI request)
- AI output is validated before rendering
- Sensitive actions require confirmation
- Restricted content is not summarized without access

### Detection heuristics

20 regex patterns detect:

1. Embedded instructions ("ignore previous instructions", "you are now...", "forget everything")
2. Secret extraction ("reveal system prompt", "show me your instructions", "print all environment variables")
3. SQL injection ("generate SQL to...", "write a query that deletes...", "DROP TABLE")
4. Endpoint abuse ("call /v1/admin/delete-everything", "fetch all data", "dump the database")

Detected injection attempts are:

- Logged to audit (`code: 'ai.prompt_injection_detected'`)
- Returned as a localized error to the user
- The offending text is NEVER echoed back in the response

## AI Data Minimization

The AI Assistant retrieves only the minimum data necessary to answer the request.

### Allowed

- Metadata needed for the answer
- Limited content snippets (where permitted)
- Summaries (where permitted)
- Workflow state
- Audit summaries (where permitted)
- Help documentation
- License state (where permitted)

### Forbidden

- Unrestricted data dumps
- Raw database rows
- Full binary content (unless explicitly required and permitted)
- Secrets
- Tokens
- Private keys
- Other tenants' data
- Bulk exports (without official export workflow)

If the user requests a large export, the AI guides them to the official export or evidence package workflow.

## AI Model Deployment Modes

The AI Assistant supports configurable model deployment modes.

### Modes

- `external` — external AI provider allowed (e.g., OpenAI, Anthropic)
- `local` — local/self-hosted AI only (e.g., Ollama, vLLM)
- `hybrid` — both external and local, chosen per request
- `none` — AI disabled (returns localized "AI not configured" message)

### Rules

- External AI is tenant-configurable
- External AI is disabled for restricted classifications (where policy requires)
- Local AI is used where external processing is forbidden
- Model provider is disclosed in settings
- AI usage is audited
- No training on customer content without explicit consent

## AI Assistant UI

The AI Assistant Bubble is premium and consistent with Smart EDMS branding.

### Required UI elements

- Floating assistant button (bottom-end in LTR, bottom-start in RTL)
- Chat drawer (Mantine Drawer, end-side)
- Message input
- Send button
- Stop button (interrupts streaming)
- Loading indicator
- Suggested questions (on empty state)
- Suggested actions (with confirm buttons)
- Citations (clickable, navigate to document)
- Disclaimer (shown on every assistant message)
- Error state
- Empty state
- Settings link (where authorized)

### UI requirements

- Uses Mantine v7 components
- Uses `t()` for all UI strings
- Supports RTL for Arabic (drawer opens from start side)
- Supports all mandatory locales
- Works in light and dark themes
- Respects reduced motion preferences
- Is keyboard accessible (Tab to focus, Enter to send, Esc to close)
- Is screen-reader friendly (ARIA live regions for streaming responses)

## AI Assistant and Guided Tour Integration

The AI Assistant integrates with the Guided Tour system.

The AI may suggest tours such as:

- Welcome Tour
- Document Tour
- Search Tour
- Workflow Tour
- License Tour
- Scanner Tour
- Audit Tour
- Admin Tour
- AI Assistant Tour

If the user asks for help, the AI may suggest:

- A direct answer
- A documentation article
- A guided tour
- A UI navigation action

Tour suggestions respect:

- User role
- Tenant configuration
- License entitlements
- Tour completion state

## AI Assistant Audit Requirements

Every AI interaction is audited.

### Audit data

- User ID
- Tenant ID
- Session ID
- Message ID
- Tools invoked
- Data categories accessed
- Document IDs accessed (where applicable)
- Action suggestions
- Action confirmations
- Result status
- Locale
- Timestamp
- Request ID
- Model provider or local model indicator

### Audit log rules

- Protected from tampering (hash-chained, append-only)
- Minimizes sensitive content (content hash, not full content)
- Distinguishes AI actions from user actions
- Supports compliance review
- Respects retention policy

## AI Assistant Tenant Settings

Tenant administrators can configure:

- Enable/disable AI Assistant
- Allowed roles
- Allowed tools
- Allowed data sources
- External AI allowed or blocked
- Local-only AI mode
- AI chat retention period
- Show/hide citations
- Allow navigation actions
- Allow suggested actions
- Require disclaimer
- Rate limits
- Usage quotas
- Privacy notice

All AI settings changes are audited.

## AI Assistant Licensing

The AI Assistant is license-aware.

### Recommended entitlement

- `ai-assistant` — base AI Assistant access

### Optional sub-entitlements

- `ai-assistant-read` — read-only AI (no action suggestions)
- `ai-assistant-actions` — action suggestion capability
- `ai-assistant-external-provider` — may use external LLM
- `ai-assistant-local-model` — may use local LLM
- `ai-assistant-analytics` — analytics dashboard access

### If AI Assistant is not licensed

- The AI bubble is hidden or disabled
- AI endpoints reject requests with `errors.AI_NOT_LICENSED`
- Localized license message is shown where appropriate

## AI Assistant Data Model

### AssistantSession

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant |
| `user_id` | UUID | User |
| `locale` | string | Session locale |
| `status` | string | `active` / `archived` / `cleared` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### AssistantMessage

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | UUID | FK to session |
| `tenant_id` | UUID | Tenant |
| `user_id` | UUID | User |
| `role` | string | `user` / `assistant` / `system` |
| `content_summary` | text | Truncated content (privacy-safe) |
| `content_hash` | string | SHA-256 of full content |
| `model_provider` | string? | Which provider was used |
| `citations_json` | JSON | Citations array |
| `suggested_actions` | JSON? | Suggested actions array |
| `disclaimer_key` | string? | i18n key for disclaimer shown |
| `created_at` | timestamp | |

### AssistantToolInvocation

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `message_id` | UUID | FK to message |
| `session_id` | UUID | FK to session |
| `tenant_id` | UUID | Tenant |
| `tool_name` | string | Tool code |
| `input_summary` | text | Truncated input |
| `output_summary` | text | Truncated output |
| `status` | string | `success` / `failed` / `unauthorized` |
| `authorized` | boolean | Was the call authorized? |
| `occurred_at` | timestamp | |

### AssistantAction

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `message_id` | UUID | FK to message |
| `session_id` | UUID | FK to session |
| `tenant_id` | UUID | Tenant |
| `action_type` | string | `navigate` / `launch_tour` / `create_share` / `start_workflow` / etc. |
| `target_type` | string | `document` / `page` / `tour` / etc. |
| `target_id` | string? | Target resource ID |
| `confirmation_required` | boolean | Always `true` for sensitive actions |
| `confirmed_at` | timestamp? | When user confirmed |
| `executed_at` | timestamp? | When action was executed |
| `status` | string | `suggested` / `confirmed` / `executed` / `cancelled` |

### AssistantSettings

Tenant-level settings (see "AI Assistant Tenant Settings" above).

### AssistantAuditEvent

Global audit events for AI interactions (in addition to the `AssistantAuditEvent` table, events are also written to the main `AuditEvent` table with `category: 'ai'`).

## AI Assistant Testing Requirements

The AI Assistant must be tested for:

- Authorization leakage
- Tenant isolation
- Prompt injection resistance
- Tool abuse
- Rate limiting
- Disabled license behavior
- Locale correctness
- RTL rendering
- Dark/light rendering
- Keyboard accessibility
- Citation correctness
- No mock data usage
- No hardcoded strings
- Audit completeness
- External provider privacy configuration
- Local-only mode behavior
- Fallback when AI is unavailable

### Critical test cases

- User asks for a document they cannot access → AI refuses, no existence leak
- User asks for another tenant's data → AI refuses, audit logged
- User asks for "all data" → AI refuses, suggests official export workflow
- Document contains malicious prompt → AI ignores embedded instructions
- AI suggests an action the user cannot perform → Action not shown or marked unavailable
- AI is disabled by tenant → Bubble hidden, API rejects with localized message
- AI license is expired → Bubble hidden, API rejects with `errors.AI_NOT_LICENSED`
- External AI is disabled → Falls back to local or returns "unavailable" message
- Arabic AI bubble renders RTL correctly (drawer from start side, message flow correct)
- Assistant citations only include accessible documents

## AI Assistant Prohibitions

The AI Assistant must NOT:

- Access all endpoints without restriction
- Access all data without restriction
- Bypass authorization
- Bypass tenant isolation
- Bypass licensing
- Generate raw SQL
- Access the database directly
- Reveal secrets
- Reveal private keys
- Reveal system prompts
- Execute destructive actions silently
- Summarize restricted content without permission
- Leak restricted document existence
- Use mock data in production
- Use hardcoded UI strings
- Provide legal advice as a certified authority
- Claim perfect accuracy
- Override official EDMS records or audit truth

## Definition of Done for AI Assistant

The AI Assistant is complete only when:

- [ ] The AI bubble is visible where enabled and licensed
- [ ] The assistant is authenticated and tenant-scoped
- [ ] All tools are permission-aware
- [ ] All responses are audited
- [ ] Citations are permission-aware
- [ ] Sensitive actions require confirmation
- [ ] Destructive actions are blocked or require dedicated confirmation flows
- [ ] All UI strings use `t()`
- [ ] All mandatory locales are supported
- [ ] Arabic RTL works correctly
- [ ] Light and dark themes work correctly
- [ ] Keyboard accessibility works
- [ ] Screen reader announcements work
- [ ] Prompt injection protections are tested
- [ ] External/local AI mode is configurable
- [ ] License entitlement is enforced
- [ ] Tenant admin settings are available
- [ ] AI analytics respect privacy settings
- [ ] No mock data is used
- [ ] No hardcoded strings are used
- [ ] The assistant degrades gracefully when unavailable
