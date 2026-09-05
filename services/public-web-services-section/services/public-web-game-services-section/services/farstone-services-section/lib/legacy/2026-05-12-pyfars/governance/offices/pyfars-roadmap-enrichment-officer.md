---
title: "PyFARS Roadmap-Enrichment Officer"
type: office
scope: pyfars-development-roadmap
action-domain:
  - run-roadmap-enrichment-cycle
  - author-roadmap-claim
  - read-any-substrate-record
  - read-any-theory-entity
deontic-profile:
  run-roadmap-enrichment-cycle: power
  author-roadmap-claim: power
  read-any-substrate-record: privilege
  read-any-theory-entity: privilege
  run-full-cycle-not-just-integration: duty
  cite-question-in-claim: duty
  cite-claim-in-objects-and-morphisms: duty
provides-skill:
  - running-roadmap-enrichment-cycle
  - authoring-objects-and-morphisms-from-claim
  - authoring-math-examples
  - authoring-a-specification
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, roadmap-enrichment, recurrent-practice]
---


Owns the **full roadmap-enrichment cycle**: question → research → claim → objects/morphisms → integration.
Distinct from the [`pyfars-records-officer`](pyfars-records-officer.md) (which authors planning records, the integration *stage* of the cycle) and from the [`pyfars-theory-officer`](pyfars-theory-officer.md) (which audits theory-derivation soundness from outside the loop).

This office exists to prevent the failure mode the captain identified on 2026-05-09: roadmap edits that skip directly to integration over pre-existing prior art (pypredcomp, engineering archive), without running the upstream stages of question-selection, research, claim-stating, and objects/morphisms-stating.
Ad-hoc absorption produced pointer-shell milestones with no derivation provenance — milestones whose substance came from "wherever fit was assumed", not from a defended position the polity holds.

## Role in plain terms

The cycle has seven stages.
This office is the integrating authority that ensures they all run, in order, with substrate witnesses at each stage:

1. **Select a question** from `questions/` (or accept a captain-posed one).
  The selection itself is a substrate event.
2. **Conduct research** — read upstream theory, prior art, the math; assemble a defended position.
3. **Author a claim** at `claims/<slug>.md` per [`authoring-realization-claim`](../skills/authoring-realization-claim.md).
  The claim is a single declarative sentence with proof obligation routed through upstream theorems.
4. **Author objects, morphisms, and concepts** the claim implies — substrate record-types, substrate operations (closure rules, transformations), and semantic role anchors — per [`authoring-objects-and-morphisms-from-claim`](../skills/authoring-objects-and-morphisms-from-claim.md).
  Produces records in `governance/objects/`, `governance/morphisms/`, `concepts/`, etc.
5. **Author math examples** — worked mathematical instantiations of the stage-4 structures, per [`authoring-math-examples`](../skills/authoring-math-examples.md).
  Witnesses that the structures are instantiable; grounds the specification stage.
6. **Author specifications** — normative documents in `governance/specifications/` derived from the stage-4/5 outputs, per [`authoring-a-specification`](../skills/authoring-a-specification.md).
  Produces acceptance criteria for the developer's implementation chain.
7. **Commission integration** — hand off to the records officer to fold the new objects/morphisms into milestones, plans, and tasks per [`applying-roadmap-enrichment`](../skills/applying-roadmap-enrichment.md), and commission implementation-chain tasks for each authored specification.

A cycle invocation produces a `cycle-record` witness at `work/cycles/<YYYY-MM-DD>-<question-slug>.md` listing all seven stages' outputs, what was deferred, what was integrated.

## Delegated authority

`561 polity → captain → pyfars-roadmap-enrichment-officer`.
The delegation is bounded:

- **Derivative**: the officer holds cycle-execution authority.
  It does not amend C, create offices, or directly modify other offices' records.
- **Non-transferring of accountability**: the captain still answers for the polity's roadmap; this officer answers for the cycle's *integrity* (all stages run; substance derived rather than absorbed).
- **Scope-bounded**: powers cover question-selection, research, claim-authoring at `claims/`, objects/morphisms-authoring at canonical type-directories, and commissioning the records officer.
  The officer does NOT directly hold `create-milestone-record` / `create-goal-record` / `create-task-record` — those remain records-officer powers; this office hands off.
