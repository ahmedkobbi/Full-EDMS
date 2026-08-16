-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITED', 'DELETED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'RECORD', 'DELETED', 'PROCESSING', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "WorkflowModelKind" AS ENUM ('BPMN', 'CMMN', 'DMN');

-- CreateEnum
CREATE TYPE "WorkflowDefinitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'RUNNING', 'APPROVED', 'REJECTED', 'CANCELLED', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'DELEGATED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DispositionStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'CANCELLED', 'BLOCKED_LEGAL_HOLD');

-- CreateEnum
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SecurityIncidentStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "ScannerJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "TourUserStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'DISMISSED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultLocale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "enabledLocales" TEXT[] DEFAULT ARRAY['en', 'fr', 'ar', 'ru', 'zh-CN', 'de']::TEXT[],
    "defaultTheme" VARCHAR(16) NOT NULL DEFAULT 'system',
    "flagConfig" JSONB NOT NULL DEFAULT '{"ar":"neutral"}',
    "branding" JSONB,
    "dataResidency" VARCHAR(64),
    "quotaUsers" INTEGER NOT NULL DEFAULT 50,
    "quotaStorageBytes" BIGINT NOT NULL DEFAULT 10737418240,
    "quotaDocuments" INTEGER NOT NULL DEFAULT 100000,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" VARCHAR(64),
    "mfaBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredLocale" VARCHAR(16),
    "preferredTheme" VARCHAR(16),
    "preferredTimezone" VARCHAR(64),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "lastLoginIp" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "theme" VARCHAR(16) NOT NULL DEFAULT 'system',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "numbering" VARCHAR(16),
    "direction" VARCHAR(8),
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "tourAutoStart" BOOLEAN NOT NULL DEFAULT true,
    "aiAssistantEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "deviceFingerprint" VARCHAR(128),
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_trust" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fingerprint" VARCHAR(128) NOT NULL,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "device_trust_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "role" VARCHAR(32) NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "folderId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentType" VARCHAR(64),
    "sourceSystem" VARCHAR(128),
    "contentLanguage" VARCHAR(16),
    "textDirection" VARCHAR(8),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "classificationId" UUID,
    "sensitivityLevel" INTEGER NOT NULL DEFAULT 2,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isRecord" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedByUserId" UUID,
    "lockedAt" TIMESTAMPTZ(3),
    "checksumAlgorithm" VARCHAR(16) NOT NULL DEFAULT 'sha256',
    "checksum" VARCHAR(128),
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "currentVersionId" UUID,
    "retentionScheduleId" UUID,
    "legalHoldActive" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumAlgorithm" VARCHAR(16) NOT NULL DEFAULT 'sha256',
    "checksum" VARCHAR(128) NOT NULL,
    "mime" VARCHAR(128) NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "createdByUserId" UUID,
    "changeReason" TEXT,
    "isImmutable" BOOLEAN NOT NULL DEFAULT true,
    "encryptionKeyRef" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_comments" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "anchor" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metadata_schemas" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" VARCHAR(64),
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "metadata_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metadata_values" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "schemaId" UUID,
    "fieldCode" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "metadata_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classification_labels" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "nameKey" TEXT NOT NULL,
    "descriptionKey" TEXT,
    "sensitivityLevel" INTEGER NOT NULL,
    "color" VARCHAR(16),
    "bannerText" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "classification_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classification_history" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fromLabelId" UUID,
    "toLabelId" UUID,
    "reason" TEXT,
    "changedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classification_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelKind" "WorkflowModelKind" NOT NULL,
    "bpmnXml" TEXT,
    "dmnTableXml" TEXT,
    "cmmnXml" TEXT,
    "definitionJson" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "isAiDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "documentId" UUID,
    "tenantId" UUID NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "context" JSONB NOT NULL,
    "startedByUserId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "dueAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "stepKey" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "assigneeId" UUID,
    "delegateId" UUID,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "dueAt" TIMESTAMPTZ(3),
    "metadata" JSONB,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "approverId" UUID NOT NULL,
    "decision" "ApprovalDecision",
    "comment" TEXT,
    "signature" TEXT,
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_schedules" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerKind" VARCHAR(32) NOT NULL,
    "triggerDateField" VARCHAR(64),
    "retentionDays" INTEGER NOT NULL,
    "dispositionAction" VARCHAR(32) NOT NULL DEFAULT 'delete',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "retention_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_holds" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "caseReference" VARCHAR(128),
    "placedByUserId" UUID NOT NULL,
    "releasedByUserId" UUID,
    "releasedAt" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposition_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "retentionScheduleId" UUID NOT NULL,
    "legalHoldId" UUID,
    "status" "DispositionStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "executedAt" TIMESTAMPTZ(3),
    "certificateKey" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "disposition_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "actorKind" VARCHAR(32) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "result" VARCHAR(16) NOT NULL,
    "resourceType" VARCHAR(64),
    "resourceId" UUID,
    "documentId" UUID,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "correlationId" VARCHAR(64),
    "reason" TEXT,
    "metadata" JSONB,
    "sequenceNumber" BIGINT NOT NULL,
    "previousHash" VARCHAR(128),
    "eventHash" VARCHAR(128) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provenance_manifests" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "manifestKind" VARCHAR(32) NOT NULL,
    "c2paManifest" JSONB,
    "chainOfCustody" JSONB,
    "forgeryVerdict" VARCHAR(32),
    "forgeryScore" DOUBLE PRECISION,
    "signedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "passwordHash" VARCHAR(128),
    "permission" VARCHAR(32) NOT NULL DEFAULT 'view',
    "expiresAt" TIMESTAMPTZ(3),
    "maxViews" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMPTZ(3),
    "recipientEmail" VARCHAR(256),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" VARCHAR(32) NOT NULL DEFAULT 'in_app',
    "severity" VARCHAR(16) NOT NULL DEFAULT 'info',
    "titleKey" TEXT NOT NULL,
    "bodyKey" TEXT NOT NULL,
    "titleVars" JSONB,
    "bodyVars" JSONB,
    "actionUrl" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_local_state" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "licenseId" UUID,
    "deploymentId" VARCHAR(128) NOT NULL,
    "environment" VARCHAR(32) NOT NULL DEFAULT 'production',
    "state" VARCHAR(32) NOT NULL DEFAULT 'invalid',
    "kid" VARCHAR(64),
    "alg" VARCHAR(16),
    "payloadJson" JSONB,
    "signature" TEXT,
    "fingerprintHash" VARCHAR(128),
    "lastHeartbeatAt" TIMESTAMPTZ(3),
    "heartbeatFailures" INTEGER NOT NULL DEFAULT 0,
    "graceExhaustedAt" TIMESTAMPTZ(3),
    "importedAt" TIMESTAMPTZ(3),
    "importedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "encryptedPayload" TEXT,
    "maxObservedTimestamp" VARCHAR(32),
    "integrityBaseline" TEXT,
    "lastIntegrityOk" BOOLEAN DEFAULT true,
    "lastIntegrityCheckAt" TIMESTAMPTZ(3),
    "crlLastCheckedAt" TIMESTAMPTZ(3),
    "wrappedPublicKey" TEXT,

    CONSTRAINT "license_local_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "severity" "SecurityIncidentSeverity" NOT NULL DEFAULT 'WARNING',
    "status" "SecurityIncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "category" VARCHAR(64) NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "reason" TEXT NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "forwardedFor" VARCHAR(256),
    "userId" UUID,
    "userEmail" VARCHAR(256),
    "userRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "machineFingerprint" VARCHAR(128),
    "deploymentId" VARCHAR(128),
    "hostname" VARCHAR(128),
    "platform" VARCHAR(32),
    "arch" VARCHAR(32),
    "nodeVersion" VARCHAR(256),
    "processPid" INTEGER,
    "envFlags" JSONB,
    "requestMethod" VARCHAR(8),
    "requestUrl" VARCHAR(512),
    "requestHeaders" JSONB,
    "requestBody" TEXT,
    "callStack" TEXT,
    "failedLayers" JSONB,
    "autoLockedDown" BOOLEAN NOT NULL DEFAULT false,
    "autoBlockedIp" BOOLEAN NOT NULL DEFAULT false,
    "autoSuspendedUser" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" UUID,
    "acknowledgedAt" TIMESTAMPTZ(3),
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolutionNote" TEXT,
    "sequenceNumber" BIGINT NOT NULL DEFAULT 1,
    "previousHash" VARCHAR(64),
    "eventHash" VARCHAR(64) NOT NULL,
    "correlationId" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_ips" (
    "id" UUID NOT NULL,
    "ipAddress" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "incidentId" UUID,
    "blockedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "blockedBy" VARCHAR(64),
    "attemptCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scanner_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "driverKind" VARCHAR(32) NOT NULL DEFAULT 'upload',
    "deviceId" VARCHAR(128),
    "settings" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "scanner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scanner_jobs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "profileId" UUID,
    "documentId" UUID,
    "status" "ScannerJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "ocrLanguage" VARCHAR(32),
    "confidenceScore" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "scanner_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_definitions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "module" VARCHAR(64) NOT NULL,
    "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 100,
    "version" INTEGER NOT NULL DEFAULT 1,
    "triggerType" VARCHAR(32) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "licenseModuleRequired" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tour_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_steps" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "targetSelector" VARCHAR(128) NOT NULL,
    "titleKey" TEXT NOT NULL,
    "bodyKey" TEXT NOT NULL,
    "placement" VARCHAR(16) NOT NULL DEFAULT 'auto',
    "requiresPermission" VARCHAR(128),
    "requiresLicenseModule" VARCHAR(64),
    "actionType" VARCHAR(32),
    "waitForEvent" VARCHAR(64),
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tour_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_user_states" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "status" "TourUserStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStepId" UUID,
    "currentStepOrder" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "skippedAt" TIMESTAMPTZ(3),
    "doNotShowAgain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tour_user_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_settings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "externalAiAllowed" BOOLEAN NOT NULL DEFAULT false,
    "localOnlyMode" BOOLEAN NOT NULL DEFAULT false,
    "modelProvider" VARCHAR(64),
    "chatRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "showCitations" BOOLEAN NOT NULL DEFAULT true,
    "allowNavigationActions" BOOLEAN NOT NULL DEFAULT false,
    "allowSuggestedActions" BOOLEAN NOT NULL DEFAULT true,
    "requireDisclaimer" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 20,
    "usageQuotaPerDay" INTEGER NOT NULL DEFAULT 200,
    "privacyNotice" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assistant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_sessions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "modelProvider" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assistant_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_messages" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "contentSummary" TEXT NOT NULL,
    "contentHash" VARCHAR(128) NOT NULL,
    "modelProvider" VARCHAR(64),
    "citationsJson" JSONB,
    "suggestedActions" JSONB,
    "disclaimerKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_tool_invocations" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "toolName" VARCHAR(64) NOT NULL,
    "inputSummary" TEXT NOT NULL,
    "outputSummary" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_tool_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_actions" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "actionType" VARCHAR(32) NOT NULL,
    "targetType" VARCHAR(32) NOT NULL,
    "targetId" UUID,
    "confirmationRequired" BOOLEAN NOT NULL DEFAULT true,
    "confirmedAt" TIMESTAMPTZ(3),
    "executedAt" TIMESTAMPTZ(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'suggested',

    CONSTRAINT "assistant_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_audit_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID,
    "messageId" UUID,
    "category" VARCHAR(64) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "result" VARCHAR(16) NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" VARCHAR(128) NOT NULL,
    "keyPrefix" VARCHAR(16) NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" VARCHAR(128),
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveryAt" TIMESTAMPTZ(3),
    "lastDeliveryStatus" VARCHAR(16),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'queued',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locale_resources" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "namespace" VARCHAR(64) NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "value" TEXT NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "locale_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "query" JSONB NOT NULL,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alertInterval" VARCHAR(16),
    "lastNotifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LegalHoldDocuments" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_preferences_tenantId_idx" ON "user_preferences"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_tenantId_userId_idx" ON "sessions"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "device_trust_tenantId_idx" ON "device_trust"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "device_trust_userId_fingerprint_key" ON "device_trust"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "groups_tenantId_idx" ON "groups"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_tenantId_name_key" ON "groups"("tenantId", "name");

-- CreateIndex
CREATE INDEX "group_members_tenantId_userId_idx" ON "group_members"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "roles_tenantId_idx" ON "roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_code_key" ON "roles"("tenantId", "code");

-- CreateIndex
CREATE INDEX "user_role_assignments_tenantId_idx" ON "user_role_assignments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_userId_roleId_key" ON "user_role_assignments"("userId", "roleId");

-- CreateIndex
CREATE INDEX "folders_tenantId_parentId_idx" ON "folders"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "folders_tenantId_path_idx" ON "folders"("tenantId", "path");

-- CreateIndex
CREATE INDEX "documents_tenantId_status_idx" ON "documents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "documents_tenantId_classificationId_idx" ON "documents"("tenantId", "classificationId");

-- CreateIndex
CREATE INDEX "documents_tenantId_createdByUserId_idx" ON "documents"("tenantId", "createdByUserId");

-- CreateIndex
CREATE INDEX "documents_tenantId_updatedAt_idx" ON "documents"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "documents_tenantId_isRecord_idx" ON "documents"("tenantId", "isRecord");

-- CreateIndex
CREATE INDEX "documents_tenantId_legalHoldActive_idx" ON "documents"("tenantId", "legalHoldActive");

-- CreateIndex
CREATE INDEX "document_versions_tenantId_documentId_idx" ON "document_versions"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "document_versions_tenantId_createdAt_idx" ON "document_versions"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "document_versions"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "document_comments_tenantId_documentId_idx" ON "document_comments"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "metadata_schemas_tenantId_idx" ON "metadata_schemas"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "metadata_schemas_tenantId_code_key" ON "metadata_schemas"("tenantId", "code");

-- CreateIndex
CREATE INDEX "metadata_values_tenantId_fieldCode_idx" ON "metadata_values"("tenantId", "fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "metadata_values_documentId_fieldCode_key" ON "metadata_values"("documentId", "fieldCode");

-- CreateIndex
CREATE INDEX "classification_labels_tenantId_sensitivityLevel_idx" ON "classification_labels"("tenantId", "sensitivityLevel");

-- CreateIndex
CREATE UNIQUE INDEX "classification_labels_tenantId_code_key" ON "classification_labels"("tenantId", "code");

-- CreateIndex
CREATE INDEX "classification_history_tenantId_documentId_createdAt_idx" ON "classification_history"("tenantId", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_definitions_tenantId_status_idx" ON "workflow_definitions"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_tenantId_code_version_key" ON "workflow_definitions"("tenantId", "code", "version");

-- CreateIndex
CREATE INDEX "workflow_instances_tenantId_status_idx" ON "workflow_instances"("tenantId", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_tenantId_documentId_idx" ON "workflow_instances"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "workflow_instances_tenantId_startedByUserId_idx" ON "workflow_instances"("tenantId", "startedByUserId");

-- CreateIndex
CREATE INDEX "workflow_steps_tenantId_instanceId_idx" ON "workflow_steps"("tenantId", "instanceId");

-- CreateIndex
CREATE INDEX "workflow_steps_tenantId_assigneeId_status_idx" ON "workflow_steps"("tenantId", "assigneeId", "status");

-- CreateIndex
CREATE INDEX "approvals_tenantId_instanceId_idx" ON "approvals"("tenantId", "instanceId");

-- CreateIndex
CREATE INDEX "approvals_tenantId_approverId_decision_idx" ON "approvals"("tenantId", "approverId", "decision");

-- CreateIndex
CREATE INDEX "retention_schedules_tenantId_isActive_idx" ON "retention_schedules"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "retention_schedules_tenantId_code_key" ON "retention_schedules"("tenantId", "code");

-- CreateIndex
CREATE INDEX "legal_holds_tenantId_isActive_idx" ON "legal_holds"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "legal_holds_tenantId_code_key" ON "legal_holds"("tenantId", "code");

-- CreateIndex
CREATE INDEX "disposition_records_tenantId_status_scheduledAt_idx" ON "disposition_records"("tenantId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_occurredAt_idx" ON "audit_events"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_code_idx" ON "audit_events"("tenantId", "code");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_userId_idx" ON "audit_events"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_resourceType_resourceId_idx" ON "audit_events"("tenantId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_correlationId_idx" ON "audit_events"("tenantId", "correlationId");

-- CreateIndex
CREATE INDEX "provenance_manifests_tenantId_documentId_idx" ON "provenance_manifests"("tenantId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_tenantId_documentId_idx" ON "share_links"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "share_links_tenantId_isActive_idx" ON "share_links"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_readAt_idx" ON "notifications"("tenantId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_tenantId_createdAt_idx" ON "notifications"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "license_local_state_tenantId_key" ON "license_local_state"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "license_local_state_deploymentId_key" ON "license_local_state"("deploymentId");

-- CreateIndex
CREATE INDEX "security_incidents_tenantId_severity_status_idx" ON "security_incidents"("tenantId", "severity", "status");

-- CreateIndex
CREATE INDEX "security_incidents_ipAddress_idx" ON "security_incidents"("ipAddress");

-- CreateIndex
CREATE INDEX "security_incidents_userId_idx" ON "security_incidents"("userId");

-- CreateIndex
CREATE INDEX "security_incidents_category_code_idx" ON "security_incidents"("category", "code");

-- CreateIndex
CREATE INDEX "security_incidents_createdAt_idx" ON "security_incidents"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_ips_ipAddress_key" ON "blocked_ips"("ipAddress");

-- CreateIndex
CREATE INDEX "blocked_ips_ipAddress_expiresAt_idx" ON "blocked_ips"("ipAddress", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "scanner_profiles_tenantId_code_key" ON "scanner_profiles"("tenantId", "code");

-- CreateIndex
CREATE INDEX "scanner_jobs_tenantId_status_idx" ON "scanner_jobs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "scanner_jobs_tenantId_createdByUserId_idx" ON "scanner_jobs"("tenantId", "createdByUserId");

-- CreateIndex
CREATE INDEX "tour_definitions_tenantId_enabled_idx" ON "tour_definitions"("tenantId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "tour_definitions_tenantId_code_key" ON "tour_definitions"("tenantId", "code");

-- CreateIndex
CREATE INDEX "tour_steps_tourId_stepOrder_idx" ON "tour_steps"("tourId", "stepOrder");

-- CreateIndex
CREATE INDEX "tour_user_states_tenantId_userId_status_idx" ON "tour_user_states"("tenantId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tour_user_states_tourId_userId_key" ON "tour_user_states"("tourId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_settings_tenantId_key" ON "assistant_settings"("tenantId");

-- CreateIndex
CREATE INDEX "assistant_sessions_tenantId_userId_idx" ON "assistant_sessions"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "assistant_sessions_tenantId_createdAt_idx" ON "assistant_sessions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_messages_tenantId_sessionId_idx" ON "assistant_messages"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "assistant_messages_tenantId_createdAt_idx" ON "assistant_messages"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "assistant_tool_invocations_tenantId_sessionId_idx" ON "assistant_tool_invocations"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "assistant_tool_invocations_tenantId_toolName_idx" ON "assistant_tool_invocations"("tenantId", "toolName");

-- CreateIndex
CREATE INDEX "assistant_actions_tenantId_sessionId_idx" ON "assistant_actions"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "assistant_audit_events_tenantId_occurredAt_idx" ON "assistant_audit_events"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "assistant_audit_events_tenantId_userId_idx" ON "assistant_audit_events"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_tenantId_isActive_idx" ON "api_keys"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "webhooks_tenantId_isActive_idx" ON "webhooks"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "jobs_tenantId_status_scheduledAt_idx" ON "jobs"("tenantId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "jobs_tenantId_kind_idx" ON "jobs"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "locale_resources_tenantId_locale_idx" ON "locale_resources"("tenantId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "locale_resources_tenantId_locale_namespace_key_key" ON "locale_resources"("tenantId", "locale", "namespace", "key");

-- CreateIndex
CREATE INDEX "saved_searches_tenantId_ownerUserId_idx" ON "saved_searches"("tenantId", "ownerUserId");

-- CreateIndex
CREATE INDEX "saved_searches_tenantId_alertEnabled_alertInterval_idx" ON "saved_searches"("tenantId", "alertEnabled", "alertInterval");

-- CreateIndex
CREATE UNIQUE INDEX "_LegalHoldDocuments_AB_unique" ON "_LegalHoldDocuments"("A", "B");

-- CreateIndex
CREATE INDEX "_LegalHoldDocuments_B_index" ON "_LegalHoldDocuments"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_trust" ADD CONSTRAINT "device_trust_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "classification_labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_retentionScheduleId_fkey" FOREIGN KEY ("retentionScheduleId") REFERENCES "retention_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadata_schemas" ADD CONSTRAINT "metadata_schemas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metadata_values" ADD CONSTRAINT "metadata_values_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classification_labels" ADD CONSTRAINT "classification_labels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classification_history" ADD CONSTRAINT "classification_history_fromLabelId_fkey" FOREIGN KEY ("fromLabelId") REFERENCES "classification_labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classification_history" ADD CONSTRAINT "classification_history_toLabelId_fkey" FOREIGN KEY ("toLabelId") REFERENCES "classification_labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_schedules" ADD CONSTRAINT "retention_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposition_records" ADD CONSTRAINT "disposition_records_retentionScheduleId_fkey" FOREIGN KEY ("retentionScheduleId") REFERENCES "retention_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposition_records" ADD CONSTRAINT "disposition_records_legalHoldId_fkey" FOREIGN KEY ("legalHoldId") REFERENCES "legal_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposition_records" ADD CONSTRAINT "disposition_records_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_manifests" ADD CONSTRAINT "provenance_manifests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanner_profiles" ADD CONSTRAINT "scanner_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanner_jobs" ADD CONSTRAINT "scanner_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanner_jobs" ADD CONSTRAINT "scanner_jobs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "scanner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanner_jobs" ADD CONSTRAINT "scanner_jobs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_definitions" ADD CONSTRAINT "tour_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_steps" ADD CONSTRAINT "tour_steps_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tour_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_user_states" ADD CONSTRAINT "tour_user_states_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tour_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_user_states" ADD CONSTRAINT "tour_user_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_user_states" ADD CONSTRAINT "tour_user_states_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_settings" ADD CONSTRAINT "assistant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_sessions" ADD CONSTRAINT "assistant_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_sessions" ADD CONSTRAINT "assistant_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "assistant_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_tool_invocations" ADD CONSTRAINT "assistant_tool_invocations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "assistant_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_actions" ADD CONSTRAINT "assistant_actions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "assistant_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_audit_events" ADD CONSTRAINT "assistant_audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locale_resources" ADD CONSTRAINT "locale_resources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LegalHoldDocuments" ADD CONSTRAINT "_LegalHoldDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LegalHoldDocuments" ADD CONSTRAINT "_LegalHoldDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "legal_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

