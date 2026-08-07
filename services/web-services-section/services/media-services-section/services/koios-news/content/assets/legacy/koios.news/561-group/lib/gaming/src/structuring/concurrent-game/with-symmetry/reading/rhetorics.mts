/**
 * Sutton-Smith's seven rhetorics of play — and play's constitutive ambiguity.
 *
 * Brian Sutton-Smith (1997, *The Ambiguity of Play*) argues that "play" is
 * essentialized by Western culture in seven *incompatible* ways — the seven
 * **rhetorics**: progress, fate, power, identity, imaginary, self, frivolity.
 * They are not seven aspects of one essence; each is a real meaning, none is the
 * whole, and asserting one suppresses the others (rhetorics-of-play journal
 * 2026-05-24).  On the substrate, each rhetoric is a distinct closure-rule
 * system $\mathcal{S}_{\mathrm{rhet}_i}$ / behaviour $\mathbf{B}_{\mathrm{rhet}_i}$,
 * and the seven behaviours are **mutually incompatible at the per-design level**:
 * a single design supports at most one rhetoric (journal, incompatibility
 * theorem).
 *
 * A cultural-ludic *activity*, however, hosts designs from *multiple* rhetorics
 * at once, and then "what rhetoric is this?" has no single answer: the activity
 * is in **meta-$\top$** — multiple rhetorics simultaneously asserted, the
 * bilattice value $\top$ (= `stable`, designated/paraconsistent) at the
 * meta-cells where they conflict (journal, $\top$-tension theorem; embedding
 * correspondence (9) and image-condition (I2)).  This is the algebraic content
 * of Sutton-Smith's central claim: play is *constitutively* ambiguous.
 *
 * We reuse the meme charge `stable` ($\top$) for the designated contradiction —
 * we do **not** derive $\top$ by joining per-rhetoric polarities (a knowledge
 * join of two non-$\top$ charges need not be $\top$).  When two or more distinct
 * rhetorics coexist, the activity's rhetorical charge *is* `stable` by the
 * journal's theorem; a single rhetoric is unambiguous (its own clean reading);
 * no rhetoric is `absurd` ($\bot$ — told nothing about what the play is).
 */

import {
  type ChargeValue,
  chargeValue,
  sameChargeValue,
} from "@emsenn/relating";

export type RhetoricName =
  | "progress"
  | "fate"
  | "power"
  | "identity"
  | "imaginary"
  | "self"
  | "frivolity";

/** The seven rhetorics, in Sutton-Smith's canonical order. */
export const rhetoricNames = (): readonly RhetoricName[] =>
  Object.freeze([
    "progress",
    "fate",
    "power",
    "identity",
    "imaginary",
    "self",
    "frivolity",
  ] as const);

export type RhetoricGrouping = "socializing" | "individuating" | "inverting";

/**
 * The journal's category-of-engagement grouping (rhetorics-of-play journal,
 * "The rhetorics by category-of-engagement"): *socializing* rhetorics frame play
 * by the player's relation to others; *individuating* by internal experience or
 * external destiny; *inverting* (frivolity alone) suspends the others'
 * seriousness.  The grouping is a soft overlay — activities mix across it.
 */
export const rhetoricGrouping = (name: RhetoricName): RhetoricGrouping => {
  switch (name) {
    case "progress":
    case "power":
    case "identity":
      return "socializing";
    case "fate":
    case "self":
    case "imaginary":
      return "individuating";
    case "frivolity":
      return "inverting";
  }
};

/** One rhetoric as a vocabulary entry: its name, grouping, and gloss. */
export interface Rhetoric {
  readonly kind: "game-analysis.rhetoric";
  readonly name: RhetoricName;
  readonly grouping: RhetoricGrouping;
  /** The essentialization this rhetoric frames play as (journal gloss). */
  readonly gloss: string;
}

const RHETORIC_GLOSS: Readonly<Record<RhetoricName, string>> = Object.freeze({
  progress: "play as learning, development, preparation for adulthood",
  fate: "play as encounter with chance, destiny, the gods",
  power: "play as conflict, dominance, sublimated warfare",
  identity: "play as community-building, group ritual, cultural festival",
  imaginary: "play as creativity, imagination, fantasy, fiction-making",
  self: "play as personal experience, flow, peak state, intrinsic reward",
  frivolity: "play as nonsense, inversion, carnival, the upturning of seriousness",
});

/** Build the vocabulary carrier for one rhetoric. */
export function rhetoric(name: RhetoricName): Rhetoric {
  return Object.freeze({
    kind: "game-analysis.rhetoric" as const,
    name,
    grouping: rhetoricGrouping(name),
    gloss: RHETORIC_GLOSS[name],
  });
}

/** The seven rhetorics as a frozen vocabulary of carriers. */
export const rhetorics = (): readonly Rhetoric[] =>
  Object.freeze(rhetoricNames().map(rhetoric));

