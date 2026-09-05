// demon — the ENEMY, and the heart of the twist: a demon's VITALITY is the FOLD of an append-only
// trace, and between its first wound and its death it is HELD ⊤ — alive AND dead, a contradiction the
// substrate keeps rather than collapses. A demon is a subject (`demon:<id>`) in the same trace the
// arena rides. Its life is read over the `alive` predicate, four-valued:
//   t   — affirmed alive (spawned, unwounded): a hunting demon. It moves, it threatens.
//   ⊤   — alive AND denied: WOUNDED — you have landed deny-evidence but not yet enough to settle it.
//         This is the LAW as a mechanic: the monster you cannot trust, both quick and dying, rendered
//         with a contested tint. It STILL hunts (a wounded demon is not yet a corpse) but it is failing.
//   f   — denied alive: DEAD. Enough deny-evidence accreted that the fold settles to the negative face.
//         The demon falls; it no longer hunts.
//   ⊥   — no evidence (never spawned / unknown): not on the board.
//
// The KILL is a SETTLE, not a subtraction: a demon dies when the count of deny-witnesses on its `alive`
// cell reaches its `toughness`. Until then every wound is a witness KEPT (evidence linear — no hit is
// overwritten), and the demon reads ⊤. Pure over abrash's world: this module builds the spawn rows, the
// wound rows, reads the vitality, and computes the demon's chase step. No clock, no RNG.

import { predicate, deny, allRows, frontier, settleOpts, chargeOf, FOUR } from "@561-group/abrash/world";
import { v2 } from "@561-group/abrash/math";

export const VITAL = Object.freeze({ ALIVE: "t", WOUNDED: "top", DEAD: "f", ABSENT: "bot" });

// demonKey(id) — the trace subject for a demon. Its `alive` cell and its `at` position cell live here.
export const demonKey = (id) => `demon:${id}`;

// spawn(id, x, z, opts) — the rows that bring a demon onto the board: it is affirmed ALIVE, placed at a
// floating (x,z), and given a toughness (how many deny-witnesses settle it to dead). Returned as trace
// rows for the caller to admit (append-only). `toughness` is stored as a fact so it federates too.
export function spawn(id, x, z, opts = {}) {
  const s = demonKey(id);
  const toughness = opts.toughness ?? 3;
  const speed = opts.speed ?? 0.12;
  return [
    predicate(s, "alive", "demon", 1),
    predicate(s, "at", `${x},${z}`, 1),
    predicate(s, "toughness", String(toughness), 1),
    predicate(s, "speed", String(speed), 1),
  ];
}

// wound(id, t) — ONE shot's evidence: a deny on the demon's `alive` cell. The weapon's effect IS this
// row (combat.mjs decides whether a shot lands; this is what a landing shot APPENDS). Evidence linear:
// each wound is a distinct witness at its own time `t`, none overwriting another.
export function wound(id, t) {
  return deny(demonKey(id), "alive", "demon", t);
}

// move(id, x, z, t) — a position update for a chasing demon (functional `at`: latest-t wins). The
// position is the FUNCTIONAL face of the demon; only `alive` is held ⊤.
export function move(id, x, z, t) {
  return predicate(demonKey(id), "at", `${x},${z}`, t);
}

// ── reading a demon's settled state from the trace ──────────────────────────────────────────────
// `at` is functional (a demon is in one place — latest-t wins), but `alive` is NOT: it accretes both an
// affirm (spawn) and every deny (wound), so it can hold ⊤. The fold needs `alive`'s CONVERSE so a
// `not-alive` wound row folds INTO the `alive` cell as its negative face (else it would read as a
// separate predicate and never contradict). We extend abrash's converse map with alive<->not-alive.
const OPTS = settleOpts({
  converse: { "not-alive": "alive" },
  functional: new Set(["at", "toughness", "speed"]),
});

// objOf(cell) — the OBJECT value carried by a folded fiber cell (e.g. the toughness "3"). The fold keys
// a cell by (predicate,object), so for a single-valued functional fact the object IS the value.
function objOf(folded, predicate) {
  const cell = folded.fiber.find((c) => c.predicate === predicate);
  return cell ? cell.object : null;
}

// woundsOf(world, id) — how many deny-witnesses sit on the demon's `alive` cell. Counting witnesses is
// reading the linear evidence directly: every shot that landed is still here.
export function woundsOf(world, id) {
  const s = demonKey(id);
  let n = 0;
  for (const r of allRows(world)) {
    if (r.e === s && r.a === "not-alive") n++;
  }
  return n;
}

// vitalityOf(world, id) — the demon's four-valued life, read by FOLDING its `alive` cell. But a demon is
// only DEAD once its wounds reach its toughness: below that, the held ⊤ means WOUNDED (still hunting);
// at/above it, the negative face has won and we read f (DEAD). This is the settle: ⊤ collapses to f only
// when the evidence is sufficient. Returns { vital, wounds, toughness, alive } where `alive` is whether
// the demon still hunts (t OR ⊤ — wounded is not yet a corpse).
export function vitalityOf(world, id) {
  const s = demonKey(id);
  const folded = frontier(world, s, OPTS);
  const aliveCell = folded.fiber.find((c) => c.predicate === "alive");
  const toughStr = objOf(folded, "toughness");
  const toughness = toughStr != null ? Number(toughStr) : 3;
  const wounds = woundsOf(world, id);

  if (!aliveCell) return { vital: VITAL.ABSENT, wounds, toughness, alive: false };
  // chargeOf reads the FOLDED alive cell into one of the four charges. With the converse map above, a
  // spawn affirm + at least one wound deny fold to ⊤ (pos AND neg) — the held contradiction.
  const charge = chargeOf(aliveCell.value);

  // enough deny-evidence: the contradiction SETTLES to dead (f). The kill is a settle, not a subtract.
  if (wounds >= toughness) return { vital: VITAL.DEAD, wounds, toughness, alive: false };
  // ⊤: affirmed AND denied but not yet settled — WOUNDED, still hunting, the monster you can't trust.
  if (charge === FOUR.TOP) return { vital: VITAL.WOUNDED, wounds, toughness, alive: true };
  // t: affirmed only — a fresh, unwounded demon.
  if (charge === FOUR.T) return { vital: VITAL.ALIVE, wounds, toughness, alive: true };
  // f: denied only (no spawn affirm survived) — dead.
  if (charge === FOUR.F) return { vital: VITAL.DEAD, wounds, toughness, alive: false };
  return { vital: VITAL.ABSENT, wounds, toughness, alive: false };
}

// positionOf(world, id) — the demon's floating (x,z), read from its functional `at` cell (latest-t).
export function positionOf(world, id) {
  const folded = frontier(world, demonKey(id), OPTS);
  const v = objOf(folded, "at");
  if (!v) return null;
  const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(v);
  return m ? { x: Number(m[1]), z: Number(m[2]) } : null;
}

// speedOf(world, id) — the demon's chase speed, read from its functional `speed` cell.
export function speedOf(world, id) {
  const folded = frontier(world, demonKey(id), OPTS);
  const v = objOf(folded, "speed");
  return v != null ? Number(v) : 0.12;
}

// chaseStep(from, to, speed) — the unit-ish step a demon takes toward the player. Pure vector math over
// abrash's kernel: head straight for the player at `speed` cells/tick (collision is the caller's to run
// against the arena grid). Returns the demon's intended next (x,z).
export function chaseStep(from, to, speed) {
  const d = v2.normalize(v2.sub([to.x, to.z], [from.x, from.z]));
  return { x: from.x + d[0] * speed, z: from.z + d[1] * speed };
}

export { demonKey as keyOf };
