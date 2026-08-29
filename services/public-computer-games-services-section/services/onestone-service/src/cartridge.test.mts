import { test } from "node:test";
import assert from "node:assert/strict";
import { hashState } from "@red-cup-engineering/cartridge/replay";
import { validateManifest } from "@red-cup-engineering/cartridge/manifest";
import { applyIntent, createEngine, onestoneCartridge, replay, type OnestoneIntent } from "./cartridge.mts";
import { manifest, verify } from "./cartridge.manifest.mts";
import { buildGeometry } from "./tiling.mts";
import { legalMoves } from "./engine.mts";
import { levelById, LEVELS } from "./levels.mts";

const SEED = "test-seed-cartridge";
const CONFIG_ID = "1"; // level 1, square chapter, per cartridge.manifest.mts's generated configs

/** Play `steps` real, legal swaps (discovering a legal move fresh from the board each time,
 * exactly the way a real client would) and return the resulting intent log. */
function buildPlayableLog(seed: string, configId: string, steps: number): OnestoneIntent[] {
  const spec = levelById(Number(configId));
  assert.ok(spec, `level ${configId} must exist`);
  const geom = buildGeometry(spec!.tiling, spec!.size, spec!.paletteSize);
  let state = createEngine(seed, configId);
  const log: OnestoneIntent[] = [];
  for (let i = 0; i < steps && state.finished === null; i++) {
    const moves = legalMoves(geom, state.board);
    if (moves.length === 0) break;
    const move = moves[0]!;
    const intent: OnestoneIntent = { kind: "swap", a: move.a, b: move.b };
    const result = applyIntent(state, intent);
    state = result.state;
    log.push(intent);
  }
  return log;
}

test("createEngine is a pure function of (seed, configId)", () => {
  const a = createEngine(SEED, CONFIG_ID);
  const b = createEngine(SEED, CONFIG_ID);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, createEngine("a-different-seed", CONFIG_ID));
  assert.equal(a.levelId, 1);
  assert.equal(a.finished, null);
});

test("createEngine defaults configId to level 1 and rejects an unknown level id", () => {
  const defaulted = createEngine(SEED);
  assert.equal(defaulted.levelId, 1);
  assert.throws(() => createEngine(SEED, "99999"));
});

test("a freshly spawned level always has at least one legal move (validate.mts's own invariant, exercised here)", () => {
  const state = createEngine(SEED, CONFIG_ID);
  const spec = levelById(1)!;
  const geom = buildGeometry(spec.tiling, spec.size, spec.paletteSize);
  assert.ok(legalMoves(geom, state.board).length > 0);
});

test("replay determinism: same seed + same intent log twice yields identical finalState and stateHash", () => {
  const log = buildPlayableLog(SEED, CONFIG_ID, 6);
  assert.ok(log.length > 0, "at least one legal swap should be discoverable");
  const r1 = replay(SEED, log, CONFIG_ID);
  const r2 = replay(SEED, log, CONFIG_ID);
  assert.equal(r1.valid, true);
  assert.deepEqual(r1.finalState, r2.finalState);
  assert.equal(r1.stateHash, r2.stateHash);
  assert.equal(r1.stateHash, hashState(r1.finalState));
  const r3 = replay("a-completely-different-seed", log, CONFIG_ID);
  assert.notEqual(r3.stateHash, r1.stateHash, "a different seed must produce a different spawned board");
});

test("an illegal (non-matching, non-adjacent) swap is an ordinary in-fiction refusal, not an error", () => {
  const state = createEngine(SEED, CONFIG_ID);
  const spec = levelById(1)!;
  const geom = buildGeometry(spec.tiling, spec.size, spec.paletteSize);
  // Two cells guaranteed not to be adjacent on an 8x8 board: cell 0 and the last cell.
  const a = 0;
  const b = geom.cells.length - 1;
  assert.equal(geom.cells[a]!.neighbors.includes(b), false);
  const result = applyIntent(state, { kind: "swap", a, b });
  assert.equal(result.events[0]?.kind, "action-refused");
  assert.deepEqual(result.state.board, state.board, "a refused swap must leave the board untouched");
});

test("an unknown booster kind is a malformed intent — applyIntent throws, and replay marks the log invalid", () => {
  const state = createEngine(SEED, CONFIG_ID);
  assert.throws(() => applyIntent(state, { kind: "booster", booster: "not-a-real-booster" as never }));
  const result = replay(SEED, [{ kind: "booster", booster: "not-a-real-booster" as never }], CONFIG_ID);
  assert.equal(result.valid, false);
  assert.deepEqual(result.finalState, createEngine(SEED, CONFIG_ID));
});

test("a legal shuffle booster settles with zero cascade steps and preserves score/goal progress", () => {
  const state = createEngine(SEED, CONFIG_ID);
  const result = applyIntent(state, { kind: "booster", booster: "shuffle" });
  assert.equal(result.events[0]?.kind, "booster-used");
  assert.equal(result.state.score, state.score);
  assert.notDeepEqual(result.state.board.tiles, state.board.tiles, "shuffle changes tile colors");
});

test("abandon finalizes the run as a loss regardless of progress, and moves after a terminal state are rejected", () => {
  const state = createEngine(SEED, CONFIG_ID);
  const abandoned = applyIntent(state, { kind: "abandon" });
  assert.equal(abandoned.state.finished?.won, false);
  assert.equal(abandoned.state.finished?.stars, 0);
  assert.equal(abandoned.events[0]?.kind, "level-finished");
  assert.throws(() => applyIntent(abandoned.state, { kind: "swap", a: 0, b: 1 }), /already finished/);
  // A second abandon on an already-finished run is a legal no-op, not a structural violation.
  const secondAbandon = applyIntent(abandoned.state, { kind: "abandon" });
  assert.deepEqual(secondAbandon.state, abandoned.state);
});

test("onestoneCartridge satisfies the Cartridge contract end to end, including serialize/deserialize round-trip", () => {
  const log = buildPlayableLog(SEED, CONFIG_ID, 3);
  const r = onestoneCartridge.replay(SEED, log as never, CONFIG_ID);
  assert.equal(r.valid, true);
  const serialized = onestoneCartridge.serialize(r.finalState);
  const roundTripped = onestoneCartridge.deserialize(serialized);
  assert.deepEqual(roundTripped, r.finalState);
});

test("the manifest validates against @red-cup-engineering/cartridge's own schema checker, with all 60 levels as configs", () => {
  const result = validateManifest(manifest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(manifest.configs?.length, LEVELS.length);
  assert.equal(manifest.configs?.length, 60);
});

test("manifest.replayVerifier's function (verify) matches direct replay output for a real log", () => {
  const log = buildPlayableLog(SEED, CONFIG_ID, 4);
  const entries = log.map((intent, i) => ({ seq: i, intent }));
  const viaVerify = verify(SEED, CONFIG_ID, entries);
  const viaReplay = replay(SEED, log, CONFIG_ID);
  assert.equal(viaVerify.stateHash, viaReplay.stateHash);
  assert.deepEqual(viaVerify.finalState, viaReplay.finalState);
});
