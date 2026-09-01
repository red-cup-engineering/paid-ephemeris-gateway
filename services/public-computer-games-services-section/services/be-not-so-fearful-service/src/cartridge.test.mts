// cartridge.test — the full-game determinism/byte-replay commitment (the design's own promise,
// tested at THIS layer, not just movement.mts's isolated kernel test), plus the economy/pickup/
// extraction/transition/death mechanics wired through the real Cartridge<State,Intent> contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine, applyIntent, replay, levelFor } from "./cartridge.mts";
import type { GameState, TickIntent, GameIntent } from "./cartridge.mts";

function scriptedTicks(n: number, seedOffset = 0): TickIntent[] {
  const out: TickIntent[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      kind: "tick",
      forward: Math.sin((i + seedOffset) * 0.07) > -0.2 ? 1 : 0,
      strafe: Math.cos((i + seedOffset) * 0.05),
      turn: Math.sin(i * 0.03) * 0.05,
      jump: i % 47 === 0,
      altFire: i % 131 === 0,
      sprint: i % 3 === 0,
    });
  }
  return out;
}

test("cartridge: createEngine is deterministic — identical seed produces byte-identical initial state", () => {
  const a = createEngine("determinism-seed", "default");
  const b = createEngine("determinism-seed", "default");
  assert.deepStrictEqual(a, b);
});

test("cartridge: full-run byte-replay determinism — a scripted intent sequence run twice from the same seed converges to identical final state", () => {
  const intents = scriptedTicks(400);
  function run(): GameState {
    let state = createEngine("replay-seed-1", "default");
    for (const intent of intents) state = applyIntent(state, intent).state;
    return state;
  }
  const a = run();
  const b = run();
  assert.deepStrictEqual(a, b);
});

test("cartridge: replay() via the real cartridge defaultReplay contract matches a directly-computed run, and reports valid:true", () => {
  const intents = scriptedTicks(250, 17);
  let direct = createEngine("replay-seed-2", "default");
  for (const intent of intents) direct = applyIntent(direct, intent).state;

  const result = replay("replay-seed-2", intents, "default");
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.finalState, direct);
});

test("cartridge: replay() detects a tampered/illegal intent by invalidating the run (defaultReplay's own throw-stops-replay contract)", () => {
  const intents: GameIntent[] = [{ kind: "tick", forward: 1 }, { kind: "unknown-kind" } as unknown as GameIntent, { kind: "tick", forward: 1 }];
  const result = replay("replay-seed-3", intents, "default");
  assert.strictEqual(result.valid, false);
});

test("cartridge: pickup — carrying an item within radius succeeds, is idempotent, and rejects too-far attempts", () => {
  const level = levelFor("pickup-seed", 1);
  const slot = level.lootSlots[0];
  let state = createEngine("pickup-seed", "default");
  state = { ...state, player: { ...state.player, x: slot.x, z: slot.z } };

  const r1 = applyIntent(state, { kind: "pickup", lootId: slot.id });
  assert.strictEqual(r1.events[0]?.kind, "picked-up");
  assert.strictEqual(r1.state.economy.carrying.length, 1);
  assert.strictEqual(r1.state.economy.carrying[0].id, slot.id);

  const r2 = applyIntent(r1.state, { kind: "pickup", lootId: slot.id });
  assert.strictEqual(r2.events[0]?.kind, "pickup-failed");
  assert.strictEqual(r2.events[0]?.reason, "already-held");
  assert.strictEqual(r2.state.economy.carrying.length, 1, "must not double-count");

  const farState = { ...state, player: { ...state.player, x: slot.x + 50, z: slot.z + 50 } };
  const r3 = applyIntent(farState, { kind: "pickup", lootId: slot.id });
  assert.strictEqual(r3.events[0]?.kind, "pickup-failed");
  assert.strictEqual(r3.events[0]?.reason, "too-far");
});

test("cartridge: extract — banks carried loot only when standing at a beacon, and only on the explicit intent", () => {
  const level = levelFor("extract-seed", 1);
  const slot = level.lootSlots[0];
  const beacon = level.extractionBeacons[0];
  let state = createEngine("extract-seed", "default");
  state = { ...state, player: { ...state.player, x: slot.x, z: slot.z } };
  state = applyIntent(state, { kind: "pickup", lootId: slot.id }).state;
  assert.strictEqual(state.economy.carrying.length, 1);

  // far from the beacon: extraction fails, item stays carried, run stays open.
  const farResult = applyIntent(state, { kind: "extract" });
  assert.strictEqual(farResult.events[0]?.kind, "extract-failed");
  assert.strictEqual(farResult.state.economy.ended, false);

  // at the beacon: extraction succeeds and ends the run.
  state = { ...state, player: { ...state.player, x: beacon.x, z: beacon.z } };
  const result = applyIntent(state, { kind: "extract" });
  assert.strictEqual(result.events[0]?.kind, "extracted");
  assert.strictEqual(result.state.economy.ended, true);
  assert.strictEqual(result.state.economy.banked.length, 1);
  assert.strictEqual(result.state.economy.carrying.length, 0);
});

