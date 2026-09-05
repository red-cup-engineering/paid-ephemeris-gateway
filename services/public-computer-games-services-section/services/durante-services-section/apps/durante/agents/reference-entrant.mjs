#!/usr/bin/env node
// reference-entrant — THE PROOF that AIs compete as peers, per gaming-enterprises-vision.md §5c's own
// framing ("daily QUAKE tournaments that AI play when their owners aren't looking"). A headless bot
// that: (1) fetches today's daily seed from the LIVE public API (GET /daily) — never computes its own
// seed locally and never peeks at the server's internal arena state; (2) plays the daily through the
// REAL engine, locally, using its own BFS-pathfinding + line-of-sight-aiming heuristics (no engine
// shortcuts, no cheating — it walks the same collision grid a human's client walks); (3) submits its
// run through the SAME public `POST /runs` route a human's browser/terminal client uses, self-declaring
// `entrantKind: "agent"` (spec §2.4's honest-label field — disclosed, not hidden). It is not a fixture:
// this file is what actually runs when someone wants an AI in tomorrow's tournament.
//
// `chooseMove(state)` — the pure decision function — is the reusable "genuinely tries to win" heuristic
// this file's header promises. It is also imported directly (no network, no process) by
// src/run.test.mts's "a log that clears every demon" test, so the SAME targeting/pathfinding logic that
// proves solvability in a unit test is the logic that actually competes in the live tournament — not two
// diverging implementations that happen to agree today.
//
// Run:  node agents/reference-entrant.mjs [--base http://localhost:8788] [--actor durante-bot-1] [--date YYYY-MM-DD] [--strategy default|precise|aggressive]

import { arenaGrid } from "../src/arena.mjs";
import { blocks } from "@red-cup-engineering/abrash/collision";
import { positionOf, vitalityOf } from "../src/demon.mjs";
import { status as gameStatus } from "../src/game.mjs";
import { recordMove, encodeRun } from "../src/run-recorder.mjs";

// normalizeAngle(a) — wrap to (-PI, PI], the shortest-turn representation.
function normalizeAngle(a) {
  return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

// bfsPath(passable, bounds, start, goal) — shortest grid path (4-connected) from `start` to `goal`
// cells, both [x,z] integer pairs. Returns the cell sequence [start, ..., goal] or null if unreachable
// within `bounds`. The SAME reachability predicate daily-arena.test.mts's independentReachable uses
// (arenaGrid + collision's own blocks(), passContested:true) — the bot never gets an easier read of
// the world than the collision system a human's client is bound by.
function bfsPath(passable, bounds, start, goal) {
  const key = ([x, z]) => `${x},${z}`;
  if (key(start) === key(goal)) return [start];
  const seen = new Set([key(start)]);
  const parent = new Map();
  const queue = [start];
  while (queue.length > 0) {
    const [x, z] = queue.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < bounds.minX || nx > bounds.maxX || nz < bounds.minZ || nz > bounds.maxZ) continue;
      const k = `${nx},${nz}`;
      if (seen.has(k) || !passable(nx, nz)) continue;
      seen.add(k);
      parent.set(k, [x, z]);
      if (nx === goal[0] && nz === goal[1]) {
        const path = [[nx, nz]];
        let cur = [x, z];
        while (key(cur) !== key(start)) { path.push(cur); cur = parent.get(key(cur)); }
        path.push(start);
        return path.reverse();
      }
      queue.push([nx, nz]);
    }
  }
  return null;
}

// chooseMove(state, opts) — one tick's decision, given a live game() state ({ world, player, demons }):
// BFS to the nearest REACHABLE live demon, steer toward the next waypoint cell on that path, and fire
// whenever the player's own heading is closely aligned with the target demon's true bearing (combat.mjs
// itself decides whether the shot actually lands — occlusion, range — so firing early/often here costs
// nothing extra; there is no ammo model in the deterministic core, see DESIGN.md).
//
// opts.fireThreshold (default 0.25, matching the original single-strategy behavior byte-for-byte) —
// the ONLY knob this bot exposes, and it is an injected number, never a random draw, per house doctrine
// ("deterministic domain logic — seeded/injected only"). A smaller threshold only fires when heading is
// nearly dead-on (fewer, more-accurate shots); a larger one fires more liberally (more shots, more of
// them at a poor angle). Two entrants running the SAME date with two different injected thresholds are
// still two fully deterministic, replay-identical strategies — not two draws of the same distribution.
export function chooseMove(state, opts = {}) {
  const fireThreshold = opts.fireThreshold ?? 0.25;
  const { world, player, demons } = state;
  const live = demons
    .map((d) => ({ id: d.id, vit: vitalityOf(world, d.id), pos: positionOf(world, d.id) }))
    .filter((d) => d.vit.alive && d.pos);
  if (live.length === 0) return {};

  const g = arenaGrid(world, { passContested: true });
  const passable = (x, z) => !blocks(g.at(x, z).charge, { passContested: true });
  const start = [Math.floor(player.x), Math.floor(player.z)];

  let best = null;
  for (const d of live) {
    const goal = [Math.floor(d.pos.x), Math.floor(d.pos.z)];
    const path = bfsPath(passable, g.bounds, start, goal);
    if (path && (!best || path.length < best.path.length)) best = { demon: d, path };
  }
  // every live demon should be BFS-reachable by the generator's own solvability guarantee (daily-
  // arena.mjs) — but stay defensive: if pathfinding somehow fails, aim at the nearest demon anyway
  // rather than freezing (still a real, if degraded, attempt to win).
  const target = best?.demon ?? live.reduce((a, b) => (
    Math.hypot(a.pos.x - player.x, a.pos.z - player.z) <= Math.hypot(b.pos.x - player.x, b.pos.z - player.z) ? a : b
  ));

  const demonAngle = Math.atan2(target.pos.z - player.z, target.pos.x - player.x);
  const demonDiff = normalizeAngle(demonAngle - player.angle);
  const fire = Math.abs(demonDiff) < fireThreshold;

  if (!best) {
    // no path found at all (defensive fallback) — turn toward the demon and inch forward.
    const turn = Math.max(-1, Math.min(1, demonDiff / 0.35));
    return { forward: Math.abs(demonDiff) < 2.0 ? 1 : 0, turn, fire };
  }

  const waypoint = best.path.length > 1 ? best.path[1] : best.path[0];
  const wx = waypoint[0] + 0.5, wz = waypoint[1] + 0.5;
  const waypointAngle = Math.atan2(wz - player.z, wx - player.x);
  const waypointDiff = normalizeAngle(waypointAngle - player.angle);
  const turn = Math.max(-1, Math.min(1, waypointDiff / 0.35));
  const forward = Math.abs(waypointDiff) < 1.4 ? 1 : 0;

  return { forward, turn, fire };
}

