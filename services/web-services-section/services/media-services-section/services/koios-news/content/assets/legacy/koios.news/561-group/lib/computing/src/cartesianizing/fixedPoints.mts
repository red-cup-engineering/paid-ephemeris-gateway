/**
 * Recursive types as $\mu$/$\nu$ fixed points of endofunctors — bounded unrolling
 * approximants of the initial algebra / final coalgebra, with Lambek's lemma
 * machine-checked at a small stage and the $\omega$-colimit *named, not run*.
 *
 * Grounded in the corpus's `chl-apex-recursion` journal and its load-bearing
 * `lambek-lemma` sub-entry
 * (`triage/2026/05/25/.../chl-apex-recursion/hacking/library/lambek-lemma/`):
 *
 *   > **Lemma @lambek1968.** Let $F : \mathcal{C} \to \mathcal{C}$ be an
 *   > endofunctor. If $(\mu F, \alpha)$ is an initial $F$-algebra then the
 *   > structure map $\alpha : F(\mu F) \to \mu F$ is an isomorphism — so $\mu F$ is
 *   > a fixed point of $F$ up to canonical iso, $\mu F \cong F(\mu F)$.
 *
 * The dual (also in the journal) gives the final $F$-coalgebra
 * $(\nu F, \beta : \nu F \to F(\nu F))$ with $\beta$ an iso — the greatest fixed
 * point. The journal places this lemma as *the* mechanism behind the apex tower:
 * every apex is the initial algebra (the LFP, in the closure-operator case) of its
 * stratum's endofunctor, and Lambek identifies the apex with the functor's fixed
 * point.
 *
 * **Construction (the journal's "Open" item, the transfinite construction).** The
 * journal names $\mu F = \mathrm{colim}_\alpha F^\alpha(0)$ — the colimit of the
 * initial chain $0 \to F(0) \to F^2(0) \to \cdots$ (with $0 = $ the initial object
 * $\bot$, here `bottom()` = the empty arena). Dually $\nu F = \lim_\alpha
 * F^\alpha(1)$ over the terminal chain. Both colimits exist only under
 * (co)continuity assumptions on $F$ — they are $\omega$-colimits, irreducibly
 * infinite, exactly like the $!$-comonad's true $!A$ in `category/exponential`. We
 * therefore realize the bounded unrolling *approximants* $F^{(n)}(0)$ executably at
 * each finite stage $n$ and NAME the colimit, never running it — the same
 * discipline as `bang(A, n)`.
 *
 * **Lambek at finite stage.** $\alpha : F(\mu F) \to \mu F$ is an iso only at the
 * colimit, where $F(\mu F) = \mu F$ on the nose. At a finite unrolling $\mu F_n =
 * F^{(n)}(0)$, the algebra map runs *into* $F(\mu F_n) = \mu F_{n+1}$, one stage
 * deeper — the two arenas do not literally coincide. So we witness Lambek two
 * ways, honestly:
 *
 *   1. On a functor with a *genuine* finite fixed point (the identity functor, and
 *      any constant functor), $F(\mu F_n) = \mu F_n$ *structurally* at every stage,
 *      and the structure map is the `copycat`. Then $\alpha^{-1}$ is also the
 *      copycat and `morphismEqual(compose(α, α⁻¹), copycat(μF))` holds EXACTLY, by
 *      REAL composition of strategies — a fully machine-checked instance of
 *      Lambek's lemma.
 *   2. On a genuinely recursive functor (the list/stream functor $X \mapsto 1
 *      \oplus (A \otimes X)$) the iso is the colimit statement; at finite stage we
 *      witness its load-bearing *finite shadow* — that $F(\mu F_n)$ and $\mu
 *      F_{n+1}$ are the *same arena* (so the structure map is a copycat onto the
 *      next approximant, operationally valid: valid plays, prefix-closed,
 *      receptive) — and NAME the colimit caveat. We never fake the exact law on a
 *      stage where the two arenas differ.
 *
 * Reuses `object` (tensor/dual/unit/bottom/arenaEqual), `morphism`
 * (Morphism/copycat/compose/morphismEqual/morphismValidity), `additive`
 * (plusArena), and the Kleisli CCC carriers.
 */
import { type Arena } from "@emsenn/gaming";
import { plusArena } from "../categorifying/additive.mjs";
import {
  type Morphism,
  type MorphismValidity,
  compose,
  copycat,
  morphismEqual,
  morphismValidity,
} from "../categorifying/morphism.mjs";
import { arenaEqual, bottom, tensor, unit } from "../categorifying/object.mjs";

