# Smart EDMS — AI Tool Catalog

> Spec reference: §11.5 (Permission-Aware Tool Layer), §26.35 (AI Tool Catalog deliverable).
>
> This document specifies all 16 AI Assistant tools, their input/output schemas, authorization requirements, and audit behavior.

## Tool Layer Architecture

```
AI Bubble UI (Electron)
    │
    ▼
POST /v1/ai/assistant/chat
    │
    ▼
AiService.chat():
    1. Validate tenant AI settings (enabled, allowed roles)
    2. Check license entitlement (ai-assistant module)
    3. Apply rate limit (per-user, configurable)
    4. Apply daily quota
    5. Build secure AiContextEnvelope
    6. Detect prompt injection
    7. Resolve or create session
    8. Persist user message
    9. Call model provider
    10. Dispatch tool calls through ToolCatalog
    11. Build citations (only accessible documents)
    12. Persist assistant message + tool invocations + suggested actions
    13. Emit audit event
    14. Stream response (SSE)
```

Every tool call:
1. Validates the tool is in the tenant's `allowedTools` list
2. Validates the user's role is in the tool's `requiredRoles`
3. Validates the user has the specific permission for the resource
4. Validates the license entitlement for the tool's `requiresLicenseModule`
5. Records an `AssistantToolInvocation` audit row
6. Records a global `AuditEvent` with `code: 'ai.tool_invoked'`

## Authorization Model

Each tool declares:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `ToolName` | Tool identifier (e.g., `documents.search`) |
| `description` | `string` | Human-readable description (for AI planner) |
| `inputSchema` | `z.ZodSchema` | Zod schema for input validation |
| `requiredPermission` | `string` | Permission code (e.g., `documents.read`) — empty string for no permission |
| `requiresLicenseModule` | `EntitlementModule?` | Optional license module requirement |
| `requiredRoles` | `string[]` | Roles allowed to invoke (e.g., `['admin']`) |

Authorization is checked in this order:
1. License module check (if `requiresLicenseModule` is set)
2. Role check (if `requiredRoles` is non-empty)
3. Permission check (if `requiredPermission` is non-empty)
4. Tenant `allowedTools` check
5. Input validation (Zod)

If any check fails, the tool invocation is recorded with `authorized: false` and `status: 'unauthorized'`, and the AI receives an error message (localized).

## Tool Catalog (16 tools)

### 1. `documents.search`

Search documents the user can access.

| Field | Value |
|-------|-------|
| **Required permission** | `documents.read` |
| **Required license module** | `core-edms` |
| **Required roles** | (none — all authenticated users) |
| **Returns** | Document search results with citations |

**Input schema:**
```typescript
{
  query: string;              // max 500 chars
  filters?: {
    documentType?: string;
    classificationId?: string;
    createdByUserId?: string;
    createdFrom?: string;     // ISO date
    createdTo?: string;       // ISO date
    tags?: string[];
  };
  limit?: number;             // default 10, max 50
  cursor?: string;            // pagination cursor
}
```

**Output schema:**
```typescript
{
  results: Array<{
    documentId: string;
    title: string;
    snippet: string;          // max 200 chars
    classificationId: string | null;
    updatedAt: string;        // ISO date
    score: number;            // relevance 0-1
  }>;
  total: number;
  cursor: string | null;
}
```

**Authorization notes:**
- Results filtered by `tenantId` from JWT
- Results filtered by user's effective permissions (classification level, share access, etc.)
- Does NOT leak existence of documents the user cannot access (spec §9.10)

**Audit:** `tool_name: 'documents.search'`, `input_summary: '{query, filters}'`, `output_summary: '{resultCount, total}'`

---

### 2. `documents.getSummary`

Get a summary of a specific document.

| Field | Value |
|-------|-------|
| **Required permission** | `documents.read` |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Document summary (max 500 chars) |

**Input schema:**
```typescript
{
  documentId: string;         // UUID
  maxLength?: number;         // default 500, max 2000
}
```

**Output schema:**
```typescript
{
  documentId: string;
  title: string;
  summary: string;
  classificationId: string | null;
  version: number;
}
```

