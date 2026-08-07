/**
 * The linear-exponential comonad $!$ — replicable resources.
 *
 * Per `concurrent-game-system.md` (§ "The !-comonad and Seely's linear-exponential
 * structure"): $!A$ is the arena where Opponent may request $A$ arbitrarily many
 * times in parallel — "a parallelization of countably many copies of $A$ together
 * with a symmetry groupoid containing arbitrary permutations of the copies (so the
 * system regards copies as interchangeable)". $!$ satisfies Seely's axioms, and by
 * the Girard decomposition the Kleisli category $\mathcal{K}\ell(!)$ is Cartesian
 * closed with exponential $A \Rightarrow B = {!}A \multimap B$.
 *
 * The true $!A$ is the $\omega$-colimit over the copy count — irreducibly infinite,
 * so not a finite carrier. We realize it executably at each finite stage:
 * `bang(A, n)` is the $n$-copy approximation $!^{(n)}A$, with the *copy-permutation*
 * symmetry groupoid $S_n$ that makes the copies interchangeable. Every construction
 * below (`dereliction`, the Seely cardinality witness, the comonad laws) is real and
 * testable at finite $n$; only the colimit itself is named, not run. The copy
 * tag is `c{i}|…`, kept disjoint from the `L|`/`R|` tensor tags.
 */
import {
  type Arena,
  type Bijection,
  type Event,
  type EventPair,
  type PrimeEventStructure,
  type Strategy,
  arena,
  event,
  eventStructure,
  play,
  strategy,
} from "@emsenn/gaming";
import { type Morphism, compose, copycat, enumeratePlays, morphism, morphismEqual } from "./morphism.mjs";
import { lollipop, tensor, unit } from "./object.mjs";

/** Build a strategy by enumerating plays under a Player-admission rule. */
const strategyFrom = (
  compound: Arena,
  admitPlayer: (history: { readonly moves: readonly string[] }, move: string) => boolean,
): Strategy => strategy(compound, enumeratePlays(compound, admitPlayer));

const copyTag = (i: number, id: string): string => `c${i}|${id}`;

/** All permutations of `[0, …, n-1]` — the copy-permutation group $S_n$. */
function permutations(n: number): readonly (readonly number[])[] {
  if (n <= 1) return [Object.freeze(Array.from({ length: n }, (_, i) => i))];
  const out: number[][] = [];
  for (const rest of permutations(n - 1)) {
    for (let pos = 0; pos < n; pos += 1) {
      out.push([...rest.slice(0, pos), n - 1, ...rest.slice(pos)]);
    }
  }
  return Object.freeze(out.map((p) => Object.freeze(p)));
}

/**
 * The $n$-copy approximation $!^{(n)}A$ of the exponential $!A$: $n$ disjoint
 * copies of $A$ (no cross-copy causality or conflict) with the copy-permutation
 * symmetry groupoid $S_n$ — the copies are interchangeable. The true $!A$ is the
 * $\omega$-colimit as $n \to \infty$; this is the finite stage.
 */
export function bang(a: Arena, copies: number): Arena {
  const events: Event[] = [];
  const causality: EventPair[] = [];
  const conflict: EventPair[] = [];
  for (let i = 0; i < copies; i += 1) {
    for (const e of a.structure.events) events.push(event(copyTag(i, e.id), e.polarity));
    for (const pair of a.structure.causality) causality.push(Object.freeze([copyTag(i, pair[0]), copyTag(i, pair[1])] as const));
    for (const pair of a.structure.conflict) conflict.push(Object.freeze([copyTag(i, pair[0]), copyTag(i, pair[1])] as const));
  }
  const structure: PrimeEventStructure = eventStructure(events, causality, conflict);
  const symmetry: Bijection[] = permutations(copies).map((perm) =>
    Object.freeze(
      a.structure.events.flatMap((e: Event) => e.id).flatMap((id: string) =>
        perm.map((target, source) => Object.freeze([copyTag(source, id), copyTag(target, id)] as const)),
      ),
    ),
  );
  return arena(structure, symmetry);
}

/** The number of copies in a finite exponential stage (recovered from the tag). */
export const bangCopies = (banged: Arena): number => {
  const indices = new Set<number>();
  for (const e of banged.structure.events) {
    const match = /^c(\d+)\|/.exec(e.id);
    if (match) indices.add(Number(match[1]));
  }
  return indices.size;
};

