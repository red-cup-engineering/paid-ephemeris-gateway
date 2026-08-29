// snapshot — compacts a LIVE world into the MINIMUM set of EAVT rows (the same {e,a,v,t}
// vocabulary store.mjs's own append()/replay() already use — not a second, parallel format)
// that reconstructs the exact same folded state through the SAME replay() fold every full-log
// boot already uses. See ../../README.md's "World persistence: snapshot + compaction" section
// for the production motivation (2026-08-19 deploy runbook: an idle-ticking world's EAVT log
// grew from a fresh 38-entity seed to 96,014 rows / 8.28MB in about 19 minutes, and the 256MiB
// container OOM-killed five times in an eleven-minute window, each restart reloading an even
// larger log) and tests/snapshot-equivalence.test.mjs for the proof that snapshot+tail and
// full-log replay produce byte-identical folded state, not just "currently agree by luck".
//
// WHY THIS IS SAFE (provable from store.mjs's own replay(), not just tested to currently
// agree): replay()'s fold only ever reads six row kinds — "spawned", "moved", "vitality",
// "killed", "raised", "left". Every OTHER row type this tree ever appends ("settled", from
// settleEntity(); "minted", from mintItem()) is a complete no-op in that fold: after the
// `if (r.a === "spawned")` branch, replay() does `const e = world.entities.get(r.e); if (!e)
// continue;` and then only ever matches "moved"/"vitality"/"killed"/"raised"/"left" — anything
// else (an item id from "minted", or a "settled" row for an id that IS an entity) either finds
// no matching `world.entities` id (items were never spawned as entities) or simply isn't
// checked by the if/else chain, so it changes nothing. And within the six kinds that DO matter,
// only the LATEST "moved"/"vitality" row per entity and the identity-establishing "spawned" row
// are ever load-bearing for a currently-live entity — an entity's prior position/hp are
// overwritten by whichever row comes later in the fold, never re-read once superseded. So
// re-deriving one "spawned" + one "moved" + one "vitality" row (plus "killed"/"raised" if
// applicable) per CURRENTLY-LIVE entity, straight off the live world's own fields, reproduces
// exactly what folding the FULL historical row set would have left in world.entities — this
// isn't a new reconstruction path with its own correctness question, it's the existing one fed
// a smaller, provably-equivalent input.
//
// Entities that have already left the world (reaped corpses, explicit departures) are not
// re-emitted at all: dropping every one of their historical rows is exactly as correct as
// their own "left" row already made them in a full replay — absent either way, and a "left" row
// requires the entity to already exist in `world.entities` to have any effect (see replay()'s
// own `if (!e) continue` guard), so simply never spawning it in the compacted set reaches the
// identical end state without needing to carry a synthetic "left" row forward at all.
//
// Known, pre-existing, and UNCHANGED gap (not introduced by compaction): marks and inventory
// were never recorded on the trace at all (see persistence-replay.test.mjs's own "honest gap"
// test) — a snapshot can only compact what the trace already carries, so this gap is identical
// whether a boot replays the full historical log or a compacted snapshot+tail. Likewise
// `corpseUntil`/`diedTick` are never restored by replay() today (full-log replay included), so
// compaction introduces no NEW divergence there either — see the equivalence test for the exact
// field set this claim is checked against.

/** The compacted row-set for every entity currently in `world.entities`, as of `world.tick`. */
export function snapshotRows(world) {
  const rows = [];
  for (const e of world.entities.values()) {
    // t: e.bornTick (the entity's REAL original spawn tick, carried on the live entity since
    // store.spawn()/replay() both set it) — not world.tick — so a restored entity's bornTick
    // matches what a full-log replay would have produced from its true historical "spawned"
    // row, rather than reading as if it were spawned at snapshot time. See the equivalence test.
    rows.push({
      e: e.id,
      a: "spawned",
      v: { kind: e.kind, name: e.name, x: e.x, z: e.z, maxHp: e.maxHp, hostile: e.hostile },
      t: Number.isFinite(e.bornTick) ? e.bornTick : world.tick,
    });
    rows.push({ e: e.id, a: "moved", v: { x: e.x, y: e.y, z: e.z, yaw: e.yaw }, t: world.tick });
    rows.push({ e: e.id, a: "vitality", v: { hp: e.hp, maxHp: e.maxHp }, t: world.tick });
    if (e.killed) rows.push({ e: e.id, a: "killed", v: null, t: world.tick });
    if (e.raised) rows.push({ e: e.id, a: "raised", v: { hp: e.hp }, t: world.tick });
  }
  return rows;
}