test("cartridge: transition — advances to the next tier only when standing at the transition voxel, carrying economy across tiers", () => {
  const level1 = levelFor("transition-seed", 1);
  const slot = level1.lootSlots[0];
  let state = createEngine("transition-seed", "default");
  state = { ...state, player: { ...state.player, x: slot.x, z: slot.z } };
  state = applyIntent(state, { kind: "pickup", lootId: slot.id }).state;
  assert.strictEqual(state.economy.carrying.length, 1);

  assert.ok(level1.transition, "tier 1 must have a transition voxel for this test to be meaningful");
  state = { ...state, player: { ...state.player, x: level1.transition!.x, z: level1.transition!.z } };
  const result = applyIntent(state, { kind: "transition" });
  assert.strictEqual(result.events[0]?.kind, "descended");
  assert.strictEqual(result.state.tier, 2);
  assert.strictEqual(result.state.economy.carrying.length, 1, "carried loot must survive a tier transition, not reset");

  const level2 = levelFor("transition-seed", 2);
  assert.strictEqual(result.state.player.x, level2.entry.x + 0.5);
  assert.strictEqual(result.state.player.z, level2.entry.z + 0.5);
});

test("cartridge: transition fails when not standing at the voxel, and tier 3 (deepest) never offers one", () => {
  const level1 = levelFor("transition-fail-seed", 1);
  const state = createEngine("transition-fail-seed", "default");
  const result = applyIntent(state, { kind: "transition" });
  assert.strictEqual(result.events[0]?.kind, "transition-failed");
  assert.strictEqual(result.state.tier, 1);

  const tier3State: GameState = { ...state, tier: 3 };
  const r3 = applyIntent(tier3State, { kind: "transition" });
  assert.strictEqual(r3.events[0]?.kind, "transition-failed");
  assert.strictEqual(r3.events[0]?.reason, "no-deeper-tier");
});

test("cartridge: death is a real terminal state — the run ends, and a run that has already ended ignores further intents (ticks still advance the clock)", () => {
  const level = levelFor("death-seed", 1);
  const anomaly = level.anomalySlots.find((s) => s.kind === "unwitnessed")!;
  let state = createEngine("death-seed", "default");
  // place the player directly on top of the (always-dangerous-on-contact) anomaly.
  state = { ...state, player: { ...state.player, x: anomaly.x, z: anomaly.z } };
  const result = applyIntent(state, { kind: "tick", forward: 0 });
  assert.strictEqual(result.state.economy.ended, true);
  assert.strictEqual(result.events[0]?.kind, "died");

  const beforeTick = result.state.tick;
  const afterExtract = applyIntent(result.state, { kind: "extract" });
  assert.deepStrictEqual(afterExtract.state, result.state, "extract after death must be a total no-op");
  assert.deepStrictEqual(afterExtract.events, []);

  const afterTick = applyIntent(result.state, { kind: "tick", forward: 1 });
  assert.strictEqual(afterTick.state.tick, beforeTick + 1, "a tick after death should still advance the clock");
  assert.strictEqual(afterTick.state.player.x, result.state.player.x, "but must not otherwise change anything");
  assert.deepStrictEqual(afterTick.events, []);
});

test("cartridge: altFire triggers a real rocket-jump impulse (measurable via a higher-than-normal-jump apex) and is gated by a cooldown", () => {
  let state = createEngine("rocket-seed", "default");
  state = { ...state, player: { ...state.player, vx: 0, vz: 0 } };
  const result = applyIntent(state, { kind: "tick", altFire: true });
  assert.strictEqual(result.events[0]?.kind, "rocket-jump");
  assert.ok(result.state.player.vHeight > 0, "a rocket jump should impart upward velocity");
  assert.ok(result.state.rocketCooldownTicks > 0, "should be on cooldown immediately after firing");

  // firing again immediately (still on cooldown) must not add a second impulse.
  const vHeightBefore = result.state.player.vHeight;
  const second = applyIntent(result.state, { kind: "tick", altFire: true });
  assert.strictEqual(second.events.some((e) => e.kind === "rocket-jump"), false, "should not fire again while on cooldown");
  assert.ok(second.state.player.vHeight <= vHeightBefore, "no second impulse — vHeight should only be decaying under gravity");
});
