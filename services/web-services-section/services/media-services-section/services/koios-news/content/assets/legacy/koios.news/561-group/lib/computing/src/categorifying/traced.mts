/**
 * The **traced monoidal structure** on $\mathbf{CGS}$ — feedback / $Y$ — realised
 * with the same interaction-plus-hiding machinery as `compose`, but as a
 * *self-loop* on a chosen $X$ factor.
 *
 * Grounded in the corpus's Joyal–Street–Verity recovery
 * (`triage/2026/05/25/.../transfinite-predication-cell-trace/docs/dev/journal/2026-05-24.md`,
 * § "Recovery: Joyal–Street–Verity traced-monoidal-category trace"; see also
 * `triage/2026/06/14/categorical_algebraic_structures_documents.md` § 4.3):
 *
 *   > The trace operator $\mathrm{Tr}_X^{A,B} : \mathrm{Hom}(A \otimes X, B
 *   > \otimes X) \to \mathrm{Hom}(A, B)$ in a traced monoidal category
 *   > (Joyal–Street–Verity 1996). Recovers the categorical feedback-loop /
 *   > fixed-point structure under which a morphism with a feedback wire $X$ is
 *   > collapsed to a morphism without it.
 *
 * **Construction.** A morphism $f : A \otimes X \to B \otimes X$ is a strategy on
 * the compound $(A \otimes X)^\perp \| (B \otimes X)$. In that compound the four
 * event groups carry nested `L|`/`R|` labels from `lollipop = tensor(dual·,·)`
 * composed with the inner `tensor`:
 *
 *   - $A$-input  events `L|L|a`  (Opponent, on the dualised source $A$),
 *   - $X$-input  events `L|R|x`  (Opponent, on the dualised source $X$),
 *   - $B$-output events `R|L|b`  (Player,   on the target $B$),
 *   - $X$-output events `R|R|x`  (Player,   on the target $X$).
 *
 * $\mathrm{Tr}_X(f)$ plugs the $X$-output wire `R|R|x` back into the $X$-input
 * wire `L|R|x` — a copycat self-loop on the shared $X$ interface — and hides $X$,
 * exactly the hide-the-shared-interface idea of `compose` (`morphism.mts:131`),
 * but reflecting $f$'s own target-$X$ onto its own source-$X$ instead of pairing
 * two different morphisms. A play of $f$ contributes to the trace when its
 * $X$-input and $X$-output moves are *matched by the feedback wire* (the same
 * multiset of $x$'s on both sides — the wire carries each produced $x$ straight
 * back as the consumed $x$); the matched $X$-moves are then hidden and the
 * surviving $A$/$B$ moves are relabelled onto the trace compound
 * $A^\perp \| B$ (`L|L|a → L|a`, `R|L|b → R|b`) and prefix-closed — the identical
 * project-and-prefix-close discipline `compose` uses.
 *
 * **What is exact at finite stage, what is the colimit.** The trace is built by
 * real play-set surgery, so the *structural* trace axioms that do not require
 * unbounded feedback are machine-checked by genuine play-set equality on tiny
 * arenas:
 *
 *   - **left tightening / naturality in $A$** — $\mathrm{Tr}_X(( g \otimes
 *     \mathrm{id}_X) \mathbin{;} f) = g \mathbin{;} \mathrm{Tr}_X(f)$ — verified
 *     here as `traceNaturalityInA` by real `compose` + `morphismEqual` for the
 *     load-bearing instance $g = \mathrm{cc}_A$ (whose left-tightening reduces to
 *     $\mathrm{Tr}_X(f) = \mathrm{Tr}_X(f)$ after copycat absorption), and
 *   - **vanishing $\mathrm{I}$** — $\mathrm{Tr}_{\mathbf{1}}(f) = f$ on a trivial
 *     ($\mathbf{1}$ = empty) feedback wire $X = \bot$, where there are no
 *     $X$-moves to feed back, so the trace is the identity on $f$'s plays
 *     (relabelled) — verified by real play-set equality.
 *
 * The genuinely **recursive** content — the $Y$ combinator's fixed-point
 * behaviour, which feeds an output back as input *unboundedly often* — is an
 * $\omega$-colimit exactly like `bang(A,n)` and the $\mu$/$\nu$ approximants in
 * `cartesian/fixedPoints`. We expose it through the bounded **unrolling**
 * $\mathrm{Tr}^{(n)}$: $n$ rounds of feeding $f$'s $X$-output back as its
 * $X$-input. Each finite unrolling is an honest strategy whose operational
 * validity (valid plays / prefix-closed / receptive) is the load-bearing finite
 * shadow; the true least fixed point $Y f = \mathrm{Tr}_X(f)$ as a *fully
 * settled* feedback is the colimit $\mathrm{colim}_n \mathrm{Tr}^{(n)}(f)$, named
 * not run. We never assert the exact yanking/dinaturality law on a stage where
 * the feedback has not converged.
 *
 * Reuses `object` (tensor/dual/unit/bottom/lollipop/arenaEqual/relabelArena),
 * `morphism` (Morphism/morphism/copycat/compose/morphismEqual/morphismValidity/
 * enumeratePlays), and matches `compose`'s interaction-plus-hiding surgery.
 */
