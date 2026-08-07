/**
 * The magic-circle boundary as a closure-regime change (Huizinga 1938).
 *
 * `magic-circle.mts` draws Huizinga's circle on an arena and witnesses (via
 * down-closure) that the inside is a sub-event-structure.  This module enriches
 * that boundary into the full Huizinga apparatus the corpus's
 * girard-caillois-substrate-correspondence demands, realizing the three
 * defining marks of *play* (magic-circle journal, 2026-05-24):
 *
 *   1. **Bounded / sub-arena.** The inside is not merely a down-closed set of
 *      ids but an actual restricted prime event structure — and, with its
 *      identity symmetry, an actual *sub-arena*.  Down-closure (the existing
 *      `magicCircleJudgment`) is exactly the gate that makes the restriction a
 *      valid PES, so the inside sub-arena exists iff the circle is closed.
 *
 *   2. **Voluntary.** Entry is not causally *forced*.  In a prime event
 *      structure nothing is ever forced (causality is "may not occur until
 *      causes have", never "must"), so "forced entry" cannot be a causal-
 *      incidence notion — it is a *polarity* notion.  Negative/Opponent events
 *      are the environment's moves; positive/Proponent events are the player's
 *      free choice (corpus: positive ↔ $t$ ↔ Proponent ↔ the lusory attitude).
 *      Entry is *voluntary* when the boundary's entry points — the minimal
 *      inside events — are positive, i.e. the player chooses to cross in rather
 *      than being dragged in by an Opponent move.  This is orthogonal to
 *      down-closure.
 *
 *   3. **Rule-suspending.** Crossing the boundary suspends ordinary rules: a
 *      *boundary-crossing* carries a commitment across the circle's edge, and
 *      where the in-game value $t$ meets the ordinary-life value $f$ the
 *      knowledge join is $\top$ = `stable` (Salen–Zimmerman 2003 / Geertz 1972
 *      "deep play"; magic-circle journal "porous boundary as the four-bilattice's
 *      $\top$ at the boundary").  A $\top$ at the edge is the algebraic signature
 *      of the closure-regime change — ordinary consequences re-enter the game.
 */
import {
  type Arena,
  type Event,
  type PrimeEventStructure,
  arenaEvents,
  causes,
  discreteArena,
  eventById,
  eventStructure,
  positive,
  samePolarity,
} from "../index.mjs";
import {
  type ChargeValue,
  chargeValue,
  joinKnowledgeValue,
  sameChargeValue,
} from "@emsenn/relating";
import {
  type MagicCircle,
  magicCircle,
  magicCircleJudgment,
} from "./magic-circle.mjs";

const sortIds = (ids: Iterable<string>): readonly string[] =>
  Object.freeze([...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));

// ─── Sub-arena: the inside as a restricted prime event structure ──────────────

/**
 * Restrict a prime event structure to a set of event ids, keeping only the
 * causality and conflict edges both of whose endpoints survive.  When the set
 * is down-closed this restriction is itself a valid PES (every cause of a kept
 * event is kept); on a non-down-closed set the result still type-checks but is
 * not guaranteed to be a configuration domain — callers gate with
 * `magicCircleJudgment` first.
 */
export function restrictStructure(
  structure: PrimeEventStructure,
  ids: readonly string[],
): PrimeEventStructure {
  const keep = new Set(ids);
  const events: Event[] = structure.events.filter((e) => keep.has(e.id));
  const causality = structure.causality.filter(([a, b]) => keep.has(a) && keep.has(b));
  const conflict = structure.conflict.filter(([a, b]) => keep.has(a) && keep.has(b));
  return eventStructure(events, causality, conflict);
}

export interface SubArenaWitness {
  readonly kind: "game-geometry.subArena:witness";
  /** The inside as a restricted prime event structure. */
  readonly inside: PrimeEventStructure;
  /** The inside promoted to a (discrete) sub-arena. */
  readonly arena: Arena;
}

export interface SubArenaObstruction {
  readonly kind: "game-geometry.subArena-obstruction";
  readonly reason: "unknown-event" | "not-down-closed";
  /** `[cause, inside]` — the outside cause and the inside event it feeds. */
  readonly offending: readonly [string, string];
}

export type SubArenaJudgment = SubArenaWitness | SubArenaObstruction;

