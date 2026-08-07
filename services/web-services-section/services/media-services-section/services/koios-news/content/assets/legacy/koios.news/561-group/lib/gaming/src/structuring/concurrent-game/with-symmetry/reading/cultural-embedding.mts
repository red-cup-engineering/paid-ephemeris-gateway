/**
 * The cultural-embedding functor $\Phi : \mathcal{L}_{\mathrm{cult}} \hookrightarrow
 * \mathcal{L}_{\mathrm{proof}}$ — the crown of the ludic theory.
 *
 * $\Phi$ is the faithful functor from cultural-ludic structures (Huizinga 1938,
 * Caillois 1958, Sutton-Smith 1997) into the proof-theoretic ludic category on
 * the predication-fiber substrate (cultural-embedding journal 2026-05-24).  Its
 * action on objects is given by **thirteen** structural correspondences, each
 * identifying a cultural-ludic primitive with a specific algebraic phenomenon;
 * its image is the sub-category of *ludically-structured* games, cut out by
 * **five** algebraic conditions (I1)–(I5).  This module encodes both as data and
 * realizes the image-characterization as a witness/obstruction judgment.
 *
 * The count is exactly thirteen: correspondence (8) — "the four Caillois modes"
 * — is ONE correspondence carrying agon/alea/mimicry/ilinx as four sub-phenomena
 * (8a)–(8d), *not* four separate correspondences (journal: "thirteen
 * correspondences").  We model entry (8) with a nested `modes` field so the
 * top-level list has exactly thirteen entries.
 *
 * The five image-conditions are wired to the sibling modules exactly as the
 * journal's forward image-proof specifies:
 *   - **(I1) voluntary closure-system** ↔ the lusory attitude (`lusory-attitude.mts`).
 *   - **(I2) $\top$ designated** ↔ Sutton-Smith ambiguity (`rhetorics.mts`, $\top$).
 *   - **(I3) magic-circle-bounded fiber** ↔ a distinguished boundary morphism
 *     class.  There is no magic-circle module in this package, so (I3) is a
 *     plain structural field on the cultural structure: whether it carries a
 *     boundary morphism class.
 *   - **(I4) non-trivial bypass-cone structure** ↔ alea's indeterminacy
 *     (`regime-conditions.mts` — the *same* condition the journal shares).
 *   - **(I5) flow-region non-empty** ↔ Csikszentmihalyi flow (`flow.mts`).
 *
 * A structure is *ludically structured* (in the image of $\Phi$) exactly when
 * all five hold; the obstruction names which conditions failed.
 */

import {
  type Arena,
  type Strategy,
} from "../index.mjs";
import {
  type ChargeValue,
} from "@emsenn/relating";
import {
  aleaIndeterminacy,
  type AleaIndeterminacyJudgment,
} from "./regime-conditions.mjs";
import {
  type SuitsianGame,
  lusoryAttitudeJudgment,
  type LusoryAttitudeJudgment,
} from "./lusory-attitude.mjs";
import {
  type AmbiguousPlay,
  constitutiveAmbiguityJudgment,
  type ConstitutiveAmbiguityJudgment,
  rhetoricalCharge,
} from "./rhetorics.mjs";
import {
  flow,
  type FlowJudgment,
} from "./flow.mjs";

/* ───────────────────────────── the thirteen correspondences ───────────────── */

/** Names of the four Caillois sub-phenomena nested under correspondence (8). */
export type CailloisCorrespondenceName = "8a" | "8b" | "8c" | "8d";

/** One Caillois mode ↔ algebraic-phenomenon sub-correspondence of entry (8). */
export interface CailloisCorrespondence {
  readonly kind: "game-analysis.embedding.cailloisCorrespondence";
  readonly tag: CailloisCorrespondenceName;
  /** The Caillois mode (cultural side). */
  readonly mode: "agon" | "alea" | "mimicry" | "ilinx";
  /** The algebraic phenomenon it realizes (proof side). */
  readonly phenomenon: string;
}