**Authorization notes:**
- Verifies user can access the document (tenant + permissions + classification)
- If user cannot access, returns `unauthorized` — does NOT reveal document existence
- Summary is generated from the latest version's content
- Restricted content is NOT summarized without explicit access (spec §11.10)

**Audit:** `tool_name: 'documents.getSummary'`, `input_summary: '{documentId}'`, `output_summary: '{summaryLength}'`

---

### 3. `documents.getMetadata`

Get metadata for a specific document.

| Field | Value |
|-------|-------|
| **Required permission** | `documents.read` |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Document metadata fields |

**Input schema:**
```typescript
{
  documentId: string;         // UUID
}
```

**Output schema:**
```typescript
{
  documentId: string;
  title: string;
  description: string | null;
  documentType: string | null;
  sourceSystem: string | null;
  contentLanguage: string | null;
  textDirection: string | null;
  classification: {
    id: string;
    code: string;
    nameKey: string;
    sensitivityLevel: number;
  } | null;
  sensitivityLevel: number;
  tags: string[];
  metadata: Record<string, unknown>;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}
```

**Authorization notes:**
- Verifies user can access the document
- Does not reveal restricted document existence

**Audit:** `tool_name: 'documents.getMetadata'`, `input_summary: '{documentId}'`, `output_summary: '{fieldCount}'`

---

### 4. `documents.getVersions`

Get version history for a document.

| Field | Value |
|-------|-------|
| **Required permission** | `documents.read` |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Paginated version list |

**Input schema:**
```typescript
{
  documentId: string;
  limit?: number;             // default 10, max 50
  cursor?: string;
}
```

**Output schema:**
```typescript
{
  versions: Array<{
    versionId: string;
    versionNumber: number;
    sizeBytes: string;        // BigInt as string
    checksum: string;
    mime: string;
    originalFilename: string;
    changeReason: string | null;
    createdBy: { id: string; firstName: string; lastName: string } | null;
    createdAt: string;
  }>;
  total: number;
  cursor: string | null;
}
```

**Authorization notes:**
- Verifies user can access the document
- Does NOT return full binary content (spec §11.10 — data minimization)
- Version comparison must not load full binaries unnecessarily (spec §9.6)

**Audit:** `tool_name: 'documents.getVersions'`, `input_summary: '{documentId}'`, `output_summary: '{versionCount}'`

---

### 5. `documents.getLockState`

Get the lock state of a document.

| Field | Value |
|-------|-------|
| **Required permission** | `documents.read` |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Lock state + lock holder |

**Input schema:**
```typescript
{
  documentId: string;
}
```

**Output schema:**
```typescript
{
  documentId: string;
  isLocked: boolean;
  lockedBy: { id: string; firstName: string; lastName: string } | null;
  lockedAt: string | null;
}
```

**Audit:** `tool_name: 'documents.getLockState'`, `input_summary: '{documentId}'`, `output_summary: '{isLocked}'`

---

### 6. `workflows.getStatus`

Get the status of a workflow instance.

| Field | Value |
|-------|-------|
| **Required permission** | `workflows.read` |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Workflow instance + current step |

**Input schema:**
```typescript
{
  workflowInstanceId: string;
}
```

**Output schema:**
```typescript
{
  instanceId: string;
  definitionCode: string;
  status: 'PENDING' | 'RUNNING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'FAILED' | 'COMPLETED';
  currentStep: {
    stepKey: string;
    name: string;
    status: string;
    assignee: { id: string; firstName: string; lastName: string } | null;
    dueAt: string | null;
  } | null;
  startedAt: string;
  completedAt: string | null;
  dueAt: string | null;
}
```

**Authorization notes:**
- Verifies user can access the workflow instance (tenant + assignee or initiator)

**Audit:** `tool_name: 'workflows.getStatus'`, `input_summary: '{workflowInstanceId}'`, `output_summary: '{status}'`

---

### 7. `workflows.getPendingApprovals`

Get pending approvals for the current user.

