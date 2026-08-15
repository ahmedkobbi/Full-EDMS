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

import { z } from 'zod';
import {
  IsoDateStringSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { DocumentIdSchema, DocumentVersionIdSchema } from './document';
import { ClassificationLabelIdSchema } from './classification';
import { WorkflowInstanceIdSchema, WorkflowStepIdSchema } from './workflow';
import { LegalHoldIdSchema } from './retention';
import { ShareLinkIdSchema } from './share';
import { LicenseStateSchema } from './license';
import { ScannerJobIdSchema } from './scanner';
import { TourDefinitionIdSchema } from './tour';
import { AssistantMessageIdSchema, AssistantSessionIdSchema } from './ai';

// ---------------------------------------------------------------------------
// Event name enum (spec §13.4 — all 25 events)
// ---------------------------------------------------------------------------

/** `z.infer` === `WebSocketEventName` (all 25 events). */
export const WebSocketEventNameSchema = z.enum([
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
export const WEBSOCKET_EVENTS = [
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
] as const satisfies readonly string[];

// ---------------------------------------------------------------------------
// Crisis-room event (spec §9.11)
// ---------------------------------------------------------------------------

/** `z.infer` matches `CrisisRoomEvent` (discriminated on `kind`). */
export const CrisisRoomEventSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('redaction'),
      documentId: DocumentIdSchema,
      page: z.number().int().min(1),
      boundingBox: z
        .object({
          x: z.number(),
          y: z.number(),
          w: z.number(),
          h: z.number(),
        })
        .strict(),
      actorUserId: UserIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('annotation'),
      documentId: DocumentIdSchema,
      page: z.number().int().min(1),
      text: z.string().min(1).max(4000),
      actorUserId: UserIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('document_link'),
      documentId: DocumentIdSchema,
      actorUserId: UserIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('voice_channel'),
      channel: z.string().min(1).max(64),
      action: z.enum(['join', 'leave']),
      actorUserId: UserIdSchema,
    })
    .strict(),
]);

// ---------------------------------------------------------------------------
// RoomIdentifier (spec §13.3)
// ---------------------------------------------------------------------------

/** `z.infer` matches `RoomIdentifier` (discriminated on `kind`). */
export const RoomIdentifierSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('tenant'), tenantId: TenantIdSchema }).strict(),
  z
    .object({
      kind: z.literal('user'),
      tenantId: TenantIdSchema,
      userId: UserIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('document'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('workflow'),
      tenantId: TenantIdSchema,
      instanceId: WorkflowInstanceIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('crisis_room'),
      tenantId: TenantIdSchema,
      roomCode: z.string().min(1).max(64),
    })
    .strict(),
]);

// ---------------------------------------------------------------------------
// Presence state
// ---------------------------------------------------------------------------

/** `z.infer` matches `PresenceState`. */
export const PresenceStateSchema = z
  .object({
    tenantId: TenantIdSchema,
    room: RoomIdentifierSchema,
    presentUsers: z.array(
      z
        .object({
          userId: UserIdSchema,
          displayName: z.string().min(1).max(200),
          lastActiveAt: IsoDateStringSchema,
          cursor: z
            .object({
              x: z.number(),
              y: z.number(),
              page: z.number().int().min(1),
            })
            .nullable(),
        })
        .strict(),
    ),
  })
  .strict();

// ---------------------------------------------------------------------------
// Discriminated union of ALL 25 events (spec §13.4)
// ---------------------------------------------------------------------------

/**
 * `z.infer<typeof WebSocketEventSchema>` MUST match `WebSocketEvent` from
 * `@smart-edms/types`. Discriminated on the `name` field.
 */
