// Theorem-shaped tests for socializing's DECISION-RULE and META-GOVERNANCE capabilities — the
// modes a collective settles a decision by (consensus vs majority), the Hart/Ostrom stratification,
// Ashby's requisite variety, and Weber's authority bases. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  consensusClose,
  majorityClose,
  governingLevel,
  requisiteVariety,
  routinize,
} from "../dist/index.mjs";

test("CONSENSUS closure settles only when EVERY member aligns — silence is NOT consent", () => {
  assert.equal(consensusClose(["potential", "potential", "potential"]).settled, true, "unanimous → settled");

  // a single SILENT member (⊥) blocks: ⊥ ∧_t t = ⊥ (silence is not consent).
  const silent = consensusClose(["potential", "absurd", "potential"]);
  assert.equal(silent.settled, false);
  assert.equal(silent.value, "absurd", "the truth-meet drops to ⊥ on any silence");
  assert.equal(silent.silent, 1);

  // active DISSENT (f) blocks, and is recorded distinctly from silence.
  const dissent = consensusClose(["potential", "active"]);
  assert.equal(dissent.settled, false);
  assert.equal(dissent.value, "active", "the truth-meet drops to f on dissent");
  assert.equal(dissent.dissent, 1);
});

test("MAJORITY closure settles on a strict majority — collapsing the dissent/silence distinction", () => {
  // 2 of 3 align → majority settles, where consensus would NOT (the abstainer blocks consensus).
  const profile = ["potential", "potential", "absurd"];
  assert.equal(majorityClose(profile).settled, true, "2/3 > 1.5 → majority fires");
  assert.equal(consensusClose(profile).settled, false, "consensus does NOT — silence blocks");
  // a tie is not a strict majority.
  assert.equal(majorityClose(["potential", "active"]).settled, false, "1/2 is not a strict majority");
});

test("STRATIFICATION: a level-(n+1) act revises level-n apparatus (self-amendment lives one level up)", () => {
  assert.equal(governingLevel("operational"), "collective-choice", "operational rules are revised by collective-choice acts");
  assert.equal(governingLevel("collective-choice"), "constitutional");
  assert.equal(governingLevel("constitutional"), "constitutional", "the constitutional level is the top");
});

test("REQUISITE VARIETY: only variety absorbs variety (Ashby)", () => {
  assert.equal(requisiteVariety(5, 3).viable, true);
  const short = requisiteVariety(2, 6);
  assert.equal(short.viable, false, "fewer responses than disturbances cannot regulate");
  assert.equal(short.deficit, 4);
});

test("WEBER: charisma ROUTINIZES into a stable basis; stable bases routinize to themselves", () => {
  assert.equal(routinize("charismatic"), "rational-legal", "default routinization");
  assert.equal(routinize("charismatic", "traditional"), "traditional");
  assert.equal(routinize("traditional"), "traditional", "already stable");
  assert.equal(routinize("rational-legal"), "rational-legal");
});
