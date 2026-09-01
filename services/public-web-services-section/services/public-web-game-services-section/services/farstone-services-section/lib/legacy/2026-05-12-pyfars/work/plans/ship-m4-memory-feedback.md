---
title: "Ship [M4 — Memory and Session Feedback](../milestones/m4-memory-feedback.md) as a coordinated plan"
type: plan
status: planning
milestone: m4-memory-feedback
tasks:
  - author-session-record-type
  - emit-session-open-and-close-witnesses
  - bind-event-log-entries-to-session-id
  - design-invocation-to-observation-projector
  - emit-observation-cells-on-invoke-completion
  - bind-observations-to-session-and-dispatchable
  - author-consolidation-cycle-recurrent-practice-record
  - implement-promote-runner-as-consolidation-step
  - emit-instinct-cells-with-provenance-back-to-observations
  - author-selection-by-instinct-rule-record
  - extend-selection-rule-system-to-read-instinct-cells
  - implement-selection-by-instinct-instantiator
  - design-openclaw-memory-to-observation-projector
  - hook-openclaw-session-close-into-projector
  - implement-skills-as-tools-projector-for-openclaw
  - test-roundtrip-from-claw-memory-to-substrate-cells
dependency-order:
  - [author-session-record-type, emit-session-open-and-close-witnesses]
  - [emit-session-open-and-close-witnesses, bind-event-log-entries-to-session-id]
  - [emit-session-open-and-close-witnesses, design-invocation-to-observation-projector]
  - [design-invocation-to-observation-projector, emit-observation-cells-on-invoke-completion]
  - [emit-observation-cells-on-invoke-completion, bind-observations-to-session-and-dispatchable]
  - [hook-openclaw-session-close-into-projector, implement-skills-as-tools-projector-for-openclaw]
  - [bind-observations-to-session-and-dispatchable, implement-promote-runner-as-consolidation-step]
  - [author-consolidation-cycle-recurrent-practice-record, implement-promote-runner-as-consolidation-step]
  - [implement-promote-runner-as-consolidation-step, emit-instinct-cells-with-provenance-back-to-observations]
  - [emit-instinct-cells-with-provenance-back-to-observations, author-selection-by-instinct-rule-record]
  - [author-selection-by-instinct-rule-record, extend-selection-rule-system-to-read-instinct-cells]
  - [author-selection-by-instinct-rule-record, implement-selection-by-instinct-instantiator]
  - [extend-selection-rule-system-to-read-instinct-cells, implement-selection-by-instinct-instantiator]
  - [bind-observations-to-session-and-dispatchable, design-openclaw-memory-to-observation-projector]
  - [design-openclaw-memory-to-observation-projector, hook-openclaw-session-close-into-projector]
  - [hook-openclaw-session-close-into-projector, test-roundtrip-from-claw-memory-to-substrate-cells]
milestone-cells:
  - "(sessions, wrap-each-tick, true) = T"
  - "(observations, projected-from-invocations, true) = T"
  - "(instincts, settled-via-consolidation, true) = T"
  - "(selection, reads-instincts, true) = T"
  - "(openclaw-session-close, syncs-to-substrate, true) = T"
normative-cleanup: tracked
---


## What this plan does

[M4](../milestones/m4-memory-feedback.md)'s acceptance criterion — "running the same class of workitem twice shows measurably different (improved) selection based on the first run's observations" — requires four parallel data-flow pipelines all working *and* the substrate-side bridge from OpenClaw memory all working.
Each pipeline is one of the milestone's goals:

1. **Sessions wrap each tick** — the load-bearing temporal boundary every other M4 cell binds to.
2. **Observations from invocations** — the bottom-tier memory the consolidation cycle reads.
3. **Instincts from consolidation** — the middle-tier memory selection consumes.
4. **Selection reads instincts** — the consumption boundary that closes the loop.
5. **OpenClaw session-close syncs to substrate** — the lateral channel for in-session observations from the user-facing harness.

Each pipeline alone is partial; only the joint settlement is the milestone.
The DAG (`dependency-order`) makes the staging admissible: sessions before observations, observations before consolidation, consolidation before selection, sessions and observations before OpenClaw bridge.

## Dependency structure (high level)

```
session-record-type
   ↓
session-open-close-witnesses
   ↓
event-log-binding ── observation-projector-design
                            ↓
                    observation-emission ── observation-binding
                                                      ↓
                                          consolidation-cycle-record ╮
                                                                      ├─→ promote-runner ──→ instinct-emission
                                                                                                      ↓
                                                                                       selection-by-instinct-rule ──→ selection-instantiator
                                                                                                                            ↓
                                                                                       (M4 acceptance: same class, improved selection)
                                                                                                      ↑
                                                                              openclaw-projector-design ── openclaw-projector-hook ── roundtrip-test
                                                                              (lateral pipeline; converges on same observation fiber)
```

## Milestone cells

The plan completes when *all five* milestone-cells are at $\mathbf{t}$.
By [plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md), partial settlement is partial completion; full completion requires all five.

This is also why the plan exists: the milestone's acceptance is a single prose statement, but the operational reality is five joint pipelines.
The plan record makes the conjunction substrate-readable.

## Defeasibility

If the captain abandons the plan, the abandonment increment $(\text{ship-m4-memory-feedback}, \texttt{abandoned-by}, \text{captain}) = \mathbf{t}$ propagates: the 15 tasks' settled witnesses survive (event-sourcing direction; abandonment doesn't retract history), but each task's `status: open` flips to `abandoned` and any pending work stops.

If the captain revises the plan (e.g., dropping the OpenClaw bridge to ship M4 sooner), the revision is a substrate write to the plan record's frontmatter combined with witness emissions. **Silent revision is forbidden.**

## Normative profile

`normative-cleanup: tracked` — duty residue at completion is observed but not blocking.
M4's normative residue (e.g., a duty-cell that didn't discharge cleanly because an OpenClaw session ended unexpectedly) gets surfaced in a [M4 retrospective review](../reviews/_index.md) but doesn't prevent plan completion.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition.
- [Plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) — completion as the meet of milestone cells.
- [Settling-CALM-corollary](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/settling-calm-corollary.md) — the active-frontier query (which tasks are dispatchable now) is coordination-free.
