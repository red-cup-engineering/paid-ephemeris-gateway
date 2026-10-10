// gcs-retry — a generic retry-with-backoff wrapper for the `(url, init) => Promise<Response>`
// shape `gcs-client.mts` already uses for every outbound call (both the token-fetch inside
// `createGoogleApiRequest` and the storage-API calls in `createGcsClient`). Wraps ONE request
// function, returns another with the same signature, so it composes transparently with the
// existing `request` injection point both modules already expose for tests.
//
// WHY THIS EXISTS: the 2026-08-19 deploy runbook records a live, observed `fetch failed`
// error on both Farstone's and Aletheon's autosave paths (a transient network/cold-start
// condition — see the runbook's own "A shared `fetch failed` GCS transient-error pattern"
// note). Before this module, a single transient failure on any GCS call was fatal: thrown
// straight out of `getObject`/`putObject`, no retry, no distinguishable log line. This wrapper
// gives every GCS call in this tree bounded, jittered retry, and makes a real failure loud
// instead of silent.
//
// POLICY:
//   - Only retries what's actually transient: a thrown network error (fetch itself failing —
//     DNS, connection reset, timeout) or a 5xx/408/429 HTTP response. A 404 (object doesn't
//     exist), 400 (bad request), 401/403 (auth), and — most importantly — 412 (precondition
//     failed, `world-store.mts`'s OWN application-level contention-retry signal) are all
//     passed straight through, untouched, on the very first attempt. This module must never
//     absorb a 412: `world-store.mts`'s save loop depends on seeing every 412 immediately to
//     re-read the current generation and retry its own overwrite; swallowing it here would
//     silently turn a real optimistic-concurrency conflict into what looks like a clean write.
//   - Bounded attempts (`maxAttempts`, default 4 — i.e. up to 3 retries after the first try),
//     exponential backoff (`baseDelayMs * 2^(attempt-1)`, capped at `maxDelayMs`) with full
//     jitter (`delay * (1 - jitterRatio + random() * jitterRatio * 2)`, so retries from
//     concurrent callers don't lock-step).
//   - Every retry calls `onRetry` (defaults to a stderr line naming the attempt count and the
//     reason) — never silent. The final exhausted attempt calls `onExhausted` (defaults to a
//     louder stderr line) before the error/response is handed back to the caller, so a
//     permanent failure is surfaced with a count, not swallowed.
//   - `sleep`/`random`/`onRetry`/`onExhausted` are all injectable so tests never actually wait
//     out a real backoff and can assert on exactly what got logged.

export interface GcsRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  isRetryableStatus?: (status: number) => boolean;
  onRetry?: (info: { attempt: number; maxAttempts: number; url: string; reason: string }) => void;
  onExhausted?: (info: { attempts: number; url: string; reason: string }) => void;
}

export type RequestFn = (url: string, init?: RequestInit) => Promise<Response>;

function defaultIsRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function defaultOnRetry(info: { attempt: number; maxAttempts: number; url: string; reason: string }): void {
  process.stderr.write(
    `gcs-retry: attempt ${info.attempt}/${info.maxAttempts} failed for ${info.url} (${info.reason}) — retrying\n`,
  );
}

function defaultOnExhausted(info: { attempts: number; url: string; reason: string }): void {
  process.stderr.write(
    `gcs-retry: GIVING UP after ${info.attempts} attempts for ${info.url} (${info.reason}) — surfacing failure, nothing was silently dropped\n`,
  );
}

/** Wrap a `(url, init) => Promise<Response>` request function with bounded, jittered retry. */
export function withGcsRetry(request: RequestFn, opts: GcsRetryOptions = {}): RequestFn {
  const maxAttempts = opts.maxAttempts ?? 4;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError("maxAttempts must be a positive integer");
  }
  const baseDelayMs = opts.baseDelayMs ?? 100;
  const maxDelayMs = opts.maxDelayMs ?? 2_000;
  const jitterRatio = opts.jitterRatio ?? 0.3;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = opts.random ?? Math.random;
  const isRetryableStatus = opts.isRetryableStatus ?? defaultIsRetryableStatus;
  const onRetry = opts.onRetry ?? defaultOnRetry;
  const onExhausted = opts.onExhausted ?? defaultOnExhausted;

  function backoffMs(attempt: number): number {
    const raw = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
    const jitterSpan = raw * jitterRatio;
    return Math.max(0, raw - jitterSpan + random() * jitterSpan * 2);
  }

  return async function retryingRequest(url: string, init?: RequestInit): Promise<Response> {
    let lastReason = "unknown";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response: Response | undefined;
      let thrown: unknown;
      try {
        response = await request(url, init);
      } catch (error) {
        thrown = error;
      }

      if (thrown === undefined && response !== undefined && (response.ok || !isRetryableStatus(response.status))) {
        return response; // success, or a non-retryable status (404/400/401/403/412/...) — pass through untouched
      }

      lastReason = thrown !== undefined
        ? (thrown instanceof Error ? thrown.message : String(thrown))
        : `HTTP ${response!.status}`;

      if (attempt === maxAttempts) {
        onExhausted({ attempts: attempt, url, reason: lastReason });
        if (thrown !== undefined) throw thrown;
        return response!; // hand back the final non-ok response; callers already know how to turn a bad status into an error
      }

      onRetry({ attempt, maxAttempts, url, reason: lastReason });
      await sleep(backoffMs(attempt));
    }
    // unreachable — the loop above always returns or throws by the maxAttempts-th iteration
    throw new Error(`gcs-retry: unreachable (maxAttempts=${maxAttempts})`);
  };
}