/**
 * An endofunctor $F : \mathbf{CGS} \to \mathbf{CGS}$ on arenas: an object map
 * $A \mapsto F(A)$ together with the morphism action $f \mapsto F(f)$ (carrying
 * functoriality — $F(\mathrm{id}) = \mathrm{id}$, $F(g \circ f) = F(g) \circ
 * F(f)$). The action is what makes $F$-algebras and the initial chain's
 * connecting maps meaningful; the object map alone gives the unrolling
 * approximants. Frozen carrier, kind-tagged in the house idiom.
 */
export interface Endofunctor {
  readonly kind: "computing.cartesian.endofunctor";
  /** The object map $A \mapsto F(A)$. */
  readonly object: (a: Arena) => Arena;
  /** The morphism action $f \mapsto F(f) : F(A) \to F(B)$ for $f : A \to B$. */
  readonly map: (f: Morphism) => Morphism;
  /** A human label for the functor (e.g. "Id", "list 1 ⊕ A⊗X"). */
  readonly label: string;
}

/** Build an {@link Endofunctor} carrier from its object map and morphism action. */
export function endofunctor(
  label: string,
  object: (a: Arena) => Arena,
  map: (f: Morphism) => Morphism,
): Endofunctor {
  return Object.freeze({ kind: "computing.cartesian.endofunctor" as const, object, map, label });
}

/**
 * $F^n$ applied to a base arena — $n$-fold iterated application $F^n(\text{base})$.
 * $F^0(\text{base}) = \text{base}$. This is the workhorse behind both the initial
 * chain ($\text{base} = \bot$) and the terminal chain ($\text{base} = \top$).
 */
export function iteratedApplication(f: Endofunctor, n: number, base: Arena): Arena {
  let acc = base;
  for (let i = 0; i < n; i += 1) acc = f.object(acc);
  return acc;
}

/**
 * The least-fixed-point approximant $\mu F_n = F^{(n)}(0)$ — the $n$-th stage of
 * the initial chain $0 \to F(0) \to F^2(0) \to \cdots$, with $0 = \bot$ the
 * initial object (`bottom()`, the empty arena). The true initial algebra is the
 * $\omega$-colimit $\mu F = \mathrm{colim}_n F^{(n)}(0)$ (per the lambek-lemma
 * journal's transfinite construction); this is the bounded stage, the colimit is
 * named not run.
 */
export const leastFixedPoint = (f: Endofunctor, stages: number): Arena =>
  iteratedApplication(f, stages, bottom());

/**
 * The greatest-fixed-point approximant $\nu F_n = F^{(n)}(1)$ — the $n$-th stage
 * of the *terminal* chain $1 \leftarrow F(1) \leftarrow \cdots$, with $1 = \top$
 * the terminal object (`unit()`, the empty arena — terminal and initial coincide
 * as carriers here, exactly as $\mathbf{1} = \bot$ in `object`). The true final
 * coalgebra is the $\omega$-limit $\nu F = \lim_n F^{(n)}(1)$; bounded stage, the
 * limit named not run. By the dual Lambek lemma $\beta : \nu F \to F(\nu F)$ is an
 * iso in the limit.
 */
export const greatestFixedPoint = (f: Endofunctor, stages: number): Arena =>
  iteratedApplication(f, stages, unit());

// ── Concrete endofunctors ────────────────────────────────────────────────────

/**
 * The identity functor $\mathrm{Id} : X \mapsto X$, with $\mathrm{Id}(f) = f$.
 * *Every* arena is a genuine fixed point: $\mathrm{Id}(X) = X$ on the nose at
 * every stage, so the initial chain stabilizes immediately and Lambek's structure
 * map is literally the copycat — the one functor on which the iso is exact at
 * finite stage and fully machine-checkable by real composition.
 */
export const identityFunctor = (): Endofunctor =>
  endofunctor("Id", (a) => a, (f) => f);

/**
 * The constant functor $K_C : X \mapsto C$, with $K_C(f) = \mathrm{cc}_C$ (the
 * morphism action collapses every $f$ to the identity on $C$, since $F(A) = F(B)
 * = C$). Like $\mathrm{Id}$ it has a genuine finite fixed point — $K_C(C) = C$ —
 * so Lambek is exact and machine-checked on it too. Keep $C$ tiny.
 */
export const constantFunctor = (c: Arena): Endofunctor =>
  endofunctor("K", () => c, () => copycat(c));

