"use strict";
/**
 * @smart-edms/schemas — WebSocket real-time events (spec §13, §13.4)
 *
 * Zod schemas for ALL 25 events from spec §13.4. Uses
 * `z.discriminatedUnion('name', [...])` so each event payload is validated
 * against its concrete shape.
 *
 * Per spec §13.3 events are tenant-scoped, authorized per event, validated
 * with Zod, and minimal in payload.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEventSchema = exports.PresenceStateSchema = exports.RoomIdentifierSchema = exports.CrisisRoomEventSchema = exports.WEBSOCKET_EVENTS = exports.WebSocketEventNameSchema = void 0;
exports.parseWebSocketEvent = parseWebSocketEvent;
exports.safeParseWebSocketEvent = safeParseWebSocketEvent;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const document_1 = require("./document");
const classification_1 = require("./classification");
const workflow_1 = require("./workflow");
const retention_1 = require("./retention");
const share_1 = require("./share");
const license_1 = require("./license");
const scanner_1 = require("./scanner");
const tour_1 = require("./tour");
const ai_1 = require("./ai");
// ---------------------------------------------------------------------------
// Event name enum (spec §13.4 — all 25 events)
// ---------------------------------------------------------------------------
/** `z.infer` === `WebSocketEventName` (all 25 events). */
exports.WebSocketEventNameSchema = zod_1.z.enum([
    'document.created',
    'document.updated',
    'document.deleted',
    'document.version.created',
    'document.classification.changed',
    'workflow.step.updated',
    'workflow.approval.requested',
    'workflow.approval.completed',
    'audit.alert',
    'notification.created',
    'share.link.updated',
    'legalHold.changed',
    'retention.changed',
    'license.status.changed',
    'presence.updated',
    'crisisRoom.sync',
    'search.index.updated',
    'job.progress.updated',
    'scanner.job.started',
    'scanner.job.progress',
    'scanner.job.completed',
    'scanner.job.failed',
    'tour.updated',
    'ai.response.chunk',
    'ai.response.completed',
    'ai.response.failed',
]);
/**
 * Stable array literal of all 25 WebSocket event names. Consumers use this
 * for building room-subscription maps and for verifying test coverage.
 */
exports.WEBSOCKET_EVENTS = [
    'document.created',
    'document.updated',
    'document.deleted',
    'document.version.created',
    'document.classification.changed',
    'workflow.step.updated',
    'workflow.approval.requested',
    'workflow.approval.completed',
    'audit.alert',
    'notification.created',
    'share.link.updated',
    'legalHold.changed',
    'retention.changed',
    'license.status.changed',
    'presence.updated',
    'crisisRoom.sync',
    'search.index.updated',
    'job.progress.updated',
    'scanner.job.started',
    'scanner.job.progress',
    'scanner.job.completed',
    'scanner.job.failed',
    'tour.updated',
    'ai.response.chunk',
    'ai.response.completed',
    'ai.response.failed',
];
// ---------------------------------------------------------------------------
// Crisis-room event (spec §9.11)
// ---------------------------------------------------------------------------
/** `z.infer` matches `CrisisRoomEvent` (discriminated on `kind`). */
exports.CrisisRoomEventSchema = zod_1.z.discriminatedUnion('kind', [
    zod_1.z
        .object({
        kind: zod_1.z.literal('redaction'),
        documentId: document_1.DocumentIdSchema,
        page: zod_1.z.number().int().min(1),
        boundingBox: zod_1.z
            .object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            w: zod_1.z.number(),
            h: zod_1.z.number(),
        })
            .strict(),
        actorUserId: user_1.UserIdSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('annotation'),
        documentId: document_1.DocumentIdSchema,
        page: zod_1.z.number().int().min(1),
        text: zod_1.z.string().min(1).max(4000),
        actorUserId: user_1.UserIdSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('document_link'),
        documentId: document_1.DocumentIdSchema,
        actorUserId: user_1.UserIdSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('voice_channel'),
        channel: zod_1.z.string().min(1).max(64),
        action: zod_1.z.enum(['join', 'leave']),
        actorUserId: user_1.UserIdSchema,
    })
        .strict(),
]);
// ---------------------------------------------------------------------------
// RoomIdentifier (spec §13.3)
// ---------------------------------------------------------------------------
/** `z.infer` matches `RoomIdentifier` (discriminated on `kind`). */
exports.RoomIdentifierSchema = zod_1.z.discriminatedUnion('kind', [
    zod_1.z.object({ kind: zod_1.z.literal('tenant'), tenantId: tenant_1.TenantIdSchema }).strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('user'),
        tenantId: tenant_1.TenantIdSchema,
        userId: user_1.UserIdSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('document'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('workflow'),
        tenantId: tenant_1.TenantIdSchema,
        instanceId: workflow_1.WorkflowInstanceIdSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('crisis_room'),
        tenantId: tenant_1.TenantIdSchema,
        roomCode: zod_1.z.string().min(1).max(64),
    })
        .strict(),
]);
// ---------------------------------------------------------------------------
// Presence state
// ---------------------------------------------------------------------------
/** `z.infer` matches `PresenceState`. */
exports.PresenceStateSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    room: exports.RoomIdentifierSchema,
    presentUsers: zod_1.z.array(zod_1.z
        .object({
        userId: user_1.UserIdSchema,
        displayName: zod_1.z.string().min(1).max(200),
        lastActiveAt: common_1.IsoDateStringSchema,
        cursor: zod_1.z
            .object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            page: zod_1.z.number().int().min(1),
        })
            .nullable(),
    })
        .strict()),
})
    .strict();
