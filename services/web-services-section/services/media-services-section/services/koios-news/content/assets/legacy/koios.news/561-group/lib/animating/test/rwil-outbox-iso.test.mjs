/**
 * RWIL ⇄ WMAP — the outbox IS the log.
 *
 * Proof of the RWIL note's headline (cooler than WASM/ActivityPub): an agent's AS2
 * `outbox` and an EAVT witness `log` are two CHANNEL-CODES of one information source.
 * The claim is NOT "you can convert one format to the other" (that is just two
 * formats); it is that the conversion is a structure-preserving isomorphism — lossless
 * AND merge-commuting AND conflict-preserving — verified here against the REAL relating
 * ledger machinery (`appendWitnesses`, `projectStateView`) and the REAL across-face
 * reader (`answer`).
 *
 * The functor: F = activityCell (Activity → EAVT witness), G = activityFromCell.
 *
 * L1  round-trip / lossless channel:        G ∘ F = id on canonical activities.
 * L2  surprisal-dedup:                      a repeated witness is 0 bits (idempotent append).
 * L3  ⊤-preservation:                       assert + Undo is held as ⊤ on BOTH channels.
 * L4  the bulk merge-square + the seam:     state's distinct standings = the time-forgotten
 *                                           merge partition; the log is a strict time-refinement.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { activityCell, activityFromCell, standingKey, answer } from "../dist/index.mjs";
import { appendWitnesses, projectStateView } from "@emsenn/relating/ledger";
import { canonical } from "@emsenn/relating/writing";

// A canonical outbox activity, minted through G so it is exactly the wire form the
// agent's outbox leg emits (type ∈ {Create, Undo}, Note object, optional published).
const mk = (actor, claim, { deny = false, published } = {}) =>
  activityFromCell({ e: actor, a: claim, v: deny ? "deny" : "assert", t: published ?? "" });

const ACTOR = "https://dev.bare-cedar-fog.emsenn.net/agents/claude";
const tempRoots = [];
const tempStore = () => {
  const dir = mkdtempSync(join(tmpdir(), "rwil-iso-"));
  tempRoots.push(dir);
  return { logDir: dir, stateDir: dir, recordDir: dir };
};
test.after(() => { for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true }); });

// ── L1: the channel is lossless — G ∘ F = id (round-trip on canonical activities) ──
test("L1 round-trip: the outbox⇄log channel loses nothing (G ∘ F = id)", () => {
  const activities = [
    mk(ACTOR, "the-sky|blue"),
    mk(ACTOR, "the-sky|blue", { deny: true }),
    mk(ACTOR, "the-grass|green", { published: "2026-06-25T00:00:00Z" }),
    mk("https://other.example/agents/ada", "pi|three", { deny: true, published: "2026-01-01" }),
  ];
  for (const a of activities) {
    assert.deepEqual(activityFromCell(activityCell(a)), a, "an activity must survive the round trip through its witness");
  }
});

// ── L2: a repeated witness carries zero bits (surprisal law = the ledger's dedup) ──
test("L2 surprisal-dedup: re-witnessing the same act is 0 bits (idempotent append)", () => {
  const store = tempStore();
  const a = mk(ACTOR, "the-sky|blue", { published: "t1" });
  assert.equal(appendWitnesses(store, "outbox", [activityCell(a)]).appended, 1, "first witness is new information");
  assert.equal(appendWitnesses(store, "outbox", [activityCell(a)]).appended, 0, "the identical witness adds nothing");
});

// ── L3: conflict is held as ⊤ on BOTH channels (paraconsistent, no witness dropped) ──
test("L3 ⊤-preservation: assert + Undo is held as ⊤ on the outbox AND the log", () => {
  const claim = "the-sky|blue";
  const asserted = mk(ACTOR, claim);
  const undone = mk(ACTOR, claim, { deny: true });

  // WMAP channel: the across-face reader sees a held contradiction (knows-both = ⊤).
  assert.equal(answer([asserted, undone], claim), "stable", "the outbox reads assert+Undo as ⊤");

  // RWIL channel: with the claim non-functional, the state set accumulates BOTH polarities.
  const log = [activityCell(asserted), activityCell(undone)];
  const view = projectStateView(log, new Set()); // nothing functional ⇒ accumulate distinct values
  const entity = view[canonical(ACTOR)];
  assert.deepEqual([...entity[claim]].sort(), ["assert", "deny"], "the log holds both witnesses — ⊤, no drop");
});

// ── L4: the merge-square commutes at the bulk, and the time-seam is real ──
test("L4 bulk merge-square + seam: state's standings = the time-forgotten merge partition", () => {
  // Two acts identical in (who, polarity, what) but witnessed at DIFFERENT times.
  const a1 = mk(ACTOR, "x|y", { published: "t1" });
  const a2 = mk(ACTOR, "x|y", { published: "t2" });

  // SEAM — the log distinguishes them (eavtId carries time): both rows are new.
  const store = tempStore();
  const n1 = appendWitnesses(store, "f", [activityCell(a1)]).appended;
  const n2 = appendWitnesses(store, "f", [activityCell(a2)]).appended;
  assert.equal(n1 + n2, 2, "the log keeps time-distinct re-witnesses — it is the richer source");

  // …but their merge identity (time-forgotten) collapses to ONE standing.
  assert.equal(standingKey(activityCell(a1)), standingKey(activityCell(a2)), "merge forgets time");

  // SQUARE — over a mixed batch, the state projection's distinct standings equal exactly
  // the merge partition (organizing's mergeActivities dedup, specified by standingKey).
  const batch = [
    a1, a2,
    mk(ACTOR, "x|y", { deny: true }),
    mk(ACTOR, "the-sky|blue"),
    mk("https://other.example/agents/ada", "x|y"),
  ];
  const log = batch.map((a) => activityCell(a));
  const view = projectStateView(log, new Set());

  const standingsFromState = new Set();
  for (const [entityKey, attrs] of Object.entries(view)) {
    const entity = JSON.parse(entityKey);
    for (const [attribute, values] of Object.entries(attrs)) {
      for (const value of values) standingsFromState.add(`${entity}|${value}|${attribute}`);
    }
  }
  const standingsFromMerge = new Set(log.map(standingKey));

  assert.deepEqual(standingsFromState, standingsFromMerge, "the square commutes at the bulk: state ≅ merged outbox");
  assert.equal(standingsFromMerge.size, 4, "5 timed witnesses collapse to 4 standings (a1,a2 share one)");
});
