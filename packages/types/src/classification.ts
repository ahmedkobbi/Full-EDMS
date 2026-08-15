/**
 * @smart-edms/types — classification and sensitivity labels (spec §9.4)
 *
 * Purpose: define the configurable classification taxonomy, default
 * sensitivity levels, classification history, and the rules that govern
 * label changes (downgrades require justification and permission).
 */

import type { ISODateString, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId } from './document';

/** Branded classification-label identifier. */
export type ClassificationLabelId = UUID & {
  readonly __classificationLabel: 'ClassificationLabelId';
};

/** Branded classification-history identifier. */
export type ClassificationHistoryId = UUID & {
  readonly __classificationHistory: 'ClassificationHistoryId';
};

/**
 * Sensitivity level. Higher numbers indicate higher sensitivity. The default
 * suggested labels (spec §9.4) map to:
 *  - 1 Public
 *  - 2 Internal
 *  - 3 Confidential
 *  - 4 Restricted
 *  - 5 Highly Sensitive
 */
export type SensitivityLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Default sensitivity label names. Tenants may define custom labels but the
 * default taxonomy (spec §9.4) must remain available as a baseline.
 */
export type DefaultSensitivityName =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'highly_sensitive';

/** Banner colour used in the classification banner (spec §9.4). */
export type ClassificationBannerColor =
  | 'green'
  | 'blue'
  | 'amber'
  | 'orange'
  | 'red'
  | 'custom';

/**
 * Classification label definition. Localised names and descriptions are
 * referenced by message keys so they render correctly in every locale,
 * including RTL Arabic.
 */
export interface ClassificationLabel {
  readonly id: ClassificationLabelId;
  readonly tenantId: TenantId;
  /** Stable machine code, e.g. `restricted`. */
  readonly code: string;
  /** Localised label key, rendered via `t()`. */
  readonly labelKey: string;
  /** Localised description key. */
  readonly descriptionKey: string;
  readonly sensitivity: SensitivityLevel;
  /** Whether downgrades require justification and permission. */
  readonly downgradeRequiresJustification: boolean;
  /** Banner colour used in the secure viewer (spec §9.9). */
  readonly bannerColor: ClassificationBannerColor;
  /** Whether AI is allowed to summarise content with this label. */
  readonly aiSummaryAllowed: boolean;
  /** Whether external sharing is permitted for content with this label. */
  readonly externalShareAllowed: boolean;
  /** Order in which labels appear in the picker. */
  readonly order: number;
  readonly enabled: boolean;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/** Direction of a classification change. */
export type ClassificationChangeDirection = 'upgrade' | 'downgrade' | 'lateral';

/**
 * Entry in the classification history of a document. Per spec §9.4 all
 * classification changes must be audited; downgrades must require
 * justification and permission.
 */
export interface ClassificationHistory {
  readonly id: ClassificationHistoryId;
  readonly tenantId: TenantId;
  readonly documentId: DocumentId;
  readonly fromLabelId: ClassificationLabelId | null;
  readonly toLabelId: ClassificationLabelId;
  readonly direction: ClassificationChangeDirection;
  /** Localised reason-code key, when applicable. */
  readonly reasonKey: string | null;
  /** Free-form justification text, required for downgrades. */
  readonly justification: string | null;
  readonly changedBy: UserId;
  readonly changedAt: ISODateString;
}

/**
 * Result of evaluating classification policy for an action. Used by the
 * enforcement layer to decide allow/deny before mutation.
 */
export interface ClassificationPolicyResult {
  readonly allowed: boolean;
  /** Localised denial reason key, when denied. */
  readonly denialReasonKey: string | null;
  /** Whether step-up authentication is required. */
  readonly requiresStepUp: boolean;
  /** Whether legal hold blocks the action (spec §9.4). */
  readonly blockedByLegalHold: boolean;
}
