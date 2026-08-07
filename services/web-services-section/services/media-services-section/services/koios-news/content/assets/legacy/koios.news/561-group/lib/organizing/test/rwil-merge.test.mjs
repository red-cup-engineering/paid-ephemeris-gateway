/**
 * RWIL ⇄ WMAP at scale-2 — mergeActivities IS the log's bulk merge.
 *
 * Completes the scale-1 proof (animating/test/rwil-outbox-iso.test.mjs) at S2S: the
 * real federation CRDT `mergeActivities` dedups Activities by exactly the
 * (who, polarity, what) STANDING partition — the same partition the witness log's
 * state projection collapses to. So merging camps' outboxes and folding the union
 * witness log agree at the bulk (the merge-square, bound here to the real CRDT rather
 * than to `standingKey` as a spec).
 *
 * Scope: the correspondence holds on the canonical {Create, Undo} outbox form — the
 * exact wire `activityFromCell` / the outbox leg emit. `mergeKey` keys on the literal
 * AS2 `type`, so a `Delete` (also a denial) or an `Announce` (also an assertion) would
 * split a standing; those are deliberately out of scope, as in the scale-1 iso.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { activityCell, standingKey, answer, ACTIVITYSTREAMS_CONTEXT } from "@emsenn/animating";
import { mergeActivities } from "../dist/index.mjs";

const create = (actor, claim) => ({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Create", actor, object: { type: "Note", content: claim } });
const undo = (actor, claim) => ({ "@context": ACTIVITYSTREAMS_CONTEXT, type: "Undo", actor, object: { type: "Note", content: claim } });

const SOL = "https://561.group/agents/sol";
const LUNA = "https://561.group/agents/luna";

const keysOf = (collection) => collection.orderedItems.map((a) => standingKey(activityCell(a)));
const standingSet = (collection) => new Set(keysOf(collection));

// ── the merge-square, bound to the real CRDT: mergeActivities dedups by STANDING ──
test("mergeActivities dedups Activities by exactly the (who, polarity, what) standing", () => {
  const north = [create(SOL, "the-sky|blue"), create(LUNA, "the-sea|deep")];
  const south = [create(SOL, "the-sky|blue"), undo(LUNA, "the-sea|deep"), create(SOL, "pi|three")];
  const inputs = [...north, ...south];

  const merged = mergeActivities(north, south);
  const inputStandings = new Set(inputs.map((a) => standingKey(activityCell(a))));
  const outKeys = keysOf(merged);

  assert.deepEqual(standingSet(merged), inputStandings, "merged standings = the union's distinct standings");
  assert.equal(merged.totalItems, inputStandings.size, "one Activity per standing — no more, no less");
  assert.equal(outKeys.length, new Set(outKeys).size, "no standing appears twice in the merged collection");
});

// ── the CRDT laws (socializing's ∨_k join): idempotent, commutative, associative ──
test("mergeActivities is a grow-only-set join: idempotent / commutative / associative", () => {
  const a = [create(SOL, "a|1"), undo(SOL, "a|1")];
  const b = [create(LUNA, "b|2")];
  const c = [create(SOL, "a|1"), create(LUNA, "c|3")];

  // idempotent: merging a collection with itself adds nothing
  assert.deepEqual(standingSet(mergeActivities(a, a)), standingSet(mergeActivities(a)), "idempotent");

  // commutative: order of operands does not change the merged standing set
  assert.deepEqual(standingSet(mergeActivities(a, b)), standingSet(mergeActivities(b, a)), "commutative");

  // associative: regrouping does not change the merged standing set
  const left = mergeActivities(mergeActivities(a, b).orderedItems, c);
  const right = mergeActivities(a, mergeActivities(b, c).orderedItems);
  assert.deepEqual(standingSet(left), standingSet(right), "associative");
});

// ── ⊤-preservation across the federation: assert + Undo are BOTH retained ──
test("mergeActivities holds a cross-camp contradiction as ⊤ (no witness dropped)", () => {
  const claim = "the-sky|blue";
  const camp1 = [create(SOL, claim)];
  const camp2 = [undo(SOL, claim)];

  const merged = mergeActivities(camp1, camp2);
  assert.equal(merged.totalItems, 2, "assert and its Undo are DISTINCT standings — both kept");
  assert.equal(answer(merged.orderedItems, claim), "stable", "the across face reads the merged collection as ⊤");
});
