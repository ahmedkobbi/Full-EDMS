/**
 * @smart-edms/license-core — license state machine (spec §4.4, §12.3)
 *
 * Purpose: compute the derived runtime state of a license from its
 * signature validity, revocation status, device / environment match,
 * expiry, grace period, and heartbeat health.
 *
 * The 6 states (spec §4.4):
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  valid                  — signed, not revoked, device &     │
 *   │                           environment match, not expired,   │
 *   │                           heartbeat healthy.                │
 *   │  expiring_soon         — valid but within N days of expiry │
 *   │                           (configurable warning window).    │
 *   │  expired_grace         — past expiry but within grace       │
 *   │                           period; system operates normally  │
 *   │                           but with warnings.                │
 *   │  grace_exhausted       — past expiry and grace exhausted;   │
 *   │                           system enters read-only /         │
 *   │                           degraded mode.                    │
 *   │  extended_remediation  — severe degradation; admin          │
 *   │                           remediation permitted, regular    │
 *   │                           users blocked.                    │
 *   │  invalid               — signature failed, revoked, device  │
 *   │                           mismatch, or otherwise unusable.  │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Decision order (top wins):
 *   1. signatureValid = false        → invalid
 *   2. revoked = true                → invalid
 *   3. deviceMatch = false           → invalid
 *   4. environmentMatch = false      → invalid
 *   5. heartbeatFailures >= threshold (and last heartbeat older
 *      than gracePeriodDays)         → grace_exhausted
 *   6. heartbeatFailures > 0         → extended_remediation
 *   7. now > expiresAt + gracePeriod → grace_exhausted
 *   8. now > expiresAt + extendedRemediationThreshold → extended_remediation
 *   9. now > expiresAt               → expired_grace
 *   10. now within warning window    → expiring_soon
 *   11. otherwise                     → valid
 *
 * Critical rules (spec §4.4):
 *  - State transitions are monotonic within a single license lifecycle
 *    (a license never goes from `expired_grace` back to `valid` without
 *    a renewal that bumps `renewalCounter`).
 *  - The on-premise backend caches the computed state and recomputes
 *    it only when the artifact, CRL, or heartbeat status changes.
 *  - `invalid` is a hard block — no admin remediation, no read-only
 *    access, no grace period. The system stops accepting new operations
 *    until the license is repaired or replaced.
 */

import type { LicenseState } from '@smart-edms/types';

/**
 * Input to {@link computeLicenseState}. Every field is required (except
 * `lastHeartbeatAt`, which is `undefined` when no heartbeat has ever
 * been received).
 *
 * All `Date` arguments are compared using their millisecond epoch values.
 * Callers should pass `new Date()` for `now` unless they are testing
 * a specific point in time.
 */
export interface LicenseStateInput {
  /** Whether the artifact signature verified against the embedded public key. */
  readonly signatureValid: boolean;
  /** Whether the license ID appears in the latest verified CRL. */
  readonly revoked: boolean;
  /** Whether the deployment's machine fingerprint matches the payload's. */
  readonly deviceMatch: boolean;
  /** Whether `payload.environment` matches the deployment's environment. */
  readonly environmentMatch: boolean;
  /** Current time (pass `new Date()` in production). */
  readonly now: Date;
  /** When the license was issued (from `payload.issuedAt`). */
  readonly issuedAt: Date;
  /** When the license expires (from `payload.expiresAt`; may be `null`
   * for perpetual licenses). */
  readonly expiresAt: Date | null;
  /** Grace period in days after expiry (from `payload.gracePeriodDays`). */
  readonly gracePeriodDays: number;
  /** Timestamp of the last successful heartbeat, or `undefined` if none. */
  readonly lastHeartbeatAt?: Date;
  /** Number of consecutive heartbeat failures since the last success. */
  readonly heartbeatFailures: number;
  /**
   * After this many days past expiry (and past grace), the system enters
   * `extended_remediation` instead of `grace_exhausted`. Typically 30–90.
   */
  readonly extendedRemediationThresholdDays: number;
}

/**
 * Default warning window (in days) for `expiring_soon`. Licenses within
 * this many days of expiry are flagged as `expiring_soon`.
 */
export const DEFAULT_EXPIRING_SOON_WINDOW_DAYS = 30;

/**
 * Default heartbeat-failure threshold: if there have been this many
 * consecutive failures AND the last heartbeat is older than the grace
 * period, the license goes to `grace_exhausted`.
 */
export const DEFAULT_HEARTBEAT_FAILURE_THRESHOLD = 5;

