// run — the run state machine and the replay contract (design §2). A run is exactly "the seed
// plus the ordered intent log" — nothing else is trusted from the client. replay() is the ONLY
// function that turns a submitted log into a score: rebuild the canonical daily fresh from the
// seed, replay tick-by-tick, stop at the first terminal condition. Tolerance policy: NONE.
// Structural violations (malformed shape, wrong actor, broken tick/seq ordering, exceeding the
// tick cap) reject the WHOLE log, no score, no partial credit. In-fiction failures (a swing that
// missed, a portal that wasn't there) are not divergence — the engine already no-ops them, which
// is the same "impossible moves just don't do anything" behaviour any turn-based roguelike has.

import type { Intent } from "#engine/intents.mts";
import { validate } from "#engine/intents.mts";
import { buildDaily } from "#engine/dungeon.mts";
import { runTick } from "#engine/tick.mts";
import type { EndReason } from "#engine/score.mts";
import { computeScore, RUN_TICK_CAP } from "#engine/score.mts";
import type { World } from "#engine/world.mts";

export { RUN_TICK_CAP };

export interface Move {
  tick: number;
  seq: number;
  intent: unknown; // raw, untrusted — validated by intents.mts before any tick runs
}

export interface RunLog {
  schema: string;
  date: string;
  seed: number | string;
  actor: string;
  mode: "scored" | "practice";
  moves: Move[];
}

export interface EndedAt {
  tick: number;
  reason: EndReason;
}

export interface ReplayAccepted {
  rejected: null;
  world: World;
  endedAt: EndedAt;
  score: number | null; // null only for a "voided" ending (design §3.3)
}

export interface ReplayRejected {
  rejected:
    | "malformed-intent"
    | "wrong-actor"
    | "bad-order"
    | "tick-cap-exceeded";
}

export type ReplayResult = ReplayAccepted | ReplayRejected;

function normalizeSeed(seed: number | string): number {
  const n = typeof seed === "number" ? seed : Number(seed); // Number() parses "0x..." hex fine
  return (Number.isFinite(n) ? n : 0) >>> 0;
}

interface ValidatedMove {
  tick: number;
  seq: number;
  intent: Intent;
}

// assertStrictlyIncreasing — (tick, seq) pairs must never repeat or go backward. This is the same
// ordering invariant functional.mts's `clock()` zero-padding exists to guarantee in the legacy
// trace; a log that violates it isn't a valid trace, full stop.
function strictlyIncreasing(moves: readonly ValidatedMove[]): boolean {
  for (let i = 1; i < moves.length; i++) {
    const a = moves[i - 1] as ValidatedMove;
    const b = moves[i] as ValidatedMove;
    if (b.tick < a.tick || (b.tick === a.tick && b.seq <= a.seq)) return false;
  }
  return true;
}

export function replay(seed: number | string, log: RunLog): ReplayResult {
  // 1. Structural validation FIRST, over the WHOLE log, before any tick runs.
  const validated: ValidatedMove[] = [];
  for (const m of log.moves) {
    const intent = validate(m.intent);
    if (intent === null) return { rejected: "malformed-intent" };
    if (intent.actor !== log.actor) return { rejected: "wrong-actor" };
    validated.push({ tick: m.tick, seq: m.seq, intent });
  }
  if (!strictlyIncreasing(validated)) return { rejected: "bad-order" };

  const maxTick = validated.reduce((mx, m) => Math.max(mx, m.tick), 0);
  if (maxTick > RUN_TICK_CAP) return { rejected: "tick-cap-exceeded" };

  // 2. Rebuild the CANONICAL daily world fresh, server-side, from the seed — never from anything
  //    the client sent. The client never runs the generator; it only ever renders what the
  //    server generated.
  const world = buildDaily(normalizeSeed(seed));

  // 3. Replay tick-by-tick, STOPPING at the first terminal condition regardless of how many moves
  //    the log claims afterward.
  const byTick = new Map<number, Intent[]>();
  for (const m of validated) {
    const bucket = byTick.get(m.tick);
    if (bucket) bucket.push(m.intent);
    else byTick.set(m.tick, [m.intent]);
  }

  for (let tick = 0; tick <= maxTick; tick++) {
    const result = runTick(world, tick, byTick.get(tick) ?? [], log.actor);
    if (result.clearedBoss) return finalize(world, log.actor, tick, "cleared");
    const player = world.entities.get(log.actor);
    if (player?.status === "ghost") return finalize(world, log.actor, tick, "mortal-death");
    if (player?.status === "voided") return finalize(world, log.actor, tick, "voided");
  }
  return finalize(world, log.actor, maxTick, "tick-cap");
}

function finalize(world: World, actorId: string, tick: number, reason: EndReason): ReplayAccepted {
  const player = world.entities.get(actorId);
  const score = player ? computeScore(world, player, tick, reason) : null;
  return { rejected: null, world, endedAt: { tick, reason }, score };
}
