# sheaf evidence fusion, deception detection & dynamic contextuality

*2026-06-25.
From the HGR sheaf-Laplacian research sweep + emsenn's application-domain brief.
Records how knowing's existing cohomology channels (bind, contextuality, attract, regime) already realize sheaf-evidence machinery, and the two open problems it attacks: intelligence / evidence fusion (with deception detection), and formal epistemology / dynamic contextuality.
Research note — names the build, cites the grounding.*

## What knowing already is, in HGR terms

knowing instantiates sheaf-Laplacian machinery through three independent channels, all already implemented: 1. **bind** (`bind.mts`, `section.mts:foldSection`) — Čech `H⁰`/`H¹` of the predication graph (entities = nodes, predications = edges): `H⁰` = bound percepts (connected components), `H¹` = binding obstruction (cycle rank).
Union-find + edge counting.
2. **contextuality** (`contextuality.mts`) — signed-graph `Z₂` balance: `H¹` obstruction = unbalanced cycles = frustration.
Union-find with parity — a discrete signed Laplacian balance test.
3. **attract / regime** (`attract.mts`, `gauge.mts`) — the settling-associated sheaf `F_U` has `H¹ = 0` in strict/Scott regimes (CRDT/CALM convergence); `aperiodic` is the never-settling regime.
`LawvereHarmonicCohomology.lean` proves `ker L_F` (Tarski order-Laplacian) `≅ H⁰` independent Čech invariants — the settled section *is* the harmonic section.
4. **memory concept maps** (`memory/carrier.mts:conceptMapMemory`) — internal reference edges now carry a normalized `cohomologyTerms.laplacian` receipt, so cyclic concept dependencies surface as an inspectable H¹ obstruction rather than a bare edge count.

## Open problem 1 — intelligence / evidence fusion & deception

Intelligence analysis fuses fragments from sources, sensors, informants, documents, intercepts, analyst assumptions, adversarial deception.
The sheaf object: base space = sources / collection contexts / analysts / time windows / hypotheses; stalks = local claims, belief masses, argument graphs, entity-resolution states; restriction maps = context-to-context translation; obstruction = the exact place locally-plausible reports fail to form one coherent situation model.

This is **almost embarrassingly direct** for deception.
A good deception operation is *locally coherent* — each source checks out, each document is plausible.
The failure appears only on global gluing.
That is precisely sheaf-theoretic territory.
The engine answers: - **which hypothesis is supported?** → lowest obstruction across local evidence patches (not summed evidence); - **which source is lying?** → carefully: which *restriction map / translation edge* contributes most to global `H¹` inconsistency; - **which missing collection collapses uncertainty fastest?** → the Laplacian/spectral structure gives uncertainty *modes*, pointing at the collection task that maximally reduces obstruction; - **when do hypotheses stay genuinely underdetermined?** → multiple incompatible global sections ⇒ **certify underdetermination** rather than hallucinate confidence.

This touches Dempster–Shafer / evidence theory directly (heterogeneous, conflicting, open-world frames).
The epistemic win is **machine-checked refusal to over-integrate.**

## Open problem 2 — contextuality & dynamic local truth

There is already a mature sheaf account of contextuality (Abramsky–Brandenburger: nonlocality/contextuality = obstruction to global sections; later linked to cohomology, paradox, databases, CSP, causality). knowing's `contextuality.mts` is the `Z₂`/`H¹` frustration realization.
Beyond quantum foundations this formalizes: semantic paradox (locally meaningful, no global truth value), database inconsistency (locally valid tables, no global join), measurement contextuality, cultural/ontological pluralism (claims valid only inside a local world), AI evaluation (passes local benchmarks, no coherent global spec).

The open frontier is **dynamic contextuality**: not "is there a global section?" but — under diffusion, learning, adaptation, or strategic communication, does contextuality *disappear, move, deepen, or hide*?
That is exactly where the Laplacian becomes more than static sheaf theory.

## Our edge

(1) Machine-checked `ker L ≅ H⁰` via the Lawvere/Tarski order-Laplacian — **no inner product / Hilbert structure** (HGR's spectral framework structurally requires a bilinear form bilattice/d-frame values do not have; `hansen-ghrist-spectral-engagement.md` Pass 2 proves this).
(2) **Bilattice ⊤-conflict is stable harmonic**, not a spectral singularity: contradictions accumulate to `⊤` ("told both"), so settled sections always glue (`H¹ = 0` by confluence) — contextuality settles to harmonic `⊤` rather than diverging.
(3) **Order-theoretic no-periodic-orbit** (`ClosureMonad.no_periodic_orbits`) eliminates oscillation without spectral-gap numerics; aperiodic orbits get concrete step-n substitution structure.

## Concrete builds (from the brief)

- **Tarski Sheaf-Laplacian Diffusion** *(top build)* — `cognizing/diffuse.mts`: diffuse the held section `C(Meme)` to harmonic equilibrium by settle-step iteration (polynomial-time, no eigensolver).
  Output a diffusion-state carrier: attractor (harmonic fixed point), harmonic-standing (`∈ ker L`?), `H¹` count (remaining obstruction), convergence-ordinal, regime verdict.
  Unifies bind + attract + contextuality + regime under one reading.
- **Bilattice Hodge decomposition** of the membrane — partially realized in memory concept maps by `conceptMapMemory(...).cohomology`; the broader build is to split the cochain space `C¹ = Z¹ ⊕ im δ⁰ ⊕ im (δ¹)*`, where harmonic 1-cochains are irreducible obstruction cycles that cannot be killed by local amendment.
  Orthogonality = `≤_k`-independence.
- **Contextuality as signed-harmonic deficit** — read the signed meme-graph under the signed Laplacian; `ker L_signed` empty ⇒ maximal frustration; `|ker L_signed| > 1` ⇒ multiple consistent global assignments (the **underdetermination certificate**).
- **Membrane Laplacianizability** — characterize which held states admit a kernel-preserving sheaf metric (the real-analytic frontier in `Laplacianizability.lean`); "maximally intelligent iff Laplacianizable."

## Grounding

`lib/knowing/src/cognizing/{bind,contextuality,attract,gauge,section}.mts`, `lib/knowing/src/memory/carrier.mts`; Lean `LawvereHarmonicCohomology`, `ClosureMonad`, `Laplacianizability`, `Aperiodic.
StepN`; Abramsky–Brandenburger contextuality, Dempster–Shafer evidence theory.
Related: socializing opinion-dynamics note, relating non-reductive-computation thesis.
