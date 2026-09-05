---
title: "Run full cycle, not just integration"
type: jural-relation
kind: duty
active-holder: pyfars-roadmap-enrichment-officer
passive-party: pyfars-community
scope-action: modify-roadmap-or-roadmap-derived-record
triggering-powers:
  - select-research-question
  - conduct-research-on-question
  - author-roadmap-claim
  - author-objects-and-morphisms-from-claim
  - commission-roadmap-integration
required-action: complete-all-five-stages-in-order-with-substrate-witnesses
enforcement: substrate-violation
stronger-than: maintain-roadmap-enrichment-discipline
rule-type: N→N
theory-basis: [roadmap-enrichment, recurrent-practice, normative-operational-layering, jural-relation]
---


When the roadmap-enrichment officer modifies the roadmap (directly, or via commissioning a roadmap-derived record), it MUST have run all five stages of the cycle in order — question selection, research, claim-authoring, objects/morphisms-authoring, integration commissioning — with a substrate-witness at each stage.
Skipping to integration is a duty breach.

## Why

This duty exists because of a documented failure mode: on 2026-05-09 the captain identified that roadmap-enrichment work had been mostly the integration step (stage 5) over pre-existing prior art (pypredcomp v0.x, engineering archive notes), with the upstream stages happening implicitly or not at all.
The result was milestones whose substance came from "wherever fit was assumed" rather than from defended positions the polity holds.
The captain's framing: *"that's very different than what we've actually been doing, which is mostly just that last step and kind of ad hoc."*

The polity needs roadmap content with derivation provenance.
A milestone exists *because* a question was researched, claimed, and concretised into objects/morphisms — not because some other tool's roadmap had it.
Stages 1–4 produce the derivation; stage 5 places the result.
Without stages 1–4, the roadmap accretes content with no defended commitment behind it.

## Required action

When commencing a roadmap-enrichment cycle:

1. **Stage 1 — Select question**.
  Pick a substrate-resident question from `questions/` (or accept a captain-posed one).
  Witness: assertion `(cycle:<slug>, selected-question, <question-slug>, t)` in the `work/cycles/<YYYY-MM-DD>-<question-slug>.md` cycle record.

2. **Stage 2 — Research**.
  Read the upstream theory the question explores (its `explores:` field), relevant prior art, and any prior PyFARS work on the topic.
  Witness: assertion `(cycle:<slug>, research-completed, true, t)` with `theory-cited:` and `prior-art-cited:` cells listing what was read.

3. **Stage 3 — Author claim**.
  Write a `claims/<slug>.md` record per [`authoring-realization-claim`](../skills/authoring-realization-claim.md).
  Witness: the claim record itself; `(cycle:<slug>, authored-claim, <claim-slug>, t)`.

4. **Stage 4 — Author objects/morphisms**.
  Per [`authoring-objects-and-morphisms-from-claim`](../skills/authoring-objects-and-morphisms-from-claim.md), name the substrate objects (record-types, cell-shapes) and substrate morphisms (closure rules, transformations) the claim requires.
  Author each in its canonical type-directory.
  Witness: `(cycle:<slug>, authored-objects, [<obj-slugs>], t)` and `(cycle:<slug>, authored-morphisms, [<morph-slugs>], t)`.

5. **Stage 5 — Commission integration**.
  Hand off to the records officer with a `cycle-record` listing what to integrate.
  The records officer applies [`applying-roadmap-enrichment`](../skills/applying-roadmap-enrichment.md), folding the new objects/morphisms into milestones, plans, tasks.
  Integration enters as evidence and partial realisation; not as seed.
  Witness: `(cycle:<slug>, integration-commissioned-by, <records-officer>, t)` and the records officer's resulting witness when integration completes.

A cycle that produces no `cycle-record` after touching the roadmap is a duty breach.
A cycle that produces a `cycle-record` missing one or more stage-witnesses is a duty breach.

## What this rules out

- **Direct authoring of milestone/goal/plan/task records** by this officer (that's the records officer's powers; this office *commissions*, doesn't directly write).
- **Prior-art absorption without an authored claim**.
  Reading pypredcomp v0.7 and writing `M17` is a stage-5-only move.
  Even when the prior art is excellent, the cycle requires that the polity author *its own* claim about why the absorbed content fits — what position the polity holds that justifies absorbing it.
- **"This is obviously needed" handwaving in lieu of stage 2 research**.
  If the research stage's `theory-cited:` is empty, the cycle is structurally incomplete.
- **Stage-skipping under "the answer is obvious"**.
  If the answer is obvious, stage 3 takes thirty seconds; do not skip it.

## What this does NOT require

- **Re-running stages 1–4 for trivial maintenance edits.** Renaming a milestone, fixing a broken link, correcting a typo — these are records-officer maintenance under existing duties, not roadmap enrichment.
  This duty fires when the cycle modifies *substantive roadmap shape*: new milestones, rescoped goals, new dependency edges, new arc extensions.
- **A separate cycle per micro-decision.** A cycle's research stage may surface multiple related claims; one cycle can produce multiple claims and multiple objects/morphisms records, all witnessed in the same cycle-record.

## Enforcement

Pre-M5: manual.
The roadmap-enrichment officer authors `work/cycles/<YYYY-MM-DD>-<question-slug>.md` records and the witnesses cited above.
Audit by reading the cycle records.

Post-M5: closure rule audits cycle-record completeness — for every roadmap-modifying event in the substrate event log, there must be a corresponding cycle-record (or an explicit captain-suspension witness).
The [`pyfars audit-cycles`](../../tools/) tool (planned) automates this audit.

## Stronger than

[`maintain-roadmap-enrichment-discipline`](maintain-roadmap-enrichment-discipline.md) — the records-officer-held duty governing the integration stage's fidelity-vs-horizon match.
That duty governs *how* integration is done; this duty governs *whether the upstream stages were done at all*.
