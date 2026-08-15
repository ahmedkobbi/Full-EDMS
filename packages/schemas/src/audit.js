"use strict";
/**
 * @smart-edms/schemas — audit, evidence, hash chain (spec §9.12)
 *
 * Zod schemas for: audit query, export request, hash-chain verify.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditIntegrityReportSchema = exports.AuditVerifyRequestSchema = exports.HashChainReceiptSchema = exports.AuditExportResponseSchema = exports.AuditExportRequestSchema = exports.AuditQuerySchema = exports.AuditEventSchema = exports.AuditResourceSchema = exports.AuditActorSchema = exports.AuditSeveritySchema = exports.AuditEventCodeSchema = exports.AuditCategorySchema = exports.HashChainReceiptIdSchema = exports.AuditEventIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.AuditEventIdSchema = common_1.UuidSchema.transform((v) => v);
exports.HashChainReceiptIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `AuditCategory` (24 categories per spec §9.12). */
exports.AuditCategorySchema = zod_1.z.enum([
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
exports.AuditEventCodeSchema = zod_1.z.enum([
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
exports.AuditSeveritySchema = zod_1.z.enum(['info', 'notice', 'warning', 'critical']);
// ---------------------------------------------------------------------------
// Actor / Resource / Event
// ---------------------------------------------------------------------------
/** `z.infer` matches `AuditActor`. */
exports.AuditActorSchema = zod_1.z
    .object({
    kind: common_1.AuditActorKindSchema,
    userId: common_1.UuidSchema.nullable(),
    serviceAccountId: common_1.UuidSchema.nullable(),
    tenantId: tenant_1.TenantIdSchema,
    sessionId: common_1.UuidSchema.nullable(),
    deviceFingerprint: zod_1.z.string().min(1).max(256).nullable(),
    ip: zod_1.z.string().min(1).max(64).nullable(),
    userAgent: zod_1.z.string().min(1).max(512).nullable(),
})
    .strict();
/** `z.infer` matches `AuditResource`. */
exports.AuditResourceSchema = zod_1.z
    .object({
    kind: zod_1.z.string().min(1).max(64),
    id: common_1.UuidSchema,
    versionId: common_1.UuidSchema.nullable(),
    tenantId: tenant_1.TenantIdSchema.nullable(),
})
    .strict();
/** `z.infer` matches `AuditEvent`. */
exports.AuditEventSchema = zod_1.z
    .object({
    id: exports.AuditEventIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    sequenceNumber: zod_1.z.number().int().min(0),
    category: exports.AuditCategorySchema,
    code: exports.AuditEventCodeSchema,
    severity: exports.AuditSeveritySchema,
    actor: exports.AuditActorSchema,
    resource: exports.AuditResourceSchema.nullable(),
    result: common_1.AuditResultSchema,
    reasonKey: zod_1.z.string().min(1).max(128).nullable(),
    reasonText: zod_1.z.string().min(0).max(4000).nullable(),
    correlationId: common_1.UuidSchema.nullable(),
    occurredAt: common_1.IsoDateStringSchema,
    previousHash: common_1.HashHexSchema.nullable(),
    eventHash: common_1.HashHexSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// Query / Export
// ---------------------------------------------------------------------------
/** Request body for `POST /v1/audit/query`. `z.infer` matches `AuditQuery`. */
exports.AuditQuerySchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema.optional(),
    category: exports.AuditCategorySchema.optional(),
    code: exports.AuditEventCodeSchema.optional(),
    severity: exports.AuditSeveritySchema.optional(),
    result: common_1.AuditResultSchema.optional(),
    actorUserId: common_1.UuidSchema.optional(),
    resourceKind: zod_1.z.string().min(1).max(64).optional(),
    resourceId: common_1.UuidSchema.optional(),
    from: common_1.IsoDateStringSchema.optional(),
    to: common_1.IsoDateStringSchema.optional(),
    correlationId: common_1.UuidSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(500).default(100),
    cursor: zod_1.z.string().min(1).max(1024).nullable().optional(),
})
    .strict();
/** Request body for `POST /v1/audit/export` (export request). */
exports.AuditExportRequestSchema = zod_1.z
    .object({
    query: exports.AuditQuerySchema,
    format: zod_1.z.enum(['csv', 'json', 'jsonl', 'pdf']).default('csv'),
    // Signed URL expiry in seconds.
    urlExpirySeconds: zod_1.z.number().int().min(60).max(86400).default(3600),
})
    .strict();
/** Response body for audit export request (async job). */
exports.AuditExportResponseSchema = zod_1.z
    .object({
    jobId: common_1.UuidSchema,
    status: zod_1.z.enum(['queued', 'running', 'completed', 'failed']),
    downloadUrl: zod_1.z.string().url().nullable(),
    expiresAt: common_1.IsoDateStringSchema.nullable(),
})
    .strict();
// ---------------------------------------------------------------------------
// Hash-chain verify
// ---------------------------------------------------------------------------
/** `z.infer` matches `HashChainReceipt`. */
exports.HashChainReceiptSchema = zod_1.z
    .object({
    id: exports.HashChainReceiptIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    fromSequence: zod_1.z.number().int().min(0),
    toSequence: zod_1.z.number().int().min(0),
    headHash: common_1.HashHexSchema,
    tailHash: common_1.HashHexSchema,
    rootHash: common_1.HashHexSchema,
    issuedAt: common_1.IsoDateStringSchema,
    signature: zod_1.z
        .object({
        algorithm: zod_1.z.string().min(1).max(64),
        keyId: zod_1.z.string().min(1).max(128),
        value: zod_1.z.string().min(1).max(2048),
    })
        .strict(),
})
    .strict();
/** Request body for `POST /v1/audit/verify` (hash-chain verify). */
exports.AuditVerifyRequestSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    fromSequence: zod_1.z.number().int().min(0).optional(),
    toSequence: zod_1.z.number().int().min(0).optional(),
})
    .strict();
/** `z.infer` matches `AuditIntegrityReport`. */
exports.AuditIntegrityReportSchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema,
    verifiedAt: common_1.IsoDateStringSchema,
    eventsVerified: zod_1.z.number().int().min(0),
    brokenChainAt: zod_1.z.number().int().min(0).nullable(),
    tamperedEventIds: zod_1.z.array(common_1.UuidSchema),
    ok: zod_1.z.boolean(),
})
    .strict();
//# sourceMappingURL=audit.js.map