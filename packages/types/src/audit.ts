/**
 * @smart-edms/types — audit, evidence, hash chain (spec §9.12, §15.1)
 *
 * Purpose: model tamper-evident audit events, actors, categories, and the
 * hash-chain receipts that prove audit integrity. Audit logs must not be
 * editable by normal users or tenant admins (spec §9.12).
 */

import type {
  AuditActorKind,
  AuditResult,
  HashHex,
  ISODateString,
  UUID,
} from './common';
import type { TenantId } from './tenant';

/** Branded audit-event identifier. */
export type AuditEventId = UUID

/** Branded hash-chain receipt identifier. */
export type HashChainReceiptId = UUID

/**
 * Audit categories (spec §9.12). Stable across locales — display labels are
 * derived from message keys, but the codes never change.
 */
export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'access'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'download'
  | 'preview'
  | 'redaction'
  | 'export'
  | 'sharing'
  | 'workflow'
  | 'admin'
  | 'locale'
  | 'license'
  | 'tour'
  | 'ai_assistant'
  | 'security'
  | 'retention'
  | 'legal_hold'
  | 'classification'
  | 'scanner'
  | 'provenance'
  | 'auth'
  | 'document'
  | 'user'
  | 'tenant'
  | 'metadata'
  | 'share'
  | 'notification'
  | 'provenance';

/**
 * Stable, machine-readable audit event codes. These codes are part of the
 * contract and must remain stable across releases (spec §9.12). Display
 * labels are derived from message keys.
 */
export type AuditEventCode =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.token_refreshed'
  | 'auth.mfa_enrolled'
  | 'auth.mfa_challenged'
  | 'auth.breakglass_used'
  | 'access.granted'
  | 'access.denied'
  | 'document.created'
  | 'document.read'
  | 'document.updated'
  | 'document.deleted'
  | 'document.downloaded'
  | 'document.previewed'
  | 'document.version.created'
  | 'document.version.restored'
  | 'document.classification.changed'
  | 'document.checkout'
  | 'document.checkin'
  | 'document.redacted'
  | 'document.redaction_exported'
  | 'document.shared'
  | 'document.share_revoked'
  | 'workflow.started'
  | 'workflow.step_updated'
  | 'workflow.approval_requested'
  | 'workflow.approval_completed'
  | 'workflow.cancelled'
  | 'retention.schedule_applied'
  | 'retention.disposition_executed'
  | 'legal_hold.applied'
  | 'legal_hold.released'
  | 'classification.label_assigned'
  | 'classification.downgrade_denied'
  | 'admin.user_created'
  | 'admin.user_suspended'
  | 'admin.role_changed'
  | 'admin.policy_changed'
  | 'admin.tenant_updated'
  | 'license.activated'
  | 'license.heartbeat_received'
  | 'license.revoked'
  | 'license.expired'
  | 'license.imported'
  | 'tour.started'
  | 'tour.completed'
  | 'tour.skipped'
  | 'tour.dismissed'
  | 'ai.session_started'
  | 'ai.message_sent'
  | 'ai.tool_invoked'
  | 'ai.action_suggested'
  | 'ai.action_confirmed'
  | 'ai.action_denied'
  | 'ai.prompt_injection_detected'
  | 'scanner.job_started'
  | 'scanner.job_completed'
  | 'scanner.job_failed'
  | 'provenance.c2pa_verified'
  | 'provenance.forgery_detected'
  | 'auth.password.reset.request'
  | 'auth.password.reset.complete'
  | 'auth.password.change'
  | 'auth.mfa.enroll.start'
  | 'auth.mfa.enroll.confirm'
  | 'auth.mfa.disable'
  | 'auth.session.revoke'
  | 'auth.session.revoke_all'
  | 'auth.account.locked'
  | 'auth.step_up'
  | 'document.record.declare'
  | 'document.metadata.set'
  | 'document.metadata.remove'
  | 'document.comment.create'
  | 'document.comment.delete'
  | 'document.comment.resolve'
  | 'document.tag.add'
  | 'document.tag.remove'
  | 'document.favorite.add'
  | 'document.favorite.remove'
  | 'document.folder.create'
  | 'document.folder.rename'
  | 'document.folder.delete'
  | 'document.move'
  | 'document.batch_upload'
  | 'document.malware.scan'
  | 'document.malware.detected'
  | 'document.preview'
  | 'document.redaction.create'
  | 'document.redaction.export'
  | 'document.enclave.create'
  | 'document.enclave.burn'
  | 'document.enclave.destroy'
  | 'document.multimodal.transcribe'
  | 'document.invite'
  | 'document.invite.accept'
  | 'document.invite.revoke'
  | 'document.invite.resend'
  | 'group.create'
  | 'group.update'
  | 'group.delete'
  | 'group.member.add'
  | 'group.member.remove'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'share.link.create'
  | 'share.link.revoke'
  | 'workflow.ai.generate'
  | 'workflow.ai.negotiate'
  | 'workflow.approval_completed'
  | 'retention.disposition.approve'
  | 'retention.disposition.cancel'
  | 'retention.crypto_shred'
  | 'metadata.schema.create'
  | 'metadata.schema.update'
  | 'metadata.schema.delete'
  | 'webhook.create'
  | 'webhook.update'
  | 'webhook.delete'
  | 'webhook.test'
  | 'api_key.create'
  | 'api_key.revoke'
  | 'api_key.delete'
  | 'locale.override.upsert'
  | 'locale.override.delete'
  | 'physical_twin.tag'
  | 'provenance.custody.entry'
  | 'provenance.c2pa.verify'
  | 'provenance.forgery.detect'
  | 'provenance.evidence.generate'
  | 'ai.pii.detect'
  | 'ai.duplicate.detect'
  | 'ai.metadata.suggest'
  | 'scanner.capture_rule.create'
  | 'scanner.ocr.run'
  | 'scanner.omr.run'
  | 'scanner.icr.run'
  | 'scanner.barcode.detect'
  | 'scanner.verification.approve'
  | 'scanner.verification.correct'
  | 'scanner.verification.reject'
  | 'admin.migration.create'
  | 'audit.export.request'
  | 'audit.export.download'
  | 'user.invite'
  | 'user.invite.accept'
  | 'user.invite.revoke'
  | 'user.invite.resend'
  | 'user.create'
  | 'user.update'
  | 'user.delete';