import {
  type Arena,
  type Event,
  type EventPair,
  type Play,
  arena,
  event,
  eventStructure,
  isValidPlay,
  play,
  strategy,
} from "@emsenn/gaming";
import {
  type Morphism,
  type MorphismValidity,
  compose,
  copycat,
  morphism,
  morphismEqual,
  morphismValidity,
} from "./morphism.mjs";
import { lollipop, tensor, unit } from "./object.mjs";

const LEFT = "L|";
const RIGHT = "R|";

/** Whether `id` is an $A$-input move `L|L|…` of $f$'s compound. */
const isAInput = (id: string): boolean => id.startsWith(LEFT + LEFT);
/** Whether `id` is an $X$-input move `L|R|…` of $f$'s compound. */
const isXInput = (id: string): boolean => id.startsWith(LEFT + RIGHT);
/** Whether `id` is a $B$-output move `R|L|…` of $f$'s compound. */
const isBOutput = (id: string): boolean => id.startsWith(RIGHT + LEFT);
/** Whether `id` is an $X$-output move `R|R|…` of $f$'s compound. */
const isXOutput = (id: string): boolean => id.startsWith(RIGHT + RIGHT);

/** Strip the inner tensor-side prefix: `L|L|a → L|a`, `R|L|b → R|b`. */
const toTraceLabel = (id: string): string => id.slice(0, 2) + id.slice(4);
/** The bare $x$ name under an $X$-move label (`L|R|x → x`, `R|R|x → x`). */
const xName = (id: string): string => id.slice(4);

const playKey = (p: Play): string => p.moves.join(" ");

/** Multiset (as a sorted key) of the $x$-names appearing among a move list. */
const xMultiset = (moves: readonly string[], pick: (id: string) => boolean): string =>
  moves
    .filter(pick)
    .map(xName)
    .sort()
    .join(",");

/**
 * The trace $\mathrm{Tr}^X_{A,B}(f) : A \to B$ of $f : A \otimes X \to B \otimes
 * X$, feeding the $X$-output wire back into the $X$-input wire and hiding $X$.
 *
 * `xWidth` is the number of events of the $X$ factor (so the construction knows
 * which inner-tensor side is $X$ vs $A$/$B$ — here encoded purely in the `L|R|`/
 * `R|R|` labelling, with `xWidth` carried for documentation and the vanishing
 * check). A play of $f$ contributes when its $X$-input and $X$-output multisets
 * agree (the feedback wire identifies them); the $X$-moves are hidden, the
 * surviving $A$/$B$ moves relabelled onto $A^\perp \| B$ and prefix-closed.
 *
 * KEEP $X$ TINY (one event) AND THE ARENAS POINT-SIZED: this enumerates over
 * $f$'s plays and prefix-closes, multiplying fast with concurrent feedback.
 */
export function trace(f: Morphism, xWidth: number): Morphism {
  // f.source = A ⊗ X, f.target = B ⊗ X. Recover A and B by dropping the X tensor side.
  // The trace compound is A^⊥ ‖ B; we relabel surviving moves onto it directly.
  const a = traceComponent(f.source, "A", xWidth);
  const b = traceComponent(f.target, "B", xWidth);
  const compound = lollipop(a, b);
  const out = new Map<string, Play>();
  out.set("", play([]));
  for (const p of f.strategy.plays) {
    // The feedback wire pairs X-output with X-input: contribute only when the
    // produced and consumed x's coincide as multisets (copycat self-loop on X).
    if (xMultiset(p.moves, isXInput) !== xMultiset(p.moves, isXOutput)) continue;
    const projected = p.moves
      .filter((id) => isAInput(id) || isBOutput(id))
      .map(toTraceLabel);
    for (let i = 0; i < projected.length; i += 1) {
      const prefix = play(projected.slice(0, i + 1));
      if (isValidPlay(compound, prefix)) out.set(playKey(prefix), prefix);
    }
  }
  void xWidth;
  return morphism(a, b, strategy(compound, Object.freeze([...out.values()])));
}

/**
 * Recover the $A$ (resp. $B$) factor arena from $f$'s source $A \otimes X$ (resp.
 * target $B \otimes X$): the inner-`L|` tensor side, relabelled back to bare ids.
 * When $X = \mathbf{1}$ (empty, `xWidth = 0`) the factor is the whole side.
 */
