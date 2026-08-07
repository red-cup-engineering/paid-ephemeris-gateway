/**
 * face — knowing's INSIDE boundary face, read on the KNOWLEDGE axis (≤_k).
 *
 * animating (the scale-1 holographic bulk — ONE agent over its own three faculty
 * faces) is reconstructed from three boundary faces: communicating (across / truth),
 * knowing (inside / knowledge), playing (outside / evidence). Each face is a LOCAL
 * SECTION over the agent's membrane (a `readonly UtteranceCarrier[]` log), read on its
 * agentive-triad axis; the bulk glues the three by the (coordination-free) replica
 * Mayer–Vietoris in animating's `glue`/`project`. The dependency runs BULK → FACES:
 * this module must NEVER import @emsenn/animating — knowing is a LEAF over relating
 * (the agent's own self cannot contest, so scale-1 gluing is always H¹=0). See
 * dev/docs/notes/2026-06-21-bulk-over-faces-local-section-threading.md.
 *
 * knowing reads the INSIDE face on the KNOWLEDGE axis (≤_k): "how much has been settled,
 * independently of which way the evidence points; accumulation is monotone, and its top
 * is 'told both', the join of the for-only and against-only values" (content/_archive …
 * predication-categories/concepts/knowledge.md). This is knowing's OWN reading — its
 * comonad on Meme working ≤_k, the cognizing surface (`foldSection`/`standingOf`/`joinK`),
 * NOT a generic relating descend-then-section: the membrane's utterances are each ABSORBED
 * as a learned increment (a meme charged on the ≤_k axis — for ↦ potential / truth side,
 * against ↦ active / falsity side, the `absorb` convention), and the comonad's held
 * CONTEXT C(Meme) is folded by the knowledge order — coincident cells joined by
 * `joinKnowledge` (the ≤_k climb). "The depth IS the memory": the inside face is exactly
 * that accumulated held section over the membrane's cells:
 *
 *   cover     = the distinct cells of the held section (the comonad's context grain)
 *   held      = cells accumulated ABOVE the ≤_k bottom ⊥ (standing ≠ absurd) — the
 *               agent settled SOMETHING (for or against) about the cell; the memory depth
 *   contested = cells that reached the ≤_k TOP ⊤ "told both" (standing = stable) — a held
 *               contradiction, where the membrane witnessed BOTH for and against the cell
 *
 * The thick reading additionally carries the folded `aggregate` ≤_k standing over EVERY
 * cell (the whole section's collective knowledge), the section `depth` (settled cells),
 * and the per-cell knowledge-axis Belnap census on FOUR, so the reading is genuinely
 * knowing's comonad accumulation — not a generic descend.
 */
import {
  meme,
  cell,
  claim,
  predicateOfClaim,
  mark,
  witnessedPotential,
  negate,
  fourCensusOfNames,
  knowledgeAggregateOfCensus,
  isMeme,
  type UtteranceCarrier,
  type Meme,
} from "@emsenn/relating";
import { foldSection, standingOf } from "./cognizing/index.mjs";

/** A FOUR knowledge-order standing (the ≤_k lattice: ⊥ absurd … ⊤ stable). */
type Standing = "absurd" | "active" | "potential" | "stable";

/** The knowledge-axis Belnap census of the held section's per-cell ≤_k standings (FOUR). */
export interface KnowledgeBelnap {
  /** absurd ⊥ — the ≤_k bottom; nothing was settled about the cell (never counted, sections drop ⊥ cells). */
  readonly absurd: number;
  /** potential — for-evidence accumulated (the section holds the cell). */
  readonly potential: number;
  /** active — against-evidence accumulated (the section holds against the cell). */
  readonly active: number;
  /** stable ⊤ — the ≤_k top, "told both"; for AND against accumulated (a held contradiction). */
  readonly stable: number;
}