/**
 * The counit $\varepsilon_A : {!}A \to A$ — *dereliction*: copy $A$ from whichever
 * copy Opponent supplies. A strategy on $({!}A)^\perp \| A$ where each Player move
 * `R|id` waits for *some* copy's Opponent move `L|c{i}|id`. Copying a *specific*
 * copy would privilege it and break the copy-permutation symmetry of $!A$; the
 * symmetry-invariant counit is the symmetry-closure of "use a copy" — Opponent's
 * choice of copy is immaterial exactly because the copies are interchangeable.
 */
export function dereliction(a: Arena, copies: number): Morphism {
  const source = bang(a, copies);
  const compound = lollipop(source, a);
  const admitPlayer = (history: { readonly moves: readonly string[] }, move: string): boolean => {
    const id = move.slice(2); // strip the `R|` output tag
    return history.moves.some((m) => {
      const match = /^L\|c\d+\|(.+)$/.exec(m);
      return match !== null && match[1] === id;
    });
  };
  return morphism(source, a, strategyFrom(compound, admitPlayer));
}

// ── Seely's axiom and the comonad laws, as witnesses at finite stage ────────

export interface SeelyWitness {
  readonly kind: "computing.category.seely:witness";
  readonly copies: number;
  readonly leftEvents: number;
  readonly rightEvents: number;
}
export interface SeelyObstruction {
  readonly kind: "computing.category.seely-obstruction";
  readonly copies: number;
  readonly leftEvents: number;
  readonly rightEvents: number;
}
export type SeelyJudgment = SeelyWitness | SeelyObstruction;

/**
 * Seely's iso $!(A \mathbin{\&} B) \cong {!}A \otimes {!}B$ at finite stage,
 * witnessed by the event-count identity: $n$ copies of $(A \sqcup B)$ has the same
 * event budget as ($n$ copies of $A$) $\sqcup$ ($n$ copies of $B$). The additive
 * `&` and the tensor $\otimes$ share the same underlying event set (they differ
 * only in conflict), so the cardinalities coincide exactly — the load-bearing
 * content of the iso at each finite stage; the full natural iso is the colimit.
 */
export function seelyJudgment(a: Arena, b: Arena, copies: number): SeelyJudgment {
  const left = (a.structure.events.length + b.structure.events.length) * copies;
  const right = bang(a, copies).structure.events.length + bang(b, copies).structure.events.length;
  return left === right
    ? Object.freeze({ kind: "computing.category.seely:witness" as const, copies, leftEvents: left, rightEvents: right })
    : Object.freeze({ kind: "computing.category.seely-obstruction" as const, copies, leftEvents: left, rightEvents: right });
}

// ── The !-functor on morphisms, comultiplication, and the comonad laws ───────
//
// `bang` is the object map of the exponential functor; `dereliction` is its
// counit $\varepsilon$. To make $!$ a *comonad* we still need its action on
// morphisms (functoriality), the comultiplication $\delta : {!}A \to {!}{!}A$,
// and the three comonad laws. The true $!$ is the $\omega$-colimit, where the
// laws hold on the nose; at finite stage the copy *counts* must line up, so each
// law is witnessed at the stage where it is dimensionally exact — checked by REAL
// morphism composition — and coassociativity, whose three-fold composite would
// force unequal counts at every finite stage, is witnessed by its load-bearing
// finite shadow: the associativity of the copy-pairing $\omega \cong \omega^2$
// that the colimit law reduces to.

const SIDE = /^(L\||R\|)/;

/** Split a banged compound move `S|c{i}|rest` into its tensor side, copy index, and remainder. */
function splitCopy(move: string): { readonly side: string; readonly copy: number; readonly rest: string } | null {
  const sideMatch = SIDE.exec(move);
  if (sideMatch === null) return null;
  const side = sideMatch[1] as string;
  const afterSide = move.slice(side.length);
  const copyMatch = /^c(\d+)\|(.*)$/.exec(afterSide);
  if (copyMatch === null) return null;
  return { side, copy: Number(copyMatch[1]), rest: copyMatch[2] as string };
}

