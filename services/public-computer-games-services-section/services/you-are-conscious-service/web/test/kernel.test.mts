/**
 * `kernel.test` — the one test that exercises `web/js/kernel.mjs` as a module. If a future edit to
 * `kernel.mjs` ever introduces a re-export name collision (ES modules silently drop an ambiguous
 * star-export binding rather than erroring), the specific export going missing/undefined here is
 * what would catch it, not a passing `node --check`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as kernel from "../js/kernel.mjs";

test("kernel.mjs re-exports the full domain surface the browser client needs, with no name silently dropped", () => {
  const expectedNames = [
    // graph.mts
    "assertValidGraph", "nodeOrder", "toMatrix", "baseVector", "ablate",
    // eigen.mts
    "dominantEigen", "assessGraphMatrix",
    // tick.mts
    "TICK_INTERVAL_MS", "ticksBetween", "advance",
    // provenance.mts
    "computed", "authored", "isComputed", "isAuthored", "combine",
    // state.mts
    "starterWidgetGraph", "starterState", "TIER_IDS", "FACULTY_IDS", "OBJECTIVE_IDS",
    // tiers.mts
    "TIER_DEFINITIONS", "tierDefinition", "insightCost", "canUnlockTier",
    // content.mts
    "TIER_PROSE", "TIER_CROSSINGS", "FURTHER_READING", "GOODHART_BRANCH_EPILOGUE",
    // attention.mts
    "FACULTY_K", "yield_", "marginalYield", "reallocate", "summarizeAllocation",
    // exploration.mts
    "PROCESS_IDS", "trueYield", "sampleProcess", "estimatedMean",
    // policy.mts
    "descriptionLength", "isRealCompression", "policyCost",
    // goodhart.mts
    "FAST_INSPECTOR_NODE_ID", "isTainted", "widgetsDisplayed", "materialConsumed", "honestyGap",
    // calibration.mts
    "AGENT_IDS", "brierScore", "submitPrediction", "averageBrier",
    // values.mts
    "frontierCandidates", "paretoFrontier", "normalizeWeights", "pointForWeights",
    // reflect.mts
    "previewReflection", "reflect", "insightFromLambda", "InvalidReflectionGraphError",
    // mentorship.mts
    "deriveChildSeed", "spawnChild", "writeMargin", "lineageSize",
    // intents.mts
    "applyConsciousIntent", "BUILD_COST", "CONNECT_COST", "UPGRADE_COST", "MAX_EDGE_RATE",
    // cartridge.mts
    "createEngine", "applyIntent", "replay", "serialize", "deserialize", "consciousCartridge",
  ];
  for (const name of expectedNames) {
    assert.notEqual((kernel as Record<string, unknown>)[name], undefined, `kernel.mjs is missing (or silently dropped) export "${name}"`);
  }
});

test("kernel.mjs's createEngine/applyIntent/replay are wired to the real domain logic, not stubs", () => {
  const state = kernel.createEngine("kernel-test-seed");
  assert.equal(state.seed, "kernel-test-seed");
  const { state: next } = kernel.applyIntent(state, { kind: "click" });
  assert.equal(next.widgets.stocks["widget"], 1);
  const r = kernel.replay("kernel-test-seed", [{ kind: "click" }]);
  assert.deepEqual(r.finalState, next);
});
