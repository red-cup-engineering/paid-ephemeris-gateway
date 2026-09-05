/**
 * The minimum EAVT row set that reconstructs the exact same folded state store.replay() already
 * produces from a full historical log — not a second, parallel format (see {@link encodeSnapshotRows}).
 *
 * Correctness argument: replay()'s fold only ever reads six row kinds ("spawned"/"moved"/
 * "vitality"/"killed"/"raised"/"left"); every other kind ("settled", "minted") is already a no-op
 * there. Within those six, only the LATEST "moved"/"vitality" row per entity and its "spawned" row
 * are ever load-bearing for a currently-live entity, so re-deriving one row of each (plus
 * "killed"/"raised" where applicable) per live entity, straight off the live world's own fields,
 * reproduces exactly what folding the full row history would have left in `world.entities`.
 * Departed entities (reaped corpses, explicit "left") are simply never re-emitted — as correct as
 * their own "left" row already made them (a "left" row is a no-op unless the entity still exists to
 * receive it). See tests/snapshot-equivalence.test.mjs for the proof that snapshot+tail and
 * full-log replay fold to byte-identical state, not just "currently agree by luck".
 *
 * Known, pre-existing, unchanged-by-compaction gaps: marks/inventory were never recorded on the
 * trace at all (see persistence-replay.test.mjs's own "honest gap" test); `corpseUntil`/`diedTick`
 * are never restored by replay() even from a full log.
 *
 * @param {object} world A live game world (server/world/store.mjs's `createWorld()` shape).
 * @returns {Array<{e: string, a: string, v: object|null, t: number}>} One "spawned"+"moved"+
 *   "vitality" row (plus "killed"/"raised" where applicable) per entity in `world.entities`.
 */
export function snapshotRows(world) {
  const rows = [];
  for (const e of world.entities.values()) {
    // bornTick, not world.tick: a restored entity's spawn tick must match its true history.
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

/**
 * Encode compacted rows as jsonl — one row per line, byte-identical in shape to how the ordinary
 * append-only trace is already written (log-store.mjs's flush(), store.mjs's eavtAppend); a
 * snapshot is a smaller instance of the one row format this tree already has, not a new one.
 * @param {Array<{e: string, a: string, v: *, t: number}>} rows
 * @returns {string} jsonl text, `""` for an empty row set.
 */
export function encodeSnapshotRows(rows) {
  return rows.length === 0 ? "" : rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
}

/**
 * Parse jsonl-encoded `{e,a,v,t}` rows lazily, one at a time, via manual newline scanning rather
 * than `text.split("\n")` (which would materialize every line as its own string before parsing
 * starts). Added for the 2026-08-20 Aletheon incident: a live trace at 179,920 rows/~14.8MB
 * survived two full boots unchanged because folding that many already-parsed row objects at once,
 * alongside `world.entities` also being built, was the dominant cost — not the raw text size. Lets
 * a caller (log-store.mjs's loadRows()) build its row array in one pass from one source, instead of
 * separate snapshot/tail arrays later spread-concatenated into a third.
 * @param {string} text jsonl-encoded rows.
 * @yields {{e: string, a: string, v: *, t: number}} One parsed row; a torn/blank line is skipped.
 */
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

/**
 * @param {string} text jsonl-encoded rows (see {@link encodeSnapshotRows}).
 * @returns {Array<{e: string, a: string, v: *, t: number}>} All rows, eagerly collected.
 */
export function decodeSnapshotRows(text) {
  return [...iterJsonlRows(text)];
}

/**
 * Rows-since-last-compaction threshold shared by both backends (log-store.mjs bucket mode,
 * local-log-compaction.mjs local-file mode) so they compact on the same default cadence.
 *
 * Sized from the 2026-08-19 deploy runbook incident: idle-ticking NPC "moved" rows grew a fresh
 * 38-entity seed to 96,014 rows / 8.28MB in ~19 minutes, OOM-killing the 256MiB Cloud Run container
 * five times in eleven minutes. Measured sustained growth (compaction.test.mjs's "idle-growth
 * bound" test) was ~84 rows/sec, ~86 bytes/row — 2000 rows is ~172KB, and a compaction at that size
 * lands within one default `WORLD_AUTOSAVE_MS` (30000ms) cycle, so the persisted tail never
 * re-accumulates toward the OOM size regardless of idle duration. Chosen over something smaller
 * (e.g. 200) to avoid compacting on nearly every flush during ordinary traffic, and over something
 * larger (e.g. 20000) to keep compaction fast enough to always outpace growth.
 *
 * Bucket-mode's compaction (the fix this constant was introduced for) intentionally never throttled
 * NPC move *emission* — it truncates whatever already landed on the trace, regardless of source.
 * The 2026-09-02 cold-red-gate incident (local-file mode, WORLD_LOG, no compaction ever wired for
 * that backend — closed by local-log-compaction.mjs) additionally exposed emission itself as worth
 * throttling: see ticking.mjs's `NPC_DURABLE_MOVE_TICKS`, which now durable-writes an NPC's
 * position at most once per 60s. This threshold stays the backstop for whatever still lands on the
 * trace (player movement every tick, real events) — the two fixes are complementary, not redundant.
 */
export const DEFAULT_COMPACT_THRESHOLD_ROWS = 2000;
