/**
 * Composition — the REAL ludics cut / Hyland–Ong strategy composition at the
 * chronicle/play grain, and the copycat **Fax** identity, making behaviours a
 * genuine category (objects = behaviours, morphisms = designs `A ⊸ B`,
 * composition = `cut`, identity = `fax`).
 *
 * ## Why the shadow cut is not the category, and what fixes it
 *
 * `proving/computational-ludics.mts::cut` = `interact` (pointwise
 * `joinKnowledgeValue` over the UNION of supports) gated by convergence. That is
 * a *closure operator on valuations*, not a categorical composition:
 *
 *   1. **No hiding.** `interact` keeps the union of both supports, so
 *      `cut(Fax_B, d)` carries Fax's interface loci `d` never had — it cannot
 *      equal `d`. Categorical composition must HIDE the cut interface B.
 *   2. **Symmetric join is not directed copy.** `joinKnowledgeValue` is
 *      commutative/idempotent; it cannot *transport* an Opponent move on one
 *      address to a Player move on a dual address — the copy the identity needs.
 *
 * The note `2026-06-21-playing-as-star-autonomous-interaction.md` (§"honest
 * boundary", finding #1) states this and defers the real engine. THIS MODULE is
 * that engine. The minimal extra structure the law required:
 *
 *   (a) a **cut-interface address convention** (`DOMAIN_SIDE` = `0·…` = the A
 *       side of `A ⊸ B`, `CODOMAIN_SIDE` = `1·…` = the B side) — purely a
 *       `delocate` convention, no new primitive;
 *   (b) a **chronicle-level normalization that runs the dispute on the shared B,
 *       TRANSPORTS the copy across it, and DELETES the interface actions** from
 *       the surviving plays. The corpus license for hiding-at-an-interface is
 *       `federation-is-parallel-composition.md`: composition over a shared
 *       sub-arena = parallel composition followed by a closure that forgets the
 *       shared interface.
 *
 * No law is weakened. The shadow cut stays the orthogonality / normal-form
 * engine (CLAUDE.md: normalization is capability-preserving — the closure
 * capability stays live, the category capability is added beside it).
 */
import {
  type Action,
  type Chronicle,
  type Design,
  type Locus,
  chronicle,
  daimonAction,
  designAction,
  designChronicles,
  designCoherenceJudgment,
  designFromActionSet,
  emptyDesign,
  locus,
  locusFromKey,
  locusKey,
  negativeAction,
  parityPolarity,
  polarityName,
  positiveAction,
  prefixes,
  support,
} from "../../index.mjs";
import { designLeq, incarnation, visitedLoci } from "./settling/index.mjs";
import { biorthogonalClosure, orthogonalOf } from "./settling/behaviour.mjs";

/* ------------------------------------------------------------------------- *
 * §1  The interface-address convention (the one new structural commitment).
 * ------------------------------------------------------------------------- */

/**
 * The A side (domain) of a composable design `A ⊸ B` — addresses delocated under
 * `0·…`. The B side (codomain) lives under `1·1·…` (`CODOMAIN_SIDE`).
 *
 * The two prefixes have DIFFERENT lengths, and that is load-bearing. Locus
 * parity is depth parity (`parityPolarity`: even depth = positive, odd =
 * negative). In a linear arrow `A ⊸ B` the domain is `A^⊥` — polarity-reversed —
 * while the codomain is B as-is. For a copycat `Fax_B : B ⊸ B` (= `B^⊥ ⅋ B`) the
 * domain copy therefore carries the POLARITY-DUAL of each B-move and the codomain
 * copy carries it as-is. To stay coherent (polarity = locus parity) each side's
 * prefix must restore that:
 *   • codomain prefix `1·1·…` is EVEN-length ⇒ preserves parity ⇒ as-is content
 *     is coherent;
 *   • domain prefix `0·…` is ODD-length ⇒ flips parity ⇒ the dual content is
 *     coherent.
 * Both are disjoint sub-addresses (head `0` vs `1`), exactly as `superpose`
 * requires — still purely a `delocate` convention, no new primitive.
 */
export const DOMAIN_SIDE: Locus = locus([0]);
/** The B side (codomain) of a composable design `A ⊸ B` — addresses delocated under `1·1·…`. */
export const CODOMAIN_SIDE: Locus = locus([1, 1]);

