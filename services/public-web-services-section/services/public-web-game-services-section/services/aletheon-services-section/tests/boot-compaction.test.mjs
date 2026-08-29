// boot-compaction — reproduces, then closes, the 2026-08-20 live Aletheon incident (see the
// deploy runbook's Known-open-issues entry and log-store.mjs's own "BOOT-TIME CATCH-UP
// COMPACTION" header section for the full root-cause account): the live `aletheon-world.jsonl`
// object was found at 179,920 rows / ~14.8MB, UNCHANGED across two full boots. The root cause,
// confirmed here in code rather than inferred from symptoms: `flush()`'s own compaction check
// only ever runs from INSIDE flush(), gated on `pending.length > 0` — so a tail that's already
// oversized BEFORE this process's first flush() has no path back to a small tail until ongoing
// tick activity produces a flush that crosses the threshold again, which the live process never
// survived long enough (under the memory pressure of replaying that much history) to reach.
// `loadRows()` boot-time reading of snapshot+tail was ALREADY correct before this fix — this test
// proves that too, so the fix isn't credited with something it didn't need to do.
//
// This test builds a genuinely oversized log (50,000 rows) directly on a fake bucket — no real
// GCS, no real 179,920-row transfer, but the identical shape: many "moved"/"vitality" rows per
// live entity, never once compacted, sitting in the tail object alone (no snapshot object exists
// yet — exactly the state a log that predates this fix, or that OOM'd before ever compacting,
// would be in).

import assert from "node:assert/strict";
import { test } from "node:test";
import { replay } from "../server/world/store.mjs";
import { openBucketLogStore } from "../server/world/log-store.mjs";
import { DEFAULT_COMPACT_THRESHOLD_ROWS } from "../server/world/snapshot.mjs";
import { startFakeGcs } from "./helpers/fake-gcs.mjs";

const unauthenticatedRequest = (url, init) => fetch(url, init);

const ENTITY_COUNT = 50;
const TOTAL_ROWS = 50_000;

// buildOversizedRows — the same growth SHAPE the runbook's own root-cause account names: a
// bounded number of live entities (here 50, matching the incident's own "up to one moved row per
// live entity per tick" mechanism), each accumulating many historical "moved"/"vitality" rows
// over (simulated) time — only the LATEST of which is ever load-bearing for a currently-live
// entity (see snapshot.mjs's own "WHY THIS IS SAFE" header). This is exactly the shape compaction
// is supposed to collapse: 50 live entities' worth of true state, buried under 50,000 rows of
// superseded history.
function buildOversizedRows(entityCount, totalRows) {
  const rows = [];
  for (let i = 1; i <= entityCount; i++) {
    rows.push({
      e: `critter-${i}`,
      a: "spawned",
      v: { kind: "critter", name: `Critter ${i}`, x: i, z: -i, maxHp: 20, hostile: false },
      t: 0,
    });
  }
  let t = 1;
  while (rows.length < totalRows) {
    for (let i = 1; i <= entityCount && rows.length < totalRows; i++) {
      rows.push({ e: `critter-${i}`, a: "moved", v: { x: i + (t % 7), y: 0, z: -i + (t % 3), yaw: 0 }, t });
      rows.push({ e: `critter-${i}`, a: "vitality", v: { hp: 20 - (t % 5), maxHp: 20 }, t });
    }
    t++;
  }
  return rows.slice(0, totalRows);
}

test(
  "boot-compaction: an already-oversized tail survives two boots UNCHANGED without the fix — reproducing the live incident",
  async (t) => {
    const fake = await startFakeGcs("boot-compaction-repro-bucket");
    t.after(() => fake.close());
    const opts = { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } };
    const backend = { kind: "bucket", bucket: "boot-compaction-repro-bucket", object: "aletheon-world.jsonl" };

    // Seed the bucket with an already-oversized tail and NO snapshot object — the exact state a
    // log that predates this fix (or that OOM'd before ever compacting) is in.
    const writer = openBucketLogStore(backend, opts);
    for (const row of buildOversizedRows(ENTITY_COUNT, TOTAL_ROWS)) writer.appendRow(row);
    await writer.flush();

    // --- "Instance 1" boots: loads rows, replays, attaches the world — mirroring
    // scripts/aletheon-server.mjs's OLD flow exactly (setWorld() called, but no boot-time
    // catch-up compaction — that method didn't exist before this fix).
    const boot1 = openBucketLogStore(backend, opts);
    const rows1 = await boot1.loadRows();
    assert.equal(rows1.length, TOTAL_ROWS, "boot loads the full existing tail (no snapshot exists yet to shrink it)");
    const world1 = replay(rows1);
    boot1.setWorld(() => world1);
    assert.equal(world1.entities.size, ENTITY_COUNT, "replay correctly folds the oversized tail into the right live entity count");
    // OLD flow: no flush() happens (no player activity), so flush()'s own compaction gate
    // (`pending.length > 0`) is never even reached — nothing compacts.

    // --- "Instance 2" boots fresh (a restart, same bucket) — the SAME oversized tail is read
    // again, unchanged, because nothing about instance 1's boot ever compacted it.
    const boot2 = openBucketLogStore(backend, opts);
    const rows2 = await boot2.loadRows();
    assert.equal(
      rows2.length,
      TOTAL_ROWS,
      'reproduces the live incident precisely: "179,920 rows... confirmed on two separate boots... identical row count" — without boot-time catch-up compaction, the backlog never shrinks across restarts',
    );
  },
);

