// Theorem-shaped tests for socializing's OSTROM capabilities — the IAD rule-grid, graduated
// sanctions (a bilattice ≤_t descent), polycentric nesting (graph Laplacian + sheaf H¹), and the
// eight design principles for an enduring commons. Run against dist.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  iadGrid,
  graduatedSanction,
  polycentricCoherence,
  centerCharges,
  ostromDiagnostic,
} from "../dist/index.mjs";

test("the IAD GRID censuses rules-in-use across the 7 types × 3 levels (Z/7 × Z/3 grading)", () => {
  const grid = iadGrid([
    { ruleType: "boundary", level: "constitutional" },
    { ruleType: "payoff", level: "operational" },
    { ruleType: "payoff", level: "operational" },
    { ruleType: "aggregation", level: "collective-choice" },
  ]);
  assert.equal(grid.populated, 3, "three distinct (type, level) cells are populated");
  assert.equal(grid.cells["payoff:operational"], 2);
  assert.equal(grid.byType.payoff, 2);
  assert.equal(grid.byLevel["collective-choice"], 1);
  assert.equal(grid.byLevel.operational, 2);
});

test("GRADUATED SANCTIONS escalate by a monotone ≤_t DESCENT — never a binary jump to removal", () => {
  const ladder = ["warning", "reparation", "suspend-power", "remove"];
  // good standing before any violation.
  assert.equal(graduatedSanction(ladder, 0).standing, "potential");
  assert.equal(graduatedSanction(ladder, 0).removed, false);
  // an intermediate violation DIMINISHES standing (descends ≤_t to ⊥), but does not remove.
  const mid = graduatedSanction(ladder, 2);
  assert.equal(mid.rung, 2);
  assert.equal(mid.label, "reparation");
  assert.equal(mid.standing, "absurd", "diminished — descended toward the truth-order bottom, not yet removed");
  assert.equal(mid.removed, false);
  // only at the TOP rung does the standing reach f (removal).
  const top = graduatedSanction(ladder, 4);
  assert.equal(top.label, "remove");
  assert.equal(top.standing, "active");
  assert.equal(top.removed, true);
  // violations beyond the ladder clamp at the top.
  assert.deepEqual(graduatedSanction(ladder, 9).rung, 4);
});

test("POLYCENTRICITY: plural centers that connect into one cluster and glue COHERE robustly", () => {
  // three agreeing centers over a complete graph → one cluster (H⁰=1), H¹=0, redundant trees.
  const agreeing = polycentricCoherence(centerCharges(["potential", "potential", "potential"]));
  assert.equal(agreeing.polycentric, true);
  assert.equal(agreeing.clusters, 1, "the centers connect into a single nested system");
  assert.equal(agreeing.obstruction, 0);
  assert.equal(agreeing.robust, true, "overlapping jurisdictions give redundant agreement paths");
  assert.equal(agreeing.coheres, true);

  // a single center is monocentric — not polycentric, does not cohere as nested enterprises.
  const monocentric = polycentricCoherence(centerCharges(["potential"]));
  assert.equal(monocentric.polycentric, false);
  assert.equal(monocentric.coheres, false);

  // two opposed centers fragment into separate clusters — they do not cohere into one commons.
  const fragmented = polycentricCoherence(centerCharges(["potential", "active"]));
  assert.equal(fragmented.clusters, 2, "opposition splits the agreement graph");
  assert.equal(fragmented.coheres, false);
});

test("the EIGHT DESIGN PRINCIPLES diagnose an enduring commons (all 8) vs a deficient one", () => {
  const enduring = ostromDiagnostic({
    rules: [
      { ruleType: "boundary", level: "constitutional" },     // P1
      { ruleType: "payoff", level: "operational" },          // P2 (with scope)
      { ruleType: "scope", level: "operational" },           // P2
      { ruleType: "aggregation", level: "collective-choice" }, // P3
      { ruleType: "information", level: "operational" },     // P4 monitoring
    ],
    relations: [],
    sanctionLadder: ["warning", "reparation", "remove"],     // P5 (depth > 1)
    polycentricity: polycentricCoherence(centerCharges(["potential", "potential", "potential"])), // P8
    conflictResolution: true,                                // P6
    externallyRecognized: true,                              // P7
  });
  assert.equal(enduring.satisfied, 8);
  assert.equal(enduring.enduring, true, "all eight principles hold — an enduring commons profile");

  // strip monitoring, graduated sanctions, and nesting → a deficient institution.
  const deficient = ostromDiagnostic({
    rules: [{ ruleType: "boundary", level: "operational" }],
    relations: [],
    sanctionLadder: ["remove"],                              // binary, not graduated → P5 fails
    polycentricity: polycentricCoherence(centerCharges(["potential"])), // monocentric → P8 fails
    conflictResolution: false,
    externallyRecognized: false,
  });
  assert.equal(deficient.clearBoundaries, true);
  assert.equal(deficient.graduatedSanctions, false);
  assert.equal(deficient.monitoring, false);
  assert.equal(deficient.nestedEnterprises, false);
  assert.ok(deficient.satisfied < 8);
  assert.equal(deficient.enduring, false);
});

test("monitoring is detected from an explicit monitoring DUTY relation, not only information rules", () => {
  const d = ostromDiagnostic({
    rules: [{ ruleType: "boundary", level: "operational" }],
    relations: [{ kind: "duty", active: "warden", passive: "council", scope: "monitor:harvest", standing: "potential" }],
    sanctionLadder: ["warn", "remove"],
    polycentricity: polycentricCoherence(centerCharges(["potential", "potential"])),
    conflictResolution: true,
    externallyRecognized: true,
  });
  assert.equal(d.monitoring, true, "a duty scoped `monitor:*` satisfies the monitoring principle");
});
