---
title: "Cite claim in objects and morphisms"
type: jural-relation
kind: duty
active-holder: pyfars-roadmap-enrichment-officer
passive-party: pyfars-community
scope-action: author-object-or-morphism-record-under-cycle
triggering-powers: [run-roadmap-enrichment-cycle]
required-action: include-derives-from-claim-cell-in-record-frontmatter
enforcement: substrate-violation
rule-type: N→N
theory-basis: [roadmap-enrichment, jural-relation, derivation-chain-integrity]
---


When the roadmap-enrichment officer authors a substrate object or substrate morphism record under a cycle's stage 4, the record's frontmatter MUST include a `derives-from-claim:` cell citing the cycle's stage-3 claim.
A stage-4 record authored under a cycle without this citation is a duty breach.

## Why

Stage 4 produces the substrate handles that stage 5 (integration) attaches milestones to.
Without the citation chaining back to the claim, the integration step cannot trace *why* a milestone goal exists — the goal becomes free-floating, indistinguishable from goals that absorbed prior art directly.
The chain question → cycle → claim → object/morphism → milestone-goal is what makes the polity's roadmap defensibly its own.

## Required action

In each authored object or morphism record's frontmatter, add:

```yaml
derives-from-claim: <claim-slug>
derived-from-cycle: <cycle-slug>
```

When stage 4 produces multiple objects/morphisms from one claim, every one cites the same claim-slug.
When stage 4 produces an object/morphism that depends on *multiple* claims (the claim at hand plus a sibling claim from an earlier cycle), `derives-from-claim:` may be a list.

## Exemptions

- **Pre-cycle legacy objects/morphisms**.
  Records authored before the cycle discipline was instituted are grandfathered.
- **Records authored outside cycle context**.
  An object or morphism authored directly by the captain or by another office (not under this office's cycle) does not require this citation; its provenance is whatever its authoring context is.

## Composes with

- [`cite-question-in-claim`](cite-question-in-claim.md) — together they form the provenance chain question → claim → object/morphism.
  Without both, the chain breaks at one of two points.
- [`derive-from-theory-before-planning`](derive-from-theory-before-planning.md) — that duty governs `theory-basis:` (upstream-grounding); this duty governs `derives-from-claim:` (substrate-side-grounding).
  A stage-4 record carries both: theory-basis points up, derives-from-claim points back through the cycle.

## Enforcement

Pre-M5: manual; the [`authoring-objects-and-morphisms-from-claim`](../skills/authoring-objects-and-morphisms-from-claim.md) skill's step 5 requires the citation.
Audit by grepping the type-directories for `derives-from-claim:` against the cycle records that should have produced them.

Post-M5: closure rule audits this with the same machinery as [`cite-question-in-claim`](cite-question-in-claim.md).
