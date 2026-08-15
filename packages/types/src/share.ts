/**
 * @smart-edms/types — sharing and external collaboration (spec §9.11)
 *
 * Purpose: model share links, share permissions, recipients, and the
 * external-sharing policy envelope. External sharing is denied by default
 * (spec §9.11) and must be policy-checked and audited.
 */

import type { ISODateString, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId } from './document';

/** Branded share-link identifier. */
export type ShareLinkId = UUID & { readonly __shareLink: 'ShareLinkId' };

/** Branded share-recipient identifier. */
export type ShareRecipientId = UUID & { readonly __shareRecipient: 'ShareRecipientId' };

/**
 * Permission granted to a share recipient. Reflects the document operations
 * the recipient is allowed to perform.
 */
export type SharePermission =
  | 'view'
  | 'view_with_watermark'
  | 'download'
  | 'comment'
  | 'annotate'
  | 'redact'
  | 'edit_metadata';

/** Recipient verification status. */
export type ShareRecipientStatus =
  | 'pending'
  | 'verified'
  | 'accessed'
  | 'expired'
  | 'revoked';

/** Kind of share recipient. */
export type ShareRecipientKind = 'internal_user' | 'external_email' | 'anonymous';

/**
 * Share link. Cryptographically random (spec §9.11); passwords are hashed
 * and never returned by the API.
 */
export interface ShareLink {
  readonly id: ShareLinkId;
  readonly tenantId: TenantId;
  readonly documentId: DocumentId;
  /** Optional version pin; `null` means share the head version. */
  readonly versionId: UUID | null;
  /** Created by user. */
  readonly createdBy: UserId;
  /** Cryptographically random URL token. */
  readonly token: string;
  /** Permissions granted to recipients of this link. */
  readonly permissions: readonly SharePermission[];
  /** Whether the link requires a password. */
  readonly passwordProtected: boolean;
  /** Whether anonymous access is allowed (strongly restricted). */
  readonly anonymousAllowed: boolean;
  /** Whether download is disabled (view-only mode, spec §9.11). */
  readonly downloadDisabled: boolean;
  /** Whether a dynamic watermark is applied to viewers (spec §9.9). */
  readonly watermarkEnabled: boolean;
  readonly maxAccessCount: number | null;
  readonly accessCount: number;
  readonly expiresAt: ISODateString | null;
  readonly revokedAt: ISODateString | null;
  readonly revokedBy: UserId | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Share recipient. Carries the kind (internal/external/anonymous) and the
 * verification state. External recipients must be verified (spec §9.11).
 */
export interface ShareRecipient {
  readonly id: ShareRecipientId;
  readonly tenantId: TenantId;
  readonly shareLinkId: ShareLinkId;
  readonly kind: ShareRecipientKind;
  /** Email for external recipients; user id for internal; null for anonymous. */
  readonly email: string | null;
  readonly internalUserId: UserId | null;
  /** Localised notification locale (when known). */
  readonly locale: string | null;
  readonly status: ShareRecipientStatus;
  readonly firstAccessedAt: ISODateString | null;
  readonly lastAccessedAt: ISODateString | null;
  readonly createdAt: ISODateString;
}

/**
 * Share-access audit entry. Each access is logged for compliance review.
 */
export interface ShareAccessLog {
  readonly id: UUID;
  readonly tenantId: TenantId;
  readonly shareLinkId: ShareLinkId;
  readonly recipientId: ShareRecipientId | null;
  readonly action: 'view' | 'download' | 'preview' | 'password_check_failed';
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly occurredAt: ISODateString;
}

/**
 * Result of evaluating sharing policy for a proposed share. External
 * sharing is denied by default unless tenant policy explicitly allows it
 * (spec §9.11).
 */
export interface SharePolicyResult {
  readonly allowed: boolean;
  readonly denialReasonKey: string | null;
  /** Whether the document's classification blocks external sharing. */
  readonly blockedByClassification: boolean;
  /** Whether a legal hold blocks the share. */
  readonly blockedByLegalHold: boolean;
  /** Whether anonymous access is permitted for this document. */
  readonly anonymousAllowed: boolean;
}
