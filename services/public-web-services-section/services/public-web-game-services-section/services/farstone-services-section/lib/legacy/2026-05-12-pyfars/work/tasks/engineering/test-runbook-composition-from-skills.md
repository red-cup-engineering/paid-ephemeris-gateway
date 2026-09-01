---
title: "Test runbook composition from substrate-authored skills"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: runbooks-as-first-class-substrate
depends-on: [implement-runbook-firing-in-dispatch-graph]
requires-capabilities: [property-testing, dispatch-graph]
theory-basis: [workflow-composition]
---


## Description

End-to-end test: author a runbook composed of three substrate skills (linear sequence).
Author a workitem matching the runbook's trigger.
Run a tick.
Verify the runbook fires, each skill executes in order, output cells from skill N appear as inputs to skill N+1, and the runbook-completion witness lands.

A second test: branching runbook with one if-condition.
Verify both branches under different condition cells.

A third test: parallel runbook (two skills with no dependency between them, both depending on a shared predecessor).
Verify both fire, possibly in either order, and the runbook-completion witness only emits after both complete.

## Acceptance

- [ ] Linear-runbook test passes.
- [ ] Branching-runbook test passes for both branches.
- [ ] Parallel-runbook test passes; both orderings produce identical final state (commutativity verified).
- [ ] Replay determinism preserved across all three patterns.

## Progress cells

*(empty — task not yet started)*
