import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type GameState, GENERATORS, generatorCost, stepEconomy, applyDelta, offlineAccrual,
  productionMultiplier, avatarStats, combatStep, formatNumber, essencePerSecond,
} from "./economy.mts";

function blankState(over: Partial<GameState> = {}): GameState {
  return {
    essence: 0, echoes: 0, depth: 0, maxDepth: 0, fameDepth: 0, lifetimeEssence: 0,
    hp: 20, maxHp: 20, atk: 4, prestigeCount: 0,
    gens: {}, combat: {}, upgrades: new Set(), automations: new Set(), boostRateMult: 1,
    ...over,
  };
}

test("generator bulk cost is strictly monotone in count", () => {
  for (const g of GENERATORS) {
    assert.ok(generatorCost(g, 0, 2) > generatorCost(g, 0, 1), `${g.id} bulk`);
    assert.ok(generatorCost(g, 5, 1) > generatorCost(g, 0, 1), `${g.id} owned`);
  }
});

test("bulk cost equals sum of singles (geometric series identity)", () => {
  const g = GENERATORS[0]!;
  let owned = 3;
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += generatorCost(g, owned + i, 1);
  // Allow rounding slack from per-step ceil vs one bulk ceil.
  const bulk = generatorCost(g, owned, 4);
  assert.ok(Math.abs(bulk - sum) <= 4, `bulk ${bulk} ≈ sum ${sum}`);
});

test("tier-1 production feeds essence; higher tiers feed the tier below", () => {
  const s = blankState({ gens: { torchbearer: 10, pathfinder: 5 } });
  const d = stepEconomy(s, 1);
  assert.ok(d.essence > 0, "torchbearers make essence");
  assert.ok((d.gens["torchbearer"] ?? 0) > 0, "pathfinders make torchbearers");
  assert.equal(d.essence, 10 * GENERATORS[0]!.baseRate * productionMultiplier(s));
});

test("offline coarse-tick ≈ online for a CONSTANT-rate (tier-1 only) holding", () => {
  // With only torchbearers, production is constant: offline must equal a 1s-stepped online run.
  const s = blankState({ gens: { torchbearer: 100 } });
  let online = s;
  for (let i = 0; i < 3600; i++) online = applyDelta(online, stepEconomy(online, 1));
  const { delta } = offlineAccrual(s, 3600, 1e9, 30);
  const offline = applyDelta(s, delta);
  const rel = Math.abs(offline.essence - online.essence) / online.essence;
  assert.ok(rel < 1e-9, `constant-rate offline==online (rel ${rel})`);
});

test("offline is capped and reports it", () => {
  const s = blankState({ gens: { torchbearer: 10 } });
  const { simulated, capped } = offlineAccrual(s, 100_000, 3600, 30);
  assert.equal(simulated, 3600);
  assert.equal(capped, true);
});

test("echoes raise the production multiplier", () => {
  const base = productionMultiplier(blankState());
  const withEchoes = productionMultiplier(blankState({ echoes: 50 }));
  assert.ok(withEchoes > base);
});

test("repeatable combat investment and echoes raise attack and max health", () => {
  const s = blankState({ combat: { whetstone: 2, "tallow-ward": 1 } });
  const { atk, maxHp } = avatarStats(s);
  assert.equal(atk, 4 + 3 * 2); // base 4 + 2 whetstones
  assert.equal(maxHp, 20 + 14 * 1); // base 20 + 1 ward
  const withEchoes = avatarStats(blankState({ echoes: 10 }));
  assert.equal(withEchoes.atk, 4 + 10); // echoes give permanent combat power (the cross-run loop)
  assert.equal(withEchoes.maxHp, 20 + 60);
});

test("combat clears a floor and can kill the avatar", () => {
  let floorHp = 10, hp = 20;
  let cleared = false, died = false, rounds = 0;
  while (!cleared && !died && rounds < 100) {
    const r = combatStep(4, 3, floorHp, hp);
    floorHp = r.floorHp; hp = r.avatarHp; cleared = r.cleared; died = r.died; rounds++;
  }
  assert.ok(cleared, "weak monster is cleared");
  // A lethal monster kills.
  const lethal = combatStep(1, 999, 100, 5);
  assert.equal(lethal.died, true);
});

test("essencePerSecond reflects torchbearers and multiplier", () => {
  const s = blankState({ gens: { torchbearer: 50 }, upgrades: new Set(["bright-flame"]) });
  assert.equal(essencePerSecond(s), 50 * GENERATORS[0]!.baseRate * 2);
});

test("formatNumber is legible across magnitudes", () => {
  assert.equal(formatNumber(42), "42");
  assert.equal(formatNumber(1500), "1.50K");
  assert.equal(formatNumber(2_500_000), "2.50M");
  assert.ok(formatNumber(1e40).includes("e"));
});
