// gcs-client — direct unit coverage of the vendored client (see server/world/gcs-client.mjs's own
// provenance header) against the fake-GCS double, so log-store.mjs's own tests can stay focused on
// its jsonl-batching/backend-resolution behavior rather than re-proving the wire contract here too.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createGcsClient, createGoogleApiRequest } from "@red-cup-engineering/footing/gcs-client";
import { startFakeGcs } from "./helpers/fake-gcs.mjs";

const unauthenticatedRequest = (url, init) => fetch(url, init);

test("getObject: 404 on a missing object returns null, not a throw", async (t) => {
  const fake = await startFakeGcs("b1");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: "b1", apiBase: fake.url, request: unauthenticatedRequest });
  assert.equal(await client.getObject("nope.jsonl"), null);
});

test("putObject: ifGenerationMatch=0 creates when absent, then refuses a second create", async (t) => {
  const fake = await startFakeGcs("b2");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: "b2", apiBase: fake.url, request: unauthenticatedRequest });

  const first = await client.putObject("world.jsonl", "row1\n", "0");
  assert.equal(first.ok, true);
  assert.equal(first.generation, "1");

  const second = await client.putObject("world.jsonl", "row1\nrow2\n", "0");
  assert.equal(second.ok, false);
  assert.equal(second.status, 412);
  assert.equal(fake.preconditionFailures, 1);
});

test("putObject then getObject round-trips the exact bytes and generation", async (t) => {
  const fake = await startFakeGcs("b3");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: "b3", apiBase: fake.url, request: unauthenticatedRequest });

  const put = await client.putObject("x.jsonl", "{\"e\":\"a\"}\n", "0");
  assert.equal(put.ok, true);
  const got = await client.getObject("x.jsonl");
  assert.equal(got.text, "{\"e\":\"a\"}\n");
  assert.equal(got.generation, put.generation);
});

test("putObject: overwrite requires the CURRENT generation, not an arbitrary one", async (t) => {
  const fake = await startFakeGcs("b4");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: "b4", apiBase: fake.url, request: unauthenticatedRequest });

  const put1 = await client.putObject("x.jsonl", "v1", "0");
  const badOverwrite = await client.putObject("x.jsonl", "v2", "999");
  assert.equal(badOverwrite.ok, false);
  const goodOverwrite = await client.putObject("x.jsonl", "v2", put1.generation);
  assert.equal(goodOverwrite.ok, true);
  const got = await client.getObject("x.jsonl");
  assert.equal(got.text, "v2");
});

// --- getObject read-race regression coverage (fixed 2026-08-20) ------------------------------
//
// getObject used to be a metadata GET (learn the current generation) followed by a SEPARATE
// content GET pinned to that generation. On this (unversioned) bucket, a concurrent overwrite
// landing in the window between those two calls deletes the exact generation the metadata GET
// just pinned, and the follow-up content GET 404s — a 404 gcs-retry deliberately never retries
// (see gcs-retry.mjs's policy comment: indistinguishable from "object doesn't exist"). The fix
// collapses getObject to a single `alt=media` request, generation read off that same response's
// `x-goog-generation` header, removing the window entirely.

test("getObject: reads content and generation off a single storage-API request — no metadata-GET-then-content-GET window", async (t) => {
  const fake = await startFakeGcs("single-request");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest });
  const put = await client.putObject("world.jsonl", "v1", "0");
  fake.requestLog.length = 0; // ignore the put above — only getObject's own requests matter here
  const found = await client.getObject("world.jsonl");
  assert.equal(found?.text, "v1");
  assert.equal(found?.generation, put.generation);
  assert.equal(fake.requestLog.length, 1, "getObject must make exactly one storage-API request now, not two");
  assert.ok(fake.requestLog[0].includes("alt=media"), "and it must be the alt=media content request, not a metadata GET");
});

test("regression: the OLD metadata-GET-then-content-GET pattern DID race a concurrent overwrite into an unretried 404 — characterizes the bug this fix removes", async (t) => {
  const fake = await startFakeGcs("race-characterization");
  t.after(() => fake.close());
  await fetch(
    `${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.jsonl&ifGenerationMatch=0`,
    { method: "POST", body: "v1" },
  );

  // Reproduces the OLD two-step getObject exactly (metadata GET, pin its generation, then a
  // SEPARATE content GET pinned to that generation) — this is what gcs-client.mjs's getObject
  // did before the 2026-08-20 fix. Kept local to this one test, purely to prove the fake-gcs
  // double can characterize the race the fix removes; not exported, not used anywhere else.
  async function oldGetObject(name) {
    const metaRes = await fetch(`${fake.url}/storage/v1/b/${fake.bucket}/o/${encodeURIComponent(name)}`);
    const meta = await metaRes.json();
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

  const status = await oldGetObject("world.jsonl");
  assert.equal(status, 404, "the pinned-generation content GET 404s once a concurrent overwrite has landed — this was the bug");
});

test("getObject: a concurrent overwrite landing exactly during the (now single) read still yields a consistent result, never a 404", async (t) => {
  const fake = await startFakeGcs("race-fixed");
  t.after(() => fake.close());
  const client = createGcsClient({ bucket: fake.bucket, apiBase: fake.url, request: unauthenticatedRequest });
  await client.putObject("world.jsonl", "v1", "0");

  fake.interleaveNextMatchingRequest(
    (method, pathname, search) =>
      method === "GET" &&
      pathname === `/storage/v1/b/${fake.bucket}/o/${encodeURIComponent("world.jsonl")}` &&
      search.get("alt") === "media",
    { name: "world.jsonl", text: "v2-from-a-concurrent-writer" },
  );

  const found = await client.getObject("world.jsonl");
  assert.equal(found?.text, "v2-from-a-concurrent-writer", "the single-request read observes the concurrent writer's already-applied overwrite cleanly");
  assert.equal(found?.generation, "2", "content and generation come off the same response, so they always agree");
});

test("createGoogleApiRequest: attaches a bearer token from the metadata server, caches it, refreshes near expiry", async () => {
  let tokenFetches = 0;
  let now = 0;
  const metadataUrl = "http://metadata.google.internal/tok";
  const fetchImpl = async (url, init) => {
    if (String(url) === metadataUrl) {
      tokenFetches++;
      return new Response(JSON.stringify({ access_token: `tok-${tokenFetches}`, expires_in: 100 }), { status: 200 });
    }
    return new Response(JSON.stringify({ seen: new Headers(init.headers).get("authorization") }), { status: 200 });
  };
  const req = createGoogleApiRequest({ fetchImpl, now: () => now, metadataUrl });

  const r1 = await req("http://example.invalid/x");
  assert.equal((await r1.json()).seen, "Bearer tok-1");
  assert.equal(tokenFetches, 1);

  now = 10_000; // well inside the 100s expiry, minus the 60s safety margin — should reuse
  const r2 = await req("http://example.invalid/y");
  assert.equal((await r2.json()).seen, "Bearer tok-1");
  assert.equal(tokenFetches, 1, "token should have been cached, not re-fetched");

  now = 45_000; // within 60s of the 100s expiry — must refresh
  const r3 = await req("http://example.invalid/z");
  assert.equal((await r3.json()).seen, "Bearer tok-2");
  assert.equal(tokenFetches, 2);
});
