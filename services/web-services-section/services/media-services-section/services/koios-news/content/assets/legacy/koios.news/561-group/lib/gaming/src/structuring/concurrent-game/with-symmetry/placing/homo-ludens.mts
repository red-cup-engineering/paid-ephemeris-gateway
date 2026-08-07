/**
 * Homo ludens — the player IS magic-circle participation (Huizinga 1938).
 *
 * Huizinga's *Homo Ludens* names the human as the *playing* animal; the corpus
 * (homo-ludens journal, 2026-05-24) lifts this from a species claim to a
 * structural one: "any entity participating in cultural-ludic structures is
 * participating in the predication-fiber algebra qua ludic substrate" — the
 * player is *defined* by participation in a magic circle, not the other way
 * round.
 *
 * Here that structural claim is realized minimally and concretely.  A *player*
 * is a design (its commitments — `@emsenn/game-algebra`) together with the
 * magic circle it enters.  It is a genuine player — exhibits the *Homo ludens
 * characterization* — exactly when it actually participates: its support
 * commits inside the circle.  A design that commits only outside the circle is
 * a spectator, not a player; the empty design is no player at all.
 *
 * The deeper paidia-substrate / rule-accumulation machinery (HL1–HL3 of the
 * journal) lives in the closure engine of `@emsenn/game-topology`, not here;
 * this module realizes only the magic-circle-participation criterion, which is
 * the geometric heart of the thesis ("the player IS defined by magic-circle
 * participation").
 */
import {
  type Design,
  type Locus,
  locusFromKey,
  support,
  supportKeys,
} from "../index.mjs";
import {
  type MagicCircle,
} from "./magic-circle.mjs";

export interface Player {
  readonly kind: "game-geometry.player";
  /** The player's commitments. */
  readonly design: Design;
  /** The magic circle the player enters. */
  readonly circle: MagicCircle;
}

/** A player carrier: a design entering a magic circle. */
export function player(design: Design, circle: MagicCircle): Player {
  return Object.freeze({ kind: "game-geometry.player" as const, design, circle });
}

/**
 * The loci at which a player commits *inside* the circle — the participation
 * support.  A locus participates when its key matches an in-play event id of
 * the circle (the design's loci are addressed by the same keys as the arena's
 * events in the ludics correspondence).
 */
export function participationLoci(p: Player): readonly Locus[] {
  const inside = new Set(p.circle.inside);
  return Object.freeze(supportKeys(p.design).filter((key) => inside.has(key)).map((key) => locusFromKey(key)));
}

export interface HomoLudensWitness {
  readonly kind: "game-geometry.homoLudens:witness";
  /** The inside loci the player commits at — proof of participation. */
  readonly participation: readonly Locus[];
}

export interface HomoLudensObstruction {
  readonly kind: "game-geometry.homoLudens-obstruction";
  readonly reason: "no-commitments" | "no-inside-participation";
}

export type HomoLudensJudgment = HomoLudensWitness | HomoLudensObstruction;

/**
 * Judge whether the player exhibits the *Homo ludens characterization*: it has
 * commitments, and at least one of them lands inside the magic circle.  The
 * player IS its participation — a design committing only outside the circle is
 * a spectator (obstruction `no-inside-participation`); the empty design is no
 * player (obstruction `no-commitments`).
 */
export function homoLudensJudgment(p: Player): HomoLudensJudgment {
  if (support(p.design).length === 0) {
    return Object.freeze({
      kind: "game-geometry.homoLudens-obstruction" as const,
      reason: "no-commitments" as const,
    });
  }
  const participation = participationLoci(p);
  if (participation.length === 0) {
    return Object.freeze({
      kind: "game-geometry.homoLudens-obstruction" as const,
      reason: "no-inside-participation" as const,
    });
  }
  return Object.freeze({ kind: "game-geometry.homoLudens:witness" as const, participation });
}

/** Whether the player is a genuine player — participates inside the circle. */
export const isPlayer = (p: Player): boolean =>
  homoLudensJudgment(p).kind === "game-geometry.homoLudens:witness";

export function isPlayerCarrier(value: unknown): value is Player {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Player>;
  return candidate.kind === "game-geometry.player"
    && typeof candidate.design === "object" && candidate.design !== null
    && typeof candidate.circle === "object" && candidate.circle !== null;
}
