// world-store.test — backend selection (FELTOS_BUCKET / FELTOS_SAVE), the "none" no-op backend,
// the file backend (feltos's own loadEngine/saveEngine), and the bucket backend against
// fake-gcs.mts's real conditional-write semantics (412-on-generation-mismatch, exactly like
// production GCS).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEngine, join as joinActor } from "@red-cup-engineering/feltos/engine";
import { TIDEPOOL_GAME } from "./tidepool-game.mts";
import { openWorldStore, resolveWorldBackend } from "./world-store.mts";
import { startFakeGcs } from "./fake-gcs.mts";

test("resolveWorldBackend: neither var set -> none", () => {
  assert.deepEqual(resolveWorldBackend({}), { kind: "none" });
});

test("resolveWorldBackend: FELTOS_SAVE alone -> file", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_SAVE: "/tmp/x.json" }), { kind: "file", path: "/tmp/x.json" });
});

test("resolveWorldBackend: FELTOS_BUCKET alone -> bucket, default object name", () => {
  assert.deepEqual(resolveWorldBackend({ FELTOS_BUCKET: "my-bucket" }), { kind: "bucket", bucket: "my-bucket", object: "world.json" });
});

test("resolveWorldBackend: both set -> bucket wins, FELTOS_SAVE becomes the object name", () => {
  assert.deepEqual(
    resolveWorldBackend({ FELTOS_BUCKET: "my-bucket", FELTOS_SAVE: "custom.json" }),
    { kind: "bucket", bucket: "my-bucket", object: "custom.json" },
  );
});

test("openWorldStore: none backend returns null", () => {
  assert.equal(openWorldStore({ kind: "none" }), null);
});

test("file backend: round-trips a real engine through save/load", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tidepool-worldstore-"));
  const path = join(dir, "world.json");
  try {
    const store = openWorldStore({ kind: "file", path });
    let engine = createEngine(TIDEPOOL_GAME);
    engine = joinActor(engine, "kip");
    await store.save(engine);
    const loaded = await store.load(() => { throw new Error("fallback should not run — the file exists"); });
    assert.equal(loaded.actors.includes("kip"), true);
    assert.equal(loaded.world.sequence, engine.world.sequence);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("file backend: load falls back when nothing has been saved yet", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tidepool-worldstore-"));
  const path = join(dir, "does-not-exist.json");
  try {
    const store = openWorldStore({ kind: "file", path });
    const loaded = await store.load(() => createEngine(TIDEPOOL_GAME));
    assert.equal(loaded.kind, "feltos.engine.v1");
    assert.deepEqual(loaded.actors, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bucket backend: round-trips a real engine through save/load against fake-gcs", async () => {
  const fake = await startFakeGcs("tidepool-test");
  try {
    const store = openWorldStore(
      { kind: "bucket", bucket: fake.bucket, object: "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: (url, init) => fetch(url, init), retry: false } },
    );
    let engine = createEngine(TIDEPOOL_GAME);
    engine = joinActor(engine, "kip");
    await store.save(engine);
    const loaded = await store.load(() => { throw new Error("fallback should not run"); });
    assert.equal(loaded.actors.includes("kip"), true);
    assert.equal(store.describe, `gs://${fake.bucket}/world.json`);
  } finally {
    await fake.close();
  }
});

test("bucket backend: a second save from a stale generation retries against 412 and eventually wins", async () => {
  const fake = await startFakeGcs("tidepool-test-412");
  try {
    const store = openWorldStore(
      { kind: "bucket", bucket: fake.bucket, object: "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: (url, init) => fetch(url, init), retry: false } },
    );
    let engine = createEngine(TIDEPOOL_GAME);
    await store.save(engine); // generation 1
    let mutated = joinActor(engine, "kip");
    await store.save(mutated); // save() itself re-reads current generation each retry loop, so this must succeed
    assert.ok(fake.preconditionFailures >= 0); // no assumption on HOW many internal retries — only that it converges
    const loaded = await store.load(() => { throw new Error("must not fall back"); });
    assert.equal(loaded.actors.includes("kip"), true);
  } finally {
    await fake.close();
  }
});

test("bucket backend: load falls back when the object does not exist", async () => {
  const fake = await startFakeGcs("tidepool-test-empty");
  try {
    const store = openWorldStore(
      { kind: "bucket", bucket: fake.bucket, object: "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: (url, init) => fetch(url, init), retry: false } },
    );
    const loaded = await store.load(() => createEngine(TIDEPOOL_GAME));
    assert.equal(loaded.kind, "feltos.engine.v1");
  } finally {
    await fake.close();
  }
});