// ---------------------------------------------------------------------------
// Discriminated union of ALL 25 events (spec §13.4)
// ---------------------------------------------------------------------------
/**
 * `z.infer<typeof WebSocketEventSchema>` MUST match `WebSocketEvent` from
 * `@smart-edms/types`. Discriminated on the `name` field.
 */
exports.WebSocketEventSchema = zod_1.z.discriminatedUnion('name', [
    // 1-3. Document lifecycle
    zod_1.z
        .object({
        name: zod_1.z.literal('document.created'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    zod_1.z
        .object({
        name: zod_1.z.literal('document.updated'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    zod_1.z
        .object({
        name: zod_1.z.literal('document.deleted'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 4. Version created
    zod_1.z
        .object({
        name: zod_1.z.literal('document.version.created'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
        versionId: document_1.DocumentVersionIdSchema,
        versionNumber: zod_1.z.number().int().min(1),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 5. Classification changed
    zod_1.z
        .object({
        name: zod_1.z.literal('document.classification.changed'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
        fromLabelId: classification_1.ClassificationLabelIdSchema.nullable(),
        toLabelId: classification_1.ClassificationLabelIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 6. Workflow step updated
    zod_1.z
        .object({
        name: zod_1.z.literal('workflow.step.updated'),
        tenantId: tenant_1.TenantIdSchema,
        instanceId: workflow_1.WorkflowInstanceIdSchema,
        stepId: workflow_1.WorkflowStepIdSchema,
        status: zod_1.z.string().min(1).max(64),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 7. Approval requested
    zod_1.z
        .object({
        name: zod_1.z.literal('workflow.approval.requested'),
        tenantId: tenant_1.TenantIdSchema,
        instanceId: workflow_1.WorkflowInstanceIdSchema,
        stepId: workflow_1.WorkflowStepIdSchema,
        approverUserId: user_1.UserIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 8. Approval completed
    zod_1.z
        .object({
        name: zod_1.z.literal('workflow.approval.completed'),
        tenantId: tenant_1.TenantIdSchema,
        instanceId: workflow_1.WorkflowInstanceIdSchema,
        stepId: workflow_1.WorkflowStepIdSchema,
        decision: zod_1.z.enum(['approve', 'reject', 'delegate', 'escalate']),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 9. Audit alert
    zod_1.z
        .object({
        name: zod_1.z.literal('audit.alert'),
        tenantId: tenant_1.TenantIdSchema,
        auditEventId: common_1.UuidSchema,
        severity: zod_1.z.string().min(1).max(32),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 10. Notification created
    zod_1.z
        .object({
        name: zod_1.z.literal('notification.created'),
        tenantId: tenant_1.TenantIdSchema,
        notificationId: common_1.UuidSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 11. Share link updated
    zod_1.z
        .object({
        name: zod_1.z.literal('share.link.updated'),
        tenantId: tenant_1.TenantIdSchema,
        shareLinkId: share_1.ShareLinkIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 12. Legal hold changed
    zod_1.z
        .object({
        name: zod_1.z.literal('legalHold.changed'),
        tenantId: tenant_1.TenantIdSchema,
        legalHoldId: retention_1.LegalHoldIdSchema,
        status: zod_1.z.string().min(1).max(32),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 13. Retention changed
    zod_1.z
        .object({
        name: zod_1.z.literal('retention.changed'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 14. License status changed
    zod_1.z
        .object({
        name: zod_1.z.literal('license.status.changed'),
        tenantId: tenant_1.TenantIdSchema,
        state: license_1.LicenseStateSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 15. Presence updated
    zod_1.z
        .object({
        name: zod_1.z.literal('presence.updated'),
        tenantId: tenant_1.TenantIdSchema,
        presence: exports.PresenceStateSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 16. Crisis room sync
    zod_1.z
        .object({
        name: zod_1.z.literal('crisisRoom.sync'),
        tenantId: tenant_1.TenantIdSchema,
        room: exports.CrisisRoomEventSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 17. Search index updated
    zod_1.z
        .object({
        name: zod_1.z.literal('search.index.updated'),
        tenantId: tenant_1.TenantIdSchema,
        documentId: document_1.DocumentIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 18. Job progress updated
    zod_1.z
        .object({
        name: zod_1.z.literal('job.progress.updated'),
        tenantId: tenant_1.TenantIdSchema,
        jobId: common_1.UuidSchema,
        progress: zod_1.z.number().min(0).max(100),
        status: zod_1.z.string().min(1).max(32),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 19. Scanner job started
    zod_1.z
        .object({
        name: zod_1.z.literal('scanner.job.started'),
        tenantId: tenant_1.TenantIdSchema,
        jobId: scanner_1.ScannerJobIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 20. Scanner job progress
    zod_1.z
        .object({
        name: zod_1.z.literal('scanner.job.progress'),
        tenantId: tenant_1.TenantIdSchema,
        jobId: scanner_1.ScannerJobIdSchema,
        pagesProcessed: zod_1.z.number().int().min(0),
        pagesAcquired: zod_1.z.number().int().min(0),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 21. Scanner job completed
    zod_1.z
        .object({
        name: zod_1.z.literal('scanner.job.completed'),
        tenantId: tenant_1.TenantIdSchema,
        jobId: scanner_1.ScannerJobIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 22. Scanner job failed
    zod_1.z
        .object({
        name: zod_1.z.literal('scanner.job.failed'),
        tenantId: tenant_1.TenantIdSchema,
        jobId: scanner_1.ScannerJobIdSchema,
        failureReasonKey: zod_1.z.string().min(1).max(128),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 23. Tour updated
    zod_1.z
        .object({
        name: zod_1.z.literal('tour.updated'),
        tenantId: tenant_1.TenantIdSchema,
        tourId: tour_1.TourDefinitionIdSchema,
        userId: user_1.UserIdSchema,
        status: zod_1.z.string().min(1).max(32),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 24. AI response chunk
    zod_1.z
        .object({
        name: zod_1.z.literal('ai.response.chunk'),
        tenantId: tenant_1.TenantIdSchema,
        sessionId: ai_1.AssistantSessionIdSchema,
        messageId: ai_1.AssistantMessageIdSchema,
        delta: zod_1.z.string().min(0).max(2000),
        sequence: zod_1.z.number().int().min(0),
        final: zod_1.z.boolean(),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 25a. AI response completed
    zod_1.z
        .object({
        name: zod_1.z.literal('ai.response.completed'),
        tenantId: tenant_1.TenantIdSchema,
        sessionId: ai_1.AssistantSessionIdSchema,
        messageId: ai_1.AssistantMessageIdSchema,
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
    // 25b. AI response failed
    zod_1.z
        .object({
        name: zod_1.z.literal('ai.response.failed'),
        tenantId: tenant_1.TenantIdSchema,
        sessionId: ai_1.AssistantSessionIdSchema,
        failureReasonKey: zod_1.z.string().min(1).max(128),
        occurredAt: common_1.IsoDateStringSchema,
    })
        .strict(),
]);
/**
 * Helper: parse and validate a WebSocket event payload. Throws ZodError on
 * invalid input. Use this on both the server (Socket.IO `on(...)` handlers)
 * and the client (before processing inbound events).
 */
function parseWebSocketEvent(payload) {
    return exports.WebSocketEventSchema.parse(payload);
}
/**
 * Helper: safely parse a WebSocket event payload. Returns
 * `{ success: true, data }` or `{ success: false, error }`.
 */
function safeParseWebSocketEvent(payload) {
    return exports.WebSocketEventSchema.safeParse(payload);
}
//# sourceMappingURL=websocket.js.map