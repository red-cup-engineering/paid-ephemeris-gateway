// Theorem-shaped tests for the affect/genre first cut: Tomkins' affect read off a chronicle's
// stimulation gradient, and genre = behaviour × affect-arc with Berlant's impasse. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import { playAffect, genre } from "../dist/index.mjs";

// minimal actions: only `variety` and `ramification.length` are read by these readings.
const move = (variety, branches) => ({ variety, ramification: Array.from({ length: branches }, (_, i) => i), locus: {} });
const daimon = () => ({ variety: "daimon", ramification: [], locus: {} });
const chron = (...actions) => ({ kind: "game.chronicle", actions });

// ── playAffect (Tomkins gradient) ──

test("AFFECT is read off the stimulation GRADIENT, not the outcome (Tomkins)", () => {
  // steep build → fear.
  assert.equal(playAffect(chron(move("positive", 1), move("negative", 2), move("positive", 3))).dominant, "fear");
  // moderate build → interest.
  assert.equal(playAffect(chron(move("positive", 1), move("negative", 2))).dominant, "interest");
  // a give-up (Daimon) → shame, whatever the build.
  const surrendered = playAffect(chron(move("positive", 1), move("negative", 2), daimon()));
  assert.equal(surrendered.dominant, "shame");
  assert.equal(surrendered.surrender, true);
  // max stimulation at the onset that then falls → surprise.
  assert.equal(playAffect(chron(move("positive", 3), move("negative", 0))).dominant, "surprise");
  // sustained high with no relief → anger; sustained moderate → distress; smooth low → enjoyment.
  assert.equal(playAffect(chron(move("positive", 2), move("negative", 2))).dominant, "anger");
  assert.equal(playAffect(chron(move("positive", 1), move("negative", 1))).dominant, "distress");
  assert.equal(playAffect(chron(move("positive", 0))).dominant, "enjoyment");
});

test("AFFECT valence and profile are exposed", () => {
  const a = playAffect(chron(move("positive", 1), move("negative", 2), move("positive", 3)));
  assert.equal(a.valence, "negative", "fear is negative");
  assert.equal(a.onset, 1);
  assert.equal(a.peak, 3);
  assert.equal(a.buildup, 2);
  assert.equal(playAffect(chron(move("positive", 1), move("negative", 2))).valence, "positive", "interest is positive");
});

// ── genre (behaviour × affect-arc + impasse) ──

test("IMPASSE (Berlant): a genre whose every play only ever GIVES UP — neither win nor leave", () => {
  // three sanctioned plays, all ending in a Daimon: no play resolves.
  const stuck = genre([
    chron(move("positive", 1), daimon()),
    chron(move("positive", 2), move("negative", 1), daimon()),
    chron(daimon()),
  ]);
  assert.equal(stuck.plays, 3);
  assert.equal(stuck.resolving, 0);
  assert.equal(stuck.surrenders, 3);
  assert.equal(stuck.impasse, true, "cruel optimism: keep playing, never win, never leave");
});

test("a genre with a resolving play is NOT an impasse", () => {
  const g = genre([
    chron(move("positive", 1), daimon()),
    chron(move("positive", 1), move("negative", 0)), // ends at a leaf — resolves
  ]);
  assert.equal(g.resolving, 1);
  assert.equal(g.impasse, false);
});

test("the AFFECT-ARC moves: an exemplar that builds interest then collapses to shame", () => {
  // the longest play is the exemplar; its opening half reads interest, its closing half a give-up = shame.
  const g = genre([
    chron(move("positive", 1), move("negative", 2), daimon()),
  ]);
  assert.equal(g.arc.opening, "interest");
  assert.equal(g.arc.closing, "shame");
  assert.equal(g.arc.moves, true, "the genre takes its players somewhere affectively");
});

test("the empty genre is vacuous (no plays, no impasse)", () => {
  const g = genre([]);
  assert.equal(g.plays, 0);
  assert.equal(g.impasse, false);
  assert.equal(g.arc.moves, false);
});
