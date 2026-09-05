// log-store — the GCS-bucket-backed EAVT log. Aletheon's persistence design (store.mjs's own
// header comment) already says the quiet part: "The journal optionally streams to <root>.jsonl
// so a crashed world replays from disk." Local disk works for a single long-running dev process
// but not for Cloud Run, whose filesystem is wiped on every scale-to-zero and never shared across
// concurrent instances (the same shape the ruinfold/Farstone precedents in this estate's own
// deploy-runbook already solved with a GCS bucket, owner decision "data in buckets"). This module
// is that same decision applied to Aletheon's own persistence shape — an append-only trace,
// not a single mutable snapshot blob, so it works differently from Farstone's world-store.mts:
//
//   - LOCAL FILE mode (`WORLD_LOG` alone, no `ALETHEON_BUCKET`) is completely UNCHANGED by this
//     module's existence: store.mjs's own `logPath`/`eavtAppend`/`rowsFromLog` keep doing exactly
//     what they always did. This module is never even imported on that path.
//   - BUCKET mode (`ALETHEON_BUCKET` set) is genuinely new. A network write per EAVT row (the
//     tick loop appends many rows per second under real play) would stall the 15Hz tick — so
//     `appendRow()` only BUFFERS in memory; the caller (scripts/aletheon-server.mjs) calls
//     `flush()` on a periodic autosave timer and once more on shutdown. A flush is a conditional
//     REPLACE of the whole object — GET current text + generation, append the buffered lines,
//     PUT guarded by `ifGenerationMatch`, retried on 412 — the same read-modify-write shape
//     Farstone's world-store.mts uses for its single blob, just applied to a growing log instead
//     of a replaced snapshot. This is only a genuine multi-writer hazard if two Aletheon
//     instances tick the same world concurrently; the deploy pins a single instance (see the
//     deploy notes in ../../README.md) specifically so that never happens — the retry loop here
//     is a correctness backstop for the one real same-process race (an autosave overlapping the
//     shutdown-time final flush), not a substitute for that instance cap.

import { createGcsClient } from "@red-cup-engineering/footing/gcs-client";
import { snapshotRows, encodeSnapshotRows, iterJsonlRows, DEFAULT_COMPACT_THRESHOLD_ROWS } from "./snapshot.mjs";

const DEFAULT_BUCKET_OBJECT = "aletheon-world.jsonl";
const MAX_FLUSH_RETRIES = 20;

// bucketSnapshotObject — the compacted-state object name, derived from the tail/log object name
// (mirrors Farstone's clock-store.mts's own `bucketClockObject` derivation: one predictable
// sibling object name, not a second env var to configure). "foo.jsonl" -> "foo.snapshot.jsonl";
// anything else just gets ".snapshot" appended before the extension is preserved verbatim.
function bucketSnapshotObject(object) {
  return object.endsWith(".jsonl") ? `${object.slice(0, -".jsonl".length)}.snapshot.jsonl` : `${object}.snapshot.jsonl`;
}

// resolveLogBackend — read the two env vars into a concrete backend choice. `env` is injectable
// for tests. Mirrors Farstone's `resolveWorldBackend`: bucket wins if both are set, and `WORLD_LOG`
// becomes the OBJECT NAME within the bucket rather than a filesystem path in that case (the same
// "root means something different per backend" shape ruinfold's `resolveStoreRoot` documents).
export function resolveLogBackend(env = process.env) {
  const bucket = env.ALETHEON_BUCKET;
  if (bucket !== undefined && bucket !== "") {
    const object = env.WORLD_LOG !== undefined && env.WORLD_LOG !== "" ? env.WORLD_LOG : DEFAULT_BUCKET_OBJECT;
    return { kind: "bucket", bucket, object };
  }
  const path = env.WORLD_LOG;
  if (path !== undefined && path !== "") return { kind: "file", path };
  return { kind: "none" };
}

