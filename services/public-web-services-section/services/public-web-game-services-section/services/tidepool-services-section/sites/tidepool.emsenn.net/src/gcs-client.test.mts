// gcs-client.test — the hand-rolled GCS JSON API surface against fake-gcs.mts, plus gcs-retry's
// policy: transient failures (thrown network errors, 5xx) are retried and eventually surfaced
// loudly if they never clear; 412 (world-store.mts's own contention signal) is NEVER retried by
// this layer, passed straight through on the very first attempt.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";
import { startFakeGcs } from "./fake-gcs.mts";

function client(fake, retry) {
  return createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: (url, init) => fetch(url, init), retry });
}

test("getObject: 404 -> null (no throw)", async () => {
  const fake = await startFakeGcs("t1");
  try {
    const c = client(fake, false);
    assert.equal(await c.getObject("nope.json"), null);
  } finally { await fake.close(); }
});

test("putObject then getObject round-trips text and generation", async () => {
  const fake = await startFakeGcs("t2");
  try {
    const c = client(fake, false);
    const put = await c.putObject("world.json", "hello", "0");
    assert.equal(put.ok, true);
    assert.equal(put.generation, "1");
    const got = await c.getObject("world.json");
    assert.equal(got.text, "hello");
    assert.equal(got.generation, "1");
  } finally { await fake.close(); }
});

test("putObject: ifGenerationMatch mismatch returns {ok:false, status:412}, never throws", async () => {
  const fake = await startFakeGcs("t3");
  try {
    const c = client(fake, false);
    await c.putObject("world.json", "v1", "0");
    const result = await c.putObject("world.json", "v2", "0"); // stale precondition — object is now at generation 1
    assert.deepEqual(result, { ok: false, status: 412 });
  } finally { await fake.close(); }
});

test("retry: a thrown network error is retried and eventually succeeds", async () => {
  const fake = await startFakeGcs("t4");
  try {
    fake.failNextRequests(2, "throw");
    const retries = [];
    const c = client(fake, { maxAttempts: 4, baseDelayMs: 1, maxDelayMs: 1, onRetry: (i) => retries.push(i.reason) });
    const result = await c.putObject("world.json", "v1", "0");
    assert.equal(result.ok, true);
    assert.equal(retries.length, 2);
  } finally { await fake.close(); }
});

test("retry: a 503 status is retried and eventually succeeds", async () => {
  const fake = await startFakeGcs("t5");
  try {
    fake.failNextRequests(1, "503");
    const c = client(fake, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1 });
    const got = await c.getObject("nope.json"); // resolves to null (404) once the 503 clears
    assert.equal(got, null);
  } finally { await fake.close(); }
});

test("retry: permanent transient failure is surfaced (thrown), not silently swallowed, and onExhausted fires", async () => {
  const fake = await startFakeGcs("t6");
  try {
    fake.failNextRequests(Infinity, "throw");
    let exhausted = null;
    const c = client(fake, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1, onExhausted: (i) => { exhausted = i; } });
    await assert.rejects(() => c.getObject("anything.json"));
    assert.ok(exhausted);
    assert.equal(exhausted.attempts, 3);
  } finally { await fake.close(); }
});

test("retry: 412 is passed straight through on the FIRST attempt, never retried (world-store.mts's own contention signal)", async () => {
  const fake = await startFakeGcs("t7");
  try {
    const c = client(fake, { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 1, onRetry: () => { throw new Error("must never retry a 412"); } });
    await c.putObject("world.json", "v1", "0"); // generation 1
    const result = await c.putObject("world.json", "v2", "0"); // stale — 412
    assert.deepEqual(result, { ok: false, status: 412 });
  } finally { await fake.close(); }
});

test("retry: 404 is passed straight through, never retried", async () => {
  const fake = await startFakeGcs("t8");
  try {
    const c = client(fake, { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 1, onRetry: () => { throw new Error("must never retry a 404"); } });
    assert.equal(await c.getObject("does-not-exist.json"), null);
  } finally { await fake.close(); }
});

test("retry: default policy (no options passed) still recovers from a single transient failure", async () => {
  const fake = await startFakeGcs("t9");
  try {
    fake.failNextRequests(1, "503");
    const c = createGcsClient({
      bucket: fake.bucket, apiBase: fake.url, request: (url, init) => fetch(url, init),
      retry: { baseDelayMs: 1, maxDelayMs: 1 }, // keep the test fast; policy shape otherwise default
    });
    const got = await c.getObject("nope.json");
    assert.equal(got, null);
  } finally { await fake.close(); }
});
