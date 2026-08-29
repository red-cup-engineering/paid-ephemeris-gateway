import { test } from "node:test";
import assert from "node:assert/strict";
import { type GameState } from "./economy.mts";
import {
  revealedUnlocks, composeStrategy, AUTOMATIONS, fullyAutonomous,
  canRekindle, rekindleReward, rekindle, REKINDLE_MIN_DEPTH,
} from "./progression.mts";

function state(over: Partial<GameState> = {}): GameState {
  return {
    essence: 0, echoes: 0, depth: 0, maxDepth: 0, fameDepth: 0, lifetimeEssence: 0,
    hp: 20, maxHp: 20, atk: 4, prestigeCount: 0,
    gens: {}, combat: {}, upgrades: new Set(), automations: new Set(), boostRateMult: 1,
    ...over,
  };
}

test("unlocks unfold as the player progresses", () => {
  assert.equal(revealedUnlocks(state()).has("shop"), false);
  assert.equal(revealedUnlocks(state({ lifetimeEssence: 50 })).has("shop"), true);
  assert.equal(revealedUnlocks(state({ maxDepth: REKINDLE_MIN_DEPTH })).has("rekindle"), true);
});

test("empty automation set yields an inert strategy", () => {
  assert.equal(composeStrategy(new Set()), "(quote wait)");
});

test("composed strategy folds owned clauses by priority into (or … wait)", () => {
  const s = composeStrategy(new Set(["auto-attack", "auto-descend", "auto-retreat"]));
  // retreat (order 10) before attack (20) before descend (30).
  assert.ok(s.indexOf("hp") < s.indexOf("floor-hp"));
  assert.ok(s.startsWith("(or"));
  assert.ok(s.includes("(quote wait)"));
});

test("a custom strategy overrides the composed one", () => {
  assert.equal(composeStrategy(new Set(["auto-attack"]), "(quote descend)"), "(quote descend)");
});

test("auto-buy contributes no per-tick clause (standing behavior)", () => {
  const s = composeStrategy(new Set(["auto-buy"]));
  assert.equal(s, "(quote wait)"); // its clause is "" — nothing to decide.
});

test("fullyAutonomous only when every rung is owned", () => {
  const all = new Set(AUTOMATIONS.map((a) => a.id));
  assert.equal(fullyAutonomous(state({ automations: all })), true);
  assert.equal(fullyAutonomous(state({ automations: new Set(["auto-attack"]) })), false);
});

test("rekindle gated by min depth; reward rises with depth", () => {
  assert.equal(canRekindle(state({ maxDepth: 5 })), false);
  assert.equal(canRekindle(state({ maxDepth: REKINDLE_MIN_DEPTH })), true);
  assert.ok(rekindleReward(state({ maxDepth: 40 })) > rekindleReward(state({ maxDepth: 12 })));
});

test("rekindle resets the run but keeps echoes, fame, automations, meta upgrades", () => {
  const before = state({
    essence: 1e6, maxDepth: 30, fameDepth: 30, depth: 30, prestigeCount: 1,
    gens: { torchbearer: 100 }, echoes: 5,
    upgrades: new Set(["bright-flame", "crow-eyes"]),
    automations: new Set(["auto-attack"]),
  });
  const reward = rekindleReward(before);
  const after = rekindle(before);
  assert.equal(after.essence, 0);
  assert.deepEqual(after.gens, {});
  assert.equal(after.maxDepth, 0);
  assert.equal(after.echoes, 5 + reward);
  assert.equal(after.fameDepth, 30, "fame persists");
  assert.equal(after.prestigeCount, 2);
  assert.ok(after.upgrades.has("crow-eyes"), "meta upgrade persists");
  assert.ok(!after.upgrades.has("bright-flame"), "run upgrade resets");
  assert.ok(after.automations.has("auto-attack"), "automations persist");
});

test("Crow's Eyes doubles the rekindle reward", () => {
  const base = rekindleReward(state({ maxDepth: 40 }));
  const crow = rekindleReward(state({ maxDepth: 40, upgrades: new Set(["crow-eyes"]) }));
  assert.ok(crow > base, "crow's eyes raises the reward");
  // ~2× before flooring (allow ±1 for the floor on each).
  assert.ok(Math.abs(crow - base * 2) <= 2, `crow ${crow} ≈ 2× base ${base}`);
});
