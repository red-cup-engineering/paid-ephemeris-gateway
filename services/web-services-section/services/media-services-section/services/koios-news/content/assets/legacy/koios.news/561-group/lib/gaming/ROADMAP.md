# ROADMAP — `@emsenn/gaming`

CGS carriers + ludics, operationalized as one package downstream of animating and upstream of computing.
This roadmap is written against the actual source under `lib/gaming/src/`.
File paths are concrete.

## What it IS

`@emsenn/gaming` is the claim **"the theory of computing is CGS"** turned into running code.
CGS = concurrent games with symmetry: the unique $*$-autonomous category into which sequential game semantics (Hyland–Ong), nominal computation (AGMOS), session-typed concurrency (Caires–Pfenning), and Dialectica realizability all embed as full sub-categories.
Underneath sits Girard's **ludics**: designs, loci, interaction, orthogonality, behaviours.

The package builds nothing twice.
A design is not a new datatype — it is a partial charge valuation over the bilattice of `@emsenn/relating` (the meme apex): Proponent ↦ `potential` ($t$), Opponent ↦ `potential` ($f$), Daimon ↦ `active` ($\top$, designated/paraconsistent), absent ↦ `absurd` ($\bot$).
See `src/algebra/design.mts`.
Interaction is the **knowledge-join** $\sqcup_k$ of two dual valuations (`src/algebra/interaction.mts`).
Settling/closure is the bi-orthogonal Galois closure that mirrors `@emsenn/relating`'s closure engine (`src/topology/behaviour.mts`).
The proof layer (linear logic) is the typed sub-theory lattice of this same structure (`src/logic/`).

The package is one module with subpaths, each a former `game-*` package, declared in `package.json` and re-exported from `src/index.mts`: `./algebra`, `./topology`, `./logic`, `./geometry`, `./analysis`, `./codecs`, `./computer`.

This roadmap covers the **algebra / topology / logic** spine.
(`geometry`, `analysis`, `codecs`, `computer` are real and shipped but out of scope here.)

## Category Map

| Package/module | Category role |
| --- | --- |
| `@emsenn/gaming` | Package/category root for CGS admission. `gaming` / `game` accepts `(action, token, ?claim)`, resolves demo/arena tokens into real CGS carriers, and returns charge-backed admission or obstruction evidence. |
| `@emsenn/gaming` | Base object subcategory: polarity, event structures, arenas, strategies, plays, loci, designs, characters, and interaction carriers. |
| `@emsenn/gaming` | Settling/closure subcategory: orthogonality, behaviours, locativity, incarnation, formulas, and convergence witnesses. |
| `@emsenn/gaming/proving` | Proof-theoretic boundary over the same carriers: propositions, fragments, embeddings, focusing, exponentials, dialectica/session readings, and computational ludics. |
| `@emsenn/gaming/placing` | Causal/spatial geometry of CGS arenas and loci: boundaries, coverings, configurations, magic circles, ludus/paidia surfaces. |
| `@emsenn/gaming/reading` | Reading subcategory: flow, trajectory, regime, rhetoric, deep-play, lusory-attitude, and cultural-embedding morphisms over gaming carriers. |
| `@emsenn/gaming/encoding` | Representation boundary: charge-faithful JSON/JSONL and carrier codecs. |
| `@emsenn/gaming/running` | Operational boundary: a running game as arena + designs + play/history plus pure transitions, registry, persistence, demos, and CLI. |

The ontology spine is `relating -> animating -> gaming -> computing`.
References to "games" inside the package remain theory language for CGS/game semantics; the package boundary is `gaming`.

---

## BUILT

### Algebra — the carriers (`src/algebra/`)

The pure substrate; settling lives downstream in topology, exactly as meme-topology hosts closure over meme-algebra.
Barrel: `src/algebra/index.mts`.

