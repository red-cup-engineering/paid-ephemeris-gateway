# discourse sheaves: selective communication, translation failure & lying

*2026-06-25.
From the HGR sheaf-Laplacian research sweep + emsenn's application-domain brief.
Records communicating's place as the discourse-sheaf faculty — where the edge between two actors carries a translation map, not a scalar influence weight — and the open problems that move past scalar opinion models. communicating is the across/truth face (`≤_t`), a sub-monoid of `End(Meme)`.
Research note.*

## The structural move communicating already makes

Classic opinion models (DeGroot, Friedkin–Johnsen, bounded-confidence, structural-balance) put a **scalar influence weight** on each edge.
Discourse sheaves (Hansen–Ghrist) put a **translation map** there instead — and that one change is what communicating is *for*.
Because an edge translates rather than equates, the model can represent: - agree privately while **expressing differently** publicly; - disagree privately while communicating so it **appears stable**; - occupy **incompatible conceptual frames** while local interaction stays smooth.

HGR used discourse sheaves explicitly for selective communication, opinion modulation, and **lying**.
2026 work extends this toward *directional stubbornness*, selective learning of expression policies, forced sheaf equations, convergence conditions, and **stagnation bounds where rhetorical accommodation masks unchanged belief** — public sections converge while private sections do not move.

## In communicating's own terms

communicating reads its membrane as utterances pooled per subject by `joinKnowledge` (bilattice accumulation) on the truth axis `≤_t`; the `negate` morphism is the antitone truth-direction flip.
Map: membrane ↔ cellular complex, meme ↔ cochain, `joinKnowledge` ↔ coboundary `δ`, opposed truth direction ↔ signed edge, the pooled **lean** (potential/active/stable/absurd) ↔ harmonic value at the subject cell, contested `⊤` cells ↔ `ker(L)` harmonic space.
The "expression policy" is exactly the restriction/translation map `V(α)` on an edge; selective communication is a *non-identity* translation; lying is a translation chosen so the public section glues while the private one does not.

Runtime status: `discourseCohesionOf(...).cohomology` now makes the discourse graph's H¹ loops proof-carrying.
The existing `irreducible` cycle count is backed by `@emsenn/relating`'s finite predication Laplacian carrier and normalized through `cohomologyTerms.laplacian`.

## The four-way distinction the translation edge enables

The single most valuable output: separate what scalar models collapse into "they disagree."
1. **sincere disagreement** — stalks opposed, translation honest; 2. **translation failure** — the *edge* is the obstruction, stalks compatible; 3. **strategic expression / lying** — public section ≠ private section by design; 4. **local agreement that cannot globalize** — every edge consistent, no global section (`cl-inv ∈ H¹ ≠ 0`).

A diagnostic that distinguishes these is a genuine advance over "variance."

## Our edge

`⊤`-conflict is a **stable harmonic** state (proven dependency-free: `LawvereHarmonicCohomology`, `SettlingCohomologyH1`), so a contested subject is not an instability to suppress but a fixed point of the closure operator — the formal home of "we are stably told both."
No inner product is needed (the truth axis is an *order*, pooling is bilattice join/meet), so HGR's spectral-gap convergence is replaced by Tarski fixed-point convergence with an ordinal step bound.
And aperiodic substitution machinery lets long-lived opinion drift be an infinite self-similar pattern in the communication hull, not a finite cycle.

## Concrete builds (from the brief)

- **Bilattice sheaf-Laplacian on the membrane** *(top build)* — prove `communicatingFace` (the truth-direction aggregate) equals the harmonic reading of membrane settlings under `L = □∘◇`; contested cells mark `⊤`-fixed points; emit the Tarski iteration count as a convergence metric.
- **Sheaf-Hodge decomposition** of the membrane — partially realized by `discourseCohesionOf(...).cohomology` for discourse-graph H¹ loops; the remaining build is to partition each subject's pooled charge into *told* (harmonic / globally settled), *derived* (inherited from other subjects' implications), and *residual* (underdetermined), with across-face lean provenance.
- **Signed-Laplacian convergence under paraconsistency** — the order-theoretic dynamics `x ↦ L x` are monotone with a step-bounded termination (`≤ height(dFrm)`); the `⊤`-state is an attractor when both-sided evidence is present, dissolving HGR's signed-graph instability.
  Surface the **stagnation bound**: when the public section is harmonic but the private section has not moved.

## Grounding

`lib/communicating/src/.../face.mts`, `lib/communicating/src/communicate/cohesion.mts`, the `negate` morphism, the meme `End(Meme)` sub-monoid; Lean `LawvereHarmonicCohomology`, `SettlingCohomologyH1`; HGR discourse sheaves + the 2026 selective-communication/expression-policy line.
Related: socializing opinion-dynamics (the multi-observer lift), knowing evidence-fusion (deception = local-coherence-without-global-section), relating non-reductive-computation thesis.
