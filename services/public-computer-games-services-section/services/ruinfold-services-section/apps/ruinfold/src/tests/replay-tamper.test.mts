// replay-tamper — the tolerance policy is NONE (design §2.2): any structural violation rejects
// the WHOLE log, no partial credit. This exercises every rejection row of that table, plus the
// two things the replay contract makes structurally inert rather than merely "rejected": a forged
// clientClaimedScore (never consulted — score.mts recomputes from scratch) and a forged/wrong seed
// embedded in the log itself (replay() takes the canonical seed as its OWN argument, never reading
// log.seed to build the world — so a log lying about its seed changes nothing).

import { test } from "node:test";
import assert from "node:assert/strict";
import { dailySeed } from "#engine/daily.mts";
import { replay } from "#engine/run.mts";
import type { RunLog } from "#engine/run.mts";

const ACTOR = "wanderer-w1vxpa";
const SEED = dailySeed("2026-08-19");

function baseLog(moves: RunLog["moves"]): RunLog {
  return { schema: "ruinfold-run/1", date: "2026-08-19", seed: SEED, actor: ACTOR, mode: "scored", moves };
}

test("a malformed intent rejects the whole log, not just itself", () => {
  const log = baseLog([
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 1, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "north-by-northwest" } }, // not a valid dir
  ]);
  const r = replay(SEED, log);
  assert.deepEqual(r, { rejected: "malformed-intent" });
});

test("an intent with an actor other than the log's own actor is rejected", () => {
  const log = baseLog([
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 1, seq: 0, intent: { kind: "move", actor: "someone-else", dir: "n" } },
  ]);
  const r = replay(SEED, log);
  assert.deepEqual(r, { rejected: "wrong-actor" });
});

test("duplicate (tick, seq) pairs are rejected — the same ordering invariant clock() guarantees", () => {
  const log = baseLog([
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 1, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } },
    { tick: 1, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } }, // duplicate (tick,seq)
  ]);
  const r = replay(SEED, log);
  assert.deepEqual(r, { rejected: "bad-order" });
});

test("out-of-order (tick, seq) pairs are rejected", () => {
  const log = baseLog([
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 3, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } },
    { tick: 2, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } }, // goes backward
  ]);
  const r = replay(SEED, log);
  assert.deepEqual(r, { rejected: "bad-order" });
});

test("a tick beyond RUN_TICK_CAP anywhere in the log is rejected", () => {
  const log = baseLog([
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 6001, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } },
  ]);
  const r = replay(SEED, log);
  assert.deepEqual(r, { rejected: "tick-cap-exceeded" });
});

test("an illegal-in-context move (attack a target that doesn't exist) is NOT rejected — it's a no-op", () => {
  const log = baseLog([
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 1, seq: 0, intent: { kind: "attack", actor: ACTOR, target: "nothing-lives-here" } },
    { tick: 2, seq: 0, intent: { kind: "portal", actor: ACTOR, dir: "north" } }, // legal-shaped, may or may not have an exit
  ]);
  const r = replay(SEED, log);
  assert.equal(r.rejected, null);
});

test("a forged clientClaimedScore is never consulted — the server always recomputes from scratch", () => {
  const moves: RunLog["moves"] = [
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 1, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } },
  ];
  const honest = replay(SEED, baseLog(moves));
  const forged = replay(SEED, { ...baseLog(moves), clientClaimedScore: 999999999 } as RunLog & { clientClaimedScore: number });
  assert.equal(honest.rejected, null);
  assert.equal(forged.rejected, null);
  if (honest.rejected || forged.rejected) throw new Error("unreachable");
  assert.equal(honest.score, forged.score); // the forged field changed nothing
});

test("a forged seed embedded in the log is inert — only the caller-supplied canonical seed matters", () => {
  const moves: RunLog["moves"] = [
    { tick: 0, seq: 0, intent: { kind: "join", actor: ACTOR } },
    { tick: 1, seq: 0, intent: { kind: "move", actor: ACTOR, dir: "n" } },
  ];
  const honestSeed = SEED;
  const forgedSeedInLog = baseLog(moves); // log.seed === SEED, but we replay with a DIFFERENT seed
  const wrongSeed = dailySeed("1970-01-01");

  const withRealSeed = replay(honestSeed, forgedSeedInLog);
  const withWrongSeed = replay(wrongSeed, { ...forgedSeedInLog, seed: wrongSeed });
  assert.equal(withRealSeed.rejected, null);
  assert.equal(withWrongSeed.rejected, null);
  if (withRealSeed.rejected || withWrongSeed.rejected) throw new Error("unreachable");

  // Different (correctly-supplied) seeds legitimately build different dungeons — proving the
  // engine actually keys off the seed argument, not off anything the log itself claims.
  assert.notEqual(withRealSeed.world.floorCount === withWrongSeed.world.floorCount && withRealSeed.world.bossId === withWrongSeed.world.bossId, true);

  // And critically: replaying the SAME log with the log's OWN (forged-or-not) seed field ignored
  // in favor of a caller-supplied seed produces the world for the CALLER's seed, never log.seed.
  const ignoringLogSeed = replay(wrongSeed, forgedSeedInLog); // log.seed says honestSeed; we pass wrongSeed
  if (ignoringLogSeed.rejected) throw new Error("unreachable");
  assert.equal(ignoringLogSeed.world.floorCount, withWrongSeed.world.floorCount);
  assert.equal(ignoringLogSeed.world.bossId, withWrongSeed.world.bossId);
});
