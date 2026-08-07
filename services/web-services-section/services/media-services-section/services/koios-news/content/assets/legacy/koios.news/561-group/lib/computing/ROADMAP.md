# `@emsenn/computing` — ROADMAP

## What this package IS

`@emsenn/computing` is the executable theory of computing: it takes the corpus's load-bearing theorem — that **CGS, the category of concurrent games with symmetry, IS the theory of computing**, the unique `*`-autonomous category in which sequential (Hyland–Ong), nominal (AGMOS), session-typed (Caires–Pfenning), and realizability (Dialectica/`Eff`) computation all embed — and makes it *operate* on real carriers.
Where `@emsenn/gaming` carries the CGS algebra (arenas, strategies, designs) and *names* the four embeddings as data, this package builds the `*`-autonomous category executably (tensor/dual/par/lollipop, copycat identity, interaction-plus-hiding composition), earns the linear-exponential `!
`-comonad and its dual `?
`-monad, the additives and MALL, the µ/ν recursion via Lambek, the traced/`Y` feedback structure, the four paradigms as real sub-category membership predicates, the running SPOTCOMP computer (settled information → arena → strategy → move, federated, with computed disagreement cohomology), the ludics↔CGS bridge, and charge-faithful codecs.
It is the categorical-operational top of the stack: relating -> animating -> gaming -> **computing**.

## Category Map

| Package/module | Category role |
| --- | --- |
| `@emsenn/computing` | Package/category root for operational CGS admission. `compute` / `computing` accepts `(action, token, ?claim)`, resolving finite labeled outcomes into observation arenas or morphism/move tokens into run judgments, with relating charge-backed evidence. |
| `@emsenn/computing/categorifying` | Executable `*`-autonomous category: objects, tensor, dual, par, lollipop, identity/copycat, composition, exponentials, additives, trace, and law witnesses. |
| `@emsenn/computing/cartesianizing` | Kleisli sub-CCC and finite fixed-point surfaces: products, exponentials, currying/evaluation, `mu`/`nu`, and Lambek witnesses. |
| `@emsenn/computing/restricting` | Subcategory-membership boundary for sequential, nominal, session, and Dialectica/realizability paradigms. |
| `@emsenn/computing/operating` | Running-computer morphism chain: settled information -> observation -> arena -> strategy -> move, including federation and cohomology readings. |
| `@emsenn/computing/encoding` | Representation boundary for morphisms, observations, and provenance; it reuses `@emsenn/gaming/encoding` for gaming carriers. |

Computing does not introduce an independent data model.
Its public records are operational readings of gaming carriers over the relating/animating substrate.

The package follows the house **bounded-stage discipline** (see the closing section): everything irreducibly infinite — `!
A`, µ/ν, the `Y` feedback colimit — is realized at each *finite stage* and the ω-colimit is *named, not run*; every law is carried as a **witness/obstruction** judgment computed on real carriers, never an exact law faked at a stage where it cannot hold.

---

## BUILT (this session and before)

All paths relative to `lib/computing/src/`.
The package builds to `dist/` and every law below was just re-verified by running the built artifact (see the **Proof** block at the end of this section).

### The `*`-autonomous category — `category/`

- **Objects & `*`-autonomous structure** — `category/object.mts`.
  Arenas as objects; `tensor` (parallel `‖`, product symmetry groupoid, `L|`/`R|` relabelling), `dual` (`(-)^⊥`, polarity swap, involutive), `unit`/`bottom` (empty arena, the coinciding `1`/`⊥`), `par` (`A ⅋ B = (A^⊥ ‖ B^⊥)^⊥`), `lollipop` (`A ⊸ B = A^⊥ ‖ B`).
  Law witnesses: `involutionJudgment` (`A^⊥⊥ ≅ A`), `deMorganJudgment` (`(A‖B)^⊥ ≅ A^⊥ ⅋ B^⊥`), `unitJudgment` (unit laws).
  `arenaEqual` is the structural `≅`.
