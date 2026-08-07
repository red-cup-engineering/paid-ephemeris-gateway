# Tarski–bilattice Laplacian on the design face

*2026-06-25.
From the HGR sheaf-Laplacian research sweep.
Records how playing's evidence face (Designs as partial charge-valuations) carries a native sheaf-Laplacian harmonic mechanics, and the one theorem that unlocks it. playing is the *-autonomous / ludics faculty — the outside/evidence face `⟨a₊,a₋⟩`.
Research note.*

## The reading

playing reads its membrane as a **Design**: a partial charge-valuation `v_D : Loci × Loci ⇀ L^⋈` with FOUR-valued charges (potential/active/stable/absurd = Player/Opponent/Daimon/none).
The evidence face reads the polarity split (for-count `a₊` vs against-count `a₋`).
Map to HGR machinery: - the design's loci → 0-cells of a face incidence poset on the membrane; - the polarity-valued charges → a cellular sheaf `F : Poset → Charge-category`; - the Player/Opponent split `a₊/a₋` → the **signed-incidence** structure for a signed Laplacian; - the evidence twist product `⟨a₊,a₋⟩` → the natural domain of `L = (δ*)δ + δ(δ*)` over signed-charge incidences; - consensus at the design level → the limit of polarity-valuations = `H⁰` of the design-associated sheaf.

The bilattice knowledge order `≤_k` on `Charge` is already the corpus's `Q`-category for the Lawvere Laplacian (`LawvereHarmonicCohomology.lean`: harmonic kernel = quiescent = fixed points of `L = □∘◇`).

## Our edge

The decisive RelMath advantage on the evidence face: **active = `⊤` = `⟨1,1⟩` ("told both") is a *designated* harmonic fixed point**, not a source of instability.
`L(⊤) = ⊤`; designs carrying the Daimon charge form a convex set under `L`.
HGR/SEAMAN treat signed-graph conflict as instability to spectrally control; here, conflict *is* the Daimon's convergence marker.
The Lawvere Laplacian is `Q`-enriched (contraction moduli in the quantale `Charge` itself, not real spectral gaps), needs only order + polarity (no inner product), and aperiodic step-n classification gives `O(n)` settling bounds independent of any spectral gap.
This is also the natural home for an AI-evaluation reading (#7 in the application brief): a model that passes local benchmarks but admits no coherent global behavioral spec is a design with no harmonic global section.

## Concrete builds (from the brief)

- **Tarski–bilattice Laplacian on the Design face** *(top build)* — construct `L = □∘◇` on `Charge`-valued cochains over the loci poset; `ker(L − id)` = the stable designs (those reaching Daimon `⊤` under settling); prove a design settles to its harmonic fixed point in `≤ 3` steps (cf. `lfp_reached_by_three`).
  Theorem `PlayingDesignHarmonic : Design → harmonic_kernel L` with a step-count bound.
  Foundation for all downstream proposals.
- **Signed-polarity Hodge decomposition** — `Design = Harmonic + exact(δ) + coexact(δ*)`; harmonic designs are conflict-resolving (Daimon everywhere), exact are polarized propagations, coexact are responses; the interaction normal form (`⊔_k` of dual designs) lands in the harmonic component.
- **Diffusion consensus on multi-agent design graphs** — agents hold designs `D_v`, channels hold `D_e = D_{v1} ∧_k D_{v2}`; diffusion `x ↦ L(x)` converges to the global consensus design in `≤ k` steps.
- **`DaimonIsHarmonicFixedPoint`** — formalize that top-conflict is the harmonic attractor, dissolving "conflict instability" as a language issue.

## Grounding

`lib/playing/src/.../face.mts` (`designOfMembrane`), the ludics design carrier, the evidence twist `⟨a₊,a₋⟩`; Lean `LawvereHarmonicCohomology`, `AperiodicClassification`, `LawvereLaplacianSpectralGap`.
Related: gaming arena-diffusion (multi-agent playing), knowing evidence-fusion, relating non-reductive-computation thesis.