- **Polarity** (`polarity.mts`) — Player/Opponent as a Belnap charge class; `dual` is the gauge negation, and `dualityIsNegation` is the free witness reused by focusing.
- **Event structure** (`event-structure.mts`) — polarized prime event structures with symmetry (causality + conflict), the CGS object substrate.
- **Arena** (`arena.mts`) — polarized arenas with a symmetry groupoid; the groupoid is what the nominal/AGMOS embedding reuses.
- **Strategy** / **play** (`strategy.mts`, `play.mts`) — strategies over arenas and the plays they generate.
- **Locus** (`locus.mts`) — addresses in the locus tree (`root`, `child`, `prefixes`, `locusKey`/`locusFromKey`); the spatial spine of ludics.
- **Design** (`design.mts`) — Girard's dialogical object as a charge valuation; `designAct`/`designCharge`, `daimon`, `support`.
  Loci outside support carry $\bot$.
- **Action** (`action.mts`) — Girard §4 atoms $(+,\xi,I)$ / $(-,\xi,I)$ / $\dagger$ in bijection with three of four Belnap classes, routed through `actCharge` (no re-hardcoded bilattice); sub-action order = finite subsets of $\mathbb{N}$.
- **Chronicle** (`chronicle.mts`) — Girard §4.7 plays-along-one-branch: maximal alternating justified action sequences; a design is the union of its chronicles.
  Validity judgment realizes (Ch1)–(Ch4).
- **Interaction** (`interaction.mts`) — the central morphism: `interact(d1,d2)` is the pointwise knowledge-join (the interaction normal form); `interactionReport` surfaces meeting loci and Daimon loci.
  Deliberately does **not** decide convergence — that is topology's job.
- **Delocation** (`delocation.mts`) — the locative primitive: `delocate(d,ξ)` relocates a design under a prefix; `superpose` knowledge-joins disjoint copies.
  This is what lets multiplicatives/exponentials place copies under disjoint sub-addresses without collision.
- **Character** (`character.mts`) — agents as CGS participants: the seam rooting `@emsenn/gaming` in `@emsenn/animating`.
  Embodied handedness $(\mathrm{recv},\mathrm{send},\mathrm{actuate},\mathrm{observe})$ IS Player/Opponent duality on $A^\perp \| B$; `sides` exposes the morphism shape; the symmetric copycat peer is recorded, never imposed.
- Also: `shadow.mts`.

### Topology — the closure / settling engine (`src/topology/`)

Barrel: `src/topology/index.mts`.
"Settling IS dialogical interaction."

- **Orthogonality** (`orthogonality.mts`) — $\mathfrak{D}\perp\mathfrak{E}$ iff the interaction converges: it meets and reaches a Daimon collision $\top$.
  `convergenceJudgment` is the witness/obstruction (`no-meeting` / `no-daimon`).
- **Behaviour** (`behaviour.mts`) — bi-orthogonal Galois closure $\mathbf{B}=\mathbf{B}^{\perp\perp}$ relative to a finite universe: `orthogonalOf`, `biorthogonalClosure`, `generatedBehaviour`.
  Formulas are the names of closure-rule systems.
- **Internal completeness** (`internal-completeness.mts`) — Girard §15: a behaviour has an internal presentation independent of the external closure.
  Operational shadow: `presentsSameBehaviour` / `internalCompletenessJudgment`.
  This file also **realizes the MALL connectives on behaviours**, each configuring the existing Galois closure: `negateBehaviour` ($\mathbf{B}^\perp$), `withBehaviour` (&, the meet), `plusBehaviour` ($\oplus$, closure of union), `tensorBehaviour` ($\otimes$, closure of $\{\mathfrak D_1 \star \mathfrak D_2\}$ via `interact`), `parBehaviour` ($\invamp$), `lollipopBehaviour` ($\multimap$).