| Field | Value |
|-------|-------|
| **Required permission** | `workflows.read` |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Paginated pending approvals |

**Input schema:**
```typescript
{
  limit?: number;             // default 10, max 50
  cursor?: string;
}
```

**Output schema:**
```typescript
{
  approvals: Array<{
    approvalId: string;
    instanceId: string;
    definitionCode: string;
    stepName: string;
    documentTitle: string | null;
    dueAt: string | null;
    requestedAt: string;
  }>;
  total: number;
  cursor: string | null;
}
```

**Authorization notes:**
- Only returns approvals where `approverId === req.user.sub`
- AI may identify pending approvals where authorized (spec §11.3)
- AI must NOT approve, reject, delegate, or cancel workflows silently (spec §11.4, §11.19)

**Audit:** `tool_name: 'workflows.getPendingApprovals'`, `input_summary: '{}'`, `output_summary: '{count}'`

---

### 8. `audit.getRecentEvents`

Get recent audit events (summary only — no sensitive content).

| Field | Value |
|-------|-------|
| **Required permission** | `audit.read` |
| **Required license module** | `audit-export` |
| **Required roles** | `['admin', 'auditor', 'security-officer']` |
| **Returns** | Paginated audit event summaries |

**Input schema:**
```typescript
{
  limit?: number;             // default 20, max 100
  category?: string;          // e.g., 'auth', 'document', 'workflow'
  result?: 'allow' | 'deny';
  from?: string;              // ISO date
  to?: string;                // ISO date
}
```

**Output schema:**
```typescript
{
  events: Array<{
    eventId: string;
    category: string;
    code: string;
    result: 'allow' | 'deny';
    resourceType: string | null;
    resourceId: string | null;
    actor: { id: string; firstName: string; lastName: string } | null;
    occurredAt: string;
  }>;
  total: number;
  cursor: string | null;
}
```

**Authorization notes:**
- Returns aggregate summaries, NOT full audit content (spec §11.10)
- Does NOT include `metadata`, `reason`, `ipAddress`, `userAgent` (minimization)
- AI may summarize audit events where authorized (spec §11.3)
- AI must NOT alter audit logs (spec §11.19)

**Audit:** `tool_name: 'audit.getRecentEvents'`, `input_summary: '{category, result, from, to}'`, `output_summary: '{count}'`

---

### 9. `retention.getUpcomingExpiry`

Get documents with upcoming retention expiry.

| Field | Value |
|-------|-------|
| **Required permission** | `retention.read` |
| **Required license module** | `core-edms` |
| **Required roles** | `['admin', 'records-manager', 'auditor']` |
| **Returns** | Documents expiring within the specified window |

**Input schema:**
```typescript
{
  withinDays?: number;        // default 30, max 365
  limit?: number;             // default 20, max 100
}
```

**Output schema:**
```typescript
{
  documents: Array<{
    documentId: string;
    title: string;
    retentionScheduleCode: string;
    scheduledDispositionAt: string;
    dispositionAction: 'delete' | 'review' | 'archive';
    legalHoldActive: boolean;
  }>;
  total: number;
}
```

**Authorization notes:**
- AI may identify upcoming expiry where authorized (spec §11.3)
- AI must NOT remove legal hold or override retention (spec §11.19)
- Documents under legal hold are flagged but not auto-disposed

**Audit:** `tool_name: 'retention.getUpcomingExpiry'`, `input_summary: '{withinDays}'`, `output_summary: '{count}'`

---

### 10. `legalHold.getStatus`

Get legal hold status for a document or tenant.

| Field | Value |
|-------|-------|
| **Required permission** | `legalhold.read` |
| **Required license module** | `core-edms` |
| **Required roles** | `['admin', 'records-manager', 'auditor']` |
| **Returns** | Legal hold status |

**Input schema:**
```typescript
{
  documentId?: string;        // if provided, returns holds for that document
  // if omitted, returns all active holds for the tenant
  limit?: number;             // default 20, max 100
}
```

