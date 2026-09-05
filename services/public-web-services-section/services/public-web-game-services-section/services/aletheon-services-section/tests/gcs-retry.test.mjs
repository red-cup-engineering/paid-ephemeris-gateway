// gcs-retry — direct coverage of withGcsRetry against the fake-GCS double's injected-failure
// modes, and an integration check that gcs-client.mjs actually applies it by default. Ported
// from Farstone's `src/gcs-client.test.mts` retry section (see gcs-retry.mjs's own header for
// why this exists), adapted to plain ESM/node:test.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";
import { withGcsRetry } from "@red-cup-engineering/footing/gcs-retry";
import { startFakeGcs } from "./helpers/fake-gcs.mjs";

const unauthenticatedRequest = (url, init) => fetch(url, init);

// noSleep — every retry test injects a real-time-free `sleep` so the suite doesn't actually
// wait out backoff delays; `sleepCalls` records the requested delays so tests can assert
// backoff actually happened without timing the wall clock.
function noSleep(sleepCalls) {
  return async (ms) => { sleepCalls.push(ms); };
}

async function withFakeGcs(bucket, run) {
  const fake = await startFakeGcs(bucket);
  try {
    await run(fake);
  } finally {
    await fake.close();
  }
}

test("withGcsRetry: a transient 503 is retried and the eventual success is returned, not lost", async () => {
  await withFakeGcs("retry-503-recovers", async (fake) => {
    fake.failNextRequests(2, "503");
    const sleepCalls = [];
    const retries = [];
    const request = withGcsRetry(unauthenticatedRequest, {
      sleep: noSleep(sleepCalls),
      random: () => 0.5,
      onRetry: (info) => retries.push(`${info.attempt}/${info.maxAttempts}: ${info.reason}`),
    });
    const res = await request(`${fake.url}/storage/v1/b/${fake.bucket}/o?prefix=`);
    assert.equal(res.status, 200);
    assert.equal(retries.length, 2, "two transient 503s should mean exactly two retries before success");
    assert.ok(retries.every((line) => line.includes("HTTP 503")), "each retry log line should name the real reason");
    assert.equal(sleepCalls.length, 2, "backoff must actually be requested between retries");
  });
});

test("withGcsRetry: a thrown network error (fetch itself failing) is retried the same as a 503", async () => {
  await withFakeGcs("retry-throw-recovers", async (fake) => {
    fake.failNextRequests(1, "throw");
    const sleepCalls = [];
    const retries = [];
    const request = withGcsRetry(unauthenticatedRequest, {
      sleep: noSleep(sleepCalls),
      random: () => 0.5,
      onRetry: (info) => retries.push(info.reason),
    });
    const res = await request(`${fake.url}/storage/v1/b/${fake.bucket}/o?prefix=`);
    assert.equal(res.status, 200);
    assert.equal(retries.length, 1);
  });
});

test("withGcsRetry: permanent failure exhausts maxAttempts, is surfaced loudly (onExhausted fires), and the caller still sees it — not silently dropped", async () => {
  await withFakeGcs("retry-permanent-failure", async (fake) => {
    fake.failNextRequests(Infinity, "503"); // never recovers
    const sleepCalls = [];
    const retries = [];
    let exhausted;
    const request = withGcsRetry(unauthenticatedRequest, {
      maxAttempts: 3,
      sleep: noSleep(sleepCalls),
      random: () => 0.5,
      onRetry: (info) => retries.push(info.reason),
      onExhausted: (info) => { exhausted = { attempts: info.attempts, reason: info.reason }; },
    });
    const res = await request(`${fake.url}/storage/v1/b/${fake.bucket}/o?prefix=`);
    assert.equal(res.status, 503, "the final (still-bad) response is handed back, not swallowed into a generic error");
    assert.equal(retries.length, 2, "maxAttempts=3 means 2 retries before giving up on the 3rd");
    assert.deepEqual(exhausted, { attempts: 3, reason: "HTTP 503" });
  });
});

test("withGcsRetry: permanent thrown failure is re-thrown after exhausting attempts, never swallowed", async () => {
  await withFakeGcs("retry-permanent-throw", async (fake) => {
    fake.failNextRequests(Infinity, "throw");
    const sleepCalls = [];
    let exhausted;
    const request = withGcsRetry(unauthenticatedRequest, {
      maxAttempts: 2,
      sleep: noSleep(sleepCalls),
      random: () => 0.5,
      onExhausted: (info) => { exhausted = { attempts: info.attempts }; },
    });
    await assert.rejects(() => request(`${fake.url}/storage/v1/b/${fake.bucket}/o?prefix=`));
    assert.deepEqual(exhausted, { attempts: 2 });
  });
});

