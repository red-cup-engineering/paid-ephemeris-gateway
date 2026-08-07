// Theorem-shaped tests for the Caillois quadrant: agon/alea/mimicry/ilinx as disposition (mastery vs
// surrender) × orientation (outcome vs make-believe), read off a chronicle. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import { caillois } from "../dist/index.mjs";

const move = (variety, branches) => ({ variety, ramification: Array.from({ length: branches }, (_, i) => i), locus: {} });
const daimon = () => ({ variety: "daimon", ramification: [], locus: {} });
const chron = (...actions) => ({ kind: "game.chronicle", actions });

test("AGON = mastery × outcome — skilled choices resolving to a result", () => {
  // every move opens a genuine choice (ramification ≥ 2); the play resolves at a leaf.
  const r = caillois(chron(move("positive", 2), move("negative", 3), move("positive", 0)));
  assert.equal(r.disposition, "mastery");
  assert.equal(r.orientation, "outcome");
  assert.equal(r.dominant, "agon");
});

test("ALEA = surrender × outcome — carried by forced moves to a determined result", () => {
  // forced single lines (ramification ≤ 1): no real choice, yet it resolves.
  const r = caillois(chron(move("positive", 1), move("negative", 1), move("positive", 0)));
  assert.equal(r.disposition, "surrender");
  assert.equal(r.orientation, "outcome");
  assert.equal(r.dominant, "alea");
});

test("MIMICRY = mastery × make-believe — active choices, the real suspended (gives up, no result)", () => {
  // genuine choices, but the play does not resolve — it ends in a give-up (performance, not winning).
  const r = caillois(chron(move("positive", 2), move("negative", 3), daimon()));
  assert.equal(r.disposition, "mastery");
  assert.equal(r.orientation, "make-believe");
  assert.equal(r.dominant, "mimicry");
});

test("ILINX = surrender × make-believe — carried AND no result: the play that unmakes the player", () => {
  const r = caillois(chron(move("positive", 1), move("negative", 0), daimon()));
  assert.equal(r.disposition, "surrender");
  assert.equal(r.orientation, "make-believe");
  assert.equal(r.dominant, "ilinx");
});

test("decision density is the disposition axis (the will to mastery)", () => {
  // 1 of 2 player-side decisions is a genuine choice → density ½ → mastery (boundary).
  const r = caillois(chron(move("positive", 2), move("negative", 1), move("positive", 0)));
  // non-daimon actions: branches 2,1,0 → choices(>=2)=1 of 3 → density 1/3 → surrender.
  assert.ok(Math.abs(r.decisionDensity - 1 / 3) < 1e-9);
  assert.equal(r.disposition, "surrender");
});