**Output schema:**
```typescript
{
  holds: Array<{
    holdId: string;
    code: string;
    name: string;
    reason: string;
    caseReference: string | null;
    placedBy: { id: string; firstName: string; lastName: string };
    placedAt: string;
    releasedAt: string | null;
    isActive: boolean;
    documentCount?: number;   // only when documentId is omitted
  }>;
  total: number;
}
```

**Authorization notes:**
- AI may explain retention state (spec §11.3)
- AI must NOT remove legal hold or override retention (spec §11.19)

**Audit:** `tool_name: 'legalHold.getStatus'`, `input_summary: '{documentId?}'`, `output_summary: '{count}'`

---

### 11. `license.getStatus`

Get the current license status.

| Field | Value |
|-------|-------|
| **Required permission** | `license.read` |
| **Required license module** | `core-edms` |
| **Required roles** | `['admin']` |
| **Returns** | License state + entitlements |

**Input schema:**
```typescript
{} // no input — uses tenant from JWT
```

**Output schema:**
```typescript
{
  state: 'valid' | 'expiring_soon' | 'expired_grace' | 'grace_exhausted' | 'extended_remediation' | 'invalid';
  licenseId: string | null;
  expiresAt: string | null;
  gracePeriodDays: number | null;
  entitlements: string[];
  limits: {
    maxUsers: number | null;
    maxDevices: number | null;
    maxStorageBytes: string | null;
    maxDocuments: number | null;
  } | null;
}
```

**Authorization notes:**
- AI may explain license state where authorized (spec §11.3)
- AI must NOT reveal secrets or private keys (spec §11.19)

**Audit:** `tool_name: 'license.getStatus'`, `input_summary: '{}'`, `output_summary: '{state}'`

---

### 12. `help.searchDocumentation`

Search the help documentation (i18n namespaces).

| Field | Value |
|-------|-------|
| **Required permission** | (none — accessible to all authenticated users) |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Matching help articles |

**Input schema:**
```typescript
{
  query: string;              // max 200 chars
  locale?: string;            // default from JWT
  limit?: number;             // default 5, max 20
}
```

**Output schema:**
```typescript
{
  articles: Array<{
    namespace: string;        // e.g., 'documents', 'workflow'
    key: string;              // e.g., 'upload.title'
    title: string;            // translated
    snippet: string;          // translated, max 200 chars
  }>;
  total: number;
}
```

**Authorization notes:**
- Searches the bundled i18n resources from `@smart-edms/i18n`
- Returns localized content matching the user's locale
- No sensitive content in help docs

**Audit:** `tool_name: 'help.searchDocumentation'`, `input_summary: '{query, locale}'`, `output_summary: '{count}'`

---

### 13. `ui.navigateTo`

Suggest a UI navigation action (returns an action — never executes server-side).

| Field | Value |
|-------|-------|
| **Required permission** | (none) |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Suggested navigation action |

**Input schema:**
```typescript
{
  route: string;              // e.g., '/documents/abc-123'
  labelKey: string;           // i18n key for the action label
}
```

**Output schema:**
```typescript
{
  actionType: 'navigate';
  targetType: 'route';
  targetId: string;           // the route
  labelKey: string;
  confirmationRequired: true; // always true — client must execute
}
```

**Authorization notes:**
- Returns a suggested action; the CLIENT executes the navigation (spec §11.4)
- Server NEVER executes navigation
- Route must be in the allowlist (prevents open redirect)
- If tenant setting `allowNavigationActions === false`, the tool returns an empty result

**Audit:** `tool_name: 'ui.navigateTo'`, `input_summary: '{route}'`, `output_summary: '{suggested}'`

---

### 14. `tour.start`

Suggest starting a guided tour (returns an action — never executes server-side).

| Field | Value |
|-------|-------|
| **Required permission** | (none) |
| **Required license module** | `core-edms` |
| **Required roles** | (none) |
| **Returns** | Suggested tour start action |

**Input schema:**
```typescript
{
  tourCode: string;           // e.g., 'welcome', 'documents'
}
```

**Output schema:**
```typescript
{
  actionType: 'launch_tour';
  targetType: 'tour';
  targetId: string;           // the tour code
  confirmationRequired: true;
}
```

