// game — durante's tick LOOP, tying the three twists into one playable turn over abrash's engine: the
// federated ARENA (arena.mjs), the held-⊤ DEMON (demon.mjs), and the evidence-folding WEAPON
// (combat.mjs). A tick is one turn of the loop, with NO global clock (abrash's substrate is aperiodic
// settling): read the arena into a grid, resolve the player's MOVE intent against it (collision —
// contested walls are PHASE GATES, walkable), resolve the player's FIRE intent into wound evidence
// (append-only), run each demon's chase (a functional position update; a demon at melee range CONTESTS
// the player's tile — files both faces, folding it to ⊤), re-grid, and PROJECT a 3D frame.
//
// Pure where it can be: `tick(state, intent)` returns a NEW state + frame, appending rows rather than
// mutating. The realtime driver (`run`) is the thin imperative shell; everything it calls is pure.

import {
  grid, admitLog, predicate, deny, cellKey, FOUR,
} from "@561-group/abrash/world";
import { camera, render } from "@561-group/abrash/raycaster";
import { applyIntent } from "@561-group/abrash/engine";
import { spawn, move as demonMove, vitalityOf, positionOf, speedOf, chaseStep, demonKey, VITAL } from "./demon.mjs";
import { move as bodyMove } from "@561-group/abrash/collision";
import { shoot } from "./combat.mjs";
import { census, contestedWalls } from "./arena.mjs";

// game(opts) — the per-session state: the merged arena `world`, the `player`, the live `demons` (by id),
// the tick phase (drives the ⊤ shiver), and the camera config. `passContested:true` makes a contested
// arena wall a PHASE GATE (you can walk through the wall nobody agrees is solid) — the deathmatch default.
export function game(opts = {}) {
  return {
    world: opts.world,
    player: {
      x: opts.player?.x ?? 1.5,
      z: opts.player?.z ?? 1.5,
      angle: opts.player?.angle ?? 0,
      radius: opts.player?.radius ?? 0.2,
      moveSpeed: opts.player?.moveSpeed ?? 0.18,
      turnSpeed: opts.player?.turnSpeed ?? 0.14,
      hurt: opts.player?.hurt ?? 0, // ticks the player has been in a demon's grasp (audit)
    },
    demons: opts.demons ?? [],     // [{ id }]
    phase: opts.phase ?? 0,
    cam: opts.cam ?? { fov: Math.PI / 3, maxDist: 24 },
    passContested: opts.passContested ?? true,
    log: [],
  };
}

// spawnDemon(state, id, x, z, opts) — admit a demon's spawn rows into the world and register its id.
// Returns a NEW state (append-only; the prior world is unchanged).
export function spawnDemon(state, id, x, z, opts = {}) {
  let world = state.world;
  for (const r of spawn(id, x, z, opts)) world = admitLog(world, r.e, [r]).world;
  return { ...state, world, demons: [...state.demons, { id }] };
}

// liveDemons(world, demons) — the ids whose vitality still HUNTS (t or ⊤ — wounded is not yet a corpse).
export function liveDemons(world, demons) {
  return demons.map((d) => d.id).filter((id) => vitalityOf(world, id).alive);
}

