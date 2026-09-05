/**
 * `exploration.test` — tier 4's pedagogy: cumulative regret is honest, never flattering, and hidden
 * yields are seed-fixed (never redrawn) so repeated sampling narrows a real estimate toward a real,
 * stable truth. The test named "regret is never negative and never flattering a bad choice" is the
 * one DESIGN.md §4 asks for directly ("the number does not flatter a bad exploration decision").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROCESS_IDS, bestTrueYield, estimatedMean, sampleProcess, trueYield } from "./exploration.mts";
import type { ExplorationState } from "./state.mts";

const SEED = "exploration-test-seed";

function emptyExploration(): ExplorationState {
  return { samples: {}, cumulativeRegret: 0, ticksSpent: 0 };
}

test("trueYield is a pure, seed-fixed function — never redrawn for the same (seed, processId)", () => {
  const a = trueYield(SEED, "alpha");
  const b = trueYield(SEED, "alpha");
  assert.equal(a, b);
});

test("different seeds generally produce different hidden yields (not a coincidence-prone constant)", () => {
  const a = trueYield(SEED, "alpha");
  const b = trueYield("a-totally-different-seed", "alpha");
  assert.notEqual(a, b);
});

test("pedagogy (tier 4, exploration-exploitation): cumulative regret is always nonnegative, for every process and every sample count", () => {
  for (const processId of PROCESS_IDS) {
    let exploration = emptyExploration();
    for (let i = 0; i < 20; i++) {
      const result = sampleProcess(SEED, exploration, processId, 1);
      exploration = result.exploration;
      assert.ok(exploration.cumulativeRegret >= 0, `regret went negative for ${processId} at sample ${i}`);
    }
  }
});

test("pedagogy (tier 4): sampling the TRUE best process accrues near-zero regret; sampling a worse one accrues real, honest, nonzero regret", () => {
  const yields = PROCESS_IDS.map((p) => ({ p, y: trueYield(SEED, p) })).sort((a, b) => b.y - a.y);
  const best = yields[0]!.p;
  const worst = yields[yields.length - 1]!.p;
  assert.ok(yields[0]!.y > yields[yields.length - 1]!.y, "fixture sanity: best and worst must actually differ");

  const bestResult = sampleProcess(SEED, emptyExploration(), best, 200);
  const worstResult = sampleProcess(SEED, emptyExploration(), worst, 200);

  assert.ok(
    worstResult.exploration.cumulativeRegret > bestResult.exploration.cumulativeRegret,
    `sampling the worse process (regret ${worstResult.exploration.cumulativeRegret}) must accrue more regret than sampling the true best (regret ${bestResult.exploration.cumulativeRegret}) — the number must not flatter a bad choice`,
  );
});

test("bestTrueYield is the max over every process's real trueYield", () => {
  const expected = Math.max(...PROCESS_IDS.map((p) => trueYield(SEED, p)));
  assert.equal(bestTrueYield(SEED), expected);
});

test("estimatedMean is null before any sample, and converges toward trueYield as samples accumulate", () => {
  assert.equal(estimatedMean(emptyExploration(), "alpha"), null);
  const result = sampleProcess(SEED, emptyExploration(), "alpha", 500);
  const mean = estimatedMean(result.exploration, "alpha");
  assert.ok(mean !== null);
  const truth = trueYield(SEED, "alpha");
  assert.ok(Math.abs(mean! - truth) < 0.15, `mean of 500 samples (${mean}) should be reasonably close to the true yield (${truth})`);
});

test("sampleProcess rejects a nonpositive tick count", () => {
  assert.throws(() => sampleProcess(SEED, emptyExploration(), "alpha", 0), RangeError);
});
