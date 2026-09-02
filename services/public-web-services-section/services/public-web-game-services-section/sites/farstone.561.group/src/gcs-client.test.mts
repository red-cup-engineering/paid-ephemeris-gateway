import assert from "node:assert/strict";
import { test } from "node:test";
import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";
import { withGcsRetry } from "@red-cup-engineering/footing/gcs-retry";
import { startFakeGcs } from "@red-cup-engineering/world-hosting/fake-gcs";
import type { FakeGcs } from "@red-cup-engineering/world-hosting/fake-gcs";

const unauthenticatedRequest: typeof fetch = (url, init) => fetch(url, init);

// noSleep — every retry test injects a real-time-free `sleep` so the suite doesn't actually
// wait out backoff delays; `sleepCalls` records the requested delays so tests can assert
// backoff actually happened without timing the wall clock.
function noSleep(sleepCalls: number[]) {
  return async (ms: number) => {
    sleepCalls.push(ms);
  };
}

async function withFakeGcs(bucket: string, run: (fake: FakeGcs) => Promise<void>) {
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
    const sleepCalls: number[] = [];
    const retries: string[] = [];
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
    const sleepCalls: number[] = [];
    const retries: string[] = [];
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
    const sleepCalls: number[] = [];
    const retries: string[] = [];
    let exhausted: { attempts: number; reason: string } | undefined;
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
    const sleepCalls: number[] = [];
    let exhausted: { attempts: number } | undefined;
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
    await fetch(`${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=x.json&ifGenerationMatch=0`, {
      method: "POST",
      body: "{}",
    });
    const sleepCalls: number[] = [];
    const retries: string[] = [];
    const request = withGcsRetry(unauthenticatedRequest, { sleep: noSleep(sleepCalls), onRetry: () => retries.push("x") });
    const res = await request(
      `${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=x.json&ifGenerationMatch=0`,
      { method: "POST", body: "{}" },
    );
    assert.equal(res.status, 412);
    assert.equal(retries.length, 0, "412 is an application-level contention signal, not a transient fault — must not be retried");
    assert.equal(sleepCalls.length, 0);
  });
});

test("withGcsRetry: a 404 is passed through on the first attempt, never retried (object legitimately absent)", async () => {
  await withFakeGcs("retry-skips-404", async (fake) => {
    const retries: string[] = [];
    const request = withGcsRetry(unauthenticatedRequest, { sleep: async () => {}, onRetry: () => retries.push("x") });
    const res = await request(`${fake.url}/storage/v1/b/${fake.bucket}/o/${encodeURIComponent("nope.json")}`);
    assert.equal(res.status, 404);
    assert.equal(retries.length, 0);
  });
});

test("withGcsRetry: exponential backoff with jitter actually grows between attempts (not a fixed delay)", async () => {
  await withFakeGcs("retry-backoff-grows", async (fake) => {
    fake.failNextRequests(3, "503");
    const sleepCalls: number[] = [];
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

test("createGcsClient integration: getObject transparently survives a transient failure via the default retry policy", async () => {
  await withFakeGcs("client-integration-get", async (fake) => {
    await fetch(`${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.json&ifGenerationMatch=0`, {
      method: "POST",
      body: "hello",
    });
    fake.failNextRequests(1, "throw");
    const client = createGcsClient({
      bucket: fake.bucket,
      apiBase: fake.url,
      request: unauthenticatedRequest,
      retry: { sleep: async () => {}, random: () => 0.5 },
    });
    const found = await client.getObject("world.json");
    assert.equal(found?.text, "hello");
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
    const result = await client.putObject("world.json", "payload", "0");
    assert.equal(result.ok, true);
  });
});

test("createGcsClient: retry: false disables retry entirely — a single transient failure is fatal, exactly like before this module existed", async () => {
  await withFakeGcs("client-retry-disabled", async (fake) => {
    fake.failNextRequests(1, "throw");
    const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest, retry: false });
    await assert.rejects(() => client.getObject("world.json"));
  });
});

// --- getObject read-race regression coverage (fixed 2026-08-20) ------------------------------
//
// getObject used to be a metadata GET (learn the current generation) followed by a SEPARATE
// content GET pinned to that generation. On this (unversioned) bucket, a concurrent overwrite
// landing in the window between those two calls deletes the exact generation the metadata GET
// just pinned, and the follow-up content GET 404s — a 404 gcs-retry deliberately never retries
// (see gcs-retry.mts's policy comment: indistinguishable from "object doesn't exist"). The fix
// collapses getObject to a single `alt=media` request, generation read off that same response's
// `x-goog-generation` header, removing the window entirely.

test("getObject: reads content and generation off a single storage-API request — no metadata-GET-then-content-GET window", async (t) => {
  const fake = await startFakeGcs("single-request");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest });
  const put = await client.putObject("world.json", "v1", "0");
  fake.requestLog.length = 0; // ignore the put above — only getObject's own requests matter here
  const found = await client.getObject("world.json");
  assert.equal(found?.text, "v1");
  assert.equal(found?.generation, put.generation);
  assert.equal(fake.requestLog.length, 1, "getObject must make exactly one storage-API request now, not two");
  assert.ok(fake.requestLog[0].includes("alt=media"), "and it must be the alt=media content request, not a metadata GET");
});

