---
name: "Authoring objects and morphisms from a claim"
description: "Takes a claim record (post stage-3 of the roadmap-enrichment cycle) and produces the substrate objects (record-types, cell-shapes) and substrate morphisms (closure rules, transformations) the claim requires for engineerability. Use as stage 4 of the roadmap-enrichment cycle."
---


A claim is a single declarative sentence with proof obligation routed through upstream theorems.
To make the claim *engineerable*, the polity needs concrete substrate objects (the record-types and cell-shapes the claim names or implies) and concrete substrate morphisms (the closure rules, dispatch operations, transformations the claim requires for realization).
This skill enumerates them and authors each in its canonical type-directory.

This is the gap-fill between [`authoring-realization-claim`](authoring-realization-claim.md) (which produces the claim) and [`applying-roadmap-enrichment`](applying-roadmap-enrichment.md) (which integrates concretized work into the roadmap).
Without this stage, the claim floats — there is nothing concrete to attach milestone goals to.

## Requirements

- The [`pyfars-roadmap-enrichment-officer`](../offices/pyfars-roadmap-enrichment-officer.md) office held.
- A claim record at `claims/<claim-slug>.md` (the cycle's stage-3 output).
- Read access to existing `concepts/`, `objects/`, `morphisms/` (governance and domain-specific), and the upstream theory entities the claim cites.
- The [`identifying-grounding-records-for-question`](identifying-grounding-records-for-question.md) skill's manifest from stage 2 (if produced) as a starting draft.

## Steps

1. **Re-read the claim's statement.** Identify the *nouns* (candidate objects) and *verbs* (candidate morphisms) the claim names or requires for its proof to discharge.
  Example — claim "PyFARS realizes federation-rate as the Laplacian spectral gap of the cluster graph": nouns = federation-graph, Laplacian, spectral-gap, cluster; verbs = compute-spectral-gap, surface-as-observable.

2. **Distinguish upstream from substrate-side.** For each candidate, ask:
   - **Upstream** — already lifted from theory (e.g., `predication-categories/objects/spectral-gap`)?
     Then it's a `depends-on:` target, not a new authoring.
   - **Substrate-side** — needs a PyFARS-specific record?
     Then it's a stage-4 authoring target.

3. **Decide kind for each substrate-side authoring target** per CLAUDE.md frontmatter discipline:
   - **Concept** — a semantic anchor that PyFARS uses without instantiating a specific structure (e.g., `concepts/federation-spectral-gap.md` is the *concept* of "the spectral gap of *this polity's* federation graph").
   - **Object** — a substrate structure with concrete instances (e.g., `governance/clusters/<id>--spectral.md` is an *object* — a record carrying spectral-gap cells for a specific cluster).
   - **Morphism** — an operation between substrate structures (e.g., `governance/morphisms/compute-spectral-gap.md` is a *morphism* — a closure rule that, given a cluster's adjacency cells, produces the spectral-gap cell).
   - **Claim** — a fact about a substrate structure with proof obligation.
     If stage 4 surfaces a *secondary claim* the original claim implies, author it as a sibling claim record.
   - **Theorem** — a defended general fact about a structure.
     If stage 4 surfaces a theorem candidate, route to the theory-derivation officer rather than authoring directly.

4. **Order by dependency.** Substrate objects whose `depends-on:` is fully satisfied (upstream entities + already-authored substrate-side records) are ready first.
  Morphisms typically depend on the objects they operate on — author objects before morphisms.

5. **Author each record** in its canonical type-directory:
   - `pyfars where <kind> <slug>` resolves the canonical directory per CLAUDE.md harness.
   - Frontmatter MUST include `derives-from-claim: <claim-slug>` per [`cite-claim-in-objects-and-morphisms`](../duties/cite-claim-in-objects-and-morphisms.md) duty.
   - Frontmatter MUST include `theory-basis:` listing the upstream theorems the record's correctness depends on, per [`derive-from-theory-before-planning`](../duties/derive-from-theory-before-planning.md).
   - Object records MUST include the cell-shape (frontmatter schema) — what cells the substrate stores, in what value-domain (bilattice, cost-quantale, etc.), and which closure rules read/write them.
   - Morphism records MUST include premise → conclusion shape — what cells the morphism reads, what cells it writes, what value-transformation it performs.

6. **For each authored object and morphism, identify what math example would witness it.** Do not author the example here — that is stage 5 ([`authoring-math-examples`](authoring-math-examples.md)).
  Instead, note in the cycle record under `pending-math-examples:` what instantiation you have in mind: the entity set, the concrete values, the morphism trace.
  Stage 5 picks this up as its input.

7. **Cross-check refutation conditions per object/morphism.** What substrate observation would refute the object's value-domain claim or the morphism's correctness?
  Per [`authoring-realization-claim`](authoring-realization-claim.md) §6, unfalsifiable structures are too vague — sharpen.

8. **Update the cycle record** with `authored-objects: [<obj-slugs>]` and `authored-morphisms: [<morph-slugs>]`.
  List records that *would* have been authored but were deferred (theory gap, captain-decision, downstream-cycle dependency) under `deferred:` with reason.

## Outcomes

- For the originating claim, every load-bearing object and morphism is either:
  - Authored as a substrate-resident record in its canonical type-directory, with `derives-from-claim:` and `theory-basis:` cells, OR
  - Already-existing (upstream lift or prior-cycle output) and cited via `depends-on:`, OR
  - Explicitly deferred with reason in the cycle record.
- The polity now has concrete substrate handles to attach roadmap integration to: each object is a candidate goal (a milestone goal can be "realize object X"); each morphism is a candidate task (a milestone task can be "implement morphism Y").
- The integration stage (stage 5) has stage-4 outputs to bind milestones to, rather than abstract claim language.

## Discipline notes

- **Don't author objects/morphisms the claim doesn't require.** Stage 4 is *enumeration of what the claim implies*, not lateral exploration.
  If stage 4 starts surfacing tangentially-related substrate work, that's a *new question* — file it in `questions/` and let a later cycle pick it up.
- **Author at the right level of abstraction.** A claim about "federation-rate" requires `federation-spectral-gap` as a concept and `compute-spectral-gap` as a morphism.
  It does NOT require authoring a separate `eigenvalue-computation` object — that's a downstream implementation detail belonging to a task in the integration stage.
- **Per memory feedback "561 — milestone/plan records must be self-contained"**: object and morphism records must contain their substantive content.
  Pointer-shells citing only the claim or upstream theorem are stage-4-incomplete.
- **When stage 4 reveals a missing upstream theorem**, pause and escalate to the theory-derivation officer per [`escalate-when-theory-gap-found`](../duties/escalate-when-theory-gap-found.md).
  Do not paper over the gap by authoring substrate objects whose grounding theorem doesn't exist yet.