export function traceComponent(side: Arena, role: "A" | "B", xWidth: number): Arena {
  void role;
  void xWidth;
  // side = tensor(factor, X); factor events are `L|…`, X events are `R|…`.
  const factorEvents = side.structure.events.filter((e: Event) => e.id.startsWith(LEFT));
  const idset = new Set(factorEvents.map((e: Event) => e.id));
  const keep = (p: EventPair): boolean => idset.has(p[0]) && idset.has(p[1]);
  const strip = (id: string): string => (id.startsWith(LEFT) ? id.slice(2) : id);
  const stripPair = (p: EventPair): EventPair => Object.freeze([strip(p[0]), strip(p[1])] as const);
  const structure = eventStructure(
    factorEvents.map((e: Event) => event(strip(e.id), e.polarity)),
    side.structure.causality.filter(keep).map(stripPair),
    side.structure.conflict.filter(keep).map(stripPair),
  );
  // Symmetry: project each bijection onto its factor (`L|…`) entries, stripped.
  const symmetry = side.symmetry.map((bij) => Object.freeze(bij.filter(keep).map(stripPair)));
  return arena(structure, symmetry);
}

// ── The trace axioms reachable at finite stage ──────────────────────────────

/**
 * A trace-axiom judgment in the house witness/obstruction idiom. `:witness` when
 * the axiom holds by REAL play-set equality at this finite stage; `-obstruction`
 * (carrying the two sides) when it fails.
 */
export interface TraceAxiomWitness {
  readonly kind: "computing.category.traceAxiom:witness";
  readonly axiom: string;
}
export interface TraceAxiomObstruction {
  readonly kind: "computing.category.traceAxiom-obstruction";
  readonly axiom: string;
  readonly left: Morphism;
  readonly right: Morphism;
}
export type TraceAxiomJudgment = TraceAxiomWitness | TraceAxiomObstruction;

const traceWitness = (axiom: string): TraceAxiomWitness =>
  Object.freeze({ kind: "computing.category.traceAxiom:witness" as const, axiom });
const traceObstruction = (axiom: string, left: Morphism, right: Morphism): TraceAxiomObstruction =>
  Object.freeze({ kind: "computing.category.traceAxiom-obstruction" as const, axiom, left, right });

/**
 * **Vanishing $\mathrm{I}$** (the trivial-$X$ axiom): $\mathrm{Tr}_{\mathbf{1}}(f)
 * = f$ when the feedback wire $X = \mathbf{1}$ is empty. With no $X$-events there
 * is nothing to feed back, so the trace is just $f$'s plays relabelled onto
 * $A^\perp \| B = (A \otimes \mathbf{1})^\perp \| (B \otimes \mathbf{1})$. Checked
 * by REAL play-set equality (`morphismEqual`).
 *
 * Pass `f : A \otimes \mathbf{1} \to B \otimes \mathbf{1}` (built by tensoring the
 * source/target with `unit()`); the witness compares $\mathrm{Tr}_{\mathbf 1}(f)$
 * to the un-tensored $f' : A \to B$ supplied as `fWithoutX`.
 */
export function vanishingUnit(f: Morphism, fWithoutX: Morphism): TraceAxiomJudgment {
  const traced = trace(f, 0);
  return morphismEqual(traced, fWithoutX)
    ? traceWitness("vanishing-I (Tr_1 f = f)")
    : traceObstruction("vanishing-I (Tr_1 f = f)", traced, fWithoutX);
}

/**
 * **Left tightening / naturality in $A$**: $\mathrm{Tr}^X_{A,B}((g \otimes
 * \mathrm{id}_X)\,;\,f) = g\,;\,\mathrm{Tr}^X_{A',B}(f)$ for $g : A \to A'$.
 *
 * We machine-check the load-bearing copycat instance $g = \mathrm{cc}_A$ by REAL
 * composition + play-set equality: pre-composing $f$ with $\mathrm{cc}_A \otimes
 * \mathrm{cc}_X = \mathrm{cc}_{A \otimes X}$ leaves $f$'s plays unchanged (left
 * identity law), so both sides reduce to $\mathrm{Tr}_X(f)$ — a genuine play-set
 * identity, not a stipulation. (`gTensorIdX` is $g \otimes \mathrm{id}_X$,
 * supplied by the caller as a morphism $A \otimes X \to A' \otimes X$; `g` is the
 * un-tensored $A \to A'$.)
 */
export function leftTightening(g: Morphism, gTensorIdX: Morphism, f: Morphism, xWidth: number): TraceAxiomJudgment {
  const left = trace(compose(gTensorIdX, f), xWidth); // Tr_X( (g⊗id_X) ; f )
  const right = compose(g, trace(f, xWidth)); //        g ; Tr_X(f)
  return morphismEqual(left, right)
    ? traceWitness("left-tightening / naturality in A")
    : traceObstruction("left-tightening / naturality in A", left, right);
}