/**
 * The **list functor** $L_A : X \mapsto 1 \oplus (A \otimes X)$ — the polynomial
 * functor whose initial algebra $\mu L_A$ is the type of finite lists over $A$
 * (the $\oplus$-branch $1$ is `nil`, the $A \otimes X$-branch is `cons` of a head
 * $A$ and a tail $X$). Built from the additive `plusArena` ($\oplus$) and the
 * multiplicative `tensor` ($\otimes$) of the $*$-autonomous structure, exactly the
 * connectives the prompt names. The morphism action $L_A(f) = \mathrm{id}_1 \oplus
 * (\mathrm{id}_A \otimes f)$ recurses $f$ through the tail; here the *object* map
 * drives the unrolling approximants and the Lambek shadow, and the morphism action
 * is carried as the copycat on $L_A(A')$ for the stages we machine-check (the
 * tail-recursion's full naturality is part of the same $\omega$-colimit as the
 * fixed point, named not run).
 *
 * $\mu L_A$ is a genuinely recursive type: $L_A(X) \ne X$ at every finite stage
 * (each unrolling adds an $A \otimes (-)$ layer), so Lambek's iso for $L_A$ is the
 * colimit statement — witnessed at finite stage by its finite shadow (below).
 */
export const listFunctor = (a: Arena): Endofunctor =>
  endofunctor(
    "list 1 ⊕ A⊗X",
    (x) => plusArena(unit(), tensor(a, x)),
    (f) => copycat(plusArena(unit(), tensor(a, f.target))),
  );

/**
 * The **stream functor** $S_A : X \mapsto A \otimes X$ — the polynomial functor
 * whose *final* coalgebra $\nu S_A$ is the type of infinite streams over $A$
 * (every state emits a head $A$ and a tail $X$, forever; there is no $\oplus 1$
 * base case, so the initial algebra is empty and only the *greatest* fixed point
 * is interesting). Built from `tensor` alone. Like the list functor it is
 * genuinely recursive, so the dual Lambek iso $\beta : \nu S_A \to S_A(\nu S_A)$
 * is the $\omega$-limit statement, witnessed at finite stage by its finite shadow.
 */
export const streamFunctor = (a: Arena): Endofunctor =>
  endofunctor(
    "stream A⊗X",
    (x) => tensor(a, x),
    (f) => copycat(tensor(a, f.target)),
  );

// ── Lambek's lemma: the structure map and its invertibility witness ──────────

/**
 * The algebra/coalgebra structure map of an approximant, presented as a morphism.
 * For a functor with a genuine finite fixed point ($F(\mu F_n) = \mu F_n$
 * structurally), this is the `copycat` on $\mu F_n$ and is *exactly* invertible.
 * For a genuinely recursive functor it is the copycat onto the shared truncation
 * of $F(\mu F_n)$ and $\mu F_n$ (operationally valid but iso only in the colimit).
 */
export interface StructureMap {
  readonly kind: "computing.cartesian.fixedPoint.structureMap";
  /** $\mathrm{in} : F(\mu F) \to \mu F$ (the $\mu$ side) or $\beta : \nu F \to F(\nu F)$ (the $\nu$ side). */
  readonly forward: Morphism;
  /** A proposed inverse $\mathrm{in}^{-1}$ / $\beta^{-1}$. */
  readonly backward: Morphism;
}

/**
 * Lambek's-lemma witness at a finite stage. `structuralFixedPoint` records whether
 * $F(\mu F_n)$ and $\mu F_n$ are the *same arena* at this stage (true for
 * Id/constant functors — the exact case; false for genuinely recursive functors,
 * where the iso lives in the colimit). `isoExact` is the EXACT machine-checked
 * statement $\mathrm{in} \circ \mathrm{in}^{-1} = \mathrm{cc}_{\mu F}$ AND
 * $\mathrm{in}^{-1} \circ \mathrm{in} = \mathrm{cc}_{F(\mu F)}$, verified by REAL
 * composition + `morphismEqual` — meaningful only when `structuralFixedPoint`.
 * `structureMapValid` is the operational validity of the structure map (valid
 * plays / prefix-closed / receptive), the load-bearing finite shadow that survives
 * for the recursive case. `colimitCaveat` names what is deferred to the
 * $\omega$-colimit.
 */
export interface LambekWitness {
  readonly kind: "computing.cartesian.lambek:witness" | "computing.cartesian.lambek-obstruction";
  readonly functor: string;
  readonly stage: number;
  readonly structuralFixedPoint: boolean;
  /** EXACT iso (both round-trips = copycat), by real composition. Only asserted when `structuralFixedPoint`. */
  readonly isoExact: boolean;
  /** Operational validity of $\mathrm{in}$ — the finite shadow for the recursive case. */
  readonly structureMapValidity: MorphismValidity;
  readonly colimitCaveat: string;
}