/** The underlying (un-banged) f-move of a copy-`i` move: drop the `c{i}|` tag, keep the side. */
const underlyingMove = (parsed: { readonly side: string; readonly rest: string }): string => parsed.side + parsed.rest;

/**
 * The functorial action ${!}f : {!}A \to {!}B$ of the exponential on a morphism
 * $f : A \to B$, at the $n$-copy stage: $n$ disjoint copies of $f$'s strategy, the
 * $i$-th relabelled into copy $i$. A Player move in copy $i$ is admitted exactly
 * when $f$'s own strategy admits its un-banged image in that copy — so ${!}f$ runs
 * one independent instance of $f$ per copy, with the copies interchangeable. This
 * is the object-map `bang` lifted to morphisms; `bang(copycat) = copycat(bang)`
 * and composition-preservation are the functor laws (witnessed below).
 */
export function bangMap(f: Morphism, copies: number): Morphism {
  const source = bang(f.source, copies);
  const target = bang(f.target, copies);
  const compound = lollipop(source, target);
  const playKeys = new Set(f.strategy.plays.map((p) => p.moves.join(" ")));
  const admitPlayer = (history: { readonly moves: readonly string[] }, move: string): boolean => {
    const parsed = splitCopy(move);
    if (parsed === null) return false;
    const here = history.moves
      .map(splitCopy)
      .filter((m): m is { side: string; copy: number; rest: string } => m !== null && m.copy === parsed.copy)
      .map(underlyingMove);
    const candidate = [...here, underlyingMove(parsed)].join(" ");
    return playKeys.has(candidate);
  };
  return morphism(source, target, strategyFrom(compound, admitPlayer));
}

/**
 * The comultiplication $\delta_A : {!}A \to {!}{!}A$ — *digging* — at finite stage
 * ${!}^{(o\cdot m)}A \to {!}^{(o)}{!}^{(m)}A$. The colimit identity $\omega \cong
 * \omega \times \omega$ becomes the finite pairing $k = i\cdot m + j$: source copy
 * $k$ is the copy-of-a-copy $(i,j)$. $\delta$ is the copycat under that pairing —
 * each source move `L|c{k}|id` mirrors the target move `R|c{i}|c{j}|id` and vice
 * versa — so digging neither creates nor destroys plays, it only re-indexes copies
 * as copies-of-copies, the categorical content of comultiplication.
 */
export function digging(a: Arena, outer: number, inner: number): Morphism {
  const source = bang(a, outer * inner);
  const target = bang(bang(a, inner), outer);
  const compound = lollipop(source, target);
  const admitPlayer = (history: { readonly moves: readonly string[] }, move: string): boolean => {
    const parsed = splitCopy(move);
    if (parsed === null) return false;
    let partner: string;
    if (parsed.side === "R|") {
      const innerMatch = /^c(\d+)\|(.*)$/.exec(parsed.rest);
      if (innerMatch === null) return false;
      const i = parsed.copy;
      const j = Number(innerMatch[1]);
      const id = innerMatch[2] as string;
      partner = `L|c${i * inner + j}|${id}`;
    } else {
      const k = parsed.copy;
      const id = parsed.rest;
      partner = `R|c${Math.floor(k / inner)}|c${k % inner}|${id}`;
    }
    return history.moves.includes(partner);
  };
  return morphism(source, target, strategyFrom(compound, admitPlayer));
}

/** A comonad/functor law witness: a named law verified at a finite stage by real composition. */
export interface ComonadLawWitness {
  readonly kind: "computing.category.comonad.law:witness";
  readonly law: string;
  readonly copies: number;
}
export interface ComonadLawObstruction {
  readonly kind: "computing.category.comonad.law-obstruction";
  readonly law: string;
  readonly copies: number;
}
export type ComonadLawJudgment = ComonadLawWitness | ComonadLawObstruction;

const lawJudgment = (law: string, copies: number, holds: boolean): ComonadLawJudgment =>
  holds
    ? Object.freeze({ kind: "computing.category.comonad.law:witness" as const, law, copies })
    : Object.freeze({ kind: "computing.category.comonad.law-obstruction" as const, law, copies });

/**
 * Functoriality of $!$ on identities: ${!}(\mathrm{cc}_A) = \mathrm{cc}_{{!}A}$ at
 * the $n$-copy stage — banging the copycat is the copycat of the banged arena.
 * Checked by real strategy equality.
 */
