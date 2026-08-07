/**
 * The paidia↔ludus spectrum as a structured axis (Caillois 1958).
 *
 * `ludus.mts` measures *where* a structure sits on Caillois's spectrum — the
 * `ludusIndex`, the exact fraction of event pairs that are causally comparable,
 * a Rational in $[0, 1]$ with pure paidia at $0$ and pure ludus at $1$.  This
 * module turns that scalar into a *structured axis*: named bands (the corpus's
 * paidia / ludus journals make the spectrum a continuum, not a binary, so a
 * Caillois-faithful reading places a structure in a band rather than asserting
 * a sharp paidia/ludus dichotomy), and the four-categories × paidia-ludus grid.
 *
 * Bands (paidia journal §"paidia coexists within ludus"; ludus journal worked
 * examples — improv "near-paidia", RPG "moderate ludus", chess/athletics
 * "heavily ludus"):
 *
 *   - `pure-paidia`   fraction $= 0$        — free, concurrent, no sequencing
 *   - `near-paidia`   $0 < f \le 1/4$       — light ludus scaffolding (improv)
 *   - `balanced`      $1/4 < f < 3/4$       — paidia and ludus in tension (RPG)
 *   - `near-ludus`    $3/4 \le f < 1$       — heavily rule-bound (athletics)
 *   - `pure-ludus`    fraction $= 1$        — total order, every move sequenced
 *
 * The four Caillois modes (agon, alea, mimicry, ilinx) are *not* derived from
 * the event structure — the corpus's ludus journal says ludus "makes the four
 * categories most visible" but gives no structure→category recipe, so the
 * category is a *declared* coordinate, not a computed one.  The grid pairs a
 * declared category with a computed band: ludus journal "ludus clarifies the
 * Caillois modes" — the modes are most distinct at the ludus end.
 */
import {
  type PrimeEventStructure,
} from "../index.mjs";
import {
  type Rational,
  ratCompare,
} from "@emsenn/relating";
import { fromRatio } from "@emsenn/relating/codecs";
import {
  type LudusIndexJudgment,
  ludusIndex,
} from "./ludus.mjs";

export type PaidiaLudusBand =
  | "pure-paidia"
  | "near-paidia"
  | "balanced"
  | "near-ludus"
  | "pure-ludus";

/** The five bands of the axis, paidia-end first. */
export const paidiaLudusBands = (): readonly PaidiaLudusBand[] =>
  Object.freeze(["pure-paidia", "near-paidia", "balanced", "near-ludus", "pure-ludus"] as const);

const oneQuarter: Rational = fromRatio(1, 4);
const threeQuarters: Rational = fromRatio(3, 4);
const zero: Rational = fromRatio(0, 1);
const one: Rational = fromRatio(1, 1);

/**
 * Place an exact fraction in $[0, 1]$ into its band by exact Rational
 * comparison (no float rounding — house style is exact arithmetic):
 * $0$ → pure-paidia, $(0, 1/4]$ → near-paidia, $(1/4, 3/4)$ → balanced,
 * $[3/4, 1)$ → near-ludus, $1$ → pure-ludus.
 */
export function bandOfFraction(fraction: Rational): PaidiaLudusBand {
  if (ratCompare(fraction, zero) === 0) return "pure-paidia";
  if (ratCompare(fraction, one) === 0) return "pure-ludus";
  if (ratCompare(fraction, oneQuarter) <= 0) return "near-paidia";
  if (ratCompare(fraction, threeQuarters) >= 0) return "near-ludus";
  return "balanced";
}

export interface PaidiaLudusPlacement {
  readonly kind: "game-geometry.paidiaLudusPlacement";
  /** The underlying ludus index this placement was read from. */
  readonly index: LudusIndexJudgment;
  /** The exact comparable-pairs fraction in $[0, 1]$. */
  readonly fraction: Rational;
  /** The band the fraction falls in. */
  readonly band: PaidiaLudusBand;
}

export interface PaidiaLudusObstruction {
  readonly kind: "game-geometry.paidiaLudusPlacement-obstruction";
  /** Fewer than two events present no fraction, hence no band. */
  readonly eventCount: number;
}

