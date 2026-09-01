/**
 * `lightcone` — browser port of `src/lightcone.mts` (DESIGN.md §2). See `srs.js`'s header for
 * why this is a transliteration rather than an import, and `web/test/parity.test.mts` for the
 * cross-check against the real engine module.
 *
 * Territory revealed is derived, not separately stored: a room counts as revealed iff at
 * least one of its cards has ever been reviewed. The light cone is the currently-walkable
 * frontier, computed fresh from card state at a given `now`.
 */
import { recallProbability, STAGE_CUTS } from './srs.js';

/** Vendored constant, `src/stability.mts`'s `STABLE_HALL_BONUS` — DESIGN.md §4's reversible
 * bonus: while a hall is stable, every room in it gets its *effective* stability multiplied by
 * this when computing dimming schedules. The raw stored `S` is never touched. */
export const STABLE_HALL_BONUS = 1.25;

export function classifyStage(R) {
  if (R >= STAGE_CUTS.full) return 'full';
  if (R >= STAGE_CUTS.embers) return 'embers';
  if (R >= STAGE_CUTS.dim) return 'dim';
  return 'fogged';
}

/** Rooms with zero incoming doors of any weight — the map's always-open entry points. */
export function rootRooms(rooms, doors) {
  const hasIncoming = new Set();
  for (const d of doors) hasIncoming.add(d.to);
  const roots = new Set();
  for (const r of rooms) if (!hasIncoming.has(r.id)) roots.add(r.id);
  return roots;
}

/** Every room whose gate has ever been passed — permanent, monotonic, never shrinks. */
export function revealedTerritory(cards) {
  const out = new Set();
  for (const c of cards) if (c.lastReviewedAt !== undefined) out.add(c.roomId);
  return out;
}

function hallBonusByRoom(halls) {
  const bonus = new Map();
  for (const h of halls) {
    if (!h.stable) continue;
    for (const roomId of h.rooms) bonus.set(roomId, STABLE_HALL_BONUS);
  }
  return bonus;
}

/** Per-room light state at `now`: aggregates a room's cards by the weakest link (min `R`). */
export function roomLightStates(rooms, cards, halls, now) {
  const bonus = hallBonusByRoom(halls);
  const cardsByRoom = new Map();
  for (const c of cards) {
    const list = cardsByRoom.get(c.roomId) ?? [];
    list.push(c);
    cardsByRoom.set(c.roomId, list);
  }

  const out = new Map();
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

/**
 * The reachable frontier at `now`: root rooms, plus a fixpoint expansion following doors whose
 * source room is currently full-light or embers.
 */
export function computeLightCone(rooms, doors, cards, halls, now) {
  const states = roomLightStates(rooms, cards, halls, now);
  const reachable = rootRooms(rooms, doors);

  let changed = true;
  while (changed) {
    changed = false;
    for (const d of doors) {
      if (reachable.has(d.to)) continue;
      if (!reachable.has(d.from)) continue;
      const srcState = states.get(d.from);
      if (srcState && srcState.gated && (srcState.stage === 'full' || srcState.stage === 'embers')) {
        reachable.add(d.to);
        changed = true;
      }
    }
  }

  return { states, reachable };
}
