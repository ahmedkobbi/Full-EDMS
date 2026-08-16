/**
 * @smart-edms/types — WebSocket real-time events (spec §13)
 *
 * Purpose: model Socket.IO event names, room identifiers, presence, and
 * crisis-room synchronization. Events are tenant-scoped, authorized per
 * event, validated with Zod, and minimal in payload (spec §13.3).
 */

import type { ISODateString, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId, DocumentVersionId } from './document';
import type { ClassificationLabelId } from './classification';
import type { WorkflowInstanceId, WorkflowStepId } from './workflow';
import type { LegalHoldId } from './retention';
import type { ShareLinkId } from './share';
import type { LicenseState } from './license';
import type { ScannerJobId } from './scanner';
import type { TourDefinitionId } from './tour';
import type { AssistantMessageId, AssistantSessionId } from './ai';

/**
 * Required real-time event names (spec §13.4). Stable strings; used as
 * Socket.IO event names. All payloads are validated with Zod.
 */
export type WebSocketEventName =
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'document.version.created'
  | 'document.classification.changed'
  | 'workflow.step.updated'
  | 'workflow.approval.requested'
  | 'workflow.approval.completed'
  | 'audit.alert'
  | 'notification.created'
  | 'share.link.updated'
  | 'legalHold.changed'
  | 'retention.changed'
  | 'license.status.changed'
  | 'presence.updated'
  | 'crisisRoom.sync'
  | 'search.index.updated'
  | 'job.progress.updated'
  | 'scanner.job.started'
  | 'scanner.job.progress'
  | 'scanner.job.completed'
  | 'scanner.job.failed'
  | 'tour.updated'
  | 'ai.response.chunk'
  | 'ai.response.completed'
  | 'ai.response.failed';

/**
 * Discriminated union of WebSocket event payloads. The `name` field
 * discriminates the payload shape; each variant matches a row in the
 * spec §13.4 table.
 */
export type WebSocketEvent =
  | { readonly name: 'document.created'; readonly tenantId: TenantId; readonly documentId: DocumentId; readonly occurredAt: ISODateString }
  | { readonly name: 'document.updated'; readonly tenantId: TenantId; readonly documentId: DocumentId; readonly occurredAt: ISODateString }
  | { readonly name: 'document.deleted'; readonly tenantId: TenantId; readonly documentId: DocumentId; readonly occurredAt: ISODateString }
  | {
      readonly name: 'document.version.created';
      readonly tenantId: TenantId;
      readonly documentId: DocumentId;
      readonly versionId: DocumentVersionId;
      readonly versionNumber: number;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'document.classification.changed';
      readonly tenantId: TenantId;
      readonly documentId: DocumentId;
      readonly fromLabelId: ClassificationLabelId | null;
      readonly toLabelId: ClassificationLabelId;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'workflow.step.updated';
      readonly tenantId: TenantId;
      readonly instanceId: WorkflowInstanceId;
      readonly stepId: WorkflowStepId;
      readonly status: string;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'workflow.approval.requested';
      readonly tenantId: TenantId;
      readonly instanceId: WorkflowInstanceId;
      readonly stepId: WorkflowStepId;
      readonly approverUserId: UserId;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'workflow.approval.completed';
      readonly tenantId: TenantId;
      readonly instanceId: WorkflowInstanceId;
      readonly stepId: WorkflowStepId;
      readonly decision: 'approve' | 'reject' | 'delegate' | 'escalate';
      readonly occurredAt: ISODateString;
    }
  | { readonly name: 'audit.alert'; readonly tenantId: TenantId; readonly auditEventId: UUID; readonly severity: string; readonly occurredAt: ISODateString }
  | { readonly name: 'notification.created'; readonly tenantId: TenantId; readonly notificationId: UUID; readonly occurredAt: ISODateString }
  | { readonly name: 'share.link.updated'; readonly tenantId: TenantId; readonly shareLinkId: ShareLinkId; readonly occurredAt: ISODateString }
  | { readonly name: 'legalHold.changed'; readonly tenantId: TenantId; readonly legalHoldId: LegalHoldId; readonly status: string; readonly occurredAt: ISODateString }
  | { readonly name: 'retention.changed'; readonly tenantId: TenantId; readonly documentId: DocumentId; readonly occurredAt: ISODateString }
  | { readonly name: 'license.status.changed'; readonly tenantId: TenantId; readonly state: LicenseState; readonly occurredAt: ISODateString }
  | { readonly name: 'presence.updated'; readonly tenantId: TenantId; readonly presence: PresenceState; readonly occurredAt: ISODateString }
  | { readonly name: 'crisisRoom.sync'; readonly tenantId: TenantId; readonly room: CrisisRoomEvent; readonly occurredAt: ISODateString }
  | { readonly name: 'search.index.updated'; readonly tenantId: TenantId; readonly documentId: DocumentId; readonly occurredAt: ISODateString }
  | {
      readonly name: 'job.progress.updated';
      readonly tenantId: TenantId;
      readonly jobId: UUID;
      readonly progress: number;
      readonly status: string;
      readonly occurredAt: ISODateString;
    }
  | { readonly name: 'scanner.job.started'; readonly tenantId: TenantId; readonly jobId: ScannerJobId; readonly occurredAt: ISODateString }
  | {
      readonly name: 'scanner.job.progress';
      readonly tenantId: TenantId;
      readonly jobId: ScannerJobId;
      readonly pagesProcessed: number;
      readonly pagesAcquired: number;
      readonly occurredAt: ISODateString;
    }
  | { readonly name: 'scanner.job.completed'; readonly tenantId: TenantId; readonly jobId: ScannerJobId; readonly occurredAt: ISODateString }
  | {
      readonly name: 'scanner.job.failed';
      readonly tenantId: TenantId;
      readonly jobId: ScannerJobId;
      readonly failureReasonKey: string;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'tour.updated';
      readonly tenantId: TenantId;
      readonly tourId: TourDefinitionId;
      readonly userId: UserId;
      readonly status: string;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'ai.response.chunk';
      readonly tenantId: TenantId;
      readonly sessionId: AssistantSessionId;
      readonly messageId: AssistantMessageId;
      readonly delta: string;
      readonly sequence: number;
      readonly final: boolean;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'ai.response.completed';
      readonly tenantId: TenantId;
      readonly sessionId: AssistantSessionId;
      readonly messageId: AssistantMessageId;
      readonly occurredAt: ISODateString;
    }
  | {
      readonly name: 'ai.response.failed';
      readonly tenantId: TenantId;
      readonly sessionId: AssistantSessionId;
      readonly failureReasonKey: string;
      readonly occurredAt: ISODateString;
    };