test("withGcsRetry: a 412 (precondition failed) is passed through on the FIRST attempt, never retried", async () => {
  await withFakeGcs("retry-skips-412", async (fake) => {
    // Create the object once so a second ifGenerationMatch=0 write genuinely 412s.
    await fetch(`${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=x.jsonl&ifGenerationMatch=0`, {
      method: "POST",
      body: "{}",
    });
    const sleepCalls = [];
    const retries = [];
    const request = withGcsRetry(unauthenticatedRequest, { sleep: noSleep(sleepCalls), onRetry: () => retries.push("x") });
    const res = await request(
      `${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=x.jsonl&ifGenerationMatch=0`,
      { method: "POST", body: "{}" },
    );
    assert.equal(res.status, 412);
    assert.equal(retries.length, 0, "412 is an application-level contention signal, not a transient fault — must not be retried");
    assert.equal(sleepCalls.length, 0);
  });
});

test("withGcsRetry: a 404 is passed through on the first attempt, never retried (object legitimately absent)", async () => {
  await withFakeGcs("retry-skips-404", async (fake) => {
    const retries = [];
    const request = withGcsRetry(unauthenticatedRequest, { sleep: async () => {}, onRetry: () => retries.push("x") });
    const res = await request(`${fake.url}/storage/v1/b/${fake.bucket}/o/${encodeURIComponent("nope.jsonl")}`);
    assert.equal(res.status, 404);
    assert.equal(retries.length, 0);
  });
});

test("withGcsRetry: exponential backoff with jitter actually grows between attempts (not a fixed delay)", async () => {
  await withFakeGcs("retry-backoff-grows", async (fake) => {
    fake.failNextRequests(3, "503");
    const sleepCalls = [];
    const request = withGcsRetry(unauthenticatedRequest, {
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 10_000,
      jitterRatio: 0, // deterministic: isolate the exponential curve from jitter for this assertion
      sleep: noSleep(sleepCalls),
      random: () => 0.5,
    });
    await request(`${fake.url}/storage/v1/b/${fake.bucket}/o?prefix=`);
    assert.deepEqual(sleepCalls, [100, 200, 400]);
  });
});

test("createGcsClient integration: retry is opt-in by default — a bare call with no `retry` option surfaces a transient failure instead of masking it (footing's contract, not the old vendored default; log-store.mjs passes retry:true to keep its own prior always-on behavior)", async () => {
  await withFakeGcs("client-default-retry-get", async (fake) => {
    await fetch(`${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.jsonl&ifGenerationMatch=0`, {
      method: "POST",
      body: "hello",
    });
    fake.failNextRequests(1, "throw");
    const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest });
    await assert.rejects(() => client.getObject("world.jsonl"));
  });
});

test("createGcsClient integration: putObject transparently survives a transient failure via the default retry policy", async () => {
  await withFakeGcs("client-integration-put", async (fake) => {
    fake.failNextRequests(1, "503");
    const client = createGcsClient({
      bucket: fake.bucket,
      apiBase: fake.url,
      request: unauthenticatedRequest,
      retry: { sleep: async () => {}, random: () => 0.5 },
    });
    const result = await client.putObject("world.jsonl", "payload", "0");
    assert.equal(result.ok, true);
  });
});

test("createGcsClient: retry: false disables retry entirely — a single transient failure is fatal, exactly like before this module existed", async () => {
  await withFakeGcs("client-retry-disabled", async (fake) => {
    fake.failNextRequests(1, "throw");
    const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest, retry: false });
    await assert.rejects(() => client.getObject("world.jsonl"));
  });
});

test("createGcsClient: a permanent failure is surfaced loudly (onExhausted), not silently lost, through the real client surface", async () => {
  await withFakeGcs("client-permanent-loud", async (fake) => {
    fake.failNextRequests(Infinity, "503");
    let exhausted;
    const client = createGcsClient({
      bucket: fake.bucket,
      apiBase: fake.url,
      request: unauthenticatedRequest,
      retry: { maxAttempts: 2, sleep: async () => {}, random: () => 0.5, onExhausted: (info) => { exhausted = info; } },
    });
    await assert.rejects(() => client.getObject("nope-permanently.jsonl"));
    assert.equal(exhausted.attempts, 2);
  });
});
