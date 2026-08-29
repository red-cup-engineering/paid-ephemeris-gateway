/**
 * `lightcone` -- the two progress concepts, kept strictly separate (self-education-platform-
 * design.md §7) so nothing is ever destructively lost.
 *
 * Vendored verbatim from `lantern-service/src/lightcone.mts` (platform §9 step 1: already
 * theme-neutral, declared as platform surface, no code moves), generalized only in field naming
 * (`ReviewCard` -> the platform's `PlayerExerciseState`-shaped input; see checker.mts/session.mts
 * for how a theme's `GateExercise` plus per-player SRS state supplies this module's inputs).
 *
 * Territory revealed is derived, not separately stored: a room counts as revealed iff at least
 * one of its exercises has ever been reviewed (`lastReviewedAt !== undefined`). Since
 * `srs.reviewCard` only ever *sets* `lastReviewedAt` going forward, never clears it, this is
 * monotonic by construction.
 *
 * The light cone is the currently-walkable frontier, computed fresh from exercise state at a
 * given `now` -- "computed on read, no cron job needed." A room with no incoming door of any kind
 * is always walkable, gated or not.
 */
import type { Door, Hall, Room, RoomId, LightStage } from './types.mts';
import { recallProbability, STAGE_CUTS } from './srs.mts';
import { STABLE_HALL_BONUS } from './stability.mts';

/** The minimum shape `roomLightStates`/`computeLightCone` need per exercise -- an exercise's
 * `roomId` plus its current SRS card state. Deliberately structural, not `import type`-coupled to
 * any one theme's `GateExercise`, so this module stays theme-neutral. */
export interface ExerciseLightInput {
  roomId: RoomId;
  stability: number;
  lastReviewedAt?: number;
}

export function classifyStage(R: number): LightStage {
  if (R >= STAGE_CUTS.full) return 'full';
  if (R >= STAGE_CUTS.embers) return 'embers';
  if (R >= STAGE_CUTS.dim) return 'dim';
  return 'fogged';
}

/** A room has never been gated yet: no exercise of its has been reviewed. Such a room carries no
 * light of its own -- it must be reached via the light cone from without, same as a fogged one,
 * but it is not "forgotten" (nothing to forget yet), so it is reported separately. */
export type RoomLightState = { gated: false } | { gated: true; R: number; stage: LightStage };

/** Rooms with zero incoming doors of any weight -- the map's always-open entry points. */
export function rootRooms(rooms: readonly Room[], doors: readonly Door[]): Set<RoomId> {
  const hasIncoming = new Set<RoomId>();
  for (const d of doors) hasIncoming.add(d.to);
  const roots = new Set<RoomId>();
  for (const r of rooms) if (!hasIncoming.has(r.id)) roots.add(r.id);
  return roots;
}

/** Every room whose gate has ever been passed -- permanent, monotonic, never shrinks. */
export function revealedTerritory(exercises: readonly ExerciseLightInput[]): Set<RoomId> {
  const out = new Set<RoomId>();
  for (const c of exercises) if (c.lastReviewedAt !== undefined) out.add(c.roomId);
  return out;
}

function hallBonusByRoom(halls: readonly Hall[]): Map<RoomId, number> {
  const bonus = new Map<RoomId, number>();
  for (const h of halls) {
    if (!h.stable) continue;
    for (const roomId of h.rooms) bonus.set(roomId, STABLE_HALL_BONUS);
  }
  return bonus;
}

/** Per-room light state at `now`: aggregates that room's exercises by the weakest link (minimum
 * `R`) -- a room is only as lit as its least-remembered exercise. */
export function roomLightStates(
  rooms: readonly Room[],
  exercises: readonly ExerciseLightInput[],
  halls: readonly Hall[],
  now: number,
): Map<RoomId, RoomLightState> {
  const bonus = hallBonusByRoom(halls);
  const exercisesByRoom = new Map<RoomId, ExerciseLightInput[]>();
  for (const c of exercises) {
    const list = exercisesByRoom.get(c.roomId) ?? [];
    list.push(c);
    exercisesByRoom.set(c.roomId, list);
  }

  const out = new Map<RoomId, RoomLightState>();
  for (const room of rooms) {
    const roomExercises = exercisesByRoom.get(room.id) ?? [];
    const reviewed = roomExercises.filter((c) => c.lastReviewedAt !== undefined);
    if (reviewed.length === 0) {
      out.set(room.id, { gated: false });
      continue;
    }
    const effectiveBonus = bonus.get(room.id) ?? 1;
    let minR = 1;
    for (const c of roomExercises) {
      if (c.lastReviewedAt === undefined) {
        minR = Math.min(minR, 0);
        continue;
      }
      const t = Math.max(0, now - c.lastReviewedAt);
      const effectiveS = c.stability * effectiveBonus;
      minR = Math.min(minR, recallProbability(t, effectiveS));
    }
    out.set(room.id, { gated: true, R: minR, stage: classifyStage(minR) });
  }
  return out;
}

export interface LightCone {
  states: Map<RoomId, RoomLightState>;
  reachable: Set<RoomId>;
}

/**
 * The reachable frontier at `now`: root rooms, plus a fixpoint expansion following doors whose
 * source room is currently full-light or embers.
 */
export function computeLightCone(
  rooms: readonly Room[],
  doors: readonly Door[],
  exercises: readonly ExerciseLightInput[],
  halls: readonly Hall[],
  now: number,
): LightCone {
  const states = roomLightStates(rooms, exercises, halls, now);
  const reachable = rootRooms(rooms, doors);

  let changed = true;
  while (changed) {
    changed = false;
    for (const d of doors) {
      if (reachable.has(d.to)) continue;
      if (!reachable.has(d.from)) continue;
      const srcState = states.get(d.from);
      if (srcState?.gated && (srcState.stage === 'full' || srcState.stage === 'embers')) {
        reachable.add(d.to);
        changed = true;
      }
    }
  }

  return { states, reachable };
}