**Authorization notes:**
- Returns a suggested action; the CLIENT launches the tour (spec §11.4)
- Verifies the tour exists, is enabled for the tenant, and the user has the required role/audience
- Verifies the tour's `licenseModuleRequired` (if set) is entitled
- Server NEVER starts the tour

**Audit:** `tool_name: 'tour.start'`, `input_summary: '{tourCode}'`, `output_summary: '{suggested}'`

---

### 15. `admin.getHealth`

Get system health (admin only).

| Field | Value |
|-------|-------|
| **Required permission** | `admin.read` |
| **Required license module** | `core-edms` |
| **Required roles** | `['admin', 'it-administrator']` |
| **Returns** | System health status |

**Input schema:**
```typescript
{}
```

**Output schema:**
```typescript
{
  db: 'ok' | 'down';
  redis: 'ok' | 'down';
  timestamp: string;
}
```

**Audit:** `tool_name: 'admin.getHealth'`, `input_summary: '{}'`, `output_summary: '{db, redis}'`

---

### 16. `admin.getSystemUsage`

Get system usage metrics (admin only).

| Field | Value |
|-------|-------|
| **Required permission** | `admin.read` |
| **Required license module** | `core-edms` |
| **Required roles** | `['admin', 'it-administrator']` |
| **Returns** | Usage metrics |

**Input schema:**
```typescript
{}
```

**Output schema:**
```typescript
{
  counts: {
    users: number;
    documents: number;
    workflows: number;
    auditEvents: number;
  };
  storageBytes: string;       // BigInt as string
  redisMemoryInfo: string;
  timestamp: string;
}
```

**Audit:** `tool_name: 'admin.getSystemUsage'`, `input_summary: '{}'`, `output_summary: '{counts, storageBytes}'`

---

## Tool Authorization Matrix

| Tool | Permission | License Module | Roles |
|------|------------|----------------|-------|
| `documents.search` | `documents.read` | `core-edms` | (any) |
| `documents.getSummary` | `documents.read` | `core-edms` | (any) |
| `documents.getMetadata` | `documents.read` | `core-edms` | (any) |
| `documents.getVersions` | `documents.read` | `core-edms` | (any) |
| `documents.getLockState` | `documents.read` | `core-edms` | (any) |
| `workflows.getStatus` | `workflows.read` | `core-edms` | (any) |
| `workflows.getPendingApprovals` | `workflows.read` | `core-edms` | (any) |
| `audit.getRecentEvents` | `audit.read` | `audit-export` | admin, auditor, security-officer |
| `retention.getUpcomingExpiry` | `retention.read` | `core-edms` | admin, records-manager, auditor |
| `legalHold.getStatus` | `legalhold.read` | `core-edms` | admin, records-manager, auditor |
| `license.getStatus` | `license.read` | `core-edms` | admin |
| `help.searchDocumentation` | (none) | `core-edms` | (any) |
| `ui.navigateTo` | (none) | `core-edms` | (any) |
| `tour.start` | (none) | `core-edms` | (any) |
| `admin.getHealth` | `admin.read` | `core-edms` | admin, it-administrator |
| `admin.getSystemUsage` | `admin.read` | `core-edms` | admin, it-administrator |

## Suggested Actions (not tools)

The AI may also suggest actions that require user confirmation. These are NOT tool calls — they are returned in the `suggestedActions` array of the assistant message.

### Sensitive actions (require confirmation)

| Action Type | Confirmation Required | Executed By |
|-------------|----------------------|-------------|
| `create_share` | Yes | Client (via `POST /v1/share`) |
| `start_workflow` | Yes | Client (via `POST /v1/workflows/:id/instantiate`) |
| `request_approval` | Yes | Client (via `POST /v1/workflows/instances/:id/approve`) |
| `export_evidence` | Yes | Client (via `POST /v1/audit/export`) |
| `generate_report` | Yes | Client (via `POST /v1/admin/reports`) |
| `modify_metadata` | Yes | Client (via `PATCH /v1/documents/:id`) |
| `navigate` | No (immediate) | Client (route change) |
| `launch_tour` | No (immediate) | Client (tour start) |
| `contact_support` | No (immediate) | Client (mailto or chat) |
| `import_license` | Yes | Client (via `POST /v1/license/import`) |