/**
 * Judge whether the inside of a circle is a genuine sub-*arena*.  Reuses
 * `magicCircleJudgment` for the down-closure gate (item 1's witness condition);
 * on success the inside is restricted to a real PES and given the identity
 * symmetry via `discreteArena`.
 */
export function subArenaJudgment(circle: MagicCircle): SubArenaJudgment {
  const judgment = magicCircleJudgment(circle);
  if (judgment.kind !== "game-geometry.magicCircle:witness") {
    return Object.freeze({
      kind: "game-geometry.subArena-obstruction" as const,
      reason: judgment.reason,
      offending: judgment.offending,
    });
  }
  const inside = restrictStructure(circle.arena.structure, circle.inside);
  return Object.freeze({
    kind: "game-geometry.subArena:witness" as const,
    inside,
    arena: discreteArena(inside),
  });
}

/** Whether the inside of the circle is a genuine (down-closed) sub-arena. */
export const isSubArena = (circle: MagicCircle): boolean =>
  subArenaJudgment(circle).kind === "game-geometry.subArena:witness";

// ─── Voluntary entry: the boundary's entry points are positive ────────────────

/**
 * The *entry points* of a circle: the minimal inside events — inside events
 * none of whose strict causes is also inside.  These are the moves by which a
 * player first crosses into the circle; everything else inside is reachable
 * only after an entry point has occurred.
 */
export function entryPoints(circle: MagicCircle): readonly string[] {
  const structure = circle.arena.structure;
  const inside = new Set(circle.inside);
  const minimal = circle.inside.filter((id) =>
    !circle.inside.some((other) => other !== id && causes(structure, other, id) && inside.has(other)));
  return sortIds(minimal);
}

export interface VoluntaryWitness {
  readonly kind: "game-geometry.voluntary:witness";
  /** The positive (Proponent) entry points the player freely crosses through. */
  readonly entryPoints: readonly string[];
}

export interface VoluntaryObstruction {
  readonly kind: "game-geometry.voluntary-obstruction";
  readonly reason: "forced-entry" | "unknown-event";
  /** The entry point whose polarity is negative (Opponent-forced), or an unknown id. */
  readonly offending: string;
}

export type VoluntaryJudgment = VoluntaryWitness | VoluntaryObstruction;

/**
 * Judge whether entry into the circle is *voluntary*: every entry point is a
 * positive (Proponent) event, so the player chooses to enter rather than being
 * forced in by an Opponent move.  Orthogonal to down-closure — a circle can be
 * a sub-arena with forced entry, or voluntary without being down-closed.
 */
export function voluntaryJudgment(circle: MagicCircle): VoluntaryJudgment {
  const structure = circle.arena.structure;
  const pos = positive();
  for (const id of entryPoints(circle)) {
    const ev = eventById(structure, id);
    if (ev === null) {
      return Object.freeze({
        kind: "game-geometry.voluntary-obstruction" as const,
        reason: "unknown-event" as const,
        offending: id,
      });
    }
    if (!samePolarity(ev.polarity, pos)) {
      return Object.freeze({
        kind: "game-geometry.voluntary-obstruction" as const,
        reason: "forced-entry" as const,
        offending: id,
      });
    }
  }
  return Object.freeze({
    kind: "game-geometry.voluntary:witness" as const,
    entryPoints: entryPoints(circle),
  });
}

/** Whether entry into the circle is voluntary (no Opponent-forced entry point). */
export const isVoluntary = (circle: MagicCircle): boolean =>
  voluntaryJudgment(circle).kind === "game-geometry.voluntary:witness";

// ─── Rule-suspension: the boundary-crossing ⊤ ─────────────────────────────────

const stable: ChargeValue = chargeValue("stable");

export interface BoundaryCrossing {
  readonly kind: "game-geometry.boundaryCrossing";
  /** The inside (in-game) event whose commitment crosses out. */
  readonly inside: string;
  /** The outside (ordinary-life) event the commitment maps to. */
  readonly outside: string;
  /** The in-game charge and the ordinary-life charge, joined in knowledge. */
  readonly joined: ChargeValue;
}

export interface RuleSuspensionWitness {
  readonly kind: "game-geometry.ruleSuspension:witness";
  /** The boundary-crossings whose knowledge join lands on $\top$ = `stable`. */
  readonly crossings: readonly BoundaryCrossing[];
}

export interface RuleSuspensionObstruction {
  readonly kind: "game-geometry.ruleSuspension-obstruction";
  readonly reason: "no-paraconsistent-crossing";
}

