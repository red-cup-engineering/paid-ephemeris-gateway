// compaction — closes the 2026-08-19 deploy runbook's Aletheon OOM finding at the root: the
// bucket-mode tail (log-store.mjs) used to grow strictly, unboundedly, forever (base + addition,
// every flush, no truncation) — the exact shape that made a fresh 38-entity seed reach 96,014
// rows / 8.28MB in ~19 minutes of ordinary idle-ticking traffic and OOM-kill the 256MiB container
// five times in an eleven-minute window. This file proves, with real measured numbers (not
// estimates) against the fake-GCS double, that wiring `snapshot.mjs`'s compaction into
// `log-store.mjs`'s flush() actually bounds that growth — before/after, honestly.

import assert from "node:assert/strict";
import { test } from "node:test";
import { openBucketLogStore } from "../server/world/log-store.mjs";
import { startFakeGcs } from "./helpers/fake-gcs.mjs";
import { createWorld } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tick } from "../server/world/ticking.mjs";

const unauthenticatedRequest = (url, init) => fetch(url, init);

// getRawObjectText — reads a bucket object through the SAME real HTTP surface gcs-client.mjs
// itself calls (no reach-into-test-internals shortcut), so what this measures is exactly what a
// real GCS read of the tail object would return: "" if the object was truncated to empty, "" too
// if it never existed, its current bytes otherwise.
async function getRawObjectText(fake, bucket, name) {
  const res = await fetch(`${fake.url}/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}?alt=media`);
  if (res.status === 404) return "";
  if (!res.ok) throw new Error(`fake-gcs: unexpected status ${res.status} reading ${name}`);
  return res.text();
}

// runIdleTicks — the exact shape the production incident was: a seeded world, zero player input,
// left to tick. Every N ticks it flushes (the autosave cadence), mirroring aletheon-server.mjs's
// own `setInterval(() => bucketStore.flush(), AUTOSAVE_MS)`. Returns per-flush samples of REAL
// measured tail size (a real read of the real tail object, not an estimate) so both "before" and
// "after" runs measure the exact same thing the same way.
async function runIdleTicks(store, world, { ticks, flushEveryTicks, fake, bucket, tailObjectName }) {
  const samples = [];
  for (let i = 1; i <= ticks; i++) {
    tick(world);
    if (i % flushEveryTicks === 0) {
      await store.flush();
      const text = await getRawObjectText(fake, bucket, tailObjectName);
      const rows = text.split("\n").filter((l) => l.trim()).length;
      const bytes = Buffer.byteLength(text, "utf8");
      samples.push({ tick: i, tailRows: rows, tailBytes: bytes });
    }
  }
  return samples;
}

test("idle-growth bound, measured: WITHOUT compaction the tail never shrinks and keeps climbing over a long idle run (the original bug, reproduced honestly)", async (t) => {
  const fake = await startFakeGcs("idle-no-compaction");
  t.after(() => fake.close());
  const store = openBucketLogStore({ kind: "bucket", bucket: "idle-no-compaction", object: "w.jsonl" }, {
    gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest },
    // no getWorld attached at all — compaction is provably inert without it (see log-store.mjs's
    // own header), which is exactly the pre-fix behavior this test reproduces on purpose.
  });
  const world = createWorld({ onAppend: (r) => store.appendRow(r) });
  seedWorld(world);

  // 3600 ticks (240s sim time), sampled every 300: with ticking.mjs's NPC_DURABLE_MOVE_TICKS
  // cadence (60s, the 2026-09-02 cold-red-gate fix), growth is no longer smooth/every-tick — it
  // steps by ~50 rows every 900 ticks as NPCs cross their own durability window, then plateaus.
  // The window here is long enough to observe several real steps (measured fresh: t300=175 ...
  // t3600=325), so this still proves the real claim — an uncompacted tail never shrinks and has no
  // ceiling — without asserting the now-false "grows every single 100-tick sample" shape.
  const samples = await runIdleTicks(store, world, { ticks: 3600, flushEveryTicks: 300, fake, bucket: "idle-no-compaction", tailObjectName: "w.jsonl" });

  console.log(`[measured] no-compaction idle growth: ${samples.map((s) => `t${s.tick}=${s.tailRows}rows/${s.tailBytes}B`).join(", ")}`);

  for (let i = 1; i < samples.length; i++) {
    assert.ok(
      samples[i].tailRows >= samples[i - 1].tailRows,
      `expected a non-decreasing tail without compaction (sample ${i - 1} -> ${i}): ${samples[i - 1].tailRows} -> ${samples[i].tailRows}`,
    );
  }
  assert.ok(samples.at(-1).tailRows > samples[0].tailRows, "a long idle run without compaction should show real net growth, not a one-time burst that then plateaus forever");
  assert.ok(samples.at(-1).tailRows > 300, "3600 idle ticks of NPC wander/hunt + repopulation should file well over 300 uncompacted rows");
});

