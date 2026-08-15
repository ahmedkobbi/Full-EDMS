/**
 * @smart-edms/types — retention, legal hold, disposition (spec §9.7)
 *
 * Purpose: model retention schedules, retention triggers, legal holds,
 * disposition records, and certificates of disposition. Legal hold overrides
 * normal deletion; disposition jobs must be idempotent (spec §9.7).
 */

import type { ISODateString, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId } from './document';

/** Branded retention-schedule identifier. */
export type RetentionScheduleId = UUID & {
  readonly __retentionSchedule: 'RetentionScheduleId';
};

/** Branded legal-hold identifier. */
export type LegalHoldId = UUID & { readonly __legalHold: 'LegalHoldId' };

/** Branded disposition-record identifier. */
export type DispositionRecordId = UUID & {
  readonly __dispositionRecord: 'DispositionRecordId';
};

/**
 * Event that starts the retention clock (spec §9.7). `custom` allows tenant
 * plugins to define their own trigger via a resolver code.
 */
export type RetentionTrigger =
  | { readonly kind: 'creation' }
  | { readonly kind: 'last_modified' }
  | { readonly kind: 'declaration_of_record' }
  | { readonly kind: 'workflow_completed'; readonly workflowDefinitionId: UUID }
  | { readonly kind: 'classification_set'; readonly classificationLabelId: UUID }
  | { readonly kind: 'custom'; readonly resolverCode: string };

/** Action taken when retention expires. */
export type DispositionAction =
  | 'destroy'
  | 'archive'
  | 'review'
  | 'transfer_to_custodian'
  | 'crypto_shred';

/** Status of a disposition record. */
export type DispositionStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'blocked_by_legal_hold';

/**
 * Retention schedule. Schedules are tenant-scoped and may be bound to a
 * document type (spec §9.5 / §9.7).
 */
export interface RetentionSchedule {
  readonly id: RetentionScheduleId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly description: string | null;
  /** Localised label key, rendered via `t()`. */
  readonly labelKey: string;
  /** Trigger that starts the retention clock. */
  readonly trigger: RetentionTrigger;
  /** Retention duration in days once the trigger fires. */
  readonly retentionDays: number;
  /** Disposition action taken at expiry. */
  readonly dispositionAction: DispositionAction;
  /** Whether crypto-shredding is permitted (spec §9.7). */
  readonly cryptoShreddingAllowed: boolean;
  /** Optional review period in days before disposition. */
  readonly reviewPeriodDays: number | null;
  readonly enabled: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/** Reason a legal hold was applied. */
export type LegalHoldReason =
  | 'litigation'
  | 'regulatory_inquiry'
  | 'audit'
  | 'investigation'
  | 'compliance_review'
  | 'custom';

/** Status of a legal hold. */
export type LegalHoldStatus = 'active' | 'released' | 'superseded';

/**
 * Legal-hold record. Per spec §9.7 legal hold overrides normal deletion and
 * blocks destructive version cleanup. Removal requires explicit release by
 * an authorised user.
 */
export interface LegalHold {
  readonly id: LegalHoldId;
  readonly tenantId: TenantId;
  /** Stable machine code for the hold case. */
  readonly caseCode: string;
  readonly reason: LegalHoldReason;
  readonly description: string | null;
  readonly status: LegalHoldStatus;
  /** Documents placed under hold. */
  readonly documentIds: readonly DocumentId[];
  /** User who applied the hold. */
  readonly appliedBy: UserId;
  readonly appliedAt: ISODateString;
  readonly releasedBy: UserId | null;
  readonly releasedAt: ISODateString | null;
  /** Localised release-reason key. */
  readonly releaseReasonKey: string | null;
}

/**
 * Disposition record. Per spec §9.7 disposition events must produce durable
 * evidence; this record is the certificate of disposition.
 */
export interface DispositionRecord {
  readonly id: DispositionRecordId;
  readonly tenantId: TenantId;
  readonly documentId: DocumentId;
  readonly scheduleId: RetentionScheduleId;
  readonly action: DispositionAction;
  readonly status: DispositionStatus;
  /** Trigger that fired to start the retention clock. */
  readonly trigger: RetentionTrigger;
  /** When the retention clock started. */
  readonly triggeredAt: ISODateString;
  /** When disposition was scheduled to occur. */
  readonly scheduledFor: ISODateString;
  /** When the disposition was actually executed. */
  readonly executedAt: ISODateString | null;
  /** User or system that approved the disposition. */
  readonly approvedBy: UserId | null;
  readonly approvedAt: ISODateString | null;
  /** Durable evidence blob hash (immutable proof of destruction). */
  readonly evidenceHash: string | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Certificate of disposition. Issued upon successful completion of a
 * disposition action; exportable for compliance review.
 */
export interface DispositionCertificate {
  readonly recordId: DispositionRecordId;
  readonly tenantId: TenantId;
  readonly documentId: DocumentId;
  readonly action: DispositionAction;
  readonly executedAt: ISODateString;
  readonly evidenceHash: string;
  /** Localised certificate title key. */
  readonly titleKey: string;
  /** Signature over the canonical certificate payload. */
  readonly signature: {
    readonly algorithm: string;
    readonly keyId: string;
    readonly value: string;
  };
}

/**
 * Predictive legal-hold suggestion (spec §9.7). Produced by the AI service
 * and surfaced for human review. Never auto-applied.
 */
export interface PredictiveLegalHoldSuggestion {
  readonly tenantId: TenantId;
  readonly documentId: DocumentId;
  readonly suggestedReason: LegalHoldReason;
  /** Confidence score in [1,100]. */
  readonly confidence: number;
  /** Localised explanation key. */
  readonly explanationKey: string;
  /** Always true — suggestions require human approval (spec §9.7 / §9.14). */
  readonly requiresHumanApproval: true;
  readonly suggestedAt: ISODateString;
}