- **Morphisms** — `category/morphism.mts`.
  A morphism `A → B` is a strategy on `A^⊥ ‖ B`.
  `copycat` (the identity, mirror Opponent→Player across the two copies), `compose` (interaction-plus-hiding over the shared interface `B`), `enumeratePlays` (the receptive finite play enumerator everything downstream reuses).
  Law witnesses: `identityJudgment` (`cc∘σ = σ = σ∘cc`), `associativityJudgment`.
  `morphismValidity`/`isValidMorphism` check the *concurrent* 1-cell laws (valid/prefix-closed/receptive/symmetry-invariant); `isInnocentMorphism` is the Hyland–Ong sequential restriction, deliberately *kept out* of the ambient law (it is earned in `paradigm/sequential`).
- **Character-as-morphism** — `category/character-morphism.mts`.
  The agents→computing tie: a `@emsenn/gaming` `Character` read as a morphism `A → B` via `morphismOf` (symmetric peer ⇒ copycat; otherwise the receptive total strategy), with `inputArena`/`outputArena`.
- **The linear-exponential `!
  `-comonad + comonoid** — `category/exponential.mts`.
  `bang(A,n)` (the `n`-copy stage `!^(n)A` with the `S_n` copy-permutation symmetry), `dereliction` (counit ε, symmetry-invariant "use some copy"), `bangMap` (the functor on morphisms), `digging` (comultiplication δ via the finite pairing `k = i·m + j`).
  Comonad-law witnesses by *real composition*: `bangPreservesIdentity`, `bangPreservesComposition`, `comonadCounitLeft`, `comonadCounitRight`, and `comonadCoassociativity` (the pairing-associativity finite shadow).
  The **cocommutative comonoid** that upgrades `!
  ` to a genuine linear-exponential modality: `weakening` (discard `w : !
  A → I`), `contraction` (duplicate `c : !
  A → !
  A ⊗ !
  A` via the copy partition), `swapTensor`, with witnesses `comonoidCounitLeft`/`Right`, `comonoidCocommutativity` (up to the named copy-swap `!σ`), `comonoidCoassociativity`.
  `seelyJudgment` carries Seely's iso `!
  (A & B) ≅ !
  A ⊗ !
  B` as the finite event-count identity.
- **The `?
  `-monad** — `category/why-not.mts`.
  The De Morgan dual `?
  A = (!
  (A^⊥))^⊥` obtained by *dualizing* the `!
  `-machinery (`dualMorphism` is the `*`-autonomous transpose `f^⊥`): `whyNot`/`whyNotMap`, `codereliction` (unit η = ε^⊥), `cojoin` (µ = δ^⊥), with the dual monad-law witnesses `monadUnitLeft`/`Right`, `monadAssociativity`, `whyNotPreserves{Identity,Composition}`.
- **Additives + MALL** — `category/additive.mts`.
  `withArena` (`A & B`, Player's external choice = the Cartesian product, reusing `cartesian/product`'s `with2`), `plusArena` (`A ⊕ B`, the De Morgan dual / Opponent's internal choice), projections `pi1`/`pi2`, `pair` (`⟨f,g⟩`), `diagonal`, injections `inj1`/`inj2` (`= π_k^⊥`), `codiagonal` (`= Δ^⊥`).
  Universal-property witnesses `productLawLeft`/`Right` by real `compose`; `additiveMallJudgment` assembles the MALL fragment.
- **Seely's axioms** — exercised in `category/seelys-axioms.test.mts` against the exponential + additive machinery above.
- **Traced monoidal / `Y`** — `category/traced.mts`.
  `trace` (`Tr_X(f)`, the `X`-output wire fed back into the `X`-input wire by the same hide-the-interface surgery as `compose`), `fixedPointCombinator` (`Y f = Tr_X(f)`), `unroll`/ `feedbackShadow` (the bounded `Tr^(n)` unrollings), `withTrivialFeedback`.
  Axiom witnesses `vanishingUnit` (`Tr_1(f) = f`) and `leftTightening` (naturality in `A`) by real play-set equality; the genuine recursive content is the named `Y`-colimit.

### `µ`/`ν` recursion + Lambek — `cartesian/`

- **The Kleisli sub-CCC `Kℓ(!)
  `** — `cartesian/index.mts` aggregates the CCC structure.
  `cartesian/product.mts`: `with2` (the product arena), `terminal`, `leftProjection`/`rightProjection`.
  `cartesian/exponential.mts`: `exponentialArena` (`A ⇒ B = !^(n)A ⊸ B`) and `girardJudgment` (the Girard-decomposition closure witness).
- **Fixed points + Lambek** — `cartesian/fixedPoints.mts`.
  `Endofunctor` + `endofunctor`, `iteratedApplication` (`F^(n)(base)`), `leastFixedPoint` (`µF = colim F^(n)(0)` at finite stage), `greatestFixedPoint` (`νF = lim F^(n)(1)`), the example functors `identityFunctor`, `constantFunctor`, `listFunctor`, `streamFunctor`.
  `structureMap` and `lambek` witness Lambek's lemma (`α : F(µF) → µF` an iso) at a small stage, with the ω-colimit named.

### The operational SPOTCOMP computer — `computer/`

The pipeline `settled information --observe--> CGS arena --strategy--> --run--> player move`, aggregated in `computer/index.mts`.

- `computer/provenance.mts` — `derivationProvenance` / `derivationStages`: the finite-restriction record `articulating → predicating → positing → settling` beneath every declared arena (SPOTCOMP spec §1), with audited polarity-uncommitted cells kept as evidence.
- `computer/observation.mts` — `observe` / `observeReading`: a frontier of settled relationality memes → polarized arena, via the **charge-IS-polarity** identity (`potential = t` ⇒ Player, `potential = f` ⇒ Opponent, `absurd`/`stable` ⇒ no move, kept as audit evidence).
  `settledMeme`, `memePolarity`.
- `computer/run.mts` — `run`: one interaction step.
  A modeled player IS a `Morphism`; given history + an admitted Opponent move it returns the *set* of enabled (concurrent) Player moves, with `RunWitness`/`RunObstruction` at the receptivity/legality boundary.
- `computer/federation.mts` — `federate` (many players composed by the multiplicative `‖`) and **`federationCohomology`**: disagreement between federated sites *computed* as the bigraded class `H^1 ≅ H^1_t ⊕ H^1_⊤` (`BigradedH1`: `truthRow` ⊕ `inconsistencyRow`, `DirectSumWitness`), the glued global section (`GluedSection`), the `ProjectionFixedPoint` witness, and the orthogonal base-complex topological `H^1` (`BaseComplexH1`).
  "The paraconsistent content cannot be re-merged with the classical content" is the idempotence of the coordinate split.
- `computer/bilattice-projection.mts` — `projectH1` / `projectionWitness`: the two coordinate projections `π_t`, `π_⊤` lifted to first-class Lambek projection fixed points (idempotence per coordinate + total direct-sum partition, *exact* finite identities, not colimit approximations).

### The four paradigms — `paradigm/`

- `paradigm/structure.mts` — the shared executable structural predicates (`hasTrivialSymmetry`, `playsAlternate`, `intraPolarityFullyConflicting`, `noCrossPolarityConflict`, …) that cut each tradition out of CGS.
- `paradigm/sequential.mts` — Hyland–Ong (`sequentialMembership`: trivial symmetry + alternation + innocence — innocence enters *here* as the restriction, exactly as kept out of the ambient category law).
- `paradigm/nominal.mts` — AGMOS (`nominalMembership`: finite name labels + `FSym(A)` generators delegated to `@emsenn/gaming` nominalizing, plus strategy equivariance under the generated action).
- `paradigm/session.mts` — Caires–Pfenning (`sessionMembership`: the session's CLL proposition lies in the reused CLL fragment classifier, and gaming's session duality maps to CLL linear negation).
- `paradigm/dialectica.mts` — realizability/`Eff` via Hyland's `F` (`dialecticaMembership`: trivial causality + full intra-polarity conflict + no cross conflict + trivial symmetry).
- `paradigm/theory.mts` — the theorem assembled on carriers: `theoryOfComputing`, `subtheoryLattice` (the reused `fragmentPoset`, `ILL`/`CLL` incomparable), `paradigmInhabitants`, and `simultaneousEmbeddingJudgment` — *exhibits* one real inhabitant of each paradigm and runs the real membership predicate, so "all four embed simultaneously" is demonstrated.

### The ludics↔CGS bridge — `category/ludics-bridge.mts`

The Faggian–Hyland coincidence made to operate: `design ⟷ strategy`, `chronicle ⟷ play`, `cut/normalize ⟷ compose`, `locus ⟷ event`, `daimon ⟷ play termination`.
`designToMorphism` / `morphismToDesign`, `chronicleToPlays` / `playToActions` / `playToChronicle` (the round-trippable grain), `designTargetArena`, and `compositionPreserved` / `preservesComposition` — the composition half witnessed on a tiny convergent example (`games normalize` of two dual designs == computing `compose` of their bridged morphisms).
The honest fragment is single-base focused designs ↔ single-thread sequential plays; the full functor over all (unfocused, multi-base, banged) designs is the ω-stage iso, named.

### Codecs — `codecs/`

Charge-faithful, round-tripping `encodeX`/`decodeX` reusing `@emsenn/gaming/encoding`: `codecs/morphism.mts` (`encodeMorphism`/`decodeMorphism`) and `codecs/observation.mts` (`encode`/`decodeProvenance`, `encode`/`decodeObservation`).

### Proof it works (built `dist/`, run just now)

```
involution: computing.category.involution:witness
deMorgan:   computing.category.deMorgan:witness
unit:       computing.category.unit:witness
identity-left: computing.category.identity:witness
seely:      computing.category.seely:witness
bang !(id)=id:  computing.category.comonad.law:witness
counit ε∘δ=id:  computing.category.comonad.law:witness
coassoc:        computing.category.comonad.law:witness
comonoid (w⊗id)∘c=id: computing.category.comonoid.law:witness
cocommutativity:      computing.category.comonoid.law:witness
product law:    computing.category.additive.product:witness
lambek:         computing.cartesian.lambek:witness
simultaneous-embedding: computing.paradigm.simultaneousEmbedding:witness
```

(Federation's `federationCohomology` and bilattice-projection's `projectH1` / `projectionWitness` are exported and exercised by `computer/federation-cohomology.test.mts` and `computer/bilattice-projection.test.mts`.)

---

## NEXT (grounded in the build menu salvaged into research triage 2026/06/15)

Each item maps to a real corpus stratum; the apex-tower journals at `triage/2026/05/25/voidmath/articulating/.../chl-apex-recursion/` and `triage/2026/06/06/.../settling/docs/dev/notes/` are the load-bearing sources.

### 1. The predication hyperdoctrine — `predication/` (large, ~5–7 modules)

`exists_f ⊣ f* ⊣ forall_f` (the Lawvere quantifier-adjoint triple), with **Beck–Chevalley** coherence on pullback squares and **Frobenius** reciprocity for the meets.
The corpus is explicit (`.../existential-push-forward/.../ 2026-05-24.md`, `.../predication-fiber-functor/.../2026-05-24.md`) that this is a *bilattice-valued* hyperdoctrine with **two parallel adjoint systems** — `∃^k ⊣ f* ⊣ ∀^k` along the knowledge order and `∃^t ⊣ f* ⊣ ∀^t` along the truth order (axioms B1k/B1t), Frobenius for `∧_k` and `∧_t`, Beck–Chevalley for both — forced (not added) by two-orders duality and the Kelly–Lack property-likeness theorem. *Why:* this is the layer that connects the running computer's predication cells to quantification; it is the missing adjoint structure under `observe`/`run`.
It is the largest single gap because it needs a real fibration carrier (predication fibers over the base complex) plus the doubled adjoint triple, then Beck–Chevalley and Frobenius as witness/obstruction judgments — each computed on tiny covers, the full naturality named.

### 2. Verdier duality — `category/verdier.mts` (medium, ~1–2 modules)

The corpus has no standalone "Verdier duality" doc, so this is the most *speculative* NEXT item: realize the dualizing-complex/six-functor shadow already implicit in the `*`-autonomous `(-)^⊥` and the `dualMorphism` transpose, lifted to the sheaf-of-predications level so that the federation `H^1` and its base-complex `H^1` become two ends of a duality. *Why:* it closes the loop between `category/object`'s `(-)^⊥` (object-level dual) and `computer/federation`'s cohomological duality — but until a corpus grounding doc lands it should stay a witness-only sketch, not a load-bearing claim.

### 3. The MLD moduli stack — `computer/moduli.mts` (medium–large, ~2–3 modules)

Stratum 7 of the apex tower: the **settling moduli stack `M^SKH`** as the MLD-quotient (meta-language-of-discourse) of settlings up to MLD-equivalence, with the **strong-MLD self-dual orbit** fixed point (`.../strong-mld-self-dual-orbit/.../2026-05-26.md`).
The journals flag the open work explicitly: "construct the meta-moduli stack … prove a live swarm's strong MLD class" and "Concrete examples of strong-MLD self-dual orbits — the moduli stack's first non-trivial computational examples." *Why:* this is the classifying layer above federation — it tells you *which* settlings are the same up to discourse — and the corpus already names exactly the first computational example to build, so it is well-scoped despite its height.

### 4. Deeper GoI — `category/goi.mts` (medium, ~1–2 modules)

Geometry-of-Interaction: realize the trace-based `Y` of `category/traced` as a genuine GoI execution (the `Ex(C)` / `Int(C)` construction over the traced monoidal CGS, token-machine interpretation of cut-elimination). *Why:* the traced structure is already built, so GoI is the natural next operational layer — it turns the bounded `Tr^(n)` unrollings into a running token machine — but the corpus grounding here is thin (no direct "GoI" hits), so it should follow the hyperdoctrine work and lean on the existing `trace`/`feedbackShadow` carriers rather than inventing new ones.

---

## The standing discipline

Every contribution must keep these invariants — they are the difference between real executable mathematics and look-alike literals:

1. **Bounded copies + named ω-colimit.** Anything irreducibly infinite — `!
  A`, `?
  A`, `µ/ν`, the `Y` feedback — is realized at a *finite stage* (`bang(A,n)`, `F^(n)`, `Tr^(n)`) and the colimit is **named, not run**.
  New constructions take an explicit stage parameter and document the colimit they approximate.

2. **Witness/obstruction, never a faked exact law.** Every law is a `…:witness | …-obstruction` judgment computed on real carriers.
  A law is witnessed *only at the stage where it is dimensionally exact* (by genuine `compose`/`morphismEqual`), or by its **load-bearing finite shadow** (e.g. coassociativity as copy-pairing associativity) with the colimit caveat stated in the JSDoc.
  Never assert an exact equality at a stage where the copy counts cannot line up.

3. **Reuse the algebra; decode to real carriers.** Build on `@emsenn/gaming` constructors (`arena`, `event`, `strategy`, `play`, `dual`, …) and reuse `cartesian/product`, `category/morphism`'s `enumeratePlays`, etc., rather than re-deriving.
  Codecs round-trip through the real constructors so a decoded carrier is genuinely frozen.

4. **Mind the cost.** `enumeratePlays` is exponential in concurrent events — keep every arena used in a witness to one or two events.
  Strict finite symmetry-invariance over the copy-groupoid is an ω-colimit property: maps between banged arenas are checked for operational structure (valid / prefix-closed / receptive) and the play-level laws, *not* for finite symmetry-invariance.