test("idle-growth bound, measured: WITH compaction the tail never exceeds the threshold band, for as long as idle-ticking continues", async (t) => {
  const fake = await startFakeGcs("idle-with-compaction");
  t.after(() => fake.close());
  // THRESHOLD and run length sized relative to ticking.mjs's NPC_DURABLE_MOVE_TICKS cadence (60s
  // = 900 ticks, the 2026-09-02 cold-red-gate fix — durable "moved" rows now land in ~50-row
  // bursts every 900 ticks, not every tick), so the run actually shows several genuine
  // grow-then-truncate cycles: measured fresh, threshold 60 over 3600 ticks (100-tick flushes)
  // yields 3 real compactions, worst observed tail 57 rows.
  const THRESHOLD = 60;
  let onCompactCalls = 0;
  const store = openBucketLogStore({ kind: "bucket", bucket: "idle-with-compaction", object: "w.jsonl" }, {
    gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest },
    compactThresholdRows: THRESHOLD,
    onCompact: () => { onCompactCalls++; },
  });
  const world = createWorld({ onAppend: (r) => store.appendRow(r) });
  seedWorld(world);
  store.setWorld(() => world); // the one line of wiring that turns compaction on

  const samples = await runIdleTicks(store, world, { ticks: 3600, flushEveryTicks: 100, fake, bucket: "idle-with-compaction", tailObjectName: "w.jsonl" });

  console.log(`[measured] with-compaction idle growth (threshold ${THRESHOLD}): ${samples.map((s) => `t${s.tick}=${s.tailRows}`).join(", ")}`);
  console.log(`[measured] compactions triggered over 300 idle ticks (${samples.length} flushes): ${onCompactCalls}`);

  assert.ok(onCompactCalls > 1, "a run several multiples of the threshold long must trigger more than one real compaction cycle");
  assert.ok(onCompactCalls < samples.length, "compaction should NOT need to fire on every single flush at this threshold/cadence — some flushes should stay under threshold");

  // The load-bearing claim: no sample, at any point across a long idle run, ever sees a tail
  // bigger than one flush's worth of rows past the threshold — i.e. compaction genuinely
  // outpaces growth, not "eventually catches up after ballooning first."
  const worstTail = Math.max(...samples.map((s) => s.tailRows));
  assert.ok(
    worstTail < THRESHOLD * 2,
    `tail should never balloon past roughly one flush cycle beyond the ${THRESHOLD}-row threshold; worst observed was ${worstTail} rows`,
  );

  // And the bound holds at the END of a long run just as much as partway through — this is what
  // actually closes the OOM: an instance that stays warm/idle for a LONG time must not have its
  // tail grow without bound the way the original bug did.
  const lastFew = samples.slice(-5).map((s) => s.tailRows);
  assert.ok(
    Math.max(...lastFew) < THRESHOLD * 2,
    `late-run samples should also stay bounded, got ${JSON.stringify(lastFew)}`,
  );
});

test("memory ceiling: a long simulated idle run (3000 ticks, ~200s sim time) keeps the tail's peak byte size under a stated bound", async (t) => {
  const fake = await startFakeGcs("memory-ceiling");
  t.after(() => fake.close());
  const THRESHOLD = 200;
  const BOUND_BYTES = 64 * 1024; // stated bound: 64KiB tail, ~130x smaller than the 8.28MB incident figure
  const store = openBucketLogStore({ kind: "bucket", bucket: "memory-ceiling", object: "w.jsonl" }, {
    gcsClientOptions: { apiBase: fake.url, request: unauthenticatedRequest },
    compactThresholdRows: THRESHOLD,
  });
  const world = createWorld({ onAppend: (r) => store.appendRow(r) });
  seedWorld(world);
  store.setWorld(() => world);

  const samples = await runIdleTicks(store, world, { ticks: 3000, flushEveryTicks: 100, fake, bucket: "memory-ceiling", tailObjectName: "w.jsonl" });

  const peakBytes = Math.max(...samples.map((s) => s.tailBytes));
  const peakRows = Math.max(...samples.map((s) => s.tailRows));
  console.log(`[measured] memory ceiling over 3000 idle ticks: peak tail ${peakRows} rows / ${peakBytes} bytes (stated bound ${BOUND_BYTES} bytes)`);

  assert.ok(
    peakBytes < BOUND_BYTES,
    `peak tail size ${peakBytes} bytes exceeded the stated ${BOUND_BYTES}-byte bound over a 3000-tick idle run`,
  );

  // Restorability isn't sacrificed for the bound: snapshot+tail (loadRows()) must still produce a
  // populated, sane world at the end of this long idle run — the whole point is durability
  // survives, not just "the tail is small because nothing gets saved."
  const rows = await store.loadRows();
  assert.ok(rows.length > 0, "a long idle run must still leave something restorable");
  const { replay } = await import("../server/world/store.mjs");
  const restored = replay(rows);
  assert.equal(restored.entities.size, world.entities.size, "restored population must match the live world after a long idle+compacted run");
});
