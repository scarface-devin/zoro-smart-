/**
 * Resilience helpers for Soroban RPC and Horizon calls.
 *
 * `withRetry` runs an async function with exponential backoff and jitter,
 * stopping once the failure budget is exhausted or the `shouldRetry`
 * predicate returns false. `CircuitBreaker` is a stateful guard that
 * short-circuits to an error after N consecutive failures and slowly
 * re-opens ("half-open") after a reset window.
 */

import { NetworkError } from '@solshare/shared';

/**
 * Configuration for `withRetry`. Defaults give 5 attempts starting at 200 ms,
 * doubling each time, capped at 5 s, with 50%–100% jitter.
 */
export interface RetryOptions {
  /** Total attempts including the first one. Default 5. */
  attempts?: number;
  /** Initial delay (ms) before the second attempt. Default 200. */
  initialDelayMs?: number;
  /** Cap on delay between attempts. Default 5_000. */
  maxDelayMs?: number;
  /** Multiplier on the previous delay. Default 2. */
  factor?: number;
  /** Add random jitter (50%–100% of the base delay). Default true. */
  jitter?: boolean;
  /** Decide whether a given error should be retried. Default: retry anything. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** Optional hook fired between attempts (logging/metrics). */
  onRetry?: (err: unknown, attempt: number, nextDelayMs: number) => void;
}

const DEFAULT_RETRY: Required<
  Pick<RetryOptions, 'attempts' | 'initialDelayMs' | 'maxDelayMs' | 'factor' | 'jitter'>
> = {
  attempts: 5,
  initialDelayMs: 200,
  maxDelayMs: 5_000,
  factor: 2,
  jitter: true,
};

/** Resolved retry configuration used inside the retry loop. */
type RetryCfg = Required<
  Pick<RetryOptions, 'attempts' | 'initialDelayMs' | 'maxDelayMs' | 'factor' | 'jitter'>
> &
  Pick<RetryOptions, 'shouldRetry' | 'onRetry'>;

/**
 * Run an async function with exponential-backoff retries.
 *
 * Throws the last encountered error once the attempt counter is exhausted
 * (or when `shouldRetry` opts out). The original error is preserved.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const cfg: RetryCfg = { ...DEFAULT_RETRY, ...opts };
  let lastError: unknown;
  for (let attempt = 1; attempt <= cfg.attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err: unknown) {
      lastError = err;
      if (attempt >= cfg.attempts) break;
      if (cfg.shouldRetry && !cfg.shouldRetry(err, attempt)) break;
      const delay = computeBackoff(attempt, cfg);
      try {
        cfg.onRetry?.(err, attempt, delay);
      } catch {
        /* ignore listener errors */
      }
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function computeBackoff(
  attempt: number,
  cfg: Required<
    Pick<RetryOptions, 'initialDelayMs' | 'maxDelayMs' | 'factor' | 'jitter'>
  >,
): number {
  const exponential = cfg.initialDelayMs * Math.pow(cfg.factor, attempt - 1);
  const base = Math.min(cfg.maxDelayMs, exponential);
  if (!cfg.jitter) return base;
  const jittered = Math.floor(base * (0.5 + Math.random() * 0.5));
  return Math.max(0, jittered);
}

export interface CircuitBreakerOptions {
  /** Consecutive failures before opening. Default 5. */
  failureThreshold?: number;
  /** ms before an open breaker promotes to half-open. Default 30_000. */
  resetTimeoutMs?: number;
  /** Successful calls in half-open before transitioning to closed. Default 1. */
  halfOpenSuccessThreshold?: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

const DEFAULT_CIRCUIT: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenSuccessThreshold: 1,
};

/**
 * Naive circuit breaker used by Soroban/Horizon wrappers. Tracks
 * consecutive failures; once the threshold is reached, throws
 * synchronously until the reset window has elapsed, then allows traffic
 * through in half-open until a single success closes the circuit again.
 * Any failure in half-open re-opens the breaker.
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private halfOpenSuccesses = 0;
  private openedAt = 0;
  private readonly opts: Required<CircuitBreakerOptions>;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.opts = { ...DEFAULT_CIRCUIT, ...opts };
  }

  /**
   * Read the current state. Open → half-open is lazily promoted when the
   * reset window has elapsed.
   */
  current(): CircuitState {
    if (this.state === 'open' && Date.now() - this.openedAt >= this.opts.resetTimeoutMs) {
      this.state = 'half-open';
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

  /** Force-reset the breaker to a closed state with zero counters. */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.halfOpenSuccesses = 0;
    this.openedAt = 0;
  }

  /** Run a function under circuit protection. */
  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const live = this.current();
    if (live === 'open') {
      throw new NetworkError('Circuit breaker is open; not calling remote endpoint');
    }
    try {
      const out = await fn();
      this.recordSuccess();
      return out;
    } catch (err: unknown) {
      this.recordFailure();
      throw err;
    }
  }

  private recordSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.opts.halfOpenSuccessThreshold) {
        this.state = 'closed';
        this.failures = 0;
        this.halfOpenSuccesses = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private recordFailure(): void {
    if (this.state === 'half-open') {
      this.state = 'open';
      this.openedAt = Date.now();
      this.failures = this.opts.failureThreshold;
      return;
    }
    this.failures += 1;
    if (this.failures >= this.opts.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
}
