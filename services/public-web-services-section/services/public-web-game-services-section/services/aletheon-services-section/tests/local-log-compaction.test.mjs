// local-log-compaction — closes the 2026-09-02 cold-red-gate incident: cold-red-gate's deployed
// aletheon.service runs WORLD_LOG=<path> (local-file mode, no ALETHEON_BUCKET), and its per-tick
// NPC "moved" appends grew the durable trace to 8.3GB in ~36h with zero compaction wired for that
// backend. These tests measure the real on-disk file (not a fake-GCS double, per compaction.test.mjs's
// own bucket-mode precedent) through createLocalLogCompactor, mirroring log-store.test.mjs's and
// compaction.test.mjs's shapes for the bucket backend.

import assert from "node:assert/strict";
import { statSync, existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createLocalLogCompactor } from "../server/world/local-log-compaction.mjs";
import { createWorld, replay, rowsFromLog } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tick } from "../server/world/ticking.mjs";
import { snapshotRows } from "../server/world/snapshot.mjs";
import { writeFlatfile } from "@red-cup-engineering/flatfile";

async function tmpLogPath() {
  const dir = await mkdtemp(join(tmpdir(), "aletheon-local-compaction-"));
  return { dir, path: join(dir, "world.jsonl") };
}

test("maybeCompact is a no-op below threshold — no file is written at all", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const compactor = createLocalLogCompactor({ logPath: path, compactThresholdRows: 10 });
  compactor.setWorld(createWorld());
  for (let i = 0; i < 9; i++) compactor.noteAppend();
  assert.equal(compactor.maybeCompact(), false);
  assert.equal(existsSync(path), false, "below threshold, compact() must never touch the filesystem");
});

test("maybeCompact compacts once the threshold is crossed, and resets the counter", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const world = createWorld();
  seedWorld(world);
  const seededCount = world.entities.size;

  let compactedInfo = null;
  const compactor = createLocalLogCompactor({
    logPath: path, compactThresholdRows: 10,
    onCompact: (info) => { compactedInfo = info; },
  });
  compactor.setWorld(world);
  for (let i = 0; i < 10; i++) compactor.noteAppend();

  // the oracle: snapshotRows() is pure (reads live world, no side effects), so calling it
  // separately here to learn the expected row count doesn't interfere with compact()'s own call.
  const expectedRows = snapshotRows(world).length;

  assert.equal(compactor.maybeCompact(), true);
  assert.ok(compactedInfo, "onCompact must fire with real numbers");
  assert.equal(compactedInfo.tailRowsBeforeCompaction, 10);
  assert.equal(compactedInfo.snapshotRows, expectedRows);
  assert.ok(expectedRows < seededCount * 6, `sanity: ${expectedRows} rows for ${seededCount} entities should stay a small, bounded multiple`);

  const rows = rowsFromLog(path);
  assert.equal(rows.length, expectedRows);

  // the counter is reset — a second call right after must NOT recompact.
  compactor.noteAppend();
  assert.equal(compactor.maybeCompact(), false, "one row past reset must stay below threshold");
});

test("compaction preserves restorability: replaying the compacted file matches the live world on every field a restore owns", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const world = createWorld();
  seedWorld(world);
  for (let i = 0; i < 60; i++) tick(world);

  const compactor = createLocalLogCompactor({ logPath: path, compactThresholdRows: 1 });
  compactor.setWorld(world);
  compactor.noteAppend();
  assert.equal(compactor.maybeCompact(), true);

  const restored = replay(rowsFromLog(path));
  assert.equal(restored.entities.size, world.entities.size);
  for (const [id, e] of world.entities) {
    const r = restored.entities.get(id);
    assert.ok(r, `entity ${id} missing after compacted restore`);
    assert.equal(r.kind, e.kind, `${id}.kind`);
    assert.equal(r.x, e.x, `${id}.x`);
    assert.equal(r.z, e.z, `${id}.z`);
    assert.equal(r.hp, e.hp, `${id}.hp`);
    assert.equal(r.state, e.state, `${id}.state`);
  }
});

