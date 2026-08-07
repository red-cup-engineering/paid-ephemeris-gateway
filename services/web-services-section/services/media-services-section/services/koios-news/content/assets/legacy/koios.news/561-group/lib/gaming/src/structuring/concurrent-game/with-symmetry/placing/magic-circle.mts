/**
 * The magic circle (Huizinga 1938).
 *
 * Johan Huizinga, *Homo Ludens* (1938), names the *magic circle*: the bounded
 * space — physical or conceptual — within which play takes place, where special
 * rules apply and ordinary consequences are suspended.  In the corpus the magic
 * circle is realized algebraically: "Huizinga's magic circle IS fiber
 * composition" — entering the game composes your fiber with the game-world's,
 * and the circle is the *entity-fiber boundary* (sociology/questions,
 * girard-caillois-substrate-correspondence).
 *
 * Here the circle is drawn on an arena: a set of inside event ids marks the
 * in-play region, and the rest of the arena is the outside.  The inside is a
 * genuine sub-event-structure only when it is *down-closed* — every cause of an
 * inside event is itself inside (you cannot be mid-game on a move whose
 * prerequisites lie outside the circle).  Down-closure alone is the witness;
 * conflict-freeness is NOT required (a sub-structure is not a position).  The
 * boundary is the set of inside events whose causes or consequences cross out.
 */
import {
  type Arena,
  arenaEvents,
  causes,
  downSet,
  eventIds,
} from "../index.mjs";

export interface MagicCircle {
  readonly kind: "game-geometry.magicCircle";
  readonly arena: Arena;
  /** The in-play event ids — inside the circle. */
  readonly inside: readonly string[];
  /** The arena events outside the circle. */
  readonly outside: readonly string[];
  /** Inside events with a cause or consequence crossing the boundary. */
  readonly boundary: readonly string[];
}

const sortIds = (ids: Iterable<string>): readonly string[] =>
  Object.freeze([...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));

/**
 * Draw a magic circle on an arena from the in-play event ids.  Unknown ids are
 * silently ignored (they are not arena events, hence not in any circle); the
 * outside is every arena event not inside, and the boundary is the crossing
 * layer.
 */
export function magicCircle(arena: Arena, insideIds: readonly string[]): MagicCircle {
  const all = eventIds(arena.structure);
  const known = new Set(all);
  const inside = new Set([...insideIds].filter((id) => known.has(id)));
  const outside = all.filter((id) => !inside.has(id));
  const structure = arena.structure;
  const boundary = [...inside].filter((id) =>
    outside.some((other) => causes(structure, other, id) || causes(structure, id, other)));
  return Object.freeze({
    kind: "game-geometry.magicCircle" as const,
    arena,
    inside: sortIds(inside),
    outside: sortIds(outside),
    boundary: sortIds(boundary),
  });
}

export interface MagicCircleWitness {
  readonly kind: "game-geometry.magicCircle:witness";
  readonly inside: readonly string[];
}

export interface MagicCircleObstruction {
  readonly kind: "game-geometry.magicCircle-obstruction";
  readonly reason: "unknown-event" | "not-down-closed";
  /** `[cause, inside]` — the cause that lies outside the circle, or `[id, id]` for an unknown event. */
  readonly offending: readonly [string, string];
}

export type MagicCircleJudgment = MagicCircleWitness | MagicCircleObstruction;

/**
 * Judge whether the inside of a circle is a sub-event-structure: every inside
 * id is a known arena event, and the inside is down-closed under causality.
 * Conflict-freeness is deliberately not required.
 */
export function magicCircleJudgment(circle: MagicCircle): MagicCircleJudgment {
  const structure = circle.arena.structure;
  const present = new Set(circle.inside);
  for (const id of circle.inside) {
    if (eventIds(structure).indexOf(id) === -1) {
      return Object.freeze({
        kind: "game-geometry.magicCircle-obstruction" as const,
        reason: "unknown-event" as const,
        offending: Object.freeze([id, id] as const),
      });
    }
  }
  for (const id of circle.inside) {
    for (const cause of downSet(structure, id)) {
      if (!present.has(cause)) {
        return Object.freeze({
          kind: "game-geometry.magicCircle-obstruction" as const,
          reason: "not-down-closed" as const,
          offending: Object.freeze([cause, id] as const),
        });
      }
    }
  }
  return Object.freeze({ kind: "game-geometry.magicCircle:witness" as const, inside: circle.inside });
}

/** Whether the inside of the circle is a down-closed sub-event-structure. */
export function isMagicCircleClosed(circle: MagicCircle): boolean {
  return magicCircleJudgment(circle).kind === "game-geometry.magicCircle:witness";
}

/** The magic circle of the whole arena — every event is in play, no boundary crossings. */
export const wholeArenaCircle = (arena: Arena): MagicCircle =>
  magicCircle(arena, arenaEvents(arena).map((e) => e.id));

export function isMagicCircle(value: unknown): value is MagicCircle {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<MagicCircle>;
  return candidate.kind === "game-geometry.magicCircle"
    && Array.isArray(candidate.inside)
    && Array.isArray(candidate.outside)
    && Array.isArray(candidate.boundary);
}
