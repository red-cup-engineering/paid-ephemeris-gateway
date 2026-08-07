// edge/retry.ts — Exponential-backoff retry policy and passive outlier ejection.
//
// Retry: wraps a fetch-like call (or proxy dispatch) with configurable backoff.
// Outlier ejection: tracks per-upstream consecutive-failure or time-window failure rate;
// ejects outliers from the pool, re-admits after a probe window.
//
// Outlier admission is modeled in MemeCharge vocabulary:
//   potential = upstream healthy (admit)
//   active    = upstream ejected (skip)
//   stable    = contradicted (in ejection + successful probe → re-admit cautiously)

import { witness, UtteranceLog } from "../internal/witness.mjs";
import { chargeValueFromBits } from "../admission.mjs";

// ── Retry policy ──────────────────────────────────────────────────────────────

export type RetryOptions = {
  maxAttempts?: number;        // default 3
  baseDelayMs?: number;        // base backoff (default 100)
  maxDelayMs?: number;         // cap (default 10_000)
  jitter?: boolean;            // add ±25% jitter (default true)
  retryOn?: (err: unknown, status?: number) => boolean;  // default: status >= 500 or network error
  onRetry?: (attempt: number, err: unknown) => void;
};

function delay(ms: number, jitter: boolean): Promise<void> {
  const actual = jitter ? ms * (0.75 + Math.random() * 0.5) : ms;
  return new Promise((r) => setTimeout(r, actual));
}

export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 100;
  const maxDelayMs = opts.maxDelayMs ?? 10_000;
  const jitter = opts.jitter !== false;
  const retryOn = opts.retryOn ?? ((_err, status) => status == null || status >= 500);

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const shouldRetry = retryOn(err, undefined);
      if (!shouldRetry || attempt === maxAttempts) break;
      opts.onRetry?.(attempt, err);
      const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await delay(backoff, jitter);
    }
  }
  throw lastErr;
}

// ── Outlier ejection ──────────────────────────────────────────────────────────

export type OutlierEjectionOptions = {
  /** Consecutive failures before ejecting (default 5). */
  consecutiveThreshold?: number;
  /** Time window for failure-rate ejection (ms, default 60_000). */
  windowMs?: number;
  /** Failure rate (0–1) within window to trigger ejection (default 0.5). */
  failureRateThreshold?: number;
  /** How long before a probing re-admission attempt (ms, default 30_000). */
  ejectMs?: number;
  /** Successful probes before re-admitting fully (default 1). */
  probeSuccesses?: number;
  onEject?: (id: string) => void;
  onReadmit?: (id: string) => void;
};

type UpstreamState = {
  consecutive: number;
  events: Array<{ ts: number; ok: boolean }>;
  ejectedAt: number | null;
  probeSuccesses: number;
};

export class OutlierEjector {
  private store = new UtteranceLog();
  private states = new Map<string, UpstreamState>();
  private opts: Required<OutlierEjectionOptions>;

  constructor(opts: OutlierEjectionOptions = {}) {
    this.opts = {
      consecutiveThreshold: opts.consecutiveThreshold ?? 5,
      windowMs: opts.windowMs ?? 60_000,
      failureRateThreshold: opts.failureRateThreshold ?? 0.5,
      ejectMs: opts.ejectMs ?? 30_000,
      probeSuccesses: opts.probeSuccesses ?? 1,
      onEject: opts.onEject ?? (() => {}),
      onReadmit: opts.onReadmit ?? (() => {}),
    };
  }

  private state(id: string): UpstreamState {
    if (!this.states.has(id)) this.states.set(id, { consecutive: 0, events: [], ejectedAt: null, probeSuccesses: 0 });
    return this.states.get(id)!;
  }

  /** Record the outcome of a request to an upstream. */
  record(id: string, ok: boolean): void {
    const s = this.state(id);
    const now = Date.now(); // law-allow: wall-clock-as-data — outlier ejection cooldown bookkeeping, not evidence ordering

    if (ok) {
      s.consecutive = 0;
      if (s.ejectedAt !== null) {
        s.probeSuccesses++;
        if (s.probeSuccesses >= this.opts.probeSuccesses) {
          s.ejectedAt = null;
          s.probeSuccesses = 0;
          witness(this.store, { subject: id, predicate: "outlier", object: "readmit" }, [true, false]);
          this.opts.onReadmit(id);
        }
      }
    } else {
      s.consecutive++;
      s.probeSuccesses = 0;
    }

    s.events.push({ ts: now, ok });
    s.events = s.events.filter((e) => now - e.ts < this.opts.windowMs);

    // Check ejection conditions
    const alreadyEjected = s.ejectedAt !== null && now - s.ejectedAt < this.opts.ejectMs;
    if (!alreadyEjected) {
      const triggerConsecutive = s.consecutive >= this.opts.consecutiveThreshold;
      const windowEvents = s.events;
      const failRate = windowEvents.length > 0 ? windowEvents.filter((e) => !e.ok).length / windowEvents.length : 0;
      const triggerRate = failRate >= this.opts.failureRateThreshold && windowEvents.length >= 5;

      if (triggerConsecutive || triggerRate) {
        s.ejectedAt = now;
        witness(this.store, { subject: id, predicate: "outlier", object: "eject" }, [false, true]);
        this.opts.onEject(id);
      }
    }
  }

  /** Settle whether an upstream is currently admissible. */
  isAdmissible(id: string): boolean {
    const s = this.state(id);
    const now = Date.now(); // law-allow: wall-clock-as-data — outlier ejection cooldown bookkeeping, not evidence ordering
    const g = chargeValueFromBits(
      s.ejectedAt === null || now - s.ejectedAt >= this.opts.ejectMs,
      s.ejectedAt !== null,
    );
    return g === "potential" || g === "stable"; // stable = probe window
  }

  /** Whether this upstream is in probe mode (half-ejected). */
  isProbing(id: string): boolean {
    const s = this.state(id);
    if (s.ejectedAt === null) return false;
    return Date.now() - s.ejectedAt >= this.opts.ejectMs; // law-allow: wall-clock-as-data — outlier ejection cooldown bookkeeping, not evidence ordering
  }
}
