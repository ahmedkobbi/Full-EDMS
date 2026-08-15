/**
 * @smart-edms/i18n — English baseline: `errors` namespace (spec §16.4, §9.12)
 *
 * One key per `ApiErrorCode`. These strings are user-facing and used by the
 * API error envelope (`error.messageKey`) via `t(error.messageKey, error.messageVars)`.
 *
 * REVIEW: Compliance-relevant strings. The English baseline is written by
 * a senior engineer but should be reviewed by a native English-speaking
 * compliance specialist before production rollout.
 */

const errors = {
  'UNAUTHENTICATED': 'You need to sign in to continue.',
  'UNAUTHORIZED': 'You are not authorised to perform this action.',
  'FORBIDDEN': 'Access denied. You do not have permission to access this resource.',
  'NOT_FOUND': 'The requested resource was not found.',
  'VALIDATION_FAILED': 'Some fields contain invalid values. Please review and try again.',
  'RATE_LIMITED': 'Too many requests. Please slow down and try again in {seconds, plural, one {# second} other {# seconds}}.',
  'CONFLICT': 'This action conflicts with the current state of the resource. Please refresh and try again.',
  'LICENSE_INVALID': 'The license for this organisation is not valid. Please contact your administrator.',
  'LICENSE_EXPIRED': 'The license for this organisation has expired. Please contact your administrator to renew.',
  'LICENSE_REVOKED': 'The license for this organisation has been revoked. Please contact your administrator.',
  'LICENSE_GRACE_EXHAUSTED': 'The grace period for the expired license has ended. Please contact your administrator to restore access.',
  'LICENSE_FEATURE_NOT_ENTITLED': 'This feature is not included in your current license plan.',
  'TENANT_MISMATCH': 'The resource does not belong to your organisation.',
  'AI_NOT_LICENSED': 'AI assistant features are not included in your current license plan.',
  'AI_TOOL_FORBIDDEN': 'You do not have permission to use this AI tool.',
  'AI_ACTION_REQUIRES_CONFIRMATION': 'This AI action requires your confirmation before it can be applied.',
  'PROMPT_INJECTION_DETECTED': 'A potential prompt injection was detected in your input. The request has been blocked for safety.',
  'EXTERNAL_AI_DISABLED': 'External AI providers are disabled for your organisation. Please contact your administrator.',
  'WORKFLOW_NOT_DURABLE': 'This workflow is not configured for durable execution and cannot be started.',
  'WORKFLOW_INVALID_STATE': 'The workflow is not in a state that allows this action.',
  'LEGAL_HOLD_BLOCKS_DELETION': 'This document is under legal hold and cannot be deleted.',
  'LEGAL_HOLD_BLOCKS_ACTION': 'This action is blocked because the resource is under legal hold.',
  'RETENTION_BLOCKS_DELETION': 'This document is under a retention schedule and cannot be deleted yet.',
  'RETENTION_BLOCKS_ACTION': 'This action is blocked because the resource is under an active retention schedule.',
  'CLASSIFICATION_DOWNGRADE_DENIED': 'Downgrading the classification level is not allowed by policy.',
  'UPLOAD_TOO_LARGE': 'The uploaded file exceeds the maximum allowed size of {{max}}.',
  'UNSAFE_FILE_TYPE': 'The uploaded file type is not allowed.',
  'UNSAFE_FILE_CONTENT': 'The uploaded file was rejected by the security scanner.',
  'SHARE_EXPIRED': 'This share link has expired.',
  'SHARE_REVOKED': 'This share link has been revoked.',
  'SHARE_BLOCKED_BY_POLICY': 'Sharing this document externally is not allowed by your organisation’s policy.',
  'SHARE_BLOCKED_BY_CLASSIFICATION': 'Documents with this classification level cannot be shared externally.',
  'INTERNAL_ERROR': 'An internal error occurred. Please try again. If the problem persists, contact support with trace ID {{traceId}}.',
  'SERVICE_UNAVAILABLE': 'This service is temporarily unavailable. Please try again in a few moments.',
  'MAINTENANCE_MODE': 'Smart EDMS is undergoing scheduled maintenance. Please try again later.',
  'NETWORK_ERROR': 'A network error occurred. Please check your connection and try again.',
  'TIMEOUT': 'The request timed out. Please try again.',
  'QUOTA_EXCEEDED': 'You have exceeded your storage quota. Please delete unused documents or contact your administrator to increase the limit.',
  'USER_LIMIT_EXCEEDED': 'You have reached the user limit for your license plan.',
  'CONCURRENT_SESSION_LIMIT': 'You have reached the maximum number of concurrent sessions.',
  'TOUR_NOT_FOUND': 'The requested tour could not be found.',
  'TOUR_NOT_LICENSED': 'This tour is not included in your current license plan.',
  'UNKNOWN': 'An unexpected error occurred.',
} as const;

export default errors;