/**
 * Room identifier. Rooms are tenant-scoped and resource-scoped (spec §13.3).
 * The string form is opaque to the client; the server enforces
 * authorization before joining a socket to a room.
 */
export type RoomIdentifier =
  | { readonly kind: 'tenant'; readonly tenantId: TenantId }
  | { readonly kind: 'user'; readonly tenantId: TenantId; readonly userId: UserId }
  | { readonly kind: 'document'; readonly tenantId: TenantId; readonly documentId: DocumentId }
  | { readonly kind: 'workflow'; readonly tenantId: TenantId; readonly instanceId: WorkflowInstanceId }
  | { readonly kind: 'crisis_room'; readonly tenantId: TenantId; readonly roomCode: string };

/**
 * Presence state broadcast on `presence.updated`. Tracks which users are
 * currently viewing a resource so the UI can show real-time presence
 * (spec §9.11 crisis response room).
 */
export interface PresenceState {
  readonly tenantId: TenantId;
  readonly room: RoomIdentifier;
  readonly presentUsers: ReadonlyArray<{
    readonly userId: UserId;
    readonly displayName: string;
    readonly lastActiveAt: ISODateString;
    /** Optional cursor / annotation when viewing a document. */
    readonly cursor: { readonly x: number; readonly y: number; readonly page: number } | null;
  }>;
}

/**
 * Crisis-room synchronization event (spec §9.11). Broadcast to cleared
 * users in a synchronized room; carries redactions, annotations, and
 * document links.
 */
export type CrisisRoomEvent =
  | {
      readonly kind: 'redaction';
      readonly documentId: DocumentId;
      readonly page: number;
      readonly boundingBox: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
      readonly actorUserId: UserId;
    }
  | {
      readonly kind: 'annotation';
      readonly documentId: DocumentId;
      readonly page: number;
      readonly text: string;
      readonly actorUserId: UserId;
    }
  | {
      readonly kind: 'document_link';
      readonly documentId: DocumentId;
      readonly actorUserId: UserId;
    }
  | {
      readonly kind: 'voice_channel';
      readonly channel: string;
      readonly action: 'join' | 'leave';
      readonly actorUserId: UserId;
    };
