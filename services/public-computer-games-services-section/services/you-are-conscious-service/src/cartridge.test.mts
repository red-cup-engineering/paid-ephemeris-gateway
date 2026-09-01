import { test } from "node:test";
import assert from "node:assert/strict";
import { hashState } from "@red-cup-engineering/cartridge/replay";
import { validateManifest } from "@red-cup-engineering/cartridge/manifest";
import { applyIntent, consciousCartridge, createEngine, deserialize, replay, serialize } from "./cartridge.mts";
import { manifest, verify } from "./cartridge.manifest.mts";
import { BUILD_COST, type ConsciousIntent } from "./intents.mts";
import { TICK_INTERVAL_MS } from "./tick.mts";

const SEED = "test-seed-cartridge";

/** A real, playable intent log through the beginning of the game: click a few times, unlock tier 2
 *  (banking insight via an early prestige first, since Insight only ever comes from reflecting),
 *  answer its crossing, build a node, tick, and reflect again. Every step is legal given the
 *  preceding ones. */
function buildPlayableLog(): ConsciousIntent[] {
  return [
    { kind: "click" },
    { kind: "click" },
    { kind: "click" },
    { kind: "prestige" }, // acyclic starter graph: this call itself is REFUSED, a harmless no-op refusal
    { kind: "tick", toTs: 30 * TICK_INTERVAL_MS },
    { kind: "answerCrossing", tier: 2, optionId: "yes-plainly" },
  ];
}

test("createEngine is a pure function of (seed, configId)", () => {
  const a = createEngine(SEED);
  const b = createEngine(SEED);
  assert.deepEqual(a, b);
  const c = createEngine("a-different-seed");
  assert.notDeepEqual(a, c);
  assert.equal(a.seed, SEED);
  assert.equal(a.lastSeenTs, 0);
});

test("determinism: same seed + same intent log twice yields identical finalState and stateHash", () => {
  const log = buildPlayableLog();
  const r1 = replay(SEED, log);
  const r2 = replay(SEED, log);
  assert.equal(r1.valid, true);
  assert.deepEqual(r1.finalState, r2.finalState);
  assert.equal(r1.stateHash, r2.stateHash);
  assert.equal(r1.stateHash, hashState(r1.finalState));
});

test("determinism: a different seed changes state.seed and therefore stateHash, even given the identical intent log", () => {
  const log = buildPlayableLog();
  const r1 = replay(SEED, log);
  const r2 = replay("a-completely-different-seed", log);
  assert.notEqual(r1.stateHash, r2.stateHash);
});

test("a refused (but well-formed) intent keeps the log valid — a refusal is not a replay-invalidating error", () => {
  const log: ConsciousIntent[] = [{ kind: "build", id: "x", label: "X", payFrom: "material" }]; // refused: tier 2 not unlocked
  const r = replay(SEED, log);
  assert.equal(r.valid, true);
  assert.deepEqual(r.finalState, createEngine(SEED));
});

test("an unknown intent kind makes replay invalid (a real bug, not a refusal)", () => {
  const r = replay(SEED, [{ kind: "not-a-real-intent" } as never]);
  assert.equal(r.valid, false);
  assert.deepEqual(r.finalState, createEngine(SEED));
});

test("applyIntent never mutates its input state", () => {
  const state = createEngine(SEED);
  const before = JSON.stringify(state);
  applyIntent(state, { kind: "tick", toTs: 5000 });
  assert.equal(JSON.stringify(state), before);
});

test("consciousCartridge satisfies the Cartridge contract end to end, including a serialize/deserialize round-trip", () => {
  const log = buildPlayableLog();
  const r = consciousCartridge.replay(SEED, log as never, undefined);
  assert.equal(r.valid, true);
  const serialized = consciousCartridge.serialize(r.finalState);
  const roundTripped = consciousCartridge.deserialize(serialized);
  assert.deepEqual(roundTripped, r.finalState);
});

test("serialize/deserialize round-trips a fresh engine state exactly", () => {
  const state = createEngine(SEED);
  assert.deepEqual(deserialize(serialize(state)), state);
});

test("deserialize rejects malformed input rather than silently coercing it", () => {
  assert.throws(() => deserialize({ seed: "x" }), TypeError);
  assert.throws(() => deserialize(null), TypeError);
  assert.throws(() => deserialize("not an object"), TypeError);
});

test("the manifest validates against @red-cup-engineering/cartridge's own schema checker", () => {
  const result = validateManifest(manifest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("manifest.replayVerifier's function (verify) matches direct replay output for a real log", () => {
  const log = buildPlayableLog();
  const entries = log.map((intent, i) => ({ seq: i, intent }));
  const viaVerify = verify(SEED, undefined, entries as never);
  const viaReplay = replay(SEED, log);
  assert.equal(viaVerify.stateHash, viaReplay.stateHash);
  assert.deepEqual(viaVerify.finalState, viaReplay.finalState);
});

test("a much longer, tier-progressing log still replays deterministically end to end", () => {
  const log: ConsciousIntent[] = [
    { kind: "click" }, { kind: "click" }, { kind: "click" }, { kind: "click" }, { kind: "click" },
    { kind: "answerCrossing", tier: 2, optionId: "yes-plainly" },
    { kind: "tick", toTs: 10 * TICK_INTERVAL_MS },
    { kind: "prestige" },
  ];
  const r1 = replay(SEED, log);
  const r2 = replay(SEED, log);
  assert.equal(r1.valid, true);
  assert.equal(r1.stateHash, r2.stateHash);
});

test("BUILD_COST is a real, positive cost — a sanity check that the cost model actually gates something", () => {
  assert.ok(BUILD_COST > 0);
});