/**
 * The knowing face: the INSIDE local section of animating's agent boundary, read on the
 * knowledge axis (≤_k) over the membrane's cell cover. The thin half (`cover`/`held`/
 * `contested`) is exactly animating's `Face` contract; the thick half carries the folded
 * `aggregate` ≤_k standing over all cells, the section `depth` (settled cells = the
 * memory), and the per-cell Belnap census, so the reading is genuinely knowing's comonad
 * accumulation — not a generic descend-then-section.
 */
export interface KnowingFace {
  readonly kind: "knowing.face";
  readonly faculty: "knowing";
  readonly direction: "inside";
  readonly axis: "knowledge";
  /** the held section's distinct cells — the cells of this local section over the cover. */
  readonly cover: number;
  /** cells accumulated above the ≤_k bottom ⊥ (standing ≠ absurd) — the settled memory. */
  readonly held: number;
  /** cells at the ≤_k top ⊤ ("told both") — held contradictions on this face. */
  readonly contested: number;
  /** the section depth: how many cells are settled (≡ held) — "the depth is the memory". */
  readonly depth: number;
  /** the membrane's collective ≤_k knowledge: the join (joinK) over EVERY cell's standing. */
  readonly aggregate: Standing;
  /** the knowledge-axis Belnap census of the per-cell folded standings. */
  readonly belnap: KnowledgeBelnap;
  /** knowing's REAL comonad work: the SETTLING REGIME of the knowledge orbit — INTELLIGENCE,
   *  the closure-orbit class, the general faculty of which REFLECT/RUMINATE are two values
   *  (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md, the gauge faculty). `reflects` ⟺
   *  the reflexive orbit SETTLES to its ≤_k fixpoint (the *known* — strict-finite/Scott regime);
   *  ¬reflects ⟺ it RUMINATES (the aperiodic κ≥ω₁ orbit that oscillates without resolution). */
  readonly regime: KnowingRegime;
}

/** The settling-regime reading of a knowledge orbit (knowing's intelligence/gauge faculty). */
export interface KnowingRegime {
  /** the closure-orbit class: strict-finite (settled at ⊤/⊥), scott-continuous (one-sided,
   *  settles at ω), or aperiodic (reflexive-unsettled — the never-converging rumination orbit). */
  readonly regime: "strict-finite" | "scott-continuous" | "aperiodic";
  /** whether the orbit settles to a ≤_k fixpoint — REFLECTING (true) vs RUMINATING (false). */
  readonly reflects: boolean;
}

/** A leading-negation prefix on a claim (the memory `absorb` side split). */
const NEGATION = /^\s*(?:!|¬|not\s+)/i;

/**
 * Read a claim as a polarized observation on the ≤_k axis: whether it is an AGAINST
 * observation (a witnessed negation) and the BARE predicate label the assertion is
 * about (the negation stripped). The memory convention (the `absorb` side split): a
 * claim marked `!`/`¬`/`not ` witnesses the falsity side (against); otherwise truth
 * (for). Stripping the negation makes the affirmed and negated claim land on the SAME
 * cell, so the ≤_k fold can accumulate BOTH sides to the top ⊤ ("told both"). Knowing
 * reads the membrane's own marks — it never re-charges them.
 */
function polarity(carrier: UtteranceCarrier): { readonly against: boolean; readonly label: string } {
  const value = carrier.claim.mark.value;
  if (typeof value !== "string") return { against: false, label: String(value) };
  const against = NEGATION.test(value);
  const label = against ? value.replace(NEGATION, "") : value;
  return { against, label };
}

/**
 * Absorb one membrane utterance as a learned meme on the ≤_k axis: a reflexive cell
 * (the subject token holds its bare claimed predicate) charged on the side the claim
 * witnesses — for ↦ witnessedPotential (truth side), against ↦ its negation (falsity
 * side). This is the comonad's `absorb` increment, one firing of the ≤_k filtration; the
 * bare-label cell lets coincident for/against observations fold to the ⊤ "told both".
 */
function absorbed(carrier: UtteranceCarrier): Meme {
  const subject = carrier.token;
  const { against, label } = polarity(carrier);
  const predicate = predicateOfClaim(claim(mark(label)));
  const learnedCell = cell(subject, predicate, subject);
  const witness = mark(String(carrier.token.mark.value));
  const charge = against ? negate(witnessedPotential(witness)) : witnessedPotential(witness);
  return meme(learnedCell, charge);
}