test(
  "boot-compaction: compactBacklogIfOversized() shrinks an oversized tail immediately at boot, and the shrink survives a subsequent boot",
  async (t) => {
    const fake = await startFakeGcs("boot-compaction-fix-bucket");
    t.after(() => fake.close());
    const opts = { gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest } };
    const backend = { kind: "bucket", bucket: "boot-compaction-fix-bucket", object: "aletheon-world.jsonl" };

    const writer = openBucketLogStore(backend, opts);
    for (const row of buildOversizedRows(ENTITY_COUNT, TOTAL_ROWS)) writer.appendRow(row);
    await writer.flush();

    const rssBefore = process.memoryUsage().rss;

    // --- "Instance 1" boots with the FIX wired exactly as scripts/aletheon-server.mjs now does:
    // loadRows() -> replay() -> setWorld() -> compactBacklogIfOversized(), all on the SAME store
    // instance (the oversized-tail row count compactBacklogIfOversized() acts on is measured by
    // loadRows()'s own pass, on THIS instance — a fresh instance would have nothing to act on),
    // all before any autosave timer would ever get a chance to run.
    let compactedInfo = null;
    const boot1 = openBucketLogStore(backend, { ...opts, onCompact: (info) => { compactedInfo = info; } });
    const rows1 = await boot1.loadRows();
    assert.equal(rows1.length, TOTAL_ROWS, "boot still loads the full existing tail — this fix doesn't skip folding real history, it compacts AFTER folding it");
    const world1 = replay(rows1);
    boot1.setWorld(() => world1);

    const ran = await boot1.compactBacklogIfOversized();
    assert.equal(ran, true, "an oversized tail must trigger the one-time boot compaction");
    assert.ok(compactedInfo, "onCompact must fire with real measured numbers");
    assert.equal(compactedInfo.tailRowsBeforeCompaction, TOTAL_ROWS);
    // snapshotRows() emits "spawned" + "moved" + "vitality" per currently-live entity (see
    // snapshot.mjs) — 3 rows/entity, not the 50,000-row history it's replacing.
    assert.equal(compactedInfo.snapshotRows, ENTITY_COUNT * 3, "the compacted snapshot holds only each live entity's current row-set, not the whole history");

    const rssAfter = process.memoryUsage().rss;
    const rssDeltaMb = (rssAfter - rssBefore) / (1024 * 1024);
    // Coarse, deliberately generous guard (not a tight measurement — GC timing in a short-lived
    // test process is inherently noisy): folding 50,000 rows into 50 live entities and compacting
    // must not come anywhere near the 256Mi production limit this whole fix exists to respect.
    // Before the single-pass loadRows()/iterJsonlRows() change, this path held up to three full
    // arrays of parsed rows (snapRows + tailRows + the spread-concatenated copy) simultaneously
    // alongside the folded world; this asserts that collapsing to one array keeps the real,
    // measured cost nowhere near the ceiling that mattered live.
    assert.ok(rssDeltaMb < 200, `RSS grew by ${rssDeltaMb.toFixed(1)}MB folding+compacting a 50k-row backlog — expected well under 200MB`);

    // --- "Instance 2" boots fresh (a real restart) against the NOW-compacted bucket: the tail it
    // reads must be small — this is the actual "log shrinks post-boot-compaction" proof, and
    // simultaneously proves boot loads snapshot+tail rather than a still-oversized full replay.
    const boot2 = openBucketLogStore(backend, opts);
    const rows2 = await boot2.loadRows();
    assert.ok(
      rows2.length < TOTAL_ROWS / 10,
      `expected instance 2's boot to read a dramatically smaller trace after compaction; got ${rows2.length} rows (was ${TOTAL_ROWS})`,
    );
    assert.ok(
      rows2.length < DEFAULT_COMPACT_THRESHOLD_ROWS,
      `the post-compaction tail (${rows2.length} rows) should be well under the compaction threshold (${DEFAULT_COMPACT_THRESHOLD_ROWS}) — a snapshot-only boot, no leftover tail`,
    );

    // Fidelity: the world instance 2 replays from the SHRUNK trace must match instance 1's live
    // world on the fields a restore is supposed to preserve — compaction must not have silently
    // dropped or corrupted a live entity while shrinking the log.
    const world2 = replay(rows2);
    assert.equal(world2.entities.size, ENTITY_COUNT, "every live entity survives the compacted restore, none dropped");
    for (const id of world1.entities.keys()) {
      const before = world1.entities.get(id);
      const after = world2.entities.get(id);
      assert.ok(after, `entity ${id} must survive the compacted restore`);
      assert.equal(after.x, before.x, `${id}.x must match after compaction`);
      assert.equal(after.z, before.z, `${id}.z must match after compaction`);
      assert.equal(after.hp, before.hp, `${id}.hp must match after compaction`);
    }

    // --- A THIRD boot proves the shrink is stable, not a one-off: no further growth, no
    // regression back to replaying the old oversized tail.
    const boot3 = openBucketLogStore(backend, opts);
    const rows3 = await boot3.loadRows();
    assert.equal(rows3.length, rows2.length, "the compacted state is stable across a further restart — it does not regrow or reset");
  },
);