// playDaily(state, opts) — drive chooseMove tick-by-tick against the REAL engine (opts.tick, the same
// pure game.mjs#tick every face calls) until every demon is DEAD or `maxTicks` is reached. Returns
// { state, moves } — `moves` is the plain { forward, strafe, turn, fire } array run-recorder.mjs's
// recordMove/encodeRun expects, so the caller can submit exactly what it played, no translation layer.
// opts.chooseOpts, if given, is forwarded verbatim to chooseMove on every tick (see chooseMove's own
// fireThreshold doc above) — the one seam a caller uses to run a different, still fully deterministic,
// strategy through the identical pathfinding/aiming skeleton.
export function playDaily(state, { tick, maxTicks, chooseOpts = {} }) {
  const demonCount = state.demons.length;
  let s = state;
  let log = [];
  for (let i = 0; i < maxTicks; i++) {
    const st = gameStatus(s);
    if (st.dead === demonCount && demonCount > 0) break;
    const move = chooseMove(s, chooseOpts);
    log = recordMove(log, move);
    s = tick(s, move);
  }
  return { state: s, log };
}

// STRATEGIES — named, injected fireThreshold presets (see chooseMove's own doc). Two entrants picking
// two different names here are still two fully deterministic strategies, never two draws of a random
// distribution — "precise" only fires when nearly dead-on (fewer, more-accurate shots, less incidental
// exposure); "default" is the original single-strategy behavior, unchanged; "aggressive" fires much more
// liberally (more shots landed sooner, but more ticks spent exposed at a poor firing angle too).
export const STRATEGIES = {
  precise: { fireThreshold: 0.12 },
  default: { fireThreshold: 0.25 },
  aggressive: { fireThreshold: 0.45 },
};

// ── CLI: fetch today's seed from the LIVE API, play it locally, submit through the public route. ──
// Only runs when this file is invoked directly — never on import (chooseMove/playDaily above are
// importable, network-free, by anything, including tests).
const isMain = process.argv[1] !== undefined && import.meta.url === new URL(process.argv[1], "file://").href;
if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
  };
  const base = flag("base", process.env.DURANTE_BASE_URL ?? "http://localhost:8788");
  const actor = flag("actor", process.env.DURANTE_AGENT_ACTOR ?? "durante-reference-entrant");
  const strategyName = flag("strategy", "default");
  if (!(strategyName in STRATEGIES)) {
    throw new Error(`unknown --strategy '${strategyName}' — one of ${Object.keys(STRATEGIES).join(", ")}`);
  }
  const chooseOpts = STRATEGIES[strategyName];

  const { createDailyEngine } = await import("../src/cartridge.mjs");
  const { tick } = await import("../src/game.mjs");
  const { MAX_MOVES_STRUCTURAL } = await import("../src/run.mjs");
  const { DAILY_TICK_CAP } = await import("../src/score.mjs");

  const dailyRes = await fetch(`${base}/daily${flag("date") ? `?date=${flag("date")}` : ""}`);
  if (!dailyRes.ok) throw new Error(`GET /daily failed: HTTP ${dailyRes.status}`);
  const daily = await dailyRes.json();
  // eslint-disable-next-line no-console
  console.log(`reference-entrant: playing ${daily.date} (seed ${daily.seed}, floorBound ${daily.floorBound}, mode ${daily.mode}, strategy ${strategyName})`);

  let state = createDailyEngine(daily.date); // the SAME date the server just named — rebuilt locally,
  // never trusting anything beyond the date string itself (matching every human client's own posture:
  // the arena is a pure function of the date, not a payload the server hands over).
  const maxTicks = Math.min(DAILY_TICK_CAP, MAX_MOVES_STRUCTURAL);
  const { state: finalState, log } = playDaily(state, { tick, maxTicks, chooseOpts });

  const cleared = gameStatus(finalState).dead === finalState.demons.length && finalState.demons.length > 0;
  // eslint-disable-next-line no-console
  console.log(`reference-entrant: stopped at phase ${finalState.phase} (${cleared ? "CLEARED" : "did not clear"}), submitting ${log.length} moves`);

  const body = encodeRun({ date: daily.date, actor, entrantKind: "agent", mode: daily.mode, intentLog: log });
  const submitRes = await fetch(`${base}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await submitRes.json();
  // eslint-disable-next-line no-console
  console.log(`reference-entrant: submit -> HTTP ${submitRes.status}`, result);
  if (!submitRes.ok) process.exitCode = 1;
}
