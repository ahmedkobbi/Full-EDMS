/**
 * @smart-edms/schemas — audit, evidence, hash chain (spec §9.12)
 *
 * Zod schemas for: audit query, export request, hash-chain verify.
 */

import { z } from 'zod';
import type { AuditEventId, HashChainReceiptId } from '@smart-edms/types';
import {
  AuditActorKindSchema,
  AuditResultSchema,
  HashHexSchema,
  IsoDateStringSchema,
  UuidSchema,
} from './common';
import { TenantIdSchema } from './tenant';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const AuditEventIdSchema = UuidSchema.transform(
  (v): AuditEventId => v as AuditEventId,
);
export const HashChainReceiptIdSchema = UuidSchema.transform(
  (v): HashChainReceiptId => v as HashChainReceiptId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `AuditCategory` (24 categories per spec §9.12). */
export const AuditCategorySchema = z.enum([
  'authentication',
  'authorization',
  'access',
  'create',
  'read',
  'update',
  'delete',
  'download',
  'preview',
  'redaction',
  'export',
  'sharing',
  'workflow',
  'admin',
  'locale',
  'license',
  'tour',
  'ai_assistant',
  'security',
  'retention',
  'legal_hold',
  'classification',
  'scanner',
  'provenance',
]);

/** `z.infer` === `AuditEventCode` (60+ stable codes per spec §9.12). */
export const AuditEventCodeSchema = z.enum([
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.token_refreshed',
  'auth.mfa_enrolled',
  'auth.mfa_challenged',
  'auth.breakglass_used',
  'access.granted',
  'access.denied',
  'document.created',
  'document.read',
  'document.updated',
  'document.deleted',
  'document.downloaded',
  'document.previewed',
  'document.version.created',
  'document.version.restored',
  'document.classification.changed',
  'document.checkout',
  'document.checkin',
  'document.redacted',
  'document.redaction_exported',
  'document.shared',
  'document.share_revoked',
  'workflow.started',
  'workflow.step_updated',
  'workflow.approval_requested',
  'workflow.approval_completed',
  'workflow.cancelled',
  'retention.schedule_applied',
  'retention.disposition_executed',
  'legal_hold.applied',
  'legal_hold.released',
  'classification.label_assigned',
  'classification.downgrade_denied',
  'admin.user_created',
  'admin.user_suspended',
  'admin.role_changed',
  'admin.policy_changed',
  'admin.tenant_updated',
  'license.activated',
  'license.heartbeat_received',
  'license.revoked',
  'license.expired',
  'license.imported',
  'tour.started',
  'tour.completed',
  'tour.skipped',
  'tour.dismissed',
  'ai.session_started',
  'ai.message_sent',
  'ai.tool_invoked',
  'ai.action_suggested',
  'ai.action_confirmed',
  'ai.action_denied',
  'ai.prompt_injection_detected',
  'scanner.job_started',
  'scanner.job_completed',
  'scanner.job_failed',
  'provenance.c2pa_verified',
  'provenance.forgery_detected',
]);

/** `z.infer` === `AuditSeverity`. */
export const AuditSeveritySchema = z.enum(['info', 'notice', 'warning', 'critical']);

// ---------------------------------------------------------------------------
// Actor / Resource / Event
// ---------------------------------------------------------------------------

/** `z.infer` matches `AuditActor`. */
export const AuditActorSchema = z
  .object({
    kind: AuditActorKindSchema,
    userId: UuidSchema.nullable(),
    serviceAccountId: UuidSchema.nullable(),
    tenantId: TenantIdSchema,
    sessionId: UuidSchema.nullable(),
    deviceFingerprint: z.string().min(1).max(256).nullable(),
    ip: z.string().min(1).max(64).nullable(),
    userAgent: z.string().min(1).max(512).nullable(),
  })
  .strict();

/** `z.infer` matches `AuditResource`. */
export const AuditResourceSchema = z
  .object({
    kind: z.string().min(1).max(64),
    id: UuidSchema,
    versionId: UuidSchema.nullable(),
    tenantId: TenantIdSchema.nullable(),
  })
  .strict();

/** `z.infer` matches `AuditEvent`. */
export const AuditEventSchema = z
  .object({
    id: AuditEventIdSchema,
    tenantId: TenantIdSchema,
    sequenceNumber: z.number().int().min(0),
    category: AuditCategorySchema,
    code: AuditEventCodeSchema,
    severity: AuditSeveritySchema,
    actor: AuditActorSchema,
    resource: AuditResourceSchema.nullable(),
    result: AuditResultSchema,
    reasonKey: z.string().min(1).max(128).nullable(),
    reasonText: z.string().min(0).max(4000).nullable(),
    correlationId: UuidSchema.nullable(),
    occurredAt: IsoDateStringSchema,
    previousHash: HashHexSchema.nullable(),
    eventHash: HashHexSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Query / Export
// ---------------------------------------------------------------------------

/** Request body for `POST /v1/audit/query`. `z.infer` matches `AuditQuery`. */
export const AuditQuerySchema = z
  .object({
    tenantId: TenantIdSchema.optional(),
    category: AuditCategorySchema.optional(),
    code: AuditEventCodeSchema.optional(),
    severity: AuditSeveritySchema.optional(),
    result: AuditResultSchema.optional(),
    actorUserId: UuidSchema.optional(),
    resourceKind: z.string().min(1).max(64).optional(),
    resourceId: UuidSchema.optional(),
    from: IsoDateStringSchema.optional(),
    to: IsoDateStringSchema.optional(),
    correlationId: UuidSchema.optional(),
    limit: z.number().int().min(1).max(500).default(100),
    cursor: z.string().min(1).max(1024).nullable().optional(),
  })
  .strict();

/** Request body for `POST /v1/audit/export` (export request). */
export const AuditExportRequestSchema = z
  .object({
    query: AuditQuerySchema,
    format: z.enum(['csv', 'json', 'jsonl', 'pdf']).default('csv'),
    // Signed URL expiry in seconds.
    urlExpirySeconds: z.number().int().min(60).max(86400).default(3600),
  })
  .strict();

/** Response body for audit export request (async job). */
export const AuditExportResponseSchema = z
  .object({
    jobId: UuidSchema,
    status: z.enum(['queued', 'running', 'completed', 'failed']),
    downloadUrl: z.string().url().nullable(),
    expiresAt: IsoDateStringSchema.nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Hash-chain verify
// ---------------------------------------------------------------------------

/** `z.infer` matches `HashChainReceipt`. */
export const HashChainReceiptSchema = z
  .object({
    id: HashChainReceiptIdSchema,
    tenantId: TenantIdSchema,
    fromSequence: z.number().int().min(0),
    toSequence: z.number().int().min(0),
    headHash: HashHexSchema,
    tailHash: HashHexSchema,
    rootHash: HashHexSchema,
    issuedAt: IsoDateStringSchema,
    signature: z
      .object({
        algorithm: z.string().min(1).max(64),
        keyId: z.string().min(1).max(128),
        value: z.string().min(1).max(2048),
      })
      .strict(),
  })
  .strict();

/** Request body for `POST /v1/audit/verify` (hash-chain verify). */
export const AuditVerifyRequestSchema = z
  .object({
    tenantId: TenantIdSchema,
    fromSequence: z.number().int().min(0).optional(),
    toSequence: z.number().int().min(0).optional(),
  })
  .strict();

/** `z.infer` matches `AuditIntegrityReport`. */
export const AuditIntegrityReportSchema = z
  .object({
    tenantId: TenantIdSchema,
    verifiedAt: IsoDateStringSchema,
    eventsVerified: z.number().int().min(0),
    brokenChainAt: z.number().int().min(0).nullable(),
    tamperedEventIds: z.array(UuidSchema),
    ok: z.boolean(),
  })
  .strict();