- **Revocable**: the captain may retract the delegation at any time.
  In practice, when the captain wants ad-hoc roadmap work that bypasses the cycle (e.g., emergency rescope), the captain explicitly suspends this office's discipline for that work.

## Powers held

- [`run-roadmap-enrichment-cycle`](../powers/run-roadmap-enrichment-cycle.md) — the composite power that admits the holder to invoke the seven-stage cycle.
  Internal stages are skill-level concerns; the power's grain is the cycle as a whole.
- [`author-roadmap-claim`](../powers/author-roadmap-claim.md) — write a claim record at `claims/<slug>.md`.
  Held as a distinct power because claims are first-class substrate cells the polity may cite outside the cycle context.
- [`read-any-substrate-record`](../powers/read-any-substrate-record.md) — privilege.
- [`read-any-theory-entity`](../powers/read-any-theory-entity.md) — privilege.

## Duties attached

- [`run-full-cycle-not-just-integration`](../duties/run-full-cycle-not-just-integration.md) — must run all seven stages, in order, with substrate witnesses; cannot skip to integration.
- [`cite-question-in-claim`](../duties/cite-question-in-claim.md) — every authored claim must cite the originating question record in its `depends-on:` or a dedicated `derived-from-question:` cell.
- [`cite-claim-in-objects-and-morphisms`](../duties/cite-claim-in-objects-and-morphisms.md) — every objects/morphisms record authored under this cycle must cite the originating claim.

## Skills held

- [`running-roadmap-enrichment-cycle`](../skills/running-roadmap-enrichment-cycle.md) — the composite seven-stage skill.
- [`authoring-objects-and-morphisms-from-claim`](../skills/authoring-objects-and-morphisms-from-claim.md) — stage 4.
- [`authoring-math-examples`](../skills/authoring-math-examples.md) — stage 5.
- [`authoring-a-specification`](../skills/authoring-a-specification.md) — stage 6.

Plus, by office-composition, depends on existing skills the cycle invokes: - [`identifying-grounding-records-for-question`](../skills/identifying-grounding-records-for-question.md) (research-stage support) - [`consulting-predwork-theory`](../skills/consulting-predwork-theory.md) (research-stage) - [`authoring-realization-claim`](../skills/authoring-realization-claim.md) (stage 3) - [`applying-roadmap-enrichment`](../skills/applying-roadmap-enrichment.md) (records officer's skill — hand-off target for stage 7)

## Boundary with other offices

- **Records officer**: this office *commissions* the records officer to do integration (stage 5).
  The records officer remains the authority over `work/milestones/`, `work/goals/`, `work/plans/`, `work/tasks/` — this office does not directly write planning records.
  The boundary is *upstream cycle stages* (this office) vs. *integration into planning records* (records officer).
- **Theory officer**: this office runs the cycle within Γ; the theory officer audits Γ's soundness from outside.
  If a cycle's research stage repeatedly fails (no upstream theory available), the theory officer's degeneration-signal duty fires — that's a Γ-degeneration indicator, not a cycle-failure.
- **Theory-derivation officer**: when the cycle's stage 4 reveals a theory gap (the claim's objects/morphisms have no upstream theorem to ground them), the cycle pauses and routes to the theory-derivation officer per [`escalate-when-theory-gap-found`](../duties/escalate-when-theory-gap-found.md).
  Cycle resumes after the gap is filled.
- **Steward**: the steward holds C; the cycle does not amend C.
  When a cycle's claim would require charter modification, the cycle pauses and routes to the steward.

## Dispatchability

The cycle is realized as the [`roadmap-enrichment-cycle`](../../work/recurrent-practices/roadmap-enrichment-cycle.md) recurrent-practice.
Workitems with `kind: run-roadmap-enrichment-cycle` are dispatched to whoever holds this office (per the M2 dispatch graph's office-routing).
Triggers: captain-prompt, scheduled cadence (per `cadence:` in the recurrent-practice record), or substrate-driven (a question's `status` cell transitioning to `ripe-for-cycle`).

## Incumbency

Currently vacant in the substrate (no `holds(personnel, pyfars-roadmap-enrichment-officer)` cell).
In practice the office is held by whatever LLM agent the captain dispatches to roadmap work.
A future M5 task settles this incumbency cell so dispatch routes by office, not by ad-hoc agent slug.