const CAILLOIS_CORRESPONDENCES: readonly CailloisCorrespondence[] = Object.freeze([
  Object.freeze({
    kind: "game-analysis.embedding.cailloisCorrespondence" as const,
    tag: "8a" as const,
    mode: "agon" as const,
    phenomenon: "symmetric ⊙-composition at a shared situation",
  }),
  Object.freeze({
    kind: "game-analysis.embedding.cailloisCorrespondence" as const,
    tag: "8b" as const,
    mode: "alea" as const,
    phenomenon: "non-confluence in the bypass structure",
  }),
  Object.freeze({
    kind: "game-analysis.embedding.cailloisCorrespondence" as const,
    tag: "8c" as const,
    mode: "mimicry" as const,
    phenomenon: "fiber-assumption",
  }),
  Object.freeze({
    kind: "game-analysis.embedding.cailloisCorrespondence" as const,
    tag: "8d" as const,
    mode: "ilinx" as const,
    phenomenon: "settlement cascade",
  }),
]);

/** The four Caillois sub-correspondences (8a)–(8d) nested under entry (8). */
export const cailloisCorrespondences = (): readonly CailloisCorrespondence[] =>
  CAILLOIS_CORRESPONDENCES;

/**
 * One top-level object-correspondence of $\Phi$.  Most carry a single cultural
 * primitive ↔ algebraic phenomenon; entry (8) additionally carries the four
 * nested Caillois sub-correspondences in `modes`.
 */
export interface Correspondence {
  readonly kind: "game-analysis.embedding.correspondence";
  /** Index `"1"`..`"13"` — entry `"8"` is the single Caillois-modes correspondence. */
  readonly index: string;
  /** The cultural-ludic primitive (left of $\leftrightarrow$). */
  readonly cultural: string;
  /** The algebraic phenomenon (right of $\leftrightarrow$). */
  readonly algebraic: string;
  /** The four nested Caillois sub-correspondences — present only on entry (8). */
  readonly modes: readonly CailloisCorrespondence[] | null;
}

const correspondenceOf = (
  index: string,
  cultural: string,
  algebraic: string,
  modes: readonly CailloisCorrespondence[] | null = null,
): Correspondence =>
  Object.freeze({
    kind: "game-analysis.embedding.correspondence" as const,
    index,
    cultural,
    algebraic,
    modes,
  });

const CORRESPONDENCES: readonly Correspondence[] = Object.freeze([
  correspondenceOf("1", "magic circle", "entity-fiber boundary"),
  correspondenceOf("2", "voluntary constraint", "closure-rule-system commitment"),
  correspondenceOf("3", "structured uncertainty", "bilattice ⊥ and ⊤"),
  correspondenceOf("4", "design polarities", "bilattice polarities"),
  correspondenceOf("5", "game-temporal regimes", "closure-ordinal regimes"),
  correspondenceOf("6", "paidia / ludus", "Scott-continuity / non-Scott-continuity axis"),
  correspondenceOf("7", "cultural transmission", "closure-rule-language inheritance"),
  correspondenceOf(
    "8",
    "the four Caillois modes",
    "four specific algebraic phenomena",
    CAILLOIS_CORRESPONDENCES,
  ),
  correspondenceOf("9", "Sutton-Smith's ambiguity", "bilattice ⊤ (designated)"),
  correspondenceOf("10", "Csikszentmihalyi flow", "fiber-complexity matching"),
  correspondenceOf("11", "player-as-fiber", "any closed fiber is playable"),
  correspondenceOf("12", "Umwelt", "non-⊥ region of respond"),
  correspondenceOf("13", "history", "geometric entanglement"),
]);

/**
 * The thirteen object-level correspondences of $\Phi$, in the journal's order.
 * Exactly thirteen top-level entries — entry (8) carries the four Caillois
 * sub-phenomena nested in its `modes` field.
 */