- **Locativity** (`locativity.mts`) — `delocationInvarianceJudgment`: orthogonality is invariant under relocating **both** dual designs by the same prefix ($D\perp E \iff \xi\cdot D \perp \xi\cdot E$) — designs/behaviours are placeable anywhere.
  This file also realizes the **exponential behaviours**: `ofCourseBehaviour` ($!
  B$ at a finite copy-stage = closure of superposed disjoint-relocated copies; the true $!
  B$ is the ω-colimit, named not run), `whyNotBehaviour` ($?
  B=(!
  (B^\perp))^\perp$), plus `ofCourseMonotoneJudgment` ($!$ is a functor).
  Test: `locativity.test.mts`.
- **Incarnation** (`incarnation.mts`) — Girard §11 material core $|\mathbf{B}|$: strip ballast loci no counter-design visits.
  `designLeq` = the apex knowledge order on designs (reuses `knowledgeLeq`); `incarnationOf`, `incarnation`/ `skeleton`, `isMaterial`/`materialJudgment`.
- **Formula** (`formula.mts`) — names of behaviours.
- **Chronicle-convergence** (`chronicle-convergence.mts`) — per-step trace refining the global verdict: follows two dual chronicles in lockstep and converges at the first Daimon step.

### Logic — the proof layer (`src/logic/`)

Barrel: `src/logic/index.mts`.
CLL is the proof-theoretic name of the $*$-autonomous structure the carriers realize.