/**
 * knowingFace — knowing's OWN inside/knowledge local section over an agent membrane,
 * the face animating (the bulk) consumes instead of faking it with a generic relating
 * descend. The membrane's utterances are each ABSORBED as a learned meme (a ≤_k charge
 * increment), and the comonad's held context C(Meme) is FOLDED by the knowledge order —
 * coincident cells joined by `joinKnowledge` (the ≤_k climb; `foldSection`). The thin
 * triad is the knowledge-axis reading of that accumulated held section:
 *
 *   cover     = the held section's distinct cells (the comonad context grain)
 *   held      = cells accumulated above the ≤_k bottom ⊥ (standing ≠ absurd) — the memory
 *   contested = cells at the ≤_k TOP ⊤ ("told both", standing = stable) — the membrane
 *               witnessed BOTH for and against the cell (a held contradiction)
 *
 * The thick `aggregate` is the join (`joinK`) over EVERY cell's standing (the section's
 * collective ≤_k knowledge); `depth` is the settled-cell count ("the depth is the
 * memory"); `belnap` is the per-cell census. Pure; never imports the bulk — this is
 * knowing's comonad accumulation reading, not animating's descend-then-section.
 */
/** Whether a folded meme is REFLEXIVE — a meme whose subject/object is itself a meme
 *  ("knowing that you know", the comonad's comultiplication δ). A reflexive-yet-unsettled
 *  orbit is the aperiodic rumination regime. */
const nestsMeme = (value: unknown): boolean =>
  typeof value === "object" && value !== null && isMeme(value as object);
const reflexiveMeme = (m: Meme): boolean =>
  nestsMeme(m.cell.subject.mark.value) || nestsMeme(m.cell.object.mark.value);

/** The settling REGIME of the knowledge orbit (knowing's gauge/intelligence faculty, lifted to
 *  the whole folded context): a collective standing at a ≤_k extremum (⊤ stable / ⊥ absurd) is
 *  strict-finite (settled); a one-sided standing settles at ω (scott-continuous); a reflexive
 *  meme still unsettled is the aperiodic, never-converging orbit (RUMINATION). Mirrors gauge's
 *  per-meme `regimeOf` at the section grain. */
function regimeOfOrbit(folded: readonly Meme[], aggregate: Standing): KnowingRegime {
  if (aggregate === "stable" || aggregate === "absurd") {
    return Object.freeze({ regime: "strict-finite" as const, reflects: true });
  }
  if (folded.some(reflexiveMeme)) {
    return Object.freeze({ regime: "aperiodic" as const, reflects: false }); // ruminating
  }
  return Object.freeze({ regime: "scott-continuous" as const, reflects: true });
}

export function knowingFace(membrane: readonly UtteranceCarrier[]): KnowingFace {
  const folded = foldSection(membrane.map(absorbed));
  // The knowledge-axis census AND the collective ≤_k aggregate are PARAMETERIZED from
  // relating's proof-tree math: `fourCensusOfNames` tallies the per-cell ≤_k standings,
  // `knowledgeAggregateOfCensus` is the ∨_k join over the cover (≡ folding `joinK` over the
  // standings by associativity). `held` = accumulated above ⊥; `contested` = the ⊤ "told both".
  const standings = folded.map((m) => standingOf(m) as Standing);
  const belnap = fourCensusOfNames(standings);
  const cover = folded.length;
  const held = belnap.potential + belnap.active + belnap.stable;
  const contested = belnap.stable;
  const aggregate = knowledgeAggregateOfCensus(belnap) as Standing;
  return Object.freeze({
    kind: "knowing.face" as const,
    faculty: "knowing" as const,
    direction: "inside" as const,
    axis: "knowledge" as const,
    cover,
    held,
    contested,
    depth: held, // "the depth is the memory" — settled cells are exactly the held memory
    aggregate,
    belnap,
    regime: regimeOfOrbit(folded, aggregate),
  });
}
