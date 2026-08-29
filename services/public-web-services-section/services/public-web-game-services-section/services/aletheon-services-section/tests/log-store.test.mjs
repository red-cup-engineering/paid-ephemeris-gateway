// log-store — backend resolution + the bucket-mode EAVT log store: buffered append, batched
// flush (read-modify-conditional-write, retried on 412), and load-on-boot. Ends with the actual
// deploy-shaped round trip: seed a world with onAppend wired to a bucket store, run real ticks and
// combat, flush, then feed a FRESH store's loadRows() through store.replay() and diff the result
// against the live world — the same fidelity bar persistence-replay.test.mjs holds the local-file
// path to, but exercised over the real (fake) network path this time.

import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveLogBackend, openBucketLogStore } from "../server/world/log-store.mjs";
import { startFakeGcs } from "./helpers/fake-gcs.mjs";
import { createWorld, spawn } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tryAttack, corrupt } from "../server/world/combat.mjs";
import { replay } from "../server/world/store.mjs";
import { KIND, COMBAT } from "../shared/constants.mjs";

const unauthenticatedRequest = (url, init) => fetch(url, init);

test("resolveLogBackend: neither var set -> none (in-memory only, the always-had default)", () => {
  assert.deepEqual(resolveLogBackend({}), { kind: "none" });
});

test("resolveLogBackend: WORLD_LOG alone -> file backend, path preserved verbatim (local dev, unchanged)", () => {
  assert.deepEqual(resolveLogBackend({ WORLD_LOG: "/tmp/aletheon.jsonl" }), { kind: "file", path: "/tmp/aletheon.jsonl" });
});

test("resolveLogBackend: ALETHEON_BUCKET set, no WORLD_LOG -> bucket backend, default object name", () => {
  assert.deepEqual(resolveLogBackend({ ALETHEON_BUCKET: "five-six-one-aletheon" }), {
    kind: "bucket", bucket: "five-six-one-aletheon", object: "aletheon-world.jsonl",
  });
});

test("resolveLogBackend: both set -> bucket wins, WORLD_LOG becomes the object name (not a filesystem path)", () => {
  assert.deepEqual(resolveLogBackend({ ALETHEON_BUCKET: "b", WORLD_LOG: "saves/world.jsonl" }), {
    kind: "bucket", bucket: "b", object: "saves/world.jsonl",
  });
});

test("resolveLogBackend: empty-string ALETHEON_BUCKET treated as unset (mirrors ruinfold's resolveStoreRoot / Farstone's resolveWorldBackend precedent)", () => {
  assert.deepEqual(resolveLogBackend({ ALETHEON_BUCKET: "", WORLD_LOG: "/tmp/x.jsonl" }), { kind: "file", path: "/tmp/x.jsonl" });
  assert.deepEqual(resolveLogBackend({ ALETHEON_BUCKET: "" }), { kind: "none" });
});

test("openBucketLogStore: loadRows on an object that doesn't exist yet returns [] (fresh bucket = fresh world)", async (t) => {
  const fake = await startFakeGcs("empty-bucket");
  t.after(() => fake.close());
  const store = openBucketLogStore({ kind: "bucket", bucket: "empty-bucket", object: "w.jsonl" }, {
    gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest },
  });
  assert.deepEqual(await store.loadRows(), []);
});

test("openBucketLogStore: appendRow buffers in memory (no network call) until flush", async (t) => {
  const fake = await startFakeGcs("buf-bucket");
  t.after(() => fake.close());
  const store = openBucketLogStore({ kind: "bucket", bucket: "buf-bucket", object: "w.jsonl" }, {
    gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest },
  });
  store.appendRow({ e: "x-1", a: "spawned", v: {}, t: 0 });
  store.appendRow({ e: "x-1", a: "moved", v: { x: 1 }, t: 1 });
  assert.equal(store.pendingCount(), 2);
  assert.deepEqual(fake.requestLog, [], "buffering must not touch the network");

  await store.flush();
  assert.equal(store.pendingCount(), 0);
  assert.ok(fake.requestLog.length > 0, "flush must actually write");

  const rows = await store.loadRows();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].a, "spawned");
  assert.equal(rows[1].a, "moved");
});