/** Deduplicate a list of rhetoric names, preserving canonical order. */
const distinctRhetorics = (names: readonly RhetoricName[]): readonly RhetoricName[] =>
  rhetoricNames().filter((n) => names.includes(n));

/**
 * A play read as a *constitutively ambiguous* structure: the set of rhetorics
 * an activity simultaneously hosts.  Because the seven behaviours are mutually
 * incompatible per design (journal), any two *distinct* coexisting rhetorics put
 * the activity in meta-$\top$; this carrier records that co-presence and exposes
 * its rhetorical charge.
 */
export interface AmbiguousPlay {
  readonly kind: "game-analysis.ambiguousPlay";
  /** The distinct rhetorics the activity hosts, in canonical order. */
  readonly hosted: readonly RhetoricName[];
}

/**
 * Build a constitutively-ambiguous play from the rhetorics an activity hosts.
 * Duplicates are collapsed and the list is put in canonical order — what matters
 * for ambiguity is *which distinct* rhetorics coexist.
 */
export function ambiguousPlay(hosted: readonly RhetoricName[]): AmbiguousPlay {
  return Object.freeze({
    kind: "game-analysis.ambiguousPlay" as const,
    hosted: distinctRhetorics(hosted),
  });
}

/**
 * The *rhetorical charge* of a play — its bilattice value at the meta-cell
 * "what rhetoric is this?" (rhetorics-of-play journal, $\top$-tension theorem):
 *
 *   - **two or more distinct rhetorics** → `stable` ($\top$): constitutive
 *     ambiguity, the designated paraconsistent contradiction (correspondence
 *     (9) / image-condition (I2)) — the play simultaneously *is and is not* a
 *     power-contest, a learning-experience, a flow-pursuit.
 *   - **exactly one rhetoric** → `potential` ($t$): an unambiguous, cleanly
 *     essentialized reading — a single rhetoric exhausts the activity's meaning.
 *   - **no rhetoric** → `absurd` ($\bot$): told nothing — no rhetoric frames
 *     the play.
 *
 * The $\top$ is taken *directly* as `chargeValue("stable")`, the designated
 * contradiction — never derived by joining per-rhetoric polarities.
 */
export function rhetoricalCharge(p: AmbiguousPlay): ChargeValue {
  if (p.hosted.length >= 2) return chargeValue("stable");
  if (p.hosted.length === 1) return chargeValue("potential");
  return chargeValue("absurd");
}

export interface ConstitutiveAmbiguityWitness {
  readonly kind: "game-analysis.constitutiveAmbiguity:witness";
  readonly play: AmbiguousPlay;
  /** The distinct incompatible rhetorics held in $\top$-tension. */
  readonly inTension: readonly RhetoricName[];
  /** The designated paraconsistent charge $\top$ = `stable`. */
  readonly charge: ChargeValue;
}

export interface ConstitutiveAmbiguityObstruction {
  readonly kind: "game-analysis.constitutiveAmbiguity-obstruction";
  readonly play: AmbiguousPlay;
  /** `single-rhetoric` — one clean essentialization, no tension ($t$);
   *  `no-rhetoric` — the play hosts no rhetoric at all ($\bot$). */
  readonly reason: "single-rhetoric" | "no-rhetoric";
  /** The activity's (non-$\top$) rhetorical charge. */
  readonly charge: ChargeValue;
}

export type ConstitutiveAmbiguityJudgment =
  | ConstitutiveAmbiguityWitness
  | ConstitutiveAmbiguityObstruction;

/**
 * Judge whether a play is *constitutively ambiguous* — hosting incompatible
 * rhetorics in $\top$-tension (Sutton-Smith's central claim, made algebraic).
 * The witness fires exactly when two or more distinct rhetorics coexist, and it
 * carries the designated $\top$ = `stable` charge; otherwise it is an
 * obstruction (a single clean rhetoric, or none).
 */
export function constitutiveAmbiguityJudgment(
  p: AmbiguousPlay,
): ConstitutiveAmbiguityJudgment {
  const charge = rhetoricalCharge(p);
  if (p.hosted.length >= 2) {
    return Object.freeze({
      kind: "game-analysis.constitutiveAmbiguity:witness" as const,
      play: p,
      inTension: p.hosted,
      charge,
    });
  }
  return Object.freeze({
    kind: "game-analysis.constitutiveAmbiguity-obstruction" as const,
    play: p,
    reason: p.hosted.length === 1 ? ("single-rhetoric" as const) : ("no-rhetoric" as const),
    charge,
  });
}

/**
 * Whether a play is constitutively ambiguous — its rhetorical charge is the
 * designated $\top$ = `stable` (two or more incompatible rhetorics in tension).
 */
export const isConstitutivelyAmbiguous = (p: AmbiguousPlay): boolean =>
  sameChargeValue(rhetoricalCharge(p), chargeValue("stable"));
