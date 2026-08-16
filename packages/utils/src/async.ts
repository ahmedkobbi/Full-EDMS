/**
 * @smart-edms/utils — async helpers.
 *
 *  - `sleep(ms)` — return a promise that resolves after `ms` milliseconds.
 *  - `withTimeout(promise, ms)` — race `promise` against a timeout; rejects
 *    with a `TimeoutError` if the timeout wins.
 *  - `retry(fn, attempts, backoffMs)` — call `fn` up to `attempts` times,
 *    waiting `backoffMs * attempt` ms between retries.
 *  - `mapLimit(items, limit, fn)` — map over `items` with at most `limit`
 *    in-flight calls to `fn`.
 *
 * All functions are framework-agnostic (Promise-returning, no React / NestJS).
 */

/**
 * Return a promise that resolves after `ms` milliseconds. The optional
 * `AbortSignal` lets the caller cancel the sleep early — if aborted, the
 * returned promise rejects with an `AbortError`.
 *
 * @param ms    — milliseconds to sleep (must be ≥ 0).
 * @param signal — optional abort signal.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (!Number.isInteger(ms) || ms < 0) {
    throw new RangeError(`sleep: ms must be a non-negative integer, got ${ms}`);
  }
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('AbortError: sleep aborted'));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error('AbortError: sleep aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Error thrown by `withTimeout` when the timeout elapses. */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Race `promise` against a timeout. If `promise` resolves/rejects first,
 * its result/error propagates. If the timeout wins, the returned promise
 * rejects with a `TimeoutError`.
 *
 * The original promise is NOT cancelled (Promises cannot be cancelled in
 * JS) — the caller is responsible for passing an `AbortSignal` to `fn` if
 * cancellation is required.
 *
 * @param ms — timeout in milliseconds (must be > 0).
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!Number.isInteger(ms) || ms <= 0) {
    throw new RangeError(`withTimeout: ms must be a positive integer, got ${ms}`);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`Operation timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {clearTimeout(timer);}
  }
}

/**
 * Call `fn` up to `attempts` times until it resolves. Between attempts, wait
 * `backoffMs * attemptIndex` ms (linear backoff). If all attempts reject,
 * the last error is re-thrown.
 *
 * @param attempts  — total number of attempts (must be ≥ 1).
 * @param backoffMs — base backoff in ms; actual delay is `backoffMs * (attempt - 1)`.
 *                    Default 100ms. Set to 0 for no delay.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  backoffMs: number = 100,
): Promise<T> {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError(`retry: attempts must be a positive integer, got ${attempts}`);
  }
  if (!Number.isInteger(backoffMs) || backoffMs < 0) {
    throw new RangeError(`retry: backoffMs must be a non-negative integer, got ${backoffMs}`);
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < attempts && backoffMs > 0) {
        await sleep(backoffMs * attempt);
      }
    }
  }
  throw lastError;
}

/**
 * Map over `items` with at most `limit` in-flight calls to `fn`. Returns the
 * results in the same order as `items` (NOT in completion order).
 *
 * Use this to bound concurrency when calling rate-limited APIs or doing I/O
 * over a large list — `Promise.all` would fire all calls at once.
 *
 * @param limit — max concurrent invocations of `fn` (must be ≥ 1).
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`mapLimit: limit must be a positive integer, got ${limit}`);
  }
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]!, i);
    }
  }
  const workers: Promise<void>[] = [];
  const concurrency = Math.min(limit, items.length);
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}
