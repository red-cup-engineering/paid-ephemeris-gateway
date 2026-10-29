import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openClockStore } from "./clock-store.mts";
import { startFakeGcs } from "./fake-gcs.mts";

const unauthenticatedRequest: typeof fetch = (url, init) => fetch(url, init);

test("openClockStore(none) is null, mirrors openWorldStore's own null-for-none shape", () => {
  assert.equal(openClockStore({ kind: "none" }), null);
});

test("file backend: load() before any save returns null (no prior clock, catch-up will run 0 ticks)", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "farstone-clock-store-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = openClockStore({ kind: "file", path: join(dir, "world.json") });
  assert.notEqual(store, null);
  assert.equal(await store!.load(), null);
});

test("file backend: save then load round-trips lastTickAt exactly, at a sibling path (never the engine file itself)", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "farstone-clock-store-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const worldPath = join(dir, "world.json");
  const store = openClockStore({ kind: "file", path: worldPath });
  assert.equal(store!.describe, `${worldPath}.clock.json`);

  await store!.save({ lastTickAt: 1_700_000_000_123 });
  const loaded = await store!.load();
  assert.deepEqual(loaded, { lastTickAt: 1_700_000_000_123 });

  // The engine's own save file must be untouched by this — clock-store never writes there.
  await assert.rejects(() => stat(worldPath), /ENOENT/);
  const clockStat = await stat(`${worldPath}.clock.json`);
  assert.ok(clockStat.isFile());
});

test("file backend: a second save overwrites the first (the clock, not an append log)", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "farstone-clock-store-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = openClockStore({ kind: "file", path: join(dir, "world.json") });
  await store!.save({ lastTickAt: 100 });
  await store!.save({ lastTickAt: 200 });
  assert.deepEqual(await store!.load(), { lastTickAt: 200 });
});

test("bucket backend: load() with no object yet returns null", async (t) => {
  const fake = await startFakeGcs("clock-bucket-fresh");
  t.after(() => fake.close());
  const store = openClockStore(
    { kind: "bucket", bucket: fake.bucket, object: "world.json" },
    { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
  );
  assert.equal(store!.describe, `gs://${fake.bucket}/world.clock.json`);
  assert.equal(await store!.load(), null);
});

test("bucket backend: save then load round-trips lastTickAt through the network, and never touches the engine object's own name", async (t) => {
  const fake = await startFakeGcs("clock-bucket-roundtrip");
  t.after(() => fake.close());
  const store = openClockStore(
    { kind: "bucket", bucket: fake.bucket, object: "world.json" },
    { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
  );
  await store!.save({ lastTickAt: 42 });
  assert.deepEqual(await store!.load(), { lastTickAt: 42 });
  assert.ok(
    fake.requestLog.some((line) => line.includes("world.clock.json")),
    "the clock must be written under its own object name, not overwrite world.json",
  );
  assert.ok(
    fake.requestLog.every((line) => !line.includes("name=world.json&")),
    "the clock store must never write to the engine's own object name",
  );
});

test("bucket backend: repeated saves overwrite cleanly (best-effort, no 412-retry loop needed for a single-writer clock)", async (t) => {
  const fake = await startFakeGcs("clock-bucket-repeat");
  t.after(() => fake.close());
  const store = openClockStore(
    { kind: "bucket", bucket: fake.bucket, object: "world.json" },
    { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
  );
  for (let i = 1; i <= 5; i++) await store!.save({ lastTickAt: i * 1000 });
  assert.deepEqual(await store!.load(), { lastTickAt: 5000 });
});

test("bucket backend: a corrupt clock object degrades to null (unknown), never fatal", async (t) => {
  const fake = await startFakeGcs("clock-bucket-corrupt");
  t.after(() => fake.close());
  await fetch(
    `${fake.url}/upload/storage/v1/b/${fake.bucket}/o?uploadType=media&name=world.clock.json&ifGenerationMatch=0`,
    { method: "POST", body: "{ not valid json" },
  );
  const store = openClockStore(
    { kind: "bucket", bucket: fake.bucket, object: "world.json" },
    { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
  );
  assert.equal(await store!.load(), null);
});

test("object-name derivation: a non-.json object name still gets an unambiguous .clock.json sibling", async (t) => {
  const fake = await startFakeGcs("clock-bucket-weird-name");
  t.after(() => fake.close());
  const store = openClockStore(
    { kind: "bucket", bucket: fake.bucket, object: "saves/world" },
    { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } },
  );
  assert.equal(store!.describe, `gs://${fake.bucket}/saves/world.clock.json`);
});