// encodeSnapshotRows / decodeSnapshotRows — the on-the-wire jsonl encoding: one row per line,
// byte-identical in shape to how an ordinary trace object is already written/read (log-store.mjs's
// own flush()/parseJsonlRows, store.mjs's own eavtAppend/rowsFromLog) — a snapshot object is not a
// new file format, just a smaller instance of the one this tree already has.
export function encodeSnapshotRows(rows) {
  return rows.length === 0 ? "" : rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
}

// iterJsonlRows — parse a jsonl-encoded blob of {e,a,v,t} rows LAZILY, one at a time, via manual
// newline scanning rather than `text.split("\n")` (which would materialize every line of the
// text as its own string up front, before parsing has even started). Added 2026-08-20 for the
// live Aletheon OOM/no-compaction incident (see log-store.mjs's `compactBacklogIfOversized()`
// and its own header for the full root-cause account): the live `aletheon-world.jsonl` object
// was found at 179,920 rows / ~14.8MB, surviving two full boots unchanged. The dominant cost of
// folding that much history isn't the raw text (14.8MB is not itself a lot) — it's holding it
// AS AN ARRAY OF ~180K FULLY-PARSED ROW OBJECTS (each carrying its own nested `v`) at the same
// time `replay()`'s fold is also building up `world.entities`. This generator lets a caller
// (`log-store.mjs`'s `loadRows()`) build that array in ONE pass, from ONE source at a time,
// instead of the old shape (a separate `snapRows` array, a separate `tailRows` array, THEN a
// third spread-concatenated array `[...snapRows, ...tailRows]`) — up to three live arrays of
// parsed rows at their simultaneous peak, collapsed to one.
export function* iterJsonlRows(text) {
  if (!text) return;
  const len = text.length;
  let start = 0;
  while (start <= len) {
    let end = text.indexOf("\n", start);
    if (end === -1) end = len;
    const line = text.slice(start, end);
    if (line.trim()) {
      try { yield JSON.parse(line); } catch { /* tolerate a torn line, same discipline as the trace itself */ }
    }
    if (end === len) break;
    start = end + 1;
  }
}

export function decodeSnapshotRows(text) {
  return [...iterJsonlRows(text)];
}

// DEFAULT_COMPACT_THRESHOLD_ROWS — shared between the bucket-mode (log-store.mjs) and
// local-file-mode (local-log-compaction.mjs) compactors, so both backends compact on the same
// cadence by default. Justified from measured growth (see README + tests/compaction.test.mjs's
// own "idle-growth bound, measured" test for the live numbers this run produces):
//
//   The 2026-08-19 deploy runbook's live incident measured ~84 rows/sec sustained idle-ticking
//   growth (96,014 rows in ~19 minutes) — this tree's own tick emits up to one "moved" row per
//   live entity per 15Hz tick while any entity is wandering/hunting, which in practice is
//   effectively every tick once NPCs exist (ticking.mjs's wander/hunt behavior is domain logic,
//   deliberately left untouched by this fix — see snapshot.mjs's own module doc above for why
//   truncation, not emission-throttling, is the fix here).
//
//   2000 rows at the measured ~86 bytes/row average is ~172KB — at ~84 rows/sec that's roughly
//   one compaction every ~24 seconds of steady idle activity, which lands within a single
//   WORLD_AUTOSAVE_MS cycle (default 30s) in bucket mode, so the persisted tail object in
//   practice never grows past roughly this size regardless of how long the process stays idle —
//   compaction outpaces the inherent per-tick growth by construction, not by luck. 2000 was
//   chosen (not, say, 200 or 20000) to keep compaction frequent enough that the worst-case
//   OOM-triggering blowup (8+MB) can never accumulate, while staying coarse enough that a
//   typical low-traffic period doesn't compact on nearly every single flush.
export const DEFAULT_COMPACT_THRESHOLD_ROWS = 2000;