export const WebSocketEventSchema = z.discriminatedUnion('name', [
  // 1-3. Document lifecycle
  z
    .object({
      name: z.literal('document.created'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('document.updated'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('document.deleted'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 4. Version created
  z
    .object({
      name: z.literal('document.version.created'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
      versionId: DocumentVersionIdSchema,
      versionNumber: z.number().int().min(1),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 5. Classification changed
  z
    .object({
      name: z.literal('document.classification.changed'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
      fromLabelId: ClassificationLabelIdSchema.nullable(),
      toLabelId: ClassificationLabelIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 6. Workflow step updated
  z
    .object({
      name: z.literal('workflow.step.updated'),
      tenantId: TenantIdSchema,
      instanceId: WorkflowInstanceIdSchema,
      stepId: WorkflowStepIdSchema,
      status: z.string().min(1).max(64),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 7. Approval requested
  z
    .object({
      name: z.literal('workflow.approval.requested'),
      tenantId: TenantIdSchema,
      instanceId: WorkflowInstanceIdSchema,
      stepId: WorkflowStepIdSchema,
      approverUserId: UserIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 8. Approval completed
  z
    .object({
      name: z.literal('workflow.approval.completed'),
      tenantId: TenantIdSchema,
      instanceId: WorkflowInstanceIdSchema,
      stepId: WorkflowStepIdSchema,
      decision: z.enum(['approve', 'reject', 'delegate', 'escalate']),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 9. Audit alert
  z
    .object({
      name: z.literal('audit.alert'),
      tenantId: TenantIdSchema,
      auditEventId: UuidSchema,
      severity: z.string().min(1).max(32),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 10. Notification created
  z
    .object({
      name: z.literal('notification.created'),
      tenantId: TenantIdSchema,
      notificationId: UuidSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 11. Share link updated
  z
    .object({
      name: z.literal('share.link.updated'),
      tenantId: TenantIdSchema,
      shareLinkId: ShareLinkIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 12. Legal hold changed
  z
    .object({
      name: z.literal('legalHold.changed'),
      tenantId: TenantIdSchema,
      legalHoldId: LegalHoldIdSchema,
      status: z.string().min(1).max(32),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 13. Retention changed
  z
    .object({
      name: z.literal('retention.changed'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 14. License status changed
  z
    .object({
      name: z.literal('license.status.changed'),
      tenantId: TenantIdSchema,
      state: LicenseStateSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 15. Presence updated
  z
    .object({
      name: z.literal('presence.updated'),
      tenantId: TenantIdSchema,
      presence: PresenceStateSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 16. Crisis room sync
  z
    .object({
      name: z.literal('crisisRoom.sync'),
      tenantId: TenantIdSchema,
      room: CrisisRoomEventSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 17. Search index updated
  z
    .object({
      name: z.literal('search.index.updated'),
      tenantId: TenantIdSchema,
      documentId: DocumentIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 18. Job progress updated
  z
    .object({
      name: z.literal('job.progress.updated'),
      tenantId: TenantIdSchema,
      jobId: UuidSchema,
      progress: z.number().min(0).max(100),
      status: z.string().min(1).max(32),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 19. Scanner job started
  z
    .object({
      name: z.literal('scanner.job.started'),
      tenantId: TenantIdSchema,
      jobId: ScannerJobIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 20. Scanner job progress
  z
    .object({
      name: z.literal('scanner.job.progress'),
      tenantId: TenantIdSchema,
      jobId: ScannerJobIdSchema,
      pagesProcessed: z.number().int().min(0),
      pagesAcquired: z.number().int().min(0),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 21. Scanner job completed
  z
    .object({
      name: z.literal('scanner.job.completed'),
      tenantId: TenantIdSchema,
      jobId: ScannerJobIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 22. Scanner job failed
  z
    .object({
      name: z.literal('scanner.job.failed'),
      tenantId: TenantIdSchema,
      jobId: ScannerJobIdSchema,
      failureReasonKey: z.string().min(1).max(128),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 23. Tour updated
  z
    .object({
      name: z.literal('tour.updated'),
      tenantId: TenantIdSchema,
      tourId: TourDefinitionIdSchema,
      userId: UserIdSchema,
      status: z.string().min(1).max(32),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 24. AI response chunk
  z
    .object({
      name: z.literal('ai.response.chunk'),
      tenantId: TenantIdSchema,
      sessionId: AssistantSessionIdSchema,
      messageId: AssistantMessageIdSchema,
      delta: z.string().min(0).max(2000),
      sequence: z.number().int().min(0),
      final: z.boolean(),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 25a. AI response completed
  z
    .object({
      name: z.literal('ai.response.completed'),
      tenantId: TenantIdSchema,
      sessionId: AssistantSessionIdSchema,
      messageId: AssistantMessageIdSchema,
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
  // 25b. AI response failed
  z
    .object({
      name: z.literal('ai.response.failed'),
      tenantId: TenantIdSchema,
      sessionId: AssistantSessionIdSchema,
      failureReasonKey: z.string().min(1).max(128),
      occurredAt: IsoDateStringSchema,
    })
    .strict(),
]);

/**
 * Helper: parse and validate a WebSocket event payload. Throws ZodError on
 * invalid input. Use this on both the server (Socket.IO `on(...)` handlers)
 * and the client (before processing inbound events).
 */
export function parseWebSocketEvent(payload: unknown) {
  return WebSocketEventSchema.parse(payload);
}

/**
 * Helper: safely parse a WebSocket event payload. Returns
 * `{ success: true, data }` or `{ success: false, error }`.
 */
export function safeParseWebSocketEvent(payload: unknown) {
  return WebSocketEventSchema.safeParse(payload);
}