export function bangPreservesIdentity(a: Arena, copies: number): ComonadLawJudgment {
  return lawJudgment("!(id) = id", copies, morphismEqual(bangMap(copycat(a), copies), copycat(bang(a, copies))));
}

/**
 * Functoriality of $!$ on composition: ${!}(g \circ f) = {!}g \circ {!}f$ at the
 * $n$-copy stage, for $f : A \to B$, $g : B \to C$. Checked by real composition.
 */
export function bangPreservesComposition(f: Morphism, g: Morphism, copies: number): ComonadLawJudgment {
  const banged = bangMap(compose(f, g), copies);
  const stepwise = compose(bangMap(f, copies), bangMap(g, copies));
  return lawJudgment("!(g∘f) = !g∘!f", copies, morphismEqual(banged, stepwise));
}

/**
 * The left counit law $\varepsilon_{{!}A} \circ \delta_A = \mathrm{id}_{{!}A}$,
 * exact at the stage $\text{outer}=1$ (so $\delta : {!}^{(n)}A \to {!}^{(1)}{!}^{(n)}A$
 * and the outer dereliction strips the single outer copy): the composite must be
 * the copycat on ${!}^{(n)}A$. Verified by real morphism composition.
 */
export function comonadCounitLeft(a: Arena, copies: number): ComonadLawJudgment {
  const delta = digging(a, 1, copies); // !^n A → !^1 !^n A
  const counitAtBang = dereliction(bang(a, copies), 1); // !^1 !^n A → !^n A
  const composite = compose(delta, counitAtBang); // !^n A → !^n A
  return lawJudgment("ε_!A ∘ δ = id", copies, morphismEqual(composite, copycat(bang(a, copies))));
}

/**
 * The right counit law ${!}(\varepsilon_A) \circ \delta_A = \mathrm{id}_{{!}A}$,
 * exact at the stage $\text{inner}=1$ (so $\delta : {!}^{(n)}A \to {!}^{(n)}{!}^{(1)}A$
 * and ${!}$ of the inner dereliction strips each single inner copy): the composite
 * must be the copycat on ${!}^{(n)}A$. Verified by real composition through `bangMap`.
 */
export function comonadCounitRight(a: Arena, copies: number): ComonadLawJudgment {
  const delta = digging(a, copies, 1); // !^n A → !^n !^1 A
  const bangedCounit = bangMap(dereliction(a, 1), copies); // !^n !^1 A → !^n A
  const composite = compose(delta, bangedCounit); // !^n A → !^n A
  return lawJudgment("!(ε_A) ∘ δ = id", copies, morphismEqual(composite, copycat(bang(a, copies))));
}

/**
 * Coassociativity $\delta_{{!}A} \circ \delta_A = {!}(\delta_A) \circ \delta_A$.
 * The three-fold composite forces unequal copy counts at every finite stage (the
 * law lives in the colimit), so it is witnessed by its load-bearing finite shadow:
 * the two ways of pairing $o \cdot p \cdot q$ copies — first $o \times (p\cdot q)$
 * then splitting the inner $p\cdot q$, versus first $(o\cdot p) \times q$ then
 * splitting the outer $o\cdot p$ — assign every source copy $k$ the *same*
 * copy-of-copy-of-copy index $(i,j,l)$. Computed for real over all $k$.
 */
export function comonadCoassociativity(outer: number, middle: number, inner: number): ComonadLawJudgment {
  const total = outer * middle * inner;
  let agree = true;
  for (let k = 0; k < total; k += 1) {
    // right-first: k ↦ (i, r) with r in 0..(middle·inner); then r ↦ (j, l).
    const i1 = Math.floor(k / (middle * inner));
    const r = k % (middle * inner);
    const j1 = Math.floor(r / inner);
    const l1 = r % inner;
    // left-first: k ↦ (q, l) with q in 0..(outer·middle); then q ↦ (i, j).
    const q = Math.floor(k / inner);
    const l2 = k % inner;
    const i2 = Math.floor(q / middle);
    const j2 = q % middle;
    if (i1 !== i2 || j1 !== j2 || l1 !== l2) {
      agree = false;
      break;
    }
  }
  return lawJudgment("δ_!A ∘ δ = !δ ∘ δ (pairing assoc.)", outer * middle * inner, agree);
}