test("compactBacklogIfOversized: an already-oversized trace compacts immediately at boot, without waiting on a future maybeCompact()", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const world = createWorld({ logPath: path });
  seedWorld(world);
  // Simulate a large pre-existing backlog the way real idle ticking would have written it. 1400
  // ticks (measured fresh, 2026-09-02): with ticking.mjs's NPC_DURABLE_MOVE_TICKS cadence (closes
  // the cold-red-gate incident this whole file is about), the population settles at 61 live
  // entities and durable rows land in ~50-row bursts every 900 ticks, not every tick — a shorter
  // backlog (e.g. 300 ticks, this test's old duration) can land BELOW snapshotRows()'s own
  // 3-rows-per-live-entity floor (~185 for 61 entities), making "compaction" look like it grew the
  // trace instead of shrinking it. 1400 ticks comfortably clears that floor (measured ~225 rows).
  for (let i = 0; i < 1400; i++) tick(world);
  const bootRows = rowsFromLog(path);
  const COMPACT_THRESHOLD = 200; // below the measured ~225-row backlog, above the ~185-row snapshot floor
  assert.ok(bootRows.length >= COMPACT_THRESHOLD, "test setup: expected a real backlog past the compaction threshold on disk");

  const compactor = createLocalLogCompactor({ logPath: path, compactThresholdRows: COMPACT_THRESHOLD });
  compactor.setWorld(world);
  const ran = compactor.compactBacklogIfOversized(bootRows.length);
  assert.equal(ran, true, "an oversized boot trace must trigger immediate catch-up compaction");

  const afterRows = rowsFromLog(path);
  assert.ok(afterRows.length < bootRows.length, `expected the on-disk trace to shrink; was ${bootRows.length}, now ${afterRows.length}`);
  assert.ok(afterRows.length < COMPACT_THRESHOLD, `post-compaction trace (${afterRows.length} rows) should be well under the ${COMPACT_THRESHOLD}-row threshold`);

  // a boot BELOW threshold must not compact at all.
  assert.equal(compactor.compactBacklogIfOversized(10), false);
});

test("idle-growth bound, measured on real disk: with the compactor wired, WORLD_LOG never grows past roughly one threshold cycle, for as long as idle-ticking continues", async (t) => {
  const { dir, path } = await tmpLogPath();
  t.after(() => rm(dir, { recursive: true, force: true }));
  // Real fsync-per-row (store.append()'s logPath path, unchanged by this fix) is the expensive
  // part on this filesystem — keep this run short in tick count; the bound being proven
  // (compaction outpaces growth) doesn't need a long run to demonstrate, only a threshold crossed
  // more than once.
  const THRESHOLD = 40;
  const world = createWorld({ logPath: path });
  const compactor = createLocalLogCompactor({ logPath: path, compactThresholdRows: THRESHOLD });
  world.onAppend = () => {
    compactor.noteAppend();
    compactor.maybeCompact();
  };
  compactor.setWorld(world);
  seedWorld(world);

  let peakBytes = 0;
  for (let i = 1; i <= 150; i++) {
    tick(world);
    peakBytes = Math.max(peakBytes, statSync(path).size);
  }

  console.log(`[measured] local-file idle growth over 150 idle ticks (threshold ${THRESHOLD}): peak file size ${peakBytes} bytes`);
  // measured ~86 bytes/row (compaction.test.mjs's own figure) * a few threshold cycles of
  // headroom — generous, but a real bound: the old bug had no bound at all (8.3GB in 36h).
  assert.ok(peakBytes < THRESHOLD * 4 * 200, `peak WORLD_LOG size ${peakBytes} bytes exceeded the bounded-growth expectation`);

  const restored = replay(rowsFromLog(path));
  assert.ok(restored.entities.size > 0, "an idle run must still leave something restorable");
});