/* ------------------------------------------------------------------------- *
 * Action re-addressing (pure; the action-grain of delocate and its inverse).
 * ------------------------------------------------------------------------- */

/** Place an action at a new locus, keeping its variety and ramification. */
function reLocate(a: Action, at: Locus): Action {
  switch (a.variety) {
    case "positive":
      return positiveAction(at, a.ramification);
    case "negative":
      return negativeAction(at, a.ramification);
    case "daimon":
      return daimonAction(at);
  }
}

/** Prefix a locus with a side address (delocation at the locus grain). */
function prefixLocus(side: Locus, xi: Locus): Locus {
  return locus([...side.address, ...xi.address]);
}

/**
 * Restrict a design to the loci under a side prefix, then strip the prefix (the
 * inverse of `delocate(d, side)`): `incarnation.mts::restrictTo` followed by
 * dropping the leading address components. The empty prefix is the identity.
 */
export function project(d: Design, side: Locus): Design {
  if (side.address.length === 0) return d;
  const prefix = locusKey(side);
  const drop = side.address.length;
  const kept: Action[] = [];
  for (const xi of support(d)) {
    const key = locusKey(xi);
    if (key !== prefix && !key.startsWith(`${prefix}.`)) continue;
    const a = designAction(d, xi);
    if (a === null) continue;
    kept.push(reLocate(a, locus(xi.address.slice(drop))));
  }
  return designFromActionSet(kept);
}

/** Relocate a design under a side prefix at the valuation grain. */
function delocateDesign(d: Design, side: Locus): Design {
  const acts: Action[] = [];
  for (const xi of support(d)) {
    const a = designAction(d, xi);
    if (a !== null) acts.push(reLocate(a, prefixLocus(side, xi)));
  }
  return designFromActionSet(acts);
}

/**
 * Relocate the polarity-DUAL of a design under a side prefix — the counter-play
 * of d placed on that interface. Used to present a member `d ∈ B` as the
 * Opponent-side play `d^⊥` on Fax's domain interface for the left-identity cut.
 */
function delocateDual(d: Design, side: Locus): Design {
  const acts: Action[] = [];
  for (const xi of support(d)) {
    const a = designAction(d, xi);
    if (a !== null) acts.push(reLocate(dualAction(a), prefixLocus(side, xi)));
  }
  return designFromActionSet(acts);
}

/** The cut interface between `f:A⊸B` and `g:B⊸C`: f's B (codomain side) and g's B (domain side), both side-less. */
export function cutInterface(f: Design, g: Design): { readonly fB: Design; readonly gB: Design } {
  return Object.freeze({ fB: project(f, CODOMAIN_SIDE), gB: project(g, DOMAIN_SIDE) });
}

/* ------------------------------------------------------------------------- *
 * §2  Dispute primitives: side classification and B-duality.
 * ------------------------------------------------------------------------- */

/** Whether a locus sits under a side prefix. */
function underSide(side: Locus, xi: Locus): boolean {
  if (xi.address.length < side.address.length) return false;
  return side.address.every((n, i) => xi.address[i] === n);
}

/** Classify an action's side (domain `0·0·…` vs codomain `1·1·…`); returns the side-less sub-address. */
function classify(a: Action): { readonly side: 0 | 1; readonly sub: Locus } | null {
  if (underSide(DOMAIN_SIDE, a.locus)) {
    return Object.freeze({ side: 0, sub: locus(a.locus.address.slice(DOMAIN_SIDE.address.length)) });
  }
  if (underSide(CODOMAIN_SIDE, a.locus)) {
    return Object.freeze({ side: 1, sub: locus(a.locus.address.slice(CODOMAIN_SIDE.address.length)) });
  }
  return null;
}

const actionPolName = (a: Action): "positive" | "negative" =>
  a.variety === "negative" ? "negative" : "positive";

function sameRamification(x: readonly number[], y: readonly number[]): boolean {
  if (x.length !== y.length) return false;
  const ys = new Set(y);
  return x.every((i) => ys.has(i));
}

