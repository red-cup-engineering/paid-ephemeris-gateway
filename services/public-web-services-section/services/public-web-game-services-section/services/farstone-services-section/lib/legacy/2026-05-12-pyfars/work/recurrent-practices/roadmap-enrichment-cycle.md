---
title: "Roadmap-enrichment cycle"
type: recurrent-practice
status: planning
cadence: triggered
trigger-conditions:
  - captain-prompts-for-roadmap-enrichment
  - question-status-becomes-ripe-for-cycle
  - scheduled-cadence-elapsed
aggregation: per-cycle-witness
history-depth: 0
constitutes: [running-roadmap-enrichment-cycle, authoring-objects-and-morphisms-from-claim, applying-roadmap-enrichment]
fires-at: trigger-condition-satisfied
formality-layer: F2
phases: [select-question, research, author-claim, author-objects-and-morphisms, commission-integration]
nested-in: null
---


The substrate-resident, dispatch-able recurrent practice that runs the polity's question → research → claim → objects/morphisms → integration cycle on the development roadmap.
Held by the [`pyfars-roadmap-enrichment-officer`](../../governance/offices/pyfars-roadmap-enrichment-officer.md); composes the [`running-roadmap-enrichment-cycle`](../../governance/skills/running-roadmap-enrichment-cycle.md) skill into a substrate-fired practice the M2 dispatch graph routes to.

## What this practice is

A bounded execution of the five-stage roadmap-enrichment cycle, witnessed by a `work/cycles/<YYYY-MM-DD>-<question-slug>.md` cycle record.
One cycle takes one question (or one captain-posed framing) through to a records-officer integration commissioning.

This practice is **not a tick** ([tick.md](tick.md)) — it doesn't run on the engine's per-second cadence.
It is **not a consolidation cycle** ([consolidation-cycle.md](consolidation-cycle.md)) — it doesn't promote observations to instincts.
It is the practice that *grows the roadmap's derivation provenance* by running the full cycle for one question.

## Phase structure

Five phases per cycle:

1. **Select question.** Pick a question from `questions/` (or accept captain-posed).
  Open `work/cycles/<YYYY-MM-DD>-<question-slug>.md`.
  Witness: `(cycle:<slug>, selected-question, <question-slug>, t)`.

2. **Research.** Read upstream theory, prior art, existing PyFARS-side content.
  Apply [`consulting-predwork-theory`](../../governance/skills/consulting-predwork-theory.md) and [`identifying-grounding-records-for-question`](../../governance/skills/identifying-grounding-records-for-question.md) as needed.
  Witness: `theory-cited:` and `prior-art-cited:` cells in the cycle record.

3. **Author claim.** Apply [`authoring-realization-claim`](../../governance/skills/authoring-realization-claim.md).
  New claim record at `claims/<claim-slug>.md` with `derived-from-question:` and `derived-from-cycle:` per [`cite-question-in-claim`](../../governance/duties/cite-question-in-claim.md) duty.

4. **Author objects and morphisms.** Apply [`authoring-objects-and-morphisms-from-claim`](../../governance/skills/authoring-objects-and-morphisms-from-claim.md).
  New records in canonical type-directories with `derives-from-claim:` per [`cite-claim-in-objects-and-morphisms`](../../governance/duties/cite-claim-in-objects-and-morphisms.md) duty.

5. **Commission integration.** Hand off to the [`pyfars-records-officer`](../../governance/offices/pyfars-records-officer.md) with the cycle record's `commissioned-integration:` cells listing roadmap touchpoints.
  Records officer applies [`applying-roadmap-enrichment`](../../governance/skills/applying-roadmap-enrichment.md); resulting integration-finding cited in the cycle record.

## Triggering

Three trigger conditions, any of which fires the practice:

- **Captain-prompts-for-roadmap-enrichment.** The captain explicitly asks for cycle work in conversation.
  Cycle's question is captain-posed (the captain may pick the question, or delegate the pick).
- **Question-status-becomes-ripe-for-cycle.** A question's frontmatter `status:` cell transitions to `ripe-for-cycle` (substrate-readable signal that research has matured to the point where a cycle can defend a claim).
  Cycle's question is the one whose status changed.
- **Scheduled-cadence-elapsed.** A configured cadence (per polity-policy cell at `governance/conventions/cycle-cadence.md`) reaches its boundary and no cycle has fired since the last boundary.
  Cycle's question is selected by the practice from the ripe-question pool.

The cycle does NOT fire automatically on tick boundaries; it is a higher-formality-layer practice (F2 vs the tick's F1) that fires on its own trigger conditions.

## Aggregation

**Per-cycle witness, depth 0.** Each cycle is independent — it does not read the prior cycle's witness as input.
Cycles do compose at the *roadmap* level (later cycles' integrations may reshape earlier cycles' integrations), but the *cycle record* itself is bounded by its own five-stage span.

## Constituent skills

- [`running-roadmap-enrichment-cycle`](../../governance/skills/running-roadmap-enrichment-cycle.md) — the composite five-stage skill the cycle invokes.
- [`authoring-objects-and-morphisms-from-claim`](../../governance/skills/authoring-objects-and-morphisms-from-claim.md) — stage-4 specific skill.
- [`applying-roadmap-enrichment`](../../governance/skills/applying-roadmap-enrichment.md) — stage-5 hand-off skill (records-officer side).

## Dispatchability

Workitems with `kind: run-roadmap-enrichment-cycle` are dispatched per the M2 dispatch graph's eligibility rules.
The cycle's required capabilities:

- `holds-office: pyfars-roadmap-enrichment-officer` — admits the dispatch.
- `read-any-substrate-record` (privilege from the office).
- `read-any-theory-entity` (privilege from the office).

The dispatch graph routes the workitem to whoever currently holds the office.
Cycle progress is tracked by the cycle record's `status:` cell; follow-on workitems for stage transitions read the cell to know which stage to invoke next.

## Theory grounding

- [Predwork recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) — formal definition; this is a depth-0, trigger-fired practice.
- [Predwork operations-loop](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/operations-loop.md) — the cycle is one instance of the operations-loop, specialized to roadmap-enrichment work.
- [Roadmap-enrichment concept](../../concepts/roadmap-enrichment.md) — the discipline this practice realizes.

## Regime

**Strict.** Each stage is bounded; stage-skipping is duty-violating; the cycle terminates after stage 5 (or escalates and pauses earlier if a stage fails).
One cycle is computable in bounded time (where "computable" includes the human/agent thinking work — the *substrate-side* operations are bounded; the cognitive work in stages 2–4 is whatever it takes).

## Why dispatch-able matters

Per the captain's framing on 2026-05-09: "all requisite resources to make this actually a proper workflow that can be dispatched".
The cycle as a recurrent-practice with a substrate-readable trigger is what makes it a workflow the M2 dispatch graph routes to, rather than a habit a particular agent might or might not run.
The substrate's substrate-readable trigger conditions, the office holding the powers, the duties governing integrity, the cycle records witnessing each invocation — together they make the practice a substrate-resident workflow, dispatch-able like any other.
