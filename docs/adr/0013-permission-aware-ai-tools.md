# ADR-0013: Use a permission-aware tool catalog for AI Assistant

- **Status**: Accepted
- **Date**: 2026-08-15
- **Spec Reference**: §11.5 (Permission-Aware Tool Layer), §11.19 (AI Prohibitions)

## Context

The Smart EDMS AI Assistant helps users with natural language questions about documents, workflows, audit data, license state, and UI navigation. The AI must:

1. **Act on behalf of the authenticated user** — only access data the user is authorized to see
2. **Never bypass authorization** — no superuser access
3. **Never access the database directly** — no raw SQL generation
4. **Never reveal restricted document existence** — unless tenant policy explicitly allows
5. **Be auditable** — every tool call logged
6. **Be rate-limited** — prevent abuse
7. **Respect license entitlements** — AI disabled when not licensed

Two architectures were considered:

1. **Direct endpoint access**: AI calls any internal endpoint with the user's JWT
2. **Permission-aware tool catalog**: AI calls only whitelisted tools, each with explicit authorization

## Decision

Use a **permission-aware tool catalog** with 16 explicitly whitelisted tools.

### Tool catalog

Each tool declares:
- `name` (e.g., `documents.search`)
- `description` (for the AI planner)
- `inputSchema` (Zod)
- `requiredPermission` (e.g., `documents.read`)
- `requiresLicenseModule` (e.g., `core-edms`)
- `requiredRoles` (e.g., `['admin', 'auditor']`)
- `execute(input, ctx)` function

### Authorization flow

For every tool call:
1. Validate the tool is in the tenant's `allowedTools` list
2. Validate the user's role is in the tool's `requiredRoles`
3. Validate the user has the specific permission
4. Validate the license entitlement
5. Validate input with Zod
6. Execute the tool
7. Record `AssistantToolInvocation` + global `AuditEvent`

### The 16 tools

- `documents.search`, `documents.getSummary`, `documents.getMetadata`, `documents.getVersions`, `documents.getLockState`
- `workflows.getStatus`, `workflows.getPendingApprovals`
- `audit.getRecentEvents`, `retention.getUpcomingExpiry`, `legalHold.getStatus`, `license.getStatus`
- `help.searchDocumentation`, `ui.navigateTo`, `tour.start`
- `admin.getHealth`, `admin.getSystemUsage`

(Full details in [AI_TOOL_CATALOG.md](../AI_TOOL_CATALOG.md))

## Consequences

### Positive

- **No authorization bypass**: AI can only do what the user could do via the REST API
- **No raw SQL**: No `executeSql` tool exists; prompt injection blocks SQL patterns
- **Auditable**: Every tool call logged with input/output summaries
- **Rate-limitable**: Per-tool rate limits enforceable
- **License-aware**: Tools gated by entitlement modules
- **Data minimization**: Each tool returns only necessary fields (not raw DB rows)
- **Citation-aware**: Tools return document IDs; the AI builds citations only from accessible documents
- **Tenant isolation**: Every tool query scoped by `tenantId` from JWT

### Negative

- **Limited flexibility**: Adding a new AI capability requires adding a new tool (not just updating a prompt)
- **Tool count**: 16 tools is a manageable but non-trivial surface to maintain
- **AI can't do "ad hoc" queries**: If a user asks something no tool covers, the AI must say "I can't help with that"

### Neutral

- The AI planner receives the tool list + descriptions, so it knows what it can do
- Tools are React-less (pure functions) for testability

## Alternatives Considered

### Direct endpoint access with JWT

- **Pros**: Maximum flexibility; AI can call any endpoint
- **Cons**: AI could call destructive endpoints; no per-call audit beyond the endpoint's own audit; hard to rate-limit per tool; prompt injection could trick AI into calling admin endpoints; no data minimization
- **Rejected because**: Violates §11.1 ("The AI acts on behalf of the authenticated user and may only access data that the user is authorized to access") and §11.19 ("AI must not access all endpoints without restriction")

### Natural language to SQL

- **Pros**: Maximum flexibility; AI can answer any question
- **Cons**: SQL injection; data exfiltration; no authorization enforcement; impossible to audit meaningfully; violates §11.19 ("AI must not generate raw SQL")
- **Rejected because**: Violates multiple spec sections

### Function calling with auto-generated tools

- **Pros**: Less boilerplate
- **Cons**: Auto-generated tools may not have proper authorization; hard to audit; unpredictable behavior
- **Rejected because**: Explicit tool catalog is safer and more auditable

## Future Extensibility

New tools can be added by:
1. Creating a new file in `apps/backend/src/modules/ai/tools/`
2. Registering the tool in `tool-catalog.ts`
3. Adding the tool to the tenant's `allowedTools` default list
4. Documenting the tool in [AI_TOOL_CATALOG.md](../AI_TOOL_CATALOG.md)
5. Adding tests in `test/ai-security.test.ts`

Tools should only be added after security review — each tool is a new attack surface.