// tick(state, intent, opts) — one turn. `intent` is { forward, strafe, turn, fire } (fire is a boolean
// edge — one shot per truthy fire). Returns a NEW state + the projected frame + a per-tick report.
export function tick(state, intent = {}, opts = {}) {
  const t = opts.t ?? state.phase + 1; // the time-stamp for rows appended THIS tick (strictly rising)
  let world = state.world;
  const passOpts = { passContested: state.passContested };

  // 1. resolve the player's MOVE against the arena grid (contested walls phase-walkable by passOpts).
  const g0 = grid(world, passOpts);
  const { player: moved } = applyIntent(g0, state.player, intent, passOpts);

  // 2. resolve the player's FIRE into EVIDENCE: a hitscan shot that, if it lands, appends a wound row.
  const ids = liveDemons(world, state.demons);
  let shot = { fired: false, landed: false, demonId: null, rows: [] };
  if (intent.fire) {
    shot = shoot(world, g0, moved, ids, t, opts);
    for (const r of shot.rows) world = admitLog(world, r.e, [r]).world;
  }

  // 3. run each LIVE demon's chase: step toward the player (collision against the arena), append the new
  //    position (functional `at`). A demon whose body reaches the player's tile CONTESTS that voxel —
  //    files BOTH faces (solid AND not-solid) for the player's cell, folding it to ⊤: the demon's grasp
  //    is a held contradiction, a shivering wall on top of you. `hurt` counts those grasp-ticks (audit).
  const demonReports = [];
  let grasped = false;
  for (const id of liveDemons(world, state.demons)) {
    const from = positionOf(world, id);
    if (!from) continue;
    const speed = speedOf(world, id);
    const want = chaseStep(from, { x: moved.x, z: moved.z }, speed);
    // collide the demon against the arena so it cannot walk through settled walls either.
    const gNow = grid(world, passOpts);
    const { body } = bodyMove(gNow, { x: from.x, z: from.z, radius: 0.3 }, want.x - from.x, want.z - from.z, passOpts);
    world = admitLog(world, demonKey(id), [demonMove(id, body.x, body.z, t)]).world;
    const reach = Math.hypot(moved.x - body.x, moved.z - body.z);
    let contested = false;
    if (reach < 0.6) {
      grasped = true;
      contested = true;
      const cell = cellKey(moved.x, moved.z);
      world = admitLog(world, cell, [predicate(cell, "solid", `grasp@demon:${id}`, t)]).world;
      world = admitLog(world, cell, [deny(cell, "solid", `grasp@demon:${id}`, t + 0.5)]).world;
    }
    const vit = vitalityOf(world, id);
    demonReports.push({ id, vital: vit.vital, wounds: vit.wounds, at: { x: body.x, z: body.z }, reach, contested });
  }

  const player = { ...moved, hurt: moved.hurt + (grasped ? 1 : 0) };

  // 4. re-grid (demon grasps may have contested the player's tile) and PROJECT the 3D frame.
  const phase = state.phase + 1;
  const g = grid(world, passOpts);
  const cam = camera({
    ...state.cam, x: player.x, z: player.z, angle: player.angle,
    width: opts.width ?? state.cam.width, height: opts.height ?? state.cam.height,
  });
  const frame = render(g, cam, { phase });

  const report = { t, phase, shot, demons: demonReports, grasped, census: frame.census };
  return {
    ...state, world, player, phase, frame, camera: cam,
    report, log: [...state.log, report],
  };
}

// status(state) — the calm audit line: how many demons hunt, how many are WOUNDED (held ⊤), the arena's
// contested-wall count, and the player's hurt. Calm by default; the ⊤ counts are the headline a player
// reads on demand. Pure.
export function status(state) {
  const vits = state.demons.map((d) => vitalityOf(state.world, d.id));
  const hunting = vits.filter((v) => v.alive).length;
  const wounded = vits.filter((v) => v.vital === VITAL.WOUNDED).length;
  const dead = vits.filter((v) => v.vital === VITAL.DEAD).length;
  return {
    hunting, wounded, dead,
    contestedWalls: contestedWalls(state.world).length,
    arena: census(state.world),
    hurt: state.player.hurt,
  };
}

// run({ game, intentAt, onFrame, interval, ticks }) — the realtime driver: tick on an interval, hand each
// frame to onFrame, intent from intentAt(state, n). The ONLY timer; everything it calls is pure.
export function run({ game: state, intentAt, onFrame, interval = 90, ticks = Infinity, width, height }) {
  return new Promise((resolve) => {
    let s = state, n = 0;
    const step = () => {
      const intent = intentAt ? intentAt(s, n) : {};
      s = tick(s, intent, { width, height });
      const cont = onFrame ? onFrame(s.frame, s) : true;
      n += 1;
      if (cont === false || n >= ticks) { resolve(s); return; }
      setTimeout(step, interval);
    };
    step();
  });
}

export { grid, render, camera, FOUR, vitalityOf, positionOf, status as audit };