// openBucketLogStore — the bucket-mode store. `backend` must be `{kind:"bucket", bucket, object}`
// (from resolveLogBackend). `opts.gcsClientOptions` lets tests inject a fake `apiBase`/`request`
// (see tests/helpers/fake-gcs.mjs) instead of the real `storage.googleapis.com` + metadata server.
//
// SNAPSHOT + COMPACTION (closes the 2026-08-19 deploy runbook's Aletheon OOM finding — see
// snapshot.mjs's own header for the full incident numbers and the equivalence argument this
// depends on): the object this store writes on every flush (`object`, the "tail") is joined by a
// SECOND, sibling object (`bucketSnapshotObject(object)`, the "snapshot") holding the compacted
// row-set for every currently-live entity. `loadRows()` reads BOTH and concatenates
// snapshot-then-tail, so a fresh boot folds through the exact same `replay()` a full-log boot
// always used, just fed a smaller input. After a flush pushes the tail past
// `compactThresholdRows` (default `DEFAULT_COMPACT_THRESHOLD_ROWS`), and only if a live world is
// available via `opts.getWorld`/`setWorld()` (the caller must wire this — see
// scripts/aletheon-server.mjs), `compact()` writes a fresh snapshot from the live world and then
// truncates the tail to empty, in that order — fail-safe: if the process dies between the two
// writes, boot still replays the (larger than ideal, never wrong) full untruncated tail on top of
// the new snapshot; see the module header above for exactly why that's safe, not just currently
// lucky.
//
// BOOT-TIME CATCH-UP COMPACTION — 2026-08-20 live incident (root cause, confirmed in code, not
// just inferred from symptoms): the compaction check above lives ENTIRELY inside `flush()`,
// gated on `pending.length > 0`. That's fine in steady state (an actively-ticking world keeps
// `flush()` calls coming, so a tail that crosses the threshold gets compacted on the very next
// one) — but it has no path back for a tail that was ALREADY oversized before this process's
// first `flush()` ever ran. The live `aletheon-world.jsonl` was found at 179,920 rows / ~14.8MB,
// UNCHANGED across two full boots (06:06 and 06:30 UTC) — not because the compaction trigger
// (`tailRowCount >= compactThresholdRows`, `DEFAULT_COMPACT_THRESHOLD_ROWS = 2000`) was broken,
// and not because boot ignored an existing snapshot (`loadRows()` below already reads snapshot +
// tail correctly, snapshot-then-tail, exactly as documented) — but because BOTH instances almost
// certainly OOM-crashed (Aletheon logged its own "Memory limit of 256 MiB exceeded" at 06:12:11)
// while replaying that much history into a live world, before the 30s autosave timer ever got a
// chance to call `flush()` even once. `compactThresholdRows` is a fine steady-state cadence; it
// is not a rescue mechanism for a log that got large BEFORE this process started, because
// reaching it depends on the process surviving long enough to trigger it — which, for the
// scenario that most needs rescuing, is exactly the thing at risk.
//
// The fix: `compactBacklogIfOversized()` (below) — call it ONCE at boot, right after
// `setWorld()`, before the autosave timer starts (see scripts/aletheon-server.mjs). It uses the
// tail row count `loadRows()` already measured on ITS OWN pass (no second fetch, no second parse)
// to decide, with zero dependency on any future `flush()` ever happening: a process that boots
// against an oversized backlog compacts it down immediately, so every boot AFTER that one reads
// a small tail — self-healing in one cycle instead of never.
export function openBucketLogStore(backend, opts = {}) {
  // retry:true preserves this store's pre-footing default (footing's own default is opt-in-off).
  const client = createGcsClient({ bucket: backend.bucket, retry: true, ...opts.gcsClientOptions });
  const object = backend.object;
  const snapshotObject = bucketSnapshotObject(object);
  const describe = `gs://${backend.bucket}/${object}`;
  const compactThresholdRows = opts.compactThresholdRows ?? DEFAULT_COMPACT_THRESHOLD_ROWS;
  const onCompact = opts.onCompact ?? (() => {});
  let pending = [];
  let getWorld = normalizeWorldSource(opts.getWorld);
  // How many rows the TAIL object alone held, as measured by loadRows()'s own single parse pass
  // (excluding the snapshot's own rows) — see compactBacklogIfOversized() below.
  let lastTailRowCountAtLoad = 0;

  async function writeConditionally(name, text) {
    for (let attempt = 0; attempt < MAX_FLUSH_RETRIES; attempt++) {
      const current = await client.getObject(name);
      const precondition = current?.generation ?? "0";
      const result = await client.putObject(name, text, precondition);
      if (result.ok) return;
      if (attempt === MAX_FLUSH_RETRIES - 1) {
        throw new Error(`log-store: gcs write exhausted ${MAX_FLUSH_RETRIES} retries for gs://${backend.bucket}/${name} (sustained contention)`);
      }
      // 412 — another writer landed between our GET and our PUT. Loop: re-read the now-current
      // generation/text and retry against it.
    }
  }

  // compact — write the current live world as a compacted snapshot, THEN truncate the tail.
  // Never called with no world attached (flush() below guards that); errors propagate to the
  // caller, which logs loudly and simply leaves the (still-correct, just larger) tail as-is for
  // the next flush to try again — a failed compaction never rolls back or masks the tail write
  // that already landed earlier in the same flush().
  async function compact(tailRowsBeforeCompaction) {
    const world = getWorld();
    if (!world) return;
    const start = performance.now();
    const rows = snapshotRows(world);
    const snapshotText = encodeSnapshotRows(rows);
    await writeConditionally(snapshotObject, snapshotText);
    await writeConditionally(object, "");
    lastTailRowCountAtLoad = 0; // the tail this count described was just truncated to empty
    onCompact({
      tailRowsBeforeCompaction,
      snapshotRows: rows.length,
      snapshotBytes: Buffer.byteLength(snapshotText, "utf8"),
      durationMs: performance.now() - start,
    });
  }

  return {
    describe,
    snapshotDescribe: `gs://${backend.bucket}/${snapshotObject}`,

    // setWorld — attach the live world (or a `() => world` accessor, for wiring before the world
    // object exists) so flush() can compact against it. Without this, compaction never triggers —
    // the store degrades to exactly its pre-compaction, tail-only-and-growing behavior, which is
    // what every log-store test that doesn't call this exercises.
    setWorld(worldOrGetWorld) { getWorld = normalizeWorldSource(worldOrGetWorld); },

    // loadRows — the full trace as parsed {e,a,v,t} rows, oldest first: the compacted snapshot's
    // rows (if any) followed by the tail's rows (if any). [] if NEITHER object exists yet (a
    // fresh bucket — the caller then seeds a brand-new world, exactly like an absent/empty local
    // WORLD_LOG file always has).
    //
    // Built in ONE pass per source straight from `iterJsonlRows()` (snapshot.mjs) rather than the
    // old `[...snapRows, ...tailRows]` shape — that spread built THREE full arrays of parsed rows
    // at their simultaneous peak (a `snapRows` array, a `tailRows` array, then the concatenated
    // copy); this builds exactly one. Also captures `lastTailRowCountAtLoad` on the same pass, at
    // no extra parsing cost, for `compactBacklogIfOversized()` below.
    async loadRows() {
      const [snap, tail] = await Promise.all([client.getObject(snapshotObject), client.getObject(object)]);
      const rows = [];
      if (snap !== null) for (const r of iterJsonlRows(snap.text)) rows.push(r);
      let tailCount = 0;
      if (tail !== null) for (const r of iterJsonlRows(tail.text)) { rows.push(r); tailCount++; }
      lastTailRowCountAtLoad = tailCount;
      return rows;
    },

    // compactBacklogIfOversized — ONE-TIME boot-time catch-up compaction; see this module's own
    // "BOOT-TIME CATCH-UP COMPACTION" header section above for the full incident/root-cause
    // account. Must be called AFTER setWorld() (compact() is a no-op with no world attached — the
    // same guard flush()'s own compaction check already relies on) and is meant to be called once,
    // right after boot, before the autosave timer starts. Returns whether a compaction actually
    // ran, so the caller can log it accurately rather than assuming.
    async compactBacklogIfOversized() {
      if (lastTailRowCountAtLoad < compactThresholdRows) return false;
      if (!getWorld()) return false; // misuse guard: caller must setWorld() first — nothing to compact against yet
      await compact(lastTailRowCountAtLoad);
      return true;
    },

    // appendRow — buffer one row in memory. No network call (see module header for why).
    appendRow(row) { pending.push(row); },

    // pendingCount — for tests/observability: how many rows are buffered, unflushed.
    pendingCount() { return pending.length; },

    // flush — write every buffered row since the last flush. A no-op (and cheap) when nothing is
    // pending, so it's safe to call unconditionally on a timer. On failure, the batch is put back
    // onto the pending queue (nothing buffered is ever silently dropped) and the error rethrown —
    // the caller (the autosave timer / shutdown handler) decides whether to log-and-continue or
    // treat a failed final save as fatal. Once the tail write lands, a tail past
    // `compactThresholdRows` triggers `compact()` — a compaction failure is logged loudly here
    // and swallowed (not rethrown): the tail write above already succeeded and is already
    // durable, so a caller awaiting flush() should not see an unrelated compaction hiccup as its
    // own write having failed.
    async flush() {
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      let tailRowCount = 0;
      try {
        for (let attempt = 0; attempt < MAX_FLUSH_RETRIES; attempt++) {
          const current = await client.getObject(object);
          const precondition = current?.generation ?? "0";
          const base = current?.text ?? "";
          const addition = batch.map((r) => JSON.stringify(r)).join("\n") + "\n";
          const text = base + addition;
          const result = await client.putObject(object, text, precondition);
          if (result.ok) {
            // Count-only pass (iterJsonlRows, not parseJsonlRows) — a degraded tail that's
            // already large (the exact backlog scenario compactBacklogIfOversized() exists for)
            // shouldn't cost a full array-of-parsed-rows allocation just to learn its length.
            for (const _row of iterJsonlRows(text)) tailRowCount++;
            lastTailRowCountAtLoad = tailRowCount;
            break;
          }
          if (attempt === MAX_FLUSH_RETRIES - 1) {
            throw new Error(`log-store: gcs flush exhausted ${MAX_FLUSH_RETRIES} retries for ${describe} (sustained contention)`);
          }
          // 412 — another writer's flush landed between our GET and our PUT (see module header
          // for when this can genuinely happen with a single pinned instance). Loop: re-read the
          // now-current generation/text and retry our own append against it.
        }
      } catch (err) {
        pending = batch.concat(pending); // don't lose buffered rows on a failed flush
        throw err;
      }

      if (getWorld() && tailRowCount >= compactThresholdRows) {
        try {
          await compact(tailRowCount);
        } catch (err) {
          process.stderr.write(
            `log-store: compaction failed for ${describe} (${err instanceof Error ? err.message : String(err)}) — ` +
            `tail write already landed and is durable; will retry compaction on a later flush\n`,
          );
        }
      }
    },
  };
}

function normalizeWorldSource(worldOrGetWorld) {
  if (worldOrGetWorld === undefined || worldOrGetWorld === null) return () => null;
  return typeof worldOrGetWorld === "function" ? worldOrGetWorld : () => worldOrGetWorld;
}