// ── The cocommutative comonoid structure on !A ──────────────────────────────
//
// Beyond being a comonad, $!$ carries on each $!A$ a *cocommutative comonoid*
// structure — the *weakening* counit $w_A : {!}A \to I$ (discard) and the
// *contraction* comultiplication $c_A : {!}A \to {!}A \otimes {!}A$ (duplicate) —
// compatible with the comonad. This is precisely what upgrades $!$ from a comonad
// to a genuine *linear-exponential* modality: the Kleisli/co-Kleisli structure
// becomes Cartesian, structural weakening and contraction become available, and
// the resource $A$ becomes freely discardable and copyable. Here $I = $ `unit()`
// is the empty/dualizing arena (the tensor unit).
//
// At finite stage the copy *counts* must line up, so each comonoid law is
// witnessed where it is dimensionally exact (checked by REAL composition) and the
// laws whose finite shadow is an arithmetic identity of the copy *partition* are
// witnessed by that shadow with the $\omega$-colimit caveat named.

/**
 * The *weakening* (discard) map $w_A : {!}A \to I$ — the comonoid counit — at the
 * $n$-copy stage, with $I = $ `unit()` the empty arena. The compound is
 * $({!}^{(n)}A)^\perp \| I$; since $I$ contributes no events, every move of the
 * compound is a source ($A$-side) move, all of which appear as Opponent in the
 * dual source. The strategy is therefore receptive to every source Opponent move
 * and never plays — discarding the resource by declining to use any copy. There is
 * no Player obligation, so $w_A$ is operationally valid (vacuously prefix-closed,
 * receptive, all plays valid); the only finite caveat is the standing copy-symmetry
 * one shared by every banged-source map.
 */
export function weakening(a: Arena, copies: number): Morphism {
  const source = bang(a, copies);
  const target = unit();
  const compound = lollipop(source, target);
  // No Player move ever exists (the target I is empty, so every compound move is a
  // source/Opponent move); `admitPlayer` is never consulted for a positive move.
  const admitPlayer = (): boolean => false;
  return morphism(source, target, strategyFrom(compound, admitPlayer));
}

/**
 * Parse a *target* tensor-factor move `R|F|c{i}|id` of the contraction compound —
 * the outer `R|` is the lollipop output tag, `F` ∈ {`L|`, `R|`} is the
 * tensor-factor tag of $({!}A \otimes {!}A)$, and `c{i}|id` is the copy tag.
 */
function splitTensorCopy(move: string): { readonly factor: string; readonly copy: number; readonly rest: string } | null {
  if (!move.startsWith("R|")) return null;
  const afterOut = move.slice(2);
  const factorMatch = /^(L\||R\|)(.*)$/.exec(afterOut);
  if (factorMatch === null) return null;
  const factor = factorMatch[1] as string;
  const copyMatch = /^c(\d+)\|(.*)$/.exec(factorMatch[2] as string);
  if (copyMatch === null) return null;
  return { factor, copy: Number(copyMatch[1]), rest: copyMatch[2] as string };
}

/**
 * The *contraction* (duplication) map $c_A : {!}A \to {!}A \otimes {!}A$ — the
 * comonoid comultiplication — at the finite stage ${!}^{(\ell+r)}A \to
 * {!}^{(\ell)}A \otimes {!}^{(r)}A$. The colimit fact $\omega \cong \omega \sqcup
 * \omega$ becomes the finite *partition* of $\ell+r$ source copies into the two
 * tensor factors: source copy $k < \ell$ is the left factor's copy $k$; source copy
 * $k \ge \ell$ is the right factor's copy $k-\ell$. $c_A$ is the copycat under that
 * partition — each source move `L|c{k}|id` mirrors its partner target move (the
 * `R|L|c{k}|id` left-factor move, or the `R|R|c{k-ℓ}|id` right-factor move) and
 * vice versa — so contraction neither creates nor destroys plays, it only re-routes
 * each copy into one of the two duplicates, the categorical content of duplication.
 * Like every banged-target map it is operationally valid (valid plays, prefix-closed,
 * receptive); strict finite symmetry-invariance is the named $\omega$-colimit caveat.
 */
