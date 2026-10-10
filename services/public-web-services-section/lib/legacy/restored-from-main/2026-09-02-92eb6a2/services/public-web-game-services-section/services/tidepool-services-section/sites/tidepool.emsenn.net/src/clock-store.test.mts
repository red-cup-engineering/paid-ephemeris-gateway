// clock-store.test — a SEPARATE object/file from the engine snapshot (module header), round-
// tripped for both the file and bucket backends, plus the "no clock saved yet" -> null contract
// `tidepool-runtime.mts`/`serve.mts` rely on to fall back to `Date.now()` at first boot.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openClockStore } from "./clock-store.mts";
import { startFakeGcs } from "./fake-gcs.mts";

test("file backend: null when nothing saved yet", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tidepool-clockstore-"));
  try {
    const store = openClockStore({ kind: "file", path: join(dir, "world.json") });
    assert.equal(await store.load(), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("file backend: round-trips lastTickAt, at a SEPARATE path from the world snapshot's own path", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tidepool-clockstore-"));
  try {
    const worldPath = join(dir, "world.json");
    const store = openClockStore({ kind: "file", path: worldPath });
    const clockPath = `${worldPath}.clock.json`;
    assert.equal(store.describe, clockPath);
    await store.save({ lastTickAt: 1_700_000_000_000 });
    const loaded = await store.load();
    assert.deepEqual(loaded, { lastTickAt: 1_700_000_000_000 });
    // and the WORLD's own object at worldPath must not exist / be untouched by this
    await assert.rejects(() => readFile(worldPath, "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bucket backend: round-trips lastTickAt against fake-gcs, at object.clock.json (a SEPARATE object)", async () => {
  const fake = await startFakeGcs("tidepool-clock-test");
  try {
    const store = openClockStore(
      { kind: "bucket", bucket: fake.bucket, object: "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: (url, init) => fetch(url, init), retry: false } },
    );
    assert.equal(store.describe, `gs://${fake.bucket}/world.clock.json`);
    assert.equal(await store.load(), null);
    await store.save({ lastTickAt: 42 });
    const loaded = await store.load();
    assert.deepEqual(loaded, { lastTickAt: 42 });
  } finally {
    await fake.close();
  }
});

test("bucket backend: a corrupt/foreign object degrades to null, never throws", async () => {
  const fake = await startFakeGcs("tidepool-clock-corrupt");
  try {
    // write something that isn't the clock envelope shape, directly via a raw upload
    await fetch(`${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.clock.json&ifGenerationMatch=0`, {
      method: "POST",
      body: JSON.stringify({ something: "else" }),
    });
    const store = openClockStore(
      { kind: "bucket", bucket: fake.bucket, object: "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: (url, init) => fetch(url, init), retry: false } },
    );
    assert.equal(await store.load(), null);
  } finally {
    await fake.close();
  }
});

test("bucket backend: repeat saves succeed (cached-generation fast path, falling back to a fresh read on the first save)", async () => {
  const fake = await startFakeGcs("tidepool-clock-repeat");
  try {
    const store = openClockStore(
      { kind: "bucket", bucket: fake.bucket, object: "world.json" },
      { gcsClientOptions: { apiBase: fake.url, request: (url, init) => fetch(url, init), retry: false } },
    );
    await store.save({ lastTickAt: 1 });
    await store.save({ lastTickAt: 2 });
    await store.save({ lastTickAt: 3 });
    const loaded = await store.load();
    assert.deepEqual(loaded, { lastTickAt: 3 });
  } finally {
    await fake.close();
  }
});
