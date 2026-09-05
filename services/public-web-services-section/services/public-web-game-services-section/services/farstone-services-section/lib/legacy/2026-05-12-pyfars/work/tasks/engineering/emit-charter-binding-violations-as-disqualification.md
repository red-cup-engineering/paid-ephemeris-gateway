---
title: "Emit charter-binding violations as dispatch disqualification"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: governance-rules-as-closure-rules
depends-on: [author-charter-violation-detection-rules]
requires-capabilities: [python-editing, dispatch-graph]
theory-basis: [normative-operational-layering, dispatch-monotonicity]
---


## Description

Wire charter violation-witnesses into the dispatch graph's disqualification composition.
Today, an `eligibility-by-charter-binding` rule exists; this task ensures it actually reads the charter-rule violation cells emitted by [`author-charter-violation-detection-rules`](author-charter-violation-detection-rules.md), and emits F on the appropriate dispatch axis.

The composition order (per the goal record [`governance-rules-as-closure-rules`](../../goals/governance-rules-as-closure-rules.md)): charter-binding is one F-emitting axis among several.
It doesn't get special treatment — the closure rule fires, the cell is set, the disqualification composer reads it.

A workitem violating a charter clause produces no settled effect; the runtime witnesses the violation and refuses dispatch.

## Acceptance

- [ ] `runtime/eligibility_rules.instantiate_eligibility_by_charter_binding` reads charter violation-witnesses and emits per-(W, D) F cells when violations are detected.
- [ ] The dispatch graph's `_DISQUALIFICATION_PREDICATES` tuple includes `eligible-by-charter-binding` (already present per existing M2 work; verify).
- [ ] An attempted charter-violating dispatch is refused with substrate-readable witness.
- [ ] Tests cover: charter-compliant dispatch admitted (regression), charter-violating dispatch refused with witness naming the violated norm.

## Progress cells

*(empty — task not yet started)*