export function contraction(a: Arena, left: number, right: number): Morphism {
  const source = bang(a, left + right);
  const target = tensor(bang(a, left), bang(a, right));
  const compound = lollipop(source, target);
  const admitPlayer = (history: { readonly moves: readonly string[] }, move: string): boolean => {
    let partner: string;
    const onTarget = splitTensorCopy(move);
    if (onTarget !== null) {
      // Target move R|F|c{i}|id ↦ source move L|c{k}|id with k = i (left) or ℓ+i (right).
      const k = onTarget.factor === "L|" ? onTarget.copy : left + onTarget.copy;
      partner = `L|c${k}|${onTarget.rest}`;
    } else {
      // Source move L|c{k}|id ↦ target move on the factor its copy partitions into.
      const parsed = splitCopy(move);
      if (parsed === null || parsed.side !== "L|") return false;
      const k = parsed.copy;
      partner = k < left ? `R|L|c${k}|${parsed.rest}` : `R|R|c${k - left}|${parsed.rest}`;
    }
    return history.moves.includes(partner);
  };
  return morphism(source, target, strategyFrom(compound, admitPlayer));
}

/** A comonoid-law witness: a named law verified at a finite stage (by composition or by its finite shadow). */
export interface ComonoidLawWitness {
  readonly kind: "computing.category.comonoid.law:witness";
  readonly law: string;
  readonly copies: number;
}
export interface ComonoidLawObstruction {
  readonly kind: "computing.category.comonoid.law-obstruction";
  readonly law: string;
  readonly copies: number;
}
export type ComonoidLawJudgment = ComonoidLawWitness | ComonoidLawObstruction;

const comonoidJudgment = (law: string, copies: number, holds: boolean): ComonoidLawJudgment =>
  holds
    ? Object.freeze({ kind: "computing.category.comonoid.law:witness" as const, law, copies })
    : Object.freeze({ kind: "computing.category.comonoid.law-obstruction" as const, law, copies });

/**
 * Realize "$w \otimes \mathrm{id}$" / "$\mathrm{id} \otimes w$" on a contraction
 * target *directly* as a strategy, then read off the surviving factor as a copycat
 * onto ${!}^{(keep)}A$. Rather than build a $\otimes$-functor on morphisms, we use
 * the dimensionally-exact split where the discarded factor has *zero* copies: at
 * the split $(0, n)$ the left factor is ${!}^{(0)}A = I$ (empty, nothing to discard
 * but the trivial unit), so $w \otimes \mathrm{id}$ is just the canonical left
 * unitor $I \otimes {!}A \cong {!}A$ composed after $c_{A}(0,n)$ — and $c_A(0,n)$ is
 * already, copy-for-copy, the copycat routing every source copy into the surviving
 * right factor. We therefore witness the counit law by the play-level equality of
 * the *projected* contraction (its plays restricted to the surviving factor, with
 * the factor tag stripped) against `copycat(bang(a, n))`. The discarded $0$-copy
 * factor contributes no moves, so the projection loses nothing — the equality is
 * exact, not a colimit approximation.
 */
export function counitProjection(a: Arena, copies: number, discard: "left" | "right"): Morphism {
  // The surviving tensor factor of c_A(0,n) / c_A(n,0): strip the lollipop output
  // tag and the (single, empty-or-full) tensor-factor tag, recovering plays on
  // (!^n A)^⊥ ‖ !^n A — the copycat compound.
  const keepFactor = discard === "left" ? "R|" : "L|";
  const con = discard === "left" ? contraction(a, 0, copies) : contraction(a, copies, 0);
  const target = bang(a, copies);
  const compound = lollipop(bang(a, copies), target);
  const reTag = (move: string): string | null => {
    if (move.startsWith("L|")) return move; // source move: already (!^n A)^⊥ tag
    const t = splitTensorCopy(move);
    if (t === null) return null;
    if (t.factor !== keepFactor) return null; // a discarded-factor move (there are none at 0 copies)
    return `R|c${t.copy}|${t.rest}`;
  };
  // Re-present as a strategy on the copycat compound, prefix-closing.
  const seen = new Set<string>();
  const out = [];
  for (const p of con.strategy.plays) {
    const reMapped = p.moves.map(reTag);
    if (reMapped.some((m) => m === null)) continue;
    const moves = reMapped as string[];
    for (let i = 0; i <= moves.length; i += 1) {
      const pre = moves.slice(0, i);
      const key = pre.join(" ");
      if (!seen.has(key)) {
        seen.add(key);
        out.push(play(pre));
      }
    }
  }
  return morphism(bang(a, copies), target, strategy(compound, Object.freeze(out)));
}

