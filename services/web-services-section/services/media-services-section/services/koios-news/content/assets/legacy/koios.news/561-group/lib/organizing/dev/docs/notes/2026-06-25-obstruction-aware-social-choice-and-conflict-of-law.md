# obstruction-aware social choice, governance & conflict-of-law

*2026-06-25.
From the HGR sheaf-Laplacian research sweep + emsenn's application-domain brief.
Records the social-scale governing applications of the sheaf-Laplacian / obstruction machinery: social choice & mechanism design, and law / policy / institutional conflict — the two domains where the deliverable is a *certificate of (non-)gluability*. organizing is the social-scale governing faculty (Gen-2 multi-agent animating); it already hosts the layer-2 impossibility dissolutions.
Research note.*

## Why this lands on organizing

organizing settles a plurality of agents into one collective; it is the home of the **layer-2 impossibility track** (Condorcet/Arrow as a signed cycle = a periodic orbit dissolved by the no-non-trivial-periodic-orbit theorem) and of `cohesion` (Davis k-coalition clusterability — a tripolar polity is clusterable yet unbalanced).
Social choice and conflict-of-law are exactly local-to-global aggregation problems over a society, so they are organizing's, not socializing's (which models the *observers*, not the *governing*).

## Open problem 1 — social choice, governance, mechanism design

Social choice asks how individual preferences/votes/judgments aggregate into collective decisions.
Arrow-style impossibilities re-read as **local-to-global failures**: locally reasonable preference comparisons need not glue into a globally rational social ordering.
A sheafed version does more than restate impossibility — it **classifies the obstruction**.
Targets: - **Which preference domains remove the obstruction?** Restricted domains already make some impossibilities vanish; compute the *minimal topological/fiber restriction* under which aggregation becomes possible. - **Pluralistic aggregation without flattening** — keep local value systems as stalks (do not force one utility scale); compute whether a decision is globally acceptable under *explicit translations* between value systems. - **DAO governance audit** — votes, token holdings, delegation graphs, proposal semantics, quorum rules as a sheaf; a valid outcome is a global section satisfying the mechanism; an attack is an obstruction-exploit or topology-exploit. - **Certified learned mechanisms** — mechanism-design ML optimizes policies, but auditability under manipulation and distribution shift is the hard part; a sheaf proof certifies a learned mechanism preserves named local-to-global invariants.

This is one of the most *productizable* domains: **governance systems that ship with obstruction certificates.** Our existing `governance` consolidation (aggregatePreferences: a Condorcet cycle is a periodic orbit ⇒ none under the bilattice settling) is the seed; the new capability is to *classify* the obstruction (which coalitions, which translations) rather than merely report its absence.

## Open problem 2 — law, policy, institutional conflict

Law is a giant local-to-global machine: jurisdictions, agencies, precedents, treaties, administrative rules, enforcement practices, community norms — each locally valid.
The hard question is whether they can be made *jointly* valid without violence, preemption, erasure, or arbitrary hierarchy.
Targets: - **conflict of laws** — when two jurisdictions' rules glue for a case; - **legal pluralism** — when Indigenous, state, federal, international norms are *structurally incompatible* (a nonzero obstruction class) rather than merely "in disagreement"; the obstruction is the honest object that resists imperial flattening; - **policy coherence** — whether climate, housing, policing, public-health, budget policies form a coherent institutional section; - **regulatory arbitrage** — where actors exploit *nontrivial holes* (nonzero `H¹`) between local legal regimes.

The machine-proof version: **policy analysis with certificates of non-gluability.**

## Our edge

(1) **Preserved pluralism**: a global section is *not* always the goal — bilattice settling lets multiple incompatible local sections coexist as productive pluralism, and the obstruction class distinguishes that from pathological fragmentation.
Scalar aggregation cannot.
(2) **`⊤`-conflict is stable, not destabilizing**: a society holding `⊤` ("told both") on a question is a *stable harmonic* state, not an oscillation to be suppressed — the formal ground for "live contradiction" in a polity.
(3) **Impossibility-as-periodic-orbit, dissolved**: Arrow/Condorcet cycles are periodic orbits the closure-monad no-periodic-orbit theorem rules out; the bilattice aggregation lands on `⊤`/`⊥` rather than cycling.
(4) **Davis clusterability** (`cohesion`) reads coalition structure at scale-2 richness (k-coalitions), where structural balance only sees two camps.

## Concrete builds

- **Obstruction-classifying `aggregatePreferences`** — extend the existing governance reading to emit the *obstruction class* (which coalition cycle, which translation edge) and the **minimal restriction** that would remove it (the domain-restriction certificate).
- **Mechanism-as-sheaf auditor** — a DAO/governance carrier whose `validate` is "is there a global section satisfying the mechanism?", with attacks surfaced as obstruction- or topology-exploits.
- **Conflict-of-law gluability certificate** — given local legal regimes + translation maps, return global section / bounded-defect / nonzero-obstruction (with the separating jurisdictions named) — the legal-pluralism honesty object.

## Grounding

organizing's `governance`/`cohesion` consolidations; Lean closure-monad no-periodic-orbit, `BigradedSettlingCohomology`, `LawvereHarmonicCohomology`; computational social choice + conflict-of-laws literature as the baseline.
Related: socializing opinion-dynamics, computing proof-carrying-synchronization, relating non-reductive-computation thesis.
See memory: layer-2 attacks impossibility, cohesion→Davis clusterability.
