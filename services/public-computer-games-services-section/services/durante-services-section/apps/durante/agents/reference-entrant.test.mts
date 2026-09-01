// reference-entrant.test.mts — proves chooseMove/playDaily are a genuine, working "try to win"
// heuristic against the REAL engine (createDailyEngine + tick), not a stub — no network, no process,
// just the pure decision function and the pure tick loop it drives. run.test.mts's own "clears every
// demon" test imports THIS module's playDaily directly, so this file and that one exercise the exact
// same bot, not two diverging implementations.

import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseMove, playDaily, STRATEGIES } from "./reference-entrant.mjs";
import { createDailyEngine } from "../src/cartridge.mjs";
import { tick, status } from "../src/game.mjs";

test("chooseMove: returns an empty move once every demon is already dead (nothing left to do)", () => {
  // fabricate a state with no live demons by asking for a state, then killing every demon via the
  // real wound/settle mechanism is expensive; instead prove the EMPTY-demons-array degenerate case,
  // which is the same code path (live.length === 0) reached once every demon actually settles dead.
  const state = createDailyEngine("2026-08-19");
  const noDemonsState = { ...state, demons: [] };
  assert.deepEqual(chooseMove(noDemonsState), {});
});

test("chooseMove: on a fresh daily, returns a move shaped {forward,turn,fire} with turn in [-1,1]", () => {
  const state = createDailyEngine("2026-08-19");
  const move = chooseMove(state);
  assert.ok("forward" in move || "turn" in move || "fire" in move);
  if (move.turn !== undefined) assert.ok(move.turn >= -1 && move.turn <= 1);
  if (move.forward !== undefined) assert.ok(move.forward === 0 || move.forward === 1);
});

test("chooseMove is a pure function: the SAME state twice yields the SAME move", () => {
  const state = createDailyEngine("2026-08-19");
  const a = chooseMove(state);
  const b = chooseMove(state);
  assert.deepEqual(a, b);
});

test("playDaily: drives the real engine and actually advances the player over a short budget", () => {
  const state = createDailyEngine("2026-08-19");
  const { state: finalState, log } = playDaily(state, { tick, maxTicks: 20 });
  assert.equal(log.length, 20);
  assert.equal(finalState.phase, 20);
  const moved = finalState.player.x !== state.player.x || finalState.player.z !== state.player.z || finalState.player.angle !== state.player.angle;
  assert.ok(moved, "playDaily's chosen moves must actually change the player's state over 20 ticks");
});

test("chooseMove: the 'default' strategy preset reproduces the original single-strategy behavior exactly (no opts vs. STRATEGIES.default)", () => {
  const state = createDailyEngine("2026-08-19");
  assert.deepEqual(chooseMove(state), chooseMove(state, STRATEGIES.default));
});

test("chooseMove: 'precise' and 'aggressive' are genuinely different, still-deterministic strategies — each is internally consistent (same state, same opts, same move) but the two presets diverge in fire threshold, not by chance", () => {
  const state = createDailyEngine("2026-08-19");
  const precise1 = chooseMove(state, STRATEGIES.precise);
  const precise2 = chooseMove(state, STRATEGIES.precise);
  assert.deepEqual(precise1, precise2, "precise must be as deterministic as default");
  assert.ok(STRATEGIES.precise.fireThreshold < STRATEGIES.default.fireThreshold);
  assert.ok(STRATEGIES.aggressive.fireThreshold > STRATEGIES.default.fireThreshold);
});

test("playDaily: two different injected strategies against the SAME daily produce two different, individually-reproducible move logs (not the same play twice)", () => {
  const base = createDailyEngine("2026-08-20");
  const precise = playDaily(base, { tick, maxTicks: 350, chooseOpts: STRATEGIES.precise });
  const aggressive = playDaily(base, { tick, maxTicks: 350, chooseOpts: STRATEGIES.aggressive });
  assert.notDeepEqual(precise.log, aggressive.log, "different fireThreshold must actually change the recorded log");
  // each strategy replayed against the identical starting state must reproduce itself exactly.
  const preciseAgain = playDaily(base, { tick, maxTicks: 350, chooseOpts: STRATEGIES.precise });
  assert.deepEqual(precise.log, preciseAgain.log);
});

test("playDaily: stops early (before maxTicks) once every demon is dead — the reference entrant does not waste ticks after winning", () => {
  // small, 2-demon daily (see run.test.mts's own CLEAR_DATE choice) with a generous-but-bounded budget.
  const state = createDailyEngine("2026-08-20");
  const demonCount = state.demons.length;
  const { state: finalState, log } = playDaily(state, { tick, maxTicks: 350 });
  const cleared = status(finalState).dead === demonCount;
  assert.equal(cleared, true, "the reference bot should clear this 2-demon daily within 350 ticks");
  assert.ok(log.length < 350, "playDaily must stop at the clear, not run out its full tick budget");
});