### Destructive actions (NEVER executed by AI — blocked in `confirmAction`)

| Action Type | Blocked | Client Must |
|-------------|---------|-------------|
| `delete` | Yes | Redirect to admin UI for dedicated confirmation flow |
| `remove_legal_hold` | Yes | Redirect to legal hold management UI |
| `downgrade_classification` | Yes | Redirect to classification management UI |
| `revoke_license` | Yes | Redirect to License Admin Panel (step-up required) |
| `disable_user` | Yes | Redirect to user management UI |
| `change_security_policy` | Yes | Redirect to security policy UI |
| `delete_tenant_configuration` | Yes | Redirect to tenant admin UI |

## AI Assistant Prohibitions (spec §11.19)

The AI Assistant must NOT:

- Access all endpoints without restriction (only 16 whitelisted tools)
- Access all data without restriction (each tool returns minimal fields)
- Bypass authorization (every tool re-checks permissions)
- Bypass tenant isolation (every query scoped by `tenantId` from JWT)
- Bypass licensing (every tool checks `requiresLicenseModule`)
- Generate raw SQL (no `executeSql` tool exists; prompt injection blocks SQL patterns)
- Access the database directly (only via Prisma through approved tools)
- Reveal secrets (prompt injection blocks extraction patterns)
- Reveal private keys (no tool returns key material)
- Reveal system prompts (prompt injection blocks extraction patterns)
- Execute destructive actions silently (7 types blocked in `confirmAction`)
- Summarize restricted content without permission (tool verifies access)
- Leak restricted document existence (tools return `unauthorized`, not `not_found`, for inaccessible resources)
- Use mock data in production (all data from real APIs)
- Use hardcoded UI strings (all chrome via `t()`)
- Provide legal advice as a certified authority (disclaimer shown)
- Claim perfect accuracy (disclaimer shown)
- Override official EDMS records or audit truth (AI is read-only by default)

## Definition of Done for AI Assistant (spec §11.20)

The AI Assistant is complete only when:

- [x] The AI bubble is visible where enabled and licensed
- [x] The assistant is authenticated and tenant-scoped
- [x] All tools are permission-aware (16 tools with explicit authorization)
- [x] All responses are audited (`AssistantToolInvocation` + `AuditEvent`)
- [x] Citations are permission-aware
- [x] Sensitive actions require confirmation (`AssistantAction.confirmationRequired = true`)
- [x] Destructive actions are blocked or require dedicated confirmation flows
- [x] All UI strings use `t()` (ai.bubble, ai.disclaimer, ai.citations, ai.actions namespaces)
- [x] All mandatory locales are supported (6 locales × 6 ai namespaces)
- [x] Arabic RTL works correctly (drawer opens from start side)
- [x] Light and dark themes work correctly
- [x] Keyboard accessibility works (Tab, Enter, Esc)
- [x] Screen reader announcements work (ARIA live regions)
- [x] Prompt injection protections are tested (`test/ai-security.test.ts`)
- [x] External/local AI mode is configurable (`AI_PROVIDER` env)
- [x] License entitlement is enforced (`@LicenseRequired({ module: 'ai-assistant' })`)
- [x] Tenant admin settings are available (`/v1/admin/ai/settings`)
- [x] AI analytics respect privacy settings
- [x] No mock data is used
- [x] No hardcoded strings are used
- [x] The assistant degrades gracefully when unavailable (returns localized "AI not configured" message)

## Related Documents

- [AI Assistant Specification](AI_ASSISTANT.md) — full AI Assistant requirements
- [API Specification](API_SPECIFICATION.md) — REST endpoints including `/v1/ai/assistant/*`
- [Security Controls Matrix](SECURITY_CONTROLS.md) — AI security controls
- [Threat Model](THREAT_MODEL.md) — AI threat scenarios