export type PaidiaLudusJudgment = PaidiaLudusPlacement | PaidiaLudusObstruction;

/**
 * Place a structure on the paidia↔ludus axis: compute its `ludusIndex`, read
 * out the band.  A structure with fewer than two events has no fraction (the
 * `ludusIndex` obstruction) and therefore no band — that is an obstruction,
 * not a default to either pole.
 */
export function paidiaLudusPlacement(structure: PrimeEventStructure): PaidiaLudusJudgment {
  const index = ludusIndex(structure);
  if (index.kind === "game-geometry.ludusIndex-obstruction") {
    return Object.freeze({
      kind: "game-geometry.paidiaLudusPlacement-obstruction" as const,
      eventCount: index.eventCount,
    });
  }
  return Object.freeze({
    kind: "game-geometry.paidiaLudusPlacement" as const,
    index,
    fraction: index.fraction,
    band: bandOfFraction(index.fraction),
  });
}

/** The band of a structure, or `null` when fewer than two events present a fraction. */
export function bandOf(structure: PrimeEventStructure): PaidiaLudusBand | null {
  const judgment = paidiaLudusPlacement(structure);
  return judgment.kind === "game-geometry.paidiaLudusPlacement" ? judgment.band : null;
}

/** Whether the placement is on the free (paidia) half of the axis (fraction $< 1/2$). */
export const leansPaidia = (judgment: PaidiaLudusJudgment): boolean =>
  judgment.kind === "game-geometry.paidiaLudusPlacement"
  && ratCompare(judgment.fraction, fromRatio(1, 2)) < 0;

/** Whether the placement is on the rule-bound (ludus) half of the axis (fraction $> 1/2$). */
export const leansLudus = (judgment: PaidiaLudusJudgment): boolean =>
  judgment.kind === "game-geometry.paidiaLudusPlacement"
  && ratCompare(judgment.fraction, fromRatio(1, 2)) > 0;

// ─── The four Caillois categories × paidia-ludus grid ─────────────────────────

export type CailloisCategory = "agon" | "alea" | "mimicry" | "ilinx";

/**
 * The four Caillois modes: agon (competition), alea (chance), mimicry
 * (simulation), ilinx (vertigo).  Names only — the corpus gives no
 * structure→category derivation; the category is declared, not computed.
 */
export const cailloisCategories = (): readonly CailloisCategory[] =>
  Object.freeze(["agon", "alea", "mimicry", "ilinx"] as const);

export function isCailloisCategory(value: unknown): value is CailloisCategory {
  return value === "agon" || value === "alea" || value === "mimicry" || value === "ilinx";
}

export interface CailloisGridCell {
  readonly kind: "game-geometry.cailloisGridCell";
  /** The declared Caillois mode of this play. */
  readonly category: CailloisCategory;
  /** The computed band on the paidia↔ludus axis. */
  readonly band: PaidiaLudusBand;
  /**
   * Whether this mode is *clarified* here: ludus journal — the four modes
   * become most visible as the rule-system densifies, blurred at the paidia
   * pole.  True on the ludus half (near-ludus / pure-ludus).
   */
  readonly clarified: boolean;
}

const clarifiedBands = new Set<PaidiaLudusBand>(["near-ludus", "pure-ludus"]);

/**
 * Place a declared Caillois mode on the grid against a structure's computed
 * band.  `clarified` records the ludus-journal claim that the modes are most
 * distinct at the ludus end — `null` when the structure presents no band.
 */
export function cailloisGridCell(
  category: CailloisCategory,
  structure: PrimeEventStructure,
): CailloisGridCell | null {
  const band = bandOf(structure);
  if (band === null) return null;
  return Object.freeze({
    kind: "game-geometry.cailloisGridCell" as const,
    category,
    band,
    clarified: clarifiedBands.has(band),
  });
}

export function isPaidiaLudusPlacement(value: unknown): value is PaidiaLudusPlacement {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PaidiaLudusPlacement>;
  return candidate.kind === "game-geometry.paidiaLudusPlacement"
    && typeof candidate.band === "string";
}
