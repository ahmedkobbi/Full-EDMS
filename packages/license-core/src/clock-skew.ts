/**
 * @smart-edms/license-core — Clock skew detection.
 *
 * Enterprise-grade hardening: prevents clock-rollback attacks where an
 * attacker sets the system clock backward to keep an expired license
 * "valid".
 *
 * Spec ref: §12.4 (licensing), §4.4 (6-state machine — expiry check).
 *
 * Attack model:
 *  An attacker notices their license expired at timestamp T. They set
 *  the system clock to T-1day to make the license appear valid again.
 *
 * Defence:
 *  1. Track the maximum observed wall-clock timestamp (persisted to DB).
 *  2. Track monotonic time (process.uptime) alongside wall-clock.
 *  3. If wall-clock < maxObservedTimestamp, the clock was rolled back.
 *  4. If wall-clock advanced but monotonic time didn't (or went backward),
 *     the clock was manipulated.
 *
 * Limitations:
 *  - Monotonic time resets on process restart, so we persist the
 *    maxObservedTimestamp to DB.
 *  - An attacker with DB access can modify the maxObservedTimestamp,
 *    but this is mitigated by the hash-chained audit log and the
 *    payload encryption at rest.
 */

/**
 * Clock skew check result.
 */
export interface ClockSkewResult {
  /** True if no clock manipulation detected. */
  readonly ok: boolean;
  /** Reason for failure (empty if ok). */
  readonly reason: string;
  /** The current wall-clock timestamp. */
  readonly currentTimestamp: string;
  /** The maximum previously observed timestamp. */
  readonly maxObservedTimestamp: string | null;
  /** Estimated skew in seconds (negative = rollback). */
  readonly skewSeconds: number;
}

/**
 * The maximum acceptable clock skew in seconds (300s = 5 minutes).
 * Allows for minor NTP adjustments while catching intentional rollback.
 */
const MAX_ACCEPTABLE_SKEW_SECONDS = 300;

/**
 * Check for clock manipulation by comparing the current wall-clock time
 * against the maximum previously observed timestamp.
 *
 * @param maxObservedTimestamp - the maximum wall-clock timestamp previously
 *   seen (ISO 8601 string), or null if this is the first check.
 * @returns clock skew check result.
 */
export function checkClockSkew(
  maxObservedTimestamp: string | null,
): ClockSkewResult {
  const now = new Date();
  const currentTimestamp = now.toISOString();

  if (maxObservedTimestamp === null) {
    return {
      ok: true,
      reason: '',
      currentTimestamp,
      maxObservedTimestamp: null,
      skewSeconds: 0,
    };
  }

  const maxObserved = new Date(maxObservedTimestamp);
  const skewMs = now.getTime() - maxObserved.getTime();
  const skewSeconds = skewMs / 1000;

  // If current time is BEFORE the max observed time, the clock was
  // rolled back (skewSeconds is negative).
  if (skewSeconds < -MAX_ACCEPTABLE_SKEW_SECONDS) {
    return {
      ok: false,
      reason: `Clock rollback detected: current time is ${Math.abs(skewSeconds).toFixed(0)}s before max observed time (threshold: ${MAX_ACCEPTABLE_SKEW_SECONDS}s)`,
      currentTimestamp,
      maxObservedTimestamp,
      skewSeconds,
    };
  }

  return {
    ok: true,
    reason: '',
    currentTimestamp,
    maxObservedTimestamp,
    skewSeconds,
  };
}

/**
 * Determine the new max observed timestamp. If the current time is
 * after the previous max, return the current time. Otherwise, keep
 * the previous max (the clock was rolled back, but we don't want to
 * lower the bar).
 *
 * @param currentTimestamp - current wall-clock ISO timestamp.
 * @param previousMax - previous max observed timestamp (or null).
 * @returns the new max observed timestamp.
 */
export function updateMaxObservedTimestamp(
  currentTimestamp: string,
  previousMax: string | null,
): string {
  if (previousMax === null) {
    return currentTimestamp;
  }
  const current = new Date(currentTimestamp).getTime();
  const previous = new Date(previousMax).getTime();
  return current > previous ? currentTimestamp : previousMax;
}

/**
 * Monotonic time tracker. Uses process.uptime() (which is monotonic)
 * to detect if the wall clock jumped forward abnormally (which could
 * indicate clock manipulation).
 */
export class MonotonicClockTracker {
  private lastWallTime: number;
  private lastMonotonicTime: number;

  constructor() {
    this.lastWallTime = Date.now();
    this.lastMonotonicTime = process.uptime();
  }

  /**
   * Check if the wall clock advanced disproportionately compared to
   * monotonic time. If wall time jumped forward by hours but monotonic
   * time only advanced by seconds, the clock was manipulated.
   *
   * @returns true if the clock advancement is consistent, false if
   *   manipulation is suspected.
   */
  checkConsistency(): boolean {
    const currentWallTime = Date.now();
    const currentMonotonicTime = process.uptime();

    const wallDeltaMs = currentWallTime - this.lastWallTime;
    const monotonicDeltaMs = (currentMonotonicTime - this.lastMonotonicTime) * 1000;

    // Update for next check
    this.lastWallTime = currentWallTime;
    this.lastMonotonicTime = currentMonotonicTime;

    // If wall time went backward, that's caught by checkClockSkew.
    // Here we check if wall time jumped forward disproportionately.
    if (wallDeltaMs > 0 && monotonicDeltaMs > 0) {
      const ratio = wallDeltaMs / monotonicDeltaMs;
      // Allow up to 2x skew (for minor NTP adjustments).
      // If wall time advanced more than 2x the monotonic time,
      // the clock was likely manipulated.
      if (ratio > 2 && wallDeltaMs > MAX_ACCEPTABLE_SKEW_SECONDS * 1000) {
        return false;
      }
    }

    return true;
  }
}