/**
 * Whether two actions at the SAME side-less B-address are dual: one Player and
 * one Opponent, ramification matching so justification (Ch3) is preserved across
 * the cut. The Daimon caps the dispute (a give-up against a polarity move is a
 * converging collision). This per-locus duality check is the precise line
 * between the real cut and the symmetric-join shadow.
 */
function bDual(left: Action, right: Action): boolean {
  if (left.variety === "daimon" || right.variety === "daimon") return true;
  if (actionPolName(left) === actionPolName(right)) return false;
  return sameRamification(left.ramification, right.ramification);
}

/* ------------------------------------------------------------------------- *
 * §3  Composed plays — the dispute on B, transported and hidden.
 * ------------------------------------------------------------------------- */

export interface PlayStep {
  readonly kind: "game.composition.play-step";
  readonly action: Action;
  /** True iff this step occurred on the cut interface B (omitted from `visible`). */
  readonly hidden: boolean;
}

export interface ComposedPlay {
  readonly kind: "game.composition.play";
  /** The surviving chronicle — B hidden; A re-addressed to `0·…`, C transported to `1·…`. */
  readonly visible: Chronicle;
  /** The full trace including hidden B-moves (witness data). */
  readonly internal: readonly PlayStep[];
  /** The B-dispute reached a Daimon (the cut is defined on this play). */
  readonly converged: boolean;
}

/** Order actions root-first along the prefix order (the chronicle-convergence sort). */
function prefixSort(actions: readonly Action[]): readonly Action[] {
  return [...actions].sort((a, b) => {
    if (prefixes(a.locus, b.locus)) return -1;
    if (prefixes(b.locus, a.locus)) return 1;
    return locusKey(a.locus).localeCompare(locusKey(b.locus));
  });
}

/**
 * The converging composed plays of `f:A⊸B` and `g:B⊸C` — one per
 * (chronicle of f, chronicle of g) pair whose B-dispute converges. f's B is its
 * codomain side (`1·…`), g's B its domain side (`0·…`); they are matched by
 * stripped B-address and required dual per shared B-locus (non-dual ⇒ the pair is
 * stuck and discarded — that is the cut's partiality). The dispute converges at a
 * Daimon collision on B. The visible play keeps f's A side (`0·…`), TRANSPORTS
 * g's C side (`1·…`), and HIDES every B-move.
 */
export function composeChronicles(f: Design, g: Design): readonly ComposedPlay[] {
  const out: ComposedPlay[] = [];
  for (const cf of designChronicles(f)) {
    for (const cg of designChronicles(g)) {
      const play = composePair(cf, cg);
      if (play !== null) out.push(play);
    }
  }
  return Object.freeze(out);
}

