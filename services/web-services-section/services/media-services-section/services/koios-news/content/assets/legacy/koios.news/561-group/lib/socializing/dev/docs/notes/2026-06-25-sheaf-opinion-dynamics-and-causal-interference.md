# sheaf opinion dynamics & causal inference under interference

*2026-06-25.
From the Hansen–Ghrist–Riess (HGR) sheaf-Laplacian research sweep (six-faculty workflow) + emsenn's application-domain brief.
Records where socializing's Social Field already instantiates discourse-sheaf / sheaf-Laplacian machinery, and the two open social-science problems it is positioned to attack: opinion dynamics / polarization, and causal inference under network interference.
This is a research note, not a build log — it names the concrete capabilities to build and what we already have.*

## What socializing already is, in HGR terms

socializing's `field.mts` is an explicit multi-observer system `V : O → Settlings_B` — a cellular sheaf on the observer category `O` (members as objects, *translations* as morphisms).
`consensus.mts` computes `sheafCharges` over the comparison graph using knowledge-join (`∨_k`, pooled) and knowledge-meet (`∧_k`, common); the **opposition subgraph H¹** (first Betti number of edges where two observers settle to opposed truth directions — one potential-only, one active-only) is already the disagreement obstruction.
`face.mts` reads `obstruction = H¹ count`, `coordinationFree = obstruction === 0`, and whether the field section *glues*.

The decisive structural fact, the one scalar models (DeGroot, Friedkin–Johnsen, bounded-confidence, structural-balance) cannot represent: **the edge between two actors carries a translation map, not a scalar influence weight.** Two people can agree privately while expressing differently; disagree privately while communicating stably; or occupy incompatible conceptual frames while local interaction stays smooth.
HGR used exactly this (discourse sheaves) to model selective communication, opinion modulation, and lying.

## Open problem 1 — when is polarization actually polarization?

A sheaf reading distinguishes four things scalar models collapse into one "variance": 1. **sincere disagreement** — opposed stalk values, restriction maps honest; 2. **translation failure** — restriction map (the edge `V(α)`) is the obstruction, not the stalks; 3. **strategic expression** — public section ≠ private section (the discourse-sheaf "lying" case); 4. **local agreement that cannot globalize** — every edge consistent, yet no global section: the obstruction class `cl-inv ∈ H¹`.

The prize is a **formal theory of social contradiction** that is not "variance" or "lack of consensus" but a structured local-to-global object.
Pluralism then becomes a *computation*: which incompatibilities are live productive pluralism (multiple stable local sections we should preserve), which are noise, which generate nontrivial obstruction that forces fragmentation.
And echo-chamber formation becomes the question: does a recommender polarize by *moving opinions* (stalk change), *changing communication maps* (edge change), or *changing overlap topology* (base change)?
Homophily-vs-contagion becomes: certify when observed local alignments are compatible with multiple global causal stories — not inferring causality, but bounding which stories the topology *admits*.

## Open problem 2 — causal inference under interference

When units interfere (treatment on one affects others' outcomes — public health, platforms, schools, epidemics), there may be **no single global treatment effect** independent of exposure neighborhoods and spillover paths.
Put local causal models on neighborhoods, restriction maps on overlaps, and compute whether the local causal claims glue.
Three outputs: - **global section exists** → local estimates cohere into a global estimand; - **no global section, small harmonic defect** → approximately transportable, bounded error; - **nontrivial obstruction** → the causal question is *malformed at this scale*: stop averaging, the thing you are averaging does not exist.

That last output is the result, not a failure: *when is "the effect" a valid global object at all?*

## Our edge (machine-checked, not informal)

HGR/SEAMAN reason informally about signed-Laplacian **instability under conflict**.
We dissolve it: the contested (`⊤`, "told both") state is a **stable harmonic kernel element** of the Lawvere/Tarski order-Laplacian `L = □∘◇`, not an oscillating eigenvalue shadow — proven dependency-free (`LawvereHarmonicCohomology`, `LawvereLaplacianSpectralGap`, `BigradedSettlingCohomology` splitting truth-content `H^{0,n}` from inconsistency `H^{1,n}`).
The bigrading formally separates "disagreement" into truth-side consensus and the paraconsistent inconsistency seam — what scalar opinion dynamics treat as monolithic.
Convergence is ordinal-bounded (`lfp_reached_by_three` in the strict regime), not spectral-gap numerics.

## Concrete builds (from the brief)

- **`SheafLaplacianReading` on the Social Field** *(top build)* — extend `socializingFace` to compute `L = □∘◇` on members' representative charges, apply `M.closureOp` to the field consensus, read the harmonic kernel extent; prove `convergeAction`'s limit `lim_O V(o)` is harmonic (`∈ ker L`) exactly when `coordinationFree`.
- **Harmonic-consensus diffusion** — `fieldDiffusion : Field → DiffusionTrajectory` running the Tarski orbit, exposing the kernel-reach step count (the algebraic stand-in for spectral-gap rate).
- **Bilattice sheaf-Hodge decomposition** of the across-face membrane — split consensus into truth content `H^{0,*}` and inconsistency seam `H^{1,*}`; expose the split-brain / learner-lag regime (where `C^t ≠ C^k`) as the bigrading height.
- **Aperiodic opinion dynamics** — model long-lived opinion drift as a substitution tiling (Thue–Morse / period-doubling on truth-direction disagreement), whose hull cohomology is an invariant of eventual (a)periodicity — disagreement baked into structure, not a finite cycle.
  (Reuses the aperiodic step-n machinery in `lib/relating/.../settling/dynamics/substitution`.)

## Grounding

`lib/socializing/src/{field,consensus,face}.mts`; Lean `LawvereHarmonicCohomology`, `LawvereLaplacianSpectralGap`, `BigradedSettlingCohomology`, `Laplacianizability`; classic refs (DeGroot, Friedkin–Johnsen, structural balance) as the scalar baseline this supersedes.
Related: knowing's evidence-fusion note (deception as local-coherence-without-global-section), the relating non-reductive-computation thesis.
