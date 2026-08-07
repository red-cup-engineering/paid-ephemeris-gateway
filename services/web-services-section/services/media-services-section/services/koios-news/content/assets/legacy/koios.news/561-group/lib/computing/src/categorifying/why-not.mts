/**
 * The why-not monad $?$ — the De Morgan dual of the exponential $!$.
 *
 * Per `concurrent-game-system.md` (§ "The !-comonad and Seely's linear-exponential
 * structure", read through linear negation): linear logic's two exponentials are De
 * Morgan dual, $?A := ({!}(A^\perp))^\perp$. Where $!A$ lets *Opponent* request $A$
 * arbitrarily often (a comonad, replicable demand), $?A$ lets *Player* supply $A$
 * arbitrarily often (a monad, replicable provision). Everything here is obtained by
 * dualizing the $!$-machinery already built in `./exponential.mjs` — we do not
 * re-derive the copy structure; we only relabel through $(-)^\perp$.
 *
 * The dualities, term by term:
 *
 *   - object:           $?A = ({!}(A^\perp))^\perp$            (`whyNot` = `dual ∘ bang ∘ dual`)
 *   - functor on maps:  $?f = (({!}(f^\perp))^\perp$           (`whyNotMap` = dualize, `bangMap`, dualize back)
 *   - unit  $\eta$:     codereliction $= (\varepsilon)^\perp$  (dual of `dereliction`)
 *   - mult. $\mu$:      cojoin $= (\delta)^\perp$              (dual of `digging`)
 *
 * The monad laws are the De Morgan duals of the comonad laws: where the $!$-side law
 * was exact by real composition it is exact by the *dual* composition; where the
 * $!$-side was a finite shadow (coassociativity → associativity), so is the $?$-side.
 * The standing finite-stage caveats carry over verbatim: `enumeratePlays` is
 * exponential in concurrent events (keep arenas tiny), and strict symmetry-invariance
 * over the copy-groupoid is an $\omega$-colimit property, so maps between co-banged
 * arenas are checked for operational structure (valid plays, prefix-closed,
 * receptive) and the play-level laws, never for finite symmetry-invariance.
 */
import { type Arena, play, strategy } from "@emsenn/gaming";
import {
  type Morphism,
  compose,
  copycat,
  morphism,
  morphismEqual,
} from "./morphism.mjs";
import { dual, lollipop } from "./object.mjs";
import { bang, bangMap, dereliction, digging } from "./exponential.mjs";

// ── Dualizing a morphism: $f \mapsto f^\perp$ ───────────────────────────────
//
// A morphism $f : A \to B$ is a strategy on $A^\perp \| B = $ `tensor(dual A, B)`,
// whose moves are tagged `L|…` on the $A$-side and `R|…` on the $B$-side. Its
// $*$-autonomous transpose $f^\perp : B^\perp \to A^\perp$ lives on
// $(B^\perp)^\perp \| A^\perp = $ `tensor(B, dual A)` — the *same* plays, with the
// two tensor sides exchanged: what was the $A$-side (`L|…`) is now the right-hand
// $A^\perp$ factor (`R|…`), and what was the $B$-side (`R|…`) is now the left-hand
// $B^\perp$ factor (`L|…`). Polarities flip exactly because the arenas are dualized;
// the move *sequences* are preserved, so a valid play of $f$ is, side-swapped, a
// valid play of $f^\perp$ (verified operationally in the tests). $(-)^\perp$ is an
// involution on morphisms: swapping sides twice and dualizing arenas twice is the
// identity.

const swapSide = (move: string): string =>
  move.startsWith("L|") ? `R|${move.slice(2)}` : move.startsWith("R|") ? `L|${move.slice(2)}` : move;

/**
 * Linear negation on morphisms: the transpose $f^\perp : B^\perp \to A^\perp$ of a
 * morphism $f : A \to B$. The source/target are dualized and exchanged, and each
 * play's `L|…`/`R|…` tensor-side tags are swapped — the same strategy, read on the
 * dual compound. Involutive: `dualMorphism(dualMorphism(f))` has $f$'s plays back.
 */
export function dualMorphism(f: Morphism): Morphism {
  const source = dual(f.target);
  const target = dual(f.source);
  const compound = lollipop(source, target);
  const plays = f.strategy.plays.map((p) => play(p.moves.map(swapSide)));
  return morphism(source, target, strategy(compound, plays));
}

// ── The $?$-functor: object and morphism maps ───────────────────────────────

/**
 * The why-not object $?A = ({!}(A^\perp))^\perp$ at the $n$-copy stage: dualize $A$,
 * bang it (the finite copy approximation, with the copy-permutation symmetry), and
 * dualize back. Player may supply $n$ interchangeable copies of $A$. The true $?A$ is
 * the $\omega$-colimit over the copy count; this is the finite stage, inheriting
 * `bang`'s copy tags `c{i}|…`.
 */