test("getObject: 404 on a genuinely missing object still returns null, not a throw", async (t) => {
  const fake = await startFakeGcs("single-request-404");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest });
  assert.equal(await client.getObject("nope.json"), null);
});

test("regression: the OLD metadata-GET-then-content-GET pattern DID race a concurrent overwrite into an unretried 404 — characterizes the bug this fix removes", async (t) => {
  const fake = await startFakeGcs("race-characterization");
  t.after(() => fake.close());
  await fetch(
    `${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.json&ifGenerationMatch=0`,
    { method: "POST", body: "v1" },
  );

  // Reproduces the OLD two-step getObject exactly (metadata GET, pin its generation, then a
  // SEPARATE content GET pinned to that generation) — this is what gcs-client.mts's getObject
  // did before the 2026-08-20 fix. Kept local to this one test, purely to prove the fake-gcs
  // double can characterize the race the fix removes; not exported, not used anywhere else.
  async function oldGetObject(name: string): Promise<number> {
    const metaRes = await fetch(`${fake.url}/storage/v1/b/${fake.bucket}/o/${encodeURIComponent(name)}`);
    const meta = (await metaRes.json()) as { generation: string };
    // A concurrent writer's overwrite lands HERE, between the two calls — on this unversioned
    // bucket the previous generation ceases to exist the moment the new one is written.
    fake.interleaveNextMatchingRequest(
      (method, pathname, search) =>
        method === "GET" &&
        pathname === `/storage/v1/b/${fake.bucket}/o/${encodeURIComponent(name)}` &&
        search.get("alt") === "media",
      { name, text: "v2-from-a-concurrent-writer" },
    );
    const contentRes = await fetch(
      `${fake.url}/storage/v1/b/${fake.bucket}/o/${encodeURIComponent(name)}?alt=media&generation=${meta.generation}`,
    );
    return contentRes.status;
  }

  const status = await oldGetObject("world.json");
  assert.equal(status, 404, "the pinned-generation content GET 404s once a concurrent overwrite has landed — this was the bug");
});

test("getObject: a concurrent overwrite landing exactly during the (now single) read still yields a consistent result, never a 404", async (t) => {
  const fake = await startFakeGcs("race-fixed");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest });
  await client.putObject("world.json", "v1", "0");

  fake.interleaveNextMatchingRequest(
    (method, pathname, search) =>
      method === "GET" &&
      pathname === `/storage/v1/b/${fake.bucket}/o/${encodeURIComponent("world.json")}` &&
      search.get("alt") === "media",
    { name: "world.json", text: "v2-from-a-concurrent-writer" },
  );

  const found = await client.getObject("world.json");
  assert.equal(found?.text, "v2-from-a-concurrent-writer", "the single-request read observes the concurrent writer's already-applied overwrite cleanly");
  assert.equal(found?.generation, "2", "content and generation come off the same response, so they always agree");
});