test("openBucketLogStore: a second flush APPENDS to the first batch, doesn't replace it", async (t) => {
  const fake = await startFakeGcs("append-bucket");
  t.after(() => fake.close());
  const store = openBucketLogStore({ kind: "bucket", bucket: "append-bucket", object: "w.jsonl" }, {
    gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest },
  });
  store.appendRow({ e: "a", a: "spawned", v: {}, t: 0 });
  await store.flush();
  store.appendRow({ e: "b", a: "spawned", v: {}, t: 1 });
  await store.flush();

  const rows = await store.loadRows();
  assert.deepEqual(rows.map((r) => r.e), ["a", "b"]);
});

test("openBucketLogStore: flush() is a cheap no-op when nothing is pending", async (t) => {
  const fake = await startFakeGcs("noop-bucket");
  t.after(() => fake.close());
  const store = openBucketLogStore({ kind: "bucket", bucket: "noop-bucket", object: "w.jsonl" }, {
    gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest },
  });
  await store.flush();
  assert.deepEqual(fake.requestLog, [], "an empty flush must not touch the network at all");
});

test("openBucketLogStore: concurrent flushes from two writers both land (412 retried, nothing lost)", async (t) => {
  const fake = await startFakeGcs("race-bucket");
  t.after(() => fake.close());
  const opts = { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } };
  const storeA = openBucketLogStore({ kind: "bucket", bucket: "race-bucket", object: "w.jsonl" }, opts);
  const storeB = openBucketLogStore({ kind: "bucket", bucket: "race-bucket", object: "w.jsonl" }, opts);

  storeA.appendRow({ e: "from-a", a: "spawned", v: {}, t: 0 });
  storeB.appendRow({ e: "from-b", a: "spawned", v: {}, t: 0 });

  await Promise.all([storeA.flush(), storeB.flush()]);

  assert.ok(fake.preconditionFailures >= 1, "expected at least one genuine 412 from the race, or this test isn't racing");
  const rows = await storeA.loadRows();
  const subjects = rows.map((r) => r.e).sort();
  assert.deepEqual(subjects, ["from-a", "from-b"], "both writers' rows must be present — nothing overwritten");
});

test("bucket round trip: a live seeded+fought world, saved through the fake bucket, restores with the same fidelity as the local-file path", async (t) => {
  const fake = await startFakeGcs("round-trip-bucket");
  t.after(() => fake.close());
  const opts = { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } };
  const writer = openBucketLogStore({ kind: "bucket", bucket: "round-trip-bucket", object: "w.jsonl" }, opts);

  const world = createWorld({ onAppend: (row) => writer.appendRow(row) });
  seedWorld(world);
  const brigand = [...world.entities.values()].find((e) => e.kind === KIND.brigand && e.hostile);
  const player = spawn(world, { kind: "player", name: "restorer", x: brigand.x, z: brigand.z, maxHp: COMBAT.playerMaxHp });
  let guard = 0;
  while (brigand.state !== "dead" && guard++ < 20) {
    player.lastAttackAt = 0;
    tryAttack(world, player.id, brigand.id);
  }
  assert.equal(brigand.state, "dead");
  corrupt(world, brigand);
  assert.equal(brigand.state, "anomaly");

  await writer.flush();

  // a genuinely SEPARATE store instance (as a fresh Cloud Run instance booting after a restart
  // would open) reads the same bucket object back.
  const reader = openBucketLogStore({ kind: "bucket", bucket: "round-trip-bucket", object: "w.jsonl" }, opts);
  const rows = await reader.loadRows();
  assert.ok(rows.length > 0);
  const restored = replay(rows);

  // the player's own spawn() call also went through the same onAppend hook, so it's in the
  // trace too — a real restore-mid-session would bring back any players who never explicitly
  // left, exactly like this.
  assert.equal(restored.entities.size, world.entities.size);
  const r = restored.entities.get(brigand.id);
  assert.equal(r.kind, KIND.anomaly);
  assert.equal(r.hostile, true);
  assert.equal(r.state, "anomaly");
  assert.equal(r.hp, brigand.hp);
});