export const whyNot = (a: Arena, copies: number): Arena => dual(bang(dual(a), copies));

/**
 * The functorial action $?f : ?A \to ?B$ of why-not on a morphism $f : A \to B$, at
 * the $n$-copy stage. By De Morgan, $?f = (({!}(f^\perp))^\perp$: transpose $f$ to
 * $f^\perp : B^\perp \to A^\perp$, apply the $!$-functor to get
 * ${!}(f^\perp) : {!}(B^\perp) \to {!}(A^\perp)$, then transpose back to
 * $({!}(f^\perp))^\perp : ({!}(A^\perp))^\perp \to ({!}(B^\perp))^\perp = ?A \to ?B$.
 * Functoriality ($?(\mathrm{id}) = \mathrm{id}$, $?(g \circ f) = ?g \circ ?f$) is the
 * dual of `bangMap`'s, inherited through the involution `dualMorphism`.
 */
export const whyNotMap = (f: Morphism, copies: number): Morphism =>
  dualMorphism(bangMap(dualMorphism(f), copies));

// ── Unit $\eta$ and multiplication $\mu$ ────────────────────────────────────

/**
 * The unit $\eta_A : A \to ?A$ — *codereliction*, the De Morgan dual of the
 * dereliction counit $\varepsilon_{A^\perp} : {!}(A^\perp) \to A^\perp$. Transposing
 * $\varepsilon_{A^\perp}$ gives $(\varepsilon_{A^\perp})^\perp : (A^\perp)^\perp \to
 * ({!}(A^\perp))^\perp$, i.e. $A \to ?A$: Player promises to supply $A$ as one of the
 * copies, dual to Opponent's "use a copy". The single-copy unit corresponds to
 * `dereliction(dual a, 1)` transposed; at $n$ copies it is `dereliction(dual a, n)`'s
 * dual, the codereliction into the $n$-copy stage.
 */
export const codereliction = (a: Arena, copies: number): Morphism =>
  dualMorphism(dereliction(dual(a), copies));

/**
 * The multiplication $\mu_A : ??A \to ?A$ — *cojoin*, the De Morgan dual of the
 * digging comultiplication $\delta_{A^\perp} : {!}(A^\perp) \to {!}{!}(A^\perp)$ at
 * stage ${!}^{(o\cdot m)} \to {!}^{(o)}{!}^{(m)}$. Transposing $\delta$ sends
 * $??A = (({!}^{(o)}{!}^{(m)}(A^\perp))^\perp \to ({!}^{(o\cdot m)}(A^\perp))^\perp =
 * ?A$, collapsing copies-of-copies into copies under the colimit pairing
 * $\omega \cong \omega \times \omega$ — Player's nested provisions flatten into one.
 */
export const cojoin = (a: Arena, outer: number, inner: number): Morphism =>
  dualMorphism(digging(dual(a), outer, inner));

// ── The monad laws, as witnesses dual to the comonad laws ───────────────────

/** A monad/functor law witness: a named $?$-law verified at a finite stage, dual to a $!$-law. */
export interface MonadLawWitness {
  readonly kind: "computing.category.monad.law:witness";
  readonly law: string;
  readonly copies: number;
}
export interface MonadLawObstruction {
  readonly kind: "computing.category.monad.law-obstruction";
  readonly law: string;
  readonly copies: number;
}
export type MonadLawJudgment = MonadLawWitness | MonadLawObstruction;

const lawJudgment = (law: string, copies: number, holds: boolean): MonadLawJudgment =>
  holds
    ? Object.freeze({ kind: "computing.category.monad.law:witness" as const, law, copies })
    : Object.freeze({ kind: "computing.category.monad.law-obstruction" as const, law, copies });

/**
 * Functoriality of $?$ on identities: $?(\mathrm{cc}_A) = \mathrm{cc}_{?A}$ at the
 * $n$-copy stage — the De Morgan dual of `bangPreservesIdentity`. The copycat is
 * self-dual under `dualMorphism` (side-swap of a copycat is a copycat), so this is
 * the dual of `!(cc) = cc(!)`, checked by real play-level equality.
 */
export function whyNotPreservesIdentity(a: Arena, copies: number): MonadLawJudgment {
  return lawJudgment("?(id) = id", copies, morphismEqual(whyNotMap(copycat(a), copies), copycat(whyNot(a, copies))));
}

/**
 * Functoriality of $?$ on composition: $?(g \circ f) = ?g \circ ?f$ at the $n$-copy
 * stage, for $f : A \to B$, $g : B \to C$ — the De Morgan dual of
 * `bangPreservesComposition`. Checked by real composition on the $?$-side.
 */