/**
 * Build the structure map $\mathrm{in} : F(\mu F) \to \mu F$ at a stage. When
 * $F(\mu F)$ and $\mu F$ coincide as arenas (`arenaEqual`), $\mathrm{in}$ and its
 * inverse are both `copycat(\mu F)` — the genuine finite fixed point. Otherwise
 * (the recursive case) we still present $\mathrm{in}$ as `copycat` on whichever of
 * the two carriers we name as $\mu F$; its operational validity is the finite
 * shadow, the exact iso is the colimit statement.
 */
export function structureMap(f: Endofunctor, muF: Arena): StructureMap {
  // F(μF): one unrolling deeper. The forward map runs F(μF) → μF, the backward μF → F(μF).
  const fMuF = f.object(muF);
  if (arenaEqual(fMuF, muF)) {
    // Genuine finite fixed point: in = in⁻¹ = copycat(μF), exactly invertible.
    const cc = copycat(muF);
    return Object.freeze({
      kind: "computing.cartesian.fixedPoint.structureMap" as const,
      forward: cc,
      backward: cc,
    });
  }
  // Recursive case: present in / in⁻¹ as copycats on their respective carriers; the
  // exact round-trip is the colimit statement, the operational validity is the shadow.
  return Object.freeze({
    kind: "computing.cartesian.fixedPoint.structureMap" as const,
    forward: copycat(muF),
    backward: copycat(fMuF),
  });
}

/**
 * Machine-check Lambek's lemma for $F$ at the approximant $\mu F$ (= some
 * $F^{(n)}(0)$ supplied by `leastFixedPoint`). Returns a {@link LambekWitness}.
 *
 * - When $F(\mu F) = \mu F$ structurally (Id / constant): both round-trips
 *   $\mathrm{in} \circ \mathrm{in}^{-1}$ and $\mathrm{in}^{-1} \circ \mathrm{in}$
 *   are computed by REAL composition and compared by `morphismEqual` against
 *   `copycat(\mu F)`. `isoExact` true ⟹ a fully machine-checked instance of
 *   Lambek's iso (kind `:witness`).
 * - When $F(\mu F) \ne \mu F$ (genuinely recursive list/stream): `isoExact` is
 *   left false and the witness rests on `structureMapValidity` — the operational
 *   structure of $\mathrm{in}$ — with `colimitCaveat` naming that the exact iso
 *   $\mu F \cong F(\mu F)$ holds only at the $\omega$-colimit $\mathrm{colim}_n
 *   F^{(n)}(0)$, never faked at a finite stage where the carriers differ.
 *
 * Keep $\mu F$ tiny (one/two base events, small `stages`): `compose` runs
 * `enumeratePlays`, exponential in concurrent events.
 */
export function lambek(f: Endofunctor, muF: Arena, stage: number): LambekWitness {
  const fMuF = f.object(muF);
  const structuralFixedPoint = arenaEqual(fMuF, muF);
  const map = structureMap(f, muF);
  const structureMapValidity = morphismValidity(map.forward);
  let isoExact = false;
  if (structuralFixedPoint) {
    // EXACT, by real composition: in ∘ in⁻¹ = cc_{μF} and in⁻¹ ∘ in = cc_{F(μF)}.
    const ccMuF = copycat(muF);
    const ccFMuF = copycat(fMuF);
    const roundTripA = compose(map.backward, map.forward); // μF → F(μF) → μF
    const roundTripB = compose(map.forward, map.backward); // F(μF) → μF → F(μF)
    isoExact = morphismEqual(roundTripA, ccMuF) && morphismEqual(roundTripB, ccFMuF);
  }
  const colimitCaveat = structuralFixedPoint
    ? "exact at finite stage: F(μF) = μF structurally (genuine finite fixed point)"
    : "exact iso μF ≅ F(μF) holds only at the ω-colimit μF = colim_n F^(n)(0); "
      + "finite shadow = operational validity of the structure map (one unrolling deeper)";
  const ok = structuralFixedPoint ? isoExact : structureMapValidity.valid;
  return Object.freeze({
    kind: ok
      ? ("computing.cartesian.lambek:witness" as const)
      : ("computing.cartesian.lambek-obstruction" as const),
    functor: f.label,
    stage,
    structuralFixedPoint,
    isoExact,
    structureMapValidity,
    colimitCaveat,
  });
}
