// run — the daily's replay-and-score state machine, a documented PORT of apps/ruinfold/src/engine/
// run.mts's own CONTROL-FLOW SHAPE (structural validation of the WHOLE log first, tolerance policy
// NONE — a malformed/out-of-order log rejects wholesale, no partial credit — then a fresh rebuild from
// the server-derived seed, then tick-by-tick replay stopping at the first terminal condition),
// adapted to cartridge.mjs's specific `applyIntent`/`createDailyEngine` rather than ruinfold's own
// `runTick`. NOT built on @red-cup-engineering/cartridge/replay's `defaultReplay` (nor cartridge.mjs's own
// `replay`): that harness runs a log unconditionally to its end with no early-stop-at-terminal-
// condition and no move-count/tick cap — exactly the two properties a tournament replay needs and a
// generic replay harness structurally cannot offer without becoming this file. This is `replayRun` —
// the ONE function that turns a submitted log into a score, matching run.mts's own header framing
// verbatim ("replay() is the ONLY function that turns a submitted log into a score").

import { validateIntentLog } from "@red-cup-engineering/cartridge/intent-log";
import { createDailyEngine, applyIntent } from "./cartridge.mjs";
import { status as gameStatus } from "./game.mjs";
import { computeScore, DAILY_TICK_CAP } from "./score.mjs";

// RunLog shape (spec §2.4):
//   { schema, date, seed, actor, entrantKind: "human"|"agent", mode: "scored"|"practice", intentLog }
// `intentLog` is the house { seq, intent: { kind: "move", move } }[] envelope — cartridge.mjs's own
// `buildIntentLog`/`recordMove` (run-recorder.mjs) already produce exactly this shape.

// ── structural validation — the WHOLE log, before a single tick runs. Tolerance policy: NONE. ────
function validateStructure(intentLog) {
  if (!Array.isArray(intentLog)) return "malformed-log";
  if (intentLog.length > MAX_MOVES_STRUCTURAL) return "too-many-moves";
  const result = validateIntentLog(intentLog); // house shape: seq strictly increasing, {kind} envelope
  if (!result.valid) return "malformed-log";
  for (const entry of intentLog) {
    if (entry.intent.kind !== "move") return "malformed-move"; // durante's ONE intent kind
    const move = entry.intent.move;
    if (move !== undefined && move !== null) {
      if (typeof move !== "object" || Array.isArray(move)) return "malformed-move";
      for (const key of ["forward", "strafe", "turn"]) {
        if (move[key] !== undefined && typeof move[key] !== "number") return "malformed-move";
      }
      if (move.fire !== undefined && typeof move.fire !== "boolean") return "malformed-move";
    }
  }
  return null;
}

// guard.mjs's own MAX_LOG_MOVES governs the transport-boundary check (server.mjs); this is the
// engine-boundary mirror so replayRun is safe to call directly (e.g. from tests, from the reference
// entrant) without going through the HTTP guard at all.
export const MAX_MOVES_STRUCTURAL = 20_000;

// replayRun(date, runLog) — rebuild the canonical daily FRESH from `date` (never from anything the
// caller sent — createDailyEngine re-derives the seed itself via daily.mjs), replay `runLog.intentLog`
// tick-by-tick, stop at the FIRST terminal condition (cleared, or the log/tick-cap runs out). Returns
// `{ rejected: <reason> }` on any structural violation, or `{ rejected: null, endedAt: {tick, reason},
// score, finalState }` on an accepted replay.
export function replayRun(date, runLog, opts = {}) {
  if (!runLog || typeof runLog !== "object") return { rejected: "malformed-body" };
  const { actor, intentLog } = runLog;
  if (typeof actor !== "string" || actor.length === 0) return { rejected: "bad-actor" };

  const structuralError = validateStructure(intentLog);
  if (structuralError) return { rejected: structuralError };

  // tickCap — injectable ONLY for test speed (see run.test.mts's header note on the trace-substrate's
  // real per-tick cost growth); every real caller (server.mjs, the reference entrant) uses the spec's
  // own DAILY_TICK_CAP, never an override. Deterministic domain logic stays seeded/injected-only per
  // house rule — this is that same discipline applied to a bound, not a randomness source.
  const tickCap = opts.tickCap ?? DAILY_TICK_CAP;

  let state = createDailyEngine(date); // fresh, server-derived — the ONLY source of the arena
  const demonCount = state.demons.length;

  let endedAt = null;
  for (const entry of intentLog) {
    const result = applyIntent(state, entry.intent);
    state = result.state;
    const st = gameStatus(state);
    if (st.dead === demonCount && demonCount > 0) {
      endedAt = { tick: state.phase, reason: "cleared" };
      break;
    }
    if (state.phase >= tickCap) {
      endedAt = { tick: state.phase, reason: "tick-cap" };
      break;
    }
  }
  if (!endedAt) {
    // the log ran out (or was empty) before either terminal condition — same "tick-cap" bucket as
    // running out the clock, since durante has no third ending (see score.mjs's header).
    endedAt = { tick: state.phase, reason: "tick-cap" };
  }

  const st = gameStatus(state);
  const demonReports = state.demons.map((d) => {
    const r = state.report?.demons?.find((x) => x.id === d.id);
    return { id: d.id, wounds: r?.wounds ?? 0 };
  });
  const score = computeScore({ reason: endedAt.reason, endTick: endedAt.tick, hurt: st.hurt, demonReports });

  return { rejected: null, endedAt, score, finalState: state, status: st };
}