export const correspondences = (): readonly Correspondence[] => CORRESPONDENCES;

/** Look up a correspondence by its top-level index (`"1"`..`"13"`). */
export const correspondenceByIndex = (index: string): Correspondence | null =>
  CORRESPONDENCES.find((c) => c.index === index) ?? null;

/* ──────────────────────── the cultural structure & image (I1)–(I5) ─────────── */

/**
 * A cultural-ludic structure presented for image-testing — the data each
 * image-condition reads.  This is *not* a full object of $\mathcal{L}_{\mathrm{cult}}$
 * (whose morphism notion is open in the journal); it is exactly the witness data
 * the five conditions (I1)–(I5) require, drawn from the sibling modules.
 */
export interface CulturalStructure {
  readonly kind: "game-analysis.embedding.culturalStructure";
  /** The arena the activity is played on (read by (I4) for alea). */
  readonly arena: Arena;
  /** A strategy on the arena (read by (I5) for the flow region). */
  readonly strategy: Strategy;
  /** The Suitsian game-with-strategy (read by (I1) for the lusory attitude). */
  readonly game: SuitsianGame;
  /** The rhetorics the activity hosts (read by (I2) for ⊤-designation). */
  readonly ambiguity: AmbiguousPlay;
  /** Whether the structure carries a magic-circle boundary morphism class (I3). */
  readonly hasMagicCircle: boolean;
}

/** Build a cultural structure from its image-testing data. */
export function culturalStructure(input: {
  readonly arena: Arena;
  readonly strategy: Strategy;
  readonly game: SuitsianGame;
  readonly ambiguity: AmbiguousPlay;
  readonly hasMagicCircle: boolean;
}): CulturalStructure {
  return Object.freeze({
    kind: "game-analysis.embedding.culturalStructure" as const,
    arena: input.arena,
    strategy: input.strategy,
    game: input.game,
    ambiguity: input.ambiguity,
    hasMagicCircle: input.hasMagicCircle,
  });
}

/** The five image-condition tags (I1)–(I5). */
export type ImageConditionTag = "I1" | "I2" | "I3" | "I4" | "I5";

/**
 * The five image-conditions evaluated against a cultural structure — each wired
 * to the module realizing its content (per the journal's forward image-proof).
 */
export interface ImageConditions {
  readonly kind: "game-analysis.embedding.imageConditions";
  /** (I1) voluntary closure-system ↔ the lusory attitude. */
  readonly i1: LusoryAttitudeJudgment;
  /** (I2) ⊤ designated ↔ Sutton-Smith ambiguity (the rhetorical ⊤). */
  readonly i2: ConstitutiveAmbiguityJudgment;
  /** (I3) magic-circle-bounded fiber — a boundary morphism class is present. */
  readonly i3: boolean;
  /** (I4) non-trivial bypass-cone structure ↔ alea's indeterminacy. */
  readonly i4: AleaIndeterminacyJudgment;
  /** (I5) flow-region non-empty ↔ Csikszentmihalyi flow. */
  readonly i5: FlowJudgment;
}

/** Evaluate all five image-conditions against a cultural structure. */
export function imageConditions(x: CulturalStructure): ImageConditions {
  return Object.freeze({
    kind: "game-analysis.embedding.imageConditions" as const,
    i1: lusoryAttitudeJudgment(x.game),
    i2: constitutiveAmbiguityJudgment(x.ambiguity),
    i3: x.hasMagicCircle,
    i4: aleaIndeterminacy(x.arena),
    i5: flow(x.arena, x.strategy),
  });
}

/** Whether image-condition (I1) — the lusory attitude — holds. */
const holdsI1 = (c: ImageConditions): boolean =>
  c.i1.kind === "game-analysis.lusoryAttitude:witness";
/** Whether (I2) — ⊤-designation via constitutive ambiguity — holds. */
const holdsI2 = (c: ImageConditions): boolean =>
  c.i2.kind === "game-analysis.constitutiveAmbiguity:witness";