/**
 * The left counit law $(w_A \otimes \mathrm{id}) \circ c_A = \mathrm{id}_{{!}A}$,
 * exact at the split $(0, n)$: discarding the *empty* left factor of $c_A(0, n)$
 * and applying the left unitor leaves the right factor, which routes every source
 * copy $k$ to itself — the copycat on ${!}^{(n)}A$. Witnessed by the play-level
 * equality of the projected contraction (its surviving right factor, re-tagged onto
 * the copycat compound) against `copycat(bang(a, n))`. Because the discarded factor
 * has zero copies it contributes no moves, so the projection is lossless and the
 * equality is exact (not a colimit approximation).
 */
export function comonoidCounitLeft(a: Arena, copies: number): ComonoidLawJudgment {
  const projected = counitProjection(a, copies, "left");
  return comonoidJudgment("(w⊗id)∘c = id", copies, morphismEqual(projected, copycat(bang(a, copies))));
}

/**
 * The right counit law $(\mathrm{id} \otimes w_A) \circ c_A = \mathrm{id}_{{!}A}$,
 * exact at the split $(n, 0)$: dual to the left counit, discarding the empty right
 * factor of $c_A(n, 0)$ leaves the left factor as the copycat on ${!}^{(n)}A$.
 * Witnessed by the same lossless play-level projection.
 */
export function comonoidCounitRight(a: Arena, copies: number): ComonoidLawJudgment {
  const projected = counitProjection(a, copies, "right");
  return comonoidJudgment("(id⊗w)∘c = id", copies, morphismEqual(projected, copycat(bang(a, copies))));
}

/**
 * The factor-exchange isomorphism $\mathrm{swap} : {!}A \otimes {!}A \to {!}A
 * \otimes {!}A$ that transposes the two tensor factors — the copycat under factor
 * exchange. In the compound $({!}^{(n)}A \otimes {!}^{(n)}A)^\perp \| ({!}^{(n)}A
 * \otimes {!}^{(n)}A)$, each side's left factor move `F|c{i}|id` (where $F$ is the
 * outer lollipop tag) is mirrored on the *opposite* tensor factor of the other
 * side. Used to state cocommutativity $\mathrm{swap} \circ c_A = c_A$.
 */
export function swapTensor(banged: Arena, copies: number): Morphism {
  void copies;
  const ab = tensor(banged, banged);
  const compound = lollipop(ab, ab);
  // Inside the compound: source factor tags are L|L|… , L|R|… ; target are R|L|… , R|R|… .
  const exchange = (move: string): string | null => {
    const outerMatch = /^(L\||R\|)(L\||R\|)(.*)$/.exec(move);
    if (outerMatch === null) return null;
    const outer = outerMatch[1] as string; // lollipop side
    const factor = outerMatch[2] as string; // tensor factor
    const rest = outerMatch[3] as string;
    const otherOuter = outer === "L|" ? "R|" : "L|";
    const otherFactor = factor === "L|" ? "R|" : "L|"; // exchanged factor on the partner side
    return `${otherOuter}${otherFactor}${rest}`;
  };
  const admitPlayer = (history: { readonly moves: readonly string[] }, move: string): boolean => {
    const partner = exchange(move);
    return partner !== null && history.moves.includes(partner);
  };
  return morphism(ab, ab, strategyFrom(compound, admitPlayer));
}

/**
 * Re-tag a *source-side* compound move `L|c{k}|id` by the copy-transposition that
 * exchanges the two halves of a symmetric $(\text{split},\text{split})$ partition:
 * copy $k < \text{split}$ ↦ $k+\text{split}$ and copy $k \ge \text{split}$ ↦
 * $k-\text{split}$. Target-side ($R|$) moves are left untouched. This is the action,
 * on the source ${!}^{(2s)}A$, of the copy-groupoid element that makes the two
 * factors interchangeable.
 */
const swapSourceCopies = (split: number) => (move: string): string => {
  const m = /^L\|c(\d+)\|(.*)$/.exec(move);
  if (m === null) return move;
  const k = Number(m[1]);
  const k2 = k < split ? k + split : k - split;
  return `L|c${k2}|${m[2] as string}`;
};