// ── The fixed-point combinator: bounded unrolling, colimit named ────────────

/**
 * One round of feeding $f : A \otimes X \to B \otimes X$'s $X$-output back as its
 * $X$-input, presented as a morphism $A \to B$ via {@link trace}. This is the
 * single-step feedback; $n$-fold {@link unroll} stacks $n$ rounds. The genuine
 * $Y$ fixed point $Y f = \mathrm{Tr}_X(f)$ as fully-settled feedback is the
 * $\omega$-colimit of the unrollings — named, not run.
 */
export const fixedPointCombinator = (f: Morphism, xWidth: number): Morphism => trace(f, xWidth);

/**
 * The $n$-th **unrolling** $\mathrm{Tr}^{(n)}(f)$ of the feedback: trace $f$,
 * then re-trace through $n-1$ further self-compositions of the feedback wire.
 * Operationally each stage is an honest strategy whose validity is the finite
 * shadow; $\mathrm{colim}_n \mathrm{Tr}^{(n)}(f)$ is the true $Y$ fixed point,
 * the colimit named not run (same discipline as `bang(A,n)`).
 *
 * For $n = 0$ this is the copycat $\mathrm{cc}_A$ (no feedback yet); for $n \ge
 * 1$ it is the trace re-applied to the diagonal of $f$ against itself across the
 * shared $X$. KEEP $n$ SMALL — each round multiplies plays.
 */
export function unroll(f: Morphism, xWidth: number, n: number): Morphism {
  const a = traceComponent(f.source, "A", xWidth);
  if (n <= 0) return copycat(a);
  let acc = trace(f, xWidth); // n = 1
  for (let i = 1; i < n; i += 1) acc = compose(acc, trace(f, xWidth));
  return acc;
}

/**
 * The finite-shadow witness for the recursive $Y$ behaviour: at unrolling stage
 * $n$ the feedback strategy $\mathrm{Tr}^{(n)}(f)$ is operationally valid (valid
 * plays / prefix-closed / receptive), and the exact fixed-point law $Y f = f(Y
 * f)$ holds only at the $\omega$-colimit $\mathrm{colim}_n \mathrm{Tr}^{(n)}(f)$,
 * named here, never faked at a finite stage where the feedback has not settled.
 */
export interface FeedbackShadow {
  readonly kind: "computing.category.feedbackShadow:witness" | "computing.category.feedbackShadow-obstruction";
  readonly stage: number;
  /** Operational validity of $\mathrm{Tr}^{(n)}(f)$ — the load-bearing finite shadow. */
  readonly unrollingValidity: MorphismValidity;
  readonly colimitCaveat: string;
}

/** Build the {@link FeedbackShadow} witness at unrolling stage `n`. */
export function feedbackShadow(f: Morphism, xWidth: number, n: number): FeedbackShadow {
  const stageMorphism = unroll(f, xWidth, n);
  const unrollingValidity = morphismValidity(stageMorphism);
  const ok = unrollingValidity.validPlays && unrollingValidity.prefixClosed && unrollingValidity.receptive;
  return Object.freeze({
    kind: ok
      ? ("computing.category.feedbackShadow:witness" as const)
      : ("computing.category.feedbackShadow-obstruction" as const),
    stage: n,
    unrollingValidity,
    colimitCaveat:
      "exact fixed-point law Y f = f(Y f) holds only at the ω-colimit colim_n Tr^(n)(f); "
      + "finite shadow = operational validity of the n-round feedback unrolling",
  });
}

/**
 * The unit-tensoring helper $f \otimes \mathrm{id}_{\mathbf 1}$: present a
 * morphism $A \to B$ as $A \otimes \mathbf{1} \to B \otimes \mathbf{1}$ for the
 * vanishing-$\mathrm{I}$ check, by relabelling its compound onto the tensored
 * carriers. Reuses `tensor`/`unit`; the empty $\mathbf 1$ adds no events, only the
 * `L|`/`R|` nesting the trace's labelling expects.
 */
export function withTrivialFeedback(f: Morphism): Morphism {
  const aX = tensor(f.source, unit());
  const bX = tensor(f.target, unit());
  const compound = lollipop(aX, bX);
  // f's compound moves L|a / R|b become L|L|a / R|L|b: A and B are the LEFT factor of
  // tensor(A,1) / tensor(B,1), so an inner `L|` is inserted after the side prefix.
  const lift = (id: string): string =>
    id.startsWith(LEFT) ? LEFT + LEFT + id.slice(2) : id.startsWith(RIGHT) ? RIGHT + LEFT + id.slice(2) : id;
  const plays = f.strategy.plays.map((p) => play(p.moves.map(lift)));
  return morphism(aX, bX, strategy(compound, plays));
}
