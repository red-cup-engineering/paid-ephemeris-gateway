import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createEngine, step } from "@red-cup-engineering/feltos/engine";
import { snapshotEngine } from "@red-cup-engineering/feltos/persistence";
import { FARSTONE_GAME, FARSTONE_RUNTIME } from "./farstone-game.mts";
import { openWorldStore, resolveWorldBackend } from "./world-store.mts";
import { startFakeGcs } from "./fake-gcs.mts";
import type { FakeGcs } from "./fake-gcs.mts";

// unauthenticatedRequest — the fake GCS double (unlike the real one) never checks the
// Authorization header, so tests bypass gcs-client.mts's default createGoogleApiRequest()
// token layer (which would otherwise try to reach the real, unreachable-in-this-sandbox
// metadata server) by handing openWorldStore a plain fetch as its `request` implementation.
const unauthenticatedRequest: typeof fetch = (url, init) => fetch(url, init);

function withFakeGcs(bucket: string, opts: { object?: string } = {}) {
  return async (t: import("node:test").TestContext, run: (args: { fake: FakeGcs; store: ReturnType<typeof openWorldStore> }) => Promise<void>) => {
    const fake = await startFakeGcs(bucket);
    t.after(() => fake.close());
    const store = openWorldStore(
      { kind: "bucket", bucket, object: opts.object ?? "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
    );
    await run({ fake, store });
  };
}

test("resolveWorldBackend: neither var set -> none (in-memory only, unchanged default)", () => {
  assert.deepEqual(resolveWorldBackend({}), { kind: "none" });
});

test("resolveWorldBackend: FELTOS_SAVE alone -> file backend, path preserved verbatim", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_SAVE: "/tmp/farstone.json" }), { kind: "file", path: "/tmp/farstone.json" });
});

test("resolveWorldBackend: FELTOS_BUCKET set, no FELTOS_SAVE -> bucket backend, default object name", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "five-six-one-farstone" }), {
    kind: "bucket",
    bucket: "five-six-one-farstone",
    object: "world.json",
  });
});

test("resolveWorldBackend: both set -> bucket wins, FELTOS_SAVE becomes the object name (not a filesystem path)", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "five-six-one-farstone", FELTOS_SAVE: "saves/world.json" }), {
    kind: "bucket",
    bucket: "five-six-one-farstone",
    object: "saves/world.json",
  });
});

test("resolveWorldBackend: empty-string FELTOS_BUCKET treated as unset (falls through to file/none, mirrors ruinfold's own resolveStoreRoot precedent)", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "", FELTOS_SAVE: "/tmp/x.json" }), { kind: "file", path: "/tmp/x.json" });
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "" }), { kind: "none" });
});

test("openWorldStore(none) is null", () => {
  assert.equal(openWorldStore({ kind: "none" }), null);
});

test("file backend: save then load round-trips a real engine through actual disk, byte-exact snapshot", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "farstone-world-store-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "world.json");
  const store = openWorldStore({ kind: "file", path });
  assert.notEqual(store, null);

  let engine = createEngine(FARSTONE_GAME);
  for (let i = 0; i < 20; i++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
  const before = snapshotEngine(engine);

  await store!.save(engine);
  const loaded = await store!.load(() => {
    throw new Error("fallback should not run: the file was just written");
  });
  assert.deepEqual(snapshotEngine(loaded as never), before);
});

test("bucket backend: load() with no object yet calls the fallback, exactly like a fresh local save path", async (t) => {
  await withFakeGcs("test-bucket-fresh")(t, async ({ store }) => {
    let fallbackCalled = false;
    const engine = await store!.load(() => {
      fallbackCalled = true;
      return createEngine(FARSTONE_GAME);
    });
    assert.equal(fallbackCalled, true);
    assert.equal((engine as { kind: string }).kind, "feltos.engine.v1");
  });
});

test("bucket backend: save then load round-trips a real, ticked engine through the network, byte-exact snapshot", async (t) => {
  await withFakeGcs("test-bucket-roundtrip")(t, async ({ fake, store }) => {
    let engine = createEngine(FARSTONE_GAME);
    for (let i = 0; i < 50; i++) engine = step(engine, { runtime: FARSTONE_RUNTIME }).engine;
    const before = snapshotEngine(engine);

    await store!.save(engine);
    assert.ok(fake.requestLog.some((line) => line.startsWith("POST ")), "save() must actually issue a write to the fake bucket");

    const loaded = await store!.load(() => {
      throw new Error("fallback should not run: the object was just written");
    });
    assert.deepEqual(snapshotEngine(loaded as never), before);
  });
});

test("bucket backend: a corrupt stored object degrades to the caller's fallback, mirroring feltos's own loadEngine contract for local disk", async (t) => {
  await withFakeGcs("test-bucket-corrupt")(t, async ({ fake, store }) => {
    // Write garbage directly through the fake server's upload endpoint, bypassing the store's
    // own encodeSnapshot — simulating a truncated or hand-edited object.
    await fetch(`${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.json&ifGenerationMatch=0`, {
      method: "POST",
      body: "{ not valid json",
    });
    let fallbackCalled = false;
    const engine = await store!.load(() => {
      fallbackCalled = true;
      return createEngine(FARSTONE_GAME);
    });
    assert.equal(fallbackCalled, true);
    assert.equal((engine as { kind: string }).kind, "feltos.engine.v1");
  });
});

test("bucket backend: two overlapping saves both succeed (412-retry loop), and the object ends up holding exactly one full, valid snapshot", async (t) => {
  await withFakeGcs("test-bucket-concurrent")(t, async ({ fake, store }) => {
    let engineA = createEngine(FARSTONE_GAME);
    for (let i = 0; i < 5; i++) engineA = step(engineA, { runtime: FARSTONE_RUNTIME }).engine;
    let engineB = createEngine(FARSTONE_GAME);
    for (let i = 0; i < 9; i++) engineB = step(engineB, { runtime: FARSTONE_RUNTIME }).engine;

    // Both saves race the same object; the retry loop (see world-store.mts's save()) must let
    // both finish without throwing, even though only one write can land per generation.
    await Promise.all([store!.save(engineA), store!.save(engineB)]);
    assert.ok(fake.preconditionFailures >= 1, "a real 412 must have occurred for this to be a meaningful test of the retry loop");

    const loaded = await store!.load(() => {
      throw new Error("fallback should not run: one of the two saves landed");
    });
    const loadedSnapshot = snapshotEngine(loaded as never);
    const isA = JSON.stringify(loadedSnapshot) === JSON.stringify(snapshotEngine(engineA));
    const isB = JSON.stringify(loadedSnapshot) === JSON.stringify(snapshotEngine(engineB));
    assert.ok(isA || isB, "the final object must be exactly one writer's complete, valid snapshot, not a mix of both");
  });
});
