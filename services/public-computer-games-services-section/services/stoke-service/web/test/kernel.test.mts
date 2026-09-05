/**
 * `kernel.test` — the one test that actually exercises `web/js/kernel.mjs` as a module (every
 * other web test imports `src/*.mts` or `web/js/*.mjs` directly). If a future edit to `kernel.mjs`
 * ever introduces a re-export name collision (the exact gotcha flickering-delve's/gambling-
 * trainer's own `kernel.mjs` headers warn about — ES modules silently drop an ambiguous
 * star-export binding rather than erroring), the specific export going missing/undefined here is
 * what would catch it, not a passing `node --check`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as kernel from "../js/kernel.mjs";

test("kernel.mjs re-exports the full domain surface the browser client needs, with no name silently dropped", () => {
  const expectedNames = [
    // graph.mts
    "assertValidGraph", "nodeOrder", "toMatrix", "baseVector", "isNonNegative", "NegativeEdgeRateError",
    // eigen.mts
    "dominantEigen", "assessGraphMatrix",
    // tick.mts
    "TICK_INTERVAL_MS", "ticksBetween", "advance",
    // prestige.mts
    "previewPrestige", "reset", "startingStockBonus", "totalBankedLambda", "InvalidPrestigeGraphError",
    // provenance.mts
    "computed", "authored", "isComputed", "isAuthored", "combine",
    // state.mts
    "starterGraph", "starterState",
    // intents.mts
    "applyStokeIntent", "BUILD_COST", "CONNECT_COST", "UPGRADE_COST", "UPGRADE_RATE_STEP", "MAX_EDGE_RATE",
    // cartridge.mts
    "createEngine", "applyIntent", "replay", "serialize", "deserialize", "stokeCartridge",
  ];
  for (const name of expectedNames) {
    assert.notEqual((kernel as Record<string, unknown>)[name], undefined, `kernel.mjs is missing (or silently dropped) export "${name}"`);
  }
});

test("kernel.mjs's createEngine/applyIntent/replay are wired to the real domain logic, not stubs", () => {
  const state = kernel.createEngine("kernel-test-seed");
  assert.equal(state.seed, "kernel-test-seed");
  const { state: next } = kernel.applyIntent(state, { kind: "tick", toTs: 3000 });
  assert.equal(next.stocks["wood"], 3);
  const r = kernel.replay("kernel-test-seed", [{ kind: "tick", toTs: 3000 }]);
  assert.deepEqual(r.finalState, next);
});