export function whyNotPreservesComposition(f: Morphism, g: Morphism, copies: number): MonadLawJudgment {
  const whyNotted = whyNotMap(compose(f, g), copies);
  const stepwise = compose(whyNotMap(f, copies), whyNotMap(g, copies));
  return lawJudgment("?(g∘f) = ?g∘?f", copies, morphismEqual(whyNotted, stepwise));
}

/**
 * The left unit law $\mu_A \circ \eta_{?A} = \mathrm{id}_{?A}$ — the De Morgan dual of
 * the comonad's left counit law $\varepsilon_{{!}A^\perp} \circ \delta_{A^\perp} =
 * \mathrm{id}$ on the dual resource $A^\perp$, exact at the stage $\text{outer}=1$.
 * Linear negation is *contravariant* on morphisms, so dualizing the $!$-composite
 * $\varepsilon_{{!}A^\perp} \circ \delta_{A^\perp}$ reverses it to $\mu \circ
 * \eta_{?A} = \texttt{compose}(\eta, \mu)$ on the $?$-side. Verified by real
 * $?$-composition, exact at the same finite stage where its $!$-shadow is exact —
 * which, because the copy machinery runs on the *requestable* resource $A^\perp$,
 * means on a `?A` whose underlying `A` is the Opponent (negative) arena.
 */
export function monadUnitLeft(a: Arena, copies: number): MonadLawJudgment {
  const eta = dualMorphism(dereliction(bang(dual(a), copies), 1)); // ?A → ??A  (dual of ε_!A)
  const mu = cojoin(a, 1, copies); // ??A → ?A  (dual of δ at outer=1)
  const composite = compose(eta, mu); // ?A → ?A
  return lawJudgment("μ ∘ η_?A = id", copies, morphismEqual(composite, copycat(whyNot(a, copies))));
}

/**
 * The right unit law $\mu_A \circ ?(\eta_A) = \mathrm{id}_{?A}$ — the De Morgan dual
 * of the comonad's right counit law ${!}(\varepsilon_{A^\perp}) \circ \delta_{A^\perp}
 * = \mathrm{id}$ on the dual resource $A^\perp$, exact at the stage $\text{inner}=1$.
 * Dualizing contravariantly gives $\mu \circ ?(\eta_A) = \texttt{compose}(?\eta, \mu)$
 * on the $?$-side; verified by real composition through `whyNotMap`, exact at the same
 * stage (and, as for the left law, on a `?A` whose underlying `A` is the negative
 * arena, since the copy machinery runs on the requestable resource $A^\perp$).
 */
export function monadUnitRight(a: Arena, copies: number): MonadLawJudgment {
  const whyNotEta = whyNotMap(codereliction(a, 1), copies); // ?A → ??A  (dual of !(ε_A))
  const mu = cojoin(a, copies, 1); // ??A → ?A  (dual of δ at inner=1)
  const composite = compose(whyNotEta, mu); // ?A → ?A
  return lawJudgment("μ ∘ ?(η_A) = id", copies, morphismEqual(composite, copycat(whyNot(a, copies))));
}

/**
 * Associativity $\mu_A \circ \mu_{?A} = \mu_A \circ ?(\mu_A)$ — the De Morgan dual of
 * the comonad's coassociativity. As on the $!$-side, the three-fold composite forces
 * unequal copy counts at every finite stage (the law lives in the $\omega$-colimit),
 * so it is witnessed by the *same* load-bearing finite shadow: the associativity of
 * the copy-pairing $\omega \cong \omega \times \omega$, computed for real over every
 * source copy $k$. Cojoin transposes digging, and the pairing it flattens is digging's
 * verbatim, so the $?$-side shadow is literally the $!$-side computation — we run it
 * directly here rather than reach back through `dualMorphism` on three-fold composites
 * (which would force the same unequal-count obstruction the colimit caveat names).
 */
export function monadAssociativity(outer: number, middle: number, inner: number): MonadLawJudgment {
  const total = outer * middle * inner;
  let agree = true;
  for (let k = 0; k < total; k += 1) {
    // outer-first flatten (μ ∘ μ_?A): k ↦ (i, r), r in 0..(middle·inner); then r ↦ (j, l).
    const i1 = Math.floor(k / (middle * inner));
    const r = k % (middle * inner);
    const j1 = Math.floor(r / inner);
    const l1 = r % inner;
    // inner-first flatten (μ ∘ ?μ): k ↦ (q, l), q in 0..(outer·middle); then q ↦ (i, j).
    const q = Math.floor(k / inner);
    const l2 = k % inner;
    const i2 = Math.floor(q / middle);
    const j2 = q % middle;
    if (i1 !== i2 || j1 !== j2 || l1 !== l2) {
      agree = false;
      break;
    }
  }
  return lawJudgment("μ ∘ μ_?A = μ ∘ ?μ (pairing assoc.)", total, agree);
}