- **Proposition** (`proposition.mts`) — the CLL connectives as a typed vocabulary; `dualProp` (involutive De Morgan, reusing algebra `dual` at atoms); `connectivesOf`.
- **Fragment** (`fragment.mts`) — the fragment lattice $\mathrm{MLL}\subset\mathrm{MALL}\subset\{\mathrm{ILL},\mathrm{CLL}\}\subset\mathrm{LL}$ as an explicit finite poset: `fragmentCoverings`, `fragmentLeq` (reflexive-transitive closure, so **ILL ⊥ CLL incomparability is exact** — not a chain), `fragmentsComparable`, `inFragment`, `classifyFragment`.
- **Focusing** (`focusing.mts`) — Andreoli positive/negative = synchronous/ asynchronous, reusing the algebra `Polarity` carrier (no new enum); `polarityOfConnective`, `isPositiveProposition`, and `focusingDuality` (each connective's dual has the opposite focusing polarity — a free witness).
- **Exponential** (`exponential.mts`) — $!$ corresponds to bi-orthogonal closure; carried as a data statement + theorem (idempotent/increasing/monotone closure laws), citing topology's closure rather than recomputing it.
- **Session** (`session.mts`) — Caires–Pfenning session-types-as-propositions; `propositionOfSession` is the realized object-map, `dualSession` is endpoint duality, and `sessionCompatibilityJudgment` is the channel-compatibility / cut boundary.
- **Dialectica** (`dialectica.mts`) — `dialecticaObjectToArena`, the realized object-map of the Dialectica embedding.
- **Embeddings** (`embeddings.mts`) — the **four full sub-$*$-autonomous embeddings** into CGS as data-carrying functors, with realized object/action maps where the carrier is present: `hylandOng` (sequential, named only), `dialectica` (`dialecticaEmbed` realized), `nominal`/AGMOS (`nominalizing/` realizes finite FSym(A) actions through arena symmetry and strategy equivariance), `cairesPfenning` (`cairesPfenningEmbed` realized).
  Each carries source, sub-category, structural constraint, citation, and full-abstraction theorem.
- **Computational ludics** (`computational-ludics.mts`) — Terui 2011 cut as an explicit reduction: `cutStep` (one reduction step = `interact` gated by convergence), `cut` (partial composite, `null` on divergence), `normalize` (= `interact`, the cut-eliminated trace), `normalizationWitness`, `converges`, and `cutElimination` (the Girard 2001 / Terui 2011 strong-normalization Hauptsatz as a named statement).
  The interaction normal form IS cut-elimination.

---

## NEXT

Ordered by leverage.
Each item names where it lands.

1. **The ludics identity design — Fax / copycat.** The one design ludics cannot skip: `Fax` (the η-expanded copycat / `cc` identity at a behaviour), the $\mathbf{B}\to\mathbf{B}$ unit that `cut`-composes to the identity on convergent plays.
  `character.mts` already records the *shape* of the copycat peer but owns no composition; `computational-ludics.mts` has `cut` but no unit.
  Land `fax(B)` in `src/algebra/` (or a new `src/logic/identity.mts`) plus the witness that `cut(fax(B), d) ≃ d` — this is what makes behaviours a genuine category, not just a closure operator.

2. **Shifts up/down (↑ / ↓), the polarity-change operators.** Focusing in `focusing.mts` classifies connectives as positive/negative but there are no **shift** operators to move between phases — the $\uparrow$/$\downarrow$ that make focused proof search complete and that, on the ludics side, mediate the positive/negative design boundary.
  Add them to `src/logic/focusing.mts` (typed shifts on `Proposition`) with the duality $({\uparrow}P)^\perp = {\downarrow}(P^\perp)$, and the design-level delay they induce.

3. **Separation / full completeness.** The ludics separation theorem (Girard 2001: distinct material designs are separated by some counter-design) and full completeness for the MALL fragment (every behaviour-morphism is the denotation of a proof).
  `incarnation.mts` gives the material skeleton needed to state separation; add `separates(d1,d2)` and the full-completeness witness in `src/topology/` / `src/logic/`, upgrading the four `embeddings.mts` full- abstraction theorems from *named* to *checked* on the realized fragments.

4. **Finish the remaining embedding object-maps.** `hylandOng` still needs the full alternating arena former. `nominalizing/` now realizes the finite $\mathrm{FSym}(\mathbb{A})$ symmetry action and equivariance judge; the remaining AGMOS work is the full nominal-games object former and concrete $\nu$-calculus interpretation.
  Building those under the CGS-with-symmetry tree would let `embeddings.mts` expose four fully realized functors instead of named theorem carriers plus partial object maps.

5. **Deepen the games ↔ computing bridge.** The true $!
  B$ is currently the named ω-colimit (`locativity.mts`); realize the $!$-comonad / Kleisli structure so promotion and dereliction run, connecting to `@emsenn/computing`'s `!
  `-comonad.
  Promote `cut` to an associative, unital composition (needs item 1) so the **category of behaviours** is constructed, not just asserted by `cutElimination`.
  This closes the loop: `character.mts`'s morphism *shape* + `fax` identity + `cut` composition = the 1-cells the computing layer consumes.

---

## The discipline

Hard rules, visible in every file above:

- **Game is a configuration of the meme apex — never a new datatype.** Designs are charge valuations; polarity is a Belnap class; interaction is the knowledge-join; the design order is `knowledgeLeq`.
  We import from `@emsenn/relating/algebra`, we do not re-encode the bilattice.
- **Settling lives in topology, carriers in algebra.** `algebra/interaction.mts` gives the raw morphism and explicitly refuses to decide convergence; `topology/` owns orthogonality, closure, and every connective.
- **Reduce / reuse / recycle.** Every connective configures the *one* bi-orthogonal Galois closure; `tensorBehaviour` reuses `interact`; `cut` reuses `interact` + `convergenceJudgment`; `focusing` reuses the `Polarity` carrier; `exponential.mts` *names* topology's closure rather than reimplementing it.
- **Witness / obstruction judgments, frozen carriers.** Every decision returns a `…:witness` | `…-obstruction` discriminated by a `kind` tag; constructors `Object.freeze` their results; predicates are thin wrappers over the judgment.
- **Theorems carried as data.** Where the engine lives elsewhere or the result is meta (`cutElimination`, `exponential`, `embeddings`), the corpus theorem is a frozen record with a JSDoc statement and citation — named, not faked.
- **Corpus-cited.** Every module header cites the source (Girard 2001 "Locus Solum", Terui 2011, Andreoli 1992, Hyland–Ong 2000, AGMOS 2004, Caires–Pfenning 2010, de Paiva 1989, Castellan–Clairambault–Winskel 2014) and the in-corpus note it realizes.