function composePair(cf: Chronicle, cg: Chronicle): ComposedPlay | null {
  const fB = new Map<string, Action>(); // stripped B-key → f's B-action (f's 1·… side)
  const gB = new Map<string, Action>(); // stripped B-key → g's B-action (g's 0·… side)
  const aMoves: Action[] = []; // f's A side (0·…) — survives on composite 0·…
  const cMoves: Action[] = []; // g's C side (1·…) — survives on composite 1·…

  for (const a of cf.actions) {
    const c = classify(a);
    if (c === null) continue;
    if (c.side === 0) aMoves.push(a);
    else fB.set(locusKey(c.sub), reLocate(a, c.sub));
  }
  for (const a of cg.actions) {
    const c = classify(a);
    if (c === null) continue;
    if (c.side === 1) cMoves.push(a);
    else gB.set(locusKey(c.sub), reLocate(a, c.sub));
  }

  // §2 duality + convergence on the shared B interface.
  const sharedB = [...fB.keys()].filter((k) => gB.has(k));
  if (sharedB.length === 0) return null; // no dispute to run on this pair
  let converged = false;
  for (const key of sharedB) {
    const lf = fB.get(key)!;
    const lg = gB.get(key)!;
    if (!bDual(lf, lg)) return null; // stuck: non-dual shared B-locus
    if (lf.variety === "daimon" || lg.variety === "daimon") converged = true;
  }
  if (!converged) return null; // no Daimon collision on B ⇒ no converging play

  // §3 transcribe the visible play with hiding + COPYCAT TRANSPORT.
  //
  // The settled member at each shared B-locus. The cut glues f's codomain B
  // (`fB`) to g's domain B (`gB`), which are dual; f's codomain copy carries the
  // member's content AS-IS (Player's side of the arrow's codomain), so it is the
  // settled play the cut copies across the hidden interface — the Daimon give-up
  // included verbatim.
  const settled = new Map<string, Action>();
  for (const key of sharedB) settled.set(key, fB.get(key)!);

  // f is a copycat-link at B when its A-side (domain `0·…`) is the dual interface
  // of its codomain B — i.e. f has no genuine A content (aMoves empty) but a B
  // codomain. Then f transports the settled B onto the result DOMAIN. Otherwise
  // f's A-side is real domain content and survives verbatim. Symmetrically for g
  // on the result CODOMAIN: a genuine C-side survives; otherwise (g a pure
  // domain-input) the settled B transports onto the result codomain via f's copy.
  const visibleActions: Action[] = [];

  // Result domain (`0·…`): real A from f, else the copycat transport of settled B.
  if (aMoves.length > 0) {
    visibleActions.push(...aMoves);
  } else {
    for (const key of sharedB) {
      visibleActions.push(reLocate(dualAction(settled.get(key)!), prefixLocus(DOMAIN_SIDE, locusFromKey(key))));
    }
  }
  // Result codomain (`1·1·…`): real C from g, else the copycat transport of settled B.
  if (cMoves.length > 0) {
    visibleActions.push(...cMoves);
  } else {
    for (const key of sharedB) {
      visibleActions.push(reLocate(settled.get(key)!, prefixLocus(CODOMAIN_SIDE, locusFromKey(key))));
    }
  }

  const internal: PlayStep[] = [];
  for (const a of prefixSort(visibleActions)) {
    internal.push(Object.freeze({ kind: "game.composition.play-step" as const, action: a, hidden: false }));
  }
  for (const key of [...fB.keys()]) {
    internal.push(Object.freeze({
      kind: "game.composition.play-step" as const,
      action: reLocate(fB.get(key)!, prefixLocus(CODOMAIN_SIDE, locusFromKey(key))),
      hidden: true,
    }));
  }

  return Object.freeze({
    kind: "game.composition.play" as const,
    visible: chronicle(prefixSort(visibleActions)),
    internal: Object.freeze(internal),
    converged,
  });
}

/* ------------------------------------------------------------------------- *
 * §4  The composite design — cut.
 * ------------------------------------------------------------------------- */

/**
 * The REAL cut / HO-composition of `f:A⊸B` and `g:B⊸C` — a design `A⊸C`.
 * Composition is the dispute on the shared interface B, hidden; the surviving
 * A/C plays are reassembled (a design IS the union of its chronicles). Partial:
 * the empty design when no play converges. `f`'s codomain side and `g`'s domain
 * side must be the same behaviour B with DUAL polarities; §2 checks this per
 * B-locus and discards non-dual pairs, so a mismatched B yields no composition.
 *
 * SUPERSEDES `proving/computational-ludics::cut` as the categorical composition;
 * that symmetric-join cut remains the orthogonality / normal-form engine.
 */
export function cut(f: Design, g: Design): Design {
  const plays = composeChronicles(f, g).filter((p) => p.converged);
  if (plays.length === 0) return emptyDesign();
  return designFromActionSet(plays.flatMap((p) => p.visible.actions));
}

/* ------------------------------------------------------------------------- *
 * §5  The copycat Fax_B — a real coherent design over the doubled interface.
 * ------------------------------------------------------------------------- */

/**
 * The polarity-dual of an action (positive↔negative), ramification preserved.
 * The Daimon (give-up, positive-only) has no negative twin: in `B^⊥` a give-up
 * corresponds to a negative leaf (Opponent does not give up — its play simply
 * ends), so we dualize the Daimon to a negative leaf at the same locus. This
 * keeps the dual side coherent (a Daimon at an odd, negative-parity locus would
 * violate C1).
 */
function dualAction(a: Action): Action {
  switch (a.variety) {
    case "positive":
      return negativeAction(a.locus, a.ramification);
    case "negative":
      return positiveAction(a.locus, a.ramification);
    case "daimon":
      return negativeAction(a.locus, []);
  }
}

