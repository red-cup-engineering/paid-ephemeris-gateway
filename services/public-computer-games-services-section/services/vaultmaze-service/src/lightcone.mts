/**
 * `lightcone` — the two progress concepts, kept strictly separate (DESIGN.md §2) so nothing is
 * ever destructively lost.
 *
 * Territory revealed is derived, not separately stored: a room counts as revealed iff at least
 * one of its cards has ever been reviewed (`lastReviewedAt !== undefined`). Since
 * `srs.reviewCard` only ever *sets* `lastReviewedAt` going forward, never clears it, this is
 * monotonic by construction — there is no separate "revealed" ledger to keep in sync or
 * accidentally roll back.
 *
 * The light cone is the currently-walkable frontier, computed fresh from card state at a given
 * `now` — DESIGN.md's "computed on read, no cron job needed." A room with no incoming door of
 * any kind (its degree-0-as-`to` "map roots") is always walkable, gated or not — a design gap
 * DESIGN.md leaves open (it never states how a brand-new player reaches the very first room);
 * treating true roots as always-open is this module's disclosed way of filling it. From there,
 * a door's target becomes walkable once the door's source room is full-light or embers.
 */
import type { Door, Hall, ReviewCard, Room, RoomId, LightStage } from './types.mts';
import { recallProbability, STAGE_CUTS } from './srs.mts';
import { STABLE_HALL_BONUS } from './stability.mts';
import { classifyStage } from '@red-cup-engineering/education-platform-service/lightcone';
export { classifyStage };

/** A room has never been gated yet: no card of its has been reviewed. Such a room carries no
 * light of its own — it must be reached via the light cone from without, same as a fogged one,
 * but it is not "forgotten" (nothing to forget yet), so it is reported separately. */
export type RoomLightState = { gated: false } | { gated: true; R: number; stage: LightStage };

/** Rooms with zero incoming doors of any weight — the map's always-open entry points. */
export function rootRooms(rooms: readonly Room[], doors: readonly Door[]): Set<RoomId> {
  const hasIncoming = new Set<RoomId>();
  for (const d of doors) hasIncoming.add(d.to);
  const roots = new Set<RoomId>();
  for (const r of rooms) if (!hasIncoming.has(r.id)) roots.add(r.id);
  return roots;
}

/** Every room whose gate has ever been passed — permanent, monotonic, never shrinks. */
export function revealedTerritory(cards: readonly ReviewCard[]): Set<RoomId> {
  const out = new Set<RoomId>();
  for (const c of cards) if (c.lastReviewedAt !== undefined) out.add(c.roomId);
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

/** Per-room light state at `now`: aggregates that room's cards by the weakest link (minimum
 * `R`) — a room is only as lit as its least-remembered card. A card belonging to a gated room
 * that has somehow never been reviewed contributes `R = 0` defensively (gate-passing clears
 * every card once, so this should not occur, but the aggregation does not assume it). */
export function roomLightStates(
  rooms: readonly Room[],
  cards: readonly ReviewCard[],
  halls: readonly Hall[],
  now: number,
): Map<RoomId, RoomLightState> {
  const bonus = hallBonusByRoom(halls);
  const cardsByRoom = new Map<RoomId, ReviewCard[]>();
  for (const c of cards) {
    const list = cardsByRoom.get(c.roomId) ?? [];
    list.push(c);
    cardsByRoom.set(c.roomId, list);
  }

  const out = new Map<RoomId, RoomLightState>();
  for (const room of rooms) {
    const roomCards = cardsByRoom.get(room.id) ?? [];
    const reviewed = roomCards.filter((c) => c.lastReviewedAt !== undefined);
    if (reviewed.length === 0) {
      out.set(room.id, { gated: false });
      continue;
    }
    const effectiveBonus = bonus.get(room.id) ?? 1;
    let minR = 1;
    for (const c of roomCards) {
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
 * source room is currently full-light or embers. DESIGN.md §2: "lit-or-embers rooms plus the
 * doors that originate from them"; dim/fogged rooms drop targets beyond them out of the cone
 * without erasing their revealed-territory status.
 */
export function computeLightCone(
  rooms: readonly Room[],
  doors: readonly Door[],
  cards: readonly ReviewCard[],
  halls: readonly Hall[],
  now: number,
): LightCone {
  const states = roomLightStates(rooms, cards, halls, now);
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