export type RuleSuspensionJudgment = RuleSuspensionWitness | RuleSuspensionObstruction;

/**
 * A boundary-crossing carrier: an in-game commitment (`insideCharge`) on an
 * inside event meeting an ordinary-life commitment (`outsideCharge`) on the
 * outside event it maps to, with their knowledge join recorded.  When the two
 * disagree ($t$ in-game, $f$ in ordinary life) the join is $\top$ = `stable` —
 * the porous-boundary $\top$ of Geertz's deep play.
 */
export function boundaryCrossing(
  inside: string,
  outside: string,
  insideCharge: ChargeValue,
  outsideCharge: ChargeValue,
): BoundaryCrossing {
  return Object.freeze({
    kind: "game-geometry.boundaryCrossing" as const,
    inside,
    outside,
    joined: joinKnowledgeValue(insideCharge, outsideCharge),
  });
}

/** Whether a boundary-crossing reaches $\top$ = `stable` — real consequences re-enter the game. */
export const isParaconsistentCrossing = (crossing: BoundaryCrossing): boolean =>
  sameChargeValue(crossing.joined, stable);

/**
 * Judge whether a set of boundary-crossings suspends ordinary rules: at least
 * one crossing lands on $\top$ = `stable`, the closure-regime change that
 * re-admits ordinary consequences into the circle (magic-circle journal,
 * "porous boundary as the four-bilattice's $\top$").  An empty or all-agreeing
 * set leaves the circle hermetic — an obstruction to rule-suspension.
 */
export function ruleSuspensionJudgment(
  crossings: readonly BoundaryCrossing[],
): RuleSuspensionJudgment {
  const paraconsistent = crossings.filter(isParaconsistentCrossing);
  if (paraconsistent.length === 0) {
    return Object.freeze({
      kind: "game-geometry.ruleSuspension-obstruction" as const,
      reason: "no-paraconsistent-crossing" as const,
    });
  }
  return Object.freeze({
    kind: "game-geometry.ruleSuspension:witness" as const,
    crossings: Object.freeze([...paraconsistent]),
  });
}

// ─── The boundary carrier: all three Huizinga marks together ──────────────────

export interface MagicCircleBoundary {
  readonly kind: "game-geometry.magicCircleBoundary";
  readonly circle: MagicCircle;
  /** The inside as a sub-arena, or the obstruction barring it. */
  readonly subArena: SubArenaJudgment;
  /** Whether entry is voluntary (positive entry points). */
  readonly voluntary: VoluntaryJudgment;
}

/**
 * Draw the full Huizinga boundary on an arena from the in-play ids: the magic
 * circle, the sub-arena judgment (bounded), and the voluntary judgment.  The
 * rule-suspension judgment is taken separately, over boundary-crossings the
 * caller supplies, because the in-game/ordinary-life commitments are data about
 * a *play*, not about the circle's geometry.
 */
export function magicCircleBoundary(arena: Arena, insideIds: readonly string[]): MagicCircleBoundary {
  const circle = magicCircle(arena, insideIds);
  return Object.freeze({
    kind: "game-geometry.magicCircleBoundary" as const,
    circle,
    subArena: subArenaJudgment(circle),
    voluntary: voluntaryJudgment(circle),
  });
}

/**
 * Whether the boundary realizes *play* in Huizinga's sense: bounded (a genuine
 * sub-arena) AND voluntary (no forced entry).  Rule-suspension is play's third
 * mark but is a property of a crossing-bearing play, not of the bare boundary.
 */
export const isPlayBoundary = (boundary: MagicCircleBoundary): boolean =>
  boundary.subArena.kind === "game-geometry.subArena:witness"
  && boundary.voluntary.kind === "game-geometry.voluntary:witness";

/** The whole-arena boundary — every event in play. */
export const wholeArenaBoundary = (arena: Arena): MagicCircleBoundary =>
  magicCircleBoundary(arena, arenaEvents(arena).map((e) => e.id));

export function isMagicCircleBoundary(value: unknown): value is MagicCircleBoundary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<MagicCircleBoundary>;
  return candidate.kind === "game-geometry.magicCircleBoundary"
    && typeof candidate.circle === "object" && candidate.circle !== null
    && typeof candidate.subArena === "object" && candidate.subArena !== null
    && typeof candidate.voluntary === "object" && candidate.voluntary !== null;
}