/** Whether (I4) — alea's indeterminacy / bypass-cone structure — holds. */
const holdsI4 = (c: ImageConditions): boolean =>
  c.i4.kind === "game-analysis.aleaIndeterminacy:witness";
/** Whether (I5) — a non-empty flow region — holds. */
const holdsI5 = (c: ImageConditions): boolean =>
  c.i5.kind === "game-analysis.flow:witness";

/** Which of (I1)–(I5) currently hold, in order. */
const satisfiedConditions = (c: ImageConditions): readonly ImageConditionTag[] => {
  const out: ImageConditionTag[] = [];
  if (holdsI1(c)) out.push("I1");
  if (holdsI2(c)) out.push("I2");
  if (c.i3) out.push("I3");
  if (holdsI4(c)) out.push("I4");
  if (holdsI5(c)) out.push("I5");
  return Object.freeze(out);
};

/** Which of (I1)–(I5) currently fail, in order. */
const failedConditions = (c: ImageConditions): readonly ImageConditionTag[] => {
  const out: ImageConditionTag[] = [];
  if (!holdsI1(c)) out.push("I1");
  if (!holdsI2(c)) out.push("I2");
  if (!c.i3) out.push("I3");
  if (!holdsI4(c)) out.push("I4");
  if (!holdsI5(c)) out.push("I5");
  return Object.freeze(out);
};

export interface LudicallyStructuredWitness {
  readonly kind: "game-analysis.ludicallyStructured:witness";
  readonly structure: CulturalStructure;
  readonly conditions: ImageConditions;
  /** All five tags — every image-condition held. */
  readonly satisfied: readonly ImageConditionTag[];
}

export interface LudicallyStructuredObstruction {
  readonly kind: "game-analysis.ludicallyStructured-obstruction";
  readonly structure: CulturalStructure;
  readonly conditions: ImageConditions;
  /** The image-conditions that failed — why the structure is outside $\mathrm{im}(\Phi)$. */
  readonly reason: readonly ImageConditionTag[];
}

export type LudicallyStructuredJudgment =
  | LudicallyStructuredWitness
  | LudicallyStructuredObstruction;

/**
 * Judge whether a cultural structure is *ludically structured* — in the image of
 * $\Phi$ (cultural-embedding journal, image-characterization).  The witness
 * fires exactly when all five image-conditions (I1)–(I5) hold; otherwise it is
 * an obstruction listing which conditions failed.  Each condition is delegated
 * to the sibling module realizing its algebraic content, so this judgment is the
 * *conjunction* of the lab's operationalized ludic theory — never a reinvention.
 */
export function ludicallyStructuredJudgment(
  x: CulturalStructure,
): LudicallyStructuredJudgment {
  const conditions = imageConditions(x);
  const failed = failedConditions(conditions);
  if (failed.length === 0) {
    return Object.freeze({
      kind: "game-analysis.ludicallyStructured:witness" as const,
      structure: x,
      conditions,
      satisfied: satisfiedConditions(conditions),
    });
  }
  return Object.freeze({
    kind: "game-analysis.ludicallyStructured-obstruction" as const,
    structure: x,
    conditions,
    reason: failed,
  });
}

/** Whether a cultural structure is ludically structured (in the image of $\Phi$). */
export const isLudicallyStructured = (x: CulturalStructure): boolean =>
  ludicallyStructuredJudgment(x).kind === "game-analysis.ludicallyStructured:witness";

/**
 * The rhetorical charge $\Phi$ assigns the structure at the "what is this play?"
 * meta-cell — the bilattice value of correspondence (9) / image-condition (I2).
 * Re-exposed here for convenience over `rhetoricalCharge`: `stable` ($\top$) when
 * the structure hosts incompatible rhetorics in tension.
 */
export const embeddingCharge = (x: CulturalStructure): ChargeValue =>
  rhetoricalCharge(x.ambiguity);