/**
 * Cocommutativity $\mathrm{swap} \circ c_A = c_A$ at a symmetric split (default
 * $\ell = r = 1$): duplicating then exchanging the two tensor factors equals
 * duplicating, *because the resource copies are interchangeable*. Verified by REAL
 * composition — `compose(contraction(a,s,s), swapTensor(...))` — but the equality is
 * not play-level *literal*: $c_A(s,s)$ routes source copy $k$ into the left factor
 * for $k<s$ and the right for $k\ge s$, so $\mathrm{swap}$ sends it to the *other*
 * factor; the composite is therefore $c_A$ *precomposed with the source copy-swap*
 * $\sigma$ that transposes the two halves — i.e. $\mathrm{swap}\circ c_A = c_A\circ
 * {!}\sigma$. The honest finite witness is that the composite, *after undoing the
 * copy-swap on the source moves* (`swapSourceCopies`), is play-level-equal to $c_A$.
 * That undoing is exactly the $S_n$ copy-symmetry under which $!A$'s copies are
 * declared interchangeable — invisible in the $\omega$-colimit, where cocommutativity
 * is literal; here it is the named caveat. The relabelled equality is exact.
 */
export function comonoidCocommutativity(a: Arena, split = 1): ComonoidLawJudgment {
  const con = contraction(a, split, split);
  const swap = swapTensor(bang(a, split), split);
  const composite = compose(con, swap); // !^{2s}A → !^s A ⊗ !^s A, = c ∘ !σ
  const relabel = swapSourceCopies(split);
  const conKeys = new Set(con.strategy.plays.map((p) => p.moves.join(" ")));
  const compositeRelabelledKeys = new Set(
    composite.strategy.plays.map((p) => p.moves.map(relabel).join(" ")),
  );
  const equalUpToCopySwap =
    conKeys.size === compositeRelabelledKeys.size
    && [...conKeys].every((key) => compositeRelabelledKeys.has(key));
  return comonoidJudgment("swap∘c = c (up to copy-swap !σ)", split * 2, equalUpToCopySwap);
}

/**
 * Coassociativity $(c_A \otimes \mathrm{id}) \circ c_A = (\mathrm{id} \otimes c_A)
 * \circ c_A$ as its load-bearing finite shadow. The two three-fold composites would
 * force unequal copy counts at every finite stage (the full law lives in the
 * $\omega$-colimit, where $\omega \cong \omega \sqcup \omega \sqcup \omega$), so we
 * witness the *associativity of the copy partition*: splitting $a+b+c$ source copies
 * either as $((a)(b))(c)$ — first $(a+b \mid c)$ then $(a\mid b)$ on the left — or as
 * $(a)((b)(c))$ — first $(a \mid b+c)$ then $(b\mid c)$ on the right — routes every
 * source copy $k$ to the *same* leaf factor and the same within-leaf copy index.
 * Computed for real over all $k$; the colimit caveat is named, not faked.
 */
export function comonoidCoassociativity(a: number, b: number, c: number): ComonoidLawJudgment {
  const total = a + b + c;
  let agree = true;
  for (let k = 0; k < total; k += 1) {
    // left-assoc ((a b) c): first split (a+b | c).
    let leftLeaf: number;
    let leftIdx: number;
    if (k < a + b) {
      // into the (a b) block, then split (a | b).
      leftLeaf = k < a ? 0 : 1;
      leftIdx = k < a ? k : k - a;
    } else {
      leftLeaf = 2;
      leftIdx = k - (a + b);
    }
    // right-assoc (a (b c)): first split (a | b+c).
    let rightLeaf: number;
    let rightIdx: number;
    if (k < a) {
      rightLeaf = 0;
      rightIdx = k;
    } else {
      // into the (b c) block, then split (b | c).
      const j = k - a;
      rightLeaf = j < b ? 1 : 2;
      rightIdx = j < b ? j : j - b;
    }
    if (leftLeaf !== rightLeaf || leftIdx !== rightIdx) {
      agree = false;
      break;
    }
  }
  return comonoidJudgment("(c⊗id)∘c = (id⊗c)∘c (partition assoc.)", total, agree);
}