/** Severity of an audit event; drives alerting and retention. */
export type AuditSeverity = 'info' | 'notice' | 'warning' | 'critical';

/**
 * Actor that initiated an audited action. Re-declared here so the audit
 * module is self-contained for downstream consumers.
 */
export interface AuditActor {
  readonly kind: AuditActorKind;
  readonly userId: UUID | null;
  readonly serviceAccountId: UUID | null;
  readonly tenantId: TenantId;
  readonly sessionId: UUID | null;
  readonly deviceFingerprint: string | null;
  /** IP address captured where appropriate (spec §9.12). */
  readonly ip: string | null;
  /** User-agent captured where appropriate. */
  readonly userAgent: string | null;
}

/**
 * Resource reference in an audit event. Carries just enough to identify the
 * target without leaking sensitive content (spec §9.12).
 */
export interface AuditResource {
  readonly kind: string;
  readonly id: UUID;
  /** Optional version id, for versioned resources. */
  readonly versionId: UUID | null;
  /** Optional tenantId when the resource is tenant-owned. */
  readonly tenantId: TenantId | null;
}

/**
 * Tamper-evident audit event. The `sequenceNumber` is monotonic per tenant
 * and `previousHash` chains events together (spec §9.12). Audit writes are
 * append-only and must not be edited by normal users or tenant admins.
 */
export interface AuditEvent {
  readonly id: AuditEventId;
  readonly tenantId: TenantId;
  readonly sequenceNumber: number;
  readonly category: AuditCategory;
  readonly code: AuditEventCode;
  readonly severity: AuditSeverity;
  readonly actor: AuditActor;
  readonly resource: AuditResource | null;
  readonly result: AuditResult;
  /** Localised reason key, where required (spec §9.12). */
  readonly reasonKey: string | null;
  /** Free-form reason text, when the localised key is not sufficient. */
  readonly reasonText: string | null;
  /** Correlation id propagated from the originating HTTP / WS request. */
  readonly correlationId: UUID | null;
  readonly occurredAt: ISODateString;
  /** Hash of the previous event in the chain; null for the first event. */
  readonly previousHash: HashHex | null;
  /** Hash of this event's canonical payload. */
  readonly eventHash: HashHex;
}

/**
 * Hash-chain receipt issued periodically (or on demand) to prove integrity
 * of a contiguous range of audit events (spec §9.12).
 */
export interface HashChainReceipt {
  readonly id: HashChainReceiptId;
  readonly tenantId: TenantId;
  /** Inclusive start sequence number. */
  readonly fromSequence: number;
  /** Inclusive end sequence number. */
  readonly toSequence: number;
  /** Hash of the first event in the range. */
  readonly headHash: HashHex;
  /** Hash of the last event in the range. */
  readonly tailHash: HashHex;
  /** Aggregate root hash (e.g. Merkle root) over the range. */
  readonly rootHash: HashHex;
  readonly issuedAt: ISODateString;
  /** Signature over the canonical receipt payload. */
  readonly signature: {
    readonly algorithm: string;
    readonly keyId: string;
    readonly value: string;
  };
}

/**
 * Audit search filter used by the audit viewer (spec §9.12). Filters are
 * validated server-side; unbounded queries are forbidden.
 */
export interface AuditQuery {
  readonly tenantId: TenantId;
  readonly category?: AuditCategory;
  readonly code?: AuditEventCode;
  readonly severity?: AuditSeverity;
  readonly result?: AuditResult;
  readonly actorUserId?: UUID;
  readonly resourceKind?: string;
  readonly resourceId?: UUID;
  readonly from?: ISODateString;
  readonly to?: ISODateString;
  readonly correlationId?: UUID;
}

/**
 * Result of an audit integrity verification pass. Periodic integrity
 * verification is required (spec §9.12).
 */
export interface AuditIntegrityReport {
  readonly tenantId: TenantId;
  readonly verifiedAt: ISODateString;
  readonly eventsVerified: number;
  readonly brokenChainAt: number | null;
  readonly tamperedEventIds: readonly UUID[];
  readonly ok: boolean;
}