/**
 * Compute the derived license state from the input parameters.
 *
 * @param input - the license state input.
 * @param options - optional overrides for the warning window and
 *   heartbeat-failure threshold.
 * @returns one of the 6 `LicenseState` values.
 */
export function computeLicenseState(
  input: LicenseStateInput,
  options: {
    expiringSoonWindowDays?: number;
    heartbeatFailureThreshold?: number;
  } = {},
): LicenseState {
  const expiringSoonWindowDays = options.expiringSoonWindowDays ?? DEFAULT_EXPIRING_SOON_WINDOW_DAYS;
  const heartbeatFailureThreshold = options.heartbeatFailureThreshold ?? DEFAULT_HEARTBEAT_FAILURE_THRESHOLD;

  // -----------------------------------------------------------------
  // Hard-block conditions → `invalid`
  // -----------------------------------------------------------------
  if (!input.signatureValid) return 'invalid';
  if (input.revoked) return 'invalid';
  if (!input.deviceMatch) return 'invalid';
  if (!input.environmentMatch) return 'invalid';

  // -----------------------------------------------------------------
  // Heartbeat-based degradation
  // -----------------------------------------------------------------
  const nowMs = input.now.getTime();
  const heartbeatOldMs = input.lastHeartbeatAt
    ? nowMs - input.lastHeartbeatAt.getTime()
    : Number.POSITIVE_INFINITY;

  // Heartbeat-failures threshold: if we've had too many consecutive
  // failures AND the last heartbeat is older than the grace period,
  // we're in grace_exhausted (the system has been silently degraded
  // for too long).
  const gracePeriodMs = input.gracePeriodDays * 24 * 60 * 60 * 1000;
  if (
    input.heartbeatFailures >= heartbeatFailureThreshold &&
    heartbeatOldMs > gracePeriodMs
  ) {
    return 'grace_exhausted';
  }

  // Some heartbeat failures (but not yet past the grace threshold):
  // the system is degraded but still operational. Admin should be
  // notified; regular users continue to work.
  if (input.heartbeatFailures > 0 && heartbeatOldMs > gracePeriodMs / 2) {
    return 'extended_remediation';
  }

  // -----------------------------------------------------------------
  // Expiry-based degradation
  // -----------------------------------------------------------------
  // Perpetual license (no expiry) — never enters expiry-based states.
  if (input.expiresAt === null) {
    return 'valid';
  }

  const expiresMs = input.expiresAt.getTime();
  const extendedRemediationMs =
    input.extendedRemediationThresholdDays * 24 * 60 * 60 * 1000;

  if (nowMs > expiresMs + gracePeriodMs + extendedRemediationMs) {
    // Past expiry + grace + extended remediation window.
    return 'grace_exhausted';
  }
  if (nowMs > expiresMs + gracePeriodMs) {
    // Past expiry + grace, but within extended remediation window.
    return 'extended_remediation';
  }
  if (nowMs > expiresMs) {
    // Past expiry, within grace period.
    return 'expired_grace';
  }

  // -----------------------------------------------------------------
  // Pre-expiry warning
  // -----------------------------------------------------------------
  const warningMs = expiringSoonWindowDays * 24 * 60 * 60 * 1000;
  if (nowMs > expiresMs - warningMs) {
    return 'expiring_soon';
  }

  // -----------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------
  return 'valid';
}

/**
 * Human-readable label for each state. Used by the i18n layer to look
 * up the actual translated string (the value here is the message key
 * passed to `t()`).
 */
export const LICENSE_STATE_LABEL: Readonly<Record<LicenseState, string>> = Object.freeze({
  valid: 'license.state.valid',
  expiring_soon: 'license.state.expiring_soon',
  expired_grace: 'license.state.expired_grace',
  grace_exhausted: 'license.state.grace_exhausted',
  extended_remediation: 'license.state.extended_remediation',
  invalid: 'license.state.invalid',
});

/**
 * Whether a given state permits regular (non-admin) user operations.
 *
 * - `valid`, `expiring_soon`, `expired_grace` → true (read+write).
 * - `extended_remediation` → false (admin remediation only).
 * - `grace_exhausted` → false (read-only at most; in our impl, fully
 *   blocked for regular users).
 * - `invalid` → false (hard block).
 */
export function statePermitsRegularOps(state: LicenseState): boolean {
  return state === 'valid' || state === 'expiring_soon' || state === 'expired_grace';
}

/**
 * Whether a given state permits admin remediation operations (e.g.
 * uploading a replacement license file, rotating keys).
 */
export function statePermitsAdminRemediation(state: LicenseState): boolean {
  return state !== 'invalid';
}