/**
 * The material core a Fax is built over. We use the behaviour's incarnation
 * (Girard 2001 §11, the material skeleton) when it is clean — every member
 * coherent and material — and otherwise fall back to the supplied generators
 * `b` restricted to their coherent members. The biorthogonal closure relative
 * to a finite `universe` can introduce daimonized completion members at distinct
 * loci that, superposed, would corrupt the η-copy; the material generators are
 * the faithful skeleton in that case. Either way the copy is built from genuine
 * coherent designs of B, never a synthesized valuation.
 */
function materialCore(b: readonly Design[], universe: readonly Design[]): readonly Design[] {
  const coherent = (ds: readonly Design[]): readonly Design[] =>
    ds.filter((d) => d.entries.length > 0
      && designCoherenceJudgment(d).kind === "game.design.coherence:witness");
  const inc = coherent(incarnation(b, universe));
  // a clean incarnation pairs each generator with exactly one material member.
  if (inc.length > 0 && inc.length <= coherent(b).length) return inc;
  return coherent(b);
}

/**
 * The interface loci of a behaviour B — the loci its material members play at
 * (`identity.mts::faxResponder` uses exactly this idea). Uses the visited loci
 * against the dual when available, else the raw support of the material core.
 */
function interfaceLociOf(core: readonly Design[], b: readonly Design[], universe: readonly Design[]): readonly Locus[] {
  const closure = biorthogonalClosure(b, universe);
  const dual = orthogonalOf(closure, universe);
  const loci = new Map<string, Locus>();
  for (const member of core) {
    for (const xi of visitedLoci(member, dual)) loci.set(locusKey(xi), xi);
  }
  if (loci.size === 0) {
    for (const member of core) for (const xi of support(member)) loci.set(locusKey(xi), xi);
  }
  return Object.freeze([...loci.values()]);
}

/**
 * The copycat identity `Fax_B : B ⊸ B`. For each interface locus ξ of B, Fax
 * mirrors the move across its two B-copies: the codomain copy `1·1·ξ` carries the
 * move as-is, the domain copy `0·0·ξ` carries its polarity-dual, both with the
 * SAME ramification (η-expansion — the whole subtree is copied). Both side
 * prefixes are even-length, so the copies land with their original polarity and
 * the design is coherent (checked by `isCoherentFax`). When `cut(fax_B, d)` runs
 * the §3 dispute, d's moves find their dual echo in Fax, the B-dispute converges,
 * and the surviving visible play is d re-emitted on the codomain copy — interface
 * hidden, copy verbatim.
 */
export function fax(b: readonly Design[], universe: readonly Design[]): Design {
  const core = materialCore(b, universe);
  const interfaceKeys = new Set(interfaceLociOf(core, b, universe).map((xi) => locusKey(xi)));
  const actions: Action[] = [];
  for (const member of core) {
    for (const xi of support(member)) {
      const key = locusKey(xi);
      if (!interfaceKeys.has(key)) continue;
      const here = designAction(member, xi);
      if (here === null) continue;
      // codomain copy 1·1·ξ: the move as-is; domain copy 0·0·ξ: polarity-dual.
      // Both side prefixes are even-length, so parity (hence coherence) is
      // preserved — no coercion needed; the η-copy lands coherent.
      actions.push(reLocate(here, prefixLocus(CODOMAIN_SIDE, xi)));
      actions.push(reLocate(dualAction(here), prefixLocus(DOMAIN_SIDE, xi)));
    }
  }
  return designFromActionSet(actions);
}

/* ------------------------------------------------------------------------- *
 * §6  Observational equality and the three category laws.
 * ------------------------------------------------------------------------- */

/** Observational equality `d ≃ e`: equal as material designs (`designLeq` both ways). */
export function observationallyEqual(d: Design, e: Design): boolean {
  return designLeq(d, e) && designLeq(e, d);
}

export interface IdentityLawWitness {
  readonly kind: "game.composition.identity:witness";
  readonly side: "left" | "right";
}
export interface IdentityLawObstruction {
  readonly kind: "game.composition.identity-obstruction";
  readonly side: "left" | "right";
  readonly member: Design;
  readonly composite: Design;
  readonly reason: string;
}
export type IdentityLawJudgment = IdentityLawWitness | IdentityLawObstruction;

/**
 * Left identity `cut(Fax_B, d) ≃ d` for each material member `d ∈ B`. The member
 * is presented as its counter-play `d^⊥` on Fax's domain interface (`0·…`); cut
 * glues Fax's codomain B (`1·1·…`) to it, the dispute converges, TRANSPORTS the
 * copy (dualized back) onto the codomain side, hides the interface, and the
 * codomain projection recovers d on its own (side-less) addresses.
 */
export function leftIdentityJudgment(b: readonly Design[], universe: readonly Design[]): IdentityLawJudgment {
  const fb = fax(b, universe);
  for (const d of materialCore(b, universe)) {
    if (d.entries.length === 0) continue;
    const composite = project(cut(fb, delocateDual(d, DOMAIN_SIDE)), CODOMAIN_SIDE);
    if (!observationallyEqual(composite, d)) {
      return Object.freeze({
        kind: "game.composition.identity-obstruction" as const,
        side: "left" as const,
        member: d,
        composite,
        reason: "cut(Fax_B, d) ≄ d (left identity failed on this member)",
      });
    }
  }
  return Object.freeze({ kind: "game.composition.identity:witness" as const, side: "left" as const });
}

/**
 * Right identity `cut(d, Fax_B) ≃ d`. The member is presented on the domain side
 * (`0·…`) as a B-valued play (`d : B ⊸ 1`); cut against Fax (`g`) transports the
 * copy onto the codomain side, recovering d.
 */
export function rightIdentityJudgment(b: readonly Design[], universe: readonly Design[]): IdentityLawJudgment {
  const fb = fax(b, universe);
  for (const d of materialCore(b, universe)) {
    if (d.entries.length === 0) continue;
    const composite = project(cut(delocateDesign(d, CODOMAIN_SIDE), fb), CODOMAIN_SIDE);
    if (!observationallyEqual(composite, d)) {
      return Object.freeze({
        kind: "game.composition.identity-obstruction" as const,
        side: "right" as const,
        member: d,
        composite,
        reason: "cut(d, Fax_B) ≄ d (right identity failed on this member)",
      });
    }
  }
  return Object.freeze({ kind: "game.composition.identity:witness" as const, side: "right" as const });
}

export interface AssociativityWitness {
  readonly kind: "game.composition.associativity:witness";
  readonly composite: Design;
}
export interface AssociativityObstruction {
  readonly kind: "game.composition.associativity-obstruction";
  readonly left: Design;
  readonly right: Design;
  readonly reason: string;
}
export type AssociativityJudgment = AssociativityWitness | AssociativityObstruction;

/**
 * Associativity `cut(cut(f,g),h) ≃ cut(f, cut(g,h))`. Holds because hiding is
 * confluent: each cut deletes one interface, and the disputes on disjoint
 * sub-addresses (0/1-side disjointness = `delocation.mts::superpose`'s
 * disjoint-prefix non-collision) are order-independent.
 */
export function associativityJudgment(f: Design, g: Design, h: Design): AssociativityJudgment {
  const left = cut(cut(f, g), h);
  const right = cut(f, cut(g, h));
  if (observationallyEqual(left, right)) {
    return Object.freeze({ kind: "game.composition.associativity:witness" as const, composite: left });
  }
  return Object.freeze({
    kind: "game.composition.associativity-obstruction" as const,
    left,
    right,
    reason: "cut(cut(f,g),h) ≄ cut(f, cut(g,h))",
  });
}

/* ------------------------------------------------------------------------- *
 * Boolean conveniences + the coherence guard for Fax.
 * ------------------------------------------------------------------------- */

export const isLeftIdentity = (b: readonly Design[], universe: readonly Design[]): boolean =>
  leftIdentityJudgment(b, universe).kind === "game.composition.identity:witness";

export const isRightIdentity = (b: readonly Design[], universe: readonly Design[]): boolean =>
  rightIdentityJudgment(b, universe).kind === "game.composition.identity:witness";

export const isAssociative = (f: Design, g: Design, h: Design): boolean =>
  associativityJudgment(f, g, h).kind === "game.composition.associativity:witness";

/** Whether the built `Fax_B` is a coherent design (the η-expanded copycat must be). */
export const isCoherentFax = (b: readonly Design[], universe: readonly Design[]): boolean =>
  designCoherenceJudgment(fax(b, universe)).kind === "game.design.coherence:witness";
